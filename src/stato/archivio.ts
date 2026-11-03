// Archivio locale: tutto ciò che persiste sul dispositivo, in UNA chiave localStorage versionata.
// Aggiungere un campo = alzare VERSIONE_ARCHIVIO e aggiungere un passo in PASSI (storico e tappe
// viste non si toccano mai). Puro TS: lo storage si passa come parametro (default localStorage).
import { unisciStorico, voceStorico } from './index';
import type { StatoPartita, VoceStorico } from './types';

export interface Archivio {
  versione: number;
  io: { nome: string; frase: string } | null;
  partner: string;
  partita: StatoPartita | null;
  storico: VoceStorico[];
  /** Date.now() dell'ultimo "ricomincia da zero" (0 = mai): voci con iniziata < azzerato scartate. */
  azzerato: number;
  /** chiavi `${chi}-${partite}` delle tappe della storia già mostrate */
  tappeViste: string[];
  impostazioni: { mostraErrori: boolean; vibrazione: boolean };
  /** Campi di versioni più nuove dell'app: non si leggono, ma `migra` li conserva e `salva` li riscrive. */
  [extra: string]: unknown;
}

export const VERSIONE_ARCHIVIO = 1;
export const CHIAVE_ARCHIVIO = 'sudoku-coppia-archivio';

export const ARCHIVIO_VUOTO: Archivio = Object.freeze({
  versione: VERSIONE_ARCHIVIO,
  io: null,
  partner: '',
  partita: null,
  storico: Object.freeze([]) as unknown as VoceStorico[],
  azzerato: 0,
  tappeViste: Object.freeze([]) as unknown as string[],
  impostazioni: Object.freeze({ mostraErrori: true, vibrazione: true }),
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
    tappeViste: Array.isArray(d.tappeViste) ? d.tappeViste.filter((t): t is string => typeof t === 'string') : [],
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
  return { ...v, storico: [], tappeViste: [], impostazioni: { ...v.impostazioni } };
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
    storage.setItem(CHIAVE_ARCHIVIO, JSON.stringify(a));
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
  if (storico.length === a.storico.length && !chiudi) return a;
  return { ...a, storico, partita: chiudi ? null : a.partita };
}

/** azzerato = max(attuale, nuovo); se cresce svuota le tappe viste; filtra storico e partita. */
export function applicaAzzeramento(a: Archivio, azzerato: number): Archivio {
  if (!isNum(azzerato) || azzerato <= a.azzerato) return filtra(a);
  // con le tappe ripartono anche gli sblocchi visti e i loro regali in attesa (campi aggiunti in T3)
  return filtra({ ...a, azzerato, tappeViste: [], sbloccatiVisti: [], regaliBonus: 0 });
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
