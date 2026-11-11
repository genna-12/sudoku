import { describe, expect, it } from 'vitest';
import { testoPallino } from './presenza';

describe('pallino onesto durante la riconnessione (T9 A)', () => {
  it('"mi ricollego…" mentre la connessione si ricostruisce, non "già collegato altrove"', () => {
    expect(testoPallino('in-attesa', 'Mati', false, false, true)).toEqual({ breve: 'mi ricollego…', intero: 'mi ricollego…' });
  });
  it('"già collegato altrove" solo con la prova (occupata vince)', () => {
    expect(testoPallino('in-attesa', 'Mati', true, false, true).breve).toBe('già collegato altrove');
  });
  it('ricollego vale solo in attesa', () => {
    expect(testoPallino('connesso', 'Mati', false, false, true).breve).toBe('Mati è qui');
    expect(testoPallino('in-attesa', 'Mati').breve).toBe('aspetto Mati');
  });
});
