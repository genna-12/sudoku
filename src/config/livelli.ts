import type { Livello } from '../engine/types';

export interface ParametriLivello {
  etichetta: string;
  /** sudoku: celle date; killer: celle date */
  dateSudoku: number;
  dateKiller: number;
  /** killer: dimensione massima di una gabbia */
  gabbiaMax: number;
}

// Motivo delle soglie: 17 è il minimo teorico per unicità; sotto 24 la generazione rallenta molto.
export const LIVELLI_PARAMETRI: Record<Livello, ParametriLivello> = {
  semini: { etichetta: 'semini', dateSudoku: 50, dateKiller: 24, gabbiaMax: 2 },
  facile: { etichetta: 'facile', dateSudoku: 42, dateKiller: 12, gabbiaMax: 3 },
  medio: { etichetta: 'medio', dateSudoku: 36, dateKiller: 6, gabbiaMax: 3 },
  difficile: { etichetta: 'difficile', dateSudoku: 31, dateKiller: 0, gabbiaMax: 3 },
  extreme: { etichetta: 'extreme', dateSudoku: 27, dateKiller: 0, gabbiaMax: 4 },
  supersemini: { etichetta: 'supersemini', dateSudoku: 24, dateKiller: 0, gabbiaMax: 5 },
};
