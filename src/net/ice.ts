// Server ICE per la sessione: TURN di Cloudflare (credenziali temporanee dal Worker, GET /ice)
// con i server statici di config in coda come riserva; solo statici se il Worker non c'è o non risponde.
import { ICE_SERVERS } from '../config/ice';
import { URL_SYNC } from '../config/sync';

export const TIMEOUT_ICE_MS = 4000;

export interface IceCaricati {
  server: RTCIceServer[];
  fonte: 'cloudflare' | 'statico';
}

/** Le credenziali TURN del Worker durano 24 h: la cache si rinnova dopo 12 h (ricerca 2026-11-11 N3). */
export const SCADENZA_ICE_MS = 12 * 3600 * 1000;

let inCorso: Promise<IceCaricati> | null = null;
let chiestaAlle = 0;

async function chiedi(url: string): Promise<IceCaricati> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_ICE_MS);
  try {
    const r = await fetch(`${url}/ice`, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return { server: ICE_SERVERS, fonte: 'statico' };
    const corpo = (await r.json()) as { iceServers?: RTCIceServer[] | null };
    if (!Array.isArray(corpo.iceServers) || corpo.iceServers.length === 0) return { server: ICE_SERVERS, fonte: 'statico' };
    return { server: [...corpo.iceServers, ...ICE_SERVERS], fonte: 'cloudflare' };
  } catch {
    return { server: ICE_SERVERS, fonte: 'statico' };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Server ICE e loro origine. Una richiesta e poi la cache, che scade dopo 12 h (una PWA può restare
 * in memoria per giorni) o si scarta con `forza` (connessioni dirette che non riescono più).
 */
export function caricaIce(url: string = URL_SYNC, o: { forza?: boolean } = {}): Promise<IceCaricati> {
  if (!url) return Promise.resolve({ server: ICE_SERVERS, fonte: 'statico' });
  if (inCorso && (o.forza || Date.now() - chiestaAlle >= SCADENZA_ICE_MS)) inCorso = null;
  if (!inCorso) {
    chiestaAlle = Date.now();
    // se la richiesta fallisce non resta in cache: al prossimo avvio di stanza si riprova
    const p: Promise<IceCaricati> = chiedi(url).then((r) => {
      if (r.fonte === 'statico' && inCorso === p) inCorso = null;
      return r;
    });
    inCorso = p;
  }
  return inCorso;
}

export async function caricaIceServers(): Promise<RTCIceServer[]> {
  return (await caricaIce()).server;
}

/** solo per i test */
export function _azzeraCacheIce() {
  inCorso = null;
  chiestaAlle = 0;
}
