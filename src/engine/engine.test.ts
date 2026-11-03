import { describe, expect, it } from 'vitest';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import {
  LIVELLI,
  celleInConflitto,
  contaSoluzioni,
  generaPuzzle,
  motore,
  verificaCompleta,
  type Modalita,
  type Puzzle,
} from './index';

const MODALITA: Modalita[] = ['sudoku', 'killer'];
const SEED = [1, 42, 20261103];
// Soglia in Node: il target reale è 1,5 s su un telefono medio, qui 3 s per margine (CI lente, JIT freddo).
const SOGLIA_MS = 3000;

function soluzioneValida(sol: number[]): boolean {
  if (sol.length !== 81) return false;
  for (let k = 0; k < 9; k++) {
    const r = new Set<number>();
    const c = new Set<number>();
    const b = new Set<number>();
    for (let j = 0; j < 9; j++) {
      r.add(sol[k * 9 + j]);
      c.add(sol[j * 9 + k]);
      b.add(sol[(Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3)]);
    }
    for (const s of [r, c, b]) if (s.size !== 9 || [...s].some((v) => v < 1 || v > 9)) return false;
  }
  return true;
}

function contigua(celle: number[]): boolean {
  const insieme = new Set(celle);
  const visti = new Set([celle[0]]);
  const coda = [celle[0]];
  while (coda.length) {
    const x = coda.pop()!;
    const r = Math.floor(x / 9);
    const c = x % 9;
    const vicini = [r > 0 ? x - 9 : -1, r < 8 ? x + 9 : -1, c > 0 ? x - 1 : -1, c < 8 ? x + 1 : -1];
    for (const n of vicini)
      if (n >= 0 && insieme.has(n) && !visti.has(n)) {
        visti.add(n);
        coda.push(n);
      }
  }
  return visti.size === celle.length;
}

describe('generaPuzzle: tutte le 12 combinazioni', () => {
  for (const modalita of MODALITA) {
    for (const livello of LIVELLI) {
      it(`${modalita} ${livello}`, () => {
        const par = LIVELLI_PARAMETRI[livello];
        const target = modalita === 'killer' ? par.dateKiller : par.dateSudoku;
        for (const seed of SEED) {
          const t0 = performance.now();
          const p = generaPuzzle(modalita, livello, seed);
          const ms = performance.now() - t0;
          expect(ms, `tempo seed ${seed}`).toBeLessThan(SOGLIA_MS);

          expect(p.modalita).toBe(modalita);
          expect(p.livello).toBe(livello);
          expect(p.seed).toBe(seed);
          expect(soluzioneValida(p.soluzione)).toBe(true);
          expect(p.dati).toHaveLength(81);
          p.dati.forEach((v, i) => expect(v === 0 || v === p.soluzione[i]).toBe(true));

          const date = p.dati.filter((v) => v !== 0).length;
          expect(date).toBeGreaterThanOrEqual(target);
          expect(date).toBeLessThanOrEqual(target + 4);

          if (modalita === 'killer') {
            const gabbie = p.gabbie!;
            expect(gabbie).toBeDefined();
            const tutte = gabbie.flatMap((g) => g.celle).sort((a, b) => a - b);
            expect(tutte).toEqual(Array.from({ length: 81 }, (_, i) => i));
            for (const g of gabbie) {
              expect(g.celle.length).toBeGreaterThanOrEqual(1);
              expect(g.celle.length).toBeLessThanOrEqual(par.gabbiaMax);
              expect(g.somma).toBe(g.celle.reduce((s, i) => s + p.soluzione[i], 0));
              expect(new Set(g.celle.map((i) => p.soluzione[i])).size).toBe(g.celle.length);
              expect(contigua(g.celle)).toBe(true);
            }
          } else {
            expect(p.gabbie).toBeUndefined();
          }

          expect(contaSoluzioni(p.dati, p.gabbie)).toBe(1);
        }
      });
    }
  }
});

describe('determinismo', () => {
  it('stesso seed → stesso puzzle, seed diverso → puzzle diverso', () => {
    for (const modalita of MODALITA) {
      for (const livello of ['semini', 'supersemini'] as const) {
        const a = generaPuzzle(modalita, livello, 777);
        const b = generaPuzzle(modalita, livello, 777);
        expect(b).toEqual(a);
        const c = generaPuzzle(modalita, livello, 778);
        expect(c.soluzione).not.toEqual(a.soluzione);
      }
    }
  });
});

describe('contaSoluzioni', () => {
  it('griglia vuota: almeno il limite', () => {
    expect(contaSoluzioni(new Array(81).fill(0))).toBe(2);
    expect(contaSoluzioni(new Array(81).fill(0), undefined, 5)).toBe(5);
  });
  it('date in conflitto: zero soluzioni', () => {
    const d = new Array(81).fill(0);
    d[0] = 5;
    d[1] = 5;
    expect(contaSoluzioni(d)).toBe(0);
  });
  it('killer con somma impossibile: zero soluzioni', () => {
    const p = generaPuzzle('killer', 'facile', 3);
    const gabbie = p.gabbie!.map((g, k) => (k === 0 ? { ...g, somma: g.somma + 1 } : g));
    expect(contaSoluzioni(p.dati, gabbie)).toBe(0);
  });
});

describe('verificaCompleta', () => {
  it('true solo se piena e uguale alla soluzione', () => {
    const p = generaPuzzle('sudoku', 'medio', 9);
    expect(verificaCompleta(p, p.soluzione.slice())).toBe(true);
    expect(verificaCompleta(p, p.dati)).toBe(false);
    const sbagliata = p.soluzione.slice();
    [sbagliata[0], sbagliata[1]] = [sbagliata[1], sbagliata[0]];
    expect(verificaCompleta(p, sbagliata)).toBe(false);
  });
});

describe('celleInConflitto', () => {
  // Soluzione fissa: riga r, colonna c → ((r*3 + floor(r/3) + c) % 9) + 1
  const sol = Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
  });
  const base: Puzzle = { modalita: 'sudoku', livello: 'medio', seed: 0, soluzione: sol, dati: sol.map(() => 0) };

  it('griglia valida: nessun conflitto', () => {
    expect(soluzioneValida(sol)).toBe(true);
    expect(celleInConflitto(base, sol).size).toBe(0);
    expect(celleInConflitto(base, new Array(81).fill(0)).size).toBe(0);
  });

  it('stesso numero in riga, colonna, box', () => {
    const g = new Array(81).fill(0);
    g[0] = 7;
    g[8] = 7; // riga 0
    g[72] = 4;
    g[75] = 9; // nessun conflitto
    g[30] = 2;
    g[50] = 2; // stesso box (box 4: righe 3-5, colonne 3-5)
    g[13] = 3;
    g[76] = 3; // colonna 4
    expect([...celleInConflitto(base, g)].sort((a, b) => a - b)).toEqual([0, 8, 13, 30, 50, 76]);
  });

  it('killer: cifra ripetuta in gabbia, somma superata, gabbia piena con somma sbagliata', () => {
    const p: Puzzle = {
      ...base,
      modalita: 'killer',
      gabbie: [
        { celle: [1, 2], somma: 3 }, // superata
        { celle: [3, 4], somma: 10 }, // piena, somma sbagliata
        { celle: [5, 6], somma: 9 }, // parziale, ok
      ],
    };
    const g = new Array(81).fill(0);
    g[1] = 4; // 4 > 3: superata
    g[3] = 1;
    g[4] = 2; // piena, 3 ≠ 10
    g[5] = 6; // 6 ≤ 9, una vuota: ok
    expect([...celleInConflitto(p, g)].sort((a, b) => a - b)).toEqual([1, 3, 4]);

    // Cifra ripetuta in gabbia: 12=(1,3) e 20=(2,2) hanno riga, colonna e box diversi,
    // quindi il conflitto viene solo dalla gabbia.
    const p2: Puzzle = { ...p, gabbie: [{ celle: [11, 12, 20], somma: 20 }] };
    const g2 = new Array(81).fill(0);
    g2[12] = 5;
    g2[20] = 5;
    expect([...celleInConflitto(p2, g2)].sort((a, b) => a - b)).toEqual([12, 20]);
  });
});

describe('export', () => {
  it('oggetto motore completo', () => {
    expect(motore.generaPuzzle).toBe(generaPuzzle);
    expect(motore.contaSoluzioni).toBe(contaSoluzioni);
    expect(motore.verificaCompleta).toBe(verificaCompleta);
    expect(motore.celleInConflitto).toBe(celleInConflitto);
    expect(LIVELLI).toEqual(['semini', 'facile', 'medio', 'difficile', 'extreme', 'supersemini']);
  });
});
