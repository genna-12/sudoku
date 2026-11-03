import type { Puzzle } from '../engine/types';
import type { Azione, Cella, Stato, StatoPartita } from './types';

export type { Azione, Cella, Giocatore, StatoPartita } from './types';

export function nuovaPartita(puzzle: Puzzle, iniziata = Date.now()): StatoPartita {
  return { puzzle, celle: {}, iniziata, secondi: 0 };
}

export function griglia(stato: StatoPartita): number[] {
  const g = stato.puzzle.dati.slice();
  for (const k in stato.celle) {
    const i = Number(k);
    if (g[i] === 0) g[i] = stato.celle[i].v;
  }
  return g;
}

export function applica(stato: StatoPartita, azione: Azione): StatoPartita {
  switch (azione.tipo) {
    case 'tick':
      return stato.finita ? stato : { ...stato, secondi: stato.secondi + 1 };
    case 'finita':
      return stato.finita ? stato : { ...stato, finita: azione.ts };
    case 'cella': {
      const { idx, v, note, da, ts } = azione;
      if (idx < 0 || idx > 80 || stato.puzzle.dati[idx] !== 0 || stato.finita) return stato;
      const prec = stato.celle[idx];
      if (prec && prec.ts >= ts) return stato;
      const cella: Cella = { v, note: [...note].sort(), da, ts };
      return { ...stato, celle: { ...stato.celle, [idx]: cella } };
    }
  }
}

function stessoPuzzle(a: Puzzle, b: Puzzle): boolean {
  return a.modalita === b.modalita && a.livello === b.livello && a.seed === b.seed;
}

export function unisci(a: StatoPartita, b: StatoPartita): StatoPartita {
  if (!stessoPuzzle(a.puzzle, b.puzzle)) {
    if (a.iniziata !== b.iniziata) return a.iniziata > b.iniziata ? a : b;
    // stesso istante, puzzle diversi: ordine deterministico sul seed
    return a.puzzle.seed >= b.puzzle.seed ? a : b;
  }
  const celle: Record<number, Cella> = { ...a.celle };
  for (const k in b.celle) {
    const i = Number(k);
    const cb = b.celle[i];
    const ca = celle[i];
    if (!ca || cb.ts > ca.ts) celle[i] = cb;
  }
  const finita = a.finita && b.finita ? Math.min(a.finita, b.finita) : (a.finita ?? b.finita);
  return {
    puzzle: a.puzzle,
    celle,
    iniziata: Math.min(a.iniziata, b.iniziata),
    secondi: Math.max(a.secondi, b.secondi),
    ...(finita ? { finita } : {}),
  };
}

/**
 * Una `nuova` arrivata dal partner va accettata? Sì, salvo quando anche noi abbiamo appena
 * iniziato una partita diversa e più recente (due "nuova" incrociate): stessa regola di `unisci`,
 * così entrambi i lati scelgono la stessa partita.
 */
export function accettaNuova(mia: StatoPartita | null, arrivata: StatoPartita): boolean {
  return !mia || unisci(mia, arrivata) !== mia;
}

export const stato: Stato = { nuovaPartita, applica, unisci, griglia };
