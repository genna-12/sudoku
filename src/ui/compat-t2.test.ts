// Compatibilità con l'archivio di chi ha giocato la versione online T2 (03/11 sera): versione 1 senza
// sbloccatiVisti/regaliBonus/quotaBlu, tappe viste con le chiavi della storia di T2, partita in corso.
// Da T5 la storia sono i capitoli: chi aveva visto l'arrivo di Semina ha letto 0..5 (solo il suo ruolo).
import { describe, expect, it } from 'vitest';
import { SEMINA_ARRIVA_A, chiaveCapitolo } from '../config/capitoli';
import { generaPuzzle } from '../engine';
import { applica, nuovaPartita, voceStorico } from '../stato';
import type { VoceStorico } from '../stato';
import { CHIAVE_ARCHIVIO, carica, salva } from '../stato/archivio';
import { importa, ricomincia } from './memoria';
import { codaCapitoli, seminaSbloccata, vistiDi } from './capitoli';
import { fioriDi, frasiNuove, regaliBonusDi } from './regole';

/** chiavi delle tappe di T2 (storia di frasi.ts a 4209f09, ritirata in T5) */
const TAPPE_T2: Record<number, string> = {
  0: 'semino', 1: 'semino', 2: 'semino', 3: 'semino', 4: 'semino', 5: 'semina', 6: 'semino', 7: 'semino',
  8: 'semina', 9: 'semina', 10: 'entrambi', 11: 'entrambi', 12: 'semina', 13: 'semino', 14: 'semina',
};

class Memoria implements Storage {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

function fiore(n: number): VoceStorico {
  const s = nuovaPartita(generaPuzzle('sudoku', 'semini', 1000 + n), 1_700_000_000_000 + n * 1000);
  const fin = applica(s, { tipo: 'finita', ts: s.iniziata + 500 });
  return voceStorico(fin);
}

/** archivio T2 di chi ha visto ogni tappa man mano (una per vittoria) fino a `fiori` */
function archivioT2(fiori: number, { scenaVista = true } = {}) {
  const partita = applica(nuovaPartita(generaPuzzle('killer', 'facile', 77), 1_700_100_000_000), {
    tipo: 'cella', idx: generaPuzzle('killer', 'facile', 77).dati.indexOf(0), v: 3, note: [], da: 'a', ts: 1_700_100_000_500,
  });
  const viste: string[] = [];
  for (let k = 0; k <= Math.min(fiori, 14); k++) {
    if (k === SEMINA_ARRIVA_A && !scenaVista) continue;
    viste.push(`${TAPPE_T2[k]}-${k}`);
  }
  return {
    versione: 1,
    io: { nome: 'Semino', frase: 'frase segreta' },
    partner: 'Semina',
    partita,
    storico: Array.from({ length: fiori }, (_, i) => fiore(i + 1)),
    azzerato: 0,
    tappeViste: viste,
    impostazioni: { mostraErrori: true, vibrazione: false },
  };
}

function caricaDa(dati: unknown) {
  const s = new Memoria();
  s.setItem(CHIAVE_ARCHIVIO, JSON.stringify(dati));
  return carica(s);
}

describe('archivio della versione online T2', () => {
  for (const fiori of [0, 1, 3, 4, 5, 6, 7, 8, 11, 14]) {
    it(`${fiori} fiori: carica, capitoli dal prefisso giusto, Semina come prima, pacchetti senza ripetizioni`, () => {
      const a = caricaDa(archivioT2(fiori));
      expect(a.partita?.puzzle.modalita).toBe('killer');
      expect(a.impostazioni.vibrazione).toBe(false);
      expect(fioriDi(a.storico)).toBe(fiori);
      // chi aveva visto la scena di Semina (dal 5) ha letto 0..5; l'altro ruolo niente
      const visti = vistiDi(a.capitoliVisti, 'a');
      expect(visti).toEqual(fiori >= SEMINA_ARRIVA_A ? Array.from({ length: 6 }, (_, k) => chiaveCapitolo(k)) : []);
      expect(vistiDi(a.capitoliVisti, 'b')).toEqual([]);
      // Semina resta com'era: sbloccata da 5 fiori in su (la UI prima dello sblocco non cambia)
      expect(seminaSbloccata(fiori, visti)).toBe(fiori >= SEMINA_ARRIVA_A);
      // la coda: gli arretrati in ordine, dal primo non letto fino ai fiori di adesso
      const coda = codaCapitoli(fiori, visti).map((c) => c.fiore);
      const da = fiori >= SEMINA_ARRIVA_A ? SEMINA_ARRIVA_A + 1 : 0;
      expect(coda).toEqual(Array.from({ length: Math.max(0, fiori + 1 - da) }, (_, k) => da + k));
      // pacchetti di frasi: una volta sola, poi più niente
      const n = frasiNuove(fiori, a.sbloccatiVisti, seminaSbloccata(fiori, visti));
      expect(frasiNuove(fiori, n.visti, seminaSbloccata(fiori, visti)).nuove).toEqual([]);
      expect(regaliBonusDi(a.regaliBonus)).toBe(0);
    });
  }

  it('5 fiori con la scena NON ancora vista in T2: Semina non è sbloccata, la coda parte da 0 e arriva al 5', () => {
    const a = caricaDa(archivioT2(5, { scenaVista: false }));
    const visti = vistiDi(a.capitoliVisti, 'a');
    expect(visti).toEqual([]);
    expect(seminaSbloccata(5, visti)).toBe(false);
    expect(codaCapitoli(5, visti).map((c) => c.fiore)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('salva e ricarica: campi nuovi conservati, quotaBlu delle voci conservata', () => {
    const s = new Memoria();
    s.setItem(CHIAVE_ARCHIVIO, JSON.stringify(archivioT2(6)));
    const a = carica(s);
    const voce = { ...a.storico[0], quotaBlu: 0.3 };
    salva({ ...a, storico: [voce, ...a.storico.slice(1)], sbloccatiVisti: ['elemento:fiore'], regaliBonus: 2 }, s);
    const b = carica(s);
    expect(b.sbloccatiVisti).toEqual(['elemento:fiore']);
    expect(b.regaliBonus).toBe(2);
    expect((b.storico[0] as VoceStorico & { quotaBlu?: number }).quotaBlu).toBe(0.3);
  });

  it('archivio corrotto o parziale: mai lancia', () => {
    for (const x of [null, 42, 'x', [], { versione: 1 }, { versione: 1, storico: 'no', tappeViste: [1, 'semino-0'], partita: { puzzle: 1 } }]) {
      expect(() => caricaDa(x)).not.toThrow();
    }
  });

  it('importa memoria con i campi nuovi: unisce lo storico (le tappe non più, da T5), non tocca i miei regali', () => {
    const mio = { ...caricaDa(archivioT2(3)), regaliBonus: 1, sbloccatiVisti: ['elemento:fiore'] };
    const suo = { ...archivioT2(7), sbloccatiVisti: ['x'], regaliBonus: 9, io: { nome: 'Semina', frase: '' } };
    const r = importa(mio, JSON.stringify(suo));
    expect(r).not.toBeNull();
    expect(fioriDi(r!.archivio.storico)).toBe(7);
    expect(r!.archivio.regaliBonus).toBe(1);
    expect(r!.archivio.io?.frase).toBe('frase segreta');
    expect(r!.archivio.tappeViste).not.toContain('semino-7'); // T5: tappeViste esce da importa
  });

  it('ricomincia da zero azzera anche i regali del giardino in attesa', () => {
    const a = { ...caricaDa(archivioT2(6)), regaliBonus: 2, sbloccatiVisti: ['elemento:fiore'] };
    const z = ricomincia(a, Date.now());
    expect(z.storico).toEqual([]);
    expect(z.tappeViste).toEqual([]);
    expect(z.capitoliVisti).toEqual({ a: [], b: [] });
    expect(regaliBonusDi(z.regaliBonus)).toBe(0);
    expect(frasiNuove(0, z.sbloccatiVisti, false)).toEqual({ nuove: [], visti: [] });
  });
});
