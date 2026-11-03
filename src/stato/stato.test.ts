import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../engine/types';
import { MAX_STORICO, accettaNuova, applica, griglia, nuovaPartita, stato, unisci, unisciStorico, voceStorico } from './index';
import type { Contatori, StatoPartita, VoceStorico } from './types';

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

const cont = (ts: number, punti = 0, errori = 0): Contatori => ({
  punti,
  errori,
  serie: 0,
  regali: 0,
  regaliDisponibili: 0,
  ts,
});

describe('contatori', () => {
  it('applica: accetta se assente o ts maggiore, ignora ts vecchi o uguali', () => {
    let s = applica(nuovaPartita(P, 100), { tipo: 'contatori', da: 'a', contatori: cont(10, 50) });
    expect(s.contatori?.a?.punti).toBe(50);
    expect(s.contatori?.b).toBeUndefined();
    const s1 = s;
    expect(applica(s, { tipo: 'contatori', da: 'a', contatori: cont(10, 99) })).toBe(s1);
    expect(applica(s, { tipo: 'contatori', da: 'a', contatori: cont(9, 99) })).toBe(s1);
    s = applica(s, { tipo: 'contatori', da: 'b', contatori: cont(5, 20) });
    s = applica(s, { tipo: 'contatori', da: 'a', contatori: cont(11, 60, 1) });
    expect(s.contatori).toMatchObject({ a: { punti: 60, errori: 1 }, b: { punti: 20 } });
  });

  it('applica: accettati anche a partita finita (bonus vittoria)', () => {
    const s = applica(nuovaPartita(P, 100), { tipo: 'finita', ts: 500 });
    expect(applica(s, { tipo: 'contatori', da: 'b', contatori: cont(600, 300) }).contatori?.b?.punti).toBe(300);
  });

  it('applica: non muta lo stato originale', () => {
    const s0 = applica(nuovaPartita(P, 100), { tipo: 'contatori', da: 'a', contatori: cont(10, 50) });
    applica(s0, { tipo: 'contatori', da: 'a', contatori: cont(20, 70) });
    expect(s0.contatori?.a?.punti).toBe(50);
  });

  it('unisci: per giocatore vince ts maggiore, simmetrico', () => {
    let a = nuovaPartita(P, 100);
    let b = nuovaPartita(P, 100);
    a = applica(a, { tipo: 'contatori', da: 'a', contatori: cont(30, 300) });
    a = applica(a, { tipo: 'contatori', da: 'b', contatori: cont(10, 100) });
    b = applica(b, { tipo: 'contatori', da: 'a', contatori: cont(20, 200) });
    b = applica(b, { tipo: 'contatori', da: 'b', contatori: cont(40, 400) });
    const u = unisci(a, b);
    expect(u.contatori?.a?.punti).toBe(300);
    expect(u.contatori?.b?.punti).toBe(400);
    expect(unisci(b, a).contatori).toEqual(u.contatori);
    // contatori solo da un lato
    expect(unisci(nuovaPartita(P, 100), a).contatori).toEqual(a.contatori);
    expect('contatori' in unisci(nuovaPartita(P, 100), nuovaPartita(P, 100))).toBe(false);
  });

  it('unisci restituisce esattamente a quando b non aggiunge nulla', () => {
    let a = nuovaPartita(P, 100);
    a = applica(a, { tipo: 'cella', idx: 1, v: 4, note: [], da: 'a', ts: 20 });
    a = applica(a, { tipo: 'contatori', da: 'a', contatori: cont(20, 10) });
    a = { ...a, secondi: 30 };
    expect(unisci(a, a)).toBe(a);
    expect(unisci(a, nuovaPartita(P, 100))).toBe(a);
    // b con contatori più vecchi: niente di nuovo
    const b = applica(nuovaPartita(P, 100), { tipo: 'contatori', da: 'a', contatori: cont(5, 1) });
    expect(unisci(a, b)).toBe(a);
    expect(accettaNuova(a, b)).toBe(false);
    // b con contatori più nuovi: cambia
    const c = applica(nuovaPartita(P, 100), { tipo: 'contatori', da: 'b', contatori: cont(5, 1) });
    expect(unisci(a, c)).not.toBe(a);
    expect(accettaNuova(a, c)).toBe(true);
    // b più avanti di secondi: cambia
    expect(unisci(a, { ...a, secondi: 31 })).not.toBe(a);
  });
});

describe('voceStorico', () => {
  // P: celle pari date, dispari vuote → 40 da riempire
  const DA_RIEMPIRE = P.dati.filter((v) => v === 0).length;

  it('progresso, punti, errori, id e stato per una partita non finita', () => {
    let s = nuovaPartita(P, 100);
    s = applica(s, { tipo: 'cella', idx: 1, v: P.soluzione[1], note: [], da: 'a', ts: 150 });
    s = applica(s, { tipo: 'cella', idx: 3, v: P.soluzione[3], note: [], da: 'b', ts: 160 });
    s = applica(s, { tipo: 'cella', idx: 5, v: (P.soluzione[5] % 9) + 1, note: [], da: 'b', ts: 170 }); // sbagliata
    s = applica(s, { tipo: 'cella', idx: 7, v: 0, note: [1, 2], da: 'a', ts: 140 }); // solo note
    s = applica(s, { tipo: 'contatori', da: 'a', contatori: cont(155, 40, 1) });
    s = applica(s, { tipo: 'contatori', da: 'b', contatori: cont(165, 25, 2) });
    s = { ...s, secondi: 77 };
    const v = voceStorico(s);
    expect(v).toMatchObject({
      id: 'sudoku-1',
      modalita: 'sudoku',
      livello: 'medio',
      iniziata: 100,
      secondi: 77,
      punti: 65,
      errori: 3,
      aggiornata: 170,
    });
    expect(v.progresso).toBeCloseTo(2 / DA_RIEMPIRE);
    expect(v.stato).toBe(s);
    expect('finita' in v).toBe(false);
  });

  it('partita finita: senza stato, aggiornata include finita', () => {
    let s = nuovaPartita(P, 100);
    for (let i = 1; i < 81; i += 2) s = applica(s, { tipo: 'cella', idx: i, v: P.soluzione[i], note: [], da: 'a', ts: 200 + i });
    s = applica(s, { tipo: 'finita', ts: 900 });
    const v = voceStorico(s);
    expect(v.progresso).toBe(1);
    expect(v.finita).toBe(900);
    expect(v.aggiornata).toBe(900);
    expect('stato' in v).toBe(false);
    expect(v.punti).toBe(0);
  });

  it('aggiornata: contatori più recenti delle celle; partita vuota = iniziata', () => {
    expect(voceStorico(nuovaPartita(P, 100)).aggiornata).toBe(100);
    let s = applica(nuovaPartita(P, 100), { tipo: 'cella', idx: 1, v: 3, note: [], da: 'a', ts: 150 });
    s = applica(s, { tipo: 'contatori', da: 'b', contatori: cont(999) });
    expect(voceStorico(s).aggiornata).toBe(999);
  });

  it('è serializzabile in JSON', () => {
    const v = voceStorico(applica(nuovaPartita(P, 100), { tipo: 'contatori', da: 'a', contatori: cont(10, 5) }));
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });
});

describe('unisciStorico', () => {
  const voce = (id: string, iniziata: number, aggiornata: number, extra: Partial<VoceStorico> = {}): VoceStorico => ({
    id,
    modalita: 'sudoku',
    livello: 'facile',
    iniziata,
    secondi: 0,
    progresso: 0,
    punti: 0,
    errori: 0,
    aggiornata,
    ...extra,
  });

  it('per id vince aggiornata maggiore, simmetrico', () => {
    const a = [voce('x', 100, 150, { punti: 1 }), voce('y', 200, 300, { punti: 2 })];
    const b = [voce('x', 100, 180, { punti: 3 }), voce('y', 200, 250, { punti: 4 })];
    const u = unisciStorico(a, b);
    expect(u.map((v) => [v.id, v.punti])).toEqual([
      ['y', 2],
      ['x', 3],
    ]);
    expect(unisciStorico(b, a)).toEqual(u);
  });

  it('a parità di aggiornata vince chi ha più secondi', () => {
    const a = [voce('x', 100, 150, { secondi: 10 })];
    const b = [voce('x', 100, 150, { secondi: 20 })];
    expect(unisciStorico(a, b)[0].secondi).toBe(20);
    expect(unisciStorico(b, a)[0].secondi).toBe(20);
  });

  it('ordina per iniziata decrescente e unisce voci diverse', () => {
    const u = unisciStorico([voce('a', 100, 100), voce('c', 300, 300)], [voce('b', 200, 200), voce('d', 50, 50)]);
    expect(u.map((v) => v.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('tiene al massimo 200 voci, le più recenti', () => {
    const a = Array.from({ length: 150 }, (_, i) => voce(`a${i}`, i, i));
    const b = Array.from({ length: 150 }, (_, i) => voce(`b${i}`, 1000 + i, 1000 + i));
    const u = unisciStorico(a, b);
    expect(MAX_STORICO).toBe(200);
    expect(u).toHaveLength(200);
    expect(u[0].id).toBe('b149');
    expect(u[199].id).toBe('a100');
  });

  it('storico vuoto', () => {
    expect(unisciStorico([], [])).toEqual([]);
  });
});

describe('oggetto stato', () => {
  it('espone tutte le funzioni del contratto', () => {
    expect(stato).toEqual({ nuovaPartita, applica, unisci, griglia, voceStorico, unisciStorico });
  });
});
