// Contratto del motore puzzle. Non modificare senza riportarlo alla lead.

export type Modalita = 'sudoku' | 'killer';

export const LIVELLI = ['semini', 'facile', 'medio', 'difficile', 'extreme', 'supersemini'] as const;
export type Livello = (typeof LIVELLI)[number];

/** Gabbia del Killer: indici di cella 0..80 (riga*9+colonna) e somma richiesta. */
export interface Gabbia {
  celle: number[];
  somma: number;
}

export interface Puzzle {
  modalita: Modalita;
  livello: Livello;
  seed: number;
  /** 81 valori 1..9 */
  soluzione: number[];
  /** 81 valori, 0 = cella vuota da riempire */
  dati: number[];
  /** Solo per killer: partizione completa delle 81 celle */
  gabbie?: Gabbia[];
}

/** Valori correnti della griglia: 81 numeri, 0 = vuota. */
export type Griglia = number[];

export interface Motore {
  /** Deterministico dato il seed. Soluzione unica garantita. */
  generaPuzzle(modalita: Modalita, livello: Livello, seed: number): Puzzle;
  /** Conta le soluzioni fino a `limite` (default 2). Per killer usa le gabbie. */
  contaSoluzioni(dati: Griglia, gabbie?: Gabbia[], limite?: number): number;
  /** True se la griglia è piena e coincide con la soluzione. */
  verificaCompleta(puzzle: Puzzle, griglia: Griglia): boolean;
  /** Indici delle celle che violano riga/colonna/box (e gabbia nel killer) rispetto ai valori correnti. */
  celleInConflitto(puzzle: Puzzle, griglia: Griglia): Set<number>;
}
