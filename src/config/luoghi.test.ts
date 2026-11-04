import { describe, expect, it } from 'vitest';
import { CAPITOLI, ULTIMO_CAPITOLO, chiaveCapitolo } from './capitoli';
import { CHIACCHIERE_LUOGO } from './frasi';
import type { ChiParla, FraseConAccessorio } from './frasi';
import { ATTI, VESTITI_DAL_CAPITOLO, attoDi, elementiSbloccati, luoghiVisitati, vestitiDisponibili, vestitoArrivato } from './luoghi';
import { ACCESSORI, ACCESSORI_DI } from '../ui/Semino';
import { ELEMENTI_SCENA } from '../ui/Scena';
import { accessorioPermesso } from '../ui/regole';

const CHI: ChiParla[] = ['semino', 'semina'];
/** capitolo-0..n-1 */
const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));
/** come i capitoli (capitoli.md) chiamano i ricordi che nella scena hanno un id più corto */
const ALIAS: Record<string, string> = { 'primo fiore': 'fiore', tavola: 'surf', 'sasso di quota': 'sasso' };
const idElemento = (e: string) => ALIAS[e] ?? e;
const testo = (f: FraseConAccessorio) => (typeof f === 'string' ? f : f.testo);

describe('ATTI', () => {
  it('consecutivi da 0 a 100', () => {
    expect(ATTI[0].da).toBe(0);
    expect(ATTI[ATTI.length - 1].a).toBe(ULTIMO_CAPITOLO);
    for (let i = 1; i < ATTI.length; i++) expect(ATTI[i].da).toBe(ATTI[i - 1].a + 1);
    for (const c of CAPITOLI) expect(attoDi(c.fiore), `capitolo ${c.fiore}`).toBeDefined();
  });

  it('ogni vestito appartiene a un luogo e a un personaggio ammesso; tutti i vestiti disegnati hanno un luogo', () => {
    for (const atto of ATTI)
      for (const chi of CHI)
        for (const id of atto.vestiti[chi]) {
          const ammesso = (ACCESSORI_DI[chi] as string[]).includes(id) || (chi === 'semina' && id === 'surf');
          expect(ammesso, `${atto.luogo}: ${chi} ${id}`).toBe(true);
        }
    for (const id of ACCESSORI) expect(vestitoArrivato(id, fino(ULTIMO_CAPITOLO + 1)), id).toBe(true);
    // Semino mai montagna/cavallo
    for (const atto of ATTI) expect(atto.vestiti.semino.filter((v) => v === 'montagna' || v === 'cavallo')).toEqual([]);
  });

  it('il surf di Semina solo in coppia (nel giorno del mare)', () => {
    const tutti = fino(ULTIMO_CAPITOLO + 1);
    expect(accessorioPermesso('semina', 'surf', tutti)).toBeUndefined();
    expect(accessorioPermesso('semina', 'surf', tutti, { inCoppia: true })).toBeUndefined();
    expect(accessorioPermesso('semina', 'surf', tutti, { inCoppia: true, giorno: 'mare' })).toBe('surf');
    for (const c of CAPITOLI) expect(c.vestiti.semina, `capitolo ${c.fiore}`).not.toBe('surf');
  });

  it('ricordi: id della scena, unici, dentro il loro atto, in ordine', () => {
    const ricordi = ATTI.flatMap((x) => x.ricordi.map((r) => ({ ...r, atto: x })));
    const ids = ricordi.map((r) => r.elemento);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...ELEMENTI_SCENA].sort());
    for (const r of ricordi) expect(r.fiore >= r.atto.da && r.fiore <= r.atto.a, r.elemento).toBe(true);
    const fiori = ricordi.map((r) => r.fiore);
    expect(fiori).toEqual([...fiori].sort((a, b) => a - b));
  });
});

describe('ricordi e capitoli (capitoli.json)', () => {
  it('ogni @elemento ha il suo ricordo allo stesso fiore', () => {
    const ricordi = new Map(ATTI.flatMap((x) => x.ricordi).map((r) => [r.elemento, r.fiore]));
    for (const c of CAPITOLI.filter((x) => x.elemento)) expect(ricordi.get(idElemento(c.elemento!)), `capitolo ${c.fiore}: ${c.elemento}`).toBe(c.fiore);
  });

  // il 65 si intitola "La locandina" ma in capitoli.md ha `@elemento:` vuoto: da aggiungere lì (non si tocca da qui)
  const SENZA_ELEMENTO_NEL_TESTO: Record<string, number> = { locandina: 65 };
  it('e viceversa (tranne il tulipano di Semina: il suo capitolo è il suo arrivo)', () => {
    for (const r of ATTI.flatMap((x) => x.ricordi)) {
      if (r.elemento === 'semina') {
        expect(r.fiore).toBe(5);
        continue;
      }
      if (SENZA_ELEMENTO_NEL_TESTO[r.elemento] === r.fiore && !CAPITOLI[r.fiore].elemento) {
        expect(CAPITOLI[r.fiore].titolo.toLowerCase()).toContain(r.elemento);
        continue;
      }
      const c = CAPITOLI[r.fiore];
      expect(c.elemento && idElemento(c.elemento), `ricordo ${r.elemento}@${r.fiore}`).toBe(r.elemento);
    }
  });
});

describe('vestiti dei capitoli', () => {
  it('sono quelli del luogo dell\'atto (il ritorno: tutti; oltre la montagna anche la cucina)', () => {
    const cucina = ATTI.find((x) => x.luogo === 'cucina')!;
    for (const c of CAPITOLI) {
      const atto = attoDi(c.fiore)!;
      for (const chi of CHI) {
        const id = c.vestiti[chi];
        if (!id) continue;
        const ammessi = new Set([...atto.vestiti[chi], ...(atto.luogo === 'lontano' ? cucina.vestiti[chi] : [])]);
        expect(ammessi.has(id), `capitolo ${c.fiore}: ${chi} ${id} (${atto.luogo})`).toBe(true);
        const dal = VESTITI_DAL_CAPITOLO[id];
        if (dal !== undefined) expect(c.fiore, `capitolo ${c.fiore}: ${id} prima del ${dal}`).toBeGreaterThanOrEqual(dal);
      }
    }
  });
});

describe('luoghi visitati, vestiti disponibili, elementi', () => {
  it('un luogo arriva col primo capitolo del suo atto', () => {
    expect(luoghiVisitati([])).toEqual([]);
    expect(luoghiVisitati(fino(15))).toEqual(['aiuola', 'giardino']);
    expect(luoghiVisitati(fino(16))).toEqual(['aiuola', 'giardino', 'mare']);
    expect(luoghiVisitati(fino(101))).toEqual(['aiuola', 'giardino', 'mare', 'montagna', 'bosco', 'citta', 'cucina', 'lontano']);
  });

  it('vestiti disponibili per personaggio', () => {
    expect(vestitiDisponibili('semino', fino(6))).toEqual([]);
    expect(vestitiDisponibili('semino', fino(7))).toEqual(['occhiali']);
    expect(vestitiDisponibili('semina', fino(10))).toEqual(['corona']);
    expect(vestitiDisponibili('semina', fino(11))).toEqual(['corona', 'animale']);
    expect(vestitiDisponibili('semino', fino(16))).toEqual(['occhiali', 'surf', 'palla']);
    expect(vestitiDisponibili('semino', fino(29))).toContain('zaino-storto');
    expect(vestitiDisponibili('semina', fino(30))).not.toContain('cavallo');
    expect(vestitiDisponibili('semina', fino(31))).toContain('cavallo');
  });

  it('elementi col capitolo più alto letto', () => {
    expect(elementiSbloccati(-1)).toEqual([]);
    expect(elementiSbloccati(0)).toEqual([]);
    expect(elementiSbloccati(9)).toEqual(['fiore', 'sentiero', 'semina', 'stagno']);
    expect(elementiSbloccati(25)).not.toContain('surf');
    expect(elementiSbloccati(26)).toContain('surf');
    expect(elementiSbloccati(36)).not.toContain('sasso');
    expect(elementiSbloccati(37)).toContain('sasso');
    expect(elementiSbloccati(100)).toHaveLength(ELEMENTI_SCENA.length);
  });
});

describe('chiacchiere dei luoghi', () => {
  const PAROLE_TEMA = /\b(insieme|divers[oiea]|distanz|fiducia|amor[ei]|amare|manc[ao]|mancare|paura|capir|imparar|speciale|magic|meraviglios|prezios|cuore|anima|per sempre)/i;
  it('4-6 per personaggio, vestiti del luogo, niente parole-tema, i fatti dei personaggi', () => {
    for (const [luogo, perChi] of Object.entries(CHIACCHIERE_LUOGO)) {
      const atto = ATTI.find((x) => x.luogo === luogo)!;
      for (const chi of CHI) {
        const l = perChi[chi];
        expect(l.length, `${luogo} ${chi}`).toBeGreaterThanOrEqual(4);
        expect(l.length, `${luogo} ${chi}`).toBeLessThanOrEqual(6);
        for (const f of l) {
          const t = testo(f);
          if (typeof f !== 'string') expect(atto.vestiti[chi], `${luogo}: ${t}`).toContain(f.accessorio);
          expect(PAROLE_TEMA.test(t), t).toBe(false);
          if (chi === 'semino') expect(/montagn/i.test(t), t).toBe(false);
          if (chi === 'semina' && /\bmare\b/i.test(t)) expect(t).toMatch(/Semino|\blui\b/);
        }
      }
    }
  });
});
