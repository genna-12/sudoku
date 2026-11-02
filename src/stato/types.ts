// Contratto dello stato condiviso della partita. Non modificare senza riportarlo alla lead.
import type { Puzzle } from '../engine/types';

export type Giocatore = 'a' | 'b';

export interface Cella {
  /** 0 = vuota */
  v: number;
  /** note a matita, cifre 1..9 ordinate */
  note: number[];
  /** chi ha fatto l'ultima modifica */
  da: Giocatore;
  /** timestamp ms dell'ultima modifica (Date.now()) */
  ts: number;
}

export interface StatoPartita {
  puzzle: Puzzle;
  /** chiave: indice cella 0..80; solo celle non date e toccate almeno una volta */
  celle: Record<number, Cella>;
  /** Date.now() alla creazione: la partita più recente vince nel merge */
  iniziata: number;
  /** Date.now() alla vittoria */
  finita?: number;
  /** secondi giocati (si aggiorna localmente, si allinea al massimo nel merge) */
  secondi: number;
}

export type Azione =
  | { tipo: 'cella'; idx: number; v: number; note: number[]; da: Giocatore; ts: number }
  | { tipo: 'tick' } // +1 secondo
  | { tipo: 'finita'; ts: number };

export interface Stato {
  nuovaPartita(puzzle: Puzzle, iniziata?: number): StatoPartita;
  /** Riduttore puro: ignora modifiche a celle date e azioni con ts più vecchio della cella. */
  applica(stato: StatoPartita, azione: Azione): StatoPartita;
  /** Merge: puzzle con `iniziata` maggiore vince; stesso puzzle → per cella vince ts maggiore; secondi = max. */
  unisci(a: StatoPartita, b: StatoPartita): StatoPartita;
  /** Griglia 81 valori combinando dati e celle. */
  griglia(stato: StatoPartita): number[];
}
