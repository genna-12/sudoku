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
import { applica, nuovaPartita, unisci, unisciStorico, voceStorico } from './index';
import type { Giocatore, StatoPartita, VoceStorico } from './types';

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
    expect(a.versione).toBe(VERSIONE_ARCHIVIO);
    expect(a.io).toEqual({ nome: 'Genna', frase: 'sei mini' });
    expect(a.partner).toBe('Lei');
    expect(a.partita).toEqual(p);
    expect(a.impostazioni).toEqual({ mostraErrori: false, vibrazione: true });
    expect(a.storico.map((v) => v.id)).toEqual(['sudoku-7', 'sudoku-3']);
    expect(a.azzerato).toBe(0);
    expect(a.tappeViste).toEqual([]);
    expect(a.capitoliVisti).toEqual({ a: [], b: [] });
    expect(a.ecoViste).toEqual([]);
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

/** capitolo-0..n-1 */
const fino = (n: number) => Array.from({ length: n }, (_, k) => `capitolo-${k}`);
const v1 = (x: Record<string, unknown>) => ({
  versione: 1,
  io: { nome: 'Semino', frase: 'sei mini' },
  partner: 'Semina',
  partita: null,
  storico: [voce(1, 10)],
  azzerato: 0,
  tappeViste: ['semino-0', 'semino-4', 'semina-5', 'semino-6'],
  impostazioni: { mostraErrori: true, vibrazione: true },
  ...x,
});

describe('migrazione 1 → 2 (capitoli)', () => {
  it('chi ha visto semina-5 ha visto i capitoli 0..5, solo per il proprio ruolo', () => {
    expect(VERSIONE_ARCHIVIO).toBe(2);
    const a = migra(v1({}));
    expect(a.versione).toBe(2);
    expect(a.capitoliVisti).toEqual({ a: fino(6), b: [] });
    expect(a.ecoViste).toEqual([]);
    expect(a.tappeViste).toEqual(['semino-0', 'semino-4', 'semina-5', 'semino-6']); // inerte ma conservato
    expect(a.storico).toEqual([voce(1, 10)]);
  });

  it('ruolo dal profilo: Blu/Semina → b, nomi di T1 (Genna) → a', () => {
    expect(migra(v1({ io: { nome: 'Blu', frase: 'x' } })).capitoliVisti).toEqual({ a: [], b: fino(6) });
    expect(migra(v1({ io: { nome: 'Semina', frase: 'x' } })).capitoliVisti).toEqual({ a: [], b: fino(6) });
    expect(migra(v1({ io: { nome: 'Genna', frase: 'x' } })).capitoliVisti).toEqual({ a: fino(6), b: [] });
  });

  it('senza semina-5 (o senza io): nessun capitolo visto, gli arretrati si leggono in ordine', () => {
    expect(migra(v1({ tappeViste: ['semino-0', 'semino-1', 'semino-4', 'entrambi-10'] })).capitoliVisti).toEqual({ a: [], b: [] });
    expect(migra(v1({ io: null })).capitoliVisti).toEqual({ a: [], b: [] });
    expect(migra(v1({ tappeViste: 'rotto' })).capitoliVisti).toEqual({ a: [], b: [] });
  });

  it('campi extra conservati; la migrazione non si riapplica (v2 con capitoliVisti vuoti resta vuoto)', () => {
    const a = migra(v1({ sbloccatiVisti: ['elemento:fiore'], regaliBonus: 2, novita: { x: 1 } }));
    expect(a.sbloccatiVisti).toEqual(['elemento:fiore']);
    expect(a.regaliBonus).toBe(2);
    expect(a.novita).toEqual({ x: 1 });
    const v2 = { ...JSON.parse(JSON.stringify(a)), capitoliVisti: { a: [], b: [] } };
    expect(migra(v2).capitoliVisti).toEqual({ a: [], b: [] });
    expect(migra(JSON.parse(JSON.stringify(a)))).toEqual(a);
  });

  it('v2: capitoliVisti ed ecoViste validati; i visti restano un prefisso', () => {
    const a = migra({ versione: 2, capitoliVisti: { a: 'x', b: [1, 'capitolo-1', 'capitolo-0', 'capitolo-3'] }, ecoViste: ['eco-1', 2] });
    expect(a.capitoliVisti).toEqual({ a: [], b: fino(2) });
    expect(a.ecoViste).toEqual(['eco-1']);
    expect(migra({ versione: 2, capitoliVisti: [1] }).capitoliVisti).toEqual({ a: [], b: [] });
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
    const a = archivio({ partner: 'Lei', tappeViste: [chiaveTappa('semino', 3)], capitoliVisti: { a: fino(3), b: fino(1) }, ecoViste: ['eco-2'] });
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

describe('campi sconosciuti (archivio di una versione più alta)', () => {
  const extra = { novita: { a: [1, 2, { b: 'x' }] }, tema: 'notte' };

  it('migra li conserva, validando comunque i campi noti', () => {
    const a = migra({ versione: 2, partner: 5, ...extra });
    expect(a.versione).toBe(2);
    expect(a.partner).toBe('');
    expect(a.novita).toEqual(extra.novita);
    expect(a.tema).toBe('notte');
  });

  it('sopravvivono a carica → salva → carica', () => {
    const s = new FintoStorage();
    s.setItem(CHIAVE_ARCHIVIO, JSON.stringify({ ...archivio({ partner: 'Lei', storico: [voce(1, 10)] }), versione: 2, ...extra }));
    const letto = carica(s);
    expect(salva({ ...letto, partner: 'Lui' }, s)).toBe(true);
    const grezzo = JSON.parse(s.getItem(CHIAVE_ARCHIVIO)!);
    expect(grezzo.versione).toBe(2);
    expect(grezzo.novita).toEqual(extra.novita);
    expect(grezzo.tema).toBe('notte');
    const riletto = carica(s);
    expect(riletto).toEqual({ ...letto, partner: 'Lui' });
    expect(riletto.novita).toEqual(extra.novita);
  });

  it('sopravvivono anche al filtro azzeramento e alla migrazione dalla versione 1', () => {
    const a = migra({ versione: 1, azzerato: 100, storico: [voce(1, 50)], ...extra });
    expect(a.storico).toEqual([]);
    expect(a.tema).toBe('notte');
    expect(applicaAzzeramento(a, 200).tema).toBe('notte');
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

  it('svuota i capitoli visti di ENTRAMBI i ruoli e le eco (anche quando arriva dal partner)', () => {
    const c = archivio({ capitoliVisti: { a: fino(6), b: fino(3) }, ecoViste: ['eco-5'], azzerato: 10 });
    const z = applicaAzzeramento(c, 100);
    expect(z.capitoliVisti).toEqual({ a: [], b: [] });
    expect(z.ecoViste).toEqual([]);
    expect(applicaAzzeramento(c, 10).capitoliVisti).toEqual({ a: fino(6), b: fino(3) });
    const r = unisciStoricoRemoto(c, [], 200);
    expect(r.capitoliVisti).toEqual({ a: [], b: [] });
    expect(r.ecoViste).toEqual([]);
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

// --- robustezza delle memorie divergenti (docs/specs/traguardo.md) -------------------------------
// Unione di due archivi come la fanno i due dispositivi: storico con `unisciStoricoRemoto` (che applica
// prima l'azzeramento del partner), partita in corso con `unisci` di index.ts (dopo il filtro azzeramento).
// Si confronta il "nucleo" che si sincronizza; tappeViste, io, partner e impostazioni sono locali.
function unisciArchivi(a: Archivio, b: Archivio): Archivio {
  const r = unisciStoricoRemoto(a, b.storico, b.azzerato);
  const pb = b.partita && b.partita.iniziata >= r.azzerato ? b.partita : null;
  const partita = r.partita && pb ? unisci(r.partita, pb) : (r.partita ?? pb);
  return { ...r, partita };
}

const nucleo = (a: Archivio) => ({ storico: a.storico, partita: a.partita, azzerato: a.azzerato });
const VUOTO = (): Archivio => migra(undefined);

/** mulberry32: generatore pseudo-casuale seedato, riproducibile. */
function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Partita con `iniziata` fissata dal seed (la stessa su entrambi i dispositivi). Il contenuto di una cella o di un
 * contatore è funzione di (idx, ts) e il ts è pari per 'a', dispari per 'b': come nel gioco reale, un ts identico
 * non porta mai due contenuti diversi.
 */
function partitaCasuale(rnd: () => number, seed: number): StatoPartita {
  const iniziata = 1000 * seed;
  let s = nuovaPartita(puzzle(seed), iniziata);
  const tsDi = (g: Giocatore) => iniziata + 2 + 2 * Math.floor(rnd() * 400) + (g === 'b' ? 1 : 0);
  for (let k = Math.floor(rnd() * 12); k > 0; k--) {
    const idx = 1 + 2 * Math.floor(rnd() * 40); // celle vuote del puzzle di prova: indici dispari
    const da: Giocatore = rnd() < 0.5 ? 'a' : 'b';
    const ts = tsDi(da);
    s = applica(s, { tipo: 'cella', idx, v: ((idx + ts) % 9) + 1, note: [], da, ts });
  }
  for (const da of ['a', 'b'] as const) {
    if (rnd() < 0.6) {
      const ts = tsDi(da);
      s = applica(s, { tipo: 'contatori', da, contatori: { punti: ts % 50, errori: ts % 4, serie: ts % 7, regali: ts % 3, regaliDisponibili: ts % 2, ts } });
    }
  }
  s = { ...s, secondi: Math.floor(rnd() * 300) };
  if (rnd() < 0.15) s = applica(s, { tipo: 'finita', ts: iniziata + 1000 + Math.floor(rnd() * 50) });
  return s;
}

function archivioCasuale(rnd: () => number): Archivio {
  const azzerato = rnd() < 0.3 ? 1000 + Math.floor(rnd() * 4000) : 0;
  const partita = rnd() < 0.7 ? partitaCasuale(rnd, 1 + Math.floor(rnd() * 4)) : null;
  let storico: VoceStorico[] = [];
  for (let k = Math.floor(rnd() * 3); k > 0; k--) storico = unisciStorico(storico, [voceStorico(partitaCasuale(rnd, 1 + Math.floor(rnd() * 4)))]);
  for (let k = Math.floor(rnd() * 4); k > 0; k--) {
    const n = Math.floor(rnd() * 6);
    storico = unisciStorico(storico, [voce(10 + n, 700 * (n + 1), 700 * (n + 1) + Math.floor(rnd() * 30))]);
  }
  if (partita && rnd() < 0.5) storico = unisciStorico(storico, [voceStorico(partita)]);
  return migra({ ...VUOTO(), azzerato, partita, storico }); // migra applica il filtro azzeramento
}

describe('robustezza delle memorie divergenti', () => {
  function verifica(a: Archivio, b: Archivio, etichetta: string) {
    const ab = unisciArchivi(a, b);
    expect(nucleo(unisciArchivi(b, a)), `${etichetta}: commutativa`).toEqual(nucleo(ab));
    expect(nucleo(unisciArchivi(ab, b)), `${etichetta}: idempotente (rimerge di B)`).toEqual(nucleo(ab));
    expect(nucleo(unisciArchivi(ab, a)), `${etichetta}: idempotente (rimerge di A)`).toEqual(nucleo(ab));
    expect(nucleo(unisciArchivi(a, a)), `${etichetta}: A∪A = A`).toEqual(nucleo(a));
    // il vuoto non cancella mai nulla, da nessuna parte
    expect(nucleo(unisciArchivi(a, VUOTO())), `${etichetta}: A∪vuoto`).toEqual(nucleo(a));
    expect(nucleo(unisciArchivi(VUOTO(), a)), `${etichetta}: vuoto∪A`).toEqual(nucleo(a));
    return ab;
  }

  it('partite diverse: vince la più recente, lo storico le tiene entrambe', () => {
    const pa = partita(1, 1000, 2);
    const pb = partita(2, 2000, 3);
    const A = archivio({ partita: pa, storico: [voceStorico(pa)] });
    const B = archivio({ partita: pb, storico: [voceStorico(pb)] });
    const ab = verifica(A, B, 'partite diverse');
    expect(ab.partita).toEqual(pb);
    expect(ab.storico.map((v) => v.id)).toEqual(['sudoku-2', 'sudoku-1']);
  });

  it('stessa partita, celle e contatori diversi per giocatore: si compongono', () => {
    const base = nuovaPartita(puzzle(4), 4000);
    const ctr = (ts: number) => ({ punti: ts % 50, errori: 1, serie: 2, regali: 0, regaliDisponibili: 0, ts });
    let pa = applica(base, { tipo: 'cella', idx: 1, v: 5, note: [], da: 'a', ts: 4010 });
    pa = applica(pa, { tipo: 'cella', idx: 3, v: 7, note: [], da: 'a', ts: 4020 });
    pa = applica(pa, { tipo: 'contatori', da: 'a', contatori: ctr(4020) });
    pa = { ...pa, secondi: 50 };
    let pb = applica(base, { tipo: 'cella', idx: 3, v: 2, note: [1], da: 'b', ts: 4031 }); // più recente su idx 3
    pb = applica(pb, { tipo: 'cella', idx: 5, v: 9, note: [], da: 'b', ts: 4011 });
    pb = applica(pb, { tipo: 'contatori', da: 'b', contatori: ctr(4031) });
    pb = { ...pb, secondi: 80 };
    const A = archivio({ partita: pa, storico: [voceStorico(pa)] });
    const B = archivio({ partita: pb, storico: [voceStorico(pb)] });
    const ab = verifica(A, B, 'stessa partita');
    expect(Object.keys(ab.partita!.celle).sort()).toEqual(['1', '3', '5']);
    expect(ab.partita!.celle[3]).toMatchObject({ v: 2, da: 'b', ts: 4031 });
    expect(ab.partita!.contatori?.a?.ts).toBe(4020);
    expect(ab.partita!.contatori?.b?.ts).toBe(4031);
    expect(ab.partita!.secondi).toBe(80);
    expect(ab.storico).toHaveLength(1);
  });

  it('azzeramenti diversi: vale il maggiore su entrambi i lati, mai una voce resuscitata', () => {
    const vecchia = partita(1, 1000, 2);
    const nuova = partita(3, 3000, 2);
    const A = archivio({ azzerato: 2000, partita: nuova, storico: [voceStorico(nuova)] });
    const B = archivio({ azzerato: 500, partita: vecchia, storico: [voceStorico(vecchia), voce(7, 600), voce(8, 2500)] });
    const ab = verifica(A, B, 'azzeramenti');
    expect(ab.azzerato).toBe(2000);
    expect(ab.storico.map((v) => v.id)).toEqual(['sudoku-3', 'sudoku-8']);
    expect(ab.partita).toEqual(nuova);
    // partita di B precedente all'azzeramento di A: non rientra dalla porta di servizio
    expect(unisciArchivi(archivio({ azzerato: 2000 }), B).partita).toBeNull();
  });

  it('uno dei due vuoto: l\'altro resta intatto', () => {
    const p = partita(2, 2000, 3);
    const A = archivio({ azzerato: 100, partita: p, storico: [voceStorico(p), voce(9, 500, 900)] });
    const ab = verifica(A, VUOTO(), 'uno vuoto');
    expect(ab).toEqual(A);
    expect(nucleo(verifica(VUOTO(), VUOTO(), 'entrambi vuoti'))).toEqual(nucleo(VUOTO()));
  });

  it('30 coppie di archivi pseudo-casuali (seed fissi)', () => {
    for (let i = 1; i <= 30; i++) {
      const A = archivioCasuale(prng(i * 2));
      const B = archivioCasuale(prng(i * 2 + 1));
      verifica(A, B, `coppia ${i} (seed ${i * 2}/${i * 2 + 1})`);
    }
  });
});
