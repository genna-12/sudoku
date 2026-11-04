// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PilaIndietro, azioneIndietro, useChiudiConIndietro, useGestoIndietro } from './indietro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('gesto indietro: macchina a stati (T7.7)', () => {
  const c = (schermata: string, aperti = 0, entrato = true, bloccato = false) => azioneIndietro({ schermata, aperti, entrato, bloccato });
  it('un foglio aperto si chiude prima di tutto', () => {
    expect(c('partita', 1)).toBe('chiudi');
    expect(c('home', 2)).toBe('chiudi');
    expect(c('giardino', 1)).toBe('chiudi');
  });
  it('da Partita e Giardino si torna alla Home', () => {
    expect(c('partita')).toBe('home');
    expect(c('giardino')).toBe('home');
  });
  it('in Home non fa niente (mai fuori dall’app)', () => {
    expect(c('home')).toBe('resta');
  });
  it("dall'Ingresso: alla Home solo se si è già entrati", () => {
    expect(c('ingresso', 0, true)).toBe('home');
    expect(c('ingresso', 0, false)).toBe('resta');
  });
  it('dentro un capitolo resta (la storia non si salta)', () => {
    expect(c('partita', 2, true, true)).toBe('resta');
  });
  it('la pila chiude l’ultimo aperto, e chi si chiude da solo esce dalla pila', () => {
    const pila = new PilaIndietro();
    const chiusi: string[] = [];
    const via1 = pila.apri(() => chiusi.push('menu'));
    pila.apri(() => chiusi.push('foglio'));
    expect(pila.aperti).toBe(2);
    expect(pila.chiudiUltimo()).toBe(true);
    expect(chiusi).toEqual(['foglio']);
    via1();
    expect(pila.aperti).toBe(0);
    expect(pila.chiudiUltimo()).toBe(false);
  });
});

describe('useGestoIndietro con popstate (jsdom)', () => {
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
  });

  function Prova({ schermata, home }: { schermata: string; home: () => void }) {
    const [foglio, setFoglio] = useState(false);
    useGestoIndietro(() => ({ schermata, entrato: true, bloccato: false }), home);
    useChiudiConIndietro(foglio, () => setFoglio(false));
    return (
      <button data-foglio={foglio ? 'si' : 'no'} onClick={() => setFoglio(true)}>
        apri
      </button>
    );
  }
  const indietro = () => act(() => void window.dispatchEvent(new PopStateEvent('popstate', { state: null })));

  it('mette la guardia; indietro chiude il foglio, poi torna alla Home, e rimette la guardia', () => {
    const home = vi.fn();
    act(() => root.render(<Prova schermata="partita" home={home} />));
    expect((history.state as Record<string, unknown>)['sudoku-guardia']).toBe(true);
    const b = box.querySelector('button')!;
    act(() => b.click());
    expect(b.dataset.foglio).toBe('si');
    history.replaceState(null, '');
    indietro();
    expect(b.dataset.foglio).toBe('no');
    expect(home).not.toHaveBeenCalled();
    expect((history.state as Record<string, unknown>)['sudoku-guardia']).toBe(true);
    history.replaceState(null, '');
    indietro();
    expect(home).toHaveBeenCalledTimes(1);
  });

  it('in Home indietro non fa niente', () => {
    const home = vi.fn();
    act(() => root.render(<Prova schermata="home" home={home} />));
    history.replaceState(null, '');
    indietro();
    expect(home).not.toHaveBeenCalled();
    expect((history.state as Record<string, unknown>)['sudoku-guardia']).toBe(true);
  });

  it('se pushState lancia (limite di Safari) non si rompe niente', () => {
    const push = vi.spyOn(history, 'pushState').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    history.replaceState(null, '');
    expect(() => act(() => root.render(<Prova schermata="giardino" home={() => {}} />))).not.toThrow();
    push.mockRestore();
  });
});
