// Gesto "indietro" (Android, swipe di Safari): dentro l'app, mai fuori (T7.7).
// Sopra la voce di base della cronologia ne teniamo sempre UNA in più (la "guardia", stessa URL).
// Indietro toglie la guardia → `popstate`: si chiude l'ultimo foglio aperto o si torna alla Home,
// poi la guardia si rimette. In Home senza niente di aperto indietro non fa niente.
// Niente router: i fogli si registrano qui mentre sono aperti (`useChiudiConIndietro`).
import { useEffect, useRef } from 'react';

export type AzioneIndietro = 'chiudi' | 'home' | 'resta';

/** Macchina a stati pura: cosa fa "indietro" adesso. */
export function azioneIndietro(c: { schermata: string; aperti: number; entrato: boolean; bloccato?: boolean }): AzioneIndietro {
  // dentro un capitolo (lettore) indietro non salta la storia
  if (c.bloccato) return 'resta';
  if (c.aperti > 0) return 'chiudi';
  if (c.schermata === 'home') return 'resta';
  // dall'Ingresso si torna alla Home solo se si è già entrati (da "cambia profilo o frase")
  if (c.schermata === 'ingresso') return c.entrato ? 'home' : 'resta';
  return 'home';
}

/**
 * Esc fa quello che fa "indietro" quando c'è un foglio o un menù aperto: chiude l'ultimo (stessa pila,
 * stessa funzione del tasto chiudi; la guardia nella cronologia resta dov'è). Senza niente di aperto
 * Esc non torna alla Home: in partita toglie la selezione (lo fa la Partita).
 */
export function chiudeConEsc(c: { schermata: string; aperti: number; entrato: boolean; bloccato?: boolean }): boolean {
  return azioneIndietro(c) === 'chiudi';
}

/** Pila dei fogli aperti (l'ultimo aperto si chiude per primo). Pura, senza DOM. */
export class PilaIndietro {
  private voci: Array<{ id: number; chiudi: () => void }> = [];
  private prossimo = 1;
  apri(chiudi: () => void): () => void {
    const id = this.prossimo++;
    this.voci.push({ id, chiudi });
    return () => {
      this.voci = this.voci.filter((v) => v.id !== id);
    };
  }
  get aperti(): number {
    return this.voci.length;
  }
  /** chiude l'ultimo aperto; false se non ce n'erano */
  chiudiUltimo(): boolean {
    const v = this.voci.pop();
    if (!v) return false;
    v.chiudi();
    return true;
  }
}

export const pila = new PilaIndietro();

const GUARDIA = 'sudoku-guardia';
const eGuardia = (s: unknown) => typeof s === 'object' && s !== null && (s as Record<string, unknown>)[GUARDIA] === true;

function mettiGuardia() {
  try {
    if (!eGuardia(history.state)) history.pushState({ ...(history.state ?? {}), [GUARDIA]: true }, '');
  } catch {
    /* Safari limita pushState (100 ogni 10 s) o storia non disponibile: indietro torna normale */
  }
}

/** Finché è aperto, indietro chiude questo foglio (o menù). `chiudi` può cambiare a ogni render. */
export function useChiudiConIndietro(aperto: boolean, chiudi: () => void) {
  const rif = useRef(chiudi);
  useEffect(() => {
    rif.current = chiudi;
  });
  useEffect(() => {
    if (!aperto) return;
    return pila.apri(() => rif.current());
  }, [aperto]);
}

/**
 * In App: la guardia nella cronologia e la risposta a `popstate`. `stato()` dà schermata, ingresso
 * già fatto e lettore aperto (letti al momento del gesto); `home()` torna alla Home.
 */
export function useGestoIndietro(stato: () => { schermata: string; entrato: boolean; bloccato: boolean }, home: () => void) {
  const rif = useRef({ stato, home });
  useEffect(() => {
    rif.current = { stato, home };
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof history === 'undefined' || typeof history.pushState !== 'function') return;
    mettiGuardia();
    function suPop(e: PopStateEvent) {
      // tornati sulla guardia (avanti): niente da fare
      if (eGuardia(e.state)) return;
      const s = rif.current.stato();
      const a = azioneIndietro({ ...s, aperti: pila.aperti });
      if (a === 'chiudi') pila.chiudiUltimo();
      else if (a === 'home') rif.current.home();
      mettiGuardia();
    }
    // Esc: in cattura sulla finestra, prima di tutti gli altri ascoltatori (griglia, capitolo, fogli),
    // così chiude una cosa sola e nessuno la tratta una seconda volta
    function suEsc(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const s = rif.current.stato();
      if (!chiudeConEsc({ ...s, aperti: pila.aperti })) return;
      e.preventDefault();
      e.stopPropagation();
      pila.chiudiUltimo();
    }
    window.addEventListener('popstate', suPop);
    window.addEventListener('keydown', suEsc, true);
    return () => {
      window.removeEventListener('popstate', suPop);
      window.removeEventListener('keydown', suEsc, true);
    };
  }, []);
}
