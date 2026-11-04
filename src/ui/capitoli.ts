// Regole dei capitoli della storia (puro TS, niente React): coda da leggere, visti per giocatore,
// arrivo di Semina, eco in Home, regali. I fiori sono della coppia, i visti del giocatore (ruolo).
import { CAPITOLI, SEMINA_ARRIVA_A, capitolo, chiaveCapitolo } from '../config/capitoli';
import type { Capitolo } from '../config/capitoli';
import { ATTI, elementiSbloccati } from '../config/luoghi';
import { normalizzaPrefisso, unisciVisti } from '../stato/archivio';
import { presenzaBlu } from './regole';

export { ATTI, normalizzaPrefisso, unisciVisti };

export type Ruolo = 'a' | 'b';
/** Per ruolo, sempre un prefisso `capitolo-0..k` (la coda è ordinata e si segna un capitolo alla volta). */
export type CapitoliVisti = Record<Ruolo, string[]>;

/** Capitoli che danno +1 suggerimento a chi li legge fino in fondo (gli stessi fiori dei regali di T3). */
export const REGALI_A_CAPITOLO: readonly number[] = [1, 5, 10, 18, 25, 35, 60];

export function vistiDi(visti: CapitoliVisti, ruolo: Ruolo): string[] {
  return visti[ruolo] ?? [];
}

/** Capitoli da leggere: tutti quelli con `fiore <= fiori` non ancora visti, in ordine crescente. */
export function codaCapitoli(fiori: number, visti: readonly string[]): Capitolo[] {
  const v = new Set(visti);
  return CAPITOLI.filter((c) => c.fiore <= fiori && !v.has(chiaveCapitolo(c.fiore)));
}

/**
 * Segna visto il capitolo `fiore` per `ruolo` (alla fine della lettura, non all'apertura).
 * Tiene solo il prefisso contiguo: un capitolo oltre il primo non visto si scarta. Stesso oggetto se non cambia.
 */
export function segnaVisto(visti: CapitoliVisti, ruolo: Ruolo, fiore: number): CapitoliVisti {
  const prima = vistiDi(visti, ruolo);
  const dopo = normalizzaPrefisso([...prima, chiaveCapitolo(fiore)]);
  return dopo.length === prima.length && dopo.every((k, i) => k === prima[i]) ? visti : { ...visti, [ruolo]: dopo };
}

/** Fiore del capitolo visto più alto (-1 se nessuno). */
export function maxVisto(visti: readonly string[]): number {
  let max = -1;
  for (const k of visti) {
    const m = /^capitolo-(\d+)$/.exec(k);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

/** Semina c'è su questo dispositivo solo dopo aver letto il suo capitolo (il 5). */
export function seminaSbloccata(fiori: number, visti: readonly string[]): boolean {
  return fiori >= SEMINA_ARRIVA_A && visti.includes(chiaveCapitolo(SEMINA_ARRIVA_A));
}

/** Il giardino che si vede (Scena): gli elementi e quanto blu c'è negli accenti di coppia (0..1). */
export interface GiardinoVisibile {
  elementi: string[];
  bluPresenza: number;
}

/**
 * Il giardino su questo dispositivo (Home, Giardino, Vittoria, `--blu-presenza` dell'app): finché il
 * capitolo 5 non è visto da chi tiene il telefono niente tracce di Semina (né il tulipano `semina`, né
 * il blu oltre quello dell'ultimo capitolo letto, al massimo quello del 4). Gli altri elementi sono i
 * ricordi dei capitoli letti (config/luoghi.ts), mai oltre i fiori (dopo un "ricomincia").
 */
export function giardinoVisibile(fiori: number, visti: readonly string[]): GiardinoVisibile {
  const elementi = elementiSbloccati(Math.min(fiori, maxVisto(visti)));
  if (seminaSbloccata(fiori, visti)) return { elementi, bluPresenza: presenzaBlu(fiori, true) };
  const letti = Math.max(0, Math.min(fiori, maxVisto(visti), SEMINA_ARRIVA_A - 1));
  return { elementi: elementi.filter((e) => e !== 'semina'), bluPresenza: presenzaBlu(letti, false) };
}

/**
 * Il giardino nel lettore (fondale di aiuola e giardino): com'era a quel capitolo (fiori del capitolo,
 * non oltre i fiori di adesso); il tulipano e il blu pieno solo dopo il 5, così i capitoli 0-5 riletti restano senza di lei.
 */
export function giardinoDelCapitolo(fiore: number, fiori: number): GiardinoVisibile {
  const f = Math.max(0, Math.min(fiori, fiore));
  const dopoDiLei = fiore > SEMINA_ARRIVA_A;
  const elementi = elementiSbloccati(f).filter((e) => e !== 'semina' || dopoDiLei);
  return { elementi, bluPresenza: presenzaBlu(dopoDiLei ? f : Math.min(f, SEMINA_ARRIVA_A - 1), dopoDiLei) };
}

export function chiaveEco(fiore: number): string {
  return `eco-${fiore}`;
}

export interface EcoDaMostrare {
  fiore: number;
  chiave: string;
  chi: 'semino' | 'semina';
  testo: string;
}

/** L'eco dell'ultimo capitolo visto, se non è ancora stata mostrata (una volta, entrando in Home). */
export function ecoDaMostrare(visti: readonly string[], ecoViste: readonly string[]): EcoDaMostrare | null {
  const c = capitolo(maxVisto(visti));
  if (!c || ecoViste.includes(chiaveEco(c.fiore))) return null;
  return { fiore: c.fiore, chiave: chiaveEco(c.fiore), chi: c.eco.chi, testo: c.eco.testo };
}

/** Quanti capitoli-regalo sono nuovi in `dopo` rispetto a `prima` (visti dello stesso ruolo, `prima` già unito col remoto). */
export function regaliNuovi(prima: readonly string[], dopo: readonly string[]): number {
  const p = new Set(prima);
  const d = new Set(dopo);
  return REGALI_A_CAPITOLO.filter((f) => d.has(chiaveCapitolo(f)) && !p.has(chiaveCapitolo(f))).length;
}

/** Le eco dei capitoli visti che dice `chi` (entrano nel pool delle chiacchiere con peso basso). */
export function ecoDi(visti: readonly string[], chi: 'semino' | 'semina'): string[] {
  const v = new Set(visti);
  return CAPITOLI.filter((c) => v.has(chiaveCapitolo(c.fiore)) && c.eco.chi === chi).map((c) => c.eco.testo);
}

export interface AttoDiario {
  nome: string;
  capitoli: Array<{ fiore: number; titolo: string }>;
}

/** Il diario: i capitoli visti, in ordine, raggruppati per atto (gli atti senza capitoli letti non ci sono). */
export function diario(visti: readonly string[]): AttoDiario[] {
  const v = new Set(visti);
  const out: AttoDiario[] = [];
  ATTI.forEach((atto, i) => {
    const fino = i + 1 < ATTI.length ? ATTI[i + 1].da : Infinity;
    const capitoli = CAPITOLI.filter((c) => c.fiore >= atto.da && c.fiore < fino && v.has(chiaveCapitolo(c.fiore))).map((c) => ({
      fiore: c.fiore,
      titolo: c.titolo,
    }));
    if (capitoli.length) out.push({ nome: atto.nome, capitoli });
  });
  return out;
}
