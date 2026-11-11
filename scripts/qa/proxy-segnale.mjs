// Attrezzi degli E2E della riconnessione (T9 A, ricerca 2026-11-11 §8).
// - Server PeerJS locale come processo figlio (si può uccidere con SIGKILL e far ripartire).
// - Proxy TCP fra i browser (porta di VITE_PEER_PORT, 9000) e il server (9001): riconosce il posto
//   dal parametro `id=` della richiesta di upgrade e sa simulare quello che fa iOS al WebSocket:
//     chiudi    → chiude i due lati (il server vede la chiusura e libera l'ID);
//     fantasma  → chiude solo il lato del browser; il server tiene l'ID fino ad alive_timeout;
//     zombie    → non inoltra più nulla e non chiude nulla (il WebSocket del browser resta OPEN).
// - Script da iniettare nei contesti (`INIT_QA`): pagina nascosta comandabile e canali dati "muti"
//   (open ma morti: send non parte, i messaggi in arrivo si perdono), come dopo una sospensione.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../../node_modules/peer/dist/bin/peerjs.js', import.meta.url));

export function baseStanza(frase) {
  const n = frase.trim().toLowerCase().replace(/\s+/g, ' ');
  return 'sudoku-coppia-' + createHash('sha256').update(n).digest('hex').slice(0, 20);
}

export async function avviaSegnale({ porta = 9000, portaServer = 9001, aliveTimeout = 60000, log = () => {} } = {}) {
  let server = null;
  const coppie = new Set();
  // anche se lo script esce con process.exit (fallisci), il server figlio non resta in giro
  process.on('exit', () => server?.kill('SIGKILL'));

  async function avviaServer() {
    server = spawn(process.execPath, [BIN, '--port', String(portaServer), '--host', '127.0.0.1', '--alive_timeout', String(aliveTimeout)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((ok, ko) => {
      const t = setTimeout(() => ko(new Error('server PeerJS non partito')), 10000);
      server.stdout.on('data', (d) => {
        if (/Started PeerServer/.test(String(d))) {
          clearTimeout(t);
          ok();
        }
      });
      server.on('exit', () => clearTimeout(t));
    });
    log('server PeerJS avviato');
  }

  function uccidiServer() {
    server?.kill('SIGKILL');
    server = null;
    log('server PeerJS ucciso');
  }

  const proxy = net.createServer((cliente) => {
    const c = { id: '', cliente, server: null, inoltra: true };
    coppie.add(c);
    let primo = true;
    cliente.on('data', (d) => {
      if (primo) {
        primo = false;
        const m = /[?&]id=([^&\s]+)/.exec(String(d));
        c.id = m ? decodeURIComponent(m[1]) : '';
        c.server = net.connect(portaServer, '127.0.0.1');
        c.server.on('data', (x) => {
          if (c.inoltra && !cliente.destroyed) cliente.write(x);
        });
        c.server.on('close', () => {
          if (c.inoltra) cliente.destroy();
          coppie.delete(c);
        });
        c.server.on('error', () => {});
      }
      if (c.inoltra && c.server && !c.server.destroyed) c.server.write(d);
    });
    cliente.on('close', () => {
      if (c.inoltra) c.server?.destroy();
      if (!c.server || c.server.destroyed) coppie.delete(c);
    });
    cliente.on('error', () => {});
  });
  await new Promise((ok) => proxy.listen(porta, '127.0.0.1', ok));
  await avviaServer();

  const di = (id) => [...coppie].filter((c) => c.id === id);
  return {
    avviaServer,
    uccidiServer,
    /** socket attivi per l'id (solo quelli che inoltrano) */
    socket: (id) => di(id).filter((c) => c.inoltra && !c.cliente.destroyed).length,
    chiudi(id) {
      for (const c of di(id)) {
        c.cliente.destroy();
        c.server?.destroy();
      }
      log(`segnale ${id.slice(-2)}: chiuso`);
    },
    fantasma(id) {
      for (const c of di(id)) {
        c.inoltra = false;
        c.cliente.destroy();
      }
      log(`segnale ${id.slice(-2)}: fantasma`);
    },
    zombie(id) {
      for (const c of di(id)) c.inoltra = false;
      log(`segnale ${id.slice(-2)}: zombie`);
    },
    async ferma() {
      for (const c of coppie) {
        c.cliente.destroy();
        c.server?.destroy();
      }
      uccidiServer();
      await new Promise((ok) => proxy.close(ok));
    },
  };
}

/** Da passare a context.addInitScript: `window.__qa` con nascondi/mostra e canali muti. */
export const INIT_QA = () => {
  const qa = { nascosta: false, canali: [], muti: new WeakSet() };
  window.__qa = qa;
  const vs = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
  const hd = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (qa.nascosta ? 'hidden' : vs.get.call(document)) });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => qa.nascosta || hd.get.call(document) });
  qa.nascondi = () => {
    qa.nascosta = true;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  };
  qa.mostra = () => {
    qa.nascosta = false;
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  };
  if (typeof RTCDataChannel !== 'undefined') {
    const send = RTCDataChannel.prototype.send;
    RTCDataChannel.prototype.send = function (d) {
      if (qa.muti.has(this)) return;
      return send.call(this, d);
    };
    const om = Object.getOwnPropertyDescriptor(RTCDataChannel.prototype, 'onmessage');
    Object.defineProperty(RTCDataChannel.prototype, 'onmessage', {
      configurable: true,
      get() {
        return om.get.call(this);
      },
      set(fn) {
        if (fn) qa.canali.push(this);
        const ch = this;
        om.set.call(this, fn ? (e) => (qa.muti.has(ch) ? undefined : fn.call(ch, e)) : fn);
      },
    });
  }
  /** i canali aperti finora diventano muti (i nuovi no) */
  qa.mutaCanali = () => {
    for (const c of qa.canali) qa.muti.add(c);
    return qa.canali.length;
  };
};
