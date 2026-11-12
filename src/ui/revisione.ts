// Regole della stanza di revisione (puro TS): il controllo della frase e lo stato "dopo il capitolo N".
// Niente scritture: tutto si deriva dal numero del capitolo, come se fiori = N e visti = capitoli 0..N.
import { HASH_REVISIONE } from '../config/revisione';
import { CAPITOLI, capitolo, chiaveCapitolo } from '../config/capitoli';
import type { Capitolo } from '../config/capitoli';
import { normalizzaFrase } from '../net/logica';
import { diario, giardinoVisibile, seminaSbloccata } from './capitoli';
import type { AttoDiario, GiardinoVisibile } from './capitoli';
import { vestitiIniziali } from './regole';
import type { VestitiRiposo } from './regole';

export const ULTIMO_CAPITOLO = CAPITOLI[CAPITOLI.length - 1].fiore;

/** sha256 (hex) della frase normalizzata come per la stanza; null senza crypto.subtle. */
export async function hashFrase(frase: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const h = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(normalizzaFrase(frase))));
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** La frase apre la revisione? `atteso` si inietta nei test (mai la frase vera nei file). */
export async function apreRevisione(frase: string, atteso: string = HASH_REVISIONE): Promise<boolean> {
  if (normalizzaFrase(frase).length < 4) return false;
  try {
    return (await hashFrase(frase)) === atteso;
  } catch {
    return false;
  }
}

/** I capitoli 0..n come chiavi dei visti (n < 0: nessuno). */
export function vistiFino(n: number): string[] {
  return CAPITOLI.filter((c) => c.fiore <= n).map((c) => chiaveCapitolo(c.fiore));
}

/** Il blu degli accenti mentre si legge il capitolo n appena vinto (fiori = n, letti fino a n-1), come in App. */
export function bluMentreLeggi(n: number): number {
  return giardinoVisibile(n, vistiFino(n - 1)).bluPresenza;
}

export interface DopoCapitolo {
  capitolo: Capitolo;
  fiori: number;
  visti: string[];
  sbloccata: boolean;
  giardino: GiardinoVisibile;
  /** i vestiti con cui si entra in Home (quelli dell'ultimo capitolo letto) */
  vestiti: VestitiRiposo;
  /** l'eco detta entrando in Home (prima di Semina solo quelle di Semino) */
  eco: { chi: 'semino' | 'semina'; testo: string } | null;
  diario: AttoDiario[];
  stadio: number;
}

/** Home e Giardino come appaiono dopo aver letto il capitolo n (n fiori, capitoli 0..n letti). */
export function dopoCapitolo(n: number): DopoCapitolo | null {
  const c = capitolo(n);
  if (!c) return null;
  const visti = vistiFino(n);
  const sbloccata = seminaSbloccata(n, visti);
  return {
    capitolo: c,
    fiori: n,
    visti,
    sbloccata,
    giardino: giardinoVisibile(n, visti),
    vestiti: vestitiIniziali({ visti, sbloccata, giorno: null }),
    eco: c.eco.chi === 'semino' || sbloccata ? { ...c.eco } : null,
    diario: diario(visti),
    stadio: Math.min(4, n),
  };
}
