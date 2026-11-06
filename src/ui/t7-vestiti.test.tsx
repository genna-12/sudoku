// @vitest-environment jsdom
// T7 punto 10: i vestiti nelle schermate dove i personaggi sono grandi (Ingresso, Vittoria, Giardino),
// prima e dopo il capitolo 5.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chiaveCapitolo } from '../config/capitoli';
import type { ChiParla } from '../config/frasi';
import { seminaSbloccata } from './capitoli';
import { vestitiGrandi } from './Home';
import { Ingresso } from './Ingresso';
import { vestitiIniziali, vestitiSchermata } from './regole';
import { ACCESSORI_DI } from './Semino';
import { Vittoria } from './Vittoria';
import { umoreBase } from './useMascotte';
import type { Mascotte } from './useMascotte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));

let root: Root | null = null;
let box: HTMLDivElement;
beforeEach(() => {
  box = document.createElement('div');
  document.body.appendChild(box);
  localStorage.clear();
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  box.remove();
});
function monta(el: React.ReactNode) {
  act(() => {
    root = createRoot(box);
    root.render(el);
  });
}

const SOLO_SEMINA = ACCESSORI_DI.semina as readonly string[];
const opz = (n: number) => ({ visti: fino(n), sbloccata: seminaSbloccata(n, fino(n)), giorno: null });

describe('vestitiSchermata (Ingresso, Vittoria, Giardino)', () => {
  it('prima del capitolo 5 visto: nessun vestito e nessuna Semina, anche con salvati falsi', () => {
    for (const n of [0, 1, 3, 5]) {
      const o = opz(n);
      expect(o.sbloccata).toBe(false);
      const falsi = [
        { semino: 'occhiali', semina: 'corona', letti: n },
        { semino: 'corona', semina: 'paglia', letti: n },
        { semina: 'animale', letti: n },
      ];
      for (const ultimi of falsi) expect(vestitiSchermata({ ...o, ultimi })).toEqual({});
    }
    // anche con luoghi visitati, se Semina non c'è (sbloccata falsa) niente di suo
    for (const n of [16, 40]) {
      const v = vestitiSchermata({ visti: fino(n), sbloccata: false, giorno: null, ultimi: { semino: 'surf', semina: 'paglia', letti: n } });
      expect(v.semina).toBeUndefined();
      expect(v.semino).toBe('surf');
    }
  });

  it('dopo il capitolo 5: gli ultimi della Home, se nel frattempo non si è letto un capitolo', () => {
    const o = opz(17);
    expect(o.sbloccata).toBe(true);
    expect(vestitiSchermata({ ...o, ultimi: { semino: 'palla', semina: 'paglia', letti: 17 } })).toEqual({ semino: 'palla', semina: 'paglia' });
    expect(vestitiSchermata({ ...o, ultimi: { semino: 'occhiali', semina: 'corona', letti: 17 } })).toEqual({ semino: 'occhiali', semina: 'corona' });
    // nudo in Home → nudo anche qui
    expect(vestitiSchermata({ ...o, ultimi: { semina: 'corona', letti: 17 } })).toEqual({ semina: 'corona' });
  });

  it('un capitolo letto dopo l’ultima Home, o niente salvato: i vestiti d’entrata (dell’ultimo capitolo)', () => {
    for (const n of [6, 17, 31, 60, 101]) {
      const o = opz(n);
      const iniziali = vestitiIniziali(o);
      expect(vestitiSchermata({ ...o, ultimi: { semino: 'occhiali', semina: 'corona', letti: n - 1 } })).toEqual(iniziali);
      for (const ultimi of [undefined, null, 'x', 3, { letti: 'n' }, {}]) expect(vestitiSchermata({ ...o, ultimi })).toEqual(iniziali);
    }
  });

  it('mai un vestito di un luogo non visitato né di quello dell’altro: Semino non indossa i vestiti di Semina', () => {
    for (let n = 0; n <= 101; n++) {
      const o = opz(n);
      const iniziali = vestitiIniziali(o);
      for (const s of SOLO_SEMINA) {
        const v = vestitiSchermata({ ...o, ultimi: { semino: s, semina: 'occhiali', letti: n } });
        expect(v.semino).toBe(iniziali.semino);
        expect(SOLO_SEMINA).not.toContain(v.semino);
        if (o.sbloccata) expect(v.semina).toBe(iniziali.semina);
        else expect(v.semina).toBeUndefined();
      }
    }
    // la chitarra è della città (55): al mare non c'è ancora
    expect(vestitiSchermata({ ...opz(17), ultimi: { semino: 'chitarra', letti: 17 } }).semino).toBe(vestitiIniziali(opz(17)).semino);
    // Semino non va a cavallo neanche dopo la montagna
    expect(vestitiSchermata({ ...opz(40), ultimi: { semino: 'cavallo', letti: 40 } }).semino).not.toBe('cavallo');
  });

  it('nel giorno del mare Semina può portare la tavola (solo in coppia)', () => {
    const o = { ...opz(17), giorno: 'mare' as const };
    expect(vestitiSchermata({ ...o, ultimi: { semino: 'surf', semina: 'surf', letti: 17 } })).toEqual({ semino: 'surf', semina: 'surf' });
    expect(vestitiSchermata({ ...opz(17), ultimi: { semino: 'surf', semina: 'surf', letti: 17 } }).semina).toBe(vestitiIniziali(opz(17)).semina);
  });

  it('vestitiGrandi legge quelli salvati dalla Home per quel giocatore', () => {
    localStorage.setItem('sudoku-vestiti-ultimi-a', JSON.stringify({ semino: 'palla', semina: 'paglia', letti: 17 }));
    expect(vestitiGrandi('a', opz(17))).toEqual({ semino: 'palla', semina: 'paglia' });
    expect(vestitiGrandi('b', opz(17))).toEqual(vestitiIniziali(opz(17)));
    localStorage.setItem('sudoku-vestiti-ultimi-a', JSON.stringify({ semino: 'occhiali', semina: 'corona', letti: 5 }));
    expect(vestitiGrandi('a', opz(5))).toEqual({ semino: undefined });
  });
});

const mascotte: Mascotte = {
  semino: { umore: umoreBase('semino'), impulso: 0 },
  semina: { umore: umoreBase('semina'), impulso: 0 },
} as Mascotte;
const vittoria = (sbloccata: boolean, vestiti: Partial<Record<ChiParla, string>>) => (
  <Vittoria
    secondi={90}
    frase="brava"
    sbloccata={sbloccata}
    mascotte={mascotte}
    solletico={null}
    onSolletico={() => {}}
    puntiMiei={10}
    puntiSuoi={10}
    bonus={5}
    fiori={sbloccata ? 17 : 4}
    elementi={[]}
    bluPresenza={0}
    vestiti={vestiti as never}
    onNuova={() => {}}
    onChiudi={() => {}}
  />
);

describe('i vestiti si vedono in Ingresso e Vittoria', () => {
  it('Ingresso dopo il capitolo 5: ognuno nella sua card col suo vestito', () => {
    monta(<Ingresso iniziale={{ nome: 'Semino', frase: 'prova' }} sbloccata vestiti={{ semino: 'surf', semina: 'paglia' }} onEntra={() => {}} />);
    const card = (id: string) => box.querySelector(`[data-testid="scegli-${id}"]`)!.innerHTML;
    expect(card('semino')).toContain('con la tavola da surf');
    expect(card('semina')).toContain('col cappello di paglia');
    expect(card('semino')).not.toContain('paglia');
  });

  it('Ingresso prima del capitolo 5: solo colori, nessun personaggio né vestito', () => {
    monta(<Ingresso iniziale={null} sbloccata={false} vestiti={{ semino: 'surf', semina: 'paglia' }} onEntra={() => {}} />);
    expect(box.innerHTML).not.toMatch(/Semina|Semino|surf|paglia/);
  });

  it('Vittoria in coppia: i due coi loro vestiti', () => {
    monta(vittoria(true, { semino: 'palla', semina: 'paglia' }));
    const html = box.querySelector('.vittoria-mascotte')!.innerHTML;
    expect(html).toContain('con la palla da pallanuoto');
    expect(html).toContain('col cappello di paglia');
  });

  it('Vittoria prima del capitolo 5: Semino solo, e Semina non c’è nemmeno se arriva un suo vestito', () => {
    monta(vittoria(false, { semino: 'occhiali', semina: 'corona' }));
    const html = box.querySelector('.vittoria-mascotte')!.innerHTML;
    expect(html).toContain('con gli occhiali');
    expect(html).not.toMatch(/Semina|corona/);
  });
});
