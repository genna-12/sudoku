// Il lettore dei capitoli (puro TS, niente React): coda congelata all'apertura, foglio "Adesso/Dopo",
// avanzamento, segno "visto" con i regali. App tiene un `Lettore | null` e deriva da qui cosa mostrare.
import { capitolo } from '../config/capitoli';
import type { Capitolo } from '../config/capitoli';
import type { Archivio } from '../stato/archivio';
import { codaCapitoli, regaliNuovi, segnaVisto, vistiDi } from './capitoli';
import type { Ruolo } from './capitoli';
import { regaliBonusDi } from './regole';

/** Da quanti arretrati in su, dopo una vittoria, si chiede prima "Li leggi adesso?". */
export const ARRETRATI_DA_CHIEDERE = 4;
/** Festa sulla griglia prima del capitolo (ms). */
export const FESTA_MS = 900;
/** Uscita del lettore prima di smontarlo (ms). */
export const USCITA_MS = 150;

/** La carta di vittoria salvata alla fine della partita: resta giusta anche se intanto ne parte un'altra. */
export interface Riassunto {
  iniziata: number;
  secondi: number;
  puntiMiei: number;
  puntiSuoi: number;
  bonus: number;
}

export interface Lettore {
  /** fiori dei capitoli da leggere, congelati all'apertura (la coda non cresce mentre si legge) */
  coda: number[];
  /** posizione del capitolo aperto nella coda */
  pos: number;
  origine: 'vittoria' | 'home';
  /** foglio "Hai N capitoli da leggere. Li leggi adesso?" prima del primo */
  chiedi: boolean;
  /** era dell'archivio all'apertura: se arriva un azzeramento il lettore si chiude */
  azzerato: number;
  /** solo dalla vittoria: la carta da mostrare alla fine */
  riassunto?: Riassunto;
}

/** Apre il lettore sulla coda di adesso (null se non c'è niente da leggere). */
export function apriLettore(
  fiori: number,
  visti: readonly string[],
  origine: Lettore['origine'],
  azzerato: number,
  riassunto?: Riassunto,
): Lettore | null {
  const coda = codaCapitoli(fiori, visti).map((c) => c.fiore);
  if (!coda.length) return null;
  const l: Lettore = { coda, pos: 0, origine, chiedi: origine === 'vittoria' && coda.length >= ARRETRATI_DA_CHIEDERE, azzerato };
  if (riassunto) l.riassunto = riassunto;
  return l;
}

/** Il capitolo da mostrare adesso (null mentre c'è il foglio "Adesso/Dopo" o a coda finita). */
export function capitoloDelLettore(l: Lettore | null): Capitolo | null {
  if (!l || l.chiedi) return null;
  return capitolo(l.coda[l.pos] ?? -1) ?? null;
}

/** "Adesso": via il foglio, si legge dal primo. */
export function leggiAdesso(l: Lettore): Lettore {
  return l.chiedi ? { ...l, chiedi: false } : l;
}

/** Dopo "Continua": il capitolo successivo, o null se la coda è finita. */
export function avanza(l: Lettore): Lettore | null {
  return l.pos + 1 < l.coda.length ? { ...l, pos: l.pos + 1 } : null;
}

/**
 * Segna visto il capitolo `fiore` per `ruolo` e mette da parte i suggerimenti dei capitoli-regalo
 * nuovi (`regaliBonus`, accreditati alla prossima partita). `a` è già unito col remoto: se un altro
 * dispositivo dello stesso ruolo l'ha già letto, niente secondo regalo. Stesso archivio se non cambia.
 */
export function conCapitoloVisto(a: Archivio, ruolo: Ruolo, fiore: number): Archivio {
  const prima = vistiDi(a.capitoliVisti, ruolo);
  const cv = segnaVisto(a.capitoliVisti, ruolo, fiore);
  if (cv === a.capitoliVisti) return a;
  const regali = regaliNuovi(prima, vistiDi(cv, ruolo));
  return regali ? { ...a, capitoliVisti: cv, regaliBonus: regaliBonusDi(a.regaliBonus) + regali } : { ...a, capitoliVisti: cv };
}
