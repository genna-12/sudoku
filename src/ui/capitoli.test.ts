import { describe, expect, it } from 'vitest';
import { CAPITOLI, SEMINA_ARRIVA_A, ULTIMO_CAPITOLO, chiaveCapitolo } from '../config/capitoli';
import { elementiSbloccati } from '../config/storia';
import {
  REGALI_A_CAPITOLO,
  chiaveEco,
  codaCapitoli,
  ecoDaMostrare,
  giardinoDelCapitolo,
  giardinoVisibile,
  maxVisto,
  normalizzaPrefisso,
  regaliNuovi,
  seminaSbloccata,
  segnaVisto,
  unisciVisti,
  vistiDi,
  type CapitoliVisti,
} from './capitoli';

/** capitolo-0..n-1 */
const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));
const vuoti = (): CapitoliVisti => ({ a: [], b: [] });
const prefisso = (l: readonly string[]) => expect(l).toEqual(fino(l.length));

describe('codaCapitoli', () => {
  it('a 0 fiori c\'è solo il capitolo 0', () => {
    expect(codaCapitoli(0, []).map((c) => c.fiore)).toEqual([0]);
  });

  it('ordinata, solo fiore <= fiori, senza i visti', () => {
    expect(codaCapitoli(4, fino(2)).map((c) => c.fiore)).toEqual([2, 3, 4]);
    expect(codaCapitoli(3, fino(4))).toEqual([]);
    expect(codaCapitoli(ULTIMO_CAPITOLO + 50, []).length).toBe(CAPITOLI.length);
  });

  it('leggere la coda uno alla volta la svuota, in ordine, senza perdere niente', () => {
    let v = vuoti();
    const letti: number[] = [];
    for (let giri = 0; giri < 20; giri++) {
      const coda = codaCapitoli(7, vistiDi(v, 'b'));
      if (!coda.length) break;
      letti.push(coda[0].fiore);
      v = segnaVisto(v, 'b', coda[0].fiore);
    }
    expect(letti).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(v.a).toEqual([]);
    prefisso(v.b);
  });
});

describe('segnaVisto e prefisso', () => {
  it('aggiunge il capitolo successivo al prefisso, solo per quel ruolo', () => {
    const v = segnaVisto(segnaVisto(vuoti(), 'a', 0), 'a', 1);
    expect(v).toEqual({ a: fino(2), b: [] });
  });

  it('già visto o oltre un buco: stesso oggetto, niente scritture', () => {
    const v: CapitoliVisti = { a: fino(3), b: [] };
    expect(segnaVisto(v, 'a', 1)).toBe(v);
    expect(segnaVisto(v, 'a', 7)).toBe(v); // il 3 non è ancora visto: il 7 non entra
  });

  it('normalizzaPrefisso tiene il prefisso contiguo più lungo da 0', () => {
    expect(normalizzaPrefisso(['capitolo-2', 'capitolo-0', 'capitolo-1', 'capitolo-4', 'x', 3])).toEqual(fino(3));
    expect(normalizzaPrefisso(['capitolo-1'])).toEqual([]);
    expect(normalizzaPrefisso('no')).toEqual([]);
    expect(normalizzaPrefisso(fino(ULTIMO_CAPITOLO + 5))).toEqual(fino(ULTIMO_CAPITOLO + 1));
  });

  it('unisciVisti: per ruolo (a con a, b con b), resta un prefisso', () => {
    const x: CapitoliVisti = { a: fino(3), b: fino(1) };
    const y: CapitoliVisti = { a: fino(5), b: ['capitolo-3'] };
    const u = unisciVisti(x, y);
    expect(u).toEqual({ a: fino(5), b: fino(1) });
    expect(unisciVisti(y, x)).toEqual({ a: fino(5), b: fino(1) });
    expect(unisciVisti(u, x)).toBe(u);
  });

  it('maxVisto', () => {
    expect(maxVisto([])).toBe(-1);
    expect(maxVisto(fino(6))).toBe(5);
  });
});

describe('seminaSbloccata', () => {
  it('solo dopo aver letto il capitolo 5, con almeno 5 fiori', () => {
    expect(seminaSbloccata(9, fino(5))).toBe(false); // dispositivo nuovo: 0..4 letti, il 5 no
    expect(seminaSbloccata(9, fino(6))).toBe(true);
    expect(seminaSbloccata(4, fino(6))).toBe(false);
    expect(seminaSbloccata(5, [])).toBe(false);
  });
});

describe('ecoDaMostrare', () => {
  it('l\'eco dell\'ultimo capitolo visto, una volta', () => {
    expect(ecoDaMostrare([], [])).toBeNull();
    const e = ecoDaMostrare(fino(3), []);
    expect(e).toEqual({ fiore: 2, chiave: 'eco-2', chi: CAPITOLI[2].eco.chi, testo: CAPITOLI[2].eco.testo });
    expect(ecoDaMostrare(fino(3), [chiaveEco(2)])).toBeNull();
    // un capitolo nuovo letto: torna l'eco, del nuovo
    expect(ecoDaMostrare(fino(4), [chiaveEco(2)])?.fiore).toBe(3);
  });
});

describe('regali', () => {
  it('lista invariata', () => {
    expect(REGALI_A_CAPITOLO).toEqual([1, 5, 10, 18, 25, 35, 60]);
  });

  it('un regalo quando si segna un capitolo-regalo, una volta sola', () => {
    let v = { a: fino(1), b: [] } as CapitoliVisti;
    const prima = v.a;
    v = segnaVisto(v, 'a', 1);
    expect(regaliNuovi(prima, v.a)).toBe(1);
    expect(regaliNuovi(v.a, segnaVisto(v, 'a', 1).a)).toBe(0);
    expect(regaliNuovi(fino(2), fino(3))).toBe(0); // il 2 non è un regalo
  });

  it('se l\'altro dispositivo dello stesso ruolo l\'ha già letto (unione col remoto prima), niente regalo', () => {
    const locale: CapitoliVisti = { a: fino(1), b: [] };
    const remoto: CapitoliVisti = { a: fino(2), b: [] };
    const unito = unisciVisti(locale, remoto);
    expect(regaliNuovi(unito.a, segnaVisto(unito, 'a', 1).a)).toBe(0);
  });

  it('più capitoli-regalo in un colpo (arretrati uniti) contano tutti', () => {
    expect(regaliNuovi([], fino(11))).toBe(3);
  });
});

describe('giardinoVisibile (niente tracce di Semina prima del capitolo 5)', () => {
  it('telefono nuovo con 6 fiori e nessun capitolo visto: niente tulipano, niente blu', () => {
    const g = giardinoVisibile(6, []);
    expect(g.elementi).not.toContain('semina');
    expect(g.elementi).toContain('sentiero');
    expect(g.bluPresenza).toBe(0);
  });

  it('il blu segue i capitoli letti fino al 4, mai di più senza il 5', () => {
    expect(giardinoVisibile(6, fino(3)).bluPresenza).toBeCloseTo(2 / SEMINA_ARRIVA_A);
    expect(giardinoVisibile(6, fino(5)).bluPresenza).toBeCloseTo(4 / SEMINA_ARRIVA_A);
    expect(giardinoVisibile(6, fino(5)).elementi).not.toContain('semina');
  });

  it('a fiori < 5 come prima: blu dei fiori (letti tutti), nessun tulipano', () => {
    expect(giardinoVisibile(3, fino(4))).toEqual({ elementi: elementiSbloccati(3), bluPresenza: 3 / SEMINA_ARRIVA_A });
    expect(giardinoVisibile(0, []).bluPresenza).toBe(0);
  });

  it('col capitolo 5 visto: tulipano e blu pieno', () => {
    const g = giardinoVisibile(6, fino(6));
    expect(g.elementi).toEqual(elementiSbloccati(6));
    expect(g.elementi).toContain('semina');
    expect(g.bluPresenza).toBe(1);
  });
});

describe('giardinoDelCapitolo (fondale del lettore)', () => {
  it('com\'era a quel capitolo, senza Semina fino al 5 compreso', () => {
    expect(giardinoDelCapitolo(2, 40)).toEqual({ elementi: elementiSbloccati(2), bluPresenza: 2 / SEMINA_ARRIVA_A });
    const c5 = giardinoDelCapitolo(5, 40);
    expect(c5.elementi).not.toContain('semina');
    expect(c5.bluPresenza).toBeCloseTo(4 / SEMINA_ARRIVA_A);
    expect(giardinoDelCapitolo(7, 40)).toEqual({ elementi: elementiSbloccati(7), bluPresenza: 1 });
  });

  it('mai oltre i fiori di adesso', () => {
    expect(giardinoDelCapitolo(12, 9).elementi).toEqual(elementiSbloccati(9));
  });
});
