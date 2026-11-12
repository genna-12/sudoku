// @vitest-environment jsdom
// Stanza di revisione: la frase (qui una finta, iniettata al posto dell'hash vero) apre l'elenco dei
// capitoli; dentro nessuna scrittura (localStorage, IndexedDB), nessuna fetch, nessun Peer. La frase
// della coppia apre la stanza come prima.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const finta = vi.hoisted(() => ({ frase: 'Una frase FINTA  per la prova' }));

// l'hash "vero" sostituito da quello della frase finta (la frase vera non è in nessun file)
vi.mock('../config/revisione', async () => {
  const { normalizzaFrase } = await import('../net/logica');
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizzaFrase(finta.frase))));
  return { HASH_REVISIONE: Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('') };
});
vi.mock('virtual:pwa-register', () => ({ registerSW: () => () => Promise.resolve() }));

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

import { HASH_REVISIONE as HASH_VERO } from '../config/revisione';
import { CAPITOLI } from '../config/capitoli';
import { Radice } from './Radice';
import { apreRevisione, bluMentreLeggi, dopoCapitolo, hashFrase, vistiFino } from './revisione';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

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
function scrivi(el: HTMLInputElement, testo: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    set.call(el, testo);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function invio(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  });
}
const clic = (s: string) => act(() => q(s)!.click());

const spie = {
  set: vi.fn(),
  rimuovi: vi.fn(),
  svuota: vi.fn(),
  idb: vi.fn(),
  fetch: vi.fn(() => Promise.reject(new Error('rete spenta nei test'))),
};

beforeEach(() => {
  localStorage.clear();
  peer.creati = 0;
  for (const s of Object.values(spie)) s.mockClear();
  const proto = Storage.prototype;
  const set = proto.setItem;
  const rimuovi = proto.removeItem;
  const svuota = proto.clear;
  vi.spyOn(proto, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
    spie.set(k, v);
    set.call(this, k, v);
  });
  vi.spyOn(proto, 'removeItem').mockImplementation(function (this: Storage, k: string) {
    spie.rimuovi(k);
    rimuovi.call(this, k);
  });
  vi.spyOn(proto, 'clear').mockImplementation(function (this: Storage) {
    spie.svuota();
    svuota.call(this);
  });
  vi.stubGlobal('indexedDB', { open: spie.idb, deleteDatabase: spie.idb });
  vi.stubGlobal('fetch', spie.fetch);
  // la stanza si apre solo con WebRTC: qui c'è (il Peer è finto)
  vi.stubGlobal('RTCPeerConnection', class {});
  window.matchMedia ??= ((m: string) => ({ matches: false, media: m, addEventListener() {}, removeEventListener() {} })) as never;
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

describe('frase della revisione', () => {
  it('si riconosce dall’hash con la normalizzazione della stanza (spazi, maiuscole), le altre no', async () => {
    const h = (await hashFrase(finta.frase))!;
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await apreRevisione('  una frase finta per   LA prova ', h)).toBe(true);
    expect(await apreRevisione('una frase finta per la prova!', h)).toBe(false);
    expect(await apreRevisione('', h)).toBe(false);
  });
  it('nel codice c’è un hash di 64 hex (qui sostituito da quello della frase finta)', async () => {
    expect(HASH_VERO).toMatch(/^[0-9a-f]{64}$/);
    expect(await apreRevisione(finta.frase)).toBe(true);
  });
});

describe('stato "dopo il capitolo N" (derivato, niente archivio)', () => {
  it('prima del 5 niente Semina né sue eco; dal 5 c’è, col blu pieno', () => {
    const d4 = dopoCapitolo(4)!;
    expect(d4.sbloccata).toBe(false);
    expect(d4.giardino.elementi).not.toContain('semina');
    expect(d4.vestiti.semina).toBeUndefined();
    const d5 = dopoCapitolo(5)!;
    expect(d5.sbloccata).toBe(true);
    expect(d5.giardino.bluPresenza).toBe(1);
    expect(dopoCapitolo(100)!.diario.flatMap((a) => a.capitoli)).toHaveLength(CAPITOLI.length);
    expect(vistiFino(2)).toEqual(['capitolo-0', 'capitolo-1', 'capitolo-2']);
    // mentre si legge il 5 (appena vinto) Semina non è ancora "sbloccata": il blu è quello del 4
    expect(bluMentreLeggi(5)).toBeLessThan(1);
    expect(bluMentreLeggi(6)).toBe(1);
  });
});

describe('Radice: revisione isolata, stanza di coppia come prima', () => {
  it('la frase apre la revisione dall’Ingresso; dentro niente scritture, fetch né Peer; Esci torna all’Ingresso', async () => {
    act(() => root.render(<Radice />));
    expect(q('.ingresso')).not.toBeNull();
    // nell'Ingresso non c'è nessuna parola della revisione
    expect(box.textContent?.toLowerCase()).not.toContain('revision');
    const campo = q('[data-testid="frase"]') as HTMLInputElement;
    scrivi(campo, finta.frase);
    await act(async () => {
      await aspetta(10);
    });
    const scrittePrima = spie.set.mock.calls.length + spie.rimuovi.mock.calls.length;
    invio(campo);
    await finche(() => !!q('[data-testid="revisione"]'));
    expect(q('.ingresso')).toBeNull();
    expect(box.querySelectorAll('.revisione-riga')).toHaveLength(CAPITOLI.length);
    // anche il colore resta da scegliere: si è entrati senza
    expect(q('[data-testid="manca-colore"]')).toBeNull();

    // capitoli 0 (aiuola: la Scena del fondale), 9, 50 e 100: le battute avanti e indietro
    for (const n of [0, 9, 50, 100]) {
      clic(`[data-testid="revisione-${n}"]`);
      expect(q('[data-testid="capitolo-scena"]')?.dataset.fiore).toBe(String(n));
      expect(q('[data-testid="capitolo-scena"]')?.dataset.battuta).toBe('0');
      await act(async () => {
        await aspetta(320);
      });
      clic('.capitolo-avanti');
      expect(q('[data-testid="capitolo-scena"]')?.dataset.battuta).toBe('1');
      clic('.capitolo-indietro');
      expect(q('[data-testid="capitolo-scena"]')?.dataset.battuta).toBe('0');
      if (n < 100) {
        clic('[data-testid="revisione-succ"]');
        expect(q('[data-testid="capitolo-scena"]')?.dataset.fiore).toBe(String(n + 1));
        expect(q('[data-testid="capitolo-scena"]')?.dataset.battuta).toBe('0');
      } else expect((q('[data-testid="revisione-succ"]') as HTMLButtonElement).disabled).toBe(true);
      clic('[data-testid="revisione-prec"]');
      expect(q('[data-testid="capitolo-scena"]')?.dataset.fiore).toBe(String(n === 100 ? 99 : n));
      // anteprima della Home dopo questo capitolo (Scena, eco, diario)
      clic('[data-testid="revisione-anteprima"]');
      expect(q('[data-testid="revisione-dopo"]')).not.toBeNull();
      expect(q('[data-testid="diario"]')).not.toBeNull();
      clic('[data-testid="revisione-dopo-chiudi"]');
      clic('[data-testid="revisione-elenco"]');
      expect(q('[data-testid="capitolo-scena"]')).toBeNull();
    }
    await act(async () => {
      await aspetta(50);
    });
    expect(spie.set.mock.calls.length + spie.rimuovi.mock.calls.length).toBe(scrittePrima);
    expect(spie.svuota).not.toHaveBeenCalled();
    expect(spie.idb).not.toHaveBeenCalled();
    expect(spie.fetch).not.toHaveBeenCalled();
    expect(peer.creati).toBe(0);
    // la frase non è finita da nessuna parte nello storage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      expect(localStorage.getItem(k)!.toLowerCase()).not.toContain('finta');
    }

    clic('[data-testid="revisione-esci"]');
    expect(q('[data-testid="revisione"]')).toBeNull();
    expect(q('.ingresso')).not.toBeNull();
  });

  it('la frase della coppia apre la stanza come prima (archivio con la frase, Peer creato)', async () => {
    act(() => root.render(<Radice />));
    clic('[data-testid="scegli-semino"]');
    const campo = q('[data-testid="frase"]') as HTMLInputElement;
    scrivi(campo, 'la nostra frase di coppia');
    act(() => (q('form') as HTMLFormElement).requestSubmit());
    await finche(() => !q('.ingresso') && !!q('.home'));
    expect(q('[data-testid="revisione"]')).toBeNull();
    await finche(() => peer.creati > 0, 6000);
    await finche(() => spie.set.mock.calls.some(([k, v]) => k === 'sudoku-coppia-archivio' && String(v).includes('la nostra frase di coppia')));
  }, 10000);
});
