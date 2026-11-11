import { describe, expect, it } from 'vitest';
import dati from './ambienti.json';
import { COMPARSE, MAX_PER_CAPITOLO, METEO, MOMENTI_AMBIENTE, OGGETTI, comparsaValida, oggettoValido } from './ambienti';
import { CAPITOLI } from './capitoli';

// Il vocabolario lo controlla anche controlla.py; qui la parte che l'app dà per scontata.
describe('ambienti dei capitoli', () => {
  it('momenti e meteo sono quelli della spec T9 C', () => {
    expect(MOMENTI_AMBIENTE).toEqual(['alba', 'mattina', 'giorno', 'tramonto', 'sera', 'notte']);
    expect(METEO).toEqual(['sereno', 'nuvole', 'vento', 'pioggia', 'temporale', 'nebbia', 'neve']);
  });

  it('vocabolario chiuso: al massimo 10 comparse e 30 oggetti, id in minuscolo col trattino', () => {
    expect(Object.keys(dati.comparse).length).toBeLessThanOrEqual(10);
    expect(Object.keys(dati.oggetti).length).toBeLessThanOrEqual(30);
    for (const id of [...Object.keys(COMPARSE), ...Object.keys(OGGETTI)]) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(comparsaValida('toString')).toBe(false);
    expect(oggettoValido('constructor')).toBe(false);
  });

  it('segreto per Matilde: nessun capitolo prima del 9 ha ambiente, comparse o oggetti', () => {
    for (const c of CAPITOLI.filter((x) => x.fiore < 9)) {
      expect('ambiente' in c || 'comparse' in c || 'oggetti' in c).toBe(false);
    }
  });

  it('dove ci sono: valori del vocabolario, al massimo 3', () => {
    for (const c of CAPITOLI) {
      if (c.ambiente) {
        expect(MOMENTI_AMBIENTE).toContain(c.ambiente.momento);
        expect(METEO).toContain(c.ambiente.meteo);
      }
      expect((c.comparse ?? []).length).toBeLessThanOrEqual(MAX_PER_CAPITOLO);
      expect((c.oggetti ?? []).length).toBeLessThanOrEqual(MAX_PER_CAPITOLO);
      (c.comparse ?? []).forEach((id) => expect(comparsaValida(id)).toBe(true));
      (c.oggetti ?? []).forEach((id) => expect(oggettoValido(id)).toBe(true));
    }
  });
});
