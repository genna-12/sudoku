// Chi è chi. All'ingresso si sceglie un profilo, non si scrive un nome: zero ambiguità.
// Semino = Genna (verde fluo, ruolo 'a'); Semina = lei (blu elettrico, ruolo 'b').

export const COLORE_GENNA = '#7CFF4A'; // verde fluo, schiarito quanto basta per restare leggibile su fondo scuro
export const COLORE_LEI = '#2F6BFF'; // blu elettrico

export type ProfiloId = 'semino' | 'semina';

export interface Profilo {
  id: ProfiloId;
  nome: string;
  ruolo: 'a' | 'b';
  colore: string;
  /** chi è, per la scelta all'ingresso */
  descrizione: string;
}

export const PROFILI: readonly Profilo[] = [
  { id: 'semino', nome: 'Semino', ruolo: 'a', colore: COLORE_GENNA, descrizione: 'verde, il primo semino del giardino' },
  { id: 'semina', nome: 'Semina', ruolo: 'b', colore: COLORE_LEI, descrizione: 'blu, arrivata col fruscio' },
];

/** Profilo da un nome (anche vecchi nomi liberi di T1: Genna/Lorenzo → Semino, tutto il resto → Semina). */
export function profiloDiNome(nome: string): Profilo {
  const n = nome.trim().toLowerCase().replace(/\s+/g, '');
  if (n === 'semina') return PROFILI[1];
  if (n === 'semino' || ['genna', 'lorenzo', 'lorenzogennari', 'gennari'].includes(n)) return PROFILI[0];
  return PROFILI[1];
}

export function coloreDiNome(nome: string): string {
  return profiloDiNome(nome).colore;
}

/**
 * Ruolo di gioco STABILE, deciso solo dal profilo: Semino = 'a', Semina = 'b'.
 * Non dipende da chi si collega per primo: celle, punti e colori restano coerenti
 * su tutti i dispositivi e in tutte le sessioni.
 */
export function ruoloDiNome(nome: string): 'a' | 'b' {
  return profiloDiNome(nome).ruolo;
}

/** Colori per ruolo di gioco: 'a' (Semino) verde, 'b' (Semina) blu. */
export const COLORI_RUOLO: Record<'a' | 'b', string> = { a: COLORE_GENNA, b: COLORE_LEI };

/** @deprecated usare COLORI_RUOLO. Resta per compatibilità con la UI di T1. */
export const COLORI = COLORI_RUOLO;
