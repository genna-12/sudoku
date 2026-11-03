import { useCallback, useEffect, useRef, useState } from 'react';
import { CARATTERE } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { SEMINO_UMORI } from './Semino';
import type { SeminoUmore } from './Semino';

/** Umori chiesti dalle regole che il componente potrebbe non avere ancora (fallback). */
const RIPIEGO: Record<string, SeminoUmore> = { arrabbiato: 'preoccupato', euforico: 'felice' };

export function umoreValido(u: string): SeminoUmore {
  if ((SEMINO_UMORI as readonly string[]).includes(u)) return u as SeminoUmore;
  return RIPIEGO[u] ?? 'neutro';
}

export function umoreBase(chi: ChiParla): SeminoUmore {
  return umoreValido(CARATTERE[chi]?.umoreBase ?? 'neutro');
}

export interface StatoMascotte {
  umore: SeminoUmore;
  /** cambia a ogni reazione (riavvia l'animazione anche con lo stesso umore) */
  impulso: number;
}
export type Mascotte = Record<ChiParla, StatoMascotte>;

const DURATA_REAZIONE_MS = 1800;

/** Umore delle due mascotte: una reazione dura poco, poi si torna al carattere di base. */
export function useMascotte() {
  const [stati, setStati] = useState<Mascotte>(() => ({
    semino: { umore: umoreBase('semino'), impulso: 0 },
    semina: { umore: umoreBase('semina'), impulso: 0 },
  }));
  const timer = useRef<Record<ChiParla, number>>({ semino: 0, semina: 0 });

  const reagisci = useCallback((chi: ChiParla, umore: string) => {
    const u = umoreValido(umore);
    setStati((s) => ({ ...s, [chi]: { umore: u, impulso: s[chi].impulso + 1 } }));
    window.clearTimeout(timer.current[chi]);
    timer.current[chi] = window.setTimeout(() => {
      setStati((s) => ({ ...s, [chi]: { umore: umoreBase(chi), impulso: s[chi].impulso } }));
    }, DURATA_REAZIONE_MS);
  }, []);

  useEffect(() => {
    const t = timer.current;
    return () => {
      window.clearTimeout(t.semino);
      window.clearTimeout(t.semina);
    };
  }, []);

  return { mascotte: stati, reagisci };
}

/**
 * Ogni 40–60 s chiama `genera` (che decide se dire davvero qualcosa) finché `attivo`.
 * Il ritmo è casuale per non far parlare i due dispositivi nello stesso istante.
 */
export function useOgniTanto(attivo: boolean, genera: () => void) {
  const ref = useRef(genera);
  useEffect(() => {
    ref.current = genera;
  });
  useEffect(() => {
    if (!attivo) return;
    let t = 0;
    const prossimo = () => {
      t = window.setTimeout(
        () => {
          ref.current();
          prossimo();
        },
        40000 + Math.random() * 20000,
      );
    };
    prossimo();
    return () => window.clearTimeout(t);
  }, [attivo]);
}
