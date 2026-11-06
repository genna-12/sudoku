// @vitest-environment jsdom
// Correzioni della shell (revisione UI 06/11): "Dopo" nel lettore aperto dalla Home (S3), Invio tenuto
// premuto nel capitolo (S17).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Capitolo } from '../config/capitoli';
import { ATTESA_CONTINUA_MS, CapitoloScena, GUARDIA_MS } from './CapitoloScena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CAP: Capitolo = {
  fiore: 12,
  luogo: 'mare',
  titolo: 'Prova',
  vestiti: {},
  eco: { chi: 'semino', testo: 'eco' },
  battute: [
    { chi: 'narra', testo: 'Uno.' },
    { chi: 'semino', testo: 'Due.' },
  ],
};

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
const q = (sel: string) => box.querySelector<HTMLElement>(sel);
const passa = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const battuta = () => Number(q('[data-testid="capitolo-scena"]')!.dataset.battuta);
const tasto = (key: string, repeat = false) => {
  const e = new KeyboardEvent('keydown', { key, repeat, bubbles: true, cancelable: true });
  act(() => {
    document.body.dispatchEvent(e);
  });
  return e;
};

describe('lettore dalla Home: "Dopo" a fine capitolo (S3)', () => {
  it('con onDopo, a fine capitolo c\'è "Dopo" accanto a "Continua" e chiude senza continuare', () => {
    const onContinua = vi.fn();
    const onDopo = vi.fn();
    act(() => root.render(<CapitoloScena capitolo={CAP} stadio={3} onContinua={onContinua} onDopo={onDopo} />));
    expect(q('[data-testid="capitolo-dopo"]')).toBeNull();
    passa(GUARDIA_MS);
    act(() => q('.capitolo-avanti')!.click());
    passa(ATTESA_CONTINUA_MS);
    expect(q('[data-testid="capitolo-continua"]')).not.toBeNull();
    act(() => q('[data-testid="capitolo-dopo"]')!.click());
    expect(onDopo).toHaveBeenCalledTimes(1);
    expect(onContinua).not.toHaveBeenCalled();
  });
  it('senza onDopo (vittoria, ultimo capitolo, rilettura) niente "Dopo"', () => {
    act(() => root.render(<CapitoloScena capitolo={CAP} stadio={3} onContinua={vi.fn()} />));
    passa(GUARDIA_MS);
    act(() => q('.capitolo-avanti')!.click());
    passa(ATTESA_CONTINUA_MS);
    expect(q('[data-testid="capitolo-continua"]')).not.toBeNull();
    expect(q('[data-testid="capitolo-dopo"]')).toBeNull();
  });
});

describe('Invio tenuto premuto nel capitolo (S17)', () => {
  it('le ripetizioni di Invio e Spazio non avanzano e non attivano il bottone col focus', () => {
    act(() => root.render(<CapitoloScena capitolo={CAP} stadio={3} onContinua={vi.fn()} />));
    passa(GUARDIA_MS);
    const ripetuto = tasto('Enter', true);
    expect(ripetuto.defaultPrevented).toBe(true);
    expect(battuta()).toBe(0);
    expect(tasto(' ', true).defaultPrevented).toBe(true);
    expect(battuta()).toBe(0);
    tasto('Enter');
    expect(battuta()).toBe(1);
  });
});
