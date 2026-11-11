import { describe, expect, it } from 'vitest';
import { storicoVero } from './compat/storicoVero';
import { byteJson, LOTTO_STORICO_BYTE, lottiStorico } from './lotti';

describe('storico a lotti', () => {
  it('storico piccolo: un solo messaggio, identico', () => {
    const m = { t: 'storico' as const, storico: storicoVero(3, 0), azzerato: 7 };
    expect(lottiStorico(m)).toEqual([m]);
    const vuoto = { t: 'storico' as const, storico: [], azzerato: 9 };
    expect(lottiStorico(vuoto)).toEqual([vuoto]);
  });

  it('20 fiori e 5 germogli killer: lotti sotto 12 KB, tutte le voci in ordine, stesso azzerato e segno inoltrato', () => {
    const storico = storicoVero(20, 5);
    const m = { t: 'storico' as const, storico, azzerato: 3, inoltrato: true as const };
    expect(byteJson(m)).toBeGreaterThan(16_300); // in un messaggio solo: message-too-big
    const lotti = lottiStorico(m);
    expect(lotti.length).toBeGreaterThan(1);
    for (const l of lotti) {
      expect(byteJson(l)).toBeLessThanOrEqual(LOTTO_STORICO_BYTE);
      expect(l.t).toBe('storico');
      expect(l.azzerato).toBe(3);
      expect(l.inoltrato).toBe(true);
    }
    expect(lotti.flatMap((l) => l.storico)).toEqual(storico);
  });

  it('una voce più grande del tetto va da sola nel suo lotto', () => {
    const storico = storicoVero(0, 3);
    const lotti = lottiStorico({ t: 'storico', storico }, 1000);
    expect(lotti.map((l) => l.storico.length)).toEqual(storico.map(() => 1));
  });

  it('byteJson conta i byte UTF-8 come PeerJS', () => {
    expect(byteJson({ t: 'frase', testo: 'è' })).toBe(JSON.stringify({ t: 'frase', testo: 'è' }).length + 1);
  });
});
