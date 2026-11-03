import type { CSSProperties } from 'react';
import type { StatoConnessione } from '../net';
import type { Giocatore } from '../stato';

export function caso<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

export function tempo(secondi: number): string {
  const h = Math.floor(secondi / 3600);
  const m = Math.floor((secondi % 3600) / 60);
  const s = secondi % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function altro(g: Giocatore): Giocatore {
  return g === 'a' ? 'b' : 'a';
}

export function testoConnessione(s: StatoConnessione, partner: string): string {
  switch (s) {
    case 'connessione':
      return 'mi collego…';
    case 'in-attesa':
      return partner ? `aspetto ${partner}` : "aspetto l'altra metà";
    case 'connesso':
      return partner ? `${partner} è qui` : 'siete collegati';
    case 'errore':
      return 'non riesco a collegarmi, riprovo';
  }
}

// localStorage può lanciare (navigazione privata, storage bloccato): sempre in try/catch.
export function leggi<T>(chiave: string): T | null {
  try {
    const s = localStorage.getItem(chiave);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function scrivi(chiave: string, valore: unknown): void {
  try {
    if (valore === null || valore === undefined) localStorage.removeItem(chiave);
    else localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    /* storage non disponibile: si gioca lo stesso */
  }
}

/** Preferenze di sola interfaccia, fuori dall'archivio (che per ora non ha un posto per loro).
 *  Tutto il resto persiste in `sudoku-coppia-archivio` (src/stato/archivio.ts). */
export const CHIAVI = {
  scelta: 'sudoku-coppia-scelta',
  tema: 'sudoku-coppia-tema',
} as const;

/** Indici delle celle di riga, colonna e box di `idx`. */
export function gruppi(idx: number): { riga: number[]; colonna: number[]; box: number[] } {
  const r = Math.floor(idx / 9);
  const c = idx % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  const riga = Array.from({ length: 9 }, (_, k) => r * 9 + k);
  const colonna = Array.from({ length: 9 }, (_, k) => k * 9 + c);
  const box = Array.from({ length: 9 }, (_, k) => (br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  return { riga, colonna, box };
}

/**
 * Sguardo verso la cella selezionata: spostamento degli occhi (unità del disegno, ±3.6) per una
 * mascotte che sta in (mx, my), in frazioni della griglia (0..1 = dentro, fuori = accanto).
 */
export function sguardo(guarda: { r: number; c: number } | null, mx: number, my: number): CSSProperties | undefined {
  if (!guarda) return undefined;
  const dx = (guarda.c + 0.5) / 9 - mx;
  const dy = (guarda.r + 0.5) / 9 - my;
  const k = Math.hypot(dx, dy) || 1;
  const forza = Math.min(1, k * 2.2);
  return {
    '--gx': `${((dx / k) * 3.6 * forza).toFixed(2)}px`,
    '--gy': `${((dy / k) * 2.6 * forza).toFixed(2)}px`,
  } as CSSProperties;
}
