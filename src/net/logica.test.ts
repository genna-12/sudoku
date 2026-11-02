import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  creaStanza,
  derivaBase,
  normalizzaFrase,
  PING_MS,
  PROVA_PRIMO_PIANO_MS,
  RITENTA_MS,
  TIMEOUT_CONNESSIONE_MS,
  type ConnMinima,
  type GestoriConn,
  type GestoriPeer,
  type PeerMinimo,
  type StanzaInterna,
} from './logica';
import type { Messaggio, StatoConnessione } from './types';

const BASE = 'sudoku-coppia-0123456789abcdef0123';

// ---------- mock ----------

class ConnFinta implements ConnMinima {
  inviati: unknown[] = [];
  chiusa = false;
  g!: GestoriConn;
  peer: string;
  constructor(peer: string) {
    this.peer = peer;
  }
  invia(d: unknown) {
    if (this.chiusa) throw new Error('chiusa');
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
  ricevi(m: Messaggio) {
    this.g.dati(m);
  }
  tipiInviati() {
    return this.inviati.map((m) => (m as Messaggio).t);
  }
}

class PeerFinto implements PeerMinimo {
  distrutto = false;
  disconnesso = false;
  connessioni: ConnFinta[] = [];
  id: string;
  g: GestoriPeer;
  constructor(id: string, g: GestoriPeer) {
    this.id = id;
    this.g = g;
  }
  connetti(id: string) {
    const c = new ConnFinta(id);
    this.connessioni.push(c);
    return c;
  }
  distruggi() {
    this.distrutto = true;
  }
}

function prepara() {
  const peers: PeerFinto[] = [];
  const stati: [StatoConnessione, string | undefined][] = [];
  const messaggi: Messaggio[] = [];
  const partner: string[] = [];
  const s: StanzaInterna = creaStanza({
    frase: 'frase',
    nome: 'Genna',
    statoIniziale: () => null,
    deriva: async () => BASE,
    webrtcDisponibile: () => true,
    log: () => {},
    creaPeer: (id, g) => {
      const p = new PeerFinto(id, g);
      peers.push(p);
      return p;
    },
  });
  s.on('stato', (st, d) => stati.push([st, d]));
  s.on('messaggio', (m) => messaggi.push(m));
  s.on('partner', (n) => partner.push(n));
  const ultimo = () => peers[peers.length - 1];
  return { s, peers, stati, messaggi, partner, ultimo };
}

const avvio = () => vi.advanceTimersByTimeAsync(0);

/** porta la stanza a ruolo b connesso; ritorna la connessione verso a */
async function comeBConnesso(t: ReturnType<typeof prepara>) {
  await avvio();
  t.ultimo().g.errore('unavailable-id');
  t.ultimo().g.aperto();
  const c = t.ultimo().connessioni[0];
  c.apri();
  return c;
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

// ---------- ruoli ----------

describe('scelta a/b', () => {
  it('prova prima a e aspetta', async () => {
    const t = prepara();
    expect(t.s.stato).toBe('connessione');
    await avvio();
    expect(t.peers.map((p) => p.id)).toEqual([`${BASE}-a`]);
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
    expect(t.ultimo().id).toBe(`${BASE}-b`);
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('b');
    expect(t.ultimo().connessioni.map((c) => c.peer)).toEqual([`${BASE}-a`]);
  });

  it('a accetta solo connessioni da b', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.aperto();
    const estraneo = new ConnFinta('qualcun-altro');
    t.ultimo().g.connessione(estraneo);
    expect(estraneo.chiusa).toBe(true);
    const b = new ConnFinta(`${BASE}-b`);
    t.ultimo().g.connessione(b);
    b.apri();
    expect(t.s.stato).toBe('connesso');
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
    await vi.advanceTimersByTimeAsync(RITENTA_MS * 5);
    expect(t.peers).toHaveLength(1);
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
});

// ---------- riconnessione ----------

describe('riconnessione', () => {
  it('b: a non risponde (peer-unavailable) → riprova ogni 3 s da a', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('unavailable-id');
    t.ultimo().g.aperto();
    t.ultimo().g.errore('peer-unavailable');
    expect(t.ultimo().distrutto).toBe(true);
    await vi.advanceTimersByTimeAsync(RITENTA_MS - 1);
    expect(t.peers).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(t.peers).toHaveLength(3);
    expect(t.ultimo().id).toBe(`${BASE}-a`);
    // questa volta a è libero: b diventa a
    t.ultimo().g.aperto();
    expect(t.s.ruolo).toBe('a');
  });

  it('b: se la connessione con a si chiude, ritenta di diventare a', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    const pb = t.ultimo();
    c.chiudi();
    expect(t.s.stato).toBe('in-attesa');
    expect(pb.distrutto).toBe(true);
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.ultimo().id).toBe(`${BASE}-a`);
  });

  it('a: se la connessione si chiude resta a e aspetta', async () => {
    const t = prepara();
    await avvio();
    const pa = t.ultimo();
    pa.g.aperto();
    const c = new ConnFinta(`${BASE}-b`);
    pa.g.connessione(c);
    c.apri();
    c.chiudi();
    expect(t.s.stato).toBe('in-attesa');
    expect(pa.distrutto).toBe(false);
    await vi.advanceTimersByTimeAsync(RITENTA_MS * 3);
    expect(t.peers).toHaveLength(1);
  });

  it('a: se perde il server mentre aspetta, ricomincia', async () => {
    const t = prepara();
    await avvio();
    const pa = t.ultimo();
    pa.g.aperto();
    pa.disconnesso = true;
    pa.g.disconnesso();
    expect(pa.distrutto).toBe(true);
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.peers).toHaveLength(2);
  });

  it('a e b entrambi occupati → riprova dopo 3 s', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('unavailable-id');
    t.ultimo().g.errore('unavailable-id');
    expect(t.peers).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.peers).toHaveLength(3);
    expect(t.ultimo().id).toBe(`${BASE}-a`);
  });

  it('b: connessione che non si apre entro il timeout → ricomincia', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('unavailable-id');
    t.ultimo().g.aperto();
    const c = t.ultimo().connessioni[0];
    await vi.advanceTimersByTimeAsync(TIMEOUT_CONNESSIONE_MS);
    expect(c.chiusa).toBe(true);
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.ultimo().id).toBe(`${BASE}-a`);
  });

  it('i callback di un peer distrutto vengono ignorati', async () => {
    const t = prepara();
    await avvio();
    const pa = t.ultimo();
    pa.g.errore('unavailable-id');
    pa.g.aperto(); // peer vecchio: non deve dare ruolo a
    expect(t.s.ruolo).toBe(null);
  });

  it('errori di rete generici → riprova', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('network');
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.peers).toHaveLength(2);
  });
});

// ---------- heartbeat ----------

describe('heartbeat', () => {
  it('risponde pong ai ping e non inoltra ping/pong', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    c.ricevi({ t: 'ping' });
    expect(c.tipiInviati()).toContain('pong');
    c.ricevi({ t: 'pong' });
    expect(t.messaggi).toEqual([]);
  });

  it('ping ogni 5 s; con risposte la connessione resta', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(PING_MS);
      c.ricevi({ t: 'pong' });
    }
    expect(c.tipiInviati().filter((x) => x === 'ping')).toHaveLength(6);
    expect(t.s.stato).toBe('connesso');
  });

  it('3 ping senza pong → chiude, in-attesa, riconnessione', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    await vi.advanceTimersByTimeAsync(PING_MS * 3);
    expect(t.s.stato).toBe('connesso');
    expect(c.tipiInviati().filter((x) => x === 'ping')).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(PING_MS);
    expect(c.chiusa).toBe(true);
    expect(t.s.stato).toBe('in-attesa');
    await vi.advanceTimersByTimeAsync(RITENTA_MS);
    expect(t.ultimo().id).toBe(`${BASE}-a`);
  });

  it('primo piano con connessione muta → la dichiara morta', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    t.s.primoPiano();
    expect(c.tipiInviati()).toContain('ping');
    await vi.advanceTimersByTimeAsync(PROVA_PRIMO_PIANO_MS);
    expect(c.chiusa).toBe(true);
    expect(t.s.stato).toBe('in-attesa');
  });

  it('primo piano con connessione viva → resta connesso', async () => {
    const t = prepara();
    const c = await comeBConnesso(t);
    await vi.advanceTimersByTimeAsync(1);
    t.s.primoPiano();
    await vi.advanceTimersByTimeAsync(10);
    c.ricevi({ t: 'pong' });
    await vi.advanceTimersByTimeAsync(PROVA_PRIMO_PIANO_MS);
    expect(t.s.stato).toBe('connesso');
  });

  it('primo piano senza connessione e in attesa di ritentare → ritenta subito', async () => {
    const t = prepara();
    await avvio();
    t.ultimo().g.errore('network');
    expect(t.peers).toHaveLength(1);
    t.s.primoPiano();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.peers).toHaveLength(2);
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
    await vi.advanceTimersByTimeAsync(60_000);
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
