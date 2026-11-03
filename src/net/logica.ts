// Logica pura della stanza P2P: derivazione degli id, scelta a/b, riconnessione, heartbeat.
// Non importa PeerJS: parla con un "peer minimo" (adattato in index.ts, mockato nei test).
import type { StatoPartita } from '../stato/types';
import type { EventiStanza, Messaggio, Stanza, StatoConnessione } from './types';

export const PREFISSO = 'sudoku-coppia-';
/** Pausa fra un tentativo di riconnessione e il successivo. */
export const RITENTA_MS = 3000;
/** Intervallo del ping. */
export const PING_MS = 5000;
/** Ping consecutivi senza risposta prima di dichiarare morta la connessione. */
export const PING_MANCATI_MAX = 3;
/** Se `b` non riesce ad aprire la connessione dati entro questo tempo, ricomincia. */
export const TIMEOUT_CONNESSIONE_MS = 10000;
/** Al ritorno in primo piano: tempo concesso al partner per rispondere al ping. */
export const PROVA_PRIMO_PIANO_MS = 3000;

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

// ---------- interfacce minime verso PeerJS ----------

export interface GestoriConn {
  aperta(): void;
  dati(d: unknown): void;
  /** chiusura o errore della connessione dati (può arrivare più volte) */
  chiusa(): void;
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
  connetti(id: string): ConnMinima;
  distruggi(): void;
}

export type CreaPeer = (id: string, g: GestoriPeer) => PeerMinimo;

export interface OpzioniStanza {
  frase: string;
  nome: string;
  statoIniziale: () => StatoPartita | null;
  creaPeer: CreaPeer;
  deriva?: (frase: string) => Promise<string>;
  webrtcDisponibile?: () => boolean;
  log?: (...a: unknown[]) => void;
}

export interface StanzaInterna extends Stanza {
  /** da chiamare quando la pagina torna visibile o la rete torna online */
  primoPiano(): void;
}

const TIPI = new Set(['ciao', 'stato', 'storico', 'cella', 'contatori', 'cursore', 'nuova', 'frase', 'evento', 'ping', 'pong']);

export function eMessaggio(d: unknown): d is Messaggio {
  return typeof d === 'object' && d !== null && TIPI.has((d as { t?: unknown }).t as string);
}

// ---------- macchina a stati ----------

export function creaStanza(o: OpzioniStanza): StanzaInterna {
  const log = o.log ?? ((...a: unknown[]) => console.log('[stanza]', ...a));
  const deriva = o.deriva ?? ((f: string) => derivaBase(f));
  const webrtcOk = o.webrtcDisponibile ?? (() => typeof RTCPeerConnection !== 'undefined');

  const cbs: { [K in keyof EventiStanza]: Set<EventiStanza[K]> } = {
    stato: new Set(),
    messaggio: new Set(),
    partner: new Set(),
  };

  let ruolo: 'a' | 'b' | null = null;
  let stato: StatoConnessione = 'connessione';
  let dettaglio: string | undefined;
  let base: string | null = null;

  let peer: PeerMinimo | null = null;
  let generazione = 0; // invalida i callback dei peer distrutti
  let tentato: 'a' | 'b' = 'a';
  let registrato = false;

  let conn: ConnMinima | null = null; // connessione dati aperta
  let pendente: ConnMinima | null = null; // connessione dati in apertura

  let chiuso = false; // chiudi() o errore fatale: niente più tentativi
  let timerRitenta: ReturnType<typeof setTimeout> | undefined;
  let timerTimeout: ReturnType<typeof setTimeout> | undefined;
  let timerProva: ReturnType<typeof setTimeout> | undefined;
  let timerPing: ReturnType<typeof setInterval> | undefined;
  let mancati = 0;
  let datiRicevuti = 0;

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

  function fermaTimer() {
    clearTimeout(timerRitenta);
    clearTimeout(timerTimeout);
    clearTimeout(timerProva);
    clearInterval(timerPing);
    timerRitenta = timerTimeout = timerProva = timerPing = undefined;
  }

  function distruggiPeer() {
    const p = peer;
    peer = null;
    generazione++;
    registrato = false;
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
    clearTimeout(timerTimeout);
    timerTimeout = undefined;
    c?.chiudi();
  }

  function fatale(msg: string) {
    log('errore non recuperabile:', msg);
    chiuso = true;
    fermaTimer();
    chiudiPendente();
    const c = conn;
    conn = null;
    c?.chiudi();
    distruggiPeer();
    emettiStato('errore', msg);
  }

  /** Distrugge il peer e riparte da `a` dopo `ms`. */
  function ricomincia(ms: number) {
    if (chiuso) return;
    chiudiPendente();
    distruggiPeer();
    clearTimeout(timerRitenta);
    log(ms ? `riconnessione fra ${ms / 1000} s` : 'riconnessione subito');
    timerRitenta = setTimeout(() => {
      timerRitenta = undefined;
      registra('a');
    }, ms);
  }

  function registra(r: 'a' | 'b') {
    if (chiuso || base === null) return;
    distruggiPeer();
    tentato = r;
    const gen = generazione;
    const vivo = () => gen === generazione && !chiuso;
    log(`provo a registrarmi come ${r}`);
    peer = o.creaPeer(idPer(base, r), {
      aperto: () => {
        if (!vivo()) return;
        registrato = true;
        ruolo = r;
        log(`ruolo: ${r}`);
        if (r === 'a') {
          if (!conn) emettiStato('in-attesa', 'aspetto il partner');
        } else {
          emettiStato('in-attesa', 'cerco il partner');
          connettiAdA();
        }
      },
      errore: (tipo, messaggio) => {
        if (!vivo()) return;
        gestisciErrore(tipo, messaggio);
      },
      connessione: (c) => {
        if (!vivo()) return;
        ingresso(c);
      },
      disconnesso: () => {
        if (!vivo()) return;
        log('perso il server di segnalazione');
        // la connessione dati vive anche senza server: si ricomincia solo se non c'è
        if (!conn) ricomincia(RITENTA_MS);
      },
    });
  }

  function gestisciErrore(tipo: string, messaggio?: string) {
    switch (tipo) {
      case 'unavailable-id':
        if (!registrato && tentato === 'a') {
          log('a occupato: divento b');
          registra('b');
        } else if (!conn) {
          log('anche b occupato, riprovo');
          ricomincia(RITENTA_MS);
        }
        return;
      case 'peer-unavailable':
        log('a non risponde');
        ricomincia(RITENTA_MS);
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
        log(`errore ${tipo}`, messaggio ?? '');
        if (!conn) ricomincia(RITENTA_MS);
    }
  }

  function connettiAdA() {
    if (!peer || base === null) return;
    const c = peer.connetti(idPer(base, 'a'));
    prepara(c);
    clearTimeout(timerTimeout);
    timerTimeout = setTimeout(() => {
      timerTimeout = undefined;
      if (pendente !== c) return;
      log('la connessione diretta non si apre');
      emettiStato('in-attesa', 'il partner c’è ma la connessione diretta non riesce, riprovo');
      ricomincia(RITENTA_MS);
    }, TIMEOUT_CONNESSIONE_MS);
  }

  function ingresso(c: ConnMinima) {
    if (base === null || c.peer !== idPer(base, 'b')) {
      log('connessione rifiutata da', c.peer);
      c.chiudi();
      return;
    }
    log('connessione in arrivo dal partner');
    prepara(c);
  }

  function prepara(c: ConnMinima) {
    if (pendente && pendente !== c) chiudiPendente();
    pendente = c;
    c.ascolta({
      aperta: () => {
        if (chiuso || pendente !== c) return;
        pendente = null;
        clearTimeout(timerTimeout);
        timerTimeout = undefined;
        attiva(c);
      },
      dati: (d) => {
        if (c === conn) ricevi(d);
      },
      chiusa: () => {
        if (c === pendente) {
          pendente = null;
          clearTimeout(timerTimeout);
          timerTimeout = undefined;
          // per b una connessione fallita prima di aprirsi vuol dire ricominciare
          if (tentato === 'b' && !conn) ricomincia(RITENTA_MS);
        } else if (c === conn) {
          perdita('connessione chiusa');
        }
      },
    });
  }

  function inviaGrezzo(m: Messaggio) {
    if (!conn) return;
    try {
      conn.invia(m);
    } catch (e) {
      log('invio fallito', e);
    }
  }

  function attiva(c: ConnMinima) {
    const vecchia = conn;
    conn = c;
    if (vecchia && vecchia !== c) vecchia.chiudi(); // conn già sostituita: la chiusura non conta come perdita
    clearTimeout(timerRitenta);
    timerRitenta = undefined;
    mancati = 0;
    clearInterval(timerPing);
    timerPing = setInterval(battito, PING_MS);
    log(`connesso (ruolo ${ruolo})`);
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
    mancati = 0;
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

  function battito() {
    if (!conn) return;
    if (mancati >= PING_MANCATI_MAX) {
      perdita(`${PING_MANCATI_MAX} ping senza risposta`);
      return;
    }
    mancati++;
    inviaGrezzo({ t: 'ping' });
  }

  function perdita(motivo: string) {
    if (chiuso) return;
    log('connessione persa:', motivo);
    clearInterval(timerPing);
    clearTimeout(timerProva);
    timerPing = timerProva = undefined;
    const c = conn;
    conn = null;
    c?.chiudi();
    if (ruolo === 'a' && registrato && peer && !peer.distrutto && !peer.disconnesso) {
      log('resto a e aspetto');
      emettiStato('in-attesa', 'aspetto il partner');
      return;
    }
    emettiStato('in-attesa', 'riconnessione…');
    ricomincia(RITENTA_MS);
  }

  function primoPiano() {
    if (chiuso || base === null) return;
    if (conn) {
      // verifica rapida: se il partner non risponde entro poco, la connessione è morta
      const prima = datiRicevuti;
      const c = conn;
      inviaGrezzo({ t: 'ping' });
      clearTimeout(timerProva);
      timerProva = setTimeout(() => {
        timerProva = undefined;
        if (conn === c && datiRicevuti === prima) perdita('nessuna risposta dopo il ritorno in primo piano');
      }, PROVA_PRIMO_PIANO_MS);
      return;
    }
    const aspettaBene = tentato === 'a' && registrato && peer && !peer.distrutto && !peer.disconnesso;
    if (aspettaBene) return;
    log('primo piano: ritento subito');
    ricomincia(0);
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
      const c = conn;
      conn = null;
      c?.chiudi();
      distruggiPeer();
    },
    primoPiano,
  };

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
    registra('a');
  });

  return stanza;
}
