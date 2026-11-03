import { describe, expect, it } from 'vitest';
import { BONUS_VITTORIA, PENALITA_ERRORE, PUNTI, PUNTI_CRESCITA_PIENA, PUNTI_PER_REGALO, bonusTempo } from '../config/punteggio';
import { FRASI, SEMINA_SBLOCCATA_A, VOCE } from '../config/frasi';
import { generaPuzzle } from '../engine';
import type { Puzzle, Valutazione } from '../engine';
import { applica, griglia, nuovaPartita, voceStorico } from '../stato';
import type { Contatori, StatoPartita, VoceStorico } from '../stato';
import {
  CHIAVE_SBLOCCO,
  STORIA,
  celleCompletate,
  conBonusVittoria,
  conRegali,
  contatoriVuoti,
  crescita,
  daRimandare,
  esitoMossa,
  fraseMascotte,
  puntiMossa,
  scegliFrase,
  scenaDaMostrare,
  sostituisci,
  statistiche,
  tappaDaMostrare,
  umoreEvento,
  usaRegalo,
  vociCambiate,
} from './regole';

const puzzle: Puzzle = generaPuzzle('sudoku', 'semini', 42);
const vuote = puzzle.dati.map((d, i) => (d === 0 ? i : -1)).filter((i) => i >= 0);
const c0 = (x: Partial<Contatori> = {}): Contatori => ({ ...contatoriVuoti(), ...x });

describe('punti di una mossa', () => {
  const v = (qualita: Valutazione['qualita'], completate: Valutazione['completate'] = []): Valutazione => ({
    qualita,
    candidati: 1,
    completate,
  });
  it('qualità × moltiplicatore della serie', () => {
    expect(puntiMossa(v('giusta'), 1)).toBe(PUNTI.giusta);
    expect(puntiMossa(v('intelligente'), 4)).toBe(PUNTI.intelligente);
    expect(puntiMossa(v('brillante'), 5)).toBe(PUNTI.brillante * 1.5);
    expect(puntiMossa(v('giusta'), 40)).toBe(PUNTI.giusta * 3); // tetto ×3
  });
  it('bonus per ogni unità chiusa', () => {
    expect(puntiMossa(v('chiusura', ['riga', 'box']), 1)).toBe(PUNTI.chiusura + 2 * PUNTI.chiusura);
  });
});

describe('esito di una mossa', () => {
  const g = puzzle.dati.slice();
  const idx = vuote[0];
  const giusto = puzzle.soluzione[idx];
  const sbagliato = (giusto % 9) + 1;
  const base = { puzzle, grigliaPrima: g, idx, erroriDiFila: 0, giaContata: false, ts: 100 };

  it('valore giusto: punti, serie +1, ts nuovo', () => {
    const e = esitoMossa({ ...base, v: giusto, contatori: undefined });
    expect(e.tipo).toBe('giusta');
    if (e.tipo !== 'giusta') return;
    expect(e.contatori.punti).toBe(e.punti);
    expect(e.punti).toBeGreaterThan(0);
    expect(e.contatori.serie).toBe(1);
    expect(e.contatori.ts).toBe(100);
  });

  it('errore: penalità (mai sotto 0), errori +1, serie azzerata', () => {
    const e = esitoMossa({ ...base, v: sbagliato, contatori: c0({ punti: 5, serie: 7 }) });
    expect(e).toMatchObject({ tipo: 'errore', diFila: 1 });
    if (e.tipo !== 'errore') return;
    expect(e.contatori).toMatchObject({ punti: 0, errori: 1, serie: 0 });
    const e2 = esitoMossa({ ...base, v: sbagliato, contatori: c0({ punti: 100 }), erroriDiFila: 2 });
    if (e2.tipo !== 'errore') throw new Error('atteso errore');
    expect(e2.contatori.punti).toBe(100 - PENALITA_ERRORE);
    expect(e2.diFila).toBe(3);
  });

  it('riscrivere lo stesso valore sbagliato non conta due volte', () => {
    const g2 = g.slice();
    g2[idx] = sbagliato;
    expect(esitoMossa({ ...base, grigliaPrima: g2, v: sbagliato, contatori: undefined }).tipo).toBe('nessuno');
  });

  it('una cella già contata non dà punti di nuovo; cancellare non conta', () => {
    expect(esitoMossa({ ...base, v: giusto, contatori: undefined, giaContata: true }).tipo).toBe('nessuno');
    expect(esitoMossa({ ...base, v: 0, contatori: undefined }).tipo).toBe('nessuno');
  });

  it('serie: traguardo ai multipli di 5', () => {
    const e = esitoMossa({ ...base, v: giusto, contatori: c0({ serie: 4 }) });
    expect(e.tipo === 'giusta' && e.serieTraguardo).toBe(5);
    const e2 = esitoMossa({ ...base, v: giusto, contatori: c0({ serie: 5 }) });
    expect(e2.tipo === 'giusta' && e2.serieTraguardo).toBe(null);
  });

  it('regalo guadagnato superando la soglia', () => {
    const e = esitoMossa({ ...base, v: giusto, contatori: c0({ punti: PUNTI_PER_REGALO - 1 }) });
    if (e.tipo !== 'giusta') throw new Error('attesa giusta');
    expect(e.regaliNuovi).toBe(1);
    expect(e.contatori.regaliDisponibili).toBe(1);
  });
});

describe('regali', () => {
  it('uno ogni PUNTI_PER_REGALO, mai tolti se i punti scendono', () => {
    expect(conRegali(c0({ punti: PUNTI_PER_REGALO * 2 + 3 })).nuovi).toBe(2);
    const giaDati = c0({ punti: 10, regali: 2, regaliDisponibili: 1 });
    expect(conRegali(giaDati)).toEqual({ contatori: giaDati, nuovi: 0 });
  });
  it('usare un regalo: uno in meno, 0 punti, serie intatta', () => {
    expect(usaRegalo(c0({ regaliDisponibili: 0 }), 5)).toBeNull();
    expect(usaRegalo(undefined, 5)).toBeNull();
    expect(usaRegalo(c0({ regaliDisponibili: 2, punti: 50, serie: 3 }), 5)).toMatchObject({
      regaliDisponibili: 1,
      punti: 50,
      serie: 3,
      ts: 5,
    });
  });
});

describe('vittoria e crescita', () => {
  it('bonus vittoria = BONUS + bonus tempo', () => {
    expect(conBonusVittoria(c0({ punti: 10 }), 60, 9)).toMatchObject({ punti: 10 + BONUS_VITTORIA + bonusTempo(60), ts: 9 });
    expect(conBonusVittoria(undefined, 99999, 1).punti).toBe(BONUS_VITTORIA);
  });
  it('quote affiancate e frazione limitata a 1', () => {
    const s: StatoPartita = {
      ...nuovaPartita(puzzle, 1),
      contatori: { a: c0({ punti: PUNTI_CRESCITA_PIENA / 4, ts: 2 }), b: c0({ punti: PUNTI_CRESCITA_PIENA / 2, ts: 2 }) },
    };
    expect(crescita(s, 'a')).toMatchObject({ frazione: 0.75, mia: 0.25, sua: 0.5 });
    expect(crescita(s, 'b')).toMatchObject({ mia: 0.5, sua: 0.25 });
    const oltre: StatoPartita = { ...s, contatori: { a: c0({ punti: PUNTI_CRESCITA_PIENA * 2, ts: 2 }) } };
    expect(crescita(oltre, 'a')).toMatchObject({ frazione: 1, mia: 1, sua: 0 });
  });
});

describe('celle delle unità chiuse', () => {
  it('riga, colonna e box della cella', () => {
    const c = celleCompletate(puzzle, 10, ['riga', 'colonna', 'box']);
    expect(c).toHaveLength(9 + 9 + 9 - 3 - 2 - 2 + 1); // 21 distinte
    expect(c).toContain(17);
    expect(c).toContain(73);
  });
  it('gabbia nel killer', () => {
    const k = generaPuzzle('killer', 'semini', 7);
    const g = k.gabbie!.find((x) => x.celle.includes(40))!;
    expect(celleCompletate(k, 40, ['gabbia']).sort()).toEqual([...g.celle].sort());
  });
});

describe('giardino e storia', () => {
  const voce = (id: string, x: Partial<VoceStorico>): VoceStorico => ({
    id,
    modalita: 'sudoku',
    livello: 'facile',
    iniziata: 1,
    secondi: 100,
    progresso: 1,
    punti: 10,
    errori: 1,
    aggiornata: 1,
    ...x,
  });
  it('statistiche: fiori, punti, errori, miglior tempo per livello', () => {
    const st = statistiche([
      voce('a', { finita: 5, secondi: 300 }),
      voce('b', { finita: 6, secondi: 200 }),
      voce('c', { secondi: 50, progresso: 0.3 }),
      voce('d', { finita: 7, secondi: 90, modalita: 'killer', livello: 'medio' }),
    ]);
    expect(st).toMatchObject({ fiori: 3, germogli: 1, punti: 40, errori: 4 });
    expect(st.migliori).toEqual([
      { modalita: 'sudoku', livello: 'facile', secondi: 200 },
      { modalita: 'killer', livello: 'medio', secondi: 90 },
    ]);
  });
  it('storia completa ordinata per fiori', () => {
    const p = STORIA.map((t) => t.partite);
    expect(p).toEqual([...p].sort((x, y) => x - y));
  });
  it('tappa più alta raggiunta e non vista; la tappa di Semina la racconta la scena', () => {
    expect(tappaDaMostrare(0, [])?.chiave).toBe('semino-0');
    expect(tappaDaMostrare(3, [])?.chiave).toBe('semino-3');
    expect(tappaDaMostrare(3, ['semino-3'])?.chiave).toBe('semino-2');
    expect(tappaDaMostrare(SEMINA_SBLOCCATA_A, ['semino-4'])?.chiave).not.toBe(CHIAVE_SBLOCCO);
    expect(scenaDaMostrare(SEMINA_SBLOCCATA_A - 1, [])).toBe(false);
    expect(scenaDaMostrare(SEMINA_SBLOCCATA_A, [])).toBe(true);
    expect(scenaDaMostrare(SEMINA_SBLOCCATA_A + 3, [CHIAVE_SBLOCCO])).toBe(false);
  });
});

describe('frasi', () => {
  it('sostituzioni {nome} {io} {n}', () => {
    expect(sostituisci('{io} e {nome}: {n} di fila', { nome: 'Blu', io: 'Verde', n: 5 })).toBe('Verde e Blu: 5 di fila');
  });
  it('mai due uguali di fila', () => {
    let ultima = '';
    for (let i = 0; i < 200; i++) {
      const f = scegliFrase(FRASI.giusta, ultima, { nome: 'x', io: 'y' });
      expect(f).not.toBe(ultima);
      ultima = f;
    }
    expect(scegliFrase(['solo'], 'solo', { nome: '', io: '' })).toBe('solo');
  });
  it('mascotte: metà dalla sua voce, metà da FRASI', () => {
    const s = { nome: 'a', io: 'b' };
    expect(VOCE.semina.brillante).toContain(fraseMascotte('brillante', 'semina', '', s, () => 0.1));
    expect(FRASI.brillante as readonly string[]).toContain(fraseMascotte('brillante', 'semina', '', s, () => 0.9));
    // categoria senza voce propria: sempre FRASI
    expect(FRASI.suggerimento as readonly string[]).toContain(fraseMascotte('suggerimento', 'semino', '', s, () => 0.1));
  });
  it('umori: Semina euforica e arrabbiata, Semino no', () => {
    expect(umoreEvento('semina', 'brillante')).toBe('euforico');
    expect(umoreEvento('semina', 'erroreSerie')).toBe('arrabbiato');
    expect(umoreEvento('semino', 'brillante')).toBe('estasiato');
    expect(umoreEvento('semino', 'erroreSerie')).toBe('preoccupato');
  });
});

describe('allineamento dello storico', () => {
  const s = applica(nuovaPartita(puzzle, 10), { tipo: 'cella', idx: vuote[0], v: 1, note: [], da: 'a', ts: 20 });
  const v1 = voceStorico(s);
  it('voci cambiate rispetto all’ultimo invio', () => {
    expect(vociCambiate([v1], new Map())).toEqual([v1]);
    expect(vociCambiate([v1], new Map([[v1.id, v1.aggiornata]]))).toEqual([]);
  });
  it('si rimandano solo le mie voci più recenti fra quelle ricevute', () => {
    const vecchia = { ...v1, aggiornata: 5 };
    expect(daRimandare([v1], [vecchia])).toEqual([v1]);
    expect(daRimandare([v1], [v1])).toEqual([]);
    expect(daRimandare([v1], [])).toEqual([]);
    expect(griglia(s)[vuote[0]]).toBe(1);
  });
});
