// Valutazione delle mosse: candidati di una cella e qualità di una mossa corretta.
import { BOX, COLONNA, RIGA } from './risolutore';
import type { Gabbia, Griglia, MotoreValutazione, Puzzle, Valutazione } from './types';

type Unita = Valutazione['completate'][number];

/** Celle di ogni riga, colonna e box. */
const CELLE_RIGA: number[][] = Array.from({ length: 9 }, () => []);
const CELLE_COLONNA: number[][] = Array.from({ length: 9 }, () => []);
const CELLE_BOX: number[][] = Array.from({ length: 9 }, () => []);
for (let i = 0; i < 81; i++) {
  CELLE_RIGA[RIGA[i]].push(i);
  CELLE_COLONNA[COLONNA[i]].push(i);
  CELLE_BOX[BOX[i]].push(i);
}

function gabbiaDi(puzzle: Puzzle, idx: number): Gabbia | undefined {
  return puzzle.gabbie?.find((g) => g.celle.includes(idx));
}

/**
 * Cifre ammesse in `idx`: non presenti in riga/colonna/box; nel killer anche non già nella gabbia
 * e con somma ancora raggiungibile (parziale + v ≤ somma; se è l'ultima cella vuota, somma esatta).
 * Il valore attuale di `idx` (se c'è) viene ignorato: la cella è trattata come vuota.
 */
export function candidati(puzzle: Puzzle, griglia: Griglia, idx: number): number[] {
  if (idx < 0 || idx > 80) return [];
  let usate = 0;
  for (const casa of [CELLE_RIGA[RIGA[idx]], CELLE_COLONNA[COLONNA[idx]], CELLE_BOX[BOX[idx]]])
    for (const j of casa) if (j !== idx && griglia[j]) usate |= 1 << griglia[j];
  const gabbia = gabbiaDi(puzzle, idx);
  let parziale = 0;
  let vuote = 0;
  if (gabbia) {
    for (const j of gabbia.celle) {
      if (j === idx) continue;
      if (griglia[j]) {
        usate |= 1 << griglia[j];
        parziale += griglia[j];
      } else vuote++;
    }
  }
  const out: number[] = [];
  for (let v = 1; v <= 9; v++) {
    if (usate & (1 << v)) continue;
    if (gabbia) {
      if (parziale + v > gabbia.somma) continue;
      if (vuote === 0 && parziale + v !== gabbia.somma) continue;
    }
    out.push(v);
  }
  return out;
}

/** Valuta una mossa CORRETTA (v === soluzione[idx]) rispetto alla griglia prima della mossa. */
export function valutaMossa(puzzle: Puzzle, grigliaPrima: Griglia, idx: number, v: number): Valutazione {
  const prima = grigliaPrima.slice();
  prima[idx] = 0; // anche se la cella aveva un valore sbagliato, la si valuta come vuota
  const cand = candidati(puzzle, prima, idx);
  // v è corretto per ipotesi: se errori altrove lo escludono, lo contiamo comunque (candidati 1..9)
  const n = cand.includes(v) ? cand.length : cand.length + 1;

  const dopo = prima.slice();
  dopo[idx] = v;
  const corretta = (casa: number[]) => casa.every((j) => dopo[j] !== 0 && dopo[j] === puzzle.soluzione[j]);
  const completate: Unita[] = [];
  if (corretta(CELLE_RIGA[RIGA[idx]])) completate.push('riga');
  if (corretta(CELLE_COLONNA[COLONNA[idx]])) completate.push('colonna');
  if (corretta(CELLE_BOX[BOX[idx]])) completate.push('box');
  const gabbia = gabbiaDi(puzzle, idx);
  if (gabbia && corretta(gabbia.celle)) completate.push('gabbia');

  if (completate.length) return { qualita: 'chiusura', candidati: n, completate };
  if (n === 1) return { qualita: 'giusta', candidati: n, completate };
  // hidden single: in almeno una casa nessun'altra cella vuota ammette v
  const nascosto = [CELLE_RIGA[RIGA[idx]], CELLE_COLONNA[COLONNA[idx]], CELLE_BOX[BOX[idx]]].some((casa) =>
    casa.every((j) => j === idx || prima[j] !== 0 || !candidati(puzzle, prima, j).includes(v)),
  );
  if (nascosto) return { qualita: 'intelligente', candidati: n, completate };
  return { qualita: n >= 3 ? 'brillante' : 'giusta', candidati: n, completate };
}

export const valutazione: MotoreValutazione = { valutaMossa, candidati };
