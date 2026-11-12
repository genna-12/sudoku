// @vitest-environment jsdom
/// <reference types="node" />
// T9 B (ADR 007, spec T9-B-colori): classi delle caselle e regole del CSS che le colorano.
// I contrasti si misurano nel browser vero con scripts/qa/colori-griglia-t9b.mjs.
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Puzzle } from '../engine';
import type { Cella } from '../stato';
import { Griglia } from './Griglia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SOL = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  return ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
});
// prime due righe vuote: lì scrivono i giocatori
const PUZZLE: Puzzle = { modalita: 'sudoku', livello: 'facile', seed: 7, soluzione: SOL, dati: SOL.map((v, i) => (i < 18 ? 0 : v)) };
const cella = (v: number, da: 'a' | 'b'): Cella => ({ v, note: [], da, ts: 1 });
const SBAGLIATO = (i: number) => (SOL[i] % 9) + 1;

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

/** casella 0: scritta da a; 1: da b; 2: da a, sbagliata (stessa riga della selezione 4) */
function disegna(p: { mioRuolo: 'a' | 'b'; sel: number | null; partner: number | null; evidenziato?: number }) {
  const valori = PUZZLE.dati.slice();
  const celle: Record<number, Cella> = {};
  const scritte: Record<number, [number, 'a' | 'b']> = { 0: [SOL[0], 'a'], 1: [SOL[1], 'b'], 2: [SBAGLIATO(2), 'a'] };
  for (const [k, [v, da]] of Object.entries(scritte)) {
    valori[+k] = v;
    celle[+k] = cella(v, da);
  }
  act(() =>
    root.render(
      <Griglia
        puzzle={PUZZLE}
        valori={valori}
        celle={celle}
        selezionata={p.sel}
        onSeleziona={() => {}}
        mostraErrori
        mioRuolo={p.mioRuolo}
        partnerCursore={p.partner}
        lampo={null}
        arrivo={null}
        evidenziato={p.evidenziato ?? 0}
        onDoppio={() => {}}
        sceltaRegalo={false}
      />,
    ),
  );
  return Array.from(box.querySelectorAll<HTMLElement>('[role="gridcell"]')).map((c) => new Set(c.className.split(' ')));
}

describe('classi delle caselle', () => {
  it('mia/sua dal ruolo di chi guarda: sul telefono di Mati (b) si scambiano', () => {
    const g = disegna({ mioRuolo: 'a', sel: null, partner: null });
    expect([g[0].has('mia'), g[1].has('sua')]).toEqual([true, true]);
    const m = disegna({ mioRuolo: 'b', sel: null, partner: null });
    expect([m[0].has('sua'), m[1].has('mia')]).toEqual([true, true]);
  });

  it('la mia fascia è riga, colonna e box della mia selezione; del partner solo la sua casella', () => {
    const c = disegna({ mioRuolo: 'a', sel: 40, partner: 60 });
    const fascia = c.flatMap((s, i) => (s.has('vicina') ? [i] : []));
    const r = (i: number) => Math.floor(i / 9);
    const k = (i: number) => i % 9;
    const b = (i: number) => Math.floor(r(i) / 3) * 3 + Math.floor(k(i) / 3);
    for (const i of fascia) expect(r(i) === 4 || k(i) === 4 || b(i) === b(40)).toBe(true);
    expect(c[40].has('selezionata')).toBe(true);
    expect(c[60].has('partner')).toBe(true);
    expect(c.filter((s) => s.has('partner')).length).toBe(1);
    expect(c.some((s) => [...s].some((x) => x.startsWith('vicina-')))).toBe(false);
  });

  it("l'errore resta accanto a fascia, selezione, numero uguale e faro (le classi non si escludono)", () => {
    // 2 è sbagliata e sta nella riga della selezione 4
    expect(disegna({ mioRuolo: 'a', sel: 4, partner: null })[2]).toEqual(new Set(['cella', 'mia', 'vicina', 'errore']));
    expect(disegna({ mioRuolo: 'a', sel: 2, partner: 2 })[2]).toEqual(new Set(['cella', 'mia', 'selezionata', 'errore', 'partner']));
    // selezione su una casella data con lo stesso numero sbagliato: la 2 è "stessa", errore e (doppio tocco) faro
    const v = SBAGLIATO(2);
    const j = SOL.findIndex((x, i) => i >= 18 && x === v);
    expect(disegna({ mioRuolo: 'a', sel: j, partner: null, evidenziato: v })[2]).toEqual(new Set(['cella', 'mia', 'faro', 'stessa', 'errore']));
  });
});

describe('regole del CSS della griglia', () => {
  // vitest non dà il CSS ai test (né con ?raw): si legge il file, dalla radice del progetto
  const css = readFileSync(`${process.cwd()}/src/ui/tema.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /** corpo di tutte le regole con quel selettore esatto */
  const regole = (sel: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].split(',').some((s: string) => s.trim() === sel)).map((m) => m[2]).join('\n');

  it('solo l\'errore tocca --bg, e lo fa sopra --fondo: nessuno stato cancella più il rosso', () => {
    for (const s of ['mia', 'sua', 'vicina', 'stessa', 'selezionata', 'faro', 'partner']) expect(regole(`.cella.${s}`)).not.toMatch(/--bg\s*:/);
    expect(regole('.cella.errore')).toMatch(/--bg:\s*color-mix\([^;]*var\(--fondo\)\)/);
  });

  it('caselle mia/sua senza fondo; chi ha scritto si legge dal colore del numero', () => {
    expect(regole('.cella.mia')).toBe('');
    expect(regole('.cella.sua')).toBe('');
    expect(regole('.cella.mia .valore')).toMatch(/--g-testo-mio/);
    expect(regole('.cella.sua .valore')).toMatch(/--g-testo-suo/);
  });

  it('il partner è un anello tratteggiato; sulla stessa casella il mio anello pieno rientra', () => {
    expect(regole('.cella.partner::before')).toMatch(/border:\s*3px dashed var\(--g-suo\)/);
    expect(regole('.cella.selezionata')).toMatch(/inset 0 0 0 3\.5px var\(--g-mio\)/);
    expect(regole('.cella.partner.selezionata')).toMatch(/inset 0 0 0 4px var\(--bg\),\s*inset 0 0 0 7\.5px var\(--g-mio\)/);
  });

  it('fondi in ordine: fascia < uguale < selezione < faro', () => {
    const pos = (s: string) => css.search(new RegExp(`\\n\\.cella\\.${s} \\{\\n  --fondo`));
    const p = ['vicina', 'stessa', 'selezionata', 'faro'].map(pos);
    expect(p.every((x) => x > 0)).toBe(true);
    expect([...p].sort((a, b) => a - b)).toEqual(p);
  });
});
