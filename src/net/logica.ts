// Logica pura della stanza P2P: derivazione degli id, posti a/b, riconnessione, battito.
// Non importa PeerJS: parla con un "peer minimo" (adattato in index.ts, finto nei test).
//
// Riconnessione automatica (ricerca 2026-11-11 §6, ADR 006). Verso fuori restano i 4 StatoConnessione;
// dentro, gli stati della ricerca sono questi passaggi:
// - REGISTRAZIONE: `registra` (Peer nuovo, token fisso del dispositivo) o `rinnova` (stesso Peer:
//   disconnect, 300 ms, reconnect). Esce con `open`, con la "presa silenziosa" (socket aperto da 1 s
//   senza risposta: il server ci ha ridato il nostro ID con lo stesso token e non manda `open`),
//   con ID-TAKEN (posto di un altro token: OCCUPATA) o senza esito entro 8 s (nuovo tentativo, backoff).
// - ATTESA: `a` aspetta, fa uno "squillo" a `b` e rinfresca la segnalazione ogni 30 s; `b` chiama `a`
//   con backoff 0-1-2-4-8 s. Solo `b` apre il canale dati (compatibile con i client vecchi): lo squillo
//   di `a` è una chiamata che `b` chiude subito e che gli dice "richiamami adesso".
// - APERTURA: canale in apertura; `b` lascia perdere se `a` non risponde entro 3 s (ICE fermo) o se
//   il canale non si apre entro 12 s.
// - CONNESSO: battito su `ping`/`pong` (silenzio oltre 9 s = perdita).
// - RICONNESSIONE: dopo una perdita si rinnova la segnalazione e si riparte dall'ATTESA.
// - SOSPESO / VERIFICA: pagina nascosta (niente conteggio del silenzio); al ritorno, a `online` o al
//   risveglio rilevato dal timer, prova del canale con un ping e rinnovo della segnalazione.
// Il flag `disconnected` di PeerJS non vale come prova che la segnalazione sia viva.
import type { StatoPartita } from '../stato/types';
import { byteJson, lottiStorico, MAX_MESSAGGIO_BYTE } from './lotti';
import type { EventiStanza, Messaggio, Stanza, StatoConnessione } from './types';

export const PREFISSO = 'sudoku-coppia-';

/** Battito: `ping` se da tanto non si è inviato nulla. */
export const PING_MS = 3000;
/** Silenzio (nessun dato ricevuto) oltre il quale il canale è morto. */
export const SILENZIO_MS = 9000;
/** Giro del battito, del rilevatore di risveglio e dei controlli periodici. */
export const GIRO_MS = 1000;
/** Fra due giri più di così: la pagina era sospesa (iOS non sempre manda eventi). */
export const RISVEGLIO_MS = 6000;
/** Al ritorno in primo piano: tempo concesso al partner per rispondere al ping. */
export const PROVA_PRIMO_PIANO_MS = 2500;
/** `b`: se `a` non dà segni di risposta (ICE fermo) entro questo tempo, la chiamata è persa. */
export const RISPOSTA_MS = 3000;
/** Canale dati che non si apre entro questo tempo: si lascia perdere. */
export const TIMEOUT_CONNESSIONE_MS = 12000;
/** Registrazione sul server senza esito entro questo tempo: nuovo tentativo. */
export const REGISTRAZIONE_MS = 8000;
/** Socket di segnalazione aperto da tanto senza `open` né ID-TAKEN: posto ripreso con lo stesso token. */
export const PRESA_SILENZIOSA_MS = 1000;
/** Se l'adattatore non sa dire se il socket è aperto: dopo tanto si va avanti come registrati. */
export const PRESA_PRESUNTA_MS = 4000;
/** Pausa fra disconnect() e reconnect(): il server vede chiudere il socket e libera l'ID. */
export const PAUSA_RINNOVO_MS = 300;
/** `a` in attesa: ogni tanto si rinnova la segnalazione (un WebSocket zombie non dà segni). */
export const RINFRESCO_A_MS = 30000;
/** Durata dello squillo di `a` verso `b`. */
export const SQUILLO_MS = 3000;
/** Dopo una perdita si dice "mi ricollego…" al massimo per questo tempo, poi "aspetto". */
export const RICOLLEGO_MS = 30000;
/** Due eventi di ritorno vicini (visibilitychange + pageshow) contano una volta sola. */
export const VERIFICA_MIN_MS = 1500;
/** Controllo della registrazione in corso. */
export const CONTROLLO_MS = 250;

/** Backoff delle chiamate di `b` verso `a` (±20%). */
export const BACKOFF_CHIAMATA = [0, 1000, 2000, 4000, 8000] as const;
/** Backoff del rinnovo della segnalazione / ricreazione del Peer. */
export const BACKOFF_RINNOVO = [0, 2000, 5000, 10000, 20000, 30000] as const;
/** Backoff del posto occupato da un altro token. */
export const BACKOFF_OCCUPATA = [10000, 20000, 30000] as const;

/** Dettaglio dello stato quando il mio posto fisso è occupato (la UI lo riconosce). */
export const DETTAGLIO_OCCUPATA = 'occupata';
/** Dettaglio dello stato mentre ci si ricollega dopo una perdita. */
export const DETTAGLIO_RICOLLEGO = 'mi ricollego…';

// ---------- id della stanza ----------

export function normalizzaFrase(frase: string): string {
  return frase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** `sudoku-coppia-<primi 20 hex di sha256(frase normalizzata)>` (senza suffisso -a/-b). */
export async function derivaBase(frase: string, subtleDato?: SubtleCrypto | null): Promise<string> {
  const subtle = subtleDato === undefined ? globalThis.crypto?.subtle : subtleDato;
  if (!subtle) throw new Error('crypto.subtle non disponibile');
  const dati = new TextEncoder().encode(normalizzaFrase(frase));
  const hash = new Uint8Array(await subtle.digest('SHA-256', dati));
  const hex = Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
  return PREFISSO + hex.slice(0, 20);
}

export function idPer(base: string, ruolo: 'a' | 'b'): string {
  return `${base}-${ruolo}`;
}

/** Ritardo del gradino `n` di una scala di backoff, con ±`variazione` di casualità. */
export function ritardo(scala: readonly number[], n: number, casuale: () => number = Math.random, variazione = 0.2): number {
  const base = scala[Math.min(Math.max(n, 0), scala.length - 1)] ?? 0;
  if (!base) return 0;
  return Math.round(base * (1 - variazione + 2 * variazione * casuale()));
}

// ---------- interfacce minime verso PeerJS ----------

export interface GestoriConn {
  aperta(): void;
  dati(d: unknown): void;
  /** chiusura della connessione dati, o errore che la chiude (può arrivare più volte) */
  chiusa(): void;
  /** stato ICE: 'checking'/'connected'/'completed' vogliono dire che l'altro capo ha risposto */
  ice?(stato: string): void;
}

export interface ConnMinima {
  /** id PeerJS dell'altro capo */
  readonly peer: string;
  invia(d: unknown): void;
  chiudi(): void;
  ascolta(g: GestoriConn): void;
}

export interface GestoriPeer {
  /** registrato sul server di segnalazione */
  aperto(): void;
  errore(tipo: string, messaggio?: string): void;
  /** connessione dati in ingresso (non ancora aperta) */
  connessione(c: ConnMinima): void;
  /** perso il collegamento col server di segnalazione */
  disconnesso(): void;
}

export interface PeerMinimo {
  readonly distrutto: boolean;
  readonly disconnesso: boolean;
  /** WebSocket di segnalazione aperto? `undefined` se l'adattatore non lo sa. */
  readonly segnaleAperto?: boolean;
  /** `null` se il peer non può chiamare (scollegato dal server). */
  connetti(id: string): ConnMinima | null;
  distruggi(): void;
  /** chiude solo la segnalazione (`peer.disconnect()`): i canali dati restano */
  scollega?(): void;
  /** riapre la segnalazione con lo stesso id e lo stesso token (`peer.reconnect()`) */
  riconnetti?(): void;
}

export type CreaPeer = (id: string, g: GestoriPeer) => PeerMinimo;

export interface OpzioniStanza {
  frase: string;
  nome: string;
  statoIniziale: () => StatoPartita | null;
  creaPeer: CreaPeer;
  /**
   * Posto fisso nella stanza (stanza di coppia: il ruolo di gioco). Se dato mi registro solo come
   * `-<ruolo>`; se è occupato da un altro token: 'in-attesa'/'occupata', riprovo.
   * Senza: prima `a`, poi `b` (stanza personale).
   */
  ruolo?: 'a' | 'b';
  deriva?: (frase: string) => Promise<string>;
  webrtcDisponibile?: () => boolean;
  log?: (...a: unknown[]) => void;
  /** casualità del backoff (test: costante) */
  casuale?: () => number;
  /** due aperture di fila fallite dopo la risposta del partner: server ICE da rinnovare */
  rinfrescaIce?: () => void;
}

export interface StanzaInterna extends Stanza {
  /** pagina tornata visibile, `pageshow`, rete tornata `online`: verifica subito */
  primoPiano(motivo?: string): void;
  /** pagina nascosta (`visibilitychange` → hidden, `pagehide`) */
  sospendi(): void;
}

const TIPI = new Set(['ciao', 'stato', 'storico', 'cella', 'contatori', 'cursore', 'nuova', 'frase', 'evento', 'ping', 'pong']);

export function eMessaggio(d: unknown): d is Messaggio {
  return typeof d === 'object' && d !== null && TIPI.has((d as { t?: unknown }).t as string);
}

function orario(ms: number): string {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

// ---------- macchina a stati ----------

export function creaStanza(o: OpzioniStanza): StanzaInterna {
  const log = o.log ?? ((...a: unknown[]) => console.log('[stanza]', ...a));
  const deriva = o.deriva ?? ((f: string) => derivaBase(f));
  const webrtcOk = o.webrtcDisponibile ?? (() => typeof RTCPeerConnection !== 'undefined');
  const casuale = o.casuale ?? Math.random;
  const ora = () => Date.now();

  const cbs: { [K in keyof EventiStanza]: Set<EventiStanza[K]> } = {
    stato: new Set(),
    messaggio: new Set(),
    partner: new Set(),
  };

  const fisso = o.ruolo;
  const primo: 'a' | 'b' = fisso ?? 'a';
  let ruolo: 'a' | 'b' | null = null;
  let stato: StatoConnessione = 'connessione';
  let dettaglio: string | undefined;
  let base: string | null = null;
  let chiuso = false; // chiudi() o errore fatale: niente più tentativi
  let nascosta = false;

  // segnalazione
  let peer: PeerMinimo | null = null;
  let generazione = 0; // invalida i callback dei peer distrutti
  let tentato: 'a' | 'b' = primo;
  let registrato = false;
  let inRegistrazione = false;
  let inizioRegistrazione = 0;
  let segnaleApertoDa = 0;
  let mioScollega = false;
  let nRinnovi = 0;
  let nOccupata = 0;
  let ultimoRinfresco = 0;
  let ultimaVerifica = -Infinity;

  // canale dati
  let conn: ConnMinima | null = null; // aperta
  let pendente: ConnMinima | null = null; // in apertura
  let squillo: ConnMinima | null = null; // di `a` verso `b`
  let rispostaArrivata = false;
  let nChiamate = 0;
  let senzaRisposta = 0;
  let apertureFallite = 0;
  let ultimoDato = 0;
  let ultimoInvio = 0;
  let datiRicevuti = 0;
  let persaAlle = -Infinity;
  let dettaglioAttesa = '';

  let tSegnale: ReturnType<typeof setTimeout> | undefined; // rinnovo/registrazione programmati
  let tPausa: ReturnType<typeof setTimeout> | undefined; // fra disconnect e reconnect
  let tControllo: ReturnType<typeof setInterval> | undefined; // registrazione in corso
  let tChiamata: ReturnType<typeof setTimeout> | undefined;
  let tRisposta: ReturnType<typeof setTimeout> | undefined;
  let tApertura: ReturnType<typeof setTimeout> | undefined;
  let tProva: ReturnType<typeof setTimeout> | undefined;
  let tSquillo: ReturnType<typeof setTimeout> | undefined;
  let tGiro: ReturnType<typeof setInterval> | undefined;
  let ultimoGiro = ora();

  function emetti<K extends keyof EventiStanza>(ev: K, ...args: Parameters<EventiStanza[K]>) {
    for (const cb of [...cbs[ev]]) {
      try {
        (cb as (...a: Parameters<EventiStanza[K]>) => void)(...args);
      } catch (e) {
        console.error('[stanza] errore in un ascoltatore', e);
      }
    }
  }

  function emettiStato(s: StatoConnessione, d?: string) {
    if (s === stato && d === dettaglio) return;
    stato = s;
    dettaglio = d;
    emetti('stato', s, d);
  }

  /** In attesa del partner: "mi ricollego…" subito dopo una perdita, poi il dettaglio vero. */
  function attesa(d: string) {
    dettaglioAttesa = d;
    if (conn) return;
    emettiStato('in-attesa', ora() - persaAlle < RICOLLEGO_MS ? DETTAGLIO_RICOLLEGO : d);
  }

  function fermaTimer() {
    for (const t of [tSegnale, tPausa, tChiamata, tRisposta, tApertura, tProva, tSquillo]) clearTimeout(t);
    clearInterval(tControllo);
    clearInterval(tGiro);
    tSegnale = tPausa = tChiamata = tRisposta = tApertura = tProva = tSquillo = undefined;
    tControllo = tGiro = undefined;
  }

  function fineRegistrazione() {
    inRegistrazione = false;
    clearInterval(tControllo);
    tControllo = undefined;
  }

  function distruggiPeer() {
    const p = peer;
    peer = null;
    generazione++;
    registrato = false;
    fineRegistrazione();
    clearTimeout(tPausa);
    tPausa = undefined;
    if (p && !p.distrutto) {
      try {
        p.distruggi();
      } catch {
        /* già distrutto */
      }
    }
  }

  function chiudiPendente() {
    const c = pendente;
    pendente = null;
    clearTimeout(tApertura);
    clearTimeout(tRisposta);
    tApertura = tRisposta = undefined;
    c?.chiudi();
  }

  function chiudiSquillo() {
    const c = squillo;
    squillo = null;
    clearTimeout(tSquillo);
    tSquillo = undefined;
    c?.chiudi();
  }

  function fatale(msg: string) {
    log('errore non recuperabile:', msg);
    chiuso = true;
    fermaTimer();
    chiudiPendente();
    chiudiSquillo();
    const c = conn;
    conn = null;
    c?.chiudi();
    distruggiPeer();
    emettiStato('errore', msg);
  }

  // ---------- segnalazione ----------

  function peerRiusabile(): boolean {
    return !!peer && !peer.distrutto && !!peer.scollega && !!peer.riconnetti;
  }

  /** Peer nuovo (con il token del dispositivo, nell'adattatore) per il posto `r`. */
  function registra(r: 'a' | 'b') {
    if (chiuso || base === null) return;
    distruggiPeer();
    clearTimeout(tSegnale);
    tSegnale = undefined;
    tentato = r;
    const gen = generazione;
    const vivo = () => gen === generazione && !chiuso;
    log(`provo a registrarmi come ${r}`);
    peer = o.creaPeer(idPer(base, r), {
      aperto: () => {
        if (vivo()) registrazioneRiuscita('open');
      },
      errore: (tipo, messaggio) => {
        if (vivo()) gestisciErrore(tipo, messaggio);
      },
      connessione: (c) => {
        if (vivo()) ingresso(c);
        else c.chiudi();
      },
      disconnesso: () => {
        if (vivo()) suDisconnesso();
      },
    });
    sorvegliaRegistrazione();
  }

  /** Stesso Peer: chiude la segnalazione e la riapre con lo stesso id e token; Peer nuovo se non si può. */
  function rinnova() {
    if (chiuso || base === null) return;
    clearTimeout(tSegnale);
    tSegnale = undefined;
    if (!peerRiusabile()) {
      registra(ruolo ?? tentato);
      return;
    }
    const p = peer!;
    const gen = generazione;
    registrato = false;
    fineRegistrazione();
    if (!p.disconnesso) {
      mioScollega = true;
      try {
        p.scollega!();
      } catch {
        /* già scollegato */
      } finally {
        mioScollega = false;
      }
    }
    clearTimeout(tPausa);
    tPausa = setTimeout(() => {
      tPausa = undefined;
      if (gen !== generazione || chiuso) return;
      log(`rinnovo la segnalazione come ${tentato}`);
      try {
        p.riconnetti!();
      } catch (e) {
        log('rinnovo non riuscito, nuovo peer', String(e));
        registra(ruolo ?? tentato);
        return;
      }
      sorvegliaRegistrazione();
    }, PAUSA_RINNOVO_MS);
  }

  /** Rinnovo subito (perdita, ritorno, rinfresco), salvo uno già in corso da poco. */
  function rinnovaOra(motivo: string) {
    if (chiuso || base === null) return;
    nRinnovi = 0;
    if (tPausa !== undefined || (inRegistrazione && ora() - inizioRegistrazione < 2000)) return;
    clearTimeout(tSegnale);
    tSegnale = undefined;
    log(`rinnovo della segnalazione (${motivo})`);
    rinnova();
  }

  /** Rinnovo dopo un fallimento, con backoff; i tentativi dispari ricreano il Peer. */
  function programmaRinnovo(motivo: string) {
    if (chiuso || base === null || tSegnale !== undefined || tPausa !== undefined) return;
    const n = nRinnovi++;
    const ms = ritardo(BACKOFF_RINNOVO, n, casuale);
    log(`segnalazione da rifare fra ${(ms / 1000).toFixed(1)} s (${motivo})`);
    tSegnale = setTimeout(() => {
      tSegnale = undefined;
      if (n % 2 === 1 || !peerRiusabile()) registra(ruolo ?? tentato);
      else rinnova();
    }, ms);
  }

  function sorvegliaRegistrazione() {
    inRegistrazione = true;
    registrato = false;
    inizioRegistrazione = ora();
    segnaleApertoDa = 0;
    clearInterval(tControllo);
    tControllo = setInterval(controllaRegistrazione, CONTROLLO_MS);
  }

  function controllaRegistrazione() {
    if (!inRegistrazione || !peer || chiuso) {
      fineRegistrazione();
      return;
    }
    const t = ora();
    const aperto = peer.segnaleAperto;
    if (aperto === true) {
      segnaleApertoDa ||= t;
      if (t - segnaleApertoDa >= PRESA_SILENZIOSA_MS) {
        registrazioneRiuscita('posto ripreso con lo stesso token');
        return;
      }
    } else segnaleApertoDa = 0;
    if (aperto === undefined && t - inizioRegistrazione >= PRESA_PRESUNTA_MS) {
      registrazioneRiuscita('presunta');
      return;
    }
    if (t - inizioRegistrazione >= REGISTRAZIONE_MS) {
      fineRegistrazione();
      programmaRinnovo('registrazione senza risposta');
    }
  }

  function registrazioneRiuscita(come: string) {
    if (chiuso) return;
    fineRegistrazione();
    clearTimeout(tSegnale);
    tSegnale = undefined;
    registrato = true;
    ruolo = tentato;
    nRinnovi = 0;
    nOccupata = 0;
    ultimoRinfresco = ora();
    log(come === 'open' ? `ruolo: ${tentato}` : `ruolo: ${tentato} (${come})`);
    if (conn) return; // il canale c'è già: era solo la segnalazione da rinfrescare
    if (tentato === 'a') {
      attesa('aspetto il partner');
      suona();
    } else {
      attesa('cerco il partner');
      chiama();
    }
  }

  function suDisconnesso() {
    if (mioScollega) return;
    log('perso il server di segnalazione');
    registrato = false;
    fineRegistrazione();
    programmaRinnovo('server perso');
  }

  function gestisciErrore(tipo: string, messaggio?: string) {
    switch (tipo) {
      case 'unavailable-id': {
        fineRegistrazione();
        registrato = false;
        if (fisso) {
          // con il token fisso il mio vecchio ID mi viene ridato: qui c'è un altro token (un altro mio
          // dispositivo, o un mio ID di prima che il token esistesse: si libera da sé in 60-90 s)
          const ms = ritardo(BACKOFF_OCCUPATA, nOccupata++, casuale);
          log(`posto ${fisso} occupato da un altro dispositivo, riprovo fra ${Math.round(ms / 1000)} s`);
          if (!conn) emettiStato('in-attesa', DETTAGLIO_OCCUPATA);
          clearTimeout(tSegnale);
          tSegnale = setTimeout(() => {
            tSegnale = undefined;
            if (peerRiusabile() && peer!.disconnesso) rinnova();
            else registra(fisso);
          }, ms);
        } else if (!conn && tentato === 'a') {
          log('a occupato: divento b');
          registra('b');
        } else if (!conn) {
          log('anche b occupato, riprovo');
          const ms = ritardo(BACKOFF_RINNOVO, Math.max(1, nRinnovi++), casuale);
          clearTimeout(tSegnale);
          tSegnale = setTimeout(() => {
            tSegnale = undefined;
            registra(primo);
          }, ms);
        } else programmaRinnovo('posto occupato');
        return;
      }
      case 'peer-unavailable':
        // risposte o candidati in ritardo verso un partner sparito: non toccano un canale vivo (N4)
        if (conn) return;
        if (tentato === 'b' && pendente) chiamataFallita('a non c’è', false, false);
        return;
      case 'browser-incompatible':
        fatale('Questo browser non supporta le connessioni dirette (WebRTC). Prova con Chrome, Safari o Firefox aggiornati.');
        return;
      case 'ssl-unavailable':
      case 'invalid-id':
      case 'invalid-key':
        fatale('Il server della stanza ha rifiutato la configurazione. Riprova più tardi.');
        return;
      default:
        // network, socket-error, server-error…: segue `disconnesso` (o il peer è già distrutto)
        log(`errore ${tipo}`, messaggio ?? '');
        if (peer && (peer.distrutto || peer.disconnesso)) programmaRinnovo(`errore ${tipo}`);
    }
  }

  // ---------- canale dati ----------

  /** `b` chiama `a`. */
  function chiama() {
    clearTimeout(tChiamata);
    tChiamata = undefined;
    if (chiuso || base === null || conn || tentato !== 'b' || pendente) return;
    if (!registrato || !peer || peer.distrutto || peer.disconnesso) {
      if (!inRegistrazione) programmaRinnovo('chiamata senza segnalazione');
      return;
    }
    let c: ConnMinima | null = null;
    try {
      c = peer.connetti(idPer(base, 'a'));
    } catch (e) {
      log('chiamata non partita', String(e));
    }
    if (!c) {
      programmaRinnovo('chiamata non partita');
      return;
    }
    rispostaArrivata = false;
    prepara(c);
    tRisposta = setTimeout(() => {
      tRisposta = undefined;
      if (pendente === c && !rispostaArrivata) chiamataFallita('a non risponde', true, false);
    }, RISPOSTA_MS);
  }

  function chiamataFallita(motivo: string, nessunaRisposta: boolean, dopoRisposta: boolean) {
    chiudiPendente();
    if (chiuso || conn || tentato !== 'b') return;
    senzaRisposta = nessunaRisposta ? senzaRisposta + 1 : 0;
    if (dopoRisposta) {
      apertureFallite++;
      emettiStato('in-attesa', 'il partner c’è ma la connessione diretta non riesce, riprovo');
      if (apertureFallite >= 2) {
        apertureFallite = 0;
        log('due aperture fallite: rinnovo i server ICE');
        o.rinfrescaIce?.();
      }
    }
    const ms = ritardo(BACKOFF_CHIAMATA, ++nChiamate, casuale);
    log(`${motivo}: richiamo fra ${(ms / 1000).toFixed(1)} s`);
    clearTimeout(tChiamata);
    tChiamata = setTimeout(() => {
      tChiamata = undefined;
      // due chiamate di fila senza alcuna risposta: forse è la mia segnalazione a essere zombie
      if (senzaRisposta >= 2) {
        senzaRisposta = 0;
        rinnovaOra('nessuna risposta da a');
      } else chiama();
    }, ms);
  }

  /** `a` fa squillare `b`: `b` chiude subito e richiama (lo squillo non apre mai un canale). */
  function suona() {
    if (chiuso || base === null || conn || tentato !== 'a' || squillo || !peer || peer.distrutto || peer.disconnesso) return;
    let c: ConnMinima | null = null;
    try {
      c = peer.connetti(idPer(base, 'b'));
    } catch {
      /* niente squillo */
    }
    if (!c) return;
    const s = c;
    squillo = s;
    s.ascolta({
      aperta: () => s.chiudi(),
      dati: () => {},
      chiusa: () => {
        if (squillo === s) {
          squillo = null;
          clearTimeout(tSquillo);
          tSquillo = undefined;
        }
      },
    });
    tSquillo = setTimeout(() => {
      tSquillo = undefined;
      if (squillo === s) chiudiSquillo();
    }, SQUILLO_MS);
  }

  function suSquillo() {
    if (chiuso || conn) return;
    if (inRegistrazione) {
      // lo squillo è arrivato: la segnalazione funziona (anche se il server non ha mandato `open`)
      registrazioneRiuscita('squillo ricevuto');
      return;
    }
    log('squillo da a: richiamo subito');
    nChiamate = 0;
    senzaRisposta = 0;
    if (pendente && !rispostaArrivata) chiudiPendente();
    chiama();
  }

  function ingresso(c: ConnMinima) {
    if (base === null) {
      c.chiudi();
      return;
    }
    if (tentato === 'a' && c.peer === idPer(base, 'b')) {
      // l'offerta è arrivata: la registrazione funziona anche se `open` non è venuto
      if (inRegistrazione) registrazioneRiuscita('chiamata in arrivo');
      log('connessione in arrivo dal partner');
      chiudiSquillo();
      rispostaArrivata = true;
      prepara(c);
      return;
    }
    if (tentato === 'b' && c.peer === idPer(base, 'a')) {
      c.chiudi();
      suSquillo();
      return;
    }
    log('connessione rifiutata da', c.peer);
    c.chiudi();
  }

  function prepara(c: ConnMinima) {
    if (pendente && pendente !== c) chiudiPendente();
    pendente = c;
    clearTimeout(tApertura);
    tApertura = setTimeout(() => {
      tApertura = undefined;
      if (pendente !== c) return;
      if (tentato === 'b') chiamataFallita('la connessione diretta non si apre', false, true);
      else {
        log('la connessione in arrivo non si apre');
        chiudiPendente();
      }
    }, TIMEOUT_CONNESSIONE_MS);
    c.ascolta({
      aperta: () => {
        if (chiuso || pendente !== c) return;
        pendente = null;
        clearTimeout(tApertura);
        clearTimeout(tRisposta);
        tApertura = tRisposta = undefined;
        attiva(c);
      },
      dati: (d) => {
        if (c === conn) ricevi(d);
      },
      ice: (st) => {
        if (c === pendente && (st === 'checking' || st === 'connected' || st === 'completed')) {
          rispostaArrivata = true;
          clearTimeout(tRisposta);
          tRisposta = undefined;
        }
      },
      chiusa: () => {
        if (c === pendente) {
          const risposto = rispostaArrivata;
          pendente = null;
          clearTimeout(tApertura);
          clearTimeout(tRisposta);
          tApertura = tRisposta = undefined;
          if (tentato === 'b' && !conn) chiamataFallita(risposto ? 'negoziazione fallita' : 'chiamata chiusa', false, risposto);
        } else if (c === conn) {
          perdita('close');
        }
      },
    });
  }

  function inviaUno(m: Messaggio) {
    if (!conn) return;
    const byte = byteJson(m);
    if (byte > MAX_MESSAGGIO_BYTE) {
      log(`messaggio ${m.t} troppo grande (${byte} byte): non lo mando`);
      return;
    }
    try {
      conn.invia(m);
      ultimoInvio = ora();
    } catch (e) {
      // un errore di invio non chiude la connessione: se è morta lo dice il battito
      log('invio fallito', String(e));
    }
  }

  function inviaGrezzo(m: Messaggio) {
    if (!conn) return;
    if (m.t === 'storico') for (const lotto of lottiStorico(m)) inviaUno(lotto);
    else inviaUno(m);
  }

  function attiva(c: ConnMinima) {
    const vecchia = conn;
    conn = c;
    if (vecchia && vecchia !== c) vecchia.chiudi(); // conn già sostituita: la chiusura non conta come perdita
    clearTimeout(tChiamata);
    tChiamata = undefined;
    chiudiSquillo();
    nChiamate = 0;
    senzaRisposta = 0;
    apertureFallite = 0;
    persaAlle = -Infinity;
    ultimoDato = ora();
    log(`connesso (ruolo ${ruolo ?? tentato})`);
    let statoPartita: StatoPartita | null = null;
    try {
      statoPartita = o.statoIniziale();
    } catch (e) {
      console.error('[stanza] statoIniziale ha lanciato', e);
    }
    inviaGrezzo({ t: 'ciao', nome: o.nome, stato: statoPartita, ts: Date.now() });
    emettiStato('connesso');
  }

  function ricevi(d: unknown) {
    datiRicevuti++;
    ultimoDato = ora();
    if (!eMessaggio(d)) {
      log('messaggio ignorato', d);
      return;
    }
    if (d.t === 'ping') {
      inviaGrezzo({ t: 'pong' });
      return;
    }
    if (d.t === 'pong') return;
    if (d.t === 'ciao') {
      log(`partner: ${d.nome}`);
      emetti('partner', d.nome);
    }
    emetti('messaggio', d);
  }

  function perdita(motivo: string) {
    if (chiuso) return;
    log('connessione persa:', motivo);
    clearTimeout(tProva);
    tProva = undefined;
    const c = conn;
    conn = null;
    c?.chiudi();
    persaAlle = ora();
    nChiamate = 0;
    senzaRisposta = 0;
    attesa(tentato === 'a' ? 'aspetto il partner' : 'cerco il partner');
    rinnovaOra('perdita');
  }

  // ---------- battito, risveglio, ritorno ----------

  function giro() {
    const t = ora();
    const salto = t - ultimoGiro;
    ultimoGiro = t;
    if (chiuso || base === null) return;
    if (!nascosta && salto > RISVEGLIO_MS) {
      log(`risveglio: pagina ferma per ${Math.round(salto / 1000)} s`);
      verifica('risveglio');
      return;
    }
    if (conn) {
      if (t - ultimoInvio >= PING_MS) inviaGrezzo({ t: 'ping' });
      // a pagina nascosta i timer ritardano: il silenzio non si conta (si verifica al ritorno)
      if (!nascosta && tProva === undefined && t - ultimoDato > SILENZIO_MS) {
        perdita(`silenzio ${SILENZIO_MS / 1000} s (ultimo dato ${orario(ultimoDato)})`);
      }
      return;
    }
    if (stato === 'in-attesa' && dettaglio === DETTAGLIO_RICOLLEGO && t - persaAlle >= RICOLLEGO_MS) {
      emettiStato('in-attesa', dettaglioAttesa || 'aspetto il partner');
    }
    if (tentato === 'a' && registrato && !nascosta && t - ultimoRinfresco >= RINFRESCO_A_MS) {
      ultimoRinfresco = t;
      rinnovaOra('rinfresco');
    }
  }

  function verifica(motivo: string) {
    if (chiuso || base === null) return;
    nascosta = false;
    const t = ora();
    ultimoGiro = t;
    if (t - ultimaVerifica < VERIFICA_MIN_MS) return;
    ultimaVerifica = t;
    nChiamate = 0;
    senzaRisposta = 0;
    nOccupata = 0;
    log(`verifica (${motivo})`);
    if (conn) {
      if (t - ultimoDato > SILENZIO_MS) {
        perdita(`ritorno dopo ${Math.round((t - ultimoDato) / 1000)} s senza dati`);
        return;
      }
      const prima = datiRicevuti;
      const c = conn;
      inviaGrezzo({ t: 'ping' });
      clearTimeout(tProva);
      tProva = setTimeout(() => {
        tProva = undefined;
        if (conn === c && datiRicevuti === prima) perdita('nessuna risposta dopo il ritorno');
      }, PROVA_PRIMO_PIANO_MS);
    }
    // la segnalazione può essere un WebSocket zombie: si rinnova comunque
    rinnovaOra(`ritorno: ${motivo}`);
  }

  const stanza: StanzaInterna = {
    get ruolo() {
      return ruolo;
    },
    get stato() {
      return stato;
    },
    on(evento, cb) {
      (cbs[evento] as Set<typeof cb>).add(cb);
      return () => {
        (cbs[evento] as Set<typeof cb>).delete(cb);
      };
    },
    invia(m) {
      inviaGrezzo(m);
    },
    chiudi() {
      if (chiuso && !peer && !conn) return;
      log('chiudo la stanza');
      chiuso = true;
      fermaTimer();
      chiudiPendente();
      chiudiSquillo();
      const c = conn;
      conn = null;
      c?.chiudi();
      distruggiPeer();
    },
    primoPiano(motivo = 'primo piano') {
      verifica(motivo);
    },
    sospendi() {
      if (chiuso || nascosta) return;
      nascosta = true;
      log('pagina nascosta');
    },
  };

  tGiro = setInterval(giro, GIRO_MS);

  // avvio asincrono: chi chiama apriStanza fa in tempo ad agganciare gli ascoltatori
  Promise.resolve().then(async () => {
    if (chiuso) return;
    if (!webrtcOk()) {
      fatale('Questo browser non supporta le connessioni dirette (WebRTC). Prova con Chrome, Safari o Firefox aggiornati.');
      return;
    }
    let b: string;
    try {
      b = await deriva(o.frase);
    } catch {
      fatale('Non riesco a calcolare la stanza dalla frase: apri il sito con https.');
      return;
    }
    if (chiuso) return;
    base = b;
    log(`stanza ${b}`);
    registra(primo);
  });

  return stanza;
}
