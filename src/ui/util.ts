import type { StatoConnessione } from '../net';
import type { Giocatore } from '../stato';

export function caso<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

export function conNome(testo: string, nome: string): string {
  return testo.replaceAll('{nome}', nome || 'mini');
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

export const CHIAVI = {
  partita: 'sudoku-coppia',
  io: 'sudoku-coppia-io',
  partner: 'sudoku-coppia-partner',
  errori: 'sudoku-coppia-errori',
  scelta: 'sudoku-coppia-scelta',
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
