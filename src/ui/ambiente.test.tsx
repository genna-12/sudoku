// @vitest-environment jsdom
// T9 C: comparse e oggetti nel lettore (fase 1, segnaposto) e ambiente al Fondale, solo dal capitolo 9.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPARSE, OGGETTI } from '../config/ambienti';
import type { Capitolo } from '../config/capitoli';
import { CapitoloScena } from './CapitoloScena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const [C1, C2] = Object.keys(COMPARSE);
const [O1, O2] = Object.keys(OGGETTI);

function cap(fiore: number, extra: Partial<Capitolo> = {}): Capitolo {
  return {
    fiore,
    luogo: 'mare',
    titolo: 'Prova',
    vestiti: {},
    eco: { chi: 'semino', testo: 'eco' },
    battute: [
      { chi: 'semino', umore: 'felice', testo: 'Uno.' },
      { chi: 'semino', umore: 'felice', testo: 'Due.' },
    ],
    ...extra,
  };
}

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  vi.useRealTimers();
});
const monta = (c: Capitolo) => act(() => root.render(<CapitoloScena capitolo={c} stadio={3} onContinua={() => {}} />));

describe('Ambiente nel lettore', () => {
  it('senza comparse né oggetti non c\'è il contenitore', () => {
    monta(cap(20));
    expect(box.querySelector('[data-testid="capitolo-ambiente"]')).toBeNull();
  });

  it('comparse e oggetti del capitolo nel palco, sotto le mascotte, nascosti ai lettori di schermo', () => {
    monta(cap(20, { comparse: [C1, C2], oggetti: [O1] }));
    const amb = box.querySelector('[data-testid="capitolo-ambiente"]')!;
    expect(amb).not.toBeNull();
    expect(amb.getAttribute('aria-hidden')).toBe('true');
    expect(amb.parentElement?.classList.contains('capitolo-palco')).toBe(true);
    // prima del suolo: nell'ordine del DOM sta sotto mascotte e secondari
    expect(amb.nextElementSibling?.classList.contains('capitolo-suolo')).toBe(true);
    expect([...amb.querySelectorAll('[data-comparsa]')].map((e) => e.getAttribute('data-comparsa'))).toEqual([C1, C2]);
    expect([...amb.querySelectorAll('[data-oggetto]')].map((e) => e.getAttribute('data-oggetto'))).toEqual([O1]);
    // le comparse non hanno nome sullo schermo
    expect(amb.textContent).toBe('');
  });

  it('id sconosciuti ignorati, al massimo 3', () => {
    monta(cap(20, { comparse: ['drago', C1], oggetti: [O1, O2, O1, O2] }));
    expect(box.querySelectorAll('[data-comparsa]').length).toBe(1);
    expect(box.querySelectorAll('[data-oggetto]').length).toBe(3);
  });

  it('l\'ambiente arriva al Fondale', () => {
    monta(cap(30, { ambiente: { momento: 'tramonto', meteo: 'vento' } }));
    const fd = box.querySelector<HTMLElement>('.fd')!;
    expect(fd.dataset.momento).toBe('tramonto');
    expect(fd.dataset.meteo).toBe('vento');
  });

  it('segreto per Matilde: prima del 9 niente, anche con dati sbagliati', () => {
    monta(cap(8, { ambiente: { momento: 'giorno', meteo: 'pioggia' }, comparse: [C1], oggetti: [O1] }));
    expect(box.querySelector('[data-testid="capitolo-ambiente"]')).toBeNull();
    const fd = box.querySelector<HTMLElement>('.fd')!;
    expect(fd.hasAttribute('data-momento')).toBe(false);
    expect(fd.hasAttribute('data-meteo')).toBe(false);
    expect(fd.dataset.notte).toBe('1');
  });
});
