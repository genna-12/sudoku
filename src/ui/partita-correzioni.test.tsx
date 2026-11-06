// @vitest-environment jsdom
// Correzioni della revisione UI del 06/11 (area Partita e Vittoria): timer, annulla, voce, sonno.
import { act, useCallback, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generaPuzzle } from '../engine';
import type { Messaggio } from '../net';
import { nuovaPartita } from '../stato';
import type { Giocatore, StatoPartita } from '../stato';
import { migra } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { aMezzaVoce, fraseMascotte, sonnoPuoSostituire } from './regole';
import { AVVISO_ANNULLA_CAMBIATA, AVVISO_ANNULLA_DEFINITIVA, usePartita, useTimerPartita } from './usePartita';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Gioco = ReturnType<typeof usePartita>;
interface Banco {
  gioco: Gioco;
  ref: { current: Archivio };
  avvisi: string[];
  inviati: Messaggio[];
  /** forza un render di chi usa il gioco (come fanno battute, cursore e umori in App) */
  rendi: () => void;
}

function Prova({ partita, mioRuolo, fuori }: { partita: StatoPartita; mioRuolo: Giocatore; fuori: { current: Banco | null } }) {
  const [a, setA] = useState<Archivio>(() => ({ ...migra({}), partita }));
  const [, setN] = useState(0);
  const ref = useRef(a);
  const avvisi = useRef<string[]>([]);
  const inviati = useRef<Messaggio[]>([]);
  const modifica = useCallback((fn: (x: Archivio) => Archivio) => {
    ref.current = fn(ref.current);
    setA(ref.current);
    return ref.current;
  }, []);
  const gioco = usePartita({
    partita: a.partita,
    ref,
    modifica,
    mioRuolo,
    sbloccata: false,
    mostraErrori: true,
    invia: (m) => inviati.current.push(m),
    frase: () => 'frase',
    effetti: {
      reazione: () => {},
      lampo: () => {},
      vibra: () => {},
      vittoria: () => {},
      avviso: (t) => avvisi.current.push(t),
    },
  });
  useTimerPartita(!!a.partita && !a.partita.finita, gioco.tick);
  fuori.current = { gioco, ref, avvisi: avvisi.current, inviati: inviati.current, rendi: () => setN((n) => n + 1) };
  return null;
}

let root: Root;
let box: HTMLDivElement;
const fuori: { current: Banco | null } = { current: null };
const b = () => fuori.current!;

function monta(mioRuolo: Giocatore = 'a') {
  const p = nuovaPartita(generaPuzzle('sudoku', 'facile', 12345), Date.now() - 10);
  act(() => root.render(<Prova partita={p} mioRuolo={mioRuolo} fuori={fuori} />));
  return p;
}
/** celle vuote del puzzle, col valore giusto e uno sbagliato */
function vuote(p: StatoPartita) {
  const out: Array<{ idx: number; giusto: number; sbagliato: number }> = [];
  p.puzzle.dati.forEach((d, idx) => {
    if (d === 0) {
      const giusto = p.puzzle.soluzione[idx];
      out.push({ idx, giusto, sbagliato: (giusto % 9) + 1 });
    }
  });
  return out;
}
/** una mossa del partner (ruolo `da`) che arriva dalla rete */
function dalPartner(idx: number, v: number, da: Giocatore = 'b') {
  const ts = Date.now() + 5;
  act(() => {
    b().gioco.riceviCella({ t: 'cella', idx, v, note: [], da, ts });
  });
}

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

describe('P1 timer della partita', () => {
  it('15 s di note (un tocco ogni 600 ms, con render frequenti) non fermano il tempo', () => {
    const p = monta();
    const { idx } = vuote(p)[0];
    act(() => vi.advanceTimersByTime(6000));
    expect(b().ref.current.partita!.secondi).toBe(6);
    for (let k = 0; k < 25; k++) {
      act(() => {
        b().gioco.mossa(idx, 0, k % 2 ? [] : [1 + (k % 9)]);
        b().rendi();
      });
      act(() => vi.advanceTimersByTime(600));
    }
    // 6 s + 25 × 0,6 s = 21 s
    expect(b().ref.current.partita!.secondi).toBeGreaterThanOrEqual(20);
  });

  it('render ogni 300 ms per 10 s: il timer conta 10 secondi', () => {
    monta();
    for (let k = 0; k < 34; k++) {
      act(() => b().rendi());
      act(() => vi.advanceTimersByTime(300));
    }
    expect(b().ref.current.partita!.secondi).toBe(10);
  });

  it('tick è la stessa funzione a ogni render', () => {
    monta();
    const t = b().gioco.tick;
    act(() => b().rendi());
    act(() => b().rendi());
    expect(b().gioco.tick).toBe(t);
  });
});

describe('P2 annulla in coppia', () => {
  it('cella poi scritta dal partner: annulla non la tocca, avvisa e non salta a mosse più vecchie', () => {
    const p = monta('a');
    const [x, y] = vuote(p);
    act(() => void b().gioco.mossa(x.idx, x.sbagliato, []));
    act(() => vi.advanceTimersByTime(5));
    act(() => void b().gioco.mossa(y.idx, y.sbagliato, []));
    // il partner scrive un altro numero (sbagliato anche lui) in Y
    const altro = (y.sbagliato % 9) + 1 === y.giusto ? (y.sbagliato % 9) + 2 : (y.sbagliato % 9) + 1;
    dalPartner(y.idx, altro);
    let r: number | null = null;
    act(() => {
      r = b().gioco.annulla();
    });
    expect(r).toBe(y.idx);
    expect(b().ref.current.partita!.celle[y.idx].v).toBe(altro);
    expect(b().ref.current.partita!.celle[x.idx].v).toBe(x.sbagliato);
    expect(b().avvisi).toEqual([AVVISO_ANNULLA_CAMBIATA]);
    // il tocco dopo annulla la mia mossa in X (ancora com'era)
    act(() => void b().gioco.annulla());
    expect(b().ref.current.partita!.celle[x.idx].v).toBe(0);
    expect(b().avvisi.length).toBe(1);
  });

  it('cella resa giusta (definitiva) dal partner: avviso, la mia mossa più vecchia resta', () => {
    const p = monta('a');
    const [z1, z2] = vuote(p);
    act(() => void b().gioco.mossa(z1.idx, z1.sbagliato, []));
    act(() => vi.advanceTimersByTime(5));
    act(() => void b().gioco.mossa(z2.idx, z2.sbagliato, []));
    dalPartner(z2.idx, z2.giusto);
    act(() => void b().gioco.annulla());
    expect(b().ref.current.partita!.celle[z2.idx].v).toBe(z2.giusto);
    expect(b().ref.current.partita!.celle[z1.idx].v).toBe(z1.sbagliato);
    expect(b().avvisi).toEqual([AVVISO_ANNULLA_DEFINITIVA]);
  });

  it('da solo: annulla ripristina la cella com\'era, mossa dopo mossa, e manda le mosse già esistenti', () => {
    const p = monta('a');
    const [x] = vuote(p);
    act(() => void b().gioco.mossa(x.idx, 0, [2, 5]));
    act(() => vi.advanceTimersByTime(5));
    act(() => void b().gioco.mossa(x.idx, x.sbagliato, []));
    act(() => void b().gioco.annulla());
    expect(b().ref.current.partita!.celle[x.idx]).toMatchObject({ v: 0, note: [2, 5] });
    act(() => void b().gioco.annulla());
    expect(b().ref.current.partita!.celle[x.idx]).toMatchObject({ v: 0, note: [] });
    expect(b().avvisi).toEqual([]);
    // nessun tipo di messaggio nuovo: solo celle (e contatori dell'errore)
    expect(new Set(b().inviati.map((m) => m.t))).toEqual(new Set(['cella', 'contatori']));
  });

  it('una mia mossa giusta (definitiva) non occupa Annulla: si annulla quella prima', () => {
    const p = monta('a');
    const [x, y] = vuote(p);
    act(() => void b().gioco.mossa(x.idx, x.sbagliato, []));
    act(() => vi.advanceTimersByTime(5));
    act(() => void b().gioco.mossa(y.idx, y.giusto, []));
    act(() => void b().gioco.annulla());
    expect(b().ref.current.partita!.celle[y.idx].v).toBe(y.giusto);
    expect(b().ref.current.partita!.celle[x.idx].v).toBe(0);
    expect(b().avvisi).toEqual([]);
  });
});

/** caso ripetibile */
function lcg(k: number) {
  return () => (k = (k * 9301 + 49297) % 233280) / 233280;
}

describe('P4 prima di Semina, sul telefono di Blu', () => {
  const s = { nome: 'Genna', io: 'Mati', reale: 'Mati', realePartner: 'Genna', n: 3 };
  const categorie = ['giusta', 'intelligente', 'brillante', 'completato', 'serie', 'sbagliata', 'sbagliataSerie', 'regalo', 'vittoria'] as const;
  it('Semino commenta le mosse di Mati senza chiamarla "Genna"', () => {
    for (const c of categorie) {
      const caso = lcg(7);
      for (let i = 0; i < 400; i++) {
        const t = fraseMascotte(c, 'semino', [], s, caso, 0, false, 'b');
        expect(t, `${c}: ${t}`).not.toMatch(/\bGenna\b/);
      }
    }
  });
  it('sul telefono di Verde la voce di Semino resta intera (anche coi nomi)', () => {
    const viste = new Set<string>();
    const caso = lcg(1);
    for (let i = 0; i < 2000; i++)
      viste.add(fraseMascotte('sbagliata', 'semino', [], { ...s, reale: 'Genna', realePartner: 'Mati' }, caso, 0, false, 'a'));
    expect([...viste].some((t) => /\bGenna\b/.test(t))).toBe(true);
  });
});

describe('P7 frasi di sonno', () => {
  it('solo al posto di una mossa giusta semplice, mai di errori, chiusure o vittoria', () => {
    expect(sonnoPuoSostituire('giusta')).toBe(true);
    for (const c of ['sbagliata', 'sbagliataSerie', 'vittoria', 'completato', 'brillante', 'intelligente', 'serie', 'regalo', 'suggerimento'])
      expect(sonnoPuoSostituire(c), c).toBe(false);
  });
  it('un errore di notte resta la sua frase, a mezza voce', () => {
    expect(aMezzaVoce('sbagliata', 'quasi')).toBe('zzz… quasi');
    expect(aMezzaVoce('vittoria', 'GG')).toBe('GG');
    expect(aMezzaVoce('sbagliata', '')).toBe('');
  });
});
