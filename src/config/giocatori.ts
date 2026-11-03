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

/** Colore di ciascun ruolo di rete a partire dai nomi; se i nomi non bastano, 'a' = Genna. */
export function coloriRuoli(mioNome: string, mioRuolo: 'a' | 'b', partnerNome: string): Record<'a' | 'b', string> {
  const mio = coloreDiNome(mioNome);
  const suo = partnerNome ? coloreDiNome(partnerNome) : mio === COLORE_GENNA ? COLORE_LEI : COLORE_GENNA;
  return mioRuolo === 'a' ? { a: mio, b: suo } : { a: suo, b: mio };
}

/** @deprecated colori fissi per ruolo: usare coloriRuoli(). Resta per compatibilità con la UI di T1. */
export const COLORI = { a: COLORE_GENNA, b: COLORE_LEI } as const;
