// I 101 capitoli della storia (fiore 0 → 100). Fonte unica: docs/storia/capitoli.md, da cui
// scripts/storia/controlla.py genera capitoli.json. Qui solo tipi e accesso: mai testi a mano.
import dati from './capitoli.json';
import type { Ambiente } from './ambienti';

export type Luogo = 'aiuola' | 'giardino' | 'mare' | 'montagna' | 'bosco' | 'citta' | 'cucina' | 'lontano';
export type Secondario = 'fischio' | 'pinza' | 'nuvola' | 'nonnacapra' | 'gufo' | 'grillo' | 'briciola' | 'mulo';
export type Voce = 'semino' | 'semina' | 'narra' | Secondario;

/** umore solo per semino/semina */
export interface BattutaCapitolo {
  chi: Voce;
  umore?: string;
  testo: string;
}

export interface Capitolo {
  fiore: number;
  luogo: Luogo;
  titolo: string;
  /** id di accessorio/vestito (T6 ne aggiunge 8) */
  vestiti: Partial<Record<'semino' | 'semina', string>>;
  entra?: Secondario;
  /** ricordo del giardino (T6) */
  elemento?: string;
  /** variante del fondale (es. 'laboratorio'); default = luogo */
  fondale?: string;
  /** momento del giorno e meteo (solo dal capitolo 9; T9 C) */
  ambiente?: Ambiente;
  /** creature di sfondo senza nome e senza voce (id di ambienti.json, al massimo 3; solo dal 9) */
  comparse?: string[];
  /** oggetti in scena (id di ambienti.json, al massimo 3; solo dal 9) */
  oggetti?: string[];
  eco: { chi: 'semino' | 'semina'; testo: string };
  battute: BattutaCapitolo[];
}

/** Forma nel JSON: i campi assenti sono null. */
interface CapitoloGrezzo {
  fiore: number;
  luogo: Luogo;
  titolo: string;
  vestiti: Partial<Record<'semino' | 'semina', string>>;
  entra?: Secondario | null;
  elemento?: string | null;
  fondale?: string | null;
  /** ambiente, comparse e oggetti: assenti nel JSON se il capitolo non li dichiara */
  ambiente?: Ambiente;
  comparse?: string[];
  oggetti?: string[];
  eco: { chi: 'semino' | 'semina'; testo: string };
  battute: Array<{ chi: Voce; umore?: string | null; testo: string }>;
}

/** null → campo assente (undefined nel tipo). */
function normalizza(c: CapitoloGrezzo): Capitolo {
  const out: Capitolo = {
    fiore: c.fiore,
    luogo: c.luogo,
    titolo: c.titolo,
    vestiti: { ...c.vestiti },
    eco: { ...c.eco },
    battute: c.battute.map((b) => (b.umore == null ? { chi: b.chi, testo: b.testo } : { chi: b.chi, umore: b.umore, testo: b.testo })),
  };
  if (c.entra != null) out.entra = c.entra;
  if (c.elemento != null) out.elemento = c.elemento;
  if (c.fondale != null) out.fondale = c.fondale;
  if (c.ambiente != null) {
    out.ambiente = { momento: c.ambiente.momento, meteo: c.ambiente.meteo };
    if (c.ambiente.luce === 'spenta') out.ambiente.luce = 'spenta';
  }
  if (c.comparse?.length) out.comparse = [...c.comparse];
  if (c.oggetti?.length) out.oggetti = [...c.oggetti];
  return out;
}

// il primo elemento del JSON è { _sorgente_sha256, _nota }: si salta
const GREZZI = (dati as unknown as CapitoloGrezzo[]).slice(1);

/** 101 capitoli, ordinati per fiore: `CAPITOLI[n].fiore === n`. */
export const CAPITOLI: readonly Capitolo[] = Object.freeze(GREZZI.map(normalizza));
export const ULTIMO_CAPITOLO = 100;
/** Il capitolo in cui arriva Semina (sostituisce SEMINA_SBLOCCATA_A). */
export const SEMINA_ARRIVA_A = 5;

/** Chiave stabile del capitolo visto: non cambiarla mai. */
export function chiaveCapitolo(fiore: number): string {
  return `capitolo-${fiore}`;
}

export function capitolo(fiore: number): Capitolo | undefined {
  return Number.isInteger(fiore) && fiore >= 0 ? CAPITOLI[fiore] : undefined;
}
