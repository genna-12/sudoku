// Chi è chi. All'ingresso si sceglie un profilo, non si scrive un nome: zero ambiguità.
// Semino = Genna (verde fluo, ruolo 'a'); Semina = lei (blu elettrico, ruolo 'b').

export const COLORE_GENNA = '#7CFF4A'; // verde fluo, schiarito quanto basta per restare leggibile su fondo scuro
export const COLORE_LEI = '#2F6BFF'; // blu elettrico

export type ProfiloId = 'semino' | 'semina';

export interface Profilo {
  id: ProfiloId;
  /** nome dopo lo sblocco di Semina (il personaggio) */
  nome: string;
  /** nome PRIMA dello sblocco: solo un colore, nessun personaggio (Semina deve restare una sorpresa) */
  nomePrima: string;
  /** nome vero della persona (usato dalle mascotte quando parlano di voi) */
  nomeReale: string;
  ruolo: 'a' | 'b';
  colore: string;
  /** chi è, per la scelta all'ingresso */
  descrizione: string;
}

export const PROFILI: readonly Profilo[] = [
  { id: 'semino', nome: 'Semino', nomePrima: 'Verde', nomeReale: 'Genna', ruolo: 'a', colore: COLORE_GENNA, descrizione: 'il verde fluo' },
  { id: 'semina', nome: 'Semina', nomePrima: 'Blu', nomeReale: 'Mati', ruolo: 'b', colore: COLORE_LEI, descrizione: 'il blu elettrico' },
];

/** Profilo da un nome (Verde/Semino/Genna/Lorenzo → 'semino'; Blu/Semina/tutto il resto → 'semina'). */
export function profiloDiNome(nome: string): Profilo {
  const n = nome.trim().toLowerCase().replace(/\s+/g, '');
  if (n === 'semina' || n === 'blu') return PROFILI[1];
  if (n === 'semino' || n === 'verde' || ['genna', 'lorenzo', 'lorenzogennari', 'gennari'].includes(n)) return PROFILI[0];
  return PROFILI[1];
}

/**
 * Nome del GIOCATORE da mostrare: sempre quello vero (Genna / Mati). Il colore è solo un'etichetta
 * (`nomePrima`) e Semino/Semina (`nome`) sono le mascotte, non i giocatori.
 * Il parametro resta per compatibilità: non cambia più il risultato.
 */
export function nomeVisibile(p: Profilo, _seminaSbloccata?: boolean): string {
  return p.nomeReale;
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
