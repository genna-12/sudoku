// Compatibilità (ADR 006): un telefono non aggiornato deve capire i messaggi del client nuovo.
// La ricezione è quella di main prima della T9 A (copia congelata in compat/logica-main.ts) e, per
// lo storico, il merge che App usa da sempre (unisciStoricoRemoto). I messaggi sono quelli che
// manda il client nuovo: battito su ping/pong ogni 3 s e storico spezzato a lotti.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVIO_VUOTO, unisciStoricoRemoto, type Archivio } from '../stato/archivio';
import { creaStanza as creaStanzaMain, type ConnMinima, type GestoriConn, type GestoriPeer } from './compat/logica-main';
import { storicoVero } from './compat/storicoVero';
import { creaStanza } from './logica';
import { lottiStorico } from './lotti';
import type { Messaggio } from './types';

const BASE = 'sudoku-coppia-0123456789abcdef0123';

/** due capi di un canale finto: ciò che uno invia arriva all'altro */
function canale(daA: string, daB: string) {
  const crea = (peer: string) => {
    const c = {
      peer,
      g: null as GestoriConn | null,
      altro: null as null | { g: GestoriConn | null; chiusa: boolean },
      chiusa: false,
      inviati: [] as unknown[],
      invia(d: unknown) {
        if (c.chiusa) throw new Error('chiusa');
        c.inviati.push(d);
        // come il DataChannel: serializzato e consegnato dopo
        const copia = JSON.parse(JSON.stringify(d));
        queueMicrotask(() => c.altro?.g?.dati(copia));
      },
      chiudi() {
        if (c.chiusa) return;
        c.chiusa = true;
        c.g?.chiusa();
      },
      ascolta(g: GestoriConn) {
        c.g = g;
      },
    };
    return c;
  };
  const versoA = crea(daA); // il capo di b (peer = id di a)
  const versoB = crea(daB); // il capo di a (peer = id di b)
  versoA.altro = versoB;
  versoB.altro = versoA;
  return { versoA, versoB };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('client vecchio (main) ↔ messaggi nuovi', () => {
  it('lotti di storico e battito ping/pong: nessun errore, stesso storico finale dell’invio in un pezzo', async () => {
    const errori: unknown[] = [];
    const spia = vi.spyOn(console, 'error').mockImplementation((...a) => void errori.push(a));
    const righeVecchio: string[] = [];
    const ricevuti: Messaggio[] = [];

    // vecchio: Semino, posto a, codice di main
    let gVecchio!: GestoriPeer;
    const vecchio = creaStanzaMain({
      frase: 'f',
      nome: 'Semino',
      ruolo: 'a',
      statoIniziale: () => null,
      deriva: async () => BASE,
      webrtcDisponibile: () => true,
      log: (...a) => righeVecchio.push(a.map(String).join(' ')),
      creaPeer: (_id, g) => {
        gVecchio = g;
        return { distrutto: false, disconnesso: false, connetti: () => ({}) as ConnMinima, distruggi: () => {} };
      },
    });
    vecchio.on('messaggio', (m) => ricevuti.push(m));

    // nuovo: Semina, posto b, codice di oggi
    const { versoA, versoB } = canale(`${BASE}-a`, `${BASE}-b`);
    let gNuovo!: GestoriPeer;
    const nuovo = creaStanza({
      frase: 'f',
      nome: 'Semina',
      ruolo: 'b',
      statoIniziale: () => null,
      deriva: async () => BASE,
      webrtcDisponibile: () => true,
      log: () => {},
      casuale: () => 0.5,
      creaPeer: (_id, g) => {
        gNuovo = g;
        return {
          distrutto: false,
          disconnesso: false,
          segnaleAperto: true,
          connetti: () => versoA,
          distruggi: () => {},
          scollega: () => {},
          riconnetti: () => {},
        };
      },
    });

    await vi.advanceTimersByTimeAsync(0);
    gVecchio.aperto();
    gNuovo.aperto(); // b chiama a: versoA è la chiamata
    gVecchio.connessione(versoB);
    versoA.g!.aperta();
    versoB.g!.aperta();
    await vi.advanceTimersByTimeAsync(0);
    expect(vecchio.stato).toBe('connesso');
    expect(nuovo.stato).toBe('connesso');

    // storico grande del client nuovo: lotti nel formato di sempre
    const storico = storicoVero(20, 5, 1);
    nuovo.invia({ t: 'storico', storico, azzerato: 0 });
    const lotti = versoA.inviati.filter((m) => (m as Messaggio).t === 'storico');
    expect(lotti.length).toBe(lottiStorico({ t: 'storico', storico, azzerato: 0 }).length);
    expect(lotti.length).toBeGreaterThan(1);

    // 40 s di battito del client nuovo (ping ogni 3 s) senza altri messaggi
    await vi.advanceTimersByTimeAsync(40_000);
    expect(vecchio.stato).toBe('connesso');
    expect(nuovo.stato).toBe('connesso');
    // il nuovo fa ping quando da 3 s non ha mandato nulla (anche i suoi pong contano): il vecchio risponde a tutti
    const pingNuovo = versoA.inviati.filter((m) => (m as Messaggio).t === 'ping').length;
    expect(pingNuovo).toBeGreaterThanOrEqual(5);
    expect(versoB.inviati.filter((m) => (m as Messaggio).t === 'pong').length).toBe(pingNuovo);

    // ricezione di main: niente scartato, ping/pong non arrivano all'app, gli storico sì
    expect(righeVecchio.filter((r) => /ignorato|persa|errore/.test(r))).toEqual([]);
    expect(ricevuti.every((m) => m.t === 'ciao' || m.t === 'storico')).toBe(true);
    const ricevutiStorico = ricevuti.filter((m): m is Extract<Messaggio, { t: 'storico' }> => m.t === 'storico');
    expect(ricevutiStorico).toHaveLength(lotti.length);

    // stesso stato finale: lotti fusi uno a uno (come App.riceviStorico) = storico intero in un pezzo
    const base: Archivio = { ...ARCHIVIO_VUOTO, storico: storicoVero(4, 1, 2) };
    let aLotti = base;
    for (const m of ricevutiStorico) aLotti = unisciStoricoRemoto(aLotti, m.storico, m.azzerato);
    const inUnPezzo = unisciStoricoRemoto(base, storico, 0);
    expect(aLotti.storico).toEqual(inUnPezzo.storico);
    // e in ordine inverso (il merge è commutativo)
    let aRovescio = base;
    for (const m of [...ricevutiStorico].reverse()) aRovescio = unisciStoricoRemoto(aRovescio, m.storico, m.azzerato);
    expect(aRovescio.storico).toEqual(inUnPezzo.storico);

    expect(errori).toEqual([]);
    spia.mockRestore();
    vecchio.chiudi();
    nuovo.chiudi();
  });

  it('squillo di un a nuovo verso un b vecchio: il b vecchio lo chiude e basta, senza errori', async () => {
    const righe: string[] = [];
    let g!: GestoriPeer;
    const vecchioB = creaStanzaMain({
      frase: 'f',
      nome: 'Semina',
      ruolo: 'b',
      statoIniziale: () => null,
      deriva: async () => BASE,
      webrtcDisponibile: () => true,
      log: (...a) => righe.push(a.map(String).join(' ')),
      creaPeer: (_id, gg) => {
        g = gg;
        return { distrutto: false, disconnesso: false, connetti: () => ({ peer: `${BASE}-a`, invia: () => {}, chiudi: () => {}, ascolta: () => {} }), distruggi: () => {} };
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    g.aperto();
    let chiusa = false;
    g.connessione({ peer: `${BASE}-a`, invia: () => {}, chiudi: () => void (chiusa = true), ascolta: () => {} });
    expect(chiusa).toBe(true);
    expect(vecchioB.stato).toBe('in-attesa');
    expect(righe.some((r) => /errore/.test(r))).toBe(false);
    vecchioB.chiudi();
  });
});
