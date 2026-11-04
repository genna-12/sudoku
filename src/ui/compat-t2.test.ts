// Compatibilità con l'archivio di chi ha giocato la versione online T2 (03/11 sera): versione 1 senza
// sbloccatiVisti/regaliBonus/quotaBlu, tappe viste con le chiavi della storia di T2, partita in corso.
import { describe, expect, it } from 'vitest';
import { SEMINA_SBLOCCATA_A } from '../config/frasi';
import { generaPuzzle } from '../engine';
import { applica, nuovaPartita, voceStorico } from '../stato';
import type { VoceStorico } from '../stato';
import { CHIAVE_ARCHIVIO, carica, salva } from '../stato/archivio';
import { importa, ricomincia } from './memoria';
import {
  CHIAVE_SBLOCCO,
  fioriDi,
  regaliBonusDi,
  sblocchiNuovi,
  scenaDaMostrare,
  seminaSbloccata,
  sorpresaDaMostrare,
  tappaDaMostrare,
} from './regole';

/** chiavi delle tappe di T2 (STORIA_SEMINO + STORIA_EXTRA di frasi.ts a 4209f09) */
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
    if (k === SEMINA_SBLOCCATA_A && !scenaVista) continue;
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
    it(`${fiori} fiori: carica, storia senza ripetizioni, un solo annuncio, niente sorprese retroattive`, () => {
      const a = caricaDa(archivioT2(fiori));
      expect(a.partita?.puzzle.modalita).toBe('killer');
      expect(a.impostazioni.vibrazione).toBe(false);
      expect(fioriDi(a.storico)).toBe(fiori);
      // la tappa corrente era già stata vista in T2 (anche se ora ha un altro `chi`)
      expect(tappaDaMostrare(fiori, a.tappeViste)).toBeNull();
      expect(scenaDaMostrare(fiori, a.tappeViste)).toBe(false);
      const sbloccata = seminaSbloccata(fiori) && a.tappeViste.includes(CHIAVE_SBLOCCO);
      expect(sbloccata).toBe(fiori >= SEMINA_SBLOCCATA_A);
      // annuncio: solo gli sblocchi della soglia più alta, al massimo un regalo
      const n = sblocchiNuovi(fiori, a.sbloccatiVisti);
      const soglie = new Set(n.annuncio.map((s) => s.id));
      expect(n.regali).toBeLessThanOrEqual(1);
      if (fiori === 0) expect(n.annuncio).toEqual([]);
      else expect(soglie.size).toBeGreaterThan(0);
      // una seconda apertura della Home non annuncia più nulla
      expect(sblocchiNuovi(fiori, n.visti).annuncio).toEqual([]);
      // sorprese: solo per il numero esatto raggiunto con la vittoria (le soglie passate non tornano)
      for (let k = 0; k < fiori; k++) expect(sorpresaDaMostrare(k, a.tappeViste, sbloccata)?.partite ?? k).toBe(k);
      expect(regaliBonusDi(a.regaliBonus)).toBe(0);
    });
  }

  it('5 fiori con la scena NON ancora vista in T2: parte la scena, Semina non è sbloccata finché non la si vede', () => {
    const a = caricaDa(archivioT2(5, { scenaVista: false }));
    expect(scenaDaMostrare(5, a.tappeViste)).toBe(true);
    expect(tappaDaMostrare(5, a.tappeViste)).toBeNull();
    expect(sorpresaDaMostrare(5, a.tappeViste, false)).toBeNull();
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
    expect(regaliBonusDi(z.regaliBonus)).toBe(0);
    expect(sblocchiNuovi(0, z.sbloccatiVisti).annuncio).toEqual([]);
  });
});
