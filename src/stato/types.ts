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

/** Contatori di un giocatore. Li scrive SOLO quel giocatore; nel merge vince il ts maggiore. */
export interface Contatori {
  punti: number;
  errori: number;
  /** celle giuste consecutive senza errori (si azzera all'errore) */
  serie: number;
  /** regali ottenuti in totale nella partita */
  regali: number;
  /** regali non ancora usati */
  regaliDisponibili: number;
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
  /** contatori per giocatore (assenti finché quel giocatore non fa la prima mossa) */
  contatori?: Partial<Record<Giocatore, Contatori>>;
}

export type Azione =
  | { tipo: 'cella'; idx: number; v: number; note: number[]; da: Giocatore; ts: number }
  | { tipo: 'contatori'; da: Giocatore; contatori: Contatori }
  | { tipo: 'tick' } // +1 secondo
  | { tipo: 'finita'; ts: number };

/** Una partita nello storico: finita (fiorita) o lasciata a metà (germoglio, riprendibile). */
export interface VoceStorico {
  /** `${modalita}-${seed}` */
  id: string;
  modalita: Puzzle['modalita'];
  livello: Puzzle['livello'];
  iniziata: number;
  finita?: number;
  secondi: number;
  /** celle riempite correttamente su quelle da riempire, 0..1 */
  progresso: number;
  /** somma dei punti dei due giocatori */
  punti: number;
  errori: number;
  /** ultimo aggiornamento: nel merge vince il maggiore */
  aggiornata: number;
  /** stato completo, solo per le partite non finite (per riprenderle) */
  stato?: StatoPartita;
}

export interface Stato {
  nuovaPartita(puzzle: Puzzle, iniziata?: number): StatoPartita;
  /** Riduttore puro: ignora modifiche a celle date e azioni con ts più vecchio della cella/contatore. */
  applica(stato: StatoPartita, azione: Azione): StatoPartita;
  /** Merge: puzzle con `iniziata` maggiore vince; stesso puzzle → per cella vince ts maggiore; contatori per giocatore con ts maggiore; secondi = max. */
  unisci(a: StatoPartita, b: StatoPartita): StatoPartita;
  /** Griglia 81 valori combinando dati e celle. */
  griglia(stato: StatoPartita): number[];
  /** Voce di storico derivata dalla partita (con `stato` incluso solo se non finita). */
  voceStorico(stato: StatoPartita): VoceStorico;
  /** Merge di due storici per id: vince `aggiornata` maggiore; ordinati per iniziata decrescente; max 200 voci. */
  unisciStorico(a: VoceStorico[], b: VoceStorico[]): VoceStorico[];
}
