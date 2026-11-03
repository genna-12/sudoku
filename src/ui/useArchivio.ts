import { useCallback, useEffect, useRef, useState } from 'react';
import { carica, salva } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';

const RITARDO_SALVA_MS = 300;

/**
 * L'archivio locale come stato React: caricato una volta, salvato con debounce a ogni cambio
 * (e subito quando la pagina va in background). `ref.current` è sempre l'ultima versione,
 * anche dentro i gestori dei messaggi di rete.
 */
export function useArchivio() {
  const [archivio, setArchivio] = useState<Archivio>(carica);
  const ref = useRef(archivio);
  const timer = useRef(0);

  const salvaOra = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
    salva(ref.current);
  }, []);

  /** Unico modo di cambiare l'archivio: `fn` riceve l'ultima versione; stesso oggetto = nessun cambio. */
  const modifica = useCallback((fn: (a: Archivio) => Archivio) => {
    const prima = ref.current;
    let dopo: Archivio;
    try {
      dopo = fn(prima);
    } catch (e) {
      console.error('[archivio] modifica fallita', e);
      return prima;
    }
    if (dopo === prima) return prima;
    ref.current = dopo;
    setArchivio(dopo);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(salvaOra, RITARDO_SALVA_MS);
    return dopo;
  }, [salvaOra]);

  useEffect(() => {
    const via = () => {
      if (document.visibilityState === 'hidden' && timer.current) salvaOra();
    };
    const chiusura = () => timer.current && salvaOra();
    document.addEventListener('visibilitychange', via);
    window.addEventListener('pagehide', chiusura);
    return () => {
      document.removeEventListener('visibilitychange', via);
      window.removeEventListener('pagehide', chiusura);
      if (timer.current) salvaOra();
    };
  }, [salvaOra]);

  return { archivio, ref, modifica };
}
