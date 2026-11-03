// Server ICE per la sessione: TURN di Cloudflare (credenziali temporanee dal Worker, GET /ice)
// con i server statici di config in coda come riserva; solo statici se il Worker non c'è o non risponde.
import { ICE_SERVERS } from '../config/ice';
import { URL_SYNC } from '../config/sync';

export const TIMEOUT_ICE_MS = 4000;

export interface IceCaricati {
  server: RTCIceServer[];
  fonte: 'cloudflare' | 'statico';
}

let inCorso: Promise<IceCaricati> | null = null;

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

/** Server ICE e loro origine; una sola richiesta per sessione (le credenziali durano 24 h). */
export function caricaIce(url: string = URL_SYNC): Promise<IceCaricati> {
  if (!url) return Promise.resolve({ server: ICE_SERVERS, fonte: 'statico' });
  // se la richiesta fallisce non resta in cache: al prossimo avvio di stanza si riprova
  inCorso ??= chiedi(url).then((r) => {
    if (r.fonte === 'statico') inCorso = null;
    return r;
  });
  return inCorso;
}

export async function caricaIceServers(): Promise<RTCIceServer[]> {
  return (await caricaIce()).server;
}

/** solo per i test */
export function _azzeraCacheIce() {
  inCorso = null;
}
