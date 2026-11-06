// Il velo dietro un foglio o un menù: toccarlo fuori chiude (H2, revisione UI 06/11).
import type { MouseEvent, PointerEvent } from 'react';

/** veli su cui è cominciata la pressione (il velo stesso, non un figlio) */
const premuti = new WeakSet<EventTarget>();

/**
 * Props per il velo: chiude sul `click`, non sul `pointerdown`. Con il tocco il browser manda il click
 * dopo il pointerup: se il velo sparisse già al pointerdown, quel click cadrebbe sul bottone che sta
 * sotto (si apriva il Giardino chiudendo la Posta). Così il click lo consuma il velo stesso.
 * Si chiude solo se pressione e rilascio sono tutti e due sul velo: trascinare fuori da un campo
 * del foglio (selezionando il testo) non lo chiude.
 */
export function chiudiToccandoFuori(chiudi: () => void) {
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.target === e.currentTarget) premuti.add(e.currentTarget);
      else premuti.delete(e.currentTarget);
    },
    onClick(e: MouseEvent<HTMLElement>) {
      const valido = e.target === e.currentTarget && premuti.has(e.currentTarget);
      premuti.delete(e.currentTarget);
      if (valido) chiudi();
    },
  };
}
