import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ICE_SERVERS } from '../config/ice';
import { _azzeraCacheIce, caricaIce, TIMEOUT_ICE_MS } from './ice';

const URL = 'https://worker.example';
const TURN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' },
];

function risposta(corpo: unknown, stato = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status: stato }));
}

describe('caricaIce', () => {
  beforeEach(() => _azzeraCacheIce());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('usa i server del Worker, con quelli statici in coda, e li tiene in cache', async () => {
    const f = vi.fn(() => risposta({ iceServers: TURN }));
    vi.stubGlobal('fetch', f);
    const r = await caricaIce(URL);
    expect(r.fonte).toBe('cloudflare');
    expect(r.server).toEqual([...TURN, ...ICE_SERVERS]);
    expect(f).toHaveBeenCalledWith(`${URL}/ice`, expect.anything());
    await caricaIce(URL);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('risposta senza iceServers → statici, e al giro dopo riprova', async () => {
    const f = vi.fn(() => risposta({ iceServers: null, motivo: 'secrets TURN mancanti' }));
    vi.stubGlobal('fetch', f);
    expect(await caricaIce(URL)).toEqual({ server: ICE_SERVERS, fonte: 'statico' });
    await caricaIce(URL);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('errore HTTP o di rete → statici', async () => {
    vi.stubGlobal('fetch', vi.fn(() => risposta({ errore: 'percorso sconosciuto' }, 404)));
    expect((await caricaIce(URL)).fonte).toBe('statico');
    _azzeraCacheIce();
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
    expect((await caricaIce(URL)).fonte).toBe('statico');
  });

  it('timeout di 4 s → statici', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: string, o: RequestInit) =>
          new Promise((_, rifiuta) => o.signal?.addEventListener('abort', () => rifiuta(new DOMException('abort', 'AbortError')))),
      ),
    );
    const p = caricaIce(URL);
    await vi.advanceTimersByTimeAsync(TIMEOUT_ICE_MS + 10);
    expect(await p).toEqual({ server: ICE_SERVERS, fonte: 'statico' });
  });

  it('URL vuoto → statici senza fetch', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await caricaIce('')).toEqual({ server: ICE_SERVERS, fonte: 'statico' });
    expect(f).not.toHaveBeenCalled();
  });
});
