import { useCallback, useEffect, useRef, useState } from 'react';
import { CARATTERE } from '../config/frasi';
import { SECONDI_PRIMA_DI_DORMIRE, dormePerOrario } from '../config/sonno';
import { MEMORIA_FRASI, attenuaUmore, ricorda } from './regole';
import type { ChiParla } from '../config/frasi';
import { ACCESSORI, ACCESSORI_DI, SEMINO_UMORI } from './Semino';
import type { Accessorio, SeminoUmore } from './Semino';

/** Umori chiesti dalle regole che il componente potrebbe non avere ancora (fallback). */
const RIPIEGO: Record<string, SeminoUmore> = { arrabbiato: 'preoccupato', euforico: 'felice' };

export function umoreValido(u: string): SeminoUmore {
  if ((SEMINO_UMORI as readonly string[]).includes(u)) return u as SeminoUmore;
  return RIPIEGO[u] ?? 'neutro';
}

/** Accessorio dai dati (frasi, storia): undefined se il componente non lo conosce. */
export function accessorioValido(a: string | undefined): Accessorio | undefined {
  return a && (ACCESSORI as readonly string[]).includes(a) ? (a as Accessorio) : undefined;
}

/** Chi indossa un accessorio di una frase detta "in due": il personaggio di cui è lo stile. */
export function chiIndossa(a: Accessorio, preferito: ChiParla | 'entrambi'): ChiParla {
  if (preferito !== 'entrambi') return preferito;
  return ACCESSORI_DI.semina.includes(a) ? 'semina' : 'semino';
}

/** Accessori indossati in questo momento, per personaggio. */
export type Indossati = Partial<Record<ChiParla, Accessorio>>;

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
/** svegliata nelle sue ore di sonno: resta sveglia un po' di più, poi si riaddormenta */
const DURATA_RISVEGLIO_MS = 6000;
const CONTROLLO_SONNO_MS = 5000;

/**
 * Umore di riposo: addormentata nelle sue ore (orario locale) o dopo SECONDI_PRIMA_DI_DORMIRE senza
 * attività; altrimenti il carattere di base.
 */
export function umoreRiposo(chi: ChiParla, ora: number, ultimaAttivita: number): SeminoUmore {
  if (dormePerOrario(chi, new Date(ora))) return 'dorme';
  if (ora - ultimaAttivita >= SECONDI_PRIMA_DI_DORMIRE * 1000) return 'dorme';
  return umoreBase(chi);
}

/**
 * Umore delle due mascotte: una reazione dura poco, poi si torna al riposo (carattere di base, o
 * sonno). Ogni reazione "vera" e ogni `sveglia()` (mosse, tocchi) contano come attività.
 */
export function useMascotte() {
  const attivita = useRef(Date.now());
  const [stati, setStati] = useState<Mascotte>(() => ({
    semino: { umore: umoreRiposo('semino', Date.now(), Date.now()), impulso: 0 },
    semina: { umore: umoreRiposo('semina', Date.now(), Date.now()), impulso: 0 },
  }));
  const timer = useRef<Record<ChiParla, number>>({ semino: 0, semina: 0 });

  const riposa = useCallback((chi: ChiParla) => {
    timer.current[chi] = 0;
    const u = umoreRiposo(chi, Date.now(), attivita.current);
    setStati((s) => (s[chi].umore === u ? s : { ...s, [chi]: { umore: u, impulso: s[chi].impulso } }));
  }, []);

  /**
   * `attivita: false` per ciò che non è un'azione dei giocatori (chiacchiere): non sveglia dal
   * sonno per inattività.
   */
  const reagisci = useCallback(
    (chi: ChiParla, umore: string, { attivita: conta = true }: { attivita?: boolean } = {}) => {
      if (conta) {
        attivita.current = Date.now();
        // l'altra mascotte, se dormiva per noia, si sveglia con lei
        for (const altra of ['semino', 'semina'] as const) if (altra !== chi && !timer.current[altra]) riposa(altra);
      }
      const notte = dormePerOrario(chi);
      const u = umoreValido(notte ? attenuaUmore(umore) : umore);
      setStati((s) => ({ ...s, [chi]: { umore: u, impulso: s[chi].impulso + 1 } }));
      window.clearTimeout(timer.current[chi]);
      timer.current[chi] = window.setTimeout(() => riposa(chi), notte ? DURATA_RISVEGLIO_MS : DURATA_REAZIONE_MS);
    },
    [riposa],
  );

  /** Attività senza reazione (una mossa qualunque, mia o del partner): chi dormiva per noia si sveglia. */
  const sveglia = useCallback(() => {
    attivita.current = Date.now();
    for (const chi of ['semino', 'semina'] as const) if (!timer.current[chi]) riposa(chi);
  }, [riposa]);

  // ogni pochi secondi: chi è a riposo si addormenta (noia o orario) o si sveglia (è mattina)
  useEffect(() => {
    const t = window.setInterval(() => {
      for (const chi of ['semino', 'semina'] as const) if (!timer.current[chi]) riposa(chi);
    }, CONTROLLO_SONNO_MS);
    return () => window.clearInterval(t);
  }, [riposa]);

  useEffect(() => {
    const t = timer.current;
    return () => {
      window.clearTimeout(t.semino);
      window.clearTimeout(t.semina);
    };
  }, []);

  return { mascotte: stati, reagisci, sveglia };
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

/**
 * Memoria delle ultime frasi usate per categoria (MEMORIA_FRASI per categoria, le più recenti in
 * fondo): le scelte le evitano. Dura quanto l'app aperta; ci finiscono anche le frasi arrivate
 * dall'altro dispositivo.
 */
export function useUltimeFrasi() {
  const memoria = useRef(new Map<string, string[]>());
  const ultime = useCallback((categoria: string): readonly string[] => memoria.current.get(categoria) ?? [], []);
  const ricordaFrase = useCallback((categoria: string, testo: string) => {
    if (!testo) return;
    memoria.current.set(categoria, ricorda(memoria.current.get(categoria) ?? [], testo, MEMORIA_FRASI));
  }, []);
  return { ultime, ricorda: ricordaFrase };
}
