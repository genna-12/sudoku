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

/** Giudizio su una mossa giusta, dal più comune al più raro. */
export type QualitaMossa =
  | 'giusta' // valore corretto, dedotto in modo semplice (la cella aveva 1 candidato: "naked single")
  | 'intelligente' // "hidden single": unica cella di riga/colonna/box dove poteva stare quella cifra, ma la cella aveva ≥2 candidati
  | 'brillante' // corretto senza essere né naked né hidden single: serviva una deduzione più profonda (o fortuna) — cella con ≥3 candidati
  | 'chiusura'; // la mossa completa una riga, colonna, box o gabbia senza errori (ha priorità sulle altre)

export interface Valutazione {
  qualita: QualitaMossa;
  /** candidati che la cella aveva prima della mossa (secondo riga/colonna/box e gabbie), 1..9 */
  candidati: number;
  /** unità completate da questa mossa: 'riga' | 'colonna' | 'box' | 'gabbia' */
  completate: Array<'riga' | 'colonna' | 'box' | 'gabbia'>;
}

export interface MotoreValutazione {
  /** Valuta una mossa CORRETTA (griglia[idx] === soluzione[idx]) rispetto alla griglia prima della mossa. */
  valutaMossa(puzzle: Puzzle, grigliaPrima: Griglia, idx: number, v: number): Valutazione;
  /** Candidati possibili per una cella vuota, dato lo stato corrente (riga/colonna/box e, nel killer, gabbia). */
  candidati(puzzle: Puzzle, griglia: Griglia, idx: number): number[];
}
