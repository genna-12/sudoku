import { describe, expect, it } from 'vitest';
import sorgente from '../../docs/storia/capitoli.md?raw';
import dati from './capitoli.json';
import { CAPITOLI, SEMINA_ARRIVA_A, ULTIMO_CAPITOLO, capitolo, chiaveCapitolo } from './capitoli';

// Solo ciò che controlla.py non controlla (il resto lo verifica lo script quando genera il JSON).
describe('capitoli', () => {
  it('101 capitoli con fiore = indice', () => {
    expect(CAPITOLI).toHaveLength(ULTIMO_CAPITOLO + 1);
    CAPITOLI.forEach((c, i) => expect(c.fiore).toBe(i));
  });

  it('ogni secondario entra una volta sola, nell\'ordine e al suo fiore', () => {
    const entrate = CAPITOLI.filter((c) => c.entra).map((c) => [c.entra, c.fiore]);
    expect(entrate).toEqual([
      ['fischio', 10],
      ['pinza', 17],
      ['nuvola', 30],
      ['nonnacapra', 33],
      ['gufo', 44],
      ['grillo', 56],
      ['briciola', 68],
    ]);
  });

  it('il JSON corrisponde a capitoli.md (sha256 della sorgente)', async () => {
    const hash = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(sorgente)));
    const hex = Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
    expect((dati as unknown as Array<{ _sorgente_sha256?: string }>)[0]._sorgente_sha256).toBe(hex);
  });

  it('null nel JSON → campo assente; capitolo() fuori intervallo → undefined', () => {
    const zero = capitolo(0)!;
    expect('entra' in zero).toBe(false);
    expect('fondale' in zero).toBe(false);
    expect(CAPITOLI.every((c) => c.battute.every((b) => b.umore !== null))).toBe(true);
    expect(capitolo(10)?.entra).toBe('fischio');
    expect(capitolo(-1)).toBeUndefined();
    expect(capitolo(1.5)).toBeUndefined();
    expect(capitolo(ULTIMO_CAPITOLO + 1)).toBeUndefined();
  });

  it('chiave stabile e arrivo di Semina', () => {
    expect(chiaveCapitolo(5)).toBe('capitolo-5');
    expect(SEMINA_ARRIVA_A).toBe(5);
  });
});
