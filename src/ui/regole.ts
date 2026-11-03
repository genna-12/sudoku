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
import { FRASI, FRASI_EXTRA, SEMINA_SBLOCCATA_A, SONNO, VOCE, VOCE_SUGGERIMENTO } from '../config/frasi';
import { GIORNI_SPECIALI, SBLOCCHI, SORPRESE, STORIA as STORIA_COMPLETA, chiaveDi } from '../config/storia';
import type { Battuta, GiornoSpeciale, Sblocco, Tappa as TappaStoria } from '../config/storia';
import { ORARI_SONNO, dormePerOrario, seminaDormeTardiOggi } from '../config/sonno';
import type { ChiParla, FraseConAccessorio } from '../config/frasi';
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

/**
 * Quanto blu c'è negli accenti di coppia (0..1): cresce con i fiori verso lo sblocco, poi 1 fisso
 * (= metà e metà). Diventa la variabile CSS `--blu-presenza`.
 */
export function presenzaBlu(fiori: number, sbloccata: boolean): number {
  if (sbloccata) return 1;
  return Math.max(0, Math.min(fiori / SEMINA_SBLOCCATA_A, 1));
}

/** Voce del giardino con la quota di petali blu salvata a fine partita (campo extra, sopravvive a migra e merge). */
export type VoceGiardino = VoceStorico & { quotaBlu?: number };

/** Punti di Blu (ruolo 'b') sul totale della partita; 0.5 se nessuno ha punti. */
export function quotaBluPartita(s: StatoPartita): number {
  const a = Math.max(0, s.contatori?.a?.punti ?? 0);
  const b = Math.max(0, s.contatori?.b?.punti ?? 0);
  return a + b > 0 ? b / (a + b) : 0.5;
}

/**
 * Dopo `aggiornaStorico` su una partita finita: scrive nella sua voce `quotaBlu` (dai contatori dello
 * stato completo). Stesso archivio se non cambia nulla.
 */
export function conQuotaBlu<A extends { storico: VoceStorico[] }>(a: A, s: StatoPartita): A {
  if (!s.finita) return a;
  const id = `${s.puzzle.modalita}-${s.puzzle.seed}`;
  const q = quotaBluPartita(s);
  let cambiato = false;
  const storico = a.storico.map((v) => {
    if (v.id !== id || !v.finita || (v as VoceGiardino).quotaBlu === q) return v;
    cambiato = true;
    return { ...v, quotaBlu: q } as VoceGiardino;
  });
  return cambiato ? { ...a, storico } : a;
}

/** Numero d'ordine di ogni fiore (1 = il primo finito), per data di fine crescente. */
export function numeriFiori(storico: readonly VoceStorico[]): Map<string, number> {
  const fiori = storico.filter((v) => v.finita).sort((x, y) => (x.finita ?? 0) - (y.finita ?? 0) || (x.id < y.id ? -1 : 1));
  return new Map(fiori.map((v, i) => [v.id, i + 1]));
}

/**
 * Frazione di petali blu di un fiore (null per i germogli). I primi SEMINA_SBLOCCATA_A fiori seguono
 * la progressione verso Semina (1 = tutto verde … 5 = metà e metà) e restano così; dal successivo
 * conta chi ha fatto più punti in quella partita (`quotaBlu` salvata a fine partita; 0.5 se manca).
 * Prima che Semina sia arrivata su questo dispositivo, nessun fiore va oltre la metà.
 */
export function quotaBluFiore(voce: VoceGiardino, n: number, sbloccata: boolean): number | null {
  if (!voce.finita) return null;
  const k = SEMINA_SBLOCCATA_A;
  if (n <= k) return k > 1 ? ((Math.max(1, n) - 1) / (k - 1)) * 0.5 : 0.5;
  if (!sbloccata) return 0.5;
  const q = voce.quotaBlu;
  return typeof q === 'number' && Number.isFinite(q) ? Math.max(0, Math.min(1, q)) : 0.5;
}

export type Tappa = TappaStoria & { chiave: string };

/** Storia completa (config/storia.ts), ordinata per numero di fiori. */
export const STORIA: ReadonlyArray<TappaStoria> = [...STORIA_COMPLETA].sort((x, y) => x.partite - y.partite);

/**
 * La tappa corrente (la più alta con partite ≤ fiori), se non ancora vista; null altrimenti.
 * Le tappe più vecchie saltate (più fiori arrivati insieme, vittoria seguita subito da "nuova",
 * dispositivo nuovo) non si recuperano: la storia non torna mai indietro (es. Semino "solo" a 4
 * dopo l'arrivo di Semina). Se la tappa corrente è quella di Semina la racconta la scena.
 */
export function tappaDaMostrare(fiori: number, viste: readonly string[]): Tappa | null {
  let scelta: Tappa | null = null;
  for (const t of STORIA) {
    if (t.partite <= fiori && (!scelta || t.partite >= scelta.partite)) scelta = { ...t, chiave: chiaveDi(t) };
  }
  if (!scelta || scelta.chiave === CHIAVE_SBLOCCO || viste.includes(scelta.chiave)) return null;
  return scelta;
}

/** Tappa dell'arrivo di Semina: al suo posto c'è la scena a schermo intero, una volta per dispositivo. */
export const CHIAVE_SBLOCCO = chiaveDi({ chi: 'semina', partite: SEMINA_SBLOCCATA_A });

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
  /** il mio nome vero (Genna / Mati), per le mascotte che parlano di voi */
  reale?: string;
  /** il nome vero dell'altro */
  realePartner?: string;
}

export function sostituisci(testo: string, s: Sostituzioni): string {
  return testo
    .replaceAll('{realePartner}', s.realePartner || s.nome || 'mini')
    .replaceAll('{reale}', s.reale || s.io || 'mini')
    .replaceAll('{nome}', s.nome || 'mini')
    .replaceAll('{io}', s.io || 'mini')
    .replaceAll('{n}', s.n === undefined ? '' : String(s.n));
}

/** Quante frasi recenti si evitano per categoria. */
export const MEMORIA_FRASI = 8;

/** Aggiunge `testo` in coda alle ultime usate, tenendone al massimo `n`. */
export function ricorda(ultime: readonly string[], testo: string, n: number = MEMORIA_FRASI): string[] {
  if (!testo) return [...ultime];
  return [...ultime.filter((t) => t !== testo), testo].slice(-n);
}

/**
 * Una frase a caso dalla lista, già sostituita, che evita le ultime usate (`evita`: una frase o la lista
 * delle ultime, la più recente in fondo). Se la lista è più corta della memoria si evitano solo le più
 * recenti che lasciano almeno un'alternativa; mai la più recente se c'è altro.
 */
export function scegliFrase(
  lista: readonly string[],
  evita: string | readonly string[],
  s: Sostituzioni,
  caso: () => number = Math.random,
): string {
  const tutte = lista.map((t) => sostituisci(t, s));
  const ultime = typeof evita === 'string' ? (evita ? [evita] : []) : evita;
  let da = tutte;
  // dalla memoria più lunga alla più corta: la prima che lascia qualcosa
  for (let k = ultime.length; k > 0; k--) {
    const no = new Set(ultime.slice(-k));
    const buone = tutte.filter((t) => !no.has(t));
    if (buone.length) {
      da = buone;
      break;
    }
  }
  return da[Math.min(da.length - 1, Math.floor(caso() * da.length))] ?? '';
}

export type CategoriaFrase = keyof typeof FRASI;

/**
 * Le frasi "di voce" di un personaggio per una categoria con questi fiori: VOCE[chi][categoria]
 * (per `suggerimento`: VOCE_SUGGERIMENTO; per `invio`: FRASI.invio, uguali per tutti e due) più i
 * pacchetti di FRASI_EXTRA già sbloccati (`partite ≤ fiori`, del personaggio o di 'entrambi').
 */
export function frasiDisponibili(categoria: string, chi: ChiParla, fiori: number): FraseConAccessorio[] {
  const base: readonly FraseConAccessorio[] =
    categoria === 'suggerimento'
      ? VOCE_SUGGERIMENTO[chi]
      : categoria === 'invio'
        ? FRASI.invio
        : (VOCE[chi]?.[categoria] ?? []);
  const extra = FRASI_EXTRA.filter(
    (p) => p.categoria === categoria && (p.chi === chi || p.chi === 'entrambi') && p.partite <= fiori,
  ).flatMap((p) => p.frasi);
  return [...base, ...extra];
}

/**
 * Frase detta da una mascotte su un evento del suo giocatore: metà delle volte dalla sua voce
 * (frasiDisponibili, se ne ha), metà da FRASI. Evita le ultime usate (`evita`).
 */
export function fraseMascotte(
  categoria: CategoriaFrase,
  chi: ChiParla,
  evita: string | readonly string[],
  s: Sostituzioni,
  caso: () => number = Math.random,
  fiori: number = 0,
): string {
  const voce = frasiDisponibili(categoria, chi, fiori).map(testoDi);
  const lista = voce.length && caso() < 0.5 ? voce : FRASI[categoria];
  return scegliFrase(lista, evita, s, caso);
}

/** Frasi da mandare al partner con questi fiori (FRASI.invio + pacchetti sbloccati). */
export function frasiInvio(fiori: number): string[] {
  return frasiDisponibili('invio', 'semino', fiori).map(testoDi);
}

/** Quanto spesso, nei giorni speciali, la chiacchiera viene da quelle dedicate. */
export const QUOTA_CHIACCHIERE_SPECIALI = 0.6;

/** Le chiacchiere di un personaggio: le sue, i pacchetti sbloccati e, nei giorni speciali, quelle dedicate. */
export function chiacchiereDi(chi: ChiParla, fiori: number, giorno: GiornoSpeciale | null = null): {
  solite: FraseConAccessorio[];
  speciali: FraseConAccessorio[];
} {
  return {
    solite: frasiDisponibili('chiacchiere', chi, fiori),
    speciali: giorno ? (GIORNI_SPECIALI[giorno]?.chiacchiere[chi] ?? []) : [],
  };
}

/** Chiacchiera a caso del personaggio (stringa vuota se non ne ha); evita le ultime usate. */
export function chiacchiera(
  chi: ChiParla,
  evita: string | readonly string[],
  s: Sostituzioni,
  caso: () => number = Math.random,
  o: { fiori?: number; giorno?: GiornoSpeciale | null } = {},
): string {
  const { solite, speciali } = chiacchiereDi(chi, o.fiori ?? 0, o.giorno ?? null);
  const lista = (speciali.length && caso() < QUOTA_CHIACCHIERE_SPECIALI ? speciali : solite).map(testoDi);
  return lista.length ? scegliFrase(lista, evita, s, caso) : '';
}

/** Testo di una frase che può portare un accessorio (T2b: l'accessorio lo usa la UI). */
export function testoDi(f: FraseConAccessorio): string {
  return typeof f === 'string' ? f : f.testo;
}

/** Il modello di una frase come espressione: i segnaposto ({reale}, {nome}…) valgono qualunque testo. */
function modello(t: string): RegExp {
  const pezzi = t.split(/\{(?:realePartner|reale|nome|io|n)\}/);
  return new RegExp(`^${pezzi.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*?')}$`);
}

/**
 * Accessorio associato a un testo di chiacchiera (già sostituito, anche arrivato dall'altro
 * dispositivo, che sostituisce coi suoi nomi), se c'è: cerca nelle sue chiacchiere, nei pacchetti
 * di FRASI_EXTRA (tutti: la disponibilità la decide `accessorioPermesso`) e nei giorni speciali.
 */
export function accessorioDi(chi: ChiParla, testo: string): string | undefined {
  const fonti: FraseConAccessorio[] = [
    ...(VOCE[chi]?.chiacchiere ?? []),
    ...FRASI_EXTRA.filter((p) => p.chi === chi || p.chi === 'entrambi').flatMap((p) => p.frasi),
    ...Object.values(GIORNI_SPECIALI).flatMap((g) => g.chiacchiere[chi] ?? []),
  ];
  for (const f of fonti) {
    if (typeof f === 'string') continue;
    if (f.testo === testo || modello(f.testo).test(testo)) return f.accessorio;
  }
  return undefined;
}

// --- sblocchi -----------------------------------------------------------------------

/** Accessori che si sbloccano coi fiori (id → soglia). Prima della soglia non si indossano. */
const SOGLIA_ACCESSORIO: ReadonlyMap<string, number> = new Map(
  SBLOCCHI.filter((s) => s.sblocco.tipo === 'accessorio').map((s) => [s.sblocco.id, s.partite]),
);

/** Gli accessori della lista già disponibili con questi fiori (quelli senza sblocco lo sono sempre). */
export function accessoriSbloccati<T extends string>(lista: readonly T[], fiori: number): T[] {
  return lista.filter((a) => (SOGLIA_ACCESSORIO.get(a) ?? 0) <= fiori);
}

/** Accessori mai indossati: Semino non va in montagna né a cavallo; Semina il surf solo in coppia con lui. */
const MAI: Record<ChiParla, readonly string[]> = { semino: ['montagna', 'cavallo'], semina: ['surf'] };

/**
 * L'accessorio `a` (da una frase, una tappa, un giorno speciale) si può far indossare a `chi`?
 * No se non è ancora sbloccato o se non è del suo carattere; `inCoppia`: Semina accanto a Semino,
 * e nel giorno del mare può portare la tavola.
 */
export function accessorioPermesso(
  chi: ChiParla,
  a: string | undefined,
  fiori: number,
  o: { inCoppia?: boolean; giorno?: GiornoSpeciale | null } = {},
): string | undefined {
  if (!a) return undefined;
  if ((SOGLIA_ACCESSORIO.get(a) ?? 0) > fiori) return undefined;
  const surfAlMare = chi === 'semina' && a === 'surf' && !!o.inCoppia && o.giorno === 'mare';
  if (MAI[chi].includes(a) && !surfAlMare) return undefined;
  return a;
}

/** Chiave stabile di uno sblocco (gli id dei tipi diversi possono somigliarsi). */
export function chiaveSblocco(s: Sblocco): string {
  return `${s.tipo}:${s.id}`;
}

export interface SblocchiNuovi {
  /** gli sblocchi da annunciare: quelli della soglia più alta fra i nuovi (vuoto se niente di nuovo) */
  annuncio: Sblocco[];
  /** quanti suggerimenti regalare: solo quelli annunciati */
  regali: number;
  /** le chiavi viste aggiornate (da salvare): tutte quelle sbloccate con questi fiori */
  visti: string[];
}

/**
 * Sblocchi nuovi su questo dispositivo: quelli con `partite ≤ fiori` non ancora visti. Come la
 * storia, non si torna indietro: con più soglie superate insieme (dispositivo nuovo, storico del
 * partner) si annuncia solo l'ultima e si segnano viste tutte. Le chiavi oltre i fiori attuali
 * (dopo un "ricomincia") si dimenticano, così il giardino nuovo le riannuncia.
 */
export function sblocchiNuovi(fiori: number, visti: unknown): SblocchiNuovi {
  const prima = new Set(Array.isArray(visti) ? visti.filter((x): x is string => typeof x === 'string') : []);
  const raggiunti = SBLOCCHI.filter((s) => s.partite <= fiori);
  const nuovi = raggiunti.filter((s) => !prima.has(chiaveSblocco(s.sblocco)));
  const soglia = nuovi.reduce((m, s) => Math.max(m, s.partite), -1);
  const annuncio = nuovi.filter((s) => s.partite === soglia).map((s) => s.sblocco);
  return {
    annuncio,
    regali: annuncio.filter((s) => s.tipo === 'regalo').length,
    visti: raggiunti.map((s) => chiaveSblocco(s.sblocco)),
  };
}

/** Suggerimenti regalati dagli sblocchi in attesa della prossima partita (campo extra dell'archivio). */
export function regaliBonusDi(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(99, Math.floor(x)) : 0;
}

/** Le chiavi viste salvate sono già quelle giuste (nessuna scrittura da fare)? */
export function stessiVisti(salvati: unknown, nuovi: readonly string[]): boolean {
  return Array.isArray(salvati) && salvati.length === nuovi.length && nuovi.every((k, i) => salvati[i] === k);
}

// --- sorprese ------------------------------------------------------------------------

export function chiaveSorpresa(partite: number): string {
  return `sorpresa-${partite}`;
}

/**
 * La sorpresa per la vittoria che porta a `fiori`, se c'è e non è già stata vista qui. Mai insieme
 * alla scena dell'arrivo di Semina (ha la precedenza) né prima che Semina sia arrivata qui.
 */
export function sorpresaDaMostrare(
  fiori: number,
  viste: readonly string[],
  sbloccata: boolean,
): { partite: number; chiave: string; battute: Battuta[] } | null {
  if (!sbloccata || scenaDaMostrare(fiori, viste)) return null;
  const s = SORPRESE.find((x) => x.partite === fiori);
  if (!s) return null;
  const chiave = chiaveSorpresa(s.partite);
  return viste.includes(chiave) ? null : { partite: s.partite, chiave, battute: s.battute };
}

/** Elemento a caso della lista, diverso da `ultimo` se c'è alternativa. */
export function aCasoDiverso<T>(lista: readonly T[], ultimo: T | undefined, caso: () => number = Math.random): T | undefined {
  const buone = lista.filter((x) => x !== ultimo);
  const da = buone.length ? buone : lista;
  return da[Math.min(da.length - 1, Math.floor(caso() * da.length))];
}

// --- sonno ------------------------------------------------------------------------

/** Svegliata nelle sue ore di sonno: la reazione c'è ma più assonnata. */
const ATTENUATO: Record<string, string> = {
  euforico: 'felice',
  festa: 'felice',
  estasiato: 'sorpreso',
  arrabbiato: 'preoccupato',
  sorpreso: 'neutro',
  saluta: 'neutro',
  regalo: 'felice',
};
export function attenuaUmore(u: string): string {
  return ATTENUATO[u] ?? u;
}

function nellOrario(ora: number, o: { aLetto: number; sveglia: number }): boolean {
  return o.aLetto < o.sveglia ? ora >= o.aLetto && ora < o.sveglia : ora >= o.aLetto || ora < o.sveglia;
}

/**
 * Frase di chi viene svegliata nelle sue ore di sonno. Semina nel suo giorno da dormigliona, oltre
 * la sua sveglia normale, dice la frase apposita (quella su Semino e il dormire fino a tardi).
 */
export function fraseSonno(
  chi: ChiParla,
  evita: string | readonly string[],
  d: Date = new Date(),
  caso: () => number = Math.random,
): string {
  const lista = SONNO[chi] ?? [];
  if (chi === 'semina' && seminaDormeTardiOggi(d) && dormePerOrario('semina', d)) {
    const ora = d.getHours() + d.getMinutes() / 60;
    const apposita = lista.find((t) => /fino a tardi/i.test(t));
    if (apposita && !nellOrario(ora, ORARI_SONNO.semina)) return apposita;
  }
  return scegliFrase(lista, evita, { nome: '', io: '' }, caso);
}

// --- solletico ----------------------------------------------------------------

/** Umori del solletico; `arrabbiato` solo per Semina, una volta su RARO_ARRABBIATA. */
export const UMORI_SOLLETICO = ['felice', 'sorpreso', 'euforico', 'festa', 'imbarazzato', 'saluta'] as const;
export const RARO_ARRABBIATA = 8;
/** Al massimo un solletico ogni tanti ms (per dispositivo). */
export const SOLLETICO_OGNI_MS = 700;

/**
 * Reazione a un tocco sulla mascotte: umore mai uguale al precedente, battuta da VOCE[chi].solletico
 * mai uguale alla precedente.
 */
export function solletico(
  chi: ChiParla,
  ultimoUmore: string,
  ultimaFrase: string | readonly string[],
  s: Sostituzioni,
  caso: () => number = Math.random,
): { umore: string; testo: string } {
  const umore =
    chi === 'semina' && ultimoUmore !== 'arrabbiato' && caso() < 1 / RARO_ARRABBIATA
      ? 'arrabbiato'
      : (aCasoDiverso<string>(UMORI_SOLLETICO, ultimoUmore, caso) ?? 'felice');
  const lista = (VOCE[chi]?.solletico ?? []).map(testoDi);
  const testo = lista.length ? scegliFrase(lista, ultimaFrase, s, caso) : '';
  return { umore, testo };
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
