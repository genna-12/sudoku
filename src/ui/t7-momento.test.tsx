// @vitest-environment jsdom
// T7 punto 9: la scena conosce l'ora (fasce ai bordi, priorità del tema forzato, aggiornamento al cambio di fascia).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FASCE_MOMENTO, momentoDa, msAlProssimoMomento } from '../config/sonno';
import type { Momento } from '../config/sonno';
import type { Tema } from './MenuHome';
import { momentoScena, useMomento } from './momento';
import { Scena } from './Scena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alle = (h: number, m = 0, s = 0, g = 6) => new Date(2026, 10, g, h, m, s);
const MOMENTI: Momento[] = ['alba', 'giorno', 'crepuscolo', 'notte'];
const TEMI_FORZATI: Tema[] = ['chiaro', 'scuro'];

let root: Root | null = null;
let box: HTMLDivElement;
beforeEach(() => {
  box = document.createElement('div');
  document.body.appendChild(box);
  localStorage.clear();
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  box.remove();
  vi.useRealTimers();
});
function monta(el: React.ReactNode) {
  act(() => {
    root = createRoot(box);
    root.render(el);
  });
}

describe('il momento del giorno (fasce in config/sonno.ts)', () => {
  it('i bordi: alba 5:30-8, giorno 8-18, crepuscolo 18-20:30, notte 20:30-5:30 (inizio incluso)', () => {
    expect(momentoDa(alle(5, 29, 59))).toBe('notte');
    expect(momentoDa(alle(5, 30))).toBe('alba');
    expect(momentoDa(alle(7, 59, 59))).toBe('alba');
    expect(momentoDa(alle(8, 0))).toBe('giorno');
    expect(momentoDa(alle(17, 59, 59))).toBe('giorno');
    expect(momentoDa(alle(18, 0))).toBe('crepuscolo');
    expect(momentoDa(alle(20, 29, 59))).toBe('crepuscolo');
    expect(momentoDa(alle(20, 30))).toBe('notte');
    expect(momentoDa(alle(0, 0))).toBe('notte');
    expect(momentoDa(alle(23, 59, 59))).toBe('notte');
  });

  it('una sola fonte: le fasce sono in ordine e coprono i quattro momenti', () => {
    expect(FASCE_MOMENTO.map((f) => f.momento)).toEqual(MOMENTI);
    for (let i = 1; i < FASCE_MOMENTO.length; i++) expect(FASCE_MOMENTO[i].da).toBeGreaterThan(FASCE_MOMENTO[i - 1].da);
    for (const f of FASCE_MOMENTO) expect(momentoDa(alle(Math.floor(f.da), Math.round((f.da % 1) * 60)))).toBe(f.momento);
  });

  it('il prossimo cambio: fino al bordo, anche oltre la mezzanotte', () => {
    expect(msAlProssimoMomento(alle(7, 0))).toBe(60 * 60_000);
    expect(msAlProssimoMomento(alle(5, 29, 30))).toBe(30_000);
    expect(msAlProssimoMomento(alle(20, 30))).toBe(9 * 3600_000);
    expect(msAlProssimoMomento(alle(23, 0))).toBe(6.5 * 3600_000);
    // al minuto prima del bordo il momento dopo il salto è quello della fascia seguente
    for (const h of [1, 6, 9, 12, 19, 22]) {
      const d = alle(h, 17);
      const dopo = new Date(d.getTime() + msAlProssimoMomento(d));
      expect(momentoDa(dopo)).not.toBe(momentoDa(new Date(dopo.getTime() - 1000)));
    }
  });

  it('il tema forzato vince: chiaro o scuro, nessun momento; col tema del sistema, quello dell’ora', () => {
    for (const m of MOMENTI) {
      expect(momentoScena('auto', m)).toBe(m);
      for (const t of TEMI_FORZATI) expect(momentoScena(t, m)).toBeUndefined();
    }
  });
});

function Ora({ tema }: { tema: Tema }) {
  const m = useMomento(tema);
  return <i data-momento={m ?? 'nessuno'} />;
}
const letto = () => box.querySelector('i')!.getAttribute('data-momento');

describe('useMomento', () => {
  it('cambia al bordo della fascia mentre l’app è aperta (un timeout, niente polling)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(alle(7, 59, 0));
    monta(<Ora tema="auto" />);
    expect(letto()).toBe('alba');
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(30_000));
    expect(letto()).toBe('alba');
    act(() => vi.advanceTimersByTime(31_000));
    expect(letto()).toBe('giorno');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('al ritorno in primo piano si ricalcola', () => {
    vi.useFakeTimers();
    vi.setSystemTime(alle(20, 0));
    monta(<Ora tema="auto" />);
    expect(letto()).toBe('crepuscolo');
    // il telefono dormiva: il timeout non è scattato, l'ora sì
    vi.setSystemTime(alle(23, 0));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(letto()).toBe('notte');
  });

  it('col tema forzato nessun momento', () => {
    vi.useFakeTimers();
    vi.setSystemTime(alle(12, 0));
    monta(<Ora tema="scuro" />);
    expect(letto()).toBe('nessuno');
  });
});

describe('Scena con il momento', () => {
  const el = ['stelle', 'mare'];
  it('il cielo tinto c’è solo con un momento; il sole solo di giorno (e allora niente luna)', () => {
    for (const m of MOMENTI) {
      monta(<Scena elementi={el} fiori={20} momento={m} />);
      const svg = box.querySelector('svg.sc-scena')!;
      expect(svg.getAttribute('data-momento')).toBe(m);
      expect(svg.querySelector('.sc-cielo')).not.toBeNull();
      expect(!!svg.querySelector('.sc-sole')).toBe(m === 'giorno');
      expect(!!svg.querySelector('.sc-luna')).toBe(m !== 'giorno');
      act(() => root!.unmount());
      root = null;
    }
  });

  it('senza momento (tema forzato, lettore dei capitoli) la scena è quella di prima', () => {
    monta(<Scena elementi={el} fiori={20} />);
    const svg = box.querySelector('svg.sc-scena')!;
    expect(svg.hasAttribute('data-momento')).toBe(false);
    expect(svg.querySelector('.sc-cielo')).toBeNull();
    expect(svg.querySelector('.sc-sole')).toBeNull();
    expect(svg.querySelector('.sc-luna')).not.toBeNull();
  });
});
