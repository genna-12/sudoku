import { describe, expect, it } from 'vitest';
import { generaPuzzle } from '../engine';
import { applica, nuovaPartita, voceStorico } from '../stato';
import { ARCHIVIO_VUOTO, CHIAVE_ARCHIVIO, CHIAVI_V0, carica, migra } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { cancellaPartita, esporta, importa, ioDaArchivio, nomeFileEsportazione, profiloConfermato, ricomincia } from './memoria';

const puzzle = generaPuzzle('sudoku', 'semini', 3);
const idx = puzzle.dati.findIndex((d) => d === 0);
const toccata = applica(nuovaPartita(puzzle, 1000), { tipo: 'cella', idx, v: puzzle.soluzione[idx], note: [], da: 'a', ts: 1001 });
/** capitolo-0..n-1 */
const fino = (n: number) => Array.from({ length: n }, (_, k) => `capitolo-${k}`);
const base = (x: Partial<Archivio> = {}): Archivio => ({
  ...migra({ ...ARCHIVIO_VUOTO }),
  io: { nome: 'Genna', frase: 'segreta' },
  ...x,
});

describe('profilo', () => {
  it('i nomi liberi di T1 diventano un profilo', () => {
    expect(ioDaArchivio(base())?.nome).toBe('Semino');
    expect(ioDaArchivio(base({ io: { nome: 'Giulia', frase: 'x' } }))?.nome).toBe('Semina');
    expect(ioDaArchivio(base({ io: null }))).toBeNull();
  });

  it('migrazione reale da T1 (Genna e Giulia, partita a metà): profilo giusto da confermare, partita intatta, chiavi sparse via', () => {
    for (const [nome, partner, atteso] of [['Genna', 'Giulia', 'Semino'], ['Giulia', 'Genna', 'Semina']] as const) {
      const m = new Map<string, string>();
      const s = {
        get length() { return m.size; },
        clear: () => m.clear(),
        getItem: (k: string) => m.get(k) ?? null,
        key: (i: number) => [...m.keys()][i] ?? null,
        removeItem: (k: string) => void m.delete(k),
        setItem: (k: string, v: string) => void m.set(k, v),
      } as Storage;
      // partita di T1: celle di entrambi (ruoli alfabetici: Genna 'a', Giulia 'b'), niente contatori
      const vuote = puzzle.dati.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
      let p = nuovaPartita(puzzle, 5000);
      p = applica(p, { tipo: 'cella', idx: vuote[0], v: puzzle.soluzione[vuote[0]], note: [], da: 'a', ts: 5001 });
      p = applica(p, { tipo: 'cella', idx: vuote[1], v: puzzle.soluzione[vuote[1]], note: [], da: 'b', ts: 5002 });
      p = { ...p, secondi: 321 };
      m.set(CHIAVI_V0.io, JSON.stringify({ nome, frase: 'sei mini' }));
      m.set(CHIAVI_V0.partner, JSON.stringify(partner));
      m.set(CHIAVI_V0.partita, JSON.stringify(p));
      m.set(CHIAVI_V0.errori, JSON.stringify(false));
      m.set('sudoku-coppia-scelta', JSON.stringify({ modalita: 'sudoku', livello: 'medio' }));
      const a = carica(s);
      expect(ioDaArchivio(a)).toEqual({ nome: atteso, frase: 'sei mini' });
      expect(profiloConfermato(a)).toBe(false);
      expect(profiloConfermato({ ...a, io: ioDaArchivio(a) })).toBe(true);
      expect(a.partita).toEqual(p);
      expect(a.partita?.celle[vuote[0]].da).toBe('a');
      expect(a.partita?.celle[vuote[1]].da).toBe('b');
      expect(a.impostazioni.mostraErrori).toBe(false);
      expect(a.storico).toHaveLength(1);
      expect(a.storico[0].stato).toEqual(p);
      expect([...m.keys()].sort()).toEqual([CHIAVE_ARCHIVIO, 'sudoku-coppia-scelta'].sort());
      expect(carica(s)).toEqual(a);
    }
  });
});

describe('esporta e importa', () => {
  it('esporta tutto tranne la frase', () => {
    const t = esporta(base({ storico: [voceStorico(toccata)] }));
    expect(t).not.toContain('segreta');
    expect(JSON.parse(t).storico).toHaveLength(1);
    expect(nomeFileEsportazione(new Date(2026, 10, 3))).toBe('sudoku-coppia-2026-11-03.json');
  });
  it('importa unendo, senza toccare nome, frase o partita', () => {
    const altro = base({ storico: [voceStorico(toccata)], tappeViste: ['semino-0'] });
    const mio = base({ io: { nome: 'Blu', frase: 'mia' }, partita: null });
    const r = importa(mio, esporta(altro));
    expect(r?.importate).toBe(1);
    expect(r?.archivio.io).toEqual({ nome: 'Blu', frase: 'mia' });
    expect(r?.archivio.storico).toHaveLength(1);
    expect(r?.archivio.tappeViste).toEqual([]); // le tappe di T2-T4 non si importano più
    // reimportare lo stesso file non aggiunge nulla
    expect(importa(r!.archivio, esporta(altro))?.importate).toBe(0);
  });
  it('esporta i capitoli visti, non le tappe di T2-T4', () => {
    const j = JSON.parse(esporta(base({ tappeViste: ['semina-5'], capitoliVisti: { a: fino(2), b: [] } })));
    expect(j).not.toHaveProperty('tappeViste');
    expect(j.capitoliVisti).toEqual({ a: fino(2), b: [] });
  });
  it('importa i capitoli visti per ruolo, rinormalizzati al prefisso', () => {
    const mio = base({ capitoliVisti: { a: fino(4), b: fino(1) } });
    const suo = base({ capitoliVisti: { a: fino(2), b: fino(6) } });
    expect(importa(mio, esporta(suo))?.archivio.capitoliVisti).toEqual({ a: fino(4), b: fino(6) });
    const sparso = JSON.stringify({ ...JSON.parse(esporta(suo)), capitoliVisti: { a: ['capitolo-7'], b: ['capitolo-0', 'capitolo-1', 'capitolo-3'] } });
    expect(importa(mio, sparso)?.archivio.capitoliVisti).toEqual({ a: fino(4), b: fino(2) });
  });
  it('capitoli visti di un\'era diversa: i vecchi non entrano, quelli di un azzeramento più nuovo sostituiscono', () => {
    const mio = base({ azzerato: 500, capitoliVisti: { a: fino(1), b: [] } });
    expect(importa(mio, esporta(base({ azzerato: 100, capitoliVisti: { a: fino(9), b: fino(9) } })))?.archivio.capitoliVisti).toEqual({ a: fino(1), b: [] });
    expect(importa(mio, esporta(base({ azzerato: 900, capitoliVisti: { a: [], b: fino(2) } })))?.archivio.capitoliVisti).toEqual({ a: [], b: fino(2) });
  });
  it('un file v1 (senza capitoliVisti) non importa visti, anche se aveva visto semina-5', () => {
    const v1 = { versione: 1, io: { nome: 'Semina', frase: '' }, storico: [voceStorico(toccata)], azzerato: 0, tappeViste: ['semina-5'] };
    const r = importa(base(), JSON.stringify(v1));
    expect(r?.importate).toBe(1);
    expect(r?.archivio.capitoliVisti).toEqual({ a: [], b: [] });
    expect(r?.archivio.tappeViste).toEqual([]);
  });
  it('file rotti non bloccano nulla', () => {
    expect(importa(base(), '{rotto')).toBeNull();
    expect(importa(base(), '[1,2]')).toBeNull();
    expect(importa(base(), '"ciao"')).toBeNull();
    expect(importa(base(), '{}')?.importate).toBe(0);
  });
  it('un archivio azzerato dopo le mie partite le scarta', () => {
    const mio = base({ storico: [voceStorico(toccata)] });
    const r = importa(mio, esporta(base({ azzerato: 5000 })));
    expect(r?.archivio.storico).toHaveLength(0);
    expect(r?.archivio.azzerato).toBe(5000);
  });
});

describe('cancellazioni', () => {
  it('cancella la partita: resta germoglio', () => {
    const a = cancellaPartita(base({ partita: toccata }));
    expect(a.partita).toBeNull();
    expect(a.storico[0]).toMatchObject({ id: `sudoku-${puzzle.seed}` });
    expect(a.storico[0].finita).toBeUndefined();
    expect(a.storico[0].stato).toBeDefined();
  });
  it('ricomincia da zero: tutto via tranne nome e frase', () => {
    const a = ricomincia(base({ partita: toccata, storico: [voceStorico(toccata)], tappeViste: ['semino-0'], capitoliVisti: { a: fino(3), b: fino(6) }, ecoViste: ['eco-2'] }), 9000);
    expect(a).toMatchObject({ partita: null, storico: [], tappeViste: [], capitoliVisti: { a: [], b: [] }, ecoViste: [], azzerato: 9000 });
    expect(a.io?.frase).toBe('segreta');
    expect(ricomincia(a, 100).azzerato).toBe(9001); // sempre crescente
  });
});
