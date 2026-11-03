/// <reference types="@cloudflare/workers-types" />
// Memoria condivisa: una chiave per coppia (hash della frase), un JSON per valore.
// GET  /archivio/:chiave      → { valore: <json> | null, aggiornato: <ms> | null }
// PUT  /archivio/:chiave      → salva il JSON del body (max 512 KB); risponde { ok: true, aggiornato }
// Nessuna autenticazione oltre alla chiave: chi conosce la frase conosce la stanza, come nel gioco.

export interface Env {
  ARCHIVI: KVNamespace;
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
