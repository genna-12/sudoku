/// <reference types="@cloudflare/workers-types" />
// Memoria condivisa: una chiave per coppia (hash della frase), un JSON per valore.
// GET  /archivio/:chiave      → { valore: <json> | null, aggiornato: <ms> | null }
// PUT  /archivio/:chiave      → salva il JSON del body (max 512 KB); risponde { ok: true, aggiornato }
// GET  /ice                  → { iceServers: [...] } con credenziali TURN di Cloudflare Realtime (24 h),
//                               oppure { iceServers: null, motivo } se i secrets mancano o Cloudflare non risponde.
// Nessuna autenticazione oltre alla chiave: chi conosce la frase conosce la stanza, come nel gioco.

export interface Env {
  ARCHIVI: KVNamespace;
  /** secrets (wrangler secret put): chiave TURN di Realtime → TURN e il suo token API */
  TURN_KEY_ID?: string;
  TURN_API_TOKEN?: string;
}

interface ServerIce {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const TTL_TURN_S = 86400;
const CACHE_ICE_MS = 60 * 60 * 1000;
/** cache del modulo (vive finché l'isolate resta caldo): le credenziali durano 24 h, si rinnovano ogni ora */
let cacheIce: { server: ServerIce[]; scade: number } | null = null;

/** La porta 53 è bloccata dai browser (la doc Cloudflare consiglia di toglierla per non aspettare il timeout). */
function senzaPorta53(s: ServerIce): ServerIce | null {
  const lista = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u));
  return lista.length ? { ...s, urls: lista } : null;
}

async function serverIce(env: Env): Promise<{ iceServers: ServerIce[] | null; motivo?: string }> {
  if (!env.TURN_KEY_ID || !env.TURN_API_TOKEN) return { iceServers: null, motivo: 'secrets TURN mancanti' };
  if (cacheIce && cacheIce.scade > Date.now()) return { iceServers: cacheIce.server };
  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL_TURN_S }),
      },
    );
    if (!r.ok) return { iceServers: null, motivo: `cloudflare ${r.status}` };
    const corpo = (await r.json()) as { iceServers?: ServerIce[] | ServerIce };
    const grezzi = Array.isArray(corpo.iceServers) ? corpo.iceServers : corpo.iceServers ? [corpo.iceServers] : [];
    const turn = grezzi.map(senzaPorta53).filter((s): s is ServerIce => s !== null);
    if (!turn.length) return { iceServers: null, motivo: 'risposta senza iceServers' };
    const server: ServerIce[] = [{ urls: 'stun:stun.l.google.com:19302' }, ...turn];
    cacheIce = { server, scade: Date.now() + CACHE_ICE_MS };
    return { iceServers: server };
  } catch (e) {
    return { iceServers: null, motivo: `errore rete: ${(e as Error).message}` };
  }
}

const MAX_BYTES = 512 * 1024;
const ORIGINI = ['https://genna-12.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173'];

function cors(req: Request): HeadersInit {
  const origine = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINI.includes(origine) ? origine : ORIGINI[0],
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function json(req: Request, corpo: unknown, stato = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    if (url.pathname === '/ice') {
      if (req.method !== 'GET') return json(req, { errore: 'metodo non ammesso' }, 405);
      return json(req, await serverIce(env));
    }
    const m = url.pathname.match(/^\/archivio\/([a-f0-9]{20,64})$/);
    if (!m) return json(req, { errore: 'percorso sconosciuto' }, 404);
    const chiave = m[1];

    if (req.method === 'GET') {
      const testo = await env.ARCHIVI.get(chiave, 'text');
      if (!testo) return json(req, { valore: null, aggiornato: null });
      const meta = await env.ARCHIVI.getWithMetadata<{ aggiornato?: number }>(chiave);
      return new Response(`{"valore":${testo},"aggiornato":${meta.metadata?.aggiornato ?? 'null'}}`, {
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) },
      });
    }

    if (req.method === 'PUT') {
      const testo = await req.text();
      if (testo.length > MAX_BYTES) return json(req, { errore: 'troppo grande' }, 413);
      try {
        JSON.parse(testo);
      } catch {
        return json(req, { errore: 'JSON non valido' }, 400);
      }
      const aggiornato = Date.now();
      await env.ARCHIVI.put(chiave, testo, { metadata: { aggiornato } });
      return json(req, { ok: true, aggiornato });
    }

    return json(req, { errore: 'metodo non ammesso' }, 405);
  },
};
