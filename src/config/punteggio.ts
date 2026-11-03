// Punti, serie e regali. Tutto in un posto: cambiare qui cambia il gioco.
import type { QualitaMossa } from '../engine/types';

export const PUNTI: Record<QualitaMossa, number> = {
  giusta: 10,
  intelligente: 25,
  brillante: 50,
  chiusura: 30, // in più rispetto alla qualità della mossa, per ogni unità chiusa
};

/** moltiplicatore della serie: ogni 5 celle giuste di fila +0.5, fino a ×3 */
export function moltiplicatoreSerie(serie: number): number {
  return Math.min(3, 1 + Math.floor(serie / 5) * 0.5);
}

export const PENALITA_ERRORE = 15;
export const BONUS_VITTORIA = 150;
/** bonus tempo: 1 punto ogni 5 secondi sotto i 20 minuti (0 oltre) */
export function bonusTempo(secondi: number): number {
  return Math.max(0, Math.floor((20 * 60 - secondi) / 5));
}

/** un regalo (suggerimento di Semino) ogni N punti di un giocatore */
export const PUNTI_PER_REGALO = 200;
/** soglia della barra: punti di coppia che riempiono la crescita completa di Semino in una partita */
export const PUNTI_CRESCITA_PIENA = 1200;
