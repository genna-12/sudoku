// Suggerimenti una tantum sui gesti nascosti (T7.3): ognuno compare una volta per dispositivo, la
// prima volta che serve, e al massimo uno per sessione. Logica pura; App li mostra nel fumetto.

export type Suggerimento = 'note' | 'semino' | 'faro';
/** cosa è appena successo: tocco sul tastierino, ingresso in Home, selezione di una cella con un numero */
export type EventoSuggerimento = 'tastierino' | 'home' | 'cella-piena';

export const CHIAVE_SUGGERIMENTI = 'sudoku-suggerimenti';
/** mosse mie nella partita prima del suggerimento sulle note */
export const MOSSE_PER_NOTE = 10;

export const TESTI_SUGGERIMENTI: Record<Suggerimento, string> = {
  note: 'Tieni premuto un numero: lo scrivo a matita, come nota',
  semino: 'Puoi toccarmi, eh. Ogni tanto rispondo',
  faro: 'Tocca due volte una cella piena: accendo tutti i numeri uguali',
};

/**
 * Il suggerimento da mostrare adesso, o null. `visti`: quelli già mostrati su questo dispositivo;
 * `giaInSessione`: in questa sessione ne è già uscito uno.
 */
export function suggerimentoDa(
  evento: EventoSuggerimento,
  c: { mosse: number; fiori: number },
  visti: readonly string[],
  giaInSessione: boolean,
): Suggerimento | null {
  if (giaInSessione) return null;
  const s: Suggerimento | null =
    evento === 'tastierino' && c.mosse >= MOSSE_PER_NOTE
      ? 'note'
      : evento === 'home' && c.fiori >= 1
        ? 'semino'
        : evento === 'cella-piena'
          ? 'faro'
          : null;
  return s && !visti.includes(s) ? s : null;
}

/** Lista salvata → solo i nomi noti (dati corrotti o di altre versioni si ignorano). */
export function suggerimentiVisti(x: unknown): Suggerimento[] {
  if (!Array.isArray(x)) return [];
  return x.filter((s): s is Suggerimento => s === 'note' || s === 'semino' || s === 'faro');
}
