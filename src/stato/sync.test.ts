import { describe, expect, it } from 'vitest';
import { INTERVALLO_SYNC_MS } from '../config/sync';
import type { Puzzle } from '../engine/types';
import { PREFISSO, derivaBase } from '../net/logica';
import { migra, type Archivio } from './archivio';
import { applica, nuovaPartita, voceStorico } from './index';
import { chiaveSync, decidiScrittura, impronta, motivoCambio, payloadDa, unisciRemoto, type MotivoScrittura } from './sync';
import type { StatoPartita, VoceStorico } from './types';

const subtle = globalThis.crypto.subtle;

function puzzle(seed: number): Puzzle {
  const soluzione = Array.from({ length: 81 }, (_, i) => ((i % 9) + Math.floor(i / 9) * 3 + Math.floor(i / 27)) % 9 + 1);
  const dati = soluzione.map((v, i) => (i % 2 === 0 ? v : 0));
  return { modalita: 'sudoku', livello: 'medio', seed, soluzione, dati };
}

function partita(seed: number, iniziata: number, celle: Array<[number, number, number]> = []): StatoPartita {
  let s = nuovaPartita(puzzle(seed), iniziata);
  for (const [idx, v, ts] of celle) s = applica(s, { tipo: 'cella', idx, v, note: [], da: 'a', ts });
  return s;
}

function voce(seed: number, iniziata: number, aggiornata = iniziata, finita?: number): VoceStorico {
  return { id: `sudoku-${seed}`, modalita: 'sudoku', livello: 'medio', iniziata, secondi: 0, progresso: 0, punti: 0, errori: 0, aggiornata, ...(finita ? { finita } : {}) };
}

function archivio(p: Partial<Archivio> = {}): Archivio {
  return { ...migra(undefined), io: { nome: 'Semino', frase: 'sei mini' }, ...p };
}

const P = (a: Archivio) => payloadDa(a, 0);
const contenuto = (a: Archivio) => impronta(P(a));

describe('chiaveSync', () => {
  it('40 hex, stessa normalizzazione e stesso hash della stanza P2P', async () => {
    for (const frase of ['sei mini', '  Sei   MINI ', 'ciao\tamore mio']) {
      const k = await chiaveSync(frase, subtle);
      expect(k).toMatch(/^[a-f0-9]{40}$/);
      expect(await derivaBase(frase, subtle)).toBe(PREFISSO + k.slice(0, 20));
    }
    expect(await chiaveSync('Sei  mini', subtle)).toBe(await chiaveSync('sei mini', subtle));
  });
});

describe('unisciRemoto', () => {
  const A = archivio({
    storico: [voce(2, 200, 260), voce(1, 100, 150, 150)],
    partita: partita(2, 200, [[1, 3, 210], [3, 4, 220]]),
    tappeViste: ['semino-1'],
  });
  const B = archivio({
    io: { nome: 'Semina', frase: 'sei mini' },
    storico: [voce(3, 300, 300, 330), voce(2, 200, 250)],
    partita: partita(2, 200, [[1, 5, 230], [5, 6, 240]]),
    tappeViste: ['semina-1', 'semino-1'],
  });

  it('commutativa: A∪B e B∪A hanno lo stesso contenuto', () => {
    const ab = unisciRemoto(A, P(B)).archivio;
    const ba = unisciRemoto(B, P(A)).archivio;
    expect(contenuto(ab)).toBe(contenuto(ba));
    expect(ab.storico.map((v) => v.id)).toEqual(['sudoku-3', 'sudoku-2', 'sudoku-1']);
    expect(ab.partita!.celle[1].v).toBe(5);
    expect(Object.keys(ab.partita!.celle).sort()).toEqual(['1', '3', '5']);
  });

  it('commutativa anche con azzeramenti diversi (le tappe di prima dell\'azzeramento non tornano)', () => {
    const X = archivio({ azzerato: 250, storico: [voce(3, 300)], tappeViste: ['semino-1'] });
    const xa = unisciRemoto(X, P(A)).archivio;
    const ax = unisciRemoto(A, P(X)).archivio;
    expect(contenuto(xa)).toBe(contenuto(ax));
    expect(xa.partita).toBeNull();
    expect(xa.storico.map((v) => v.id)).toEqual(['sudoku-3']);
  });

  it('idempotente: riunire lo stesso remoto non cambia nulla e non chiede scritture', () => {
    const r1 = unisciRemoto(A, P(B));
    expect(r1.cambiatoLocale).toBe(true);
    expect(r1.daScrivere).toBe(true);
    const r2 = unisciRemoto(r1.archivio, P(B));
    expect(r2.cambiatoLocale).toBe(false);
    expect(r2.archivio).toBe(r1.archivio);
    const r3 = unisciRemoto(r1.archivio, P(r1.archivio));
    expect(r3).toEqual({ archivio: r1.archivio, cambiatoLocale: false, daScrivere: false });
    // il dispositivo che riceve la versione unita converge senza riscrivere
    const r4 = unisciRemoto(B, { ...P(r1.archivio), aggiornato: 999 });
    expect(r4.daScrivere).toBe(false);
    expect(contenuto(r4.archivio)).toBe(contenuto(r1.archivio));
  });

  it('remoto vuoto o assente non cancella nulla', () => {
    const vuoto = unisciRemoto(A, P(archivio()));
    expect(vuoto.archivio).toBe(A);
    expect(vuoto.cambiatoLocale).toBe(false);
    expect(vuoto.daScrivere).toBe(true);
    expect(unisciRemoto(A, null)).toEqual({ archivio: A, cambiatoLocale: false, daScrivere: true });
    // e un dispositivo nuovo riceve tutto
    const nuovo = unisciRemoto(archivio(), P(A));
    expect(contenuto(nuovo.archivio)).toBe(contenuto(A));
    expect(nuovo.archivio.io).toEqual({ nome: 'Semino', frase: 'sei mini' });
    expect(nuovo.daScrivere).toBe(false);
  });

  it('azzeramento remoto pulisce il locale (storico, partita, tappe)', () => {
    const remoto = P(archivio({ azzerato: 1000, storico: [voce(9, 1100)] }));
    const r = unisciRemoto({ ...A, sbloccatiVisti: ['x'] }, remoto);
    expect(r.cambiatoLocale).toBe(true);
    expect(r.daScrivere).toBe(false);
    expect(r.archivio.azzerato).toBe(1000);
    expect(r.archivio.partita).toBeNull();
    expect(r.archivio.storico.map((v) => v.id)).toEqual(['sudoku-9']);
    expect(r.archivio.tappeViste).toEqual([]);
    expect(r.archivio.sbloccatiVisti).toEqual([]);
  });

  it('una partita remota precedente all\'azzeramento locale non entra', () => {
    const loc = archivio({ azzerato: 500 });
    const r = unisciRemoto(loc, P(archivio({ partita: partita(4, 400) })));
    expect(r.archivio.partita).toBeNull();
    expect(r.daScrivere).toBe(true);
  });

  it('partita più recente vince (puzzle diversi)', () => {
    const vecchia = archivio({ partita: partita(5, 500, [[1, 2, 510]]) });
    const recente = archivio({ partita: partita(6, 600) });
    expect(unisciRemoto(vecchia, P(recente)).archivio.partita!.puzzle.seed).toBe(6);
    const r = unisciRemoto(recente, P(vecchia));
    expect(r.archivio.partita!.puzzle.seed).toBe(6);
    expect(r.cambiatoLocale).toBe(false);
    expect(r.daScrivere).toBe(true);
  });

  it('partita finita sostituisce la stessa in corso', () => {
    const inCorso = partita(7, 700, [[1, 2, 710]]);
    const finita = applica(applica(inCorso, { tipo: 'cella', idx: 3, v: 4, note: [], da: 'b', ts: 720 }), { tipo: 'finita', ts: 730 });
    const loc = archivio({ partita: inCorso, storico: [voceStorico(inCorso)] });
    const r = unisciRemoto(loc, P(archivio({ partita: finita, storico: [voceStorico(finita)] })));
    expect(r.cambiatoLocale).toBe(true);
    expect(r.archivio.partita!.finita).toBe(730);
    expect(r.archivio.partita!.celle[3].v).toBe(4);
    expect(r.archivio.storico[0].finita).toBe(730);
  });

  it('tappe viste: unione, senza scritture se è solo l\'ordine a cambiare', () => {
    const x = archivio({ tappeViste: ['b', 'a'] });
    const y = archivio({ tappeViste: ['a', 'b'] });
    const r = unisciRemoto(x, P(y));
    expect(r).toEqual({ archivio: x, cambiatoLocale: false, daScrivere: false });
    expect(unisciRemoto(x, P(archivio({ tappeViste: ['c'] }))).archivio.tappeViste).toEqual(['b', 'a', 'c']);
  });

  it('il payload non porta nome, frase né impostazioni', () => {
    const p = P(A) as unknown as Record<string, unknown>;
    expect(Object.keys(p).sort()).toEqual(['aggiornato', 'azzerato', 'partita', 'storico', 'tappeViste', 'versione']);
    expect(JSON.stringify(p)).not.toContain('sei mini');
  });
});

describe('motivoCambio', () => {
  const base = archivio({ partita: partita(1, 100) });
  it('riconosce nuova, finita, ricomincia, cancella, mosse', () => {
    expect(motivoCambio(base, base)).toBeNull();
    expect(motivoCambio(base, { ...base, partita: applica(base.partita!, { tipo: 'tick' }) })).toBe('cambio');
    expect(motivoCambio(base, { ...base, partita: partita(2, 200) })).toBe('urgente');
    expect(motivoCambio(base, { ...base, partita: applica(base.partita!, { tipo: 'finita', ts: 150 }) })).toBe('urgente');
    expect(motivoCambio(base, { ...base, azzerato: 300, partita: null })).toBe('urgente');
    expect(motivoCambio(base, { ...base, partita: null })).toBe('cancella');
    expect(motivoCambio(base, { ...base, impostazioni: { mostraErrori: false, vibrazione: true } })).toBeNull();
  });
});

describe('decidiScrittura', () => {
  it('urgente e nascosta subito; i cambi al massimo una volta per intervallo', () => {
    expect(decidiScrittura(1000, 1001, 'urgente')).toBe(0);
    expect(decidiScrittura(1000, 1001, 'nascosta')).toBe(0);
    expect(decidiScrittura(null, 5, 'cambio')).toBe(0);
    expect(decidiScrittura(1000, 1000 + 10_000, 'cambio')).toBe(INTERVALLO_SYNC_MS - 10_000);
    expect(decidiScrittura(1000, 1000 + INTERVALLO_SYNC_MS + 5, 'cambio')).toBe(0);
  });

  it('partita di un\'ora con un tick al secondo: ≤ 60 scritture periodiche (+ nuova e finita)', () => {
    // simula il motore di useSync: un timer alla volta, `ultima` = ultimo contatto
    let ultima: number | null = null;
    let timer: number | null = null;
    let scritture = 0;
    const scrivi = (t: number) => {
      scritture++;
      ultima = t;
    };
    const evento = (t: number, m: MotivoScrittura) => {
      if (timer !== null && t >= timer) {
        timer = null;
        scrivi(t);
      }
      const d = decidiScrittura(ultima, t, m);
      if (d === 0) {
        timer = null;
        scrivi(t);
      } else if (timer === null) timer = t + d;
    };
    evento(0, 'urgente'); // nuova
    for (let s = 1; s < 3600; s++) evento(s * 1000, 'cambio');
    const periodiche = scritture - 1;
    evento(3600 * 1000, 'urgente'); // finita
    expect(periodiche).toBeLessThanOrEqual(60);
    expect(scritture).toBeLessThanOrEqual(62);
  });
});
