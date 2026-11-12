// @vitest-environment jsdom
// Validazione indipendente della stanza di revisione (12/11): la prop `senzaMemoria` della Scena non
// cambia nulla senza la prop (App scrive gli elementi visti come prima), con la prop non legge né scrive;
// la frase della revisione non lascia scritture e un doppio invio non fa danni. Nessuna frase vera qui.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const finta = vi.hoisted(() => ({
  frase: 'altra Frase finta della validazione',
}));
vi.mock('../config/revisione', async () => {
  const { normalizzaFrase } = await import('../net/logica');
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizzaFrase(finta.frase))));
  return {
    HASH_REVISIONE: Array.from(h, (b) => b.toString(16).padStart(2, '0')).join(''),
  };
});
vi.mock('virtual:pwa-register', () => ({
  registerSW: () => () => Promise.resolve(),
}));
const peer = vi.hoisted(() => ({ creati: 0 }));
vi.mock('peerjs', () => {
  class Finta {
    open = false;
    destroyed = false;
    disconnected = false;
    constructor() {
      peer.creati++;
    }
    on() {
      return this;
    }
    off() {
      return this;
    }
    connect() {
      return { on() {}, off() {}, close() {}, send() {}, open: false };
    }
    reconnect() {}
    disconnect() {}
    destroy() {
      this.destroyed = true;
    }
  }
  return { Peer: Finta, default: Finta };
});

import { ARCHIVIO_VUOTO, CHIAVE_ARCHIVIO } from '../stato/archivio';
import { Ingresso } from './Ingresso';
import { Radice } from './Radice';
import { Scena } from './Scena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

const VISTI = 'sudoku-scena-visti';
let box: HTMLDivElement;
let root: Root;
const q = (s: string) => box.querySelector<HTMLElement>(s);
const aspetta = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function finche(cond: () => boolean, ms = 3000) {
  const fine = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fine) throw new Error('condizione mai vera');
    await act(async () => {
      await aspetta(20);
    });
  }
}
const letture = vi.fn();
const scritture = vi.fn();

beforeEach(() => {
  localStorage.clear();
  peer.creati = 0;
  letture.mockClear();
  scritture.mockClear();
  const proto = Storage.prototype;
  const get = proto.getItem;
  const set = proto.setItem;
  vi.spyOn(proto, 'getItem').mockImplementation(function (this: Storage, k: string) {
    letture(k);
    return get.call(this, k);
  });
  vi.spyOn(proto, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
    scritture(k, v);
    set.call(this, k, v);
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('rete spenta'))),
  );
  vi.stubGlobal('RTCPeerConnection', class {});
  window.matchMedia ??= ((m: string) => ({
    matches: false,
    media: m,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Scena: senzaMemoria', () => {
  it('senza la prop: legge e scrive gli elementi visti come prima (nuovi marcati e salvati)', () => {
    localStorage.setItem(VISTI, JSON.stringify(['fiore']));
    act(() => root.render(<Scena elementi={['fiore', 'sentiero']} fiori={3} />));
    expect(q('[data-el="sentiero"]')?.getAttribute('data-nuovo')).toBe('true');
    expect(JSON.parse(localStorage.getItem(VISTI)!)).toEqual(['fiore', 'sentiero']);
  });
  it('senza la prop e senza memoria: niente "nuovi" e la memoria si crea', () => {
    act(() => root.render(<Scena elementi={['fiore', 'sentiero']} fiori={3} />));
    expect(q('[data-el="sentiero"]')?.getAttribute('data-nuovo')).toBeNull();
    expect(JSON.parse(localStorage.getItem(VISTI)!)).toEqual(['fiore', 'sentiero']);
  });
  it('con senzaMemoria: nessuna lettura né scrittura della chiave, memoria intatta', () => {
    localStorage.setItem(VISTI, JSON.stringify(['fiore']));
    letture.mockClear();
    scritture.mockClear();
    act(() => root.render(<Scena elementi={['fiore', 'sentiero', 'mare']} fiori={30} senzaMemoria />));
    act(() => root.render(<Scena elementi={['fiore', 'sentiero', 'mare', 'sasso']} fiori={31} senzaMemoria />));
    expect(letture).not.toHaveBeenCalledWith(VISTI);
    expect(scritture).not.toHaveBeenCalledWith(VISTI, expect.anything());
    expect(localStorage.getItem(VISTI)).toBe(JSON.stringify(['fiore']));
  });
});

describe('App dentro Radice: la Scena della Home scrive come prima', () => {
  it('profilo confermato: si apre in Home e la Scena salva gli elementi visti', async () => {
    localStorage.setItem(
      CHIAVE_ARCHIVIO,
      JSON.stringify({
        ...ARCHIVIO_VUOTO,
        io: { nome: 'Semino', frase: 'frase di prova della coppia' },
      }),
    );
    act(() => root.render(<Radice />));
    await finche(() => !!q('.home'));
    await finche(() => scritture.mock.calls.some(([k]) => k === VISTI));
    // con 0 fiori la Home non ha elementi: la memoria si crea comunque (vuota), come su main
    expect(Array.isArray(JSON.parse(localStorage.getItem(VISTI)!))).toBe(true);
    expect(q('[data-testid="revisione"]')).toBeNull();
  });
});

describe('Ingresso: doppio invio', () => {
  it('frase della coppia scritta e inviata due volte subito (hash non pronto): onEntra con la frase giusta, mai la revisione', async () => {
    const entra = vi.fn();
    const revisione = vi.fn();
    act(() => root.render(<Ingresso iniziale={null} sbloccata={false} onEntra={entra} onRevisione={revisione} />));
    act(() => q('[data-testid="scegli-semino"]')!.click());
    const campo = q('[data-testid="frase"]') as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      set.call(campo, 'la nostra frase vera');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      (q('form') as HTMLFormElement).requestSubmit();
      (q('form') as HTMLFormElement).requestSubmit();
    });
    await act(async () => {
      await aspetta(50);
    });
    expect(revisione).not.toHaveBeenCalled();
    expect(entra.mock.calls.length).toBeGreaterThanOrEqual(1);
    for (const [io] of entra.mock.calls) expect(io).toEqual({ nome: 'Semino', frase: 'la nostra frase vera' });
  });
  it('frase della revisione (con maiuscole e spazi) inviata due volte: mai onEntra, nessuna scrittura', async () => {
    const entra = vi.fn();
    const revisione = vi.fn();
    act(() => root.render(<Ingresso iniziale={null} sbloccata={false} onEntra={entra} onRevisione={revisione} />));
    act(() => q('[data-testid="scegli-semino"]')!.click());
    const campo = q('[data-testid="frase"]') as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    scritture.mockClear();
    act(() => {
      set.call(campo, '  ' + finta.frase.toUpperCase().replace(/ /g, '   ') + ' ');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      (q('form') as HTMLFormElement).requestSubmit();
      (q('form') as HTMLFormElement).requestSubmit();
    });
    await act(async () => {
      await aspetta(50);
    });
    expect(entra).not.toHaveBeenCalled();
    expect(revisione).toHaveBeenCalled();
    expect(scritture).not.toHaveBeenCalled();
  });
});
