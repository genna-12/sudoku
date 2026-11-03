// Stanza P2P con PeerJS. La logica (ruoli, riconnessione, heartbeat) sta in ./logica.ts.
import { Peer, type DataConnection, type PeerOptions } from 'peerjs';
import { ICE_SERVERS } from '../config/ice';
import { creaStanza, type ConnMinima, type CreaPeer } from './logica';
import type { ApriStanza } from './types';

export type { Messaggio, Stanza, StatoConnessione } from './types';

const log = (...a: unknown[]) => console.log('[stanza]', ...a);

/** Server PeerJS: quello pubblico di default, oppure uno locale via variabili VITE_PEER_*. */
function opzioniPeer(): PeerOptions {
  const env = import.meta.env;
  const host = env.VITE_PEER_HOST as string | undefined;
  const base: PeerOptions = { config: { iceServers: ICE_SERVERS }, debug: 1 };
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

const creaPeer: CreaPeer = (id, g) => {
  const p = new Peer(id, opzioniPeer());
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

export const apriStanza: ApriStanza = (frase, nome, statoIniziale, ruolo) => {
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
