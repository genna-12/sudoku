// Accessibilità delle celle della griglia (T7.6): roving tabindex ed etichetta per i lettori di schermo.

/** Roving tabindex: l'unica cella raggiungibile con Tab è la selezionata (o quella centrale). */
export const CELLA_INIZIALE = 40;
export function cellaConFocus(selezionata: number | null): number {
  return selezionata ?? CELLA_INIZIALE;
}

/** Etichetta per i lettori di schermo: "riga 3, colonna 7, 5, di Blu" / "vuota, note 1 4". */
export function etichettaCella(c: {
  r: number;
  c: number;
  v: number;
  data: boolean;
  errore: boolean;
  note: number[];
  mia: boolean | null;
  nomePartner?: string;
  somma?: number;
}): string {
  const chi = c.mia === null ? '' : c.mia ? ', tuo' : `, di ${c.nomePartner || 'chi gioca con te'}`;
  const cosa = c.data
    ? `${c.v}, dato`
    : c.v
      ? `${c.v}${chi}${c.errore ? ', sbagliato' : ''}`
      : c.note.length
        ? `vuota, note ${c.note.join(' ')}`
        : 'vuota';
  return `riga ${c.r + 1}, colonna ${c.c + 1}, ${cosa}${c.somma ? `, gabbia da ${c.somma}` : ''}`;
}
