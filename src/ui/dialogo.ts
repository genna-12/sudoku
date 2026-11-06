// Focus dei fogli e dei menù (T7.6): all'apertura il focus entra nel dialogo, Tab gira solo lì
// dentro, alla chiusura torna a chi l'aveva aperto (o a un bottone di riserva, se quello non c'è più).
// Esc non sta qui: lo gestisce `useGestoIndietro` con la stessa pila del gesto indietro.
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCALIZZABILI =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]):not(.nascosto), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Gli elementi raggiungibili con Tab dentro `radice`, in ordine. */
export function focalizzabili(radice: HTMLElement): HTMLElement[] {
  return Array.from(radice.querySelectorAll<HTMLElement>(FOCALIZZABILI)).filter((e) => !e.closest('[inert]'));
}

/** Dove rimettere il focus alla chiusura: chi ha aperto, se c'è ancora ed è usabile; se no la riserva. */
export function ritornoFocus(apritore: Element | null, riserva: HTMLElement | null | undefined): HTMLElement | null {
  const usabile = (e: Element | null | undefined): e is HTMLElement =>
    !!e && e instanceof HTMLElement && e.isConnected && e !== document.body && !e.closest('[inert]');
  if (usabile(apritore)) return apritore;
  if (usabile(riserva)) return riserva;
  return null;
}

// l'ultimo elemento che ha perso il focus: se un campo con autoFocus l'ha già preso dentro il dialogo,
// chi ha aperto è lui
let precedente: Element | null = null;
let ascolto = false;
function ascoltaFocus() {
  if (ascolto || typeof document === 'undefined') return;
  ascolto = true;
  document.addEventListener('focusout', (e) => (precedente = e.target as Element), true);
}

interface Opzioni {
  /** dove va il focus all'apertura (se no: chi ha già il focus dentro, poi il primo focalizzabile, poi il dialogo) */
  iniziale?: RefObject<HTMLElement | null>;
  /** dove torna il focus se chi ha aperto non c'è più (es. la voce di un menù già chiuso) */
  riserva?: RefObject<HTMLElement | null>;
}

/**
 * Da chiamare nel componente del dialogo (o col flag `attivo` se il dialogo è un pezzo condizionale).
 * `rif` è il contenitore con role=dialog/alertdialog/menu.
 */
export function useDialogo(rif: RefObject<HTMLElement | null>, attivo = true, opz: Opzioni = {}) {
  const opzRif = useRef(opz);
  useEffect(() => {
    opzRif.current = opz;
  });
  ascoltaFocus();
  useEffect(() => {
    if (!attivo) return;
    const el = rif.current;
    if (!el) return;
    const dentro = el.contains(document.activeElement);
    const apritore = dentro ? precedente : document.activeElement;
    // l'autoFocus di un campo dentro il dialogo vince
    if (!dentro) {
      const dove = opzRif.current.iniziale?.current ?? focalizzabili(el)[0] ?? el;
      if (dove === el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      dove.focus({ preventScroll: true });
    }
    function tab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !el) return;
      const tutti = focalizzabili(el);
      if (!tutti.length) {
        e.preventDefault();
        return;
      }
      const primo = tutti[0];
      const ultimo = tutti[tutti.length - 1];
      const att = document.activeElement;
      if (e.shiftKey && (att === primo || !el.contains(att))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (att === ultimo || !el.contains(att))) {
        e.preventDefault();
        primo.focus();
      }
    }
    el.addEventListener('keydown', tab);
    return () => {
      el.removeEventListener('keydown', tab);
      // il focus torna solo se è rimasto dentro il dialogo o si è perso (non lo si ruba a chi l'ha preso)
      const att = document.activeElement;
      if (att && att !== document.body && att.isConnected && !el.contains(att)) return;
      ritornoFocus(apritore, opzRif.current.riserva?.current)?.focus({ preventScroll: true });
    };
  }, [attivo, rif]);
}
