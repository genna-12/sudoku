// Motore puzzle: generazione deterministica, conteggio soluzioni, verifica e conflitti.
import { genera } from './genera';
import { BOX, COLONNA, RIGA, cerca } from './risolutore';
import type { Gabbia, Griglia, Livello, Modalita, Motore, Puzzle } from './types';

export type { Gabbia, Griglia, Livello, Modalita, MotoreValutazione, Puzzle, QualitaMossa, Valutazione } from './types';
export { LIVELLI } from './types';
export { candidati, valutaMossa, valutazione } from './valuta';

export function generaPuzzle(modalita: Modalita, livello: Livello, seed: number): Puzzle {
  return genera(modalita, livello, seed);
}

export function contaSoluzioni(dati: Griglia, gabbie?: Gabbia[], limite = 2): number {
  return cerca(dati, gabbie, { limite }).soluzioni;
}

export function verificaCompleta(puzzle: Puzzle, griglia: Griglia): boolean {
  return griglia.length === 81 && griglia.every((v, i) => v === puzzle.soluzione[i]);
}

export function celleInConflitto(puzzle: Puzzle, griglia: Griglia): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = griglia[i];
    if (!v) continue;
    for (let j = i + 1; j < 81; j++) {
      if (griglia[j] !== v) continue;
      if (RIGA[i] === RIGA[j] || COLONNA[i] === COLONNA[j] || BOX[i] === BOX[j]) {
        out.add(i);
        out.add(j);
      }
    }
  }
  for (const g of puzzle.gabbie ?? []) {
    const piene = g.celle.filter((i) => griglia[i]);
    const somma = piene.reduce((s, i) => s + griglia[i], 0);
    // cifra ripetuta nella gabbia
    for (const i of piene)
      for (const j of piene)
        if (i < j && griglia[i] === griglia[j]) {
          out.add(i);
          out.add(j);
        }
    // somma superata, o gabbia piena con somma sbagliata
    if (somma > g.somma || (piene.length === g.celle.length && somma !== g.somma)) for (const i of piene) out.add(i);
  }
  return out;
}

export const motore: Motore = { generaPuzzle, contaSoluzioni, verificaCompleta, celleInConflitto };
