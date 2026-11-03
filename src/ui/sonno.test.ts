import { describe, expect, it } from 'vitest';
import { SONNO } from '../config/frasi';
import { ORARI_SONNO, SECONDI_PRIMA_DI_DORMIRE, SEMINA_DORME_TARDI_OGNI, dormePerOrario, seminaDormeTardiOggi } from '../config/sonno';
import { attenuaUmore, fraseSonno } from './regole';
import { umoreRiposo } from './useMascotte';

/** il primo giorno di novembre 2026 (da `inizio`) per cui `seminaDormeTardiOggi` vale `vuoi` */
function giorno(vuoi: boolean, inizio = 1): number {
  for (let g = inizio; g < inizio + 2 * SEMINA_DORME_TARDI_OGNI; g++) if (seminaDormeTardiOggi(new Date(2026, 10, g, 12)) === vuoi) return g;
  throw new Error('nessun giorno');
}
const alle = (g: number, h: number, m = 0) => new Date(2026, 10, g, h, m);

describe('sonno per orario', () => {
  const normale = giorno(false);

  it('a mezzanotte Semina dorme e Semino no', () => {
    expect(dormePerOrario('semina', alle(normale, 0, 0))).toBe(true);
    expect(dormePerOrario('semino', alle(normale, 0, 0))).toBe(false);
  });

  it('i bordi: a letto incluso, sveglia esclusa', () => {
    expect(dormePerOrario('semina', alle(normale, 21, 59))).toBe(false);
    expect(dormePerOrario('semina', alle(normale, 22, 0))).toBe(true);
    expect(dormePerOrario('semino', alle(normale, 3, 30))).toBe(true);
    expect(dormePerOrario('semino', alle(normale, 3, 29))).toBe(false);
    expect(dormePerOrario('semino', alle(normale, 11, 29))).toBe(true);
    expect(dormePerOrario('semino', alle(normale, 11, 30))).toBe(false);
  });

  it('nel giorno normale Semina si sveglia all’alba; di pomeriggio sono svegli tutti e due', () => {
    expect(dormePerOrario('semina', alle(normale, 6, 0))).toBe(true);
    expect(dormePerOrario('semina', alle(normale, 7, 0))).toBe(false);
    expect(dormePerOrario('semina', alle(normale, 15, 0))).toBe(false);
    expect(dormePerOrario('semino', alle(normale, 15, 0))).toBe(false);
  });

  it('nel giorno da dormigliona Semina dorme fino alla sveglia di Semino', () => {
    const tardi = giorno(true);
    expect(dormePerOrario('semina', alle(tardi, 9, 0))).toBe(true);
    expect(dormePerOrario('semino', alle(tardi, 9, 0))).toBe(true);
    expect(dormePerOrario('semina', alle(tardi, Math.ceil(ORARI_SONNO.semino.sveglia)))).toBe(false);
  });

  it('un giorno su SEMINA_DORME_TARDI_OGNI, fisso per tutta la giornata', () => {
    let n = 0;
    for (let g = 1; g <= 40; g++) {
      const v = seminaDormeTardiOggi(new Date(2026, 0, g, 1));
      expect(seminaDormeTardiOggi(new Date(2026, 0, g, 23))).toBe(v);
      if (v) n++;
    }
    expect(n).toBe(40 / SEMINA_DORME_TARDI_OGNI);
  });
});

describe('mascotte assonnate', () => {
  it('a riposo: dorme di notte o dopo un minuto senza attività', () => {
    const pomeriggio = alle(giorno(false), 15).getTime();
    expect(umoreRiposo('semino', pomeriggio, pomeriggio - 1000)).not.toBe('dorme');
    expect(umoreRiposo('semino', pomeriggio, pomeriggio - SECONDI_PRIMA_DI_DORMIRE * 1000)).toBe('dorme');
    const notte = alle(giorno(false), 23).getTime();
    expect(umoreRiposo('semina', notte, notte)).toBe('dorme');
  });

  it('svegliata di notte reagisce attenuata', () => {
    expect(attenuaUmore('euforico')).toBe('felice');
    expect(attenuaUmore('festa')).toBe('felice');
    expect(attenuaUmore('arrabbiato')).toBe('preoccupato');
    expect(attenuaUmore('imbarazzato')).toBe('imbarazzato');
  });

  it('frasi del sonno: mai uguali di fila; Semina dormigliona dice la sua', () => {
    const d = alle(giorno(false), 23);
    const t = fraseSonno('semina', '', d, () => 0);
    expect(SONNO.semina).toContain(t);
    expect(fraseSonno('semina', t, d, () => 0)).not.toBe(t);
    const tardi = alle(giorno(true), 9);
    expect(fraseSonno('semina', '', tardi)).toMatch(/fino a tardi/);
    // nelle sue ore normali di sonno, anche nel giorno da dormigliona, frasi qualunque
    expect(SONNO.semina).toContain(fraseSonno('semina', '', alle(giorno(true), 23), () => 0.99));
  });
});
