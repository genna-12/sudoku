// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { durataBattuta, durataToast, useToasts } from './Toasts';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('durata delle battute (T7.1)', () => {
  it('3,2 s fino a 40 caratteri, poi +60 ms per carattere, al massimo 7 s', () => {
    expect(durataBattuta('')).toBe(3200);
    expect(durataBattuta('x'.repeat(40))).toBe(3200);
    expect(durataBattuta('x'.repeat(41))).toBe(3260);
    expect(durataBattuta('x'.repeat(80))).toBe(5600);
    expect(durataBattuta('x'.repeat(103))).toBe(6980);
    expect(durataBattuta('x'.repeat(104))).toBe(7000);
    expect(durataBattuta('x'.repeat(500))).toBe(7000);
  });
  it('conta i caratteri, non le unità UTF-16 (emoji)', () => {
    expect(durataBattuta('😀'.repeat(41))).toBe(3260);
  });
});

describe('durata dei toast con la coda', () => {
  it('senza coda: banner 2,4 s, grande almeno 3,6 s e quanto serve a leggerla', () => {
    expect(durataToast('banner', 'ciao', 0)).toBe(2400);
    expect(durataToast('grande', 'ciao', 0)).toBe(3600);
    expect(durataToast('grande', 'x'.repeat(90), 0)).toBe(6200);
  });
  it('con altri in coda si accorcia, mai sotto il 40% né sotto 1,2 s', () => {
    expect(durataToast('banner', 'a', 1)).toBe(1920);
    expect(durataToast('banner', 'a', 2)).toBe(1440);
    expect(durataToast('banner', 'a', 3)).toBe(1200);
    expect(durataToast('banner', 'a', 20)).toBe(1200);
    expect(durataToast('grande', 'a', 10)).toBe(1440);
  });
});

describe('useToasts: la coda non scarta, il tocco chiude', () => {
  let box: HTMLDivElement;
  let root: Root;
  let api: ReturnType<typeof useToasts>;
  function Sonda() {
    api = useToasts();
    return null;
  }
  beforeEach(() => {
    vi.useFakeTimers();
    box = document.createElement('div');
    document.body.appendChild(box);
    root = createRoot(box);
    act(() => root.render(<Sonda />));
  });
  afterEach(() => {
    act(() => root.unmount());
    box.remove();
    vi.useRealTimers();
  });

  it('sei toast di fila passano tutti, uno alla volta', () => {
    act(() => {
      for (let i = 0; i < 6; i++) api.mostra({ tipo: 'banner', testo: `t${i}` });
    });
    const visti: string[] = [];
    for (let k = 0; k < 20 && visti.length < 6; k++) {
      expect(api.attivi.length).toBeLessThanOrEqual(1);
      const t = api.attivi[0];
      if (t && visti[visti.length - 1] !== t.testo) visti.push(t.testo);
      act(() => vi.advanceTimersByTime(1200));
    }
    expect(visti).toEqual(['t0', 't1', 't2', 't3', 't4', 't5']);
  });

  it('chiudi(id) toglie subito il toast grande e passa al prossimo', () => {
    act(() => {
      api.mostra({ tipo: 'grande', testo: 'sei mini' });
      api.mostra({ tipo: 'banner', testo: 'dopo' });
    });
    expect(api.attivi.map((t) => t.testo)).toEqual(['sei mini']);
    act(() => api.chiudi(api.attivi[0].id));
    expect(api.attivi.map((t) => t.testo)).toEqual(['dopo']);
    // il timer del primo non toglie il secondo prima del tempo
    act(() => vi.advanceTimersByTime(1000));
    expect(api.attivi.map((t) => t.testo)).toEqual(['dopo']);
    act(() => vi.advanceTimersByTime(2000));
    expect(api.attivi).toEqual([]);
  });
});
