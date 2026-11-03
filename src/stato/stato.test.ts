import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../engine/types';
import { accettaNuova, applica, griglia, nuovaPartita, unisci } from './index';
import type { StatoPartita } from './types';

function puzzle(seed: number): Puzzle {
  const soluzione = Array.from({ length: 81 }, (_, i) => ((i % 9) + Math.floor(i / 9) * 3 + Math.floor(i / 27)) % 9 + 1);
  const dati = soluzione.map((v, i) => (i % 2 === 0 ? v : 0)); // celle pari date, dispari vuote
  return { modalita: 'sudoku', livello: 'medio', seed, soluzione, dati };
}

const P = puzzle(1);

describe('applica', () => {
  it('scrive una cella vuota e ordina le note', () => {
    const s = applica(nuovaPartita(P, 100), { tipo: 'cella', idx: 1, v: 0, note: [9, 3, 5], da: 'a', ts: 10 });
    expect(s.celle[1]).toEqual({ v: 0, note: [3, 5, 9], da: 'a', ts: 10 });
  });

  it('ignora le celle date', () => {
    const s0 = nuovaPartita(P, 100);
    const s = applica(s0, { tipo: 'cella', idx: 0, v: 5, note: [], da: 'a', ts: 10 });
    expect(s).toBe(s0);
  });

  it('ignora indici fuori griglia', () => {
    const s0 = nuovaPartita(P, 100);
    expect(applica(s0, { tipo: 'cella', idx: 81, v: 5, note: [], da: 'a', ts: 10 })).toBe(s0);
    expect(applica(s0, { tipo: 'cella', idx: -1, v: 5, note: [], da: 'a', ts: 10 })).toBe(s0);
  });

  it('ignora ts vecchi o uguali', () => {
    let s = applica(nuovaPartita(P, 100), { tipo: 'cella', idx: 1, v: 4, note: [], da: 'a', ts: 20 });
    s = applica(s, { tipo: 'cella', idx: 1, v: 7, note: [], da: 'b', ts: 19 });
    s = applica(s, { tipo: 'cella', idx: 1, v: 8, note: [], da: 'b', ts: 20 });
    expect(s.celle[1].v).toBe(4);
    s = applica(s, { tipo: 'cella', idx: 1, v: 7, note: [], da: 'b', ts: 21 });
    expect(s.celle[1]).toMatchObject({ v: 7, da: 'b' });
  });

  it('non modifica lo stato originale', () => {
    const s0 = nuovaPartita(P, 100);
    applica(s0, { tipo: 'cella', idx: 1, v: 4, note: [], da: 'a', ts: 20 });
    expect(s0.celle).toEqual({});
  });

  it('tick e finita; dopo finita niente modifiche', () => {
    let s = applica(nuovaPartita(P, 100), { tipo: 'tick' });
    expect(s.secondi).toBe(1);
    s = applica(s, { tipo: 'finita', ts: 500 });
    expect(s.finita).toBe(500);
    expect(applica(s, { tipo: 'finita', ts: 900 }).finita).toBe(500);
    expect(applica(s, { tipo: 'tick' }).secondi).toBe(1);
    expect(applica(s, { tipo: 'cella', idx: 1, v: 4, note: [], da: 'a', ts: 999 })).toBe(s);
  });
});

describe('unisci', () => {
  const conCella = (s: StatoPartita, idx: number, v: number, ts: number, da: 'a' | 'b' = 'a') =>
    applica(s, { tipo: 'cella', idx, v, note: [], da, ts });

  it('puzzle diverso: vince iniziata maggiore', () => {
    const vecchia = conCella(nuovaPartita(puzzle(1), 100), 1, 3, 150);
    const nuova = nuovaPartita(puzzle(2), 200);
    expect(unisci(vecchia, nuova)).toBe(nuova);
    expect(unisci(nuova, vecchia)).toBe(nuova);
  });

  it('puzzle diverso, stessa iniziata: deterministico (seed maggiore)', () => {
    const x = nuovaPartita(puzzle(1), 100);
    const y = nuovaPartita(puzzle(2), 100);
    expect(unisci(x, y)).toBe(y);
    expect(unisci(y, x)).toBe(y);
  });

  it('stesso puzzle: per cella vince ts maggiore', () => {
    let a = nuovaPartita(P, 100);
    let b = nuovaPartita(P, 100);
    a = conCella(a, 1, 1, 10, 'a');
    a = conCella(a, 3, 3, 30, 'a');
    b = conCella(b, 1, 2, 20, 'b');
    b = conCella(b, 3, 4, 25, 'b');
    b = conCella(b, 5, 5, 5, 'b');
    const u = unisci(a, b);
    expect(u.celle[1]).toMatchObject({ v: 2, da: 'b' });
    expect(u.celle[3]).toMatchObject({ v: 3, da: 'a' });
    expect(u.celle[5]).toMatchObject({ v: 5 });
    expect(unisci(b, a).celle).toEqual(u.celle);
  });

  it('stesso puzzle: secondi = max', () => {
    const a = { ...nuovaPartita(P, 100), secondi: 40 };
    const b = { ...nuovaPartita(P, 100), secondi: 55 };
    expect(unisci(a, b).secondi).toBe(55);
    expect(unisci(b, a).secondi).toBe(55);
  });

  it('stesso puzzle: finita = la prima, o quella presente', () => {
    const a = nuovaPartita(P, 100);
    const b = { ...nuovaPartita(P, 100), finita: 900 };
    expect(unisci(a, b).finita).toBe(900);
    expect(unisci(b, a).finita).toBe(900);
    expect(unisci({ ...a, finita: 800 }, b).finita).toBe(800);
    expect('finita' in unisci(a, a)).toBe(false);
  });

  it('il risultato è serializzabile in JSON', () => {
    const u = unisci(conCella(nuovaPartita(P, 100), 1, 4, 10), nuovaPartita(P, 100));
    expect(JSON.parse(JSON.stringify(u))).toEqual(u);
  });
});

describe('griglia', () => {
  it('combina dati e celle, ignorando celle sovrapposte alle date', () => {
    let s = nuovaPartita(P, 100);
    s = applica(s, { tipo: 'cella', idx: 1, v: 9, note: [], da: 'a', ts: 1 });
    // cella data forzata a mano: griglia deve tenere il dato
    s = { ...s, celle: { ...s.celle, 0: { v: 7, note: [], da: 'b', ts: 2 } } };
    const g = griglia(s);
    expect(g).toHaveLength(81);
    expect(g[0]).toBe(P.dati[0]);
    expect(g[1]).toBe(9);
    expect(g[3]).toBe(0);
    expect(P.dati[1]).toBe(0); // dati non mutati
  });
});

describe('accettaNuova (due "nuova" incrociate)', () => {
  it('senza partita locale accetta sempre', () => {
    expect(accettaNuova(null, nuovaPartita(puzzle(2), 100))).toBe(true);
  });

  it('i due lati convergono sulla stessa partita', () => {
    const mia = nuovaPartita(puzzle(2), 200);
    const sua = nuovaPartita(puzzle(3), 150);
    // io ricevo la sua (più vecchia): la scarto; lui riceve la mia (più nuova): la accetta
    expect(accettaNuova(mia, sua)).toBe(false);
    expect(accettaNuova(sua, mia)).toBe(true);
  });

  it('stesso istante: decide il seed, in modo simmetrico', () => {
    const x = nuovaPartita(puzzle(2), 100);
    const y = nuovaPartita(puzzle(3), 100);
    expect(accettaNuova(x, y)).not.toBe(accettaNuova(y, x));
  });

  it('una partita vecchia in corso viene sostituita dalla nuova', () => {
    expect(accettaNuova(nuovaPartita(puzzle(2), 100), nuovaPartita(puzzle(3), 500))).toBe(true);
  });
});
