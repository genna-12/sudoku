import { describe, expect, it } from 'vitest';
import { generaPuzzle } from '../engine';
import { applica, nuovaPartita, voceStorico } from '../stato';
import { ARCHIVIO_VUOTO, migra } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { cancellaPartita, esporta, importa, ioDaArchivio, nomeFileEsportazione, ricomincia } from './memoria';

const puzzle = generaPuzzle('sudoku', 'semini', 3);
const idx = puzzle.dati.findIndex((d) => d === 0);
const toccata = applica(nuovaPartita(puzzle, 1000), { tipo: 'cella', idx, v: puzzle.soluzione[idx], note: [], da: 'a', ts: 1001 });
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
    expect(r?.archivio.tappeViste).toContain('semino-0');
    // reimportare lo stesso file non aggiunge nulla
    expect(importa(r!.archivio, esporta(altro))?.importate).toBe(0);
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
    const a = ricomincia(base({ partita: toccata, storico: [voceStorico(toccata)], tappeViste: ['semino-0'] }), 9000);
    expect(a).toMatchObject({ partita: null, storico: [], tappeViste: [], azzerato: 9000 });
    expect(a.io?.frase).toBe('segreta');
    expect(ricomincia(a, 100).azzerato).toBe(9001); // sempre crescente
  });
});
