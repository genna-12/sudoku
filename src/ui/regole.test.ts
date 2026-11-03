import { describe, expect, it } from 'vitest';
import { BONUS_VITTORIA, PENALITA_ERRORE, PUNTI, PUNTI_CRESCITA_PIENA, PUNTI_PER_REGALO, bonusTempo } from '../config/punteggio';
import { FRASI, FRASI_EXTRA, SEMINA_SBLOCCATA_A, VOCE, VOCE_SUGGERIMENTO } from '../config/frasi';
import { GIORNI_SPECIALI, SBLOCCHI, SORPRESE } from '../config/storia';
import { generaPuzzle } from '../engine';
import type { Puzzle, Valutazione } from '../engine';
import { applica, griglia, nuovaPartita, voceStorico } from '../stato';
import type { Contatori, StatoPartita, VoceStorico } from '../stato';
import {
  CHIAVE_SBLOCCO,
  RARO_ARRABBIATA,
  UMORI_SOLLETICO,
  accessorioDi,
  aCasoDiverso,
  conQuotaBlu,
  numeriFiori,
  presenzaBlu,
  quotaBluFiore,
  quotaBluPartita,
  solletico,
  STORIA,
  celleCompletate,
  accessoriSbloccati,
  accessorioPermesso,
  chiacchiera,
  chiaveSblocco,
  frasiDisponibili,
  frasiInvio,
  regaliBonusDi,
  ricorda,
  sblocchiNuovi,
  sorpresaDaMostrare,
  stessiVisti,
  conBonusVittoria,
  conRegali,
  contatoriVuoti,
  crescita,
  daRimandare,
  esitoMossa,
  fraseMascotte,
  fraseSonno,
  nominaSemina,
  senzaSemina,
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
    // la storia non torna indietro: le tappe saltate non si recuperano
    expect(tappaDaMostrare(3, ['semino-3'])).toBeNull();
    // vittoria a 4 seguita subito da "nuova", poi il 5° fiore: dopo la scena NON "Semino si sente solo"
    expect(tappaDaMostrare(SEMINA_SBLOCCATA_A, [CHIAVE_SBLOCCO])).toBeNull();
    expect(tappaDaMostrare(SEMINA_SBLOCCATA_A, [])).toBeNull();
    expect(tappaDaMostrare(SEMINA_SBLOCCATA_A + 1, [CHIAVE_SBLOCCO])?.chiave).toBe('semino-6');
    // chiavi di T2 con un altro `chi` per lo stesso numero di fiori: la tappa resta vista
    expect(tappaDaMostrare(8, ['semina-8'])).toBeNull();
    expect(tappaDaMostrare(7, ['semino-7'])).toBeNull();
    expect(tappaDaMostrare(8, ['sorpresa-8'])?.chiave).toBe('semino-8');
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
    // il suggerimento ha la sua voce per personaggio (VOCE_SUGGERIMENTO), altrimenti FRASI
    expect(VOCE_SUGGERIMENTO.semino).toContain(fraseMascotte('suggerimento', 'semino', '', s, () => 0.1));
    expect(VOCE_SUGGERIMENTO.semina).toContain(fraseMascotte('suggerimento', 'semina', '', s, () => 0.1));
    expect(FRASI.suggerimento as readonly string[]).toContain(fraseMascotte('suggerimento', 'semina', '', s, () => 0.9));
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

// --- T2b ----------------------------------------------------------------------

/** generatore pseudo-casuale ripetibile per i test */
function casoDa(seme: number): () => number {
  let x = seme;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe('presenza del blu', () => {
  it('cresce coi fiori fino allo sblocco, poi resta piena', () => {
    expect(presenzaBlu(0, false)).toBe(0);
    expect(presenzaBlu(3, false)).toBeCloseTo(3 / SEMINA_SBLOCCATA_A);
    expect(presenzaBlu(SEMINA_SBLOCCATA_A + 4, false)).toBe(1);
    expect(presenzaBlu(0, true)).toBe(1);
    expect(presenzaBlu(-2, false)).toBe(0);
  });
});

describe('fiori del giardino', () => {
  const finita = (id: string, fine: number, extra: object = {}): VoceStorico =>
    ({ id, modalita: 'sudoku', livello: 'facile', iniziata: fine - 100, finita: fine, secondi: 60, progresso: 1, punti: 10, errori: 0, aggiornata: fine, ...extra }) as VoceStorico;

  it('numera i fiori per data di fine, i germogli no', () => {
    const germoglio = { ...finita('g', 50), finita: undefined };
    const n = numeriFiori([finita('c', 300), germoglio, finita('a', 100), finita('b', 200)]);
    expect([...n.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('i primi fiori vanno dal tutto verde a metà e metà, e restano così', () => {
    const v = finita('x', 1, { quotaBlu: 1 });
    expect(quotaBluFiore(v, 1, false)).toBe(0);
    expect(quotaBluFiore(v, 3, false)).toBeCloseTo(0.25);
    expect(quotaBluFiore(v, SEMINA_SBLOCCATA_A, false)).toBe(0.5);
    expect(quotaBluFiore(v, 1, true)).toBe(0);
    expect(quotaBluFiore(v, SEMINA_SBLOCCATA_A, true)).toBe(0.5);
  });

  it('dal fiore successivo conta chi ha fatto più punti', () => {
    const n = SEMINA_SBLOCCATA_A + 1;
    expect(quotaBluFiore(finita('x', 1, { quotaBlu: 0.8 }), n, true)).toBe(0.8);
    expect(quotaBluFiore(finita('x', 1, { quotaBlu: 0 }), n, true)).toBe(0);
    expect(quotaBluFiore(finita('x', 1), n, true)).toBe(0.5);
    // Semina non ancora arrivata su questo dispositivo: niente fiori più blu che verdi
    expect(quotaBluFiore(finita('x', 1, { quotaBlu: 0.9 }), n, false)).toBe(0.5);
  });

  it('i germogli restano neutri', () => {
    expect(quotaBluFiore({ ...finita('x', 1), finita: undefined }, 1, true)).toBeNull();
  });

  it('quota dai contatori della partita e salvata nella voce finita', () => {
    let s = nuovaPartita(puzzle, 1000);
    expect(quotaBluPartita(s)).toBe(0.5);
    s = applica(s, { tipo: 'contatori', da: 'a', contatori: { ...contatoriVuoti(), punti: 300, ts: 2000 } });
    s = applica(s, { tipo: 'contatori', da: 'b', contatori: { ...contatoriVuoti(), punti: 100, ts: 2000 } });
    expect(quotaBluPartita(s)).toBe(0.25);
    const aperta = { storico: [voceStorico(s)] };
    expect(conQuotaBlu(aperta, s)).toBe(aperta);
    const fin = applica(s, { tipo: 'finita', ts: 3000 });
    const a = { storico: [voceStorico(fin)] };
    const b = conQuotaBlu(a, fin);
    expect((b.storico[0] as VoceStorico & { quotaBlu?: number }).quotaBlu).toBe(0.25);
    expect(conQuotaBlu(b, fin)).toBe(b);
  });
});

describe('solletico', () => {
  const s = { nome: 'Blu', io: 'Verde' };

  it('umore e battuta mai uguali ai precedenti', () => {
    const caso = casoDa(7);
    for (const chi of ['semino', 'semina'] as const) {
      let umore = '';
      let testo = '';
      for (let i = 0; i < 200; i++) {
        const r = solletico(chi, umore, testo, s, caso);
        expect(r.umore).not.toBe(umore);
        expect(r.testo).not.toBe(testo);
        expect(VOCE[chi].solletico).toContain(r.testo);
        umore = r.umore;
        testo = r.testo;
      }
    }
  });

  it('Semino non si arrabbia mai; Semina di rado', () => {
    const caso = casoDa(11);
    let arrabbiate = 0;
    let u = '';
    for (let i = 0; i < 4000; i++) {
      expect(solletico('semino', u, '', s, caso).umore).not.toBe('arrabbiato');
      const r = solletico('semina', u, '', s, caso);
      expect([...UMORI_SOLLETICO, 'arrabbiato']).toContain(r.umore);
      if (r.umore === 'arrabbiato') arrabbiate++;
      u = r.umore;
    }
    expect(arrabbiate).toBeGreaterThan(4000 / RARO_ARRABBIATA / 2);
    expect(arrabbiate).toBeLessThan((4000 / RARO_ARRABBIATA) * 1.5);
  });

  it('a caso ma diverso', () => {
    expect(aCasoDiverso(['x', 'y'], 'x', () => 0.99)).toBe('y');
    expect(aCasoDiverso(['x'], 'x', () => 0.5)).toBe('x');
    expect(aCasoDiverso([], 'x')).toBeUndefined();
  });
});

describe('nomi veri e accessori nelle frasi', () => {
  it('sostituisce {reale} e {realePartner}', () => {
    const t = sostituisci('{reale} e {realePartner} ({io}, {nome})', { nome: 'Blu', io: 'Verde', reale: 'Genna', realePartner: 'Mati' });
    expect(t).toBe('Genna e Mati (Verde, Blu)');
    expect(sostituisci('{reale}', { nome: 'Blu', io: 'Verde' })).toBe('Verde');
  });

  it('ritrova l’accessorio di una chiacchiera, anche già sostituita', () => {
    const conAcc = VOCE.semino.chiacchiere.find((f) => typeof f !== 'string');
    if (!conAcc || typeof conAcc === 'string') throw new Error('nessuna chiacchiera con accessorio');
    expect(accessorioDi('semino', conAcc.testo)).toBe(conAcc.accessorio);
    expect(accessorioDi('semino', 'una frase che non esiste')).toBeUndefined();
  });
});

// --- T3b ----------------------------------------------------------------------

describe('pacchetti di frasi', () => {
  const testi = (l: ReturnType<typeof frasiDisponibili>) => l.map((f) => (typeof f === 'string' ? f : f.testo));
  const stagno = FRASI_EXTRA.find((p) => p.partite === 8 && p.chi === 'semino' && p.categoria === 'chiacchiere')!;
  const stagnoTesto = typeof stagno.frasi[0] === 'string' ? stagno.frasi[0] : stagno.frasi[0].testo;

  it('si aggiungono alla voce solo da quella soglia, del personaggio giusto', () => {
    const base = VOCE.semino.chiacchiere.length;
    expect(frasiDisponibili('chiacchiere', 'semino', 7)).toHaveLength(base);
    expect(testi(frasiDisponibili('chiacchiere', 'semino', 8))).toContain(stagnoTesto);
    expect(frasiDisponibili('chiacchiere', 'semino', 8)).toHaveLength(base + stagno.frasi.length);
    expect(testi(frasiDisponibili('chiacchiere', 'semina', 8))).not.toContain(stagnoTesto);
  });

  it("i pacchetti di 'entrambi' valgono per tutti e due; l'invio cresce coi fiori", () => {
    const vittoria40 = FRASI_EXTRA.find((p) => p.chi === 'entrambi' && p.categoria === 'vittoria')!;
    const t = typeof vittoria40.frasi[2] === 'string' ? vittoria40.frasi[2] : vittoria40.frasi[2].testo;
    for (const chi of ['semino', 'semina'] as const) {
      expect(testi(frasiDisponibili('vittoria', chi, 39))).not.toContain(t);
      expect(testi(frasiDisponibili('vittoria', chi, 40))).toContain(t);
    }
    expect(frasiInvio(0)).toEqual([...FRASI.invio]);
    expect(frasiInvio(12).length).toBeGreaterThan(FRASI.invio.length);
  });

  it('chiacchiera e accessorioDi conoscono pacchetti e giorni speciali', () => {
    // caso 0.99: niente frasi speciali; la lista con il pacchetto contiene la frase dello stagno
    const s = { nome: 'a', io: 'b' };
    const viste = new Set<string>();
    for (let i = 0; i < 400; i++) viste.add(chiacchiera('semino', '', s, casoDa(i), { fiori: 8 }));
    expect(viste.has(stagnoTesto)).toBe(true);
    const conAcc = stagno.frasi.find((f) => typeof f !== 'string');
    if (!conAcc || typeof conAcc === 'string') throw new Error('nessuna frase con accessorio');
    expect(accessorioDi('semino', conAcc.testo)).toBe(conAcc.accessorio);
    const mare = GIORNI_SPECIALI.mare.chiacchiere.semino.find((f) => typeof f !== 'string');
    if (!mare || typeof mare === 'string') throw new Error('nessuna frase del mare con accessorio');
    expect(accessorioDi('semino', mare.testo)).toBe(mare.accessorio);
    // giorno speciale: con caso basso la chiacchiera viene da quelle dedicate
    const speciali = GIORNI_SPECIALI.montagna.chiacchiere.semina.map((f) => (typeof f === 'string' ? f : f.testo));
    expect(speciali).toContain(chiacchiera('semina', '', s, () => 0.1, { fiori: 10, giorno: 'montagna' }));
  });
});

describe('accessori sbloccati', () => {
  it('surf da 15 fiori, cavallo da 30', () => {
    expect(accessoriSbloccati(['occhiali', 'surf'], 14)).toEqual(['occhiali']);
    expect(accessoriSbloccati(['occhiali', 'surf'], 15)).toEqual(['occhiali', 'surf']);
    expect(accessoriSbloccati(['corona', 'cavallo'], 29)).toEqual(['corona']);
    expect(accessoriSbloccati(['corona', 'cavallo'], 30)).toEqual(['corona', 'cavallo']);
  });
  it('Semino mai in montagna; Semina col surf solo in coppia nel giorno del mare', () => {
    expect(accessorioPermesso('semino', 'montagna', 99)).toBeUndefined();
    expect(accessorioPermesso('semino', 'cavallo', 99)).toBeUndefined();
    expect(accessorioPermesso('semino', 'surf', 14)).toBeUndefined();
    expect(accessorioPermesso('semino', 'surf', 15)).toBe('surf');
    expect(accessorioPermesso('semina', 'surf', 20)).toBeUndefined();
    expect(accessorioPermesso('semina', 'surf', 20, { inCoppia: true, giorno: 'montagna' })).toBeUndefined();
    expect(accessorioPermesso('semina', 'surf', 20, { inCoppia: true, giorno: 'mare' })).toBe('surf');
    expect(accessorioPermesso('semina', 'surf', 10, { inCoppia: true, giorno: 'mare' })).toBeUndefined();
    expect(accessorioPermesso('semina', 'cavallo', 29)).toBeUndefined();
    expect(accessorioPermesso('semina', 'montagna', 0)).toBe('montagna');
  });
});

describe('sblocchi nuovi', () => {
  const chiavi = (n: number) => SBLOCCHI.filter((s) => s.partite <= n).map((s) => chiaveSblocco(s.sblocco));

  it('niente da annunciare a 0 fiori', () => {
    expect(sblocchiNuovi(0, undefined)).toEqual({ annuncio: [], regali: 0, visti: [] });
  });

  it('una soglia nuova: annuncio con i suoi regali', () => {
    const n = sblocchiNuovi(8, chiavi(7));
    expect(n.annuncio.map((s) => s.id)).toEqual(['stagno', 'semino-chiacchiere-8', 'semina-chiacchiere-8']);
    expect(n.regali).toBe(0);
    expect(n.visti).toEqual(chiavi(8));
    const m = sblocchiNuovi(10, chiavi(8));
    expect(m.annuncio.map((s) => s.tipo)).toEqual(['elemento', 'regalo']);
    expect(m.regali).toBe(1);
  });

  it('più soglie insieme: solo l’ultima, tutte segnate viste; poi più niente', () => {
    const n = sblocchiNuovi(13, []);
    expect(n.annuncio.map((s) => s.id)).toEqual(['cassetta', 'entrambi-invio-12']);
    expect(n.regali).toBe(0);
    expect(sblocchiNuovi(13, n.visti).annuncio).toEqual([]);
    expect(stessiVisti(n.visti, sblocchiNuovi(13, n.visti).visti)).toBe(true);
  });

  it('dopo un "ricomincia" le chiavi oltre i fiori si dimenticano', () => {
    const n = sblocchiNuovi(0, chiavi(20));
    expect(n.visti).toEqual([]);
    expect(stessiVisti(chiavi(20), n.visti)).toBe(false);
    expect(sblocchiNuovi(1, n.visti).regali).toBe(1);
  });

  it('valori strani nell’archivio', () => {
    expect(sblocchiNuovi(1, 'boh').annuncio.length).toBe(2);
    expect(regaliBonusDi(undefined)).toBe(0);
    expect(regaliBonusDi(-3)).toBe(0);
    expect(regaliBonusDi(2.7)).toBe(2);
  });
});

describe('sorprese alla vittoria', () => {
  const dopoSemina = ['semina-5'];
  it('la scena del numero di fiori raggiunto, una volta', () => {
    const s = sorpresaDaMostrare(10, dopoSemina, true);
    expect(s?.chiave).toBe('sorpresa-10');
    expect(s?.battute).toBe(SORPRESE.find((x) => x.partite === 10)?.battute);
    expect(sorpresaDaMostrare(10, [...dopoSemina, 'sorpresa-10'], true)).toBeNull();
    expect(sorpresaDaMostrare(11, dopoSemina, true)).toBeNull();
  });
  it('mai prima che Semina sia arrivata qui, mai sopra la sua scena', () => {
    expect(sorpresaDaMostrare(10, [], false)).toBeNull();
    expect(sorpresaDaMostrare(SEMINA_SBLOCCATA_A, [], true)).toBeNull();
  });
});

describe('memoria delle ultime frasi', () => {
  it('ricorda le ultime 8, senza doppioni', () => {
    let m: string[] = [];
    for (let i = 0; i < 12; i++) m = ricorda(m, `f${i}`);
    expect(m).toEqual(['f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11']);
    expect(ricorda(['a', 'b'], 'a')).toEqual(['b', 'a']);
    expect(ricorda(['a'], '')).toEqual(['a']);
  });

  it('una frase non torna prima di 8 altre (lista lunga)', () => {
    const lista = Array.from({ length: 20 }, (_, i) => `frase ${i}`);
    const caso = casoDa(3);
    let m: string[] = [];
    for (let i = 0; i < 300; i++) {
      const f = scegliFrase(lista, m, { nome: '', io: '' }, caso);
      expect(m).not.toContain(f);
      m = ricorda(m, f);
    }
  });

  it('lista corta: evita quante più recenti può, mai l’ultima', () => {
    const lista = ['a', 'b', 'c'];
    const caso = casoDa(5);
    let m: string[] = [];
    for (let i = 0; i < 100; i++) {
      const f = scegliFrase(lista, m, { nome: '', io: '' }, caso);
      if (m.length >= 2) expect(m.slice(-2)).not.toContain(f);
      m = ricorda(m, f);
    }
    expect(scegliFrase(['solo'], ['solo'], { nome: '', io: '' })).toBe('solo');
  });
});

describe('Semina non si nomina prima del suo arrivo', () => {
  const s = { nome: 'Blu', io: 'Verde', reale: 'Genna', realePartner: 'Mati' };
  // tutti i valori di `caso` su una griglia fitta: copre ogni indice delle liste
  const casi = Array.from({ length: 400 }, (_, i) => () => (i + 0.5) / 400);
  const categorie = Object.keys(FRASI) as Array<keyof typeof FRASI>;
  const giorni = [null, 'mare', 'montagna'] as const;

  it('nessuna frase scelta con fiori < 5 contiene "Semina" (tutte le categorie)', () => {
    for (let fiori = 0; fiori < SEMINA_SBLOCCATA_A; fiori++) {
      for (const caso of casi) {
        for (const c of categorie) {
          expect(fraseMascotte(c, 'semino', '', s, caso, fiori, false)).not.toMatch(/semina/i);
          expect(fraseMascotte(c, 'semino', '', s, caso, fiori)).not.toMatch(/semina/i);
        }
        for (const g of giorni) expect(chiacchiera('semino', '', s, caso, { fiori, giorno: g, sbloccata: false })).not.toMatch(/semina/i);
        expect(chiacchiera('semino', '', s, caso, { fiori })).not.toMatch(/semina/i);
        expect(solletico('semino', 'felice', '', s, caso).testo).not.toMatch(/semina/i);
        expect(fraseSonno('semino', '', new Date(2026, 10, 3, 4), caso)).not.toMatch(/semina/i);
        expect(fraseSonno('semino', '', new Date(2026, 10, 3, 4), caso, { mossa: true })).not.toMatch(/semina/i);
      }
      for (const t of frasiInvio(fiori, false)) expect(t).not.toMatch(/semina/i);
      for (const c of [...categorie, 'chiacchiere', 'solletico']) {
        for (const f of frasiDisponibili(c, 'semino', fiori, false)) expect(typeof f === 'string' ? f : f.testo).not.toMatch(/semina/i);
      }
    }
  });

  it('dopo lo sblocco le frasi su Semina tornano', () => {
    const tutte = frasiDisponibili('chiacchiere', 'semino', 5, true).map((f) => (typeof f === 'string' ? f : f.testo));
    expect(tutte.some((t) => /semina/i.test(t))).toBe(true);
    expect(senzaSemina(['ciao Semina', 'ciao'], false)).toEqual(['ciao']);
    expect(nominaSemina('chiedi a Mati')).toBe(false);
  });

  it('a riposo il sonno non commenta mosse; dopo una mossa sì', () => {
    const notte = new Date(2026, 10, 3, 4);
    const riposo = new Set(casi.map((c) => fraseSonno('semino', '', notte, c)));
    for (const t of riposo) expect(t).not.toMatch(/mossa|giocate|brav/i);
    const mossa = new Set(casi.map((c) => fraseSonno('semino', '', notte, c, { mossa: true })));
    expect([...mossa].some((t) => /mossa/i.test(t))).toBe(true);
  });
});
