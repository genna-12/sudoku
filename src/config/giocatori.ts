// Chi è chi: il colore dipende dal NOME inserito all'ingresso, non da chi si collega prima.
// Genna = verde fluo; chiunque altro (lei) = blu elettrico.

export const COLORE_GENNA = '#7CFF4A'; // verde fluo, schiarito quanto basta per restare leggibile su fondo scuro
export const COLORE_LEI = '#2F6BFF'; // blu elettrico

/** nomi (minuscolo, senza spazi) che identificano Genna */
export const NOMI_GENNA = ['genna', 'lorenzo', 'lorenzogennari', 'gennari'];

export function coloreDiNome(nome: string): string {
  const n = nome.trim().toLowerCase().replace(/\s+/g, '');
  return NOMI_GENNA.includes(n) ? COLORE_GENNA : COLORE_LEI;
}

/**
 * Ruolo di gioco STABILE, deciso solo dal nome: Genna = 'a', chiunque altro = 'b'.
 * Non dipende da chi si collega per primo né dal partner: così celle, punti e colori
 * restano coerenti su tutti i dispositivi e in tutte le sessioni.
 */
export function ruoloDiNome(nome: string): 'a' | 'b' {
  return coloreDiNome(nome) === COLORE_GENNA ? 'a' : 'b';
}

/** Colori per ruolo di gioco: 'a' (Genna) verde, 'b' (lei) blu. */
export const COLORI_RUOLO: Record<'a' | 'b', string> = { a: COLORE_GENNA, b: COLORE_LEI };

/** @deprecated usare COLORI_RUOLO. Resta per compatibilità con la UI di T1. */
export const COLORI = COLORI_RUOLO;
