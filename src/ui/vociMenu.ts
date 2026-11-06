// Le voci del menù unico (T7.7) e la tastiera dentro il menù: pure, fuori dal componente.
import type { KeyboardEvent as KeyboardEventReact } from 'react';

/** Dove si apre il menù: le voci cambiano (T7.7, un solo pannello). */
export type ContestoMenu = 'home' | 'partita';

/** Le sezioni del menù per contesto, in ordine (pura: la usano il componente e i test). */
export function vociMenu(contesto: ContestoMenu, c: { inCorso: boolean }): Array<'torna' | 'impostazioni' | 'memoria' | 'cancella' | 'ricomincia' | 'diagnostica'> {
  const cancella = c.inCorso ? (['cancella'] as const) : [];
  if (contesto === 'partita') return ['torna', 'impostazioni', ...cancella, 'diagnostica'];
  return ['impostazioni', 'memoria', ...cancella, 'ricomincia', 'diagnostica'];
}

const VOCI = '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])';

/** Frecce su/giù, Inizio e Fine spostano il focus tra le voci del menù (giro in tondo). */
export function muoviNelMenu(e: KeyboardEventReact<HTMLElement>) {
  const verso = { ArrowDown: 1, ArrowUp: -1, Home: 0, End: 0 }[e.key as 'ArrowDown'];
  if (verso === undefined) return;
  const voci = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(VOCI));
  if (!voci.length) return;
  e.preventDefault();
  e.stopPropagation();
  const i = voci.indexOf(document.activeElement as HTMLElement);
  const prossimo =
    e.key === 'Home' ? 0 : e.key === 'End' ? voci.length - 1 : i < 0 ? (verso > 0 ? 0 : voci.length - 1) : (i + verso + voci.length) % voci.length;
  voci[prossimo].focus();
}
