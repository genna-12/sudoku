import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../engine/types';
import {
  ARCHIVIO_VUOTO,
  CHIAVE_ARCHIVIO,
  CHIAVI_V0,
  VERSIONE_ARCHIVIO,
  aggiornaStorico,
  applicaAzzeramento,
  carica,
  chiaveTappa,
  migra,
  salva,
  unisciStoricoRemoto,
  type Archivio,
} from './archivio';
import { applica, nuovaPartita, voceStorico } from './index';
import type { StatoPartita, VoceStorico } from './types';

class FintoStorage implements Storage {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
}

class StorageRotto extends FintoStorage {
  setItem(): void {
    throw new DOMException('pieno', 'QuotaExceededError');
  }
}

function puzzle(seed: number): Puzzle {
  const soluzione = Array.from({ length: 81 }, (_, i) => ((i % 9) + Math.floor(i / 9) * 3 + Math.floor(i / 27)) % 9 + 1);
  const dati = soluzione.map((v, i) => (i % 2 === 0 ? v : 0));
  return { modalita: 'sudoku', livello: 'medio', seed, soluzione, dati };
}

function partita(seed: number, iniziata: number, mosse = 1): StatoPartita {
  let s = nuovaPartita(puzzle(seed), iniziata);
  for (let k = 0; k < mosse; k++) s = applica(s, { tipo: 'cella', idx: 1 + 2 * k, v: 0, note: [1], da: 'a', ts: iniziata + 1 + k });
  return s;
}

function voce(seed: number, iniziata: number, aggiornata = iniziata): VoceStorico {
  return { id: `sudoku-${seed}`, modalita: 'sudoku', livello: 'medio', iniziata, secondi: 0, progresso: 0, punti: 0, errori: 0, aggiornata };
}

function archivio(parziale: Partial<Archivio> = {}): Archivio {
  return { ...migra(undefined), ...parziale };
}

describe('migra', () => {
  it('da vuoto/null/non oggetto → archivio vuoto alla versione corrente', () => {
    for (const x of [undefined, null, 42, 'ciao', []]) {
      expect(migra(x)).toEqual({ ...ARCHIVIO_VUOTO });
    }
    expect(migra(undefined).versione).toBe(VERSIONE_ARCHIVIO);
  });

  it('da versione 0: importa io, partner, partita, errori, storico; la partita toccata entra nello storico', () => {
    const p = partita(7, 1000);
    const a = migra({ io: { nome: 'Genna', frase: 'sei mini' }, partner: 'Lei', partita: p, errori: false, storico: [voce(3, 500)] });
    expect(a.versione).toBe(1);
    expect(a.io).toEqual({ nome: 'Genna', frase: 'sei mini' });
    expect(a.partner).toBe('Lei');
    expect(a.partita).toEqual(p);
    expect(a.impostazioni).toEqual({ mostraErrori: false, vibrazione: true });
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-7', 'sudoku-3']);
    expect(a.azzerato).toBe(0);
    expect(a.tappeViste).toEqual([]);
  });

  it('versione 0: partita mai toccata non entra nello storico', () => {
    const a = migra({ versione: 0, partita: nuovaPartita(puzzle(1), 10) });
    expect(a.partita).not.toBeNull();
    expect(a.storico).toEqual([]);
  });

  it('versione 1 con campi mancanti o sbagliati → default, voci e partita invalide scartate', () => {
    const a = migra({ versione: 1, partner: 5, storico: [voce(1, 10), { id: 3 }, null], tappeViste: ['semino-1', 2], impostazioni: { vibrazione: false }, partita: { puzzle: {} } });
    expect(a.io).toBeNull();
    expect(a.partner).toBe('');
    expect(a.partita).toBeNull();
    expect(a.storico).toEqual([voce(1, 10)]);
    expect(a.tappeViste).toEqual(['semino-1']);
    expect(a.impostazioni).toEqual({ mostraErrori: true, vibrazione: false });
    expect(a.azzerato).toBe(0);
  });

  it('versione 1 completa resta uguale', () => {
    const x: Archivio = archivio({ io: { nome: 'a', frase: 'b' }, partner: 'c', storico: [voce(1, 10)], tappeViste: ['entrambi-5'], azzerato: 5 });
    expect(migra(JSON.parse(JSON.stringify(x)))).toEqual(x);
  });

  it('applica il filtro azzeramento già in lettura', () => {
    const a = migra({ versione: 1, azzerato: 100, storico: [voce(1, 50), voce(2, 150)], partita: partita(1, 50) });
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-2']);
    expect(a.partita).toBeNull();
  });
});

describe('carica / salva', () => {
  it('storage vuoto → archivio vuoto, niente scritto', () => {
    const s = new FintoStorage();
    expect(carica(s)).toEqual({ ...ARCHIVIO_VUOTO });
    expect(s.length).toBe(0);
  });

  it('JSON corrotto → archivio vuoto, non lancia', () => {
    const s = new FintoStorage();
    s.setItem(CHIAVE_ARCHIVIO, '{non json');
    expect(carica(s)).toEqual({ ...ARCHIVIO_VUOTO });
  });

  it('importa le chiavi sparse della versione 0, scrive l\'archivio e rimuove le vecchie (non la scelta)', () => {
    const s = new FintoStorage();
    const p = partita(9, 2000);
    s.setItem(CHIAVI_V0.io, JSON.stringify({ nome: 'Genna', frase: 'sei mini' }));
    s.setItem(CHIAVI_V0.partner, JSON.stringify('Lei'));
    s.setItem(CHIAVI_V0.partita, JSON.stringify(p));
    s.setItem(CHIAVI_V0.errori, JSON.stringify(false));
    s.setItem('sudoku-coppia-scelta', JSON.stringify({ modalita: 'killer', livello: 'facile' }));
    const a = carica(s);
    expect(a.io?.nome).toBe('Genna');
    expect(a.partner).toBe('Lei');
    expect(a.partita).toEqual(p);
    expect(a.impostazioni.mostraErrori).toBe(false);
    expect(a.storico[0].id).toBe('sudoku-9');
    for (const k of Object.values(CHIAVI_V0)) expect(s.getItem(k)).toBeNull();
    expect(s.getItem('sudoku-coppia-scelta')).not.toBeNull();
    expect(JSON.parse(s.getItem(CHIAVE_ARCHIVIO)!)).toEqual(a);
    expect(carica(s)).toEqual(a);
  });

  it('versione 0 con storage che non scrive: importa ma non cancella le vecchie chiavi', () => {
    const s = new StorageRotto();
    s.m.set(CHIAVI_V0.partner, JSON.stringify('Lei'));
    expect(carica(s).partner).toBe('Lei');
    expect(s.getItem(CHIAVI_V0.partner)).not.toBeNull();
  });

  it('salva con storage che lancia non propaga', () => {
    expect(() => salva(archivio(), new StorageRotto())).not.toThrow();
    expect(salva(archivio(), new StorageRotto())).toBe(false);
  });

  it('salva e ricarica', () => {
    const s = new FintoStorage();
    const a = archivio({ partner: 'Lei', tappeViste: [chiaveTappa('semino', 3)] });
    expect(salva(a, s)).toBe(true);
    expect(carica(s)).toEqual(a);
  });

  it('getItem che lancia → archivio vuoto', () => {
    const s = new FintoStorage();
    s.getItem = () => {
      throw new Error('bloccato');
    };
    expect(carica(s)).toEqual({ ...ARCHIVIO_VUOTO });
  });
});

describe('chiaveTappa', () => {
  it('formato stabile', () => {
    expect(chiaveTappa('semina', 5)).toBe('semina-5');
  });
});

describe('applicaAzzeramento', () => {
  const base = archivio({ storico: [voce(1, 50), voce(2, 150)], tappeViste: ['semino-0'], partita: partita(1, 50), azzerato: 10 });

  it('scarta le voci vecchie, tiene le nuove, chiude la partita vecchia, svuota le tappe', () => {
    const a = applicaAzzeramento(base, 100);
    expect(a.azzerato).toBe(100);
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-2']);
    expect(a.partita).toBeNull();
    expect(a.tappeViste).toEqual([]);
    expect(base.storico).toHaveLength(2); // non muta
  });

  it('azzerato non maggiore: tappe intatte e azzerato invariato', () => {
    const a = applicaAzzeramento(base, 5);
    expect(a.azzerato).toBe(10);
    expect(a.tappeViste).toEqual(['semino-0']);
    expect(a.storico).toHaveLength(2);
    expect(applicaAzzeramento(base, 10)).toBe(base);
  });

  it('tiene la partita iniziata dopo l\'azzeramento', () => {
    const p = partita(3, 200);
    expect(applicaAzzeramento(archivio({ partita: p }), 100).partita).toBe(p);
  });
});

describe('unisciStoricoRemoto', () => {
  it('unisce per id e ordina', () => {
    const a = unisciStoricoRemoto(archivio({ storico: [voce(1, 10, 20)] }), [voce(1, 10, 30), voce(2, 40)]);
    expect(a.storico.map((v) => [v.id, v.aggiornata])).toEqual([
      ['sudoku-2', 40],
      ['sudoku-1', 30],
    ]);
  });

  it('azzeramento remoto maggiore: applicato prima del merge, tappe svuotate', () => {
    const loc = archivio({ storico: [voce(1, 50), voce(2, 150)], tappeViste: ['semino-0'] });
    const a = unisciStoricoRemoto(loc, [voce(3, 60), voce(4, 160)], 100);
    expect(a.azzerato).toBe(100);
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-4', 'sudoku-2']);
    expect(a.tappeViste).toEqual([]);
  });

  it('azzeramento remoto minore: vale il locale, voci remote vecchie scartate, tappe intatte', () => {
    const loc = archivio({ azzerato: 100, storico: [voce(2, 150)], tappeViste: ['semino-0'] });
    const a = unisciStoricoRemoto(loc, [voce(3, 60), voce(4, 160)], 0);
    expect(a.azzerato).toBe(100);
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-4', 'sudoku-2']);
    expect(a.tappeViste).toEqual(['semino-0']);
  });

  it('senza azzerato remoto filtra comunque col locale', () => {
    const a = unisciStoricoRemoto(archivio({ azzerato: 100 }), [voce(3, 60)]);
    expect(a.storico).toEqual([]);
  });
});

describe('aggiornaStorico', () => {
  it('inserisce la voce della partita', () => {
    const p = partita(5, 100);
    const a = aggiornaStorico(archivio(), p);
    expect(a.storico).toEqual([voceStorico(p)]);
  });

  it('aggiorna la voce esistente della stessa partita', () => {
    const p1 = partita(5, 100, 1);
    const p2 = partita(5, 100, 3);
    const a = aggiornaStorico(aggiornaStorico(archivio(), p1), p2);
    expect(a.storico).toHaveLength(1);
    expect(a.storico[0]).toEqual(voceStorico(p2));
  });

  it('non riaggiunge una partita precedente all\'azzeramento', () => {
    const base = archivio({ azzerato: 1000 });
    expect(aggiornaStorico(base, partita(5, 100))).toBe(base);
  });
});
