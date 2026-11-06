// @vitest-environment jsdom
// Correzioni della revisione UI 06/11 nell'area Home (docs/revisione/correzioni-home.md).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pallino, testoPallino } from './Home';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('H4: testo del pallino breve in testata', () => {
  it('stanza occupata: breve "già collegato/a altrove", intero per lettore di schermo e title', () => {
    expect(testoPallino('in-attesa', 'Mati', true, false)).toEqual({
      breve: 'già collegato altrove',
      intero: 'sei già collegato da un altro dispositivo',
    });
    expect(testoPallino('in-attesa', 'Genna', true, true).breve).toBe('già collegata altrove');
  });
  it('errore: breve; gli altri stati restano quelli di sempre', () => {
    expect(testoPallino('errore', 'Mati').breve).toBe('non mi collego, riprovo');
    expect(testoPallino('in-attesa', 'Mati')).toEqual({ breve: 'aspetto Mati', intero: 'aspetto Mati' });
    expect(testoPallino('connesso', 'Mati').breve).toBe('Mati è qui');
  });
  it('DOM: il breve si vede, l’intero è nel title e nel testo nascosto', () => {
    act(() => root.render(<Pallino connessione="in-attesa" partner="Mati" occupata />));
    const p = box.querySelector<HTMLElement>('.pallino')!;
    expect(p.title).toBe('sei già collegato da un altro dispositivo');
    expect(p.querySelector('.pallino-testo')!.getAttribute('aria-hidden')).toBe('true');
    expect(p.querySelector('.nascosto-visivo')!.textContent).toBe('sei già collegato da un altro dispositivo');
    act(() => root.render(<Pallino connessione="connesso" partner="Mati" />));
    expect(box.querySelector('.pallino')!.getAttribute('title')).toBeNull();
    expect(box.querySelector('.nascosto-visivo')).toBeNull();
  });
});
