import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTERVALLO_SYNC_MS } from '../config/sync';
import type { Puzzle } from '../engine/types';
import { applica, nuovaPartita } from '../stato';
import { migra, type Archivio } from '../stato/archivio';
import { payloadDa } from '../stato/sync';
import type { VoceStorico } from '../stato/types';
import { creaSync, type InfoSync } from './useSync';

function puzzle(seed: number): Puzzle {
  const soluzione = Array.from({ length: 81 }, (_, i) => ((i % 9) + Math.floor(i / 9) * 3 + Math.floor(i / 27)) % 9 + 1);
  return { modalita: 'sudoku', livello: 'medio', seed, soluzione, dati: soluzione.map((v, i) => (i % 2 === 0 ? v : 0)) };
}
const voce = (seed: number, t: number): VoceStorico => ({
  id: `sudoku-${seed}`, modalita: 'sudoku', livello: 'medio', iniziata: t, finita: t + 1, secondi: 0, progresso: 1, punti: 0, errori: 0, aggiornata: t + 1,
});

/** Worker finto: un valore, conta GET e PUT. */
function workerFinto(iniziale: unknown = null) {
  const w = { valore: iniziale, get: 0, put: 0, keepalive: 0, rotto: false };
  const f = vi.fn(async (_url: string, init?: RequestInit) => {
    if (w.rotto) throw new Error('rete giù');
    if (init?.method === 'PUT') {
      w.put++;
      if (init.keepalive) w.keepalive++;
      w.valore = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ ok: true, aggiornato: 1 }));
    }
    w.get++;
    return new Response(JSON.stringify({ valore: w.valore, aggiornato: null }));
  });
  return { w, f: f as unknown as typeof fetch };
}

function dispositivo(iniziale: Archivio, fetchFinto: typeof fetch) {
  let a = iniziale;
  const stati: InfoSync[] = [];
  const modifica = (fn: (x: Archivio) => Archivio) => {
    const prima = a;
    a = fn(a);
    if (a !== prima) m.cambiato(prima, a);
    return a;
  };
  const m = creaSync({
    url: 'https://w.test',
    leggi: () => a,
    modifica,
    notifica: (i) => stati.push(i),
    fetch: fetchFinto,
    chiave: async () => 'a'.repeat(40),
  });
  return { m, modifica, get: () => a, stati };
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const vuoto = () => ({ ...migra(undefined), io: { nome: 'Semino', frase: 'sei mini' } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('creaSync', () => {
  it('dispositivo nuovo: riceve il giardino dal Worker e non riscrive', async () => {
    const remoto = payloadDa({ ...vuoto(), storico: [voce(1, 100)] }, 5);
    const { w, f } = workerFinto(remoto);
    const d = dispositivo(vuoto(), f);
    d.m.avvia('sei mini');
    await flush();
    expect(d.get().storico.map((v) => v.id)).toEqual(['sudoku-1']);
    expect(w.get).toBe(1);
    expect(w.put).toBe(0);
    expect(d.stati.at(-1)?.stato).toBe('ok');
  });

  it('Worker vuoto: scrive il locale; prima della prima lettura non scrive mai', async () => {
    const { w, f } = workerFinto(null);
    const d = dispositivo({ ...vuoto(), storico: [voce(2, 200)] }, f);
    d.m.nascosta(); // non ancora avviato/letto: niente
    expect(w.put).toBe(0);
    d.m.avvia('sei mini');
    await flush();
    expect(w.put).toBe(1);
    expect((w.valore as { storico: VoceStorico[] }).storico[0].id).toBe('sudoku-2');
    expect(JSON.stringify(w.valore)).not.toContain('sei mini');
  });

  it('mosse: al massimo una sync per intervallo; nuova/finita subito; in background PUT keepalive senza GET', async () => {
    const { w, f } = workerFinto(null);
    const d = dispositivo(vuoto(), f);
    d.m.avvia('sei mini');
    await flush();
    const put0 = w.put;
    d.modifica((a) => ({ ...a, partita: nuovaPartita(puzzle(3), Date.now()) }));
    await flush();
    expect(w.put).toBe(put0 + 1); // nuova: subito
    for (let s = 0; s < 30; s++) {
      d.modifica((a) => ({ ...a, partita: applica(a.partita!, { tipo: 'tick' }) }));
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(w.put).toBe(put0 + 1); // tick: aspettano
    await vi.advanceTimersByTimeAsync(INTERVALLO_SYNC_MS);
    expect(w.put).toBe(put0 + 2);
    d.modifica((a) => ({ ...a, partita: applica(a.partita!, { tipo: 'tick' }) }));
    const get = w.get;
    d.m.nascosta();
    await flush();
    expect(w.put).toBe(put0 + 3);
    expect(w.keepalive).toBe(1);
    expect(w.get).toBe(get);
    d.modifica((a) => ({ ...a, partita: applica(a.partita!, { tipo: 'finita', ts: Date.now() }) }));
    await flush();
    expect(w.put).toBe(put0 + 4);
    expect((w.valore as { partita: { finita?: number } }).partita.finita).toBeTruthy();
    d.m.ferma();
  });

  it('errori: stato "errore", solo console.warn, e riprova dopo l\'intervallo', async () => {
    const { w, f } = workerFinto(null);
    w.rotto = true;
    const d = dispositivo({ ...vuoto(), storico: [voce(4, 400)] }, f);
    d.m.avvia('sei mini');
    await flush();
    expect(d.stati.at(-1)?.stato).toBe('errore');
    expect(console.warn).toHaveBeenCalledWith('[sync]', 'rete giù');
    w.rotto = false;
    await vi.advanceTimersByTimeAsync(INTERVALLO_SYNC_MS);
    expect(d.stati.at(-1)?.stato).toBe('ok');
    expect(w.put).toBe(1);
    d.m.ferma();
  });

  it('due dispositivi convergono attraverso il Worker senza rimbalzi', async () => {
    const { w, f } = workerFinto(null);
    const A = dispositivo({ ...vuoto(), storico: [voce(5, 500)] }, f);
    const B = dispositivo({ ...vuoto(), storico: [voce(6, 600)], azzerato: 0 }, f);
    A.m.avvia('x');
    await flush();
    B.m.avvia('x');
    await flush();
    A.m.adesso();
    await flush();
    expect(A.get().storico.map((v) => v.id)).toEqual(['sudoku-6', 'sudoku-5']);
    expect(B.get().storico.map((v) => v.id)).toEqual(['sudoku-6', 'sudoku-5']);
    const put = w.put;
    A.m.adesso();
    B.m.adesso();
    await flush();
    expect(w.put).toBe(put);
  });
});
