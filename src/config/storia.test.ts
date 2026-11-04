import { describe, expect, it } from 'vitest';
import { FRASI, FRASI_EXTRA, SONNO, VOCE, VOCE_SUGGERIMENTO } from './frasi';
import type { ChiParla, FraseConAccessorio } from './frasi';
import { GIORNI_SPECIALI, QUOTA_ECO_CHIACCHIERE, SBLOCCHI, giornoSpeciale } from './storia';

const testo = (f: FraseConAccessorio) => (typeof f === 'string' ? f : f.testo);
const accessorio = (f: FraseConAccessorio) => (typeof f === 'string' ? undefined : f.accessorio);
const CHI: ChiParla[] = ['semino', 'semina'];
const ACC_SEMINO = new Set(['occhiali', 'cuoco', 'palla', 'chitarra', 'surf', 'zaino-storto', 'lanterna', 'cuffie']);
const ACC_SEMINA = new Set(['corona', 'montagna', 'cavallo', 'animale', 'chitarra', 'paglia', 'lucciola', 'giacca', 'grembiule', 'camice']);
const PRINCIPALI = [
  'giusta', 'intelligente', 'brillante', 'completato', 'serie', 'sbagliata', 'sbagliataSerie', 'regalo',
  'vittoria', 'solletico', 'chiacchiere', 'arrivo', 'partnerBrillante', 'ripresa', 'invio',
];
/** Semino non ama la montagna: la nomina solo per lamentarsene. */
const montagnaOk = (t: string) => !/montagn/i.test(t) || /fatic|lament/i.test(t);

// La storia sono i capitoli (config/capitoli.test.ts), ricordi e vestiti i luoghi (config/luoghi.test.ts);
// qui restano pacchetti di frasi e giorni speciali.
describe('sblocchi (solo pacchetti di frasi)', () => {
  it('id unici, solo frasi', () => {
    expect(SBLOCCHI.every((s) => s.sblocco.tipo === 'frasi')).toBe(true);
    const ids = SBLOCCHI.map((s) => `${s.sblocco.tipo}:${s.sblocco.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('soglie in ordine, niente più regali negli sblocchi (vanno coi capitoli)', () => {
    const p = SBLOCCHI.map((s) => s.partite);
    expect(p).toEqual([...p].sort((x, y) => x - y));
    expect(SBLOCCHI.map((s) => s.sblocco.tipo as string)).not.toContain('regalo');
  });
  it('i pacchetti di frasi sbloccati esistono in FRASI_EXTRA', () => {
    const pacchetti = new Set(FRASI_EXTRA.map((p) => `${p.chi}-${p.categoria}-${p.partite}`));
    for (const s of SBLOCCHI.filter((x) => x.sblocco.tipo === 'frasi')) expect(pacchetti.has(s.sblocco.id), s.sblocco.id).toBe(true);
    for (const n of [8, 12, 20, 30, 40, 50]) expect(FRASI_EXTRA.some((p) => p.partite === n)).toBe(true);
  });
  it('le eco entrano nelle chiacchiere con peso basso (circa 1 su 4)', () => {
    expect(QUOTA_ECO_CHIACCHIERE).toBeGreaterThan(0);
    expect(QUOTA_ECO_CHIACCHIERE).toBeLessThanOrEqual(0.3);
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
