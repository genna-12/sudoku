// Stanza P2P con PeerJS. La logica (ruoli, riconnessione, heartbeat) sta in ./logica.ts.
import { Peer, type DataConnection, type PeerOptions } from 'peerjs';
import { ICE_SERVERS } from '../config/ice';
import { creaStanza, type ConnMinima, type CreaPeer } from './logica';
import type { ApriStanza } from './types';

export type { Messaggio, Stanza, StatoConnessione } from './types';

/** Ultime righe di log, leggibili dal menù Diagnostica (anche sul telefono, senza console). */
export const REGISTRO: string[] = [];
const MAX_REGISTRO = 80;
function ora(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}
const log = (...a: unknown[]) => {
  console.log('[stanza]', ...a);
  REGISTRO.push(`${ora()} ${a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}`);
  if (REGISTRO.length > MAX_REGISTRO) REGISTRO.splice(0, REGISTRO.length - MAX_REGISTRO);
};

/** Server PeerJS: quello pubblico di default, oppure uno locale via variabili VITE_PEER_*. */
function opzioniPeer(iceServers: RTCIceServer[]): PeerOptions {
  const env = import.meta.env;
  const host = env.VITE_PEER_HOST as string | undefined;
  const base: PeerOptions = { config: { iceServers }, debug: 1 };
  if (!host) return base;
  return {
    ...base,
    host,
    port: Number(env.VITE_PEER_PORT),
    path: (env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: env.VITE_PEER_SECURE === 'true',
  };
}

function adattaConn(c: DataConnection): ConnMinima {
  return {
    get peer() {
      return c.peer;
    },
    invia: (d) => c.send(d),
    chiudi: () => c.close(),
    ascolta(g) {
      // stato ICE: dice se il P2P passa davvero (connected/completed) o si ferma (failed → TURN non raggiunto).
      // Evento di PeerJS: vale anche per le connessioni in uscita, dove peerConnection non esiste ancora qui.
      c.on('iceStateChanged', (st) => log('ice', c.peer.slice(-2), st));
      c.on('open', () => g.aperta());
      c.on('data', (d) => g.dati(d));
      c.on('close', () => g.chiusa());
      c.on('error', (e) => {
        log('errore connessione dati', e.type, e.message);
        g.chiusa();
      });
    },
  };
}

const creaPeerCon = (iceServers: RTCIceServer[]): CreaPeer => (id, g) => {
  const p = new Peer(id, opzioniPeer(iceServers));
  p.on('open', () => g.aperto());
  p.on('error', (e) => g.errore(e.type, e.message));
  p.on('connection', (c) => g.connessione(adattaConn(c)));
  p.on('disconnected', () => g.disconnesso());
  return {
    get distrutto() {
      return p.destroyed;
    },
    get disconnesso() {
      return p.disconnected;
    },
    connetti: (dest) => adattaConn(p.connect(dest, { reliable: true, serialization: 'json' })),
    distruggi: () => p.destroy(),
  };
};

export const apriStanza: ApriStanza = (frase, nome, statoIniziale, ruolo, ice) => {
  log(ice?.fonte === 'cloudflare' ? `ice: cloudflare (${ice.server.length} server)` : 'ice: statico');
  const creaPeer = creaPeerCon(ice?.server ?? ICE_SERVERS);
  const s = creaStanza({ frase, nome, statoIniziale, creaPeer, log, ruolo });

  // su telefono: tornando in primo piano (o online) si verifica subito la connessione
  const suVisibilita = () => {
    if (document.visibilityState === 'visible') s.primoPiano();
  };
  const suOnline = () => s.primoPiano();
  const conDom = typeof document !== 'undefined' && typeof window !== 'undefined';
  if (conDom) {
    document.addEventListener('visibilitychange', suVisibilita);
    window.addEventListener('online', suOnline);
  }

  const chiudi = s.chiudi;
  return {
    get ruolo() {
      return s.ruolo;
    },
    get stato() {
      return s.stato;
    },
    on: s.on,
    invia: s.invia,
    chiudi() {
      if (conDom) {
        document.removeEventListener('visibilitychange', suVisibilita);
        window.removeEventListener('online', suOnline);
      }
      chiudi();
    },
  };
};
