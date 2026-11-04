// Regole di gioco della UI, pure e testate: punti, serie, errori, regali, crescita, giardino,
// sblocchi, scelta delle frasi e allineamento dello storico. I numeri stanno in config/punteggio.ts.
// La storia a capitoli (coda, visti, eco, Semina sbloccata) sta in ui/capitoli.ts.
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
import { SEMINA_ARRIVA_A, capitolo } from '../config/capitoli';
import type { Luogo } from '../config/capitoli';
import { CHIACCHIERE_LUOGO, FRASI, FRASI_EXTRA, SONNO, SONNO_MOSSA, VOCE, VOCE_SUGGERIMENTO } from '../config/frasi';
import { attiVisitati, luogoDelVestito, vestitoArrivato } from '../config/luoghi';
import { GIORNI_SPECIALI, QUOTA_ECO_CHIACCHIERE, SBLOCCHI } from '../config/storia';
import type { GiornoSpeciale, Sblocco } from '../config/storia';
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

/** Default delle funzioni di frasi senza `sbloccata` esplicita: Semina c'è dai fiori del suo capitolo. */
function arrivata(fiori: number): boolean {
  return fiori >= SEMINA_ARRIVA_A;
}

/**
 * Quanto blu c'è negli accenti di coppia (0..1): cresce con i fiori verso lo sblocco, poi 1 fisso
 * (= metà e metà). Diventa la variabile CSS `--blu-presenza`.
 */
export function presenzaBlu(fiori: number, sbloccata: boolean): number {
  if (sbloccata) return 1;
  return Math.max(0, Math.min(fiori / SEMINA_ARRIVA_A, 1));
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
 * Frazione di petali blu di un fiore (null per i germogli). I primi SEMINA_ARRIVA_A fiori seguono
 * la progressione verso Semina (1 = tutto verde … 5 = metà e metà) e restano così; dal successivo
 * conta chi ha fatto più punti in quella partita (`quotaBlu` salvata a fine partita; 0.5 se manca).
 * Prima che Semina sia arrivata su questo dispositivo (capitolo 5 visto) nessun fiore va oltre il
 * blu del quarto: niente "metà e metà", che è il suo arrivo.
 */
export function quotaBluFiore(voce: VoceGiardino, n: number, sbloccata: boolean): number | null {
  if (!voce.finita) return null;
  const k = SEMINA_ARRIVA_A;
  const verso = (m: number) => (k > 1 ? ((Math.max(1, m) - 1) / (k - 1)) * 0.5 : 0.5);
  if (!sbloccata) return verso(Math.min(n, k - 1));
  if (n <= k) return verso(n);
  const q = voce.quotaBlu;
  return typeof q === 'number' && Number.isFinite(q) ? Math.max(0, Math.min(1, q)) : 0.5;
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
 * Prima che Semina arrivi su questo dispositivo (scena vista) nessuna frase deve nominarla né parlare
 * di "lei" come personaggio: Mati si può nominare, Semina no. Filtro prudente: meglio una frase in meno.
 */
const PARLA_DI_SEMINA = /\bsemina\b|\blei\b|\ble ho\b/i;
export function nominaSemina(testo: string): boolean {
  return PARLA_DI_SEMINA.test(testo);
}
/** Le frasi dicibili adesso: con `sbloccata` tutte, altrimenti quelle che non parlano di Semina. */
export function senzaSemina<T extends FraseConAccessorio>(lista: readonly T[], sbloccata: boolean): T[] {
  return sbloccata ? [...lista] : lista.filter((f) => !nominaSemina(testoDi(f)));
}

/**
 * Le frasi "di voce" di un personaggio per una categoria con questi fiori: VOCE[chi][categoria]
 * (per `suggerimento`: VOCE_SUGGERIMENTO; per `invio`: FRASI.invio, uguali per tutti e due) più i
 * pacchetti di FRASI_EXTRA già sbloccati (`partite ≤ fiori`, del personaggio o di 'entrambi').
 */
export function frasiDisponibili(
  categoria: string,
  chi: ChiParla,
  fiori: number,
  sbloccata: boolean = arrivata(fiori),
): FraseConAccessorio[] {
  const base: readonly FraseConAccessorio[] =
    categoria === 'suggerimento'
      ? VOCE_SUGGERIMENTO[chi]
      : categoria === 'invio'
        ? FRASI.invio
        : (VOCE[chi]?.[categoria] ?? []);
  const extra = FRASI_EXTRA.filter(
    (p) => p.categoria === categoria && (p.chi === chi || p.chi === 'entrambi') && p.partite <= fiori,
  ).flatMap((p) => p.frasi);
  return senzaSemina([...base, ...extra], sbloccata);
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
  sbloccata: boolean = arrivata(fiori),
): string {
  const voce = frasiDisponibili(categoria, chi, fiori, sbloccata).map(testoDi);
  const lista = voce.length && caso() < 0.5 ? voce : senzaSemina(FRASI[categoria], sbloccata);
  return scegliFrase(lista, evita, s, caso);
}

/** Frasi da mandare al partner con questi fiori (FRASI.invio + pacchetti sbloccati). */
export function frasiInvio(fiori: number, sbloccata: boolean = arrivata(fiori)): string[] {
  return frasiDisponibili('invio', 'semino', fiori, sbloccata).map(testoDi);
}

/** Quanto spesso, nei giorni speciali, la chiacchiera viene da quelle dedicate. */
export const QUOTA_CHIACCHIERE_SPECIALI = 0.6;

/** Chiacchiere proprie dei luoghi (bosco, città, cucina, lontano) per i luoghi visitati. */
function chiacchiereDeiLuoghi(chi: ChiParla, luoghi: readonly Luogo[]): FraseConAccessorio[] {
  return luoghi.flatMap((l) => (l in CHIACCHIERE_LUOGO ? CHIACCHIERE_LUOGO[l as keyof typeof CHIACCHIERE_LUOGO][chi] : []));
}

/**
 * Le chiacchiere di un luogo per la prima volta che un suo vestito compare in Home: mare e montagna
 * dai giorni speciali (senza quelle che dicono "oggi"/"giorno": non è il giorno speciale), gli altri
 * da CHIACCHIERE_LUOGO; il giardino non ne ha (lista vuota).
 */
export function frasiDelLuogo(luogo: Luogo, chi: ChiParla): FraseConAccessorio[] {
  if (luogo === 'mare' || luogo === 'montagna')
    return GIORNI_SPECIALI[luogo].chiacchiere[chi].filter((f) => !/\boggi\b|\bgiorno\b/i.test(testoDi(f)));
  return chiacchiereDeiLuoghi(chi, [luogo]);
}

/**
 * Le chiacchiere di un personaggio: le sue, i pacchetti sbloccati, quelle dei luoghi visitati e, nei
 * giorni speciali, quelle dedicate.
 */
export function chiacchiereDi(
  chi: ChiParla,
  fiori: number,
  giorno: GiornoSpeciale | null = null,
  sbloccata: boolean = arrivata(fiori),
  luoghi: readonly Luogo[] = [],
): {
  solite: FraseConAccessorio[];
  speciali: FraseConAccessorio[];
} {
  return {
    solite: [...frasiDisponibili('chiacchiere', chi, fiori, sbloccata), ...senzaSemina(chiacchiereDeiLuoghi(chi, luoghi), sbloccata)],
    speciali: senzaSemina(giorno ? (GIORNI_SPECIALI[giorno]?.chiacchiere[chi] ?? []) : [], sbloccata),
  };
}

/**
 * Chiacchiera a caso del personaggio (stringa vuota se non ne ha); evita le ultime usate.
 * `eco`: le eco dei capitoli letti che spettano a questo personaggio (entrano con peso basso).
 */
export function chiacchiera(
  chi: ChiParla,
  evita: string | readonly string[],
  s: Sostituzioni,
  caso: () => number = Math.random,
  o: { fiori?: number; giorno?: GiornoSpeciale | null; sbloccata?: boolean; eco?: readonly string[]; luoghi?: readonly Luogo[] } = {},
): string {
  const fiori = o.fiori ?? 0;
  const sbloccata = o.sbloccata ?? arrivata(fiori);
  // ogni tanto (QUOTA_ECO_CHIACCHIERE) torna l'eco di un capitolo già letto
  const eco = senzaSemina(o.eco ?? [], sbloccata);
  if (eco.length && caso() < QUOTA_ECO_CHIACCHIERE) return scegliFrase(eco, evita, s, caso);
  const { solite, speciali } = chiacchiereDi(chi, fiori, o.giorno ?? null, sbloccata, o.luoghi ?? []);
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
 * di FRASI_EXTRA (tutti: la disponibilità la decide `accessorioPermesso`), nei giorni speciali e nei luoghi.
 */
export function accessorioDi(chi: ChiParla, testo: string): string | undefined {
  const fonti: FraseConAccessorio[] = [
    ...(VOCE[chi]?.chiacchiere ?? []),
    ...FRASI_EXTRA.filter((p) => p.chi === chi || p.chi === 'entrambi').flatMap((p) => p.frasi),
    ...Object.values(GIORNI_SPECIALI).flatMap((g) => g.chiacchiere[chi] ?? []),
    ...Object.values(CHIACCHIERE_LUOGO).flatMap((l) => l[chi]),
  ];
  for (const f of fonti) {
    if (typeof f === 'string') continue;
    if (f.testo === testo || modello(f.testo).test(testo)) return f.accessorio;
  }
  return undefined;
}

// --- vestiti (dai luoghi visitati, config/luoghi.ts) -------------------------------------

/** Gli accessori della lista già arrivati con questi capitoli visti (luogo visitato; animale e cavallo col loro capitolo). */
export function accessoriSbloccati<T extends string>(lista: readonly T[], visti: readonly string[]): T[] {
  return lista.filter((a) => vestitoArrivato(a, visti));
}

/** Accessori mai indossati: Semino non va in montagna né a cavallo; Semina il surf solo in coppia con lui. */
const MAI: Record<ChiParla, readonly string[]> = { semino: ['montagna', 'cavallo'], semina: ['surf'] };

/**
 * L'accessorio `a` (da una frase, un capitolo, un giorno speciale) si può far indossare a `chi`?
 * No se il suo luogo non è ancora visitato (capitoli `visti` di chi tiene il telefono) o se non è del
 * suo carattere; `inCoppia`: Semina accanto a Semino, e nel giorno del mare può portare la tavola.
 */
export function accessorioPermesso(
  chi: ChiParla,
  a: string | undefined,
  visti: readonly string[],
  o: { inCoppia?: boolean; giorno?: GiornoSpeciale | null } = {},
): string | undefined {
  if (!a) return undefined;
  if (!vestitoArrivato(a, visti)) return undefined;
  const surfAlMare = chi === 'semina' && a === 'surf' && !!o.inCoppia && o.giorno === 'mare';
  if (MAI[chi].includes(a) && !surfAlMare) return undefined;
  return a;
}

export type VestitiRiposo = Partial<Record<ChiParla, string>>;

/** Quante volte su 1 in Home si vestono tutti e due dello stesso luogo (il resto: misti). */
export const QUOTA_STESSO_LUOGO = 0.75;

interface OpzioniVestiti {
  visti: readonly string[];
  /** Semina c'è (capitolo 5 visto): prima solo Semino */
  sbloccata: boolean;
  giorno?: GiornoSpeciale | null;
}

/** I luoghi del viaggio visitati, ognuno coi vestiti che i due possono mettersi adesso (Semino almeno uno). */
function guardaroba(o: OpzioniVestiti) {
  const permesso = (chi: ChiParla, id: string) => !!accessorioPermesso(chi, id, o.visti, { inCoppia: o.sbloccata, giorno: o.giorno });
  return attiVisitati(o.visti)
    .filter((x) => !x.ritorno)
    .map((x) => ({
      luogo: x.luogo,
      semino: x.vestiti.semino.filter((id) => permesso('semino', id)),
      semina: o.sbloccata ? x.vestiti.semina.filter((id) => permesso('semina', id)) : [],
    }))
    .filter((g) => g.semino.length > 0);
}

/**
 * Entrando in Home: nei giorni speciali gli accessori a tema, altrimenti i vestiti dell'ultimo capitolo
 * letto (continuità con la scena appena vista), se permessi. Nell'aiuola niente.
 */
export function vestitiIniziali(o: OpzioniVestiti): VestitiRiposo {
  const per = (chi: ChiParla, id: string | undefined) => accessorioPermesso(chi, id, o.visti, { inCoppia: o.sbloccata, giorno: o.giorno });
  let ultimo = -1;
  for (const k of o.visti) {
    const m = /^capitolo-(\d+)$/.exec(k);
    if (m) ultimo = Math.max(ultimo, Number(m[1]));
  }
  const fonte = o.giorno ? GIORNI_SPECIALI[o.giorno].accessori : (capitolo(ultimo)?.vestiti ?? {});
  const out: VestitiRiposo = {};
  const semino = per('semino', fonte.semino);
  if (semino) out.semino = semino;
  const semina = o.sbloccata ? per('semina', fonte.semina) : undefined;
  if (semina) out.semina = semina;
  return out;
}

/**
 * Il cambio di vestiti a riposo in Home (tutti e due insieme): con probabilità QUOTA_STESSO_LUOGO un
 * luogo solo per entrambi (diverso da quello di adesso se c'è altro), altrimenti misti (ognuno da un
 * luogo diverso). Solo vestiti dei luoghi visitati e permessi; prima dell'arrivo di Semina solo Semino.
 * `caso`: sorgente di numeri in [0,1) (iniettabile per i test).
 */
export function vestitiRiposo(o: OpzioniVestiti & { prima?: VestitiRiposo; caso?: () => number }): VestitiRiposo {
  const caso = o.caso ?? Math.random;
  const g = guardaroba(o);
  if (!g.length) return {};
  const prima = o.prima ?? {};
  const luoghi = g.map((x) => x.luogo);
  const adesso = luogoDelVestito(prima.semino ?? '');
  const misti = o.sbloccata && g.length > 1 && caso() >= QUOTA_STESSO_LUOGO;
  const l1 = aCasoDiverso(luoghi, adesso, caso)!;
  const l2 = misti ? aCasoDiverso(luoghi.filter((l) => l !== l1), undefined, caso)! : l1;
  const di = (l: Luogo) => g.find((x) => x.luogo === l)!;
  const out: VestitiRiposo = {};
  const semino = aCasoDiverso(di(l1).semino, prima.semino, caso);
  if (semino) out.semino = semino;
  if (o.sbloccata) {
    const sue = di(l2).semina.length ? di(l2).semina : g.flatMap((x) => x.semina);
    const semina = aCasoDiverso(sue, prima.semina, caso);
    if (semina) out.semina = semina;
  }
  return out;
}

/** Chiave stabile di uno sblocco (gli id dei tipi diversi possono somigliarsi). */
export function chiaveSblocco(s: Sblocco): string {
  return `${s.tipo}:${s.id}`;
}

export interface FrasiNuove {
  /** i pacchetti di frasi nuovi da annunciare con un toast (vuoto se niente di nuovo) */
  nuove: Sblocco[];
  /** le chiavi viste aggiornate (da salvare): tutte quelle raggiunte con questi fiori */
  visti: string[];
}

/** id del pacchetto `${chi}-${categoria}-${partite}`: di chi sono le frasi. */
function chiDelPacchetto(s: Sblocco): ChiParla | 'entrambi' {
  return s.id.startsWith('semina-') ? 'semina' : s.id.startsWith('semino-') ? 'semino' : 'entrambi';
}

/**
 * Pacchetti di frasi (SBLOCCHI) nuovi su questo dispositivo: `partite ≤ fiori` e non ancora visti.
 * Prima che Semina arrivi qui i pacchetti suoi aspettano (né annunciati né segnati). Le chiavi oltre i
 * fiori attuali (dopo un "ricomincia") si dimenticano, e con loro quelle vecchie di elementi e accessori.
 */
export function frasiNuove(fiori: number, visti: unknown, sbloccata: boolean): FrasiNuove {
  const prima = new Set(Array.isArray(visti) ? visti.filter((x): x is string => typeof x === 'string') : []);
  const raggiunti = SBLOCCHI.filter((s) => s.partite <= fiori && (sbloccata || chiDelPacchetto(s.sblocco) !== 'semina'));
  return {
    nuove: raggiunti.filter((s) => !prima.has(chiaveSblocco(s.sblocco))).map((s) => s.sblocco),
    visti: raggiunti.map((s) => chiaveSblocco(s.sblocco)),
  };
}

/** Testo del toast per i pacchetti nuovi: "Frasi nuove per Semino" / "per Semino e Semina" / "per voi due". */
export function testoFrasiNuove(nuove: readonly Sblocco[], sbloccata: boolean): string {
  if (!nuove.length) return '';
  const chi = new Set(nuove.map(chiDelPacchetto));
  const due = chi.has('entrambi') || (chi.has('semino') && chi.has('semina'));
  const per = due ? (sbloccata ? 'Semino e Semina' : 'voi due') : chi.has('semina') ? 'Semina' : 'Semino';
  return `Frasi nuove per ${per}`;
}

/** Suggerimenti regalati dagli sblocchi in attesa della prossima partita (campo extra dell'archivio). */
export function regaliBonusDi(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(99, Math.floor(x)) : 0;
}

/** Le chiavi viste salvate sono già quelle giuste (nessuna scrittura da fare)? */
export function stessiVisti(salvati: unknown, nuovi: readonly string[]): boolean {
  return Array.isArray(salvati) && salvati.length === nuovi.length && nuovi.every((k, i) => salvati[i] === k);
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
 * `mossa`: svegliata da una mossa (allora anche le frasi sulla mossa, SONNO_MOSSA); altrimenti
 * (solletico, riposo) solo quelle da mezzo sonno. `sbloccata`: prima dell'arrivo di Semina niente
 * frasi che la nominano.
 */
export function fraseSonno(
  chi: ChiParla,
  evita: string | readonly string[],
  d: Date = new Date(),
  caso: () => number = Math.random,
  o: { mossa?: boolean; sbloccata?: boolean } = {},
): string {
  const lista = senzaSemina([...(SONNO[chi] ?? []), ...(o.mossa ? (SONNO_MOSSA[chi] ?? []) : [])], !!o.sbloccata);
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
  sbloccata: boolean = false,
): { umore: string; testo: string } {
  const umore =
    chi === 'semina' && ultimoUmore !== 'arrabbiato' && caso() < 1 / RARO_ARRABBIATA
      ? 'arrabbiato'
      : (aCasoDiverso<string>(UMORI_SOLLETICO, ultimoUmore, caso) ?? 'felice');
  const lista = senzaSemina(VOCE[chi]?.solletico ?? [], sbloccata).map(testoDi);
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
