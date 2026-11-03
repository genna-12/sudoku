// Memoria condivisa (logica pura): il Worker è un terzo "dispositivo" che passa dallo stesso merge
// del P2P. Nessun DOM, nessuna rete: le chiamate le fa src/ui/useSync.ts.
import { INTERVALLO_SYNC_MS } from '../config/sync';
import { normalizzaFrase } from '../net/logica';
import { unisci } from './index';
import { migra, unisciStoricoRemoto } from './archivio';
import type { Archivio } from './archivio';
import type { StatoPartita, VoceStorico } from './types';

/** Quello che sta sul Worker: niente nome, frase o impostazioni. */
export interface PayloadSync {
  versione: 1;
  storico: VoceStorico[];
  azzerato: number;
  partita: StatoPartita | null;
  tappeViste?: string[];
  aggiornato: number;
}

/** Chiave remota: primi 40 hex di sha256 della frase normalizzata come per la stanza P2P (che ne usa 20). */
export async function chiaveSync(frase: string, subtleDato?: SubtleCrypto | null): Promise<string> {
  const subtle = subtleDato === undefined ? globalThis.crypto?.subtle : subtleDato;
  if (!subtle) throw new Error('crypto.subtle non disponibile');
  const hash = new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(normalizzaFrase(frase))));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

export function payloadDa(a: Archivio, ora = Date.now()): PayloadSync {
  return {
    versione: 1,
    storico: a.storico,
    azzerato: a.azzerato,
    partita: a.partita,
    tappeViste: [...a.tappeViste].sort(),
    aggiornato: ora,
  };
}

/** Valida un payload arrivato dal Worker (stessa validazione dell'archivio locale). null se non è un oggetto. */
export function leggiPayload(x: unknown): PayloadSync | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const d = x as Record<string, unknown>;
  const a = migra({ versione: 1, storico: d.storico, azzerato: d.azzerato, partita: d.partita, tappeViste: d.tappeViste });
  return payloadDa(a, typeof d.aggiornato === 'number' ? d.aggiornato : 0);
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

/** Impronta del contenuto (senza `aggiornato`, chiavi ordinate, tappe ordinate): uguale = niente da scrivere. */
export function impronta(p: PayloadSync | null): string {
  if (!p) return '';
  return canonico({
    versione: 1,
    storico: p.storico,
    azzerato: p.azzerato,
    partita: p.partita,
    tappeViste: [...(p.tappeViste ?? [])].sort(),
  });
}

/**
 * Unisce la memoria remota a quella locale con le stesse regole del P2P: azzeramento massimo (filtra
 * storico e partita), storico per id, partita con `unisci` (stesso puzzle → celle; altrimenti la più
 * recente), tappe viste unite (quelle remote solo se della stessa "era" di azzeramento).
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
  const tappe = r.azzerato >= a.azzerato ? [...new Set([...a.tappeViste, ...(r.tappeViste ?? [])])] : a.tappeViste;
  const unito: Archivio = { ...a, partita, tappeViste: tappe.length === a.tappeViste.length ? a.tappeViste : tappe };
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
  if (prima.storico === dopo.storico && prima.azzerato === dopo.azzerato && prima.partita === dopo.partita && prima.tappeViste === dopo.tappeViste) {
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
