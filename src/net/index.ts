// Stanza P2P con PeerJS. La logica (ruoli, riconnessione, battito) sta in ./logica.ts.
import { Peer, type DataConnection, type PeerOptions } from 'peerjs';
import { ICE_SERVERS } from '../config/ice';
import { caricaIce } from './ice';
import { creaStanza, type ConnMinima, type CreaPeer, type PeerMinimo } from './logica';
import { creaGestoreToken } from './token';
import type { ApriStanza } from './types';

export type { Messaggio, Stanza, StatoConnessione } from './types';

/** Ultime righe di log, leggibili dal menù Diagnostica (anche sul telefono, senza console). */
export const REGISTRO: string[] = [];
const MAX_REGISTRO = 80;
function ora(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}
const testoDi = (x: unknown) => (typeof x === 'string' ? x : x instanceof Error ? x.message : JSON.stringify(x));
const log = (...a: unknown[]) => {
  console.log('[stanza]', ...a);
  REGISTRO.push(`${ora()} ${a.map(testoDi).join(' ')}`);
  if (REGISTRO.length > MAX_REGISTRO) REGISTRO.splice(0, REGISTRO.length - MAX_REGISTRO);
};

/** Token PeerJS del dispositivo (uno per scheda che tiene il lucchetto): vedi token.ts. */
const gestoreToken = typeof window !== 'undefined' ? creaGestoreToken() : null;

/** Server PeerJS: quello pubblico di default, oppure uno locale via variabili VITE_PEER_*. */
function opzioniPeer(iceServers: RTCIceServer[]): PeerOptions {
  const env = import.meta.env;
  const host = env.VITE_PEER_HOST as string | undefined;
  const base: PeerOptions = {
    config: { iceServers },
    debug: 1,
    // gli errori di PeerJS (rete, ID preso, partner assente) finiscono nella Diagnostica, non in console.error
    logFunction: (_livello: unknown, ...resto: unknown[]) => {
      const testo = resto.map(testoDi);
      // partner assente: lo dice già la stanza ("a non c’è"); lo squillo di a senza b ne farebbe una riga ogni 30 s
      if (testo.some((t) => /Could not connect to peer/.test(t))) return;
      log('peerjs', ...testo);
    },
  } as PeerOptions;
  if (gestoreToken) base.token = gestoreToken.token();
  if (!host) return base;
  return {
    ...base,
    host,
    port: Number(env.VITE_PEER_PORT),
    path: (env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: env.VITE_PEER_SECURE === 'true',
  };
}

/** Errori della connessione dati che la chiudono davvero; gli altri (message-too-big, not-open-yet) no. */
const ERRORI_CHE_CHIUDONO = new Set(['negotiation-failed', 'connection-closed']);

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
      c.on('iceStateChanged', (st) => {
        log('ice', c.peer.slice(-2), st);
        g.ice?.(st);
      });
      c.on('open', () => g.aperta());
      c.on('data', (d) => g.dati(d));
      c.on('close', () => g.chiusa());
      c.on('error', (e) => {
        log('errore connessione dati', e.type, e.message);
        if (ERRORI_CHE_CHIUDONO.has(e.type)) g.chiusa();
      });
    },
  };
}

/** Il socket di segnalazione di PeerJS è aperto? (PeerJS non lo espone: si legge dal suo Socket.) */
function socketAperto(p: Peer): boolean | undefined {
  const s = (p as unknown as { socket?: { _wsOpen?: () => boolean } }).socket;
  return typeof s?._wsOpen === 'function' ? s._wsOpen() : undefined;
}

const creaPeerCon = (ice: () => RTCIceServer[], ultimo: (p: Peer) => void): CreaPeer => (id, g) => {
  const p = new Peer(id, opzioniPeer(ice()));
  ultimo(p);
  p.on('open', () => g.aperto());
  p.on('error', (e) => g.errore(e.type, e.message));
  p.on('connection', (c) => g.connessione(adattaConn(c)));
  p.on('disconnected', () => g.disconnesso());
  const minimo: PeerMinimo = {
    get distrutto() {
      return p.destroyed;
    },
    get disconnesso() {
      return p.disconnected;
    },
    get segnaleAperto() {
      try {
        return socketAperto(p);
      } catch {
        return undefined;
      }
    },
    connetti: (dest) => {
      if (p.disconnected || p.destroyed) return null;
      const c = p.connect(dest, { reliable: true, serialization: 'json' });
      return c ? adattaConn(c) : null;
    },
    distruggi: () => p.destroy(),
    scollega: () => p.disconnect(),
    riconnetti: () => {
      if (p.disconnected && !p.destroyed) p.reconnect();
    },
  };
  return minimo;
};

export const apriStanza: ApriStanza = (frase, nome, statoIniziale, ruolo, ice) => {
  log(ice?.fonte === 'cloudflare' ? `ice: cloudflare (${ice.server.length} server)` : 'ice: statico');
  let iceAttuali = ice?.server ?? ICE_SERVERS;
  let peerAttuale: Peer | null = null;
  const aggiornaIce = (forza: boolean) => {
    if (ice?.fonte !== 'cloudflare' && !forza) return;
    caricaIce(undefined, { forza })
      .then((r) => {
        if (r.server === iceAttuali) return;
        iceAttuali = r.server;
        // i server nuovi valgono per le prossime connessioni (PeerJS li legge a ogni RTCPeerConnection)
        if (peerAttuale && !peerAttuale.destroyed) peerAttuale.options.config = { ...peerAttuale.options.config, iceServers: r.server };
        log(`ice rinnovati: ${r.fonte}`);
      })
      .catch(() => {});
  };
  const creaPeer = creaPeerCon(
    () => iceAttuali,
    (p) => {
      peerAttuale = p;
      // a ogni Peer nuovo: se le credenziali TURN in cache sono scadute (12 h) si rinnovano
      aggiornaIce(false);
    },
  );
  const s = creaStanza({ frase, nome, statoIniziale, creaPeer, log, ruolo, rinfrescaIce: () => aggiornaIce(true) });

  // telefono: la pagina va e torna (iOS la sospende); la rete cambia
  const suVisibilita = () => {
    if (document.visibilityState === 'visible') s.primoPiano('visibile');
    else s.sospendi();
  };
  const suPageshow = () => s.primoPiano('pageshow');
  const suPagehide = () => s.sospendi();
  const suOnline = () => s.primoPiano('online');
  const conDom = typeof document !== 'undefined' && typeof window !== 'undefined';
  if (conDom) {
    document.addEventListener('visibilitychange', suVisibilita);
    window.addEventListener('pageshow', suPageshow);
    window.addEventListener('pagehide', suPagehide);
    window.addEventListener('online', suOnline);
    if (document.visibilityState === 'hidden') s.sospendi();
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
        window.removeEventListener('pageshow', suPageshow);
        window.removeEventListener('pagehide', suPagehide);
        window.removeEventListener('online', suOnline);
      }
      chiudi();
    },
  };
};
