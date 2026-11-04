import { describe, expect, it } from 'vitest';
import { importa, ricomincia } from '../ui/memoria';
import { POSTA_MAX, POSTA_STESSA_MS, applicaAzzeramento, conPosta, migra, unisciPosta } from './archivio';
import type { Archivio, VocePosta } from './archivio';
import { leggiPayload, motivoCambio, payloadDa, unisciRemoto } from './sync';

const v = (ts: number, da: 'a' | 'b', testo = `frase ${ts}`): VocePosta => ({ ts, da, testo });
const archivio = (p: Partial<Archivio> = {}): Archivio => ({ ...migra({ versione: 2 }), ...p });

describe('posta: unione, limite, era (T7.4)', () => {
  it('unione per chiave `${ts}-${da}`, le più recenti prima, senza doppioni', () => {
    const a = [v(300, 'a'), v(100, 'b')];
    const b = [v(200, 'b'), v(100, 'b'), v(300, 'b')];
    expect(unisciPosta(a, b).map((x) => `${x.ts}-${x.da}`)).toEqual(['300-b', '300-a', '200-b', '100-b']);
  });
  it('commutativa', () => {
    const a = [v(5000, 'a', 'ciao'), v(1, 'b')];
    const b = [v(5000, 'a', 'altro'), v(7, 'a')];
    expect(unisciPosta(a, b)).toEqual(unisciPosta(b, a));
  });
  it('restituisce lo stesso array se non cambia niente', () => {
    const a = [v(300, 'a'), v(100, 'b')];
    expect(unisciPosta(a, [v(100, 'b')])).toBe(a);
    expect(unisciPosta(a, undefined)).toBe(a);
  });
  it('tiene le 50 più recenti', () => {
    const tante = Array.from({ length: 80 }, (_, i) => v(1000 + i * 1000, i % 2 ? 'a' : 'b'));
    const u = unisciPosta([], tante);
    expect(u).toHaveLength(POSTA_MAX);
    expect(u[0].ts).toBe(80_000);
    expect(u[POSTA_MAX - 1].ts).toBe(31_000);
  });
  it("scarta le frasi prima dell'azzeramento (come lo storico)", () => {
    expect(unisciPosta([], [v(10, 'a'), v(20, 'b'), v(30, 'a')], 20).map((x) => x.ts)).toEqual([30, 20]);
  });
  it('la stessa frase registrata da mittente e destinatario (orologi diversi) è una sola', () => {
    const mandata = v(1_000_000, 'b', 'sei mini');
    const ricevuta = v(1_000_000 + 450, 'b', 'sei mini');
    expect(unisciPosta([mandata], [ricevuta])).toEqual([mandata]);
    expect(unisciPosta([ricevuta], [mandata])).toEqual([mandata]);
    // ripetuta dopo un po': sono due
    expect(unisciPosta([mandata], [v(1_000_000 + POSTA_STESSA_MS, 'b', 'sei mini')])).toHaveLength(2);
  });
  it('voci non valide si scartano, testi lunghi si accorciano', () => {
    const u = unisciPosta([], [{ ts: 'x' }, { ts: 5, da: 'c', testo: 'no' }, { ts: 6, da: 'a', testo: '' }, null, v(7, 'a', 'x'.repeat(500))]);
    expect(u).toHaveLength(1);
    expect(u[0].testo).toHaveLength(200);
  });
  it("migra: posta assente = [], valida l'esistente", () => {
    expect(migra({ versione: 2 }).posta).toEqual([]);
    expect(migra({ versione: 2, posta: [v(5, 'a'), 'x'] }).posta).toEqual([v(5, 'a')]);
    expect(migra(undefined).posta).toEqual([]);
  });
  it('conPosta aggiunge e rispetta l’azzeramento', () => {
    const a = archivio({ azzerato: 100 });
    expect(conPosta(a, v(50, 'a')).posta).toEqual([]);
    expect(conPosta(a, v(150, 'a')).posta).toEqual([v(150, 'a')]);
  });
  it("l'azzeramento (anche ricomincia) svuota la posta di prima", () => {
    const a = archivio({ posta: [v(300, 'a'), v(100, 'b')] });
    expect(applicaAzzeramento(a, 200).posta).toEqual([v(300, 'a')]);
    expect(ricomincia(a, 500).posta).toEqual([]);
  });
});

describe('posta nel sync e in importa', () => {
  it('unisciRemoto unisce la posta e chiede di scrivere se il Worker non ce l’ha', () => {
    const locale = archivio({ posta: [v(300, 'a')] });
    const remoto = payloadDa(archivio({ posta: [v(200, 'b')] }), 1);
    const r = unisciRemoto(locale, remoto);
    expect(r.archivio.posta.map((x) => x.ts)).toEqual([300, 200]);
    expect(r.cambiatoLocale).toBe(true);
    expect(r.daScrivere).toBe(true);
    // di nuovo con quello che si è scritto: niente da fare
    const r2 = unisciRemoto(r.archivio, payloadDa(r.archivio, 2));
    expect(r2.cambiatoLocale).toBe(false);
    expect(r2.daScrivere).toBe(false);
  });
  it("la posta remota di un'era vecchia non torna", () => {
    const locale = archivio({ azzerato: 250, posta: [v(300, 'a')] });
    const remoto = payloadDa(archivio({ posta: [v(200, 'b'), v(400, 'b')] }), 1);
    expect(unisciRemoto(locale, remoto).archivio.posta.map((x) => x.ts)).toEqual([400, 300]);
  });
  it('payload: posta vuota assente (i client vecchi non vedono differenze), letta e validata', () => {
    expect('posta' in payloadDa(archivio(), 1)).toBe(false);
    expect(leggiPayload({ ...payloadDa(archivio(), 1), posta: [v(9, 'a'), { x: 1 }] })!.posta).toEqual([v(9, 'a')]);
  });
  it('motivoCambio: una frase nuova è un cambio da scrivere', () => {
    const a = archivio();
    expect(motivoCambio(a, conPosta(a, v(5, 'a')))).toBe('cambio');
  });
  it('importa unisce la posta del file', () => {
    const a = archivio({ posta: [v(300, 'a')] });
    const file = JSON.stringify({ ...archivio({ posta: [v(100, 'b')] }) });
    expect(importa(a, file)!.archivio.posta.map((x) => x.ts)).toEqual([300, 100]);
  });
});

describe('dettaglio dei fiori (T7.5)', () => {
  it('punti di ciascuno e chi ha messo l’ultima cella, solo per le partite finite', async () => {
    const { nuovaPartita, applica, voceStorico } = await import('./index');
    const { conDettaglioFiore } = await import('./archivio');
    const soluzione = Array.from({ length: 81 }, (_, i) => ((i % 9) + Math.floor(i / 9) * 3 + Math.floor(i / 27)) % 9 + 1);
    let p = nuovaPartita({ modalita: 'sudoku', livello: 'medio', seed: 3, soluzione, dati: soluzione.map((x, i) => (i < 79 ? x : 0)) }, 1000);
    p = applica(p, { tipo: 'cella', idx: 80, v: soluzione[80], note: [], da: 'a', ts: 2000 });
    p = applica(p, { tipo: 'cella', idx: 79, v: soluzione[79], note: [], da: 'b', ts: 3000 });
    const a = archivio();
    expect(conDettaglioFiore(a, p)).toBe(a);
    p = { ...applica(p, { tipo: 'finita', ts: 4000 }), contatori: { a: { punti: 7, errori: 0, serie: 0, regali: 0, regaliDisponibili: 0, ts: 1 }, b: { punti: 9, errori: 0, serie: 0, regali: 0, regaliDisponibili: 0, ts: 1 } } };
    const conVoce = { ...a, storico: [voceStorico(p)], dettagliFiori: { vecchio: { a: 1, b: 1, ultima: null } } };
    const d = conDettaglioFiore(conVoce, p);
    expect(d.dettagliFiori).toEqual({ 'sudoku-3': { a: 7, b: 9, ultima: 'b' } });
    expect(conDettaglioFiore(d, p)).toBe(d);
    expect(migra({ versione: 2, dettagliFiori: { x: { a: 1, b: 2, ultima: 'c' }, y: 'no' } }).dettagliFiori).toEqual({ x: { a: 1, b: 2, ultima: null } });
  });
});
