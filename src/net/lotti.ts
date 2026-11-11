// Misura dei messaggi e storico a lotti (ricerca 2026-11-11 §6.6, ADR 006).
// Il canale JSON di PeerJS rifiuta i messaggi da 16 300 byte in su ("message-too-big"): lo storico
// completo, con qualche germoglio (partita intera, 2-6 KB l'uno), li supera. Si manda allora in più
// messaggi `storico` di fila, nel formato di sempre: chi riceve fonde ogni lotto con il merge che
// esiste già (commutativo e idempotente), quindi anche un client vecchio li capisce.
import type { Messaggio } from './types';

/** Tetto di un lotto di storico, in byte di JSON (UTF-8). */
export const LOTTO_STORICO_BYTE = 12000;
/** Sopra questa misura un messaggio non si manda (il limite di PeerJS è 16 300). */
export const MAX_MESSAGGIO_BYTE = 15000;

const codifica = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/** Byte del JSON del valore, come li conta PeerJS (UTF-8). */
export function byteJson(v: unknown): number {
  const s = JSON.stringify(v) ?? '';
  return codifica ? codifica.encode(s).length : s.length;
}

type MsgStorico = Extract<Messaggio, { t: 'storico' }>;

/**
 * Spezza un messaggio `storico` in lotti da al massimo `tetto` byte (ognuno un `storico` completo,
 * con lo stesso `azzerato` e lo stesso segno `inoltrato`). L'ordine delle voci resta quello dato.
 * Una voce che da sola supera il tetto va in un lotto tutto suo. Lista vuota: il messaggio così com'è.
 */
export function lottiStorico(m: MsgStorico, tetto = LOTTO_STORICO_BYTE): MsgStorico[] {
  const voci = Array.isArray(m.storico) ? m.storico : [];
  if (voci.length === 0 || byteJson(m) <= tetto) return [m];
  const busta = byteJson({ ...m, storico: [] });
  const lotti: MsgStorico[] = [];
  let corrente: typeof voci = [];
  let peso = busta;
  for (const v of voci) {
    const pv = byteJson(v) + 1; // la virgola fra le voci
    if (corrente.length && peso + pv > tetto) {
      lotti.push({ ...m, storico: corrente });
      corrente = [];
      peso = busta;
    }
    corrente.push(v);
    peso += pv;
  }
  if (corrente.length) lotti.push({ ...m, storico: corrente });
  return lotti;
}
