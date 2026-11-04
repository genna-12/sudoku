import { specchiaInIndexedDB } from './persistenza';
// Archivio locale: tutto ciò che persiste sul dispositivo, in UNA chiave localStorage versionata.
// Aggiungere un campo = alzare VERSIONE_ARCHIVIO e aggiungere un passo in PASSI (storico e tappe
// viste non si toccano mai). Puro TS: lo storage si passa come parametro (default localStorage).
import { ULTIMO_CAPITOLO, SEMINA_ARRIVA_A, chiaveCapitolo } from '../config/capitoli';
import { ruoloDiNome } from '../config/giocatori';
import { unisciStorico, voceStorico } from './index';
import type { Giocatore, StatoPartita, VoceStorico } from './types';

/** Una frase mandata (da = chi l'ha mandata): la cassetta della posta (T7). Chiave `${ts}-${da}`. */
export interface DettaglioFiore {
  a: number;
  b: number;
  ultima: Giocatore | null;
}

export interface VocePosta {
  ts: number;
  da: Giocatore;
  testo: string;
}

/** Capitoli visti per ruolo (a = Semino, b = Semina): sempre un prefisso `capitolo-0..k`. */
export interface CapitoliVisti {
  a: string[];
  b: string[];
}

export interface Archivio {
  versione: number;
  io: { nome: string; frase: string } | null;
  partner: string;
  partita: StatoPartita | null;
  storico: VoceStorico[];
  /** Date.now() dell'ultimo "ricomincia da zero" (0 = mai): voci con iniziata < azzerato scartate. */
  azzerato: number;
  /** chiavi `${chi}-${partite}` delle tappe della storia di T2-T4 (inerte da T5: non si sincronizza) */
  tappeViste: string[];
  /** capitoli letti fino in fondo, per ruolo (si sincronizzano) */
  capitoliVisti: CapitoliVisti;
  /** chiavi `eco-${fiore}` delle eco già mostrate in Home (solo locali) */
  ecoViste: string[];
  impostazioni: { mostraErrori: boolean; vibrazione: boolean };
  /** frasi mandate e ricevute, le più recenti prima (al massimo POSTA_MAX; si sincronizza) */
  posta: VocePosta[];
  /** per le partite finite viste da questo dispositivo: punti di ciascuno e chi ha messo l'ultima cella (solo locale) */
  dettagliFiori: Record<string, DettaglioFiore>;
  /** Campi di versioni più nuove dell'app: non si leggono, ma `migra` li conserva e `salva` li riscrive. */
  [extra: string]: unknown;
}

export const VERSIONE_ARCHIVIO = 2;
export const CHIAVE_ARCHIVIO = 'sudoku-coppia-archivio';

export const ARCHIVIO_VUOTO: Archivio = Object.freeze({
  versione: VERSIONE_ARCHIVIO,
  io: null,
  partner: '',
  partita: null,
  storico: Object.freeze([]) as unknown as VoceStorico[],
  azzerato: 0,
  tappeViste: Object.freeze([]) as unknown as string[],
  capitoliVisti: Object.freeze({ a: Object.freeze([]), b: Object.freeze([]) }) as unknown as CapitoliVisti,
  ecoViste: Object.freeze([]) as unknown as string[],
  impostazioni: Object.freeze({ mostraErrori: true, vibrazione: true }),
  posta: Object.freeze([]) as unknown as VocePosta[],
  dettagliFiori: Object.freeze({}) as Record<string, DettaglioFiore>,
}) as Archivio;

/** Chiavi sparse della versione 0 (T1). `sudoku-coppia-scelta` resta alla Home e non si tocca. */
export const CHIAVI_V0 = {
  partita: 'sudoku-coppia',
  io: 'sudoku-coppia-io',
  partner: 'sudoku-coppia-partner',
  errori: 'sudoku-coppia-errori',
  storico: 'sudoku-coppia-storico',
} as const;

export function chiaveTappa(chi: string, partite: number): string {
  return `${chi}-${partite}`;
}

// --- capitoli visti ----------------------------------------------------------

/** Il prefisso contiguo più lungo `capitolo-0..k` contenuto nella lista (le chiavi sparse si scartano). */
export function normalizzaPrefisso(chiavi: unknown): string[] {
  if (!Array.isArray(chiavi)) return [];
  const ci = new Set(chiavi.filter((c): c is string => typeof c === 'string'));
  const out: string[] = [];
  while (out.length <= ULTIMO_CAPITOLO && ci.has(chiaveCapitolo(out.length))) out.push(chiaveCapitolo(out.length));
  return out;
}

/** Visti validi per entrambi i ruoli (default vuoti). */
export function normalizzaVisti(x: unknown): CapitoliVisti {
  const o = isObj(x) ? x : {};
  return { a: normalizzaPrefisso(o.a), b: normalizzaPrefisso(o.b) };
}

/** Unione per ruolo (a con a, b con b), rinormalizzata al prefisso. Stesso oggetto `a` se non cambia. */
export function unisciVisti(a: CapitoliVisti, b: CapitoliVisti): CapitoliVisti {
  const uguali = (x: string[], y: string[]) => x.length === y.length && x.every((k, i) => k === y[i]);
  const ua = normalizzaPrefisso([...a.a, ...b.a]);
  const ub = normalizzaPrefisso([...a.b, ...b.b]);
  const sa = uguali(ua, a.a);
  const sb = uguali(ub, a.b);
  return sa && sb ? a : { a: sa ? a.a : ua, b: sb ? a.b : ub };
}

// --- posta ----------------------------------------------------------------------

export const POSTA_MAX = 50;
/** la stessa frase della stessa persona entro questo intervallo è una sola (mittente e destinatario la
 *  registrano ciascuno col proprio orologio: il messaggio P2P non porta l'ora) */
export const POSTA_STESSA_MS = 120_000;

export const chiavePosta = (v: VocePosta) => `${v.ts}-${v.da}`;

function vocePostaValida(x: unknown): x is VocePosta {
  return isObj(x) && isNum(x.ts) && x.ts > 0 && (x.da === 'a' || x.da === 'b') && typeof x.testo === 'string' && x.testo.length > 0;
}

/**
 * Unione per chiave, poi: scartate quelle prima dell'azzeramento, fuse le copie della stessa frase
 * (stesso mittente e testo entro POSTA_STESSA_MS: resta la più vecchia), le POSTA_MAX più recenti
 * prima. Commutativa. Restituisce `a` stesso se il risultato non cambia.
 */
export function unisciPosta(a: VocePosta[], b: unknown, azzerato = 0): VocePosta[] {
  const tutte = new Map<string, VocePosta>();
  for (const v of [...a, ...(Array.isArray(b) ? b : [])]) {
    if (!vocePostaValida(v) || v.ts < azzerato) continue;
    const k = chiavePosta(v);
    const c = tutte.get(k);
    // stessa chiave: testo deterministico (il minore), così l'unione è commutativa
    if (!c || v.testo < c.testo) tutte.set(k, { ts: v.ts, da: v.da, testo: v.testo.slice(0, 200) });
  }
  const crescenti = [...tutte.values()].sort((x, y) => x.ts - y.ts || (x.da < y.da ? -1 : x.da > y.da ? 1 : 0));
  const tenute: VocePosta[] = [];
  const ultima = new Map<string, number>();
  for (const v of crescenti) {
    const k = `${v.da}\n${v.testo}`;
    const t = ultima.get(k);
    if (t !== undefined && v.ts - t < POSTA_STESSA_MS) continue;
    ultima.set(k, v.ts);
    tenute.push(v);
  }
  const out = tenute.reverse().slice(0, POSTA_MAX);
  const uguale = out.length === a.length && out.every((v, i) => chiavePosta(v) === chiavePosta(a[i]) && v.testo === a[i].testo);
  return uguale ? a : out;
}

/** Aggiunge una frase alla posta (mandata o ricevuta). */
export function conPosta(a: Archivio, v: VocePosta): Archivio {
  const posta = unisciPosta(a.posta, [v], a.azzerato);
  return posta === a.posta ? a : { ...a, posta };
}

// --- dettagli dei fiori -----------------------------------------------------------

function dettagliValidi(x: unknown): Record<string, DettaglioFiore> {
  if (!isObj(x)) return {};
  const out: Record<string, DettaglioFiore> = {};
  for (const [id, d] of Object.entries(x)) {
    if (isObj(d) && isNum(d.a) && isNum(d.b)) out[id] = { a: d.a, b: d.b, ultima: d.ultima === 'a' || d.ultima === 'b' ? d.ultima : null };
  }
  return out;
}

/** Ricorda punti di ciascuno e ultima cella di una partita finita (tiene solo le voci ancora nello storico). */
export function conDettaglioFiore(a: Archivio, p: StatoPartita): Archivio {
  if (!p.finita) return a;
  const id = voceStorico(p).id;
  let ultima: DettaglioFiore['ultima'] = null;
  let ts = -1;
  for (const c of Object.values(p.celle)) {
    if (c && c.v && c.ts > ts) {
      ts = c.ts;
      ultima = c.da;
    }
  }
  const d: DettaglioFiore = { a: p.contatori?.a?.punti ?? 0, b: p.contatori?.b?.punti ?? 0, ultima };
  const prima = a.dettagliFiori?.[id];
  if (prima && prima.a === d.a && prima.b === d.b && prima.ultima === d.ultima) return a;
  const ids = new Set(a.storico.map((v) => v.id));
  const tenuti = Object.fromEntries(Object.entries(a.dettagliFiori ?? {}).filter(([k]) => ids.has(k)));
  return { ...a, dettagliFiori: { ...tenuti, [id]: d } };
}

// --- validazione ------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isGriglia = (x: unknown) => Array.isArray(x) && x.length === 81 && x.every(isNum);

function partitaValida(x: unknown): StatoPartita | null {
  if (!isObj(x) || !isObj(x.puzzle) || !isNum(x.iniziata)) return null;
  const p = x.puzzle;
  if (!isGriglia(p.dati) || !isGriglia(p.soluzione) || typeof p.modalita !== 'string') return null;
  return { ...(x as unknown as StatoPartita), celle: isObj(x.celle) ? (x.celle as StatoPartita['celle']) : {}, secondi: isNum(x.secondi) ? x.secondi : 0 };
}

function voceValida(x: unknown): x is VoceStorico {
  return isObj(x) && typeof x.id === 'string' && isNum(x.iniziata) && isNum(x.aggiornata);
}

function soloStringhe(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((t): t is string => typeof t === 'string') : [];
}

function ioValido(x: unknown): Archivio['io'] {
  return isObj(x) && typeof x.nome === 'string' && typeof x.frase === 'string' ? { nome: x.nome, frase: x.frase } : null;
}

/** Riempie i campi mancanti o di tipo sbagliato con i default; scarta voci/partite invalide.
 *  I campi sconosciuti (di una versione più alta) passano intatti: i noti, validati, li sovrascrivono. */
function normalizza(d: Obj): Archivio {
  const imp = isObj(d.impostazioni) ? d.impostazioni : {};
  const def = ARCHIVIO_VUOTO.impostazioni;
  const a: Archivio = {
    ...d,
    versione: isNum(d.versione) ? d.versione : VERSIONE_ARCHIVIO,
    io: ioValido(d.io),
    partner: typeof d.partner === 'string' ? d.partner : '',
    partita: partitaValida(d.partita),
    storico: Array.isArray(d.storico) ? d.storico.filter(voceValida) : [],
    azzerato: isNum(d.azzerato) && d.azzerato > 0 ? d.azzerato : 0,
    tappeViste: soloStringhe(d.tappeViste),
    capitoliVisti: normalizzaVisti(d.capitoliVisti),
    ecoViste: soloStringhe(d.ecoViste),
    posta: unisciPosta([], d.posta),
    dettagliFiori: dettagliValidi(d.dettagliFiori),
    impostazioni: {
      mostraErrori: typeof imp.mostraErrori === 'boolean' ? imp.mostraErrori : def.mostraErrori,
      vibrazione: typeof imp.vibrazione === 'boolean' ? imp.vibrazione : def.vibrazione,
    },
  };
  return filtra(a);
}

// --- migrazione ---------------------------------------------------------------

/** PASSI[n] porta i dati dalla versione n alla n+1. */
const PASSI: Record<number, (d: Obj) => Obj> = {
  // 0 → 1: chiavi sparse di T1 ({ io, partner, partita, errori, storico? }) nella forma unica.
  0: (d) => {
    const partita = partitaValida(d.partita);
    let storico = Array.isArray(d.storico) ? d.storico.filter(voceValida) : [];
    // una partita di T1 già toccata entra nel giardino (finita = fiore, altrimenti germoglio)
    if (partita && (partita.finita || Object.keys(partita.celle).length > 0)) {
      storico = unisciStorico(storico, [voceStorico(partita)]);
    }
    return {
      versione: 1,
      io: d.io,
      partner: d.partner,
      partita,
      storico,
      azzerato: 0,
      tappeViste: [],
      impostazioni: { mostraErrori: typeof d.errori === 'boolean' ? d.errori : true, vibrazione: true },
    };
  },
  // 1 → 2 (T5, capitoli): chi aveva visto l'arrivo di Semina (`semina-5`) ha visto i capitoli 0..5, ma
  // SOLO il ruolo di `io` (tappeViste era unito per coppia: non dice se l'altro l'ha visto davvero).
  1: (d) => {
    const capitoliVisti: CapitoliVisti = { a: [], b: [] };
    const io = ioValido(d.io);
    if (io && soloStringhe(d.tappeViste).includes('semina-5')) {
      capitoliVisti[ruoloDiNome(io.nome)] = Array.from({ length: SEMINA_ARRIVA_A + 1 }, (_, k) => chiaveCapitolo(k));
    }
    return { ...d, capitoliVisti, ecoViste: [] };
  },
};

/** Porta qualsiasi dato (anche corrotto) a un Archivio valido alla versione corrente. Mai lancia. */
export function migra(dati: unknown): Archivio {
  if (!isObj(dati)) return copiaVuoto();
  let d: Obj = dati;
  let v = isNum(d.versione) ? Math.floor(d.versione) : 0;
  try {
    while (v < VERSIONE_ARCHIVIO) {
      const passo = PASSI[v];
      if (!passo) return copiaVuoto();
      d = passo(d);
      v++;
      d.versione = v;
    }
    return normalizza(d);
  } catch {
    return copiaVuoto();
  }
}

function copiaVuoto(): Archivio {
  const v = ARCHIVIO_VUOTO;
  return { ...v, storico: [], tappeViste: [], capitoliVisti: { a: [], b: [] }, ecoViste: [], impostazioni: { ...v.impostazioni }, posta: [], dettagliFiori: {} };
}

// --- storage ------------------------------------------------------------------

function storageDefault(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

function leggiJson(s: Storage, chiave: string): unknown {
  try {
    const t = s.getItem(chiave);
    return t === null ? undefined : JSON.parse(t);
  } catch {
    return undefined;
  }
}

/** Legge l'archivio (importando e poi rimuovendo le chiavi della versione 0). Sempre valido, mai lancia. */
export function carica(storage: Storage | undefined = storageDefault()): Archivio {
  if (!storage) return copiaVuoto();
  const salvato = leggiJson(storage, CHIAVE_ARCHIVIO);
  if (salvato !== undefined) return migra(salvato);

  const v0: Obj = { versione: 0 };
  let trovate = false;
  for (const [campo, chiave] of Object.entries(CHIAVI_V0)) {
    const x = leggiJson(storage, chiave);
    if (x !== undefined) {
      v0[campo] = x;
      trovate = true;
    }
  }
  const a = migra(trovate ? v0 : undefined);
  // rimuove le chiavi vecchie solo se il nuovo archivio è stato scritto davvero
  if (trovate && salva(a, storage)) {
    for (const chiave of Object.values(CHIAVI_V0)) {
      try {
        storage.removeItem(chiave);
      } catch {
        /* pazienza: verranno ignorate, l'archivio esiste già */
      }
    }
  }
  return a;
}

/** Scrive l'archivio; non propaga errori (quota, navigazione privata). true se scritto. */
export function salva(a: Archivio, storage: Storage | undefined = storageDefault()): boolean {
  if (!storage) return false;
  try {
    const testo = JSON.stringify(a);
    storage.setItem(CHIAVE_ARCHIVIO, testo);
    // copia di sicurezza in IndexedDB (solo nel browser, non nei test con storage finto)
    if (typeof localStorage !== 'undefined' && storage === localStorage) void specchiaInIndexedDB(testo);
    return true;
  } catch {
    return false;
  }
}

// --- azzeramento e storico ---------------------------------------------------

/** Applica il filtro `iniziata >= azzerato` a storico e partita; stesso oggetto se non cambia nulla. */
function filtra(a: Archivio): Archivio {
  if (!a.azzerato) return a;
  const storico = a.storico.filter((v) => v.iniziata >= a.azzerato);
  const chiudi = a.partita !== null && a.partita.iniziata < a.azzerato;
  const posta = unisciPosta(a.posta ?? [], [], a.azzerato);
  if (storico.length === a.storico.length && !chiudi && posta === a.posta) return a;
  return { ...a, storico, partita: chiudi ? null : a.partita, posta };
}

/** azzerato = max(attuale, nuovo); se cresce svuota tappe, capitoli (di entrambi) ed eco; filtra storico e partita. */
export function applicaAzzeramento(a: Archivio, azzerato: number): Archivio {
  if (!isNum(azzerato) || azzerato <= a.azzerato) return filtra(a);
  // con le tappe ripartono anche gli sblocchi visti e i loro regali in attesa (campi aggiunti in T3)
  return filtra({
    ...a,
    azzerato,
    tappeViste: [],
    capitoliVisti: { a: [], b: [] },
    ecoViste: [],
    sbloccatiVisti: [],
    regaliBonus: 0,
  });
}

/** Unisce lo storico ricevuto dal partner, rispettando prima il suo eventuale azzeramento. */
export function unisciStoricoRemoto(a: Archivio, storicoRemoto: VoceStorico[], azzeratoRemoto?: number): Archivio {
  const b = azzeratoRemoto !== undefined ? applicaAzzeramento(a, azzeratoRemoto) : a;
  const remoto = Array.isArray(storicoRemoto) ? storicoRemoto.filter(voceValida) : [];
  const storico = unisciStorico(b.storico, remoto).filter((v) => v.iniziata >= b.azzerato);
  return { ...b, storico };
}

/** Inserisce o aggiorna la voce della partita; ignorata se la partita precede l'azzeramento. */
export function aggiornaStorico(a: Archivio, partita: StatoPartita): Archivio {
  if (partita.iniziata < a.azzerato) return a;
  return { ...a, storico: unisciStorico(a.storico, [voceStorico(partita)]) };
}
