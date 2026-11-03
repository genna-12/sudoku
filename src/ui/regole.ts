// Regole di gioco della UI, pure e testate: punti, serie, errori, regali, crescita, giardino,
// storia, scelta delle frasi e allineamento dello storico. I numeri stanno in config/punteggio.ts.
import {
  BONUS_VITTORIA,
  PENALITA_ERRORE,
  PUNTI,
  PUNTI_CRESCITA_PIENA,
  PUNTI_PER_REGALO,
  bonusTempo,
  moltiplicatoreSerie,
} from '../config/punteggio';
import { LIVELLI, valutaMossa } from '../engine';
import type { Griglia, Livello, Modalita, Puzzle, Valutazione } from '../engine';
import { FRASI, SEMINA_SBLOCCATA_A, STORIA_EXTRA, STORIA_SEMINO, VOCE } from '../config/frasi';
import type { ChiParla, FraseConAccessorio } from '../config/frasi';
import { chiaveTappa } from '../stato/archivio';
import type { Contatori, Giocatore, StatoPartita, VoceStorico } from '../stato';

// --- punti -------------------------------------------------------------------

export function contatoriVuoti(): Contatori {
  return { punti: 0, errori: 0, serie: 0, regali: 0, regaliDisponibili: 0, ts: 0 };
}

/** PUNTI[qualità] × moltiplicatore della serie (che include questa cella) + bonus per ogni unità chiusa. */
export function puntiMossa(v: Valutazione, serie: number): number {
  return Math.round(PUNTI[v.qualita] * moltiplicatoreSerie(serie)) + PUNTI.chiusura * v.completate.length;
}

/** Regali guadagnati: uno ogni PUNTI_PER_REGALO punti; mai tolti se i punti scendono. */
export function conRegali(c: Contatori): { contatori: Contatori; nuovi: number } {
  const totali = Math.max(c.regali, Math.floor(c.punti / PUNTI_PER_REGALO));
  const nuovi = totali - c.regali;
  if (!nuovi) return { contatori: c, nuovi: 0 };
  return { contatori: { ...c, regali: totali, regaliDisponibili: c.regaliDisponibili + nuovi }, nuovi };
}

export type Esito =
  | { tipo: 'nessuno' }
  | { tipo: 'errore'; contatori: Contatori; diFila: number }
  | {
      tipo: 'giusta';
      valutazione: Valutazione;
      punti: number;
      contatori: Contatori;
      regaliNuovi: number;
      /** 5, 10, 15… quando la serie raggiunge un multiplo di 5 */
      serieTraguardo: number | null;
    };

/**
 * Esito di un valore scritto in una cella da questo giocatore.
 * Errore = valore ≠ soluzione e diverso da quello che c'era (riscrivere lo stesso sbagliato non conta).
 * `giaContata`: la cella aveva già dato punti in questa partita (annulla/riscrivi non regala punti).
 */
export function esitoMossa(o: {
  puzzle: Puzzle;
  grigliaPrima: Griglia;
  idx: number;
  v: number;
  contatori: Contatori | undefined;
  erroriDiFila: number;
  giaContata: boolean;
  ts: number;
}): Esito {
  const { puzzle, grigliaPrima, idx, v, ts } = o;
  if (!v || puzzle.dati[idx] !== 0 || v === grigliaPrima[idx]) return { tipo: 'nessuno' };
  const c = o.contatori ?? contatoriVuoti();
  if (v !== puzzle.soluzione[idx]) {
    return {
      tipo: 'errore',
      contatori: { ...c, punti: Math.max(0, c.punti - PENALITA_ERRORE), errori: c.errori + 1, serie: 0, ts },
      diFila: o.erroriDiFila + 1,
    };
  }
  if (o.giaContata) return { tipo: 'nessuno' };
  const valutazione = valutaMossa(puzzle, grigliaPrima, idx, v);
  const serie = c.serie + 1;
  const punti = puntiMossa(valutazione, serie);
  const { contatori, nuovi } = conRegali({ ...c, punti: c.punti + punti, serie, ts });
  return { tipo: 'giusta', valutazione, punti, contatori, regaliNuovi: nuovi, serieTraguardo: serie % 5 === 0 ? serie : null };
}

/** Usa un regalo (suggerimento): 0 punti, serie intatta. null se non ce ne sono. */
export function usaRegalo(c: Contatori | undefined, ts: number): Contatori | null {
  if (!c || c.regaliDisponibili <= 0) return null;
  return { ...c, regaliDisponibili: c.regaliDisponibili - 1, ts };
}

export function bonusVittoria(secondi: number): number {
  return BONUS_VITTORIA + bonusTempo(secondi);
}

/** Bonus vittoria aggiunto ai propri contatori (una volta, al passaggio a "finita"). */
export function conBonusVittoria(c: Contatori | undefined, secondi: number, ts: number): Contatori {
  const b = c ?? contatoriVuoti();
  return { ...b, punti: b.punti + bonusVittoria(secondi), ts };
}

// --- crescita ---------------------------------------------------------------

export interface Crescita {
  /** punti di coppia / soglia, 0..1 */
  frazione: number;
  /** quote dei due sulla barra (si affiancano, somma ≤ 1) */
  mia: number;
  sua: number;
  totale: number;
}

export function crescita(s: StatoPartita, mio: Giocatore): Crescita {
  const pm = s.contatori?.[mio]?.punti ?? 0;
  const ps = s.contatori?.[mio === 'a' ? 'b' : 'a']?.punti ?? 0;
  const totale = pm + ps;
  const scala = Math.max(PUNTI_CRESCITA_PIENA, totale);
  return { frazione: Math.min(1, totale / PUNTI_CRESCITA_PIENA), mia: pm / scala, sua: ps / scala, totale };
}

// --- unità chiuse -----------------------------------------------------------

/** Celle delle unità chiuse da una mossa in idx (per l'onda sulla griglia). */
export function celleCompletate(puzzle: Puzzle, idx: number, completate: Valutazione['completate']): number[] {
  const r = Math.floor(idx / 9);
  const c = idx % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  const out = new Set<number>();
  for (const u of completate) {
    if (u === 'riga') for (let k = 0; k < 9; k++) out.add(r * 9 + k);
    if (u === 'colonna') for (let k = 0; k < 9; k++) out.add(k * 9 + c);
    if (u === 'box') for (let k = 0; k < 9; k++) out.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
    if (u === 'gabbia') puzzle.gabbie?.find((g) => g.celle.includes(idx))?.celle.forEach((i) => out.add(i));
  }
  return [...out];
}

// --- giardino ---------------------------------------------------------------

export interface Statistiche {
  fiori: number;
  germogli: number;
  punti: number;
  errori: number;
  migliori: Array<{ modalita: Modalita; livello: Livello; secondi: number }>;
}

export function statistiche(storico: VoceStorico[]): Statistiche {
  let fiori = 0;
  let punti = 0;
  let errori = 0;
  const migliori = new Map<string, number>();
  for (const v of storico) {
    punti += v.punti || 0;
    errori += v.errori || 0;
    if (!v.finita) continue;
    fiori++;
    const k = `${v.modalita}:${v.livello}`;
    const m = migliori.get(k);
    if (v.secondi > 0 && (m === undefined || v.secondi < m)) migliori.set(k, v.secondi);
  }
  const lista: Statistiche['migliori'] = [];
  for (const modalita of ['sudoku', 'killer'] as const)
    for (const livello of LIVELLI) {
      const s = migliori.get(`${modalita}:${livello}`);
      if (s !== undefined) lista.push({ modalita, livello, secondi: s });
    }
  return { fiori, germogli: storico.length - fiori, punti, errori, migliori: lista };
}

export function fioriDi(storico: VoceStorico[]): number {
  return storico.reduce((n, v) => n + (v.finita ? 1 : 0), 0);
}

export function seminaSbloccata(fiori: number): boolean {
  return fiori >= SEMINA_SBLOCCATA_A;
}

export type Tappa = (typeof STORIA_SEMINO)[number] & { chiave: string };

/** Storia completa: STORIA_SEMINO + STORIA_EXTRA, ordinate per numero di fiori. */
export const STORIA: ReadonlyArray<(typeof STORIA_SEMINO)[number]> = [...STORIA_SEMINO, ...STORIA_EXTRA].sort(
  (x, y) => x.partite - y.partite,
);

/**
 * La tappa corrente (la più alta con partite ≤ fiori), se non ancora vista; null altrimenti.
 * Le tappe più vecchie saltate (più fiori arrivati insieme, vittoria seguita subito da "nuova",
 * dispositivo nuovo) non si recuperano: la storia non torna mai indietro (es. Semino "solo" a 4
 * dopo l'arrivo di Semina). Se la tappa corrente è quella di Semina la racconta la scena.
 */
export function tappaDaMostrare(fiori: number, viste: readonly string[]): Tappa | null {
  let scelta: Tappa | null = null;
  for (const t of STORIA) {
    if (t.partite <= fiori && (!scelta || t.partite >= scelta.partite)) scelta = { ...t, chiave: chiaveTappa(t.chi, t.partite) };
  }
  if (!scelta || scelta.chiave === CHIAVE_SBLOCCO || viste.includes(scelta.chiave)) return null;
  return scelta;
}

/** Tappa dell'arrivo di Semina: al suo posto c'è la scena a schermo intero, una volta per dispositivo. */
export const CHIAVE_SBLOCCO = chiaveTappa('semina', SEMINA_SBLOCCATA_A);

export function scenaDaMostrare(fiori: number, viste: readonly string[]): boolean {
  return seminaSbloccata(fiori) && !viste.includes(CHIAVE_SBLOCCO);
}

// --- frasi ------------------------------------------------------------------

export interface Sostituzioni {
  /** nome dell'altro */
  nome: string;
  /** il mio nome */
  io: string;
  n?: number;
}

export function sostituisci(testo: string, s: Sostituzioni): string {
  return testo
    .replaceAll('{nome}', s.nome || 'mini')
    .replaceAll('{io}', s.io || 'mini')
    .replaceAll('{n}', s.n === undefined ? '' : String(s.n));
}

/** Una frase a caso dalla lista, già sostituita e diversa da `ultima` (se possibile). */
export function scegliFrase(lista: readonly string[], ultima: string, s: Sostituzioni, caso: () => number = Math.random): string {
  const tutte = lista.map((t) => sostituisci(t, s));
  const buone = tutte.filter((t) => t !== ultima);
  const da = buone.length ? buone : tutte;
  return da[Math.min(da.length - 1, Math.floor(caso() * da.length))] ?? '';
}

export type CategoriaFrase = keyof typeof FRASI;

/**
 * Frase detta da una mascotte su un evento del suo giocatore: metà delle volte dalla sua VOCE
 * (se ha quella categoria), metà da FRASI. Mai uguale a `ultima` se c'è alternativa.
 */
export function fraseMascotte(
  categoria: CategoriaFrase,
  chi: ChiParla,
  ultima: string,
  s: Sostituzioni,
  caso: () => number = Math.random,
): string {
  const voce = VOCE[chi]?.[categoria]?.map(testoDi);
  const lista = voce && voce.length && caso() < 0.5 ? voce : FRASI[categoria];
  return scegliFrase(lista, ultima, s, caso);
}

/** Chiacchiera a caso del personaggio (stringa vuota se non ne ha). */
export function chiacchiera(chi: ChiParla, ultima: string, s: Sostituzioni, caso: () => number = Math.random): string {
  const lista = (VOCE[chi]?.chiacchiere ?? []).map(testoDi);
  return lista.length ? scegliFrase(lista, ultima, s, caso) : '';
}

/** Testo di una frase che può portare un accessorio (T2b: l'accessorio lo usa la UI). */
export function testoDi(f: FraseConAccessorio): string {
  return typeof f === 'string' ? f : f.testo;
}

/** Accessorio associato a un testo di chiacchiera, se c'è. */
export function accessorioDi(chi: ChiParla, testo: string): string | undefined {
  for (const f of VOCE[chi]?.chiacchiere ?? []) if (typeof f !== 'string' && f.testo === testo) return f.accessorio;
  return undefined;
}

/** Eventi a cui le mascotte reagiscono. */
export type EventoMascotte =
  | 'giusta'
  | 'intelligente'
  | 'brillante'
  | 'chiusura'
  | 'errore'
  | 'erroreSerie'
  | 'regalo'
  | 'vittoria'
  | 'arrivo';

/** Umore della reazione. Semina ha un carattere suo: euforica sulle cose belle, si arrabbia sulle serie di errori. */
export function umoreEvento(chi: ChiParla, e: EventoMascotte): string {
  const lei = chi === 'semina';
  switch (e) {
    case 'giusta':
      return 'felice';
    case 'intelligente':
      return 'sorpreso';
    case 'brillante':
      return lei ? 'euforico' : 'estasiato';
    case 'chiusura':
    case 'vittoria':
      return lei ? 'euforico' : 'festa';
    case 'errore':
      return 'imbarazzato';
    case 'erroreSerie':
      return lei ? 'arrabbiato' : 'preoccupato';
    case 'regalo':
      return 'regalo';
    case 'arrivo':
      return 'saluta';
  }
}

/** Mascotte del giocatore: Semino = 'a', Semina = 'b'. */
export function mascotteDi(g: Giocatore): ChiParla {
  return g === 'a' ? 'semino' : 'semina';
}

// --- allineamento dello storico --------------------------------------------

/** Voci da mandare: quelle con `aggiornata` diversa dall'ultima inviata (o mai inviate). */
export function vociCambiate(storico: VoceStorico[], inviate: ReadonlyMap<string, number>): VoceStorico[] {
  return storico.filter((v) => inviate.get(v.id) !== v.aggiornata);
}

/** Risposta a uno storico ricevuto: le MIE voci più recenti fra quelle che l'altro mi ha mandato. */
export function daRimandare(mio: VoceStorico[], ricevuto: VoceStorico[]): VoceStorico[] {
  const loro = new Map<string, number>();
  for (const v of ricevuto) if (v && typeof v.id === 'string') loro.set(v.id, v.aggiornata);
  return mio.filter((v) => loro.has(v.id) && v.aggiornata > (loro.get(v.id) ?? 0));
}

export function stessoPuzzle(a: StatoPartita | null, b: StatoPartita | null): boolean {
  return (
    !!a &&
    !!b &&
    a.puzzle.modalita === b.puzzle.modalita &&
    a.puzzle.livello === b.puzzle.livello &&
    a.puzzle.seed === b.puzzle.seed
  );
}

/** La partita ha almeno una mossa (o è finita): da lì entra nel giardino. */
export function partitaToccata(s: StatoPartita): boolean {
  return !!s.finita || Object.keys(s.celle).length > 0;
}
