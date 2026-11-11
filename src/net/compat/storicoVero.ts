// Storico costruito con i moduli veri, per i test della rete (lotti, compatibilità).
import { generaPuzzle } from '../../engine';
import { applica, nuovaPartita, voceStorico } from '../../stato';
import type { VoceStorico } from '../../stato/types';

/** storico vero: `fiori` partite finite e `germogli` partite killer a metà (con la partita intera dentro) */
export function storicoVero(fiori: number, germogli: number, seme = 0): VoceStorico[] {
  const out: VoceStorico[] = [];
  const T0 = 1_700_000_000_000 + seme * 1_000_000;
  for (let k = 0; k < fiori; k++) {
    const p = nuovaPartita(generaPuzzle('sudoku', 'semini', 100 + k + seme), T0 + k * 1000);
    out.push(voceStorico(applica(p, { tipo: 'finita', ts: p.iniziata + 500 })));
  }
  for (let k = 0; k < germogli; k++) {
    const puzzle = generaPuzzle('killer', 'medio', 900 + k + seme);
    let p = nuovaPartita(puzzle, T0 + 100_000 + k * 1000);
    const vuote = puzzle.dati.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
    vuote.slice(0, 30).forEach((i, n) => {
      p = applica(p, { tipo: 'cella', idx: i, v: puzzle.soluzione[i], note: [], da: n % 2 ? 'b' : 'a', ts: p.iniziata + 1 + n });
    });
    out.push(voceStorico(p));
  }
  return out;
}

