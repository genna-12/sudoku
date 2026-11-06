// @vitest-environment jsdom
// S10 (revisione UI 06/11): oltre 15 capitoli letti gli atti prima dell'ultimo sono chiusi; ogni atto dice i suoi capitoli.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { diario } from './capitoli';
import { Giardino } from './Giardino';

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

const visti = (n: number) => Array.from({ length: n }, (_, i) => `capitolo-${i}`);

function monta(n: number, onRileggi = vi.fn()) {
  act(() =>
    root.render(
      <Giardino
        storico={[]}
        inCorso={null}
        sbloccata
        visti={visti(n)}
        elementi={[]}
        bluPresenza={0}
        mascotte={{ semino: { umore: 'neutro', impulso: 0 }, semina: { umore: 'neutro', impulso: 0 } }}
        solletico={null}
        onSolletico={vi.fn()}
        onRiprendi={vi.fn()}
        onEsci={vi.fn()}
        diario={diario(visti(n))}
        onRileggi={onRileggi}
      />,
    ),
  );
  return onRileggi;
}
const atti = () => [...box.querySelectorAll<HTMLDetailsElement>('details.diario-atto')];

describe('Diario nel Giardino', () => {
  it('con molti capitoli: un atto per riga, aperto solo l\'ultimo', () => {
    monta(101);
    const a = atti();
    expect(a.length).toBe(diario(visti(101)).length);
    expect(a.length).toBeGreaterThan(3);
    expect(a.slice(0, -1).every((d) => !d.open)).toBe(true);
    expect(a[a.length - 1].open).toBe(true);
    // il primo atto dice i suoi capitoli, dal primo all'ultimo letto
    const primo = diario(visti(101))[0].capitoli;
    expect(a[0].querySelector('summary')?.textContent).toContain(`capitoli ${primo[0].fiore}-${primo[primo.length - 1].fiore}`);
  });

  it('con pochi capitoli (9) tutti gli atti sono aperti e le righe rileggono il capitolo', () => {
    const onRileggi = monta(9);
    expect(atti()).toHaveLength(2);
    expect(atti().every((d) => d.open)).toBe(true);
    act(() => (box.querySelector('[data-testid="diario-3"]') as HTMLButtonElement).click());
    expect(onRileggi).toHaveBeenCalledWith(3);
  });
});
