// @vitest-environment jsdom
// Validazione finale T6/T7 (04/11): prove indipendenti dalle spec, senza toccare il codice applicativo.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chiaveCapitolo } from '../config/capitoli';
import type { ChiParla } from '../config/frasi';
import { ATTI, elementiSbloccati, luogoDelVestito } from '../config/luoghi';
import { ARCHIVIO_VUOTO, POSTA_MAX, applicaAzzeramento, migra, unisciPosta } from '../stato/archivio';
import type { Archivio, VocePosta } from '../stato/archivio';
import { leggiPayload, motivoCambio, payloadDa, unisciRemoto } from '../stato/sync';
import { giardinoVisibile } from './capitoli';
import { importa, esporta, ricomincia } from './memoria';
import { accessorioPermesso, chiacchieraPermessa, luogoDellaChiacchiera, primaInHome, vestitiIniziali, vestitiRiposo } from './regole';
import { ELEMENTI_SCENA } from './Scena';
import { durataBattuta, useBattute } from './Toasts';
import { PilaIndietro, azioneIndietro } from './indietro';
import { CHIAVE_SUGGERIMENTI, suggerimentoDa } from './suggerimenti';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));
function seme(s: number) {
  let x = s * 2654435761 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
/** molte rotazioni di fila (come la Home) con tutti i giorni possibili */
function rotazioni(visti: string[], sbloccata: boolean, giri = 1500, giorno: 'mare' | 'montagna' | null = null) {
  const caso = seme(visti.length * 7 + (sbloccata ? 1 : 0));
  const out = [vestitiIniziali({ visti, sbloccata, giorno })];
  for (let i = 0; i < giri; i++) out.push(vestitiRiposo({ visti, sbloccata, giorno, prima: out[out.length - 1], caso }));
  return out;
}
const arch = (x: Partial<Archivio> = {}): Archivio => ({ ...migra({}), io: { nome: 'Semino', frase: 'x' }, ...x });
const voce = (ts: number, da: 'a' | 'b', testo = `f${ts}`): VocePosta => ({ ts, da, testo });

describe('T6 vestiti in Home', () => {
  it('telefono con 30 fiori e nessun capitolo letto: Semino nudo, niente Semina', () => {
    expect(vestitiIniziali({ visti: [], sbloccata: false })).toEqual({});
    for (const v of rotazioni([], false, 50)) expect(v).toEqual({});
    expect(giardinoVisibile(30, []).elementi).toEqual([]);
  });

  it('prima del capitolo 5 mai un vestito di Semina, anche con luoghi già visitati', () => {
    for (const n of [0, 3, 6, 16, 40])
      for (const g of [null, 'mare', 'montagna'] as const) for (const v of rotazioni(fino(n), false, 200, g)) expect(v.semina).toBeUndefined();
  });

  it('nessun vestito di un luogo non visitato (per ogni prefisso di capitoli letti)', () => {
    for (let n = 0; n <= 101; n += 1) {
      const visitati = new Set(ATTI.filter((x) => n > x.da).map((x) => x.luogo));
      for (const v of rotazioni(fino(n), n > 5, 80))
        for (const chi of ['semino', 'semina'] as ChiParla[]) {
          const id = v[chi];
          if (!id) continue;
          expect(visitati.has(luogoDelVestito(id)!), `n=${n} ${chi} ${id}`).toBe(true);
        }
    }
  });

  it('montagna/cavallo mai su Semino; surf su Semina solo nel giorno del mare', () => {
    for (const g of [null, 'mare', 'montagna'] as const)
      for (const v of rotazioni(fino(101), true, 3000, g)) {
        expect(['montagna', 'cavallo']).not.toContain(v.semino);
        if (g !== 'mare') expect(v.semina).not.toBe('surf');
      }
    for (const id of ['montagna', 'cavallo']) expect(accessorioPermesso('semino', id, fino(101), { inCoppia: true, giorno: 'montagna' })).toBeUndefined();
  });

  it('Semina: animale solo dal capitolo 10, cavallo dal 30', () => {
    expect(rotazioni(fino(10), true, 2000).some((v) => v.semina === 'animale')).toBe(false);
    expect(rotazioni(fino(11), true, 2000).some((v) => v.semina === 'animale')).toBe(true);
    expect(rotazioni(fino(30), true, 2000).some((v) => v.semina === 'cavallo')).toBe(false);
    expect(rotazioni(fino(31), true, 2000).some((v) => v.semina === 'cavallo')).toBe(true);
  });

  it("dopo l'atto 8 (lontano) la rotazione copre tutti i luoghi, per tutti e due", () => {
    const tutti = ['giardino', 'mare', 'montagna', 'bosco', 'citta', 'cucina', 'lontano'];
    const r = rotazioni(fino(78), true, 3000);
    expect(new Set(r.map((v) => luogoDelVestito(v.semino!)))).toEqual(new Set(tutti));
    expect(new Set(r.map((v) => luogoDelVestito(v.semina!)))).toEqual(new Set(tutti));
  });
});

describe('T6 ricordi del giardino', () => {
  it('giardino = min(fiori, capitolo più alto letto)', () => {
    expect(giardinoVisibile(3, fino(31)).elementi).toEqual(['fiore', 'sentiero']);
    expect(giardinoVisibile(40, fino(27)).elementi).toEqual(elementiSbloccati(26));
    expect(giardinoVisibile(40, fino(27)).elementi).toContain('surf');
    expect(giardinoVisibile(40, fino(37)).elementi).not.toContain('sasso');
    expect(giardinoVisibile(40, fino(38)).elementi).toContain('sasso');
  });

  it('"ricomincia": i capitoli vecchi (sync o file) non tornano e non mostrano più del dovuto', () => {
    const vecchio = arch({ storico: [], capitoliVisti: { a: fino(31), b: fino(31) }, azzerato: 0 });
    const nuovo = ricomincia(vecchio, 1_000_000);
    // il Worker ha ancora i capitoli dell'era di prima
    const r = unisciRemoto(nuovo, payloadDa(vecchio, 5));
    expect(r.archivio.capitoliVisti).toEqual({ a: [], b: [] });
    // e un file esportato prima
    const imp = importa(nuovo, esporta(vecchio))!;
    expect(imp.archivio.capitoliVisti).toEqual({ a: [], b: [] });
    expect(giardinoVisibile(0, imp.archivio.capitoliVisti.a).elementi).toEqual([]);
  });

  it('ogni ricordo ha un elemento nella Scena', () => {
    for (const r of ATTI.flatMap((x) => x.ricordi)) expect(ELEMENTI_SCENA as readonly string[]).toContain(r.elemento);
  });
});

describe('T7.4 posta', () => {
  it('unione per chiave, 50 max, era', () => {
    const a = Array.from({ length: 40 }, (_, i) => voce(1_000_000 + i * 200_000, 'a'));
    const b = Array.from({ length: 40 }, (_, i) => voce(1_000_100 + i * 200_000, 'b'));
    const u = unisciPosta(a, b, 1_000_000 + 10 * 200_000);
    expect(u.length).toBe(POSTA_MAX);
    expect(u.every((v) => v.ts >= 1_000_000 + 10 * 200_000)).toBe(true);
    expect(u[0].ts).toBeGreaterThan(u[1].ts);
  });

  it('campi sconosciuti del payload conservati in lettura e in scrittura', () => {
    const remoto = { ...payloadDa(arch({ posta: [voce(5, 'a')] }), 1), futuro: { x: 1 } };
    expect(leggiPayload(remoto)!.futuro).toEqual({ x: 1 });
    const loc = arch({ posta: [voce(7, 'b')] });
    const p = payloadDa(unisciRemoto(loc, remoto).archivio, 9, remoto);
    expect(p.futuro).toEqual({ x: 1 });
    expect(p.posta!.map((v) => v.ts)).toEqual([7, 5]);
  });

  it('motivoCambio reagisce alla posta', () => {
    const a = arch();
    expect(motivoCambio(a, { ...a, posta: [voce(1, 'a')] })).toBe('cambio');
  });

  it('importa un file senza posta: la posta locale resta', () => {
    const loc = arch({ posta: [voce(20, 'b'), voce(10, 'a')] });
    const file = JSON.stringify({ versione: 2, storico: [], azzerato: 0 });
    expect(importa(loc, file)!.archivio.posta).toEqual(loc.posta);
    // anche un file v1 (prima della posta)
    const v1 = JSON.stringify({ versione: 1, storico: [], azzerato: 0, io: null, partner: '', partita: null, tappeViste: [], impostazioni: {} });
    expect(importa(loc, v1)!.archivio.posta).toEqual(loc.posta);
  });

  it('nessun ciclo di scritture: due dispositivi convergono, posta identica non riscrive (anche dopo JSON)', () => {
    let A = arch({ posta: [voce(1_000, 'a', 'sei mini'), voce(500_000, 'b', 'ciao')] });
    let B = arch({ posta: [voce(30_000, 'a', 'sei mini'), voce(900_000, 'a', 'notte')] });
    let W: unknown = null;
    let scritture = 0;
    for (let giro = 0; giro < 4; giro++)
      for (const chi of ['A', 'B'] as const) {
        const loc = chi === 'A' ? A : B;
        const r = unisciRemoto(loc, W as never);
        if (r.daScrivere) {
          W = JSON.parse(JSON.stringify(payloadDa(r.archivio, giro, W)));
          scritture++;
        }
        if (chi === 'A') A = r.archivio;
        else B = r.archivio;
      }
    expect(A.posta).toEqual(B.posta);
    expect(scritture).toBeLessThanOrEqual(3);
    const fermo = unisciRemoto(A, W as never);
    expect(fermo.daScrivere).toBe(false);
    expect(fermo.archivio).toBe(A);
  });

  it('i campi sconosciuti dentro una voce di posta (client più nuovo) si perdono riscrivendo', () => {
    // documenta il comportamento: chi è più vecchio toglie i campi in più della voce e li riscrive
    const remoto = { ...payloadDa(arch(), 1), posta: [{ ts: 5, da: 'a', testo: 'x', letta: true }] };
    const r = unisciRemoto(arch(), remoto as never);
    const scritto = payloadDa(r.archivio, 2, remoto);
    expect((scritto.posta![0] as unknown as Record<string, unknown>).letta).toBeUndefined();
  });

  it("l'azzeramento filtra la posta (era)", () => {
    const a = arch({ posta: [voce(10, 'a'), voce(3_000_000, 'b')] });
    expect(applicaAzzeramento(a, 2_000_000).posta.map((v) => v.ts)).toEqual([3_000_000]);
  });
});

describe('T7.1 battute in partita (useBattute)', () => {
  let box: HTMLDivElement;
  let root: Root;
  let api: ReturnType<typeof useBattute>;
  const storia: string[] = [];
  function Sonda() {
    api = useBattute();
    const t = api.battuta?.testo ?? '-';
    if (storia[storia.length - 1] !== t) storia.push(t);
    return null;
  }
  beforeEach(() => {
    storia.length = 0;
    vi.useFakeTimers();
    box = document.createElement('div');
    document.body.appendChild(box);
    root = createRoot(box);
    act(() => root.render(<Sonda />));
  });
  afterEach(() => {
    act(() => root.unmount());
    box.remove();
    vi.useRealTimers();
  });

  it('una battuta lunga dura quanto la sua durata (non meno)', () => {
    const t = 'x'.repeat(90);
    act(() => api.dici({ chi: 'semino', testo: t, tono: 'mio' }));
    act(() => vi.advanceTimersByTime(durataBattuta(t) - 50));
    expect(api.battuta?.testo).toBe(t);
    act(() => vi.advanceTimersByTime(100));
    expect(api.battuta).toBeNull();
  });

  it('la frase del partner in attesa non viene scartata da un commento automatico arrivato subito dopo', () => {
    act(() => api.dici({ chi: 'semino', testo: 'riga completata', tono: 'completato' }));
    act(() => vi.advanceTimersByTime(300));
    act(() => api.dici({ chi: 'semina', testo: 'sei mini', tono: 'suo', categoria: 'frase', firma: 'Mati' }));
    act(() => vi.advanceTimersByTime(100));
    act(() => api.dici({ chi: 'semino', testo: 'bella mossa', tono: 'mio' }));
    act(() => vi.advanceTimersByTime(20_000));
    // studio-ux §5.1: le frasi del partner non si scartano mai
    expect(storia).toContain('sei mini');
  });

  it('la frase del partner (≥ 3,2 s) non viene tolta dopo 1,2 s dal primo commento automatico', () => {
    act(() => api.dici({ chi: 'semina', testo: 'sei mini', tono: 'suo', categoria: 'frase', firma: 'Mati' }));
    act(() => vi.advanceTimersByTime(1300));
    act(() => api.dici({ chi: 'semino', testo: 'bella mossa', tono: 'mio' }));
    // la frase del partner è stata a schermo solo 1,3 s (minimo spec: 3,2 s)
    expect(api.battuta?.testo).toBe('sei mini');
  });
  it('la frase del partner a schermo resta il suo tempo pieno; i commenti arrivati intanto si saltano', () => {
    act(() => api.dici({ chi: 'semina', testo: 'sei mini', tono: 'suo', categoria: 'frase', firma: 'Mati' }, 4500));
    act(() => api.dici({ chi: 'semino', testo: 'uno', tono: 'mio' }));
    act(() => vi.advanceTimersByTime(4400));
    expect(api.battuta?.testo).toBe('sei mini');
    act(() => vi.advanceTimersByTime(200));
    expect(api.battuta).toBeNull();
    expect(storia).not.toContain('uno');
  });

  it('due frasi del partner di fila passano tutte e due, ognuna intera', () => {
    act(() => api.dici({ chi: 'semina', testo: 'prima', tono: 'suo', categoria: 'frase' }));
    act(() => api.dici({ chi: 'semina', testo: 'seconda', tono: 'suo', categoria: 'frase' }));
    act(() => vi.advanceTimersByTime(3100));
    expect(api.battuta?.testo).toBe('prima');
    act(() => vi.advanceTimersByTime(200));
    expect(api.battuta?.testo).toBe('seconda');
  });

  it('fumetto fermato: resta finché non si riprende, i commenti si accodano, la frase del partner lo sostituisce', () => {
    act(() => api.dici({ chi: 'semino', testo: 'fermato', tono: 'mio' }));
    act(() => api.ferma());
    act(() => api.dici({ chi: 'semino', testo: 'dopo', tono: 'mio' }));
    act(() => vi.advanceTimersByTime(30_000));
    expect(api.battuta?.testo).toBe('fermato');
    const id = api.battuta!.id;
    act(() => api.riprendi(id));
    expect(api.battuta?.testo).toBe('dopo');
    act(() => api.ferma());
    act(() => api.dici({ chi: 'semina', testo: 'sei mini', tono: 'suo', categoria: 'frase' }));
    expect(api.battuta?.testo).toBe('sei mini');
    act(() => vi.advanceTimersByTime(3300));
    expect(api.battuta).toBeNull();
  });
});

describe('Home: eco, vestito nuovo, chiacchiere dei luoghi', () => {
  it("prima l'eco, poi il vestito nuovo (solo a fumetti chiusi)", () => {
    expect(primaInHome({ eco: true, vestitoNuovo: true, fumettoAperto: false })).toBe('eco');
    expect(primaInHome({ eco: false, vestitoNuovo: true, fumettoAperto: true })).toBeNull();
    expect(primaInHome({ eco: false, vestitoNuovo: true, fumettoAperto: false })).toBe('vestito');
    expect(primaInHome({ eco: false, vestitoNuovo: false, fumettoAperto: false })).toBeNull();
  });

  it('una chiacchiera di un luogo non visitato (anche dal partner) non si mostra', () => {
    const t = 'ho trovato un riccio! Dorme. Non lo sveglio, lo guardo dormire.';
    expect(luogoDellaChiacchiera('semina', t)).toBe('bosco');
    expect(chiacchieraPermessa('semina', t, ['giardino', 'mare'])).toBe(false);
    expect(chiacchieraPermessa('semina', t, ['giardino', 'bosco'])).toBe(true);
    // le chiacchiere di sempre non hanno luogo
    expect(chiacchieraPermessa('semino', 'una frase qualsiasi', [])).toBe(true);
  });
});

describe('T7.11 indietro (macchina pura)', () => {
  it('casi della spec', () => {
    expect(azioneIndietro({ schermata: 'home', aperti: 0, entrato: true })).toBe('resta');
    expect(azioneIndietro({ schermata: 'partita', aperti: 0, entrato: true })).toBe('home');
    expect(azioneIndietro({ schermata: 'giardino', aperti: 0, entrato: true })).toBe('home');
    expect(azioneIndietro({ schermata: 'home', aperti: 1, entrato: true })).toBe('chiudi');
    expect(azioneIndietro({ schermata: 'partita', aperti: 2, entrato: true, bloccato: true })).toBe('resta');
    const p = new PilaIndietro();
    const chiusi: string[] = [];
    p.apri(() => chiusi.push('menu'));
    p.apri(() => chiusi.push('posta'));
    p.chiudiUltimo();
    expect(chiusi).toEqual(['posta']);
    expect(p.aperti).toBe(1);
  });
});

describe('T7.3 suggerimenti', () => {
  it('uno per sessione, non tornano, chiave locale fuori dal sync e dall’esportazione', () => {
    expect(suggerimentoDa('cella-piena', { mosse: 0, fiori: 0 }, [], true)).toBeNull();
    expect(suggerimentoDa('cella-piena', { mosse: 0, fiori: 0 }, ['faro'], false)).toBeNull();
    const a = arch({ [CHIAVE_SUGGERIMENTI]: ['faro'] } as never);
    expect(JSON.stringify(payloadDa(arch(), 1))).not.toContain('suggerimenti');
    expect(Object.keys(payloadDa(a, 1))).not.toContain(CHIAVE_SUGGERIMENTI);
    expect(ARCHIVIO_VUOTO).not.toHaveProperty(CHIAVE_SUGGERIMENTI);
  });
});

describe('T6 ricordi che entrano (Scena)', () => {
  it('nel giorno speciale (Home passa `nuovi` forzati) anche il ricordo appena sbloccato entra con sc-pop', async () => {
    const { Scena } = await import('./Scena');
    localStorage.setItem('sudoku-scena-visti', JSON.stringify(['fiore', 'sentiero', 'mare']));
    const box = document.createElement('div');
    document.body.appendChild(box);
    const root = createRoot(box);
    // come Home.inEvidenza nel giorno del mare: nuovi = ['mare']
    act(() => root.render(<Scena elementi={['fiore', 'sentiero', 'mare', 'sasso']} fiori={40} nuovi={['mare']} />));
    const sasso = box.querySelector('[data-el="sasso"]');
    expect(sasso).not.toBeNull();
    const nuovo = sasso!.getAttribute('data-nuovo');
    act(() => root.unmount());
    box.remove();
    expect(nuovo).toBe('true');
  });
});
