// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BattutaCapitolo, Capitolo } from '../config/capitoli';
import { ATTESA_CONTINUA_MS, CapitoloScena, GUARDIA_MS, type CapitoloScenaProps } from './CapitoloScena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function cap(fiore: number, battute: BattutaCapitolo[], extra: Partial<Capitolo> = {}): Capitolo {
  return { fiore, luogo: 'mare', titolo: 'Prova', vestiti: {}, eco: { chi: 'semino', testo: 'eco' }, battute, ...extra };
}

const SEMPLICE = cap(12, [
  { chi: 'narra', testo: 'Nota uno.' },
  { chi: 'semino', umore: 'felice', testo: 'Battuta due.' },
  { chi: 'semina', umore: 'euforico', testo: 'Battuta tre.' },
  { chi: 'semino', testo: 'Battuta quattro.' },
]);

let box: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  vi.useRealTimers();
});

function monta(p: Partial<CapitoloScenaProps> & { capitolo: Capitolo }) {
  const onContinua = p.onContinua ?? vi.fn();
  act(() => root.render(<CapitoloScena stadio={3} {...p} onContinua={onContinua} />));
  return onContinua;
}
const q = (sel: string) => box.querySelector(sel);
const scena = () => q('[data-testid="capitolo-scena"]') as HTMLElement;
const battuta = () => Number(scena().dataset.battuta);
const passa = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const tocca = () => act(() => (q('.capitolo-avanti') as HTMLButtonElement).click());
/** aspetta la guardia e tocca */
const avanti = () => {
  passa(GUARDIA_MS);
  tocca();
};
const testo = () => box.textContent ?? '';

describe('CapitoloScena', () => {
  it('parte dalla prima battuta', () => {
    monta({ capitolo: SEMPLICE });
    expect(battuta()).toBe(0);
    expect(scena().dataset.fiore).toBe('12');
    expect(q('.capitolo-nota')?.textContent).toContain('Nota uno.');
    expect(testo()).not.toContain('Battuta due.');
    expect(testo()).toContain('Capitolo 12');
    expect(testo()).toContain('Prova');
  });

  it('avanza al tocco, con il fumetto di chi parla', () => {
    monta({ capitolo: SEMPLICE });
    avanti();
    expect(battuta()).toBe(1);
    expect(q('.capitolo-fumetto--semino')?.textContent).toContain('Battuta due.');
    expect(q('.capitolo-nota')).toBeNull();
    expect(q('[aria-live="polite"]')?.textContent).toContain('Semino: Battuta due.');
  });

  it('ignora i tocchi entro 300 ms da ogni cambio (anche all\'apertura)', () => {
    monta({ capitolo: SEMPLICE });
    tocca();
    expect(battuta()).toBe(0);
    avanti();
    expect(battuta()).toBe(1);
    tocca();
    tocca();
    expect(battuta()).toBe(1);
    passa(GUARDIA_MS - 1);
    tocca();
    expect(battuta()).toBe(1);
    passa(1);
    tocca();
    expect(battuta()).toBe(2);
  });

  it('indietro con "‹" (disabilitato alla prima) e con la tastiera', () => {
    monta({ capitolo: SEMPLICE });
    const indietro = q('.capitolo-indietro') as HTMLButtonElement;
    expect(indietro.disabled).toBe(true);
    avanti();
    avanti();
    expect(battuta()).toBe(2);
    act(() => indietro.click());
    expect(battuta()).toBe(1);
    expect(indietro.disabled).toBe(false);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' })));
    expect(battuta()).toBe(0);
    passa(GUARDIA_MS);
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(battuta()).toBe(1);
  });

  it('all\'ultima il tocco non fa niente; "Continua" dopo 400 ms chiama onContinua', () => {
    const onContinua = monta({ capitolo: SEMPLICE });
    avanti();
    avanti();
    avanti();
    expect(battuta()).toBe(3);
    expect(q('[data-testid="capitolo-continua"]')).toBeNull();
    passa(ATTESA_CONTINUA_MS - 1);
    expect(q('[data-testid="capitolo-continua"]')).toBeNull();
    passa(1);
    const bottone = q('[data-testid="capitolo-continua"]') as HTMLButtonElement;
    expect(bottone.textContent).toBe('Continua');
    expect(document.activeElement).toBe(bottone);
    avanti();
    expect(battuta()).toBe(3);
    expect(onContinua).not.toHaveBeenCalled();
    act(() => bottone.click());
    expect(onContinua).toHaveBeenCalledTimes(1);
  });

  it('Semina non è nel DOM per un capitolo con fiore < 5', () => {
    monta({ capitolo: cap(3, [{ chi: 'semino', testo: 'Uno.' }, { chi: 'semina', testo: 'Due.' }], { vestiti: { semina: 'corona' } }) });
    avanti();
    expect(q('[data-chi="semina"]')).toBeNull();
    expect(q('[data-chi="semino"]')).not.toBeNull();
    expect(box.innerHTML).not.toMatch(/Semina,/);
  });

  it('nel capitolo 5 Semina appare solo alla sua prima battuta; restano i testid della scena di Semina', () => {
    const c5 = cap(
      5,
      [
        { chi: 'semino', testo: 'Cinque fiori.' },
        { chi: 'narra', testo: 'Fruscio.' },
        { chi: 'semina', umore: 'euforico', testo: 'CIAO.' },
        { chi: 'narra', testo: 'Il verde è Semino. La blu è Semina.' },
        { chi: 'semina', testo: 'Giochiamo!' },
      ],
      { luogo: 'aiuola' },
    );
    monta({ capitolo: c5 });
    expect(q('[data-testid="scena-sblocco"]')).not.toBeNull();
    expect(q('[data-chi="semina"]')).toBeNull();
    avanti();
    expect(q('[data-chi="semina"]')).toBeNull();
    avanti();
    expect(q('[data-chi="semina"]')).not.toBeNull();
    expect(scena().classList.contains('capitolo--colori')).toBe(false);
    avanti();
    expect(scena().classList.contains('capitolo--colori')).toBe(true);
    avanti();
    passa(ATTESA_CONTINUA_MS);
    expect(q('[data-testid="scena-andiamo"] [data-testid="capitolo-continua"]')?.textContent).toBe('Andiamo');
  });

  it('Semina non c\'è nei capitoli in cui non parla e non ha vestiti', () => {
    monta({ capitolo: cap(84, [{ chi: 'semino', testo: 'Solo io.' }]) });
    expect(q('[data-chi="semina"]')).toBeNull();
  });

  it('un solo secondario in scena: l\'ultimo che ha parlato', () => {
    monta({
      capitolo: cap(53, [
        { chi: 'semino', testo: 'Uno.' },
        { chi: 'gufo', testo: 'Buono.' },
        { chi: 'fischio', testo: 'Eccomi.' },
        { chi: 'semina', testo: 'Ciao.' },
      ]),
    });
    expect(box.querySelectorAll('.capitolo-secondario')).toHaveLength(0);
    avanti();
    expect([...box.querySelectorAll('.capitolo-secondario')].map((e) => (e as HTMLElement).dataset.chi)).toEqual(['gufo']);
    expect(q('.capitolo-nome')?.textContent).toBe('Gufo');
    expect(q('.capitolo-fumetto--secondario')?.textContent).toContain('Buono.');
    avanti();
    expect([...box.querySelectorAll('.capitolo-secondario')].map((e) => (e as HTMLElement).dataset.chi)).toEqual(['fischio']);
    avanti();
    expect([...box.querySelectorAll('.capitolo-secondario')].map((e) => (e as HTMLElement).dataset.chi)).toEqual(['fischio']);
  });

  it('nel capitolo 99 restano tutti quelli che hanno parlato', () => {
    monta({
      capitolo: cap(99, [
        { chi: 'nonnacapra', testo: 'Piove.' },
        { chi: 'grillo', testo: 'Un la?' },
        { chi: 'fischio', testo: 'Un si.' },
      ]),
    });
    avanti();
    avanti();
    expect([...box.querySelectorAll('.capitolo-secondario')].map((e) => (e as HTMLElement).dataset.chi)).toEqual(['nonnacapra', 'grillo', 'fischio']);
  });

  it('le righe del Mulo si accumulano sullo stesso foglio', () => {
    monta({
      capitolo: cap(84, [
        { chi: 'narra', testo: 'Una busta.' },
        { chi: 'mulo', testo: 'Riga uno.' },
        { chi: 'mulo', testo: 'Riga due.' },
        { chi: 'mulo', testo: 'Riga tre.' },
        { chi: 'semino', testo: 'Fatto.' },
      ]),
    });
    avanti();
    expect(box.querySelectorAll('.capitolo-lettera-riga')).toHaveLength(1);
    avanti();
    avanti();
    expect([...box.querySelectorAll('.capitolo-lettera-riga')].map((e) => e.textContent)).toEqual(['Riga uno.', 'Riga due.', 'Riga tre.']);
    expect(box.querySelectorAll('.capitolo-lettera')).toHaveLength(1);
    avanti();
    expect(q('.capitolo-lettera')).toBeNull();
  });

  it('con totale mostra "2 di 3"; senza arretrati no', () => {
    monta({ capitolo: SEMPLICE, indice: 2, totale: 3 });
    expect(q('.capitolo-conta')?.textContent).toBe('2 di 3');
    monta({ capitolo: SEMPLICE, indice: 1, totale: 1 });
    expect(q('.capitolo-conta')).toBeNull();
  });

  it('rilettura: "Dal diario" e "Chiudi"', () => {
    const onContinua = monta({ capitolo: cap(7, [{ chi: 'semino', testo: 'Una.' }]), rilettura: true });
    expect(q('.capitolo-etichetta')?.textContent).toContain('Dal diario');
    passa(ATTESA_CONTINUA_MS);
    const bottone = q('[data-testid="capitolo-continua"]') as HTMLButtonElement;
    expect(bottone.textContent).toBe('Chiudi');
    act(() => bottone.click());
    expect(onContinua).toHaveBeenCalledTimes(1);
  });

  it('il vestito si mette solo se è disegnato', () => {
    const c = cap(17, [{ chi: 'semino', testo: 'Surf.' }], { vestiti: { semino: 'surf' } });
    monta({ capitolo: c });
    expect(box.innerHTML).not.toContain('con la tavola da surf');
    monta({ capitolo: c, accessoriDisegnati: (id) => id === 'surf' });
    expect(box.innerHTML).toContain('con la tavola da surf');
  });

  it('esce: aggiunge la classe dell\'uscita', () => {
    monta({ capitolo: SEMPLICE, esce: true });
    expect(scena().classList.contains('capitolo--esce')).toBe(true);
  });
});
