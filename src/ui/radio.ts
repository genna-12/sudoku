// Gruppi di radio (modalità e livello in Home, H14): una sola fermata di Tab, le frecce cambiano la scelta.
import type { KeyboardEvent } from 'react';

/** L'indice dopo una freccia (in tondo), Inizio o Fine; null per gli altri tasti. */
export function frecciaRadio(tasto: string, i: number, n: number): number | null {
  if (n <= 0) return null;
  switch (tasto) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (i + 1) % n;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (i - 1 + n) % n;
    case 'Home':
      return 0;
    case 'End':
      return n - 1;
    default:
      return null;
  }
}

/** onKeyDown del radiogroup: sceglie il valore vicino e gli porta il focus (tabindex mobile). */
export function tastieraRadio<T>(valori: readonly T[], attuale: T, scegli: (v: T) => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const j = frecciaRadio(e.key, Math.max(0, valori.indexOf(attuale)), valori.length);
    if (j === null) return;
    e.preventDefault();
    scegli(valori[j]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[j]?.focus();
  };
}
