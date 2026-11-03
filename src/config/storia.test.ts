import { describe, expect, it } from 'vitest';
import { FRASI, FRASI_EXTRA, SONNO, STORIA_SEMINO, VOCE, VOCE_SUGGERIMENTO } from './frasi';
import type { ChiParla, FraseConAccessorio } from './frasi';
import { GIORNI_SPECIALI, SBLOCCHI, SORPRESE, STORIA, chiaveDi, elementiSbloccati, giornoSpeciale } from './storia';

const testo = (f: FraseConAccessorio) => (typeof f === 'string' ? f : f.testo);
const accessorio = (f: FraseConAccessorio) => (typeof f === 'string' ? undefined : f.accessorio);
const CHI: ChiParla[] = ['semino', 'semina'];
const ACC_SEMINO = new Set(['occhiali', 'cuoco', 'palla', 'chitarra', 'surf']);
const ACC_SEMINA = new Set(['corona', 'montagna', 'cavallo', 'animale', 'chitarra']);
const PRINCIPALI = [
  'giusta', 'intelligente', 'brillante', 'completato', 'serie', 'sbagliata', 'sbagliataSerie', 'regalo',
  'vittoria', 'solletico', 'chiacchiere', 'arrivo', 'partnerBrillante', 'ripresa', 'invio',
];
/** Semino non ama la montagna: la nomina solo per lamentarsene. */
const montagnaOk = (t: string) => !/montagn/i.test(t) || /fatic|lament/i.test(t);

describe('storia', () => {
  it('tappe ordinate, una per numero di fiori, chiavi uniche, testi ≤ 240', () => {
    const p = STORIA.map((t) => t.partite);
    expect(p).toEqual([...p].sort((x, y) => x - y));
    expect(new Set(p).size).toBe(p.length);
    const chiavi = STORIA.map(chiaveDi);
    expect(new Set(chiavi).size).toBe(chiavi.length);
    for (const t of STORIA) expect(t.testo.length, t.testo).toBeLessThanOrEqual(240);
  });
  it('tappe 0–5 invariate rispetto a quelle già viste', () => {
    for (const vecchia of STORIA_SEMINO.filter((t) => t.partite <= 5)) {
      const t = STORIA.find((x) => x.partite === vecchia.partite);
      expect(t && { chi: t.chi, testo: t.testo }).toEqual({ chi: vecchia.chi, testo: vecchia.testo });
    }
    expect(STORIA.find((t) => t.partite === 6)?.chi).toBe('semino'); // chiave semino-6 come prima
  });
  it('fitta fino a 20, poi fino ad almeno 60, epilogo a 80 e 100', () => {
    const p = STORIA.map((t) => t.partite);
    for (let i = 1; i < p.length && p[i] <= 20; i++) expect(p[i] - p[i - 1]).toBeLessThanOrEqual(2);
    for (let i = 1; i < p.length && p[i] <= 60; i++) expect(p[i] - p[i - 1]).toBeLessThanOrEqual(5);
    expect(p).toContain(60);
    expect(p).toContain(80);
    expect(p).toContain(100);
  });
  it('ogni elemento del giardino ha la sua tappa alla stessa soglia', () => {
    const soglie = [1, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 60];
    const elementi = SBLOCCHI.filter((s) => s.sblocco.tipo === 'elemento');
    expect(elementi.map((s) => s.partite)).toEqual(soglie);
    for (const s of elementi) expect(STORIA.find((t) => t.partite === s.partite)?.sblocca?.id).toBe(s.sblocco.id);
    expect(elementiSbloccati(9)).toEqual(['fiore', 'sentiero', 'semina', 'stagno']);
    const ids = SBLOCCHI.map((s) => `${s.sblocco.tipo}:${s.sblocco.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('i pacchetti di frasi sbloccati esistono in FRASI_EXTRA', () => {
    const pacchetti = new Set(FRASI_EXTRA.map((p) => `${p.chi}-${p.categoria}-${p.partite}`));
    for (const s of SBLOCCHI.filter((x) => x.sblocco.tipo === 'frasi')) expect(pacchetti.has(s.sblocco.id), s.sblocco.id).toBe(true);
    for (const n of [8, 12, 20, 30, 40, 50]) expect(FRASI_EXTRA.some((p) => p.partite === n)).toBe(true);
    expect(SBLOCCHI.find((s) => s.sblocco.tipo === 'accessorio' && s.sblocco.id === 'surf')?.partite).toBe(15);
  });
  it('sorprese alle soglie scelte, 2–3 battute brevi', () => {
    expect(SORPRESE.map((s) => s.partite)).toEqual([7, 10, 15, 20, 25, 30, 40, 50, 60]);
    for (const s of SORPRESE) {
      expect(s.battute.length).toBeGreaterThanOrEqual(2);
      expect(s.battute.length).toBeLessThanOrEqual(3);
      for (const b of s.battute) expect(b.testo.length).toBeLessThanOrEqual(240);
    }
  });
  it('giorni del mare e della montagna deterministici dalla data', () => {
    const giorni = Array.from({ length: 14 }, (_, i) => giornoSpeciale(new Date(2026, 0, 1 + i, 12)));
    expect(giorni.filter((g) => g === 'mare')).toHaveLength(2);
    expect(giorni.filter((g) => g === 'montagna')).toHaveLength(2);
    expect(giornoSpeciale(new Date(2026, 0, 2, 1))).toBe(giornoSpeciale(new Date(2026, 0, 2, 23)));
  });
});

describe('frasi e personaggi', () => {
  it('conteggi minimi', () => {
    for (const chi of CHI) {
      for (const c of PRINCIPALI) expect(VOCE[chi][c]?.length ?? 0, `${chi}.${c}`).toBeGreaterThanOrEqual(c === 'chiacchiere' ? 40 : 25);
      expect(VOCE_SUGGERIMENTO[chi].length).toBeGreaterThanOrEqual(25);
      expect(SONNO[chi].length).toBeGreaterThanOrEqual(12);
    }
    for (const [c, l] of Object.entries(FRASI)) expect(l.length, c).toBeGreaterThanOrEqual(15);
    expect(FRASI_EXTRA.length).toBeGreaterThanOrEqual(6);
  });
  it('nessuna frase ripetuta nella stessa lista', () => {
    const liste: FraseConAccessorio[][] = [
      ...CHI.flatMap((chi) => Object.values(VOCE[chi])),
      ...Object.values(FRASI).map((l) => [...l]),
      ...Object.values(SONNO),
      ...Object.values(VOCE_SUGGERIMENTO),
      ...FRASI_EXTRA.map((p) => p.frasi),
    ];
    for (const l of liste) {
      const t = l.map(testo);
      expect(new Set(t).size, t.join(' | ')).toBe(t.length);
    }
  });
  it('Semino: niente montagna o cavallo in senso positivo, accessori solo suoi', () => {
    const suoi: FraseConAccessorio[] = [
      ...Object.values(VOCE.semino).flat(),
      ...VOCE_SUGGERIMENTO.semino,
      ...SONNO.semino,
      ...FRASI_EXTRA.filter((p) => p.chi === 'semino').flatMap((p) => p.frasi),
      ...GIORNI_SPECIALI.mare.chiacchiere.semino,
      ...GIORNI_SPECIALI.montagna.chiacchiere.semino,
    ];
    for (const f of suoi) {
      expect(montagnaOk(testo(f)), testo(f)).toBe(true);
      const a = accessorio(f);
      if (a) expect(ACC_SEMINO.has(a), `${a}: ${testo(f)}`).toBe(true);
    }
    for (const g of Object.values(GIORNI_SPECIALI)) expect(ACC_SEMINO.has(g.accessori.semino)).toBe(true);
    for (const t of STORIA) {
      if ((t.chi === 'semino' || t.chi === 'entrambi') && t.accessorio) expect(ACC_SEMINO.has(t.accessorio), t.testo).toBe(true);
      if (t.chi === 'semina' && t.accessorio) expect(ACC_SEMINA.has(t.accessorio), t.testo).toBe(true);
      if (t.accessorioSemina) expect(ACC_SEMINA.has(t.accessorioSemina)).toBe(true);
    }
  });
  it('Semina: accessori suoi, il mare solo con Semino', () => {
    const sue: FraseConAccessorio[] = [
      ...Object.entries(VOCE.semina).filter(([c]) => c !== 'invio').flatMap(([, l]) => l),
      ...FRASI_EXTRA.filter((p) => p.chi === 'semina').flatMap((p) => p.frasi),
    ];
    for (const f of sue) {
      const a = accessorio(f);
      if (a) expect(ACC_SEMINA.has(a), `${a}: ${testo(f)}`).toBe(true);
      if (/\bmare\b/i.test(testo(f))) expect(testo(f), 'mare senza Semino').toMatch(/Semino|\blui\b/);
    }
  });
  it('"sei mini" e simili ricorrenti ma non ossessivi (≤ 15%)', () => {
    const tutte = [
      ...CHI.flatMap((chi) => Object.values(VOCE[chi]).flat()),
      ...Object.values(FRASI).flat(),
      ...Object.values(SONNO).flat(),
      ...Object.values(VOCE_SUGGERIMENTO).flat(),
      ...FRASI_EXTRA.flatMap((p) => p.frasi),
    ].map(testo);
    const mini = tutte.filter((t) => /\b(sei mini|se\(i\)mini|sei mignon|mignon|smol|mini)\b/i.test(t));
    expect(mini.length).toBeGreaterThan(5);
    expect(mini.length / tutte.length).toBeLessThanOrEqual(0.15);
  });
});
