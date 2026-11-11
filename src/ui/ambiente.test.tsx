// @vitest-environment jsdom
// T9 C: comparse e oggetti nel lettore e ambiente al Fondale, solo dal capitolo 9.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPARSE, OGGETTI } from '../config/ambienti';
import { CAPITOLI, type Capitolo } from '../config/capitoli';
import { CapitoloScena } from './CapitoloScena';
import { accessorioValido } from './useMascotte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
const monta = (c: Capitolo) =>
  act(() => root.render(<CapitoloScena capitolo={c} stadio={3} onContinua={() => {}} accessoriDisegnati={(id) => !!accessorioValido(id)} />));
const amb = () => box.querySelector('[data-testid="capitolo-ambiente"]');
const ids = (attr: 'data-comparsa' | 'data-oggetto') => [...box.querySelectorAll(`[${attr}]`)].map((e) => e.getAttribute(attr));
const posto = (attr: string, id: string) => box.querySelector(`[${attr}="${id}"]`)?.getAttribute('data-posto');

describe('Ambiente nel lettore', () => {
  it("senza comparse né oggetti non c'è il contenitore", () => {
    monta(cap(20));
    expect(amb()).toBeNull();
  });

  it('comparse e oggetti nel palco, prima del suolo (sotto mascotte e secondari), nascosti ai lettori di schermo', () => {
    monta(cap(20, { comparse: ['granchi', 'gabbiani'], oggetti: ['conchiglia'] }));
    const a = amb()!;
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(a.parentElement?.classList.contains('capitolo-palco')).toBe(true);
    expect(a.nextElementSibling?.classList.contains('capitolo-suolo')).toBe(true);
    expect(ids('data-comparsa')).toEqual(['granchi', 'gabbiani']);
    expect(ids('data-oggetto')).toEqual(['conchiglia']);
    expect(a.textContent).toBe('');
    // granchi a terra nella striscia, gabbiani in cielo sul fondale
    expect(posto('data-comparsa', 'granchi')).toBe('striscia');
    expect(posto('data-comparsa', 'gabbiani')).toBe('fondale');
  });

  it('id sconosciuti e doppioni ignorati, al massimo 3', () => {
    monta(cap(20, { comparse: ['drago', 'granchi'], oggetti: ['zaino', 'zaino', 'pc', 'palla', 'secchio'] }));
    expect(ids('data-comparsa')).toEqual(['granchi']);
    expect(ids('data-oggetto')).toEqual(['zaino', 'pc', 'palla']);
  });

  it('ogni capitolo 9-100 disegna tutte le sue comparse e i suoi oggetti (nel bosco le lucciole sono del Fondale)', () => {
    for (const c of CAPITOLI.filter((x) => x.fiore >= 9)) {
      monta(c);
      const comparse = (c.comparse ?? []).filter((id) => !(id === 'lucciole' && c.luogo === 'bosco'));
      expect(ids('data-comparsa'), `capitolo ${c.fiore}`).toEqual(expect.arrayContaining(comparse));
      expect(ids('data-comparsa').length, `capitolo ${c.fiore}`).toBe(comparse.length);
      expect([...ids('data-oggetto')].sort(), `capitolo ${c.fiore}`).toEqual([...(c.oggetti ?? [])].sort());
      box.querySelectorAll('.amb-pezzo svg').forEach((s) => expect(s.childElementCount).toBeGreaterThan(0));
    }
  });

  it('il vocabolario ha un disegno per ogni id', () => {
    monta(cap(20, { luogo: 'giardino', comparse: Object.keys(COMPARSE).slice(0, 3), oggetti: Object.keys(OGGETTI).slice(0, 3) }));
    for (let i = 0; i < Object.keys(COMPARSE).length; i += 3) {
      monta(cap(20 + i, { luogo: 'giardino', comparse: Object.keys(COMPARSE).slice(i, i + 3) }));
      expect(ids('data-comparsa').length).toBe(Object.keys(COMPARSE).slice(i, i + 3).length);
    }
    for (let i = 0; i < Object.keys(OGGETTI).length; i += 3) {
      monta(cap(40 + i, { luogo: 'giardino', oggetti: Object.keys(OGGETTI).slice(i, i + 3) }));
      expect(ids('data-oggetto').length).toBe(Object.keys(OGGETTI).slice(i, i + 3).length);
    }
  });

  it('cucina: le cose sul tavolo, le tazze sono quelle del fondale (solo il vapore), la lettera sotto il piatto', () => {
    monta(cap(77, { luogo: 'cucina', oggetti: ['lettera', 'piatto', 'tazze'] }));
    expect(posto('data-oggetto', 'piatto')).toBe('fondale');
    expect(posto('data-oggetto', 'tazze')).toBe('fondale');
    expect(box.querySelectorAll('[data-oggetto="tazze"] .amb-vapore').length).toBeGreaterThan(0);
    expect(box.querySelector('[data-oggetto="tazze"] path[d^="M4 8h10"]')).toBeNull();
    expect(ids('data-oggetto').indexOf('lettera')).toBeLessThan(ids('data-oggetto').indexOf('piatto'));
  });

  it("l'ambiente arriva al Fondale", () => {
    monta(cap(30, { ambiente: { momento: 'tramonto', meteo: 'vento' } }));
    const fd = box.querySelector<HTMLElement>('.fd')!;
    expect(fd.dataset.momento).toBe('tramonto');
    expect(fd.dataset.meteo).toBe('vento');
  });

  it('lucciole del bosco: dal 9 solo se il capitolo le chiama', () => {
    monta(cap(46, { luogo: 'bosco', ambiente: { momento: 'sera', meteo: 'pioggia' } }));
    expect(box.querySelector('.fd .fd-lucciole')).toBeNull();
    monta(cap(48, { luogo: 'bosco', ambiente: { momento: 'notte', meteo: 'sereno' }, comparse: ['lucciole'] }));
    expect(box.querySelector('.fd .fd-lucciole')).not.toBeNull();
    // le disegna il Fondale: nessun doppione nel palco
    expect(ids('data-comparsa')).toEqual([]);
  });

  it('lanterna del vestito spenta di giorno (alba, mattina, giorno), accesa la sera', () => {
    const lanterna = (momento: 'alba' | 'mattina' | 'giorno' | 'sera') =>
      cap(45, { luogo: 'bosco', vestiti: { semino: 'lanterna' }, ambiente: { momento, meteo: 'sereno' } });
    for (const m of ['alba', 'mattina', 'giorno'] as const) {
      monta(lanterna(m));
      expect(box.querySelector('.capitolo-lui')!.classList.contains('capitolo-lanterna-spenta')).toBe(true);
    }
    monta(lanterna('sera'));
    expect(box.querySelector('.capitolo-lui')!.classList.contains('capitolo-lanterna-spenta')).toBe(false);
  });

  it('dove la tavola è un oggetto, Semino non ha il vestito surf', () => {
    for (const c of CAPITOLI.filter((x) => x.oggetti?.includes('tavola'))) expect(c.vestiti.semino).not.toBe('surf');
  });

  it('segreto per Matilde: prima del 9 niente, anche con dati sbagliati', () => {
    monta(cap(8, { luogo: 'bosco', vestiti: { semino: 'lanterna' }, ambiente: { momento: 'giorno', meteo: 'pioggia' }, comparse: ['granchi'], oggetti: ['zaino'] }));
    expect(amb()).toBeNull();
    const fd = box.querySelector<HTMLElement>('.fd')!;
    expect(fd.hasAttribute('data-momento')).toBe(false);
    expect(fd.hasAttribute('data-meteo')).toBe(false);
    expect(fd.dataset.notte).toBe('1');
    expect(box.querySelector('.fd .fd-lucciole')).not.toBeNull();
    expect(box.querySelector('.capitolo-lanterna-spenta')).toBeNull();
  });
});
