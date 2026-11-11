import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKOFF_CHIAMATA,
  BACKOFF_OCCUPATA,
  BACKOFF_RINNOVO,
  creaStanza,
  derivaBase,
  DETTAGLIO_OCCUPATA,
  DETTAGLIO_RICOLLEGO,
  GIRO_MS,
  normalizzaFrase,
  PAUSA_RINNOVO_MS,
  PING_MS,
  PRESA_SILENZIOSA_MS,
  PROVA_PRIMO_PIANO_MS,
  PROVA_SQUILLO_MS,
  REGISTRAZIONE_MS,
  RICOLLEGO_MS,
  RINFRESCO_A_MS,
  RISPOSTA_MS,
  ritardo,
  SILENZIO_MS,
  SQUILLO_MS,
  TIMEOUT_CONNESSIONE_MS,
  type ConnMinima,
  type GestoriConn,
  type GestoriPeer,
  type PeerMinimo,
  type StanzaInterna,
} from './logica';
import { MAX_MESSAGGIO_BYTE } from './lotti';
import type { Messaggio, StatoConnessione } from './types';
import type { VoceStorico } from '../stato/types';

const BASE = 'sudoku-coppia-0123456789abcdef0123';
const A = `${BASE}-a`;
const B = `${BASE}-b`;

// ---------- finti ----------

class ConnFinta implements ConnMinima {
  inviati: unknown[] = [];
  chiusa = false;
  rotta = false; // invia lancia
  g!: GestoriConn;
  peer: string;
  constructor(peer: string) {
    this.peer = peer;
  }
  invia(d: unknown) {
    if (this.chiusa || this.rotta) throw new Error('chiusa');
    this.inviati.push(d);
  }
  chiudi() {
    if (this.chiusa) return;
    this.chiusa = true;
    this.g?.chiusa();
  }
  ascolta(g: GestoriConn) {
    this.g = g;
  }
  apri() {
    this.g.aperta();
  }
  ricevi(m: unknown) {
    this.g.dati(m);
  }
  tipiInviati() {
    return this.inviati.map((m) => (m as Messaggio).t);
  }
}

class PeerFinto implements PeerMinimo {
  distrutto = false;
  disconnesso = false;
  segnaleAperto: boolean | undefined = false;
  connessioni: ConnFinta[] = [];
  scollegamenti = 0;
  riconnessioni = 0;
  id: string;
  g: GestoriPeer;
  constructor(id: string, g: GestoriPeer) {
    this.id = id;
    this.g = g;
  }
  connetti(id: string) {
    if (this.disconnesso || this.distrutto) return null;
    const c = new ConnFinta(id);
    this.connessioni.push(c);
    return c;
  }
  distruggi() {
    this.distrutto = true;
  }
  scollega() {
    // come PeerJS: disconnect() manda subito 'disconnected'
    this.disconnesso = true;
    this.scollegamenti++;
    this.g.disconnesso();
  }
  riconnetti() {
    this.disconnesso = false;
    this.riconnessioni++;
  }
  /** chiamate verso a (le connessioni di b) */
  chiamate() {
    return this.connessioni.filter((c) => c.peer === A);
  }
  squilli() {
    return this.connessioni.filter((c) => c.peer === B);
  }
}

function prepara(ruolo?: 'a' | 'b', extra: { rinfrescaIce?: () => void } = {}) {
  const peers: PeerFinto[] = [];
  const stati: [StatoConnessione, string | undefined][] = [];
  const messaggi: Messaggio[] = [];
  const partner: string[] = [];
  const righe: string[] = [];
  const s: StanzaInterna = creaStanza({
    frase: 'frase',
    nome: 'Genna',
    ruolo,
    statoIniziale: () => null,
    deriva: async () => BASE,
    webrtcDisponibile: () => true,
    log: (...a) => righe.push(a.map(String).join(' ')),
    casuale: () => 0.5, // backoff senza casualità
    creaPeer: (id, g) => {
      const p = new PeerFinto(id, g);
      peers.push(p);
      return p;
    },
    ...extra,
  });
  s.on('stato', (st, d) => stati.push([st, d]));
  s.on('messaggio', (m) => messaggi.push(m));
  s.on('partner', (n) => partner.push(n));
  const ultimo = () => peers[peers.length - 1];
  const ultimoStato = () => stati[stati.length - 1];
  return { s, peers, stati, messaggi, partner, righe, ultimo, ultimoStato };
}

type T = ReturnType<typeof prepara>;

const avvio = () => vi.advanceTimersByTimeAsync(0);
const avanza = (ms: number) => vi.advanceTimersByTimeAsync(ms);

/** stanza personale: a occupato → b, connesso; ritorna la connessione verso a */
async function comeBConnesso(t: T) {
  await avvio();
  t.ultimo().g.errore('unavailable-id');
  t.ultimo().g.aperto();
  const c = t.ultimo().chiamate()[0];
  c.apri();
  return c;
}

/** posto fisso b, registrato e connesso */
async function bFissoConnesso(t: T) {
  await avvio();
  const pb = t.ultimo();
  pb.g.aperto();
  const c = pb.chiamate()[0];
  c.apri();
  return { pb, c };
}

/** posto fisso a, registrato e connesso con b */
async function aFissoConnesso(t: T) {
  await avvio();
  const pa = t.ultimo();
  pa.g.aperto();
  const c = new ConnFinta(B);
  pa.g.connessione(c);
  c.apri();
  return { pa, c };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ---------- id ----------

describe('derivazione id', () => {
  it('normalizza la frase', () => {
    expect(normalizzaFrase('  Sei   MINI \n tu ')).toBe('sei mini tu');
  });
  it('sha256 della frase normalizzata, primi 20 hex', async () => {
    vi.useRealTimers();
    // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(await derivaBase('  ABC ')).toBe('sudoku-coppia-ba7816bf8f01cfea4141');
    expect(await derivaBase('a  b')).toBe(await derivaBase('A b'));
  });
  it('senza crypto.subtle lancia', async () => {
    vi.useRealTimers();
    await expect(derivaBase('x', null)).rejects.toThrow();
  });
});

// ---------- backoff ----------

describe('backoff', () => {
  it('gradini della scala, poi fermo sull’ultimo', () => {
    const fisso = () => 0.5;
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => ritardo(BACKOFF_CHIAMATA, n, fisso))).toEqual([0, 1000, 2000, 4000, 8000, 8000, 8000]);
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => ritardo(BACKOFF_RINNOVO, n, fisso))).toEqual([0, 2000, 5000, 10000, 20000, 30000, 30000]);
    expect([0, 1, 2, 3].map((n) => ritardo(BACKOFF_OCCUPATA, n, fisso))).toEqual([10000, 20000, 30000, 30000]);
  });
  it('±20% di casualità, mai sullo zero', () => {
    expect(ritardo(BACKOFF_CHIAMATA, 4, () => 0)).toBe(6400);
    expect(ritardo(BACKOFF_CHIAMATA, 4, () => 1)).toBe(9600);
    expect(ritardo(BACKOFF_CHIAMATA, 0, () => 1)).toBe(0);
    for (let i = 0; i < 50; i++) {
      const r = ritardo(BACKOFF_CHIAMATA, 2);
      expect(r).toBeGreaterThanOrEqual(1600);
      expect(r).toBeLessThanOrEqual(2400);
    }
  });
});

// ---------- stanza personale: primo libero fra a e b ----------

describe('scelta a/b (stanza personale)', () => {
  it('prova prima a e aspetta', async () => {
    const t = prepara();
    expect(t.s.stato).toBe('connessione');
    await avvio();
    expect(t.peers.map((p) => p.id)).toEqual([A]);
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('a');
    expect(t.s.stato).toBe('in-attesa');
  });

  it('se a è occupato diventa b e si connette ad a', async () => {
    const t = prepara();
    await avvio();
    const pa = t.ultimo();
    pa.g.errore('unavailable-id');
    expect(pa.distrutto).toBe(true);
    expect(t.ultimo().id).toBe(B);
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('b');
    expect(t.ultimo().connessioni.map((c) => c.peer)).toEqual([A]);
  });

  it('a accetta solo connessioni da b', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.aperto();
    const estraneo = new ConnFinta('qualcun-altro');
    t.ultimo().g.connessione(estraneo);
    expect(estraneo.chiusa).toBe(true);
    const b = new ConnFinta(B);
    t.ultimo().g.connessione(b);
    b.apri();
    expect(t.s.stato).toBe('connesso');
  });

  it('a e b entrambi occupati → riprova da a dopo un po’', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('unavailable-id');
    t.ultimo().g.errore('unavailable-id');
    expect(t.peers).toHaveLength(2);
    await avanza(BACKOFF_RINNOVO[1]);
    expect(t.peers).toHaveLength(3);
    expect(t.ultimo().id).toBe(A);
  });

  it('webrtc assente → errore', async () => {
    const s = creaStanza({
      frase: 'x',
      nome: 'n',
      statoIniziale: () => null,
      creaPeer: () => {
        throw new Error('non deve essere chiamato');
      },
      webrtcDisponibile: () => false,
      log: () => {},
    });
    const stati: string[] = [];
    s.on('stato', (st, d) => stati.push(`${st}:${d}`));
    await avvio();
    expect(s.stato).toBe('errore');
    expect(stati[0]).toMatch(/^errore:.*WebRTC/);
  });

  it('browser-incompatible è fatale e ferma i tentativi', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('browser-incompatible');
    expect(t.s.stato).toBe('errore');
    await avanza(120_000);
    expect(t.peers).toHaveLength(1);
  });

  it('i callback di un peer distrutto vengono ignorati', async () => {
    const t = prepara();
    await avvio();
    const pa = t.ultimo();
    pa.g.errore('unavailable-id');
    pa.g.aperto(); // peer vecchio: non deve dare ruolo a
    expect(t.s.ruolo).toBe(null);
  });
});

// ---------- connessione e messaggi ----------

describe('connessione', () => {
  it('all’apertura invia ciao e diventa connesso; inoltra i messaggi', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    expect(t.s.stato).toBe('connesso');
    expect(c.inviati[0]).toMatchObject({ t: 'ciao', nome: 'Genna', stato: null });
    c.ricevi({ t: 'ciao', nome: 'Lei', stato: null, ts: 1 });
    c.ricevi({ t: 'cursore', idx: 4 });
    expect(t.partner).toEqual(['Lei']);
    expect(t.messaggi.map((m) => m.t)).toEqual(['ciao', 'cursore']);
  });

  it('invia scarta quando non connesso', async () => {
    const t = prepara();
    await avvio();
    expect(() => t.s.invia({ t: 'cursore', idx: 1 })).not.toThrow();
  });

  it('on restituisce la funzione di rimozione', async () => {
    const t = prepara();
    const visti: string[] = [];
    const via = t.s.on('stato', (s) => visti.push(s));
    via();
    await avvio();
    t.ultimo().g.aperto();
    expect(visti).toEqual([]);
    expect(t.stati.length).toBeGreaterThan(0);
  });

  it('un errore di invio non chiude la connessione', async () => {
    const t = prepara('b');
    const { c } = await bFissoConnesso(t);
    c.rotta = true;
    expect(() => t.s.invia({ t: 'cursore', idx: 3 })).not.toThrow();
    expect(t.s.stato).toBe('connesso');
    expect(c.chiusa).toBe(false);
    expect(t.righe.some((r) => r.startsWith('invio fallito'))).toBe(true);
  });

  it('storico grande: parte a lotti sotto il limite; un messaggio troppo grande non parte', async () => {
    const t = prepara('b');
    const { c } = await bFissoConnesso(t);
    const voce = (k: number): VoceStorico =>
      ({ id: `sudoku-${k}`, modalita: 'sudoku', livello: 'semini', seed: k, iniziata: k, aggiornata: k, finita: false, pieno: 'x'.repeat(3000) }) as unknown as VoceStorico;
    const storico = Array.from({ length: 12 }, (_, k) => voce(k));
    t.s.invia({ t: 'storico', storico, azzerato: 5 });
    const lotti = c.inviati.filter((m) => (m as Messaggio).t === 'storico') as Extract<Messaggio, { t: 'storico' }>[];
    expect(lotti.length).toBeGreaterThan(1);
    expect(lotti.flatMap((l) => l.storico.map((v) => v.id))).toEqual(storico.map((v) => v.id));
    for (const l of lotti) {
      expect(new TextEncoder().encode(JSON.stringify(l)).length).toBeLessThanOrEqual(12000);
      expect(l.azzerato).toBe(5);
    }
    const n = c.inviati.length;
    t.s.invia({ t: 'frase', testo: 'y'.repeat(MAX_MESSAGGIO_BYTE) });
    expect(c.inviati).toHaveLength(n);
    expect(t.righe.some((r) => /messaggio frase troppo grande/.test(r))).toBe(true);
    expect(t.s.stato).toBe('connesso');
  });
});

// ---------- posti fissi (stanza di coppia) ----------

describe('posto fisso per profilo', () => {
  it('ruolo a: si registra solo come a e aspetta; accetta solo b', async () => {
    const t = prepara('a');
    await avvio();
    expect(t.peers.map((p) => p.id)).toEqual([A]);
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('a');
    expect(t.ultimoStato()).toEqual(['in-attesa', 'aspetto il partner']);
    const b = new ConnFinta(B);
    t.ultimo().g.connessione(b);
    b.apri();
    expect(t.s.stato).toBe('connesso');
  });

  it('ruolo b: si registra solo come b e chiama a, mai come a', async () => {
    const t = prepara('b');
    await avvio();
    expect(t.peers.map((p) => p.id)).toEqual([B]);
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('b');
    expect(t.ultimoStato()).toEqual(['in-attesa', 'cerco il partner']);
    expect(t.ultimo().connessioni.map((c) => c.peer)).toEqual([A]);
  });

  it('a registrato fa uno squillo a b, che dura poco', async () => {
    const t = prepara('a');
    await avvio();
    const pa = t.ultimo();
    pa.g.aperto();
    expect(pa.squilli()).toHaveLength(1);
    await avanza(SQUILLO_MS);
    expect(pa.squilli()[0].chiusa).toBe(true);
    // lo squillo non apre mai un canale
    expect(t.s.stato).toBe('in-attesa');
  });

  it('b: uno squillo da a si chiude e fa richiamare subito, saltando il backoff', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    pb.g.errore('peer-unavailable'); // a non c'era: prossima chiamata fra 1 s
    expect(pb.chiamate()).toHaveLength(1);
    const squillo = new ConnFinta(A);
    pb.g.connessione(squillo);
    expect(squillo.chiusa).toBe(true);
    expect(pb.chiamate()).toHaveLength(2);
    pb.chiamate()[1].apri();
    expect(t.s.stato).toBe('connesso');
  });

  it('b connesso: uno squillo da a fa un ping di prova; canale muto → perdita e richiamata, canale vivo → resta', async () => {
    const t = prepara('b');
    const { pb, c } = await bFissoConnesso(t);
    pb.g.connessione(new ConnFinta(A)); // squillo incrociato con la chiamata appena riuscita
    expect(c.tipiInviati().at(-1)).toBe('ping');
    c.ricevi({ t: 'pong' });
    await avanza(PROVA_SQUILLO_MS);
    expect(c.chiusa).toBe(false);
    pb.g.connessione(new ConnFinta(A)); // pagina di a riaperta: il canale vecchio è morto
    await avanza(PROVA_SQUILLO_MS);
    expect(c.chiusa).toBe(true);
    expect(t.righe.some((r) => /squillo da a: il canale vecchio non risponde/.test(r))).toBe(true);
    await avanza(PAUSA_RINNOVO_MS);
    pb.g.aperto();
    expect(pb.chiamate()).toHaveLength(2);
  });

  it('b rifiuta connessioni da altri', async () => {
    const t = prepara('b');
    await avvio();
    t.ultimo().g.aperto();
    const x = new ConnFinta('qualcun-altro');
    t.ultimo().g.connessione(x);
    expect(x.chiusa).toBe(true);
  });
});

// ---------- macchina a stati: chiamate di b ----------

describe('chiamate di b verso a', () => {
  it('a assente (peer-unavailable): richiama con lo stesso peer dopo 1, 2, 4, 8, 8 s', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    const attese = [1000, 2000, 4000, 8000, 8000];
    for (const [k, ms] of attese.entries()) {
      pb.g.errore('peer-unavailable');
      await avanza(ms - 1);
      expect(pb.chiamate()).toHaveLength(k + 1);
      await avanza(1);
      expect(pb.chiamate()).toHaveLength(k + 2);
    }
    expect(t.peers).toHaveLength(1);
    expect(pb.distrutto).toBe(false);
  });

  it('nessun segno di risposta entro 3 s: la chiamata è persa; due di fila → rinnovo della segnalazione', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    await avanza(RISPOSTA_MS);
    expect(pb.chiamate()[0].chiusa).toBe(true);
    await avanza(1000);
    expect(pb.chiamate()).toHaveLength(2);
    await avanza(RISPOSTA_MS);
    expect(pb.chiamate()[1].chiusa).toBe(true);
    await avanza(2000);
    // la seconda senza risposta: si rinnova la segnalazione (stesso peer) prima di richiamare
    expect(pb.scollegamenti).toBe(1);
    await avanza(PAUSA_RINNOVO_MS);
    expect(pb.riconnessioni).toBe(1);
    pb.g.aperto();
    expect(pb.chiamate()).toHaveLength(3);
    expect(t.peers).toHaveLength(1);
  });

  it('a risponde (ICE in corso) ma il canale non si apre in 12 s: si riprova; due volte → server ICE nuovi', async () => {
    const rinfresca = vi.fn();
    const t = prepara('b', { rinfrescaIce: rinfresca });
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    pb.chiamate()[0].g.ice?.('checking');
    await avanza(RISPOSTA_MS);
    expect(pb.chiamate()[0].chiusa).toBe(false);
    await avanza(TIMEOUT_CONNESSIONE_MS - RISPOSTA_MS);
    expect(pb.chiamate()[0].chiusa).toBe(true);
    expect(t.ultimoStato()?.[1]).toMatch(/connessione diretta non riesce/);
    await avanza(1000);
    pb.chiamate()[1].g.ice?.('checking');
    await avanza(TIMEOUT_CONNESSIONE_MS);
    expect(rinfresca).toHaveBeenCalledTimes(1);
  });

  it('negoziazione fallita dopo la risposta → si riprova', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    const c = pb.chiamate()[0];
    c.g.ice?.('checking');
    c.chiudi();
    await avanza(1000);
    expect(pb.chiamate()).toHaveLength(2);
  });
});

// ---------- macchina a stati: perdite e segnalazione ----------

describe('riconnessione', () => {
  it('a: il canale si chiude → "mi ricollego…", rinnovo con lo stesso peer, squillo; dopo 30 s "aspetto il partner"', async () => {
    const t = prepara('a');
    const { pa, c } = await aFissoConnesso(t);
    c.chiudi();
    expect(t.ultimoStato()).toEqual(['in-attesa', DETTAGLIO_RICOLLEGO]);
    expect(pa.scollegamenti).toBe(1);
    await avanza(PAUSA_RINNOVO_MS);
    expect(pa.riconnessioni).toBe(1);
    expect(t.peers).toHaveLength(1);
    const squilliPrima = pa.squilli().length;
    pa.g.aperto();
    expect(pa.squilli()).toHaveLength(squilliPrima + 1);
    expect(t.ultimoStato()).toEqual(['in-attesa', DETTAGLIO_RICOLLEGO]);
    await avanza(RICOLLEGO_MS);
    expect(t.ultimoStato()).toEqual(['in-attesa', 'aspetto il partner']);
  });

  it('b: il canale si chiude → rinnovo e chiamata subito dopo la registrazione', async () => {
    const t = prepara('b');
    const { pb, c } = await bFissoConnesso(t);
    c.chiudi();
    expect(t.s.stato).toBe('in-attesa');
    await avanza(PAUSA_RINNOVO_MS);
    expect(pb.riconnessioni).toBe(1);
    pb.g.aperto();
    expect(pb.chiamate()).toHaveLength(2);
    pb.chiamate()[1].apri();
    expect(t.s.stato).toBe('connesso');
    expect(t.peers).toHaveLength(1);
  });

  it('flag disconnected con il canale vivo: si rinnova la segnalazione, il canale resta', async () => {
    const t = prepara('a');
    const { pa, c } = await aFissoConnesso(t);
    pa.disconnesso = true;
    pa.g.disconnesso();
    await avanza(PAUSA_RINNOVO_MS);
    expect(pa.riconnessioni).toBe(1);
    expect(c.chiusa).toBe(false);
    expect(t.s.stato).toBe('connesso');
    const squilli = pa.squilli().length;
    pa.g.aperto();
    expect(pa.squilli()).toHaveLength(squilli); // connesso: niente squillo
  });

  it('server perso mentre si aspetta: rinnovo con backoff, i tentativi dispari ricreano il peer', async () => {
    const t = prepara('a');
    await avvio();
    const pa = t.ultimo();
    pa.g.aperto();
    pa.disconnesso = true;
    pa.g.disconnesso();
    // tentativo 0: subito, stesso peer
    await avanza(PAUSA_RINNOVO_MS);
    expect(pa.riconnessioni).toBe(1);
    // il server non risponde: 'disconnected' di nuovo → tentativo 1 fra 2 s, peer nuovo con lo stesso id
    pa.disconnesso = true;
    pa.g.disconnesso();
    await avanza(BACKOFF_RINNOVO[1] - 1);
    expect(t.peers).toHaveLength(1);
    await avanza(1);
    expect(t.peers).toHaveLength(2);
    expect(t.ultimo().id).toBe(A);
    expect(pa.distrutto).toBe(true);
    // tentativo 2 fra 5 s: di nuovo rinnovo sul peer nuovo
    const p2 = t.ultimo();
    p2.disconnesso = true;
    p2.g.disconnesso();
    await avanza(BACKOFF_RINNOVO[2] + PAUSA_RINNOVO_MS);
    expect(p2.riconnessioni).toBe(1);
    p2.g.aperto();
    expect(t.s.ruolo).toBe('a');
  });

  it('server giù con il canale vivo: solo rinnovi sullo stesso peer, mai distrutto (chiuderebbe il canale)', async () => {
    const t = prepara('b');
    const { pb, c } = await bFissoConnesso(t);
    for (let k = 0; k < 4; k++) {
      pb.disconnesso = true;
      pb.g.disconnesso();
      // il partner intanto parla (il canale è vivo)
      for (let ms = 0; ms < BACKOFF_RINNOVO[k] + PAUSA_RINNOVO_MS; ms += 500) {
        await avanza(500);
        c.ricevi({ t: 'pong' });
      }
    }
    expect(t.peers).toHaveLength(1);
    expect(pb.distrutto).toBe(false);
    expect(pb.riconnessioni).toBe(4);
    expect(c.chiusa).toBe(false);
    expect(t.s.stato).toBe('connesso');
  });

  it('registrazione senza esito entro 8 s → nuovo tentativo', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    await avanza(REGISTRAZIONE_MS - 250);
    expect(pb.riconnessioni + pb.scollegamenti).toBe(0);
    await avanza(500 + PAUSA_RINNOVO_MS);
    expect(pb.scollegamenti).toBe(1);
    expect(pb.riconnessioni).toBe(1);
  });

  it('posto ripreso in silenzio (stesso token, il server non manda open): registrato dopo 1 s di socket aperto', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.segnaleAperto = true;
    await avanza(250 + PRESA_SILENZIOSA_MS);
    expect(t.s.ruolo).toBe('b');
    expect(pb.chiamate()).toHaveLength(1);
    expect(t.righe.some((r) => /posto ripreso con lo stesso token/.test(r))).toBe(true);
  });

  it('a: un\'offerta in arrivo durante la registrazione vale come registrazione riuscita', async () => {
    const t = prepara('a');
    await avvio();
    const pa = t.ultimo();
    const c = new ConnFinta(B);
    pa.g.connessione(c);
    c.apri();
    expect(t.s.stato).toBe('connesso');
    expect(t.s.ruolo).toBe('a');
  });

  it('peer-unavailable con il canale vivo non abbatte nulla (N4), per a e per b', async () => {
    for (const r of ['a', 'b'] as const) {
      const t = prepara(r);
      const { c } = r === 'a' ? await aFissoConnesso(t) : await bFissoConnesso(t);
      t.ultimo().g.errore('peer-unavailable');
      expect(c.chiusa).toBe(false);
      expect(t.s.stato).toBe('connesso');
      t.s.chiudi();
    }
  });

  it('a in attesa: rinfresca la segnalazione ogni 30 s (WebSocket zombie)', async () => {
    const t = prepara('a');
    await avvio();
    const pa = t.ultimo();
    pa.g.aperto();
    await avanza(RINFRESCO_A_MS - GIRO_MS);
    expect(pa.scollegamenti).toBe(0);
    await avanza(GIRO_MS + PAUSA_RINNOVO_MS);
    expect(pa.scollegamenti).toBe(1);
    expect(pa.riconnessioni).toBe(1);
  });

  it('posto occupato da un altro token: "occupata", riprova dopo 10, 20, 30 s, mai l\'altro posto', async () => {
    for (const r of ['a', 'b'] as const) {
      const t = prepara(r);
      await avvio();
      t.ultimo().g.errore('unavailable-id');
      t.ultimo().distrutto = true; // PeerJS distrugge un peer mai aperto
      expect(t.ultimoStato()).toEqual(['in-attesa', DETTAGLIO_OCCUPATA]);
      await avanza(BACKOFF_OCCUPATA[0] - 1);
      expect(t.peers).toHaveLength(1);
      await avanza(1);
      expect(t.peers.map((p) => p.id)).toEqual([`${BASE}-${r}`, `${BASE}-${r}`]);
      t.ultimo().g.errore('unavailable-id');
      t.ultimo().distrutto = true;
      await avanza(BACKOFF_OCCUPATA[1]);
      expect(t.peers).toHaveLength(3);
      t.ultimo().g.aperto();
      expect(t.s.ruolo).toBe(r);
      t.s.chiudi();
    }
  });
});

// ---------- battito ----------

describe('battito', () => {
  it('risponde pong ai ping e non inoltra ping/pong; i tipi sconosciuti si ignorano', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    c.ricevi({ t: 'ping' });
    expect(c.tipiInviati()).toContain('pong');
    c.ricevi({ t: 'pong' });
    c.ricevi({ t: 'sconosciuto' });
    expect(t.messaggi).toEqual([]);
  });

  it('ping ogni 3 s se non si è inviato altro; con risposte la connessione resta', async () => {
    const t = prepara('b');
    const { c } = await bFissoConnesso(t);
    for (let i = 0; i < 6; i++) {
      await avanza(PING_MS);
      c.ricevi({ t: 'pong' });
    }
    expect(c.tipiInviati().filter((x) => x === 'ping')).toHaveLength(6);
    expect(t.s.stato).toBe('connesso');
    // se si mandano mosse, il ping non serve
    const n = c.tipiInviati().filter((x) => x === 'ping').length;
    for (let i = 0; i < 6; i++) {
      t.s.invia({ t: 'cursore', idx: i });
      c.ricevi({ t: 'cursore', idx: i });
      await avanza(1000);
    }
    expect(c.tipiInviati().filter((x) => x === 'ping')).toHaveLength(n);
  });

  it('silenzio oltre 9 s → perdita con il motivo, poi riconnessione', async () => {
    const t = prepara('b');
    const { pb, c } = await bFissoConnesso(t);
    await avanza(SILENZIO_MS);
    expect(t.s.stato).toBe('connesso');
    await avanza(GIRO_MS);
    expect(c.chiusa).toBe(true);
    expect(t.ultimoStato()).toEqual(['in-attesa', DETTAGLIO_RICOLLEGO]);
    expect(t.righe.some((r) => /connessione persa: silenzio 9 s \(ultimo dato \d\d:\d\d:\d\d\)/.test(r))).toBe(true);
    await avanza(PAUSA_RINNOVO_MS);
    expect(pb.riconnessioni).toBe(1);
  });

  it('pagina nascosta: il silenzio non si conta; al ritorno dopo un silenzio lungo la perdita è immediata', async () => {
    const t = prepara('b');
    const { pb, c } = await bFissoConnesso(t);
    t.s.sospendi();
    await avanza(SILENZIO_MS * 3);
    expect(t.s.stato).toBe('connesso');
    expect(c.tipiInviati()).toContain('ping'); // i ping partono anche da nascosta
    t.s.primoPiano('visibile');
    expect(c.chiusa).toBe(true);
    expect(t.s.stato).toBe('in-attesa');
    await avanza(PAUSA_RINNOVO_MS);
    pb.g.aperto();
    expect(pb.chiamate()).toHaveLength(2);
  });

  it('ritorno con canale muto (silenzio breve): ping di prova, dopo 2,5 s perdita', async () => {
    const t = prepara('b');
    const { c } = await bFissoConnesso(t);
    await avanza(2000);
    t.s.primoPiano();
    expect(c.tipiInviati()).toContain('ping');
    await avanza(PROVA_PRIMO_PIANO_MS);
    expect(c.chiusa).toBe(true);
    expect(t.righe.some((r) => /nessuna risposta dopo il ritorno/.test(r))).toBe(true);
  });

  it('ritorno con canale vivo: resta connesso e intanto rinnova la segnalazione', async () => {
    const t = prepara('a');
    const { pa, c } = await aFissoConnesso(t);
    await avanza(1000);
    t.s.primoPiano();
    await avanza(10);
    c.ricevi({ t: 'pong' });
    await avanza(PROVA_PRIMO_PIANO_MS);
    expect(t.s.stato).toBe('connesso');
    expect(pa.scollegamenti).toBe(1);
    expect(pa.riconnessioni).toBe(1);
    expect(c.chiusa).toBe(false);
  });

  it('due eventi di ritorno vicini (visibile + pageshow) contano una volta', async () => {
    const t = prepara('a');
    const { pa } = await aFissoConnesso(t);
    t.s.primoPiano('visibile');
    t.s.primoPiano('pageshow');
    await avanza(PAUSA_RINNOVO_MS);
    expect(pa.scollegamenti).toBe(1);
  });

  it('risveglio: un salto dei timer oltre 6 s (iOS senza eventi) fa la verifica', async () => {
    const t = prepara('b');
    const { c } = await bFissoConnesso(t);
    await avanza(1000);
    c.ricevi({ t: 'pong' });
    vi.setSystemTime(Date.now() + 20_000);
    await avanza(GIRO_MS);
    expect(t.righe.some((r) => /risveglio: pagina ferma/.test(r))).toBe(true);
    expect(c.chiusa).toBe(true); // 20 s senza dati: perdita subito
  });

  it('senza canale: il ritorno in primo piano azzera il backoff e richiama subito', async () => {
    const t = prepara('b');
    await avvio();
    const pb = t.ultimo();
    pb.g.aperto();
    for (let k = 0; k < 4; k++) {
      pb.g.errore('peer-unavailable');
      await avanza(ritardo(BACKOFF_CHIAMATA, k + 1, () => 0.5));
    }
    pb.g.errore('peer-unavailable'); // prossima fra 8 s
    const n = pb.chiamate().length;
    t.s.primoPiano('visibile');
    await avanza(PAUSA_RINNOVO_MS);
    pb.g.aperto();
    expect(pb.chiamate()).toHaveLength(n + 1);
  });
});

describe('chiudi', () => {
  it('distrugge tutto e ferma i timer', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    t.s.chiudi();
    expect(c.chiusa).toBe(true);
    expect(t.ultimo().distrutto).toBe(true);
    const n = c.inviati.length;
    await avanza(120_000);
    expect(t.peers).toHaveLength(2);
    expect(c.inviati).toHaveLength(n);
  });

  it('chiudi prima dell’avvio non crea peer', async () => {
    const t = prepara();
    t.s.chiudi();
    await avvio();
    expect(t.peers).toHaveLength(0);
  });
});
