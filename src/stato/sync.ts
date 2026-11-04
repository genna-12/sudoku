// Memoria condivisa (logica pura): il Worker è un terzo "dispositivo" che passa dallo stesso merge
// del P2P. Nessun DOM, nessuna rete: le chiamate le fa src/ui/useSync.ts.
import { INTERVALLO_SYNC_MS } from '../config/sync';
import { normalizzaFrase } from '../net/logica';
import { unisci } from './index';
import { VERSIONE_ARCHIVIO, migra, normalizzaVisti, unisciPosta, unisciStoricoRemoto, unisciVisti } from './archivio';
import type { Archivio, CapitoliVisti, VocePosta } from './archivio';
import type { StatoPartita, VoceStorico } from './types';

/** Versione dei dati di questo client: un client più vecchio di quella sul Worker legge soltanto. */
export const VERSIONE_DATI = 2;

/** Quello che sta sul Worker: niente nome, frase o impostazioni. */
export interface PayloadSync {
  versione: 1;
  /** 2 da T5 (capitoli); assente = 1 */
  versioneDati: number;
  storico: VoceStorico[];
  azzerato: number;
  partita: StatoPartita | null;
  capitoliVisti: CapitoliVisti;
  /** la cassetta della posta (T7): assente se vuota; i client vecchi la ricopiano intatta */
  posta?: VocePosta[];
  aggiornato: number;
  /** campi di versioni più nuove: si ricopiano intatti quando si scrive */
  [extra: string]: unknown;
}

/** Campi del payload che questo client conosce (`tappeViste` di T2-T4 esce dal payload). */
const NOTI = new Set(['versione', 'versioneDati', 'storico', 'azzerato', 'partita', 'capitoliVisti', 'posta', 'aggiornato', 'tappeViste']);

function sconosciuti(x: unknown): Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return {};
  return Object.fromEntries(Object.entries(x).filter(([k]) => !NOTI.has(k)));
}

/** Chiave remota: primi 40 hex di sha256 della frase normalizzata come per la stanza P2P (che ne usa 20). */
export async function chiaveSync(frase: string, subtleDato?: SubtleCrypto | null): Promise<string> {
  const subtle = subtleDato === undefined ? globalThis.crypto?.subtle : subtleDato;
  if (!subtle) throw new Error('crypto.subtle non disponibile');
  const hash = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(normalizzaFrase(frase))));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

/**
 * Payload da scrivere. `remoto` = l'ultimo letto dal Worker: i suoi campi sconosciuti si ricopiano,
 * così un client vecchio non cancella i campi di uno più nuovo.
 */
export function payloadDa(a: Archivio, ora = Date.now(), remoto?: unknown): PayloadSync {
  return {
    ...sconosciuti(remoto),
    versione: 1,
    versioneDati: VERSIONE_DATI,
    storico: a.storico,
    azzerato: a.azzerato,
    partita: a.partita,
    capitoliVisti: a.capitoliVisti,
    ...(a.posta?.length ? { posta: a.posta } : {}),
    aggiornato: ora,
  };
}

/**
 * Valida un payload arrivato dal Worker (stessa validazione dell'archivio locale, senza i PASSI di
 * migrazione: i capitoli visti si leggono così come sono). Tiene `versioneDati` remota e i campi
 * sconosciuti. null se non è un oggetto.
 */
export function leggiPayload(x: unknown): PayloadSync | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const d = x as Record<string, unknown>;
  const a = migra({ versione: VERSIONE_ARCHIVIO, storico: d.storico, azzerato: d.azzerato, partita: d.partita, capitoliVisti: d.capitoliVisti, posta: d.posta });
  const v = typeof d.versioneDati === 'number' && Number.isFinite(d.versioneDati) ? d.versioneDati : 1;
  return { ...payloadDa(a, typeof d.aggiornato === 'number' ? d.aggiornato : 0, d), versioneDati: v };
}

/** Si scrive sul Worker solo se i dati lì non sono di una versione più nuova di questo client. */
export function puoScrivere(remoto: PayloadSync | null, locale: number = VERSIONE_DATI): boolean {
  return !remoto || !(remoto.versioneDati > locale);
}

function canonico(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonico).join(',')}]`;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

/** Impronta del contenuto noto (senza `aggiornato`, versioneDati ed extra; chiavi ordinate): uguale = niente da scrivere. */
export function impronta(p: PayloadSync | null): string {
  if (!p) return '';
  return canonico({
    versione: 1,
    storico: p.storico,
    azzerato: p.azzerato,
    partita: p.partita,
    capitoliVisti: normalizzaVisti(p.capitoliVisti),
    ...(p.posta?.length ? { posta: p.posta } : {}),
  });
}

/**
 * Unisce la memoria remota a quella locale con le stesse regole del P2P: azzeramento massimo (filtra
 * storico e partita), storico per id, partita con `unisci` (stesso puzzle → celle; altrimenti la più
 * recente), capitoli visti uniti PER RUOLO (quelli remoti solo se della stessa "era" di azzeramento).
 * Commutativa e idempotente sul contenuto: due dispositivi convergono senza rimbalzi di scritture.
 */
export function unisciRemoto(
  locale: Archivio,
  remoto: PayloadSync | null,
): { archivio: Archivio; cambiatoLocale: boolean; daScrivere: boolean } {
  const r = remoto ? leggiPayload(remoto) : null;
  if (!r) return { archivio: locale, cambiatoLocale: false, daScrivere: true };
  const a = unisciStoricoRemoto(locale, r.storico, r.azzerato);
  const rp = r.partita && r.partita.iniziata >= a.azzerato ? r.partita : null;
  const partita = a.partita && rp ? unisci(a.partita, rp) : (a.partita ?? rp);
  const capitoliVisti = r.azzerato >= a.azzerato ? unisciVisti(a.capitoliVisti, r.capitoliVisti) : a.capitoliVisti;
  // posta: unione per chiave, filtrata per l'era di azzeramento (come lo storico)
  const posta = unisciPosta(a.posta ?? [], r.posta, a.azzerato);
  const unito: Archivio = { ...a, partita, capitoliVisti, posta };
  const iUnito = impronta(payloadDa(unito));
  const cambiatoLocale = iUnito !== impronta(payloadDa(locale));
  return {
    archivio: cambiatoLocale ? unito : locale,
    cambiatoLocale,
    daScrivere: iUnito !== impronta(remoto),
  };
}

/** urgente: partita nuova/finita, ricomincia, importa · cambio: mosse e tick · nascosta: app in background. */
export type MotivoScrittura = 'urgente' | 'cambio' | 'nascosta';

/** Fra quanti ms scrivere (0 = subito). `ultima` = ultimo contatto col Worker in questa sessione. */
export function decidiScrittura(ultima: number | null, ora: number, motivo: MotivoScrittura): number {
  if (motivo !== 'cambio' || ultima === null) return 0;
  return Math.max(0, ultima + INTERVALLO_SYNC_MS - ora);
}

/**
 * Che tipo di cambio c'è stato tra due versioni dell'archivio (per la memoria condivisa).
 * `cancella`: la partita in corso è stata chiusa a mano (si scrive senza rileggere, se no tornerebbe).
 */
export function motivoCambio(prima: Archivio, dopo: Archivio): MotivoScrittura | 'cancella' | null {
  if (
    prima.storico === dopo.storico &&
    prima.azzerato === dopo.azzerato &&
    prima.partita === dopo.partita &&
    prima.capitoliVisti === dopo.capitoliVisti &&
    prima.posta === dopo.posta
  ) {
    return null;
  }
  if (dopo.azzerato > prima.azzerato) return 'urgente';
  const p = prima.partita;
  const d = dopo.partita;
  if (p && !d) return 'cancella';
  if (d && (!p || p.iniziata !== d.iniziata || p.puzzle.seed !== d.puzzle.seed || p.puzzle.modalita !== d.puzzle.modalita)) return 'urgente';
  if (d?.finita && !p?.finita) return 'urgente';
  return 'cambio';
}
