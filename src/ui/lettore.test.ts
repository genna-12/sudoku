import { describe, expect, it } from 'vitest';
import { CAPITOLI, SEMINA_ARRIVA_A, chiaveCapitolo } from '../config/capitoli';
import { migra } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { ATTI, diario, ecoDi, vistiDi } from './capitoli';
import { ARRETRATI_DA_CHIEDERE, apriLettore, avanza, capitoloDelLettore, conCapitoloVisto, leggiAdesso } from './lettore';
import type { Lettore } from './lettore';

/** capitolo-0..n-1 */
const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));
const archivio = (x: Partial<Archivio> = {}): Archivio => ({ ...migra(undefined), ...x });
const riassunto = { iniziata: 7, secondi: 60, puntiMiei: 10, puntiSuoi: 5, bonus: 3 };

/** legge tutta la coda come farebbe App: "Continua" su ogni capitolo, segnando visto */
function leggiTutto(a: Archivio, l: Lettore | null, ruolo: 'a' | 'b'): { a: Archivio; letti: number[] } {
  const letti: number[] = [];
  let x = l && leggiAdesso(l);
  while (x) {
    const c = capitoloDelLettore(x)!;
    letti.push(c.fiore);
    a = conCapitoloVisto(a, ruolo, c.fiore);
    x = avanza(x);
  }
  return { a, letti };
}

describe('lettore: coda congelata', () => {
  it('niente da leggere: nessun lettore', () => {
    expect(apriLettore(3, fino(4), 'vittoria', 0)).toBeNull();
  });

  it('dopo una vittoria: il capitolo del fiore nuovo; dalla Home tutti gli arretrati in ordine', () => {
    const l = apriLettore(7, fino(7), 'vittoria', 0, riassunto)!;
    expect(l).toMatchObject({ coda: [7], pos: 0, chiedi: false, riassunto });
    expect(capitoloDelLettore(l)?.fiore).toBe(7);
    expect(avanza(l)).toBeNull();
    expect(apriLettore(0, [], 'home', 0)?.coda).toEqual([0]); // capitolo 0 a fiori 0, dalla Home
  });

  it('la coda non cresce mentre si legge: è quella dell\'apertura', () => {
    let a = archivio({ capitoliVisti: { a: fino(3), b: [] } });
    const l = apriLettore(4, vistiDi(a.capitoliVisti, 'a'), 'vittoria', 0)!;
    expect(l.coda).toEqual([3, 4]);
    a = conCapitoloVisto(a, 'a', 3);
    // intanto il partner ha finito un'altra partita (fiori 5): il lettore aperto non lo vede
    const dopo = avanza(l)!;
    expect(dopo.coda).toEqual([3, 4]);
    expect(capitoloDelLettore(dopo)?.fiore).toBe(4);
    a = conCapitoloVisto(a, 'a', 4);
    expect(avanza(dopo)).toBeNull();
    // il 5 resta per la Home
    expect(apriLettore(5, vistiDi(a.capitoliVisti, 'a'), 'home', 0)?.coda).toEqual([5]);
  });

  it(`con ${ARRETRATI_DA_CHIEDERE}+ arretrati dopo la vittoria si chiede prima; dalla Home no`, () => {
    const l = apriLettore(5, [], 'vittoria', 0)!;
    expect(l.chiedi).toBe(true);
    expect(capitoloDelLettore(l)).toBeNull(); // c'è il foglio "Adesso/Dopo"
    expect(capitoloDelLettore(leggiAdesso(l))?.fiore).toBe(0);
    expect(apriLettore(2, [], 'vittoria', 0)!.chiedi).toBe(false); // 3 in coda
    expect(apriLettore(5, [], 'home', 0)!.chiedi).toBe(false);
  });

  it('"Dopo" non segna niente: la coda resta intera e torna, in ordine, dalla Home', () => {
    const a = archivio();
    const l = apriLettore(6, vistiDi(a.capitoliVisti, 'b'), 'vittoria', 0)!;
    expect(l.chiedi).toBe(true);
    // "Dopo" = si chiude il lettore senza toccare l'archivio
    expect(apriLettore(6, vistiDi(a.capitoliVisti, 'b'), 'home', 0)?.coda).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('chiudere a metà: il capitolo non finito resta in coda', () => {
    let a = archivio();
    a = conCapitoloVisto(a, 'a', 0); // letto fino in fondo
    // il capitolo 1 era aperto, l'app si chiude prima di "Continua"
    expect(apriLettore(1, vistiDi(a.capitoliVisti, 'a'), 'home', 0)?.coda).toEqual([1]);
  });

  it('coda 0..5 letta per intero: Semina arriva, visti solo per il ruolo di chi legge', () => {
    const { a, letti } = leggiTutto(archivio(), apriLettore(5, [], 'vittoria', 0), 'b');
    expect(letti).toEqual([0, 1, 2, 3, 4, 5]);
    expect(a.capitoliVisti).toEqual({ a: [], b: fino(6) });
  });
});

describe('lettore: visto e regali', () => {
  it('segnare visto un capitolo-regalo mette da parte un suggerimento, una volta', () => {
    const a = archivio({ capitoliVisti: { a: fino(1), b: [] } });
    const b = conCapitoloVisto(a, 'a', 1);
    expect(b.regaliBonus).toBe(1);
    expect(conCapitoloVisto(b, 'a', 1)).toBe(b); // già visto: niente
    expect(conCapitoloVisto(archivio(), 'a', 2)).toEqual(archivio()); // fuori ordine: si scarta
  });

  it('capitolo già letto su un altro dispositivo dello stesso ruolo (unito col remoto): niente regalo', () => {
    const unito = archivio({ capitoliVisti: { a: fino(2), b: [] }, regaliBonus: 0 });
    expect(conCapitoloVisto(unito, 'a', 1)).toBe(unito);
  });

  it('un regalo per ogni capitolo-regalo letto; si sommano a quelli già in attesa', () => {
    const r = leggiTutto(archivio({ regaliBonus: 2 }), apriLettore(SEMINA_ARRIVA_A, [], 'home', 0), 'a');
    expect(r.a.regaliBonus).toBe(4); // capitoli 1 e 5
  });
});

describe('eco e diario', () => {
  it('le eco nel pool: solo dei capitoli letti e di chi le dice', () => {
    expect(ecoDi([], 'semino')).toEqual([]);
    const lui = ecoDi(fino(3), 'semino');
    expect(lui).toEqual(CAPITOLI.slice(0, 3).filter((c) => c.eco.chi === 'semino').map((c) => c.eco.testo));
    // prima del 5 nessuna eco è di Semina
    expect(ecoDi(fino(5), 'semina')).toEqual([]);
  });

  it('diario: capitoli letti per atto, in ordine; vuoto senza letture', () => {
    expect(diario([])).toEqual([]);
    const d = diario(fino(8));
    expect(d.map((x) => x.nome)).toEqual([ATTI[0].nome, ATTI[1].nome]);
    expect(d[0].capitoli.map((c) => c.fiore)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(d[1].capitoli.map((c) => c.fiore)).toEqual([6, 7]);
    expect(d[1].capitoli[0].titolo).toBe(CAPITOLI[6].titolo);
  });

  it('gli atti coprono tutti i capitoli, in ordine', () => {
    expect(ATTI[0].da).toBe(0);
    for (let i = 1; i < ATTI.length; i++) expect(ATTI[i].da).toBeGreaterThan(ATTI[i - 1].da);
    expect(diario(fino(CAPITOLI.length)).flatMap((x) => x.capitoli).length).toBe(CAPITOLI.length);
  });
});
