// @vitest-environment jsdom
// Correzioni della revisione UI del 06/11 sulla schermata Partita: suggerimento dei gesti (P10),
// partita finita dopo "guarda la griglia" (P16), Annulla che seleziona la cella (P2).
import { act } from 'react';
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Puzzle } from '../engine';
import { nuovaPartita } from '../stato';
import type { StatoPartita } from '../stato';
import { Partita } from './Partita';
import type { Battuta } from './Toasts';
import { useGestoIndietro } from './indietro';
import type { Mascotte } from './useMascotte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { __APP_VERSIONE__?: string }).__APP_VERSIONE__ = 'prova';

const SOL = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
});
const PUZZLE: Puzzle = { modalita: 'sudoku', livello: 'facile', seed: 7, soluzione: SOL, dati: SOL.map((v, i) => (i < 18 ? 0 : v)) };
const MASCOTTE = { semino: { umore: 'neutro', impulso: 0 }, semina: { umore: 'neutro', impulso: 0 } } as Mascotte;

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as never;
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  vi.useRealTimers();
});

function ConIndietro({ children }: { children: ReactNode }) {
  useGestoIndietro(() => ({ schermata: 'partita', entrato: true, bloccato: false }), () => {});
  return <>{children}</>;
}
function partita(extra: Partial<Parameters<typeof Partita>[0]> = {}, p: StatoPartita = nuovaPartita(PUZZLE, 1)) {
  return (
    <ConIndietro>
      <Partita
        partita={p}
        mioRuolo="a"
        partnerNome="Mati"
        connessione="connesso"
        personaleConnesso={false}
        partnerCursore={null}
        mostraErrori
        vibrazione={false}
        onImpostazione={() => {}}
        tema="auto"
        onTema={() => {}}
        onCancellaPartita={() => {}}
        sbloccata={false}
        mascotte={MASCOTTE}
        chiacchiera={null}
        battuta={null}
        solletico={null}
        onSolletico={() => {}}
        onSuggerisci={() => false}
        onMossa={() => {}}
        onAnnulla={() => {}}
        puoAnnullare={false}
        onCursore={() => {}}
        onFrase={() => {}}
        frasiDaScegliere={() => ['una', 'due']}
        onEsci={() => {}}
        lampo={null}
        arrivo={null}
        {...extra}
      />
    </ConIndietro>
  );
}
const testoFumetto = () => box.querySelector('.battuta [data-testid="toast-testo"]')?.textContent ?? null;

describe('P10 suggerimento dei gesti', () => {
  const gesto: Battuta = { id: 1000, chi: 'semino', testo: 'Tocca due volte una cella piena: accendo tutti i numeri uguali', tono: 'mio', categoria: 'gesto' };
  it('si ferma da sé: le battute aspettano, poi dopo 4,5 s si chiude e le battute ripartono', () => {
    const onFerma = vi.fn();
    const onRiprendi = vi.fn();
    act(() => root.render(partita({ battuta: gesto, onFerma, onRiprendi })));
    expect(testoFumetto()).toBe(gesto.testo);
    expect(onFerma).toHaveBeenCalledTimes(1);
    // arriva una reazione (in App resterebbe in coda; qui la si passa lo stesso): il suggerimento resta
    act(() => root.render(partita({ battuta: { id: 1001, chi: 'semino', testo: 'quasi', tono: 'errore', categoria: 'sbagliata' }, onFerma, onRiprendi })));
    act(() => vi.advanceTimersByTime(3000));
    expect(testoFumetto()).toBe(gesto.testo);
    expect(onRiprendi).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1600));
    expect(onRiprendi).toHaveBeenCalledWith(gesto.id);
    expect(testoFumetto()).toBe('quasi');
  });
  it('un tocco lo chiude prima', () => {
    const onRiprendi = vi.fn();
    act(() => root.render(partita({ battuta: gesto, onFerma: () => {}, onRiprendi })));
    act(() => (box.querySelector('.battuta') as HTMLElement).click());
    expect(onRiprendi).toHaveBeenCalledWith(gesto.id);
    expect(testoFumetto()).toBeNull();
    act(() => vi.advanceTimersByTime(5000));
    expect(onRiprendi).toHaveBeenCalledTimes(1);
  });
});

describe('P16 partita finita', () => {
  const finita = (): StatoPartita => ({
    ...nuovaPartita(PUZZLE, 1),
    celle: Object.fromEntries(SOL.slice(0, 18).map((v, i) => [i, { v, note: [], da: 'a' as const, ts: 2 }])),
    finita: 3,
    contatori: { a: { punti: 10, errori: 0, serie: 0, regali: 1, regaliDisponibili: 2, ts: 3 } },
  });
  it('al posto di annulla, cancella e note: "Fiorita!" e Nuova partita; tastierino spento; seme senza numero', () => {
    const onNuova = vi.fn();
    act(() => root.render(partita({ onNuova }, finita())));
    expect(box.querySelector('[data-testid="partita-fiorita"]')?.textContent).toBe('Fiorita!');
    expect(box.querySelector('[data-testid="cancella"]')).toBeNull();
    expect(box.querySelector('[data-testid="matita"]')).toBeNull();
    expect(box.querySelector('.tastierino')?.hasAttribute('inert')).toBe(true);
    expect(box.querySelector('.regalo-n')).toBeNull();
    act(() => (box.querySelector('[data-testid="partita-nuova"]') as HTMLElement).click());
    expect(onNuova).toHaveBeenCalledTimes(1);
  });
});

describe('P2 annulla seleziona la cella interessata', () => {
  it('la cella restituita da onAnnulla diventa la selezionata', () => {
    act(() => root.render(partita({ onAnnulla: () => 4, puoAnnullare: true })));
    act(() => (box.querySelector('[data-testid="annulla"]') as HTMLElement).click());
    const sel = Array.from(box.querySelectorAll('[role="gridcell"]')).findIndex((c) => c.getAttribute('aria-selected') === 'true');
    expect(sel).toBe(4);
  });
});
