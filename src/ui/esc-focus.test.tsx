// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chiudeConEsc, pila, useChiudiConIndietro, useGestoIndietro } from './indietro';
import { focalizzabili, ritornoFocus, useDialogo } from './dialogo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Esc come indietro (T7.6): regola pura', () => {
  const c = (schermata: string, aperti: number, bloccato = false) => chiudeConEsc({ schermata, aperti, entrato: true, bloccato });
  it('con un foglio o un menù aperto chiude', () => {
    expect(c('home', 1)).toBe(true);
    expect(c('partita', 2)).toBe(true);
  });
  it('senza niente di aperto non torna alla Home (in partita toglie la selezione)', () => {
    expect(c('partita', 0)).toBe(false);
    expect(c('giardino', 0)).toBe(false);
    expect(c('home', 0)).toBe(false);
  });
  it('dentro un capitolo non salta la storia', () => {
    expect(c('partita', 1, true)).toBe(false);
  });
});

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  expect(pila.aperti).toBe(0);
});

const esc = (su: EventTarget = document.activeElement ?? document.body) => {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  act(() => void su.dispatchEvent(e));
  return e;
};
const tab = (shift = false) => {
  const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
  act(() => void document.activeElement!.dispatchEvent(e));
  return e;
};

/** Un'app in miniatura: un bottone apre un foglio (pila + focus), un secondo foglio si apre dal primo. */
function Prova({ bloccato = false, home = () => {} }: { bloccato?: boolean; home?: () => void }) {
  const [uno, setUno] = useState(false);
  const [due, setDue] = useState(false);
  useGestoIndietro(() => ({ schermata: 'partita', entrato: true, bloccato }), home);
  useChiudiConIndietro(uno, () => setUno(false));
  useChiudiConIndietro(due, () => setDue(false));
  return (
    <>
      <button data-testid="apri" onClick={() => setUno(true)}>
        apri
      </button>
      {uno && <Foglio id="uno" onChiudi={() => setUno(false)} onAltro={() => setDue(true)} />}
      {due && <Foglio id="due" onChiudi={() => setDue(false)} />}
    </>
  );
}
function Foglio({ id, onChiudi, onAltro }: { id: string; onChiudi: () => void; onAltro?: () => void }) {
  const rif = useRef<HTMLDivElement>(null);
  useDialogo(rif);
  return (
    <div ref={rif} role="dialog" data-testid={`foglio-${id}`}>
      <button data-testid={`${id}-primo`} onClick={onAltro}>
        primo
      </button>
      <button data-testid={`${id}-chiudi`} onClick={onChiudi}>
        chiudi
      </button>
    </div>
  );
}
const q = (id: string) => box.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('Esc chiude i fogli con la stessa pila del gesto indietro', () => {
  it("chiude l'ultimo aperto, uno alla volta, senza toccare la cronologia", () => {
    act(() => root.render(<Prova />));
    const lunghezza = history.length;
    const push = vi.spyOn(history, 'pushState');
    const back = vi.spyOn(history, 'back');
    act(() => q('apri')!.click());
    act(() => q('uno-primo')!.click());
    expect(q('foglio-due')).not.toBeNull();
    const e = esc();
    expect(e.defaultPrevented).toBe(true);
    expect(q('foglio-due')).toBeNull();
    expect(q('foglio-uno')).not.toBeNull();
    esc();
    expect(q('foglio-uno')).toBeNull();
    expect(history.length).toBe(lunghezza);
    expect(push).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    push.mockRestore();
    back.mockRestore();
  });

  it('dopo Esc il gesto indietro non trova fogli fantasma: torna alla Home', () => {
    const home = vi.fn();
    act(() => root.render(<Prova home={home} />));
    act(() => q('apri')!.click());
    esc();
    expect(pila.aperti).toBe(0);
    history.replaceState(null, '');
    act(() => void window.dispatchEvent(new PopStateEvent('popstate', { state: null })));
    expect(home).toHaveBeenCalledTimes(1);
  });

  it('un Esc che chiude non arriva agli altri ascoltatori (es. la griglia che toglie la selezione)', () => {
    act(() => root.render(<Prova />));
    const altri = vi.fn();
    window.addEventListener('keydown', altri);
    act(() => q('apri')!.click());
    esc();
    expect(altri).not.toHaveBeenCalled();
    // senza fogli aperti Esc passa
    esc();
    expect(altri).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', altri);
  });

  it('dentro un capitolo (bloccato) Esc non chiude niente', () => {
    act(() => root.render(<Prova bloccato />));
    act(() => q('apri')!.click());
    esc();
    expect(q('foglio-uno')).not.toBeNull();
    // si chiude a mano: la pila resta coerente
    act(() => q('uno-chiudi')!.click());
    expect(pila.aperti).toBe(0);
  });
});

describe('focus dei dialoghi (useDialogo)', () => {
  it("all'apertura il focus entra nel foglio; alla chiusura torna a chi l'ha aperto", () => {
    act(() => root.render(<Prova />));
    q('apri')!.focus();
    act(() => q('apri')!.click());
    expect(document.activeElement).toBe(q('uno-primo'));
    act(() => q('uno-chiudi')!.click());
    expect(document.activeElement).toBe(q('apri'));
  });

  it('anche quando si chiude con Esc; con due fogli il focus torna al primo, poi al bottone', () => {
    act(() => root.render(<Prova />));
    q('apri')!.focus();
    act(() => q('apri')!.click());
    q('uno-primo')!.focus();
    act(() => q('uno-primo')!.click());
    expect(document.activeElement).toBe(q('due-primo'));
    esc();
    expect(document.activeElement).toBe(q('uno-primo'));
    esc();
    expect(document.activeElement).toBe(q('apri'));
  });

  it('Tab e Maiusc+Tab girano dentro il foglio', () => {
    act(() => root.render(<Prova />));
    act(() => q('apri')!.click());
    q('uno-chiudi')!.focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(q('uno-primo'));
    tab(true);
    expect(document.activeElement).toBe(q('uno-chiudi'));
  });

  it('ritorno: chi ha aperto se c’è ancora, se no la riserva; mai dentro un pezzo inert', () => {
    const a = document.createElement('button');
    const r = document.createElement('button');
    document.body.append(a, r);
    expect(ritornoFocus(a, r)).toBe(a);
    a.remove();
    expect(ritornoFocus(a, r)).toBe(r);
    const inerte = document.createElement('div');
    inerte.setAttribute('inert', '');
    inerte.append(r);
    document.body.append(inerte);
    expect(ritornoFocus(a, r)).toBeNull();
    inerte.remove();
  });

  it('focalizzabili salta disabilitati, tabindex -1 e il campo file nascosto', () => {
    const d = document.createElement('div');
    d.innerHTML =
      '<button>a</button><button disabled>b</button><input class="nascosto" type="file"><div tabindex="-1">c</div><input type="checkbox">';
    expect(focalizzabili(d).map((e) => e.tagName)).toEqual(['BUTTON', 'INPUT']);
  });
});
