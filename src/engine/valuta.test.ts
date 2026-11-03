import { describe, expect, it } from 'vitest';
import { candidati, valutaMossa, valutazione, type Gabbia, type Puzzle } from './index';

// Soluzione "a scorrimento":
// r0: 1 2 3 4 5 6 7 8 9 | r1: 4 5 6 7 8 9 1 2 3 | r2: 7 8 9 1 2 3 4 5 6
// r3: 2 3 4 5 6 7 8 9 1 | r4: 5 6 7 8 9 1 2 3 4 | ...
const SOL = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  return ((r % 3) * 3 + Math.floor(r / 3) + (i % 9)) % 9 + 1;
});
const at = (r: number, c: number) => r * 9 + c;

function puzzle(gabbie?: Gabbia[]): Puzzle {
  return { modalita: gabbie ? 'killer' : 'sudoku', livello: 'medio', seed: 1, soluzione: SOL, dati: SOL.slice(), gabbie };
}

/** Soluzione con le celle indicate svuotate. */
function senza(celle: number[]): number[] {
  const g = SOL.slice();
  for (const i of celle) g[i] = 0;
  return g;
}
const righe = (...rr: number[]) => rr.flatMap((r) => Array.from({ length: 9 }, (_, c) => at(r, c)));

describe('soluzione di prova', () => {
  it('è valida', () => {
    expect(SOL.slice(0, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(SOL.slice(9, 18)).toEqual([4, 5, 6, 7, 8, 9, 1, 2, 3]);
    expect(SOL.slice(27, 36)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 1]);
  });
});

describe('candidati', () => {
  it('esclude riga, colonna e box; ignora il valore della cella stessa', () => {
    const g = senza([at(0, 0), at(0, 1), at(1, 0)]);
    expect(candidati(puzzle(), g, at(0, 0))).toEqual([1]);
    expect(candidati(puzzle(), senza(righe(0, 1)), at(0, 0))).toEqual([1, 4]);
    // cella con un valore (anche sbagliato): trattata come vuota
    const s = senza([at(0, 1)]);
    s[at(0, 1)] = 9;
    expect(candidati(puzzle(), s, at(0, 1))).toEqual([2]);
  });

  it('killer: esclude cifre già nella gabbia e somme non raggiungibili', () => {
    const P = puzzle([{ celle: [at(2, 2), at(2, 3), at(3, 3)], somma: 15 }]);
    const g = new Array(81).fill(0);
    g[at(2, 2)] = 9;
    // gabbia con una cella vuota in più: 9 + v ≤ 15 e v ≠ 9
    expect(candidati(P, g, at(3, 3))).toEqual([1, 2, 3, 4, 5, 6]);
    // ultima cella vuota della gabbia: somma esatta (9 + 1 + v = 15)
    g[at(2, 3)] = 1;
    expect(candidati(P, g, at(3, 3))).toEqual([5]);
    // senza gabbie: libera
    expect(candidati(puzzle(), g, at(3, 3))).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('valutaMossa', () => {
  it('naked single → giusta', () => {
    const g = senza([at(0, 0), at(0, 1), at(1, 0)]);
    expect(valutaMossa(puzzle(), g, at(0, 0), 1)).toEqual({ qualita: 'giusta', candidati: 1, completate: [] });
  });

  it('hidden single con ≥2 candidati → intelligente', () => {
    // (0,0) ammette {1,2}; in riga 0 l'unica altra vuota (0,1) ammette solo 2
    const g = senza([at(0, 0), at(0, 1), at(3, 0)]);
    expect(candidati(puzzle(), g, at(0, 0))).toEqual([1, 2]);
    expect(valutaMossa(puzzle(), g, at(0, 0), 1)).toEqual({ qualita: 'intelligente', candidati: 2, completate: [] });
  });

  it('≥3 candidati senza hidden single → brillante', () => {
    const g = senza(righe(0, 1, 2));
    expect(candidati(puzzle(), g, at(0, 0))).toEqual([1, 4, 7]);
    expect(valutaMossa(puzzle(), g, at(0, 0), 1)).toEqual({ qualita: 'brillante', candidati: 3, completate: [] });
  });

  it('2 candidati senza hidden single → giusta', () => {
    const g = senza(righe(0, 1));
    expect(valutaMossa(puzzle(), g, at(0, 0), 1)).toEqual({ qualita: 'giusta', candidati: 2, completate: [] });
  });

  it('chiude una riga → chiusura con riga', () => {
    const g = senza([at(0, 0), at(1, 0)]);
    expect(valutaMossa(puzzle(), g, at(0, 0), 1)).toEqual({ qualita: 'chiusura', candidati: 1, completate: ['riga'] });
  });

  it('chiude riga e box insieme', () => {
    const g = senza([at(0, 0), at(3, 0)]);
    expect(valutaMossa(puzzle(), g, at(0, 0), 1).completate).toEqual(['riga', 'box']);
  });

  it('chiude riga, colonna e box (ultima cella)', () => {
    expect(valutaMossa(puzzle(), senza([at(4, 4)]), at(4, 4), SOL[at(4, 4)]).completate).toEqual(['riga', 'colonna', 'box']);
  });

  it('una riga piena ma con un errore non conta come chiusa', () => {
    const g = senza([at(0, 0), at(1, 0)]);
    g[at(0, 8)] = 1; // errore nella riga 0
    const val = valutaMossa(puzzle(), g, at(0, 0), 1);
    expect(val.completate).toEqual([]);
    expect(val.qualita).not.toBe('chiusura');
  });

  it('killer: chiusura con gabbia e candidati filtrati dalla gabbia', () => {
    const P = puzzle([{ celle: [at(2, 2), at(2, 3), at(3, 3)], somma: SOL[at(2, 2)] + SOL[at(2, 3)] + SOL[at(3, 3)] }]);
    // (3,4) e (4,3) vuote: riga, colonna e box restano aperte; la gabbia si chiude
    const g = senza([at(3, 3), at(3, 4), at(4, 3)]);
    expect(valutaMossa(P, g, at(3, 3), SOL[at(3, 3)])).toEqual({ qualita: 'chiusura', candidati: 1, completate: ['gabbia'] });
  });

  it('killer: la gabbia riduce i candidati (2 → 1)', () => {
    // senza gabbia (0,0) ha {1,4}; gabbia (0,0)+(0,1)+(0,2)=6 con (0,2)=3 già messo: 3+4 > 6 → solo 1
    const g = senza(righe(0, 1));
    g[at(0, 2)] = 3;
    expect(valutaMossa(puzzle(), g, at(0, 0), 1).candidati).toBe(2);
    const P = puzzle([{ celle: [at(0, 0), at(0, 1), at(0, 2)], somma: 6 }]);
    expect(valutaMossa(P, g, at(0, 0), 1)).toEqual({ qualita: 'giusta', candidati: 1, completate: [] });
  });

  it('oggetto valutazione espone le due funzioni', () => {
    expect(valutazione.valutaMossa).toBe(valutaMossa);
    expect(valutazione.candidati).toBe(candidati);
  });
});
