import { describe, expect, it } from 'vitest';
import { POSTA_MOSTRATE, postaDaMostrare, quandoPosta } from './Posta';

describe('foglio della posta', () => {
  const ora = new Date(2026, 10, 4, 10, 0).getTime();
  it('oggi, ieri, poi la data', () => {
    expect(quandoPosta(new Date(2026, 10, 4, 8, 5).getTime(), ora)).toBe('oggi 08:05');
    expect(quandoPosta(new Date(2026, 10, 3, 23, 10).getTime(), ora)).toBe('ieri 23:10');
    expect(quandoPosta(new Date(2026, 10, 1, 9, 0).getTime(), ora)).toMatch(/^1 nov, 09:00$/);
  });
  it('le ultime 20, senza nominare Semina prima che arrivi', () => {
    const tante = Array.from({ length: 30 }, (_, i) => ({ ts: 100 - i, da: 'a' as const, testo: `f${i}` }));
    expect(postaDaMostrare(tante, true)).toHaveLength(POSTA_MOSTRATE);
    const conSemina = [{ ts: 2, da: 'b' as const, testo: 'ciao da Semina' }, { ts: 1, da: 'a' as const, testo: 'sei mini' }];
    expect(postaDaMostrare(conSemina, false).map((v) => v.testo)).toEqual(['sei mini']);
    expect(postaDaMostrare(conSemina, true)).toHaveLength(2);
  });
});
