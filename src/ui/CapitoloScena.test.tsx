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

  const chiIn = (sel: string) => [...box.querySelectorAll(sel)].map((e) => (e as HTMLElement).dataset.chi);

  it('nel capitolo 99 ci sono tutti dalla prima battuta: in fila a terra, Fischio e il Gufo sul ramo', () => {
    monta({
      capitolo: cap(99, [
        { chi: 'narra', testo: 'Ci sono tutti.' },
        { chi: 'nonnacapra', testo: 'Piove.' },
        { chi: 'grillo', testo: 'Un la?' },
        { chi: 'gufo', testo: 'Buono.' },
      ]),
    });
    expect(chiIn('.capitolo-secondari--terra > .capitolo-secondario')).toEqual(['nonnacapra', 'nuvola', 'grillo', 'pinza']);
    expect(chiIn('.capitolo-secondari--ramo > .capitolo-secondario')).toEqual(['fischio', 'gufo']);
    // Briciola dorme in groppa a Nuvola
    expect(chiIn('[data-chi="nuvola"] .capitolo-groppa')).toEqual(['briciola']);
    expect(scena().classList.contains('capitolo--ramo')).toBe(true);
    avanti();
    // la coda del fumetto va sull'x di Nonna Capra (prima della fila a terra: 1,5 posti a sinistra del centro)
    const posto = q('.capitolo-fumetto-posto') as HTMLElement;
    expect(posto.classList.contains('capitolo-fumetto-posto--alto')).toBe(false);
    expect(posto.style.getPropertyValue('--cap-coda-dx')).toBe('-75px');
    avanti();
    avanti();
    const gufo = q('.capitolo-fumetto-posto') as HTMLElement;
    expect(gufo.classList.contains('capitolo-fumetto-posto--alto')).toBe(true);
    expect(gufo.style.getPropertyValue('--cap-coda-dx')).toBe('23px');
  });

  it('chi entra senza parlare è in scena dalla prima battuta (Briciola nel 68), senza fumetto', () => {
    monta({
      capitolo: cap(
        68,
        [
          { chi: 'narra', testo: 'Un gatto entra dalla finestra.' },
          { chi: 'semina', testo: 'Si chiama Briciola.' },
          { chi: 'semino', testo: 'Dove va?' },
        ],
        { luogo: 'cucina', entra: 'briciola' },
      ),
    });
    expect(chiIn('.capitolo-secondario')).toEqual(['briciola']);
    expect(q('.capitolo-secondario[data-chi="briciola"] .sec-entra')).not.toBeNull();
    expect(q('.capitolo-fumetto--secondario')).toBeNull();
    avanti();
    avanti();
    expect(chiIn('.capitolo-secondario')).toEqual(['briciola']);
    expect(q('.capitolo-nome')).toBeNull();
  });

  it('chi entra e poi parla non rifà l\'entrata quando parla; chi parla dopo prende il suo posto', () => {
    monta({
      capitolo: cap(
        10,
        [
          { chi: 'narra', testo: 'Un merlo sul ramo.' },
          { chi: 'fischio', testo: 'Fischio va bene.' },
          { chi: 'pinza', testo: 'Clac.' },
        ],
        { luogo: 'giardino', entra: 'fischio' },
      ),
    });
    expect(chiIn('.capitolo-secondari--ramo > .capitolo-secondario')).toEqual(['fischio']);
    expect(scena().classList.contains('capitolo--ramo')).toBe(true);
    avanti();
    expect(q('.capitolo-secondario[data-chi="fischio"] .sec-entra')).toBeNull();
    expect(q('.capitolo-fumetto-posto--alto')).not.toBeNull();
    avanti();
    expect(chiIn('.capitolo-secondario')).toEqual(['pinza']);
    expect(scena().classList.contains('capitolo--ramo')).toBe(false);
  });

  it('il Mulo non entra in scena (è una lettera) anche se un capitolo lo facesse entrare', () => {
    monta({ capitolo: cap(84, [{ chi: 'narra', testo: 'Treno.' }], { entra: 'mulo' }) });
    expect(q('.capitolo-secondario')).toBeNull();
  });

  it('da solo (capitoli 0-4) Semino va verso il centro; con Semina o un secondario no', () => {
    monta({ capitolo: cap(2, [{ chi: 'semino', testo: 'Notte.' }], { luogo: 'aiuola' }) });
    expect(scena().classList.contains('capitolo--solo')).toBe(true);
    monta({ capitolo: SEMPLICE });
    expect(scena().classList.contains('capitolo--solo')).toBe(false);
    monta({ capitolo: cap(83, [{ chi: 'nonnacapra', testo: 'Mastica.' }, { chi: 'semino', testo: 'Ciao.' }]) });
    expect(scena().classList.contains('capitolo--solo')).toBe(false);
  });

  it('fra due capitoli della coda: prima battuta, fondale e palco nuovi in dissolvenza', () => {
    monta({ capitolo: SEMPLICE, indice: 1, totale: 2 });
    expect(scena().classList.contains('capitolo--cambio')).toBe(false);
    const fondale = q('.capitolo-fondale');
    avanti();
    expect(battuta()).toBe(1);
    monta({ capitolo: cap(13, [{ chi: 'semino', testo: 'Nuovo.' }], { luogo: 'giardino' }), indice: 2, totale: 2 });
    expect(battuta()).toBe(0);
    expect(scena().classList.contains('capitolo--cambio')).toBe(true);
    expect(q('.capitolo-fondale')).not.toBe(fondale);
    expect(scena().dataset.fondale).toBe('giardino');
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

  it('Esc chiude solo la rilettura', () => {
    const esc = () => act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    const nuovo = monta({ capitolo: SEMPLICE });
    esc();
    expect(nuovo).not.toHaveBeenCalled();
    const riletto = monta({ capitolo: cap(7, [{ chi: 'semino', testo: 'Una.' }, { chi: 'semino', testo: 'Due.' }]), rilettura: true });
    esc();
    expect(riletto).toHaveBeenCalledTimes(1);
  });

  it('il vestito si mette solo se è disegnato', () => {
    const c = cap(17, [{ chi: 'semino', testo: 'Surf.' }], { vestiti: { semino: 'surf' } });
    monta({ capitolo: c });
    expect(box.innerHTML).not.toContain('con la tavola da surf');
    monta({ capitolo: c, accessoriDisegnati: (id) => id === 'surf' });
    expect(box.innerHTML).toContain('con la tavola da surf');
  });

  it('"Dopo" a fine capitolo: accanto a "Continua" in `.capitolo-azioni`, figlio diretto del piede (posto assoluto di S14)', () => {
    const onDopo = vi.fn();
    const onContinua = monta({ capitolo: SEMPLICE, onDopo });
    expect(q('[data-testid="capitolo-dopo"]')).toBeNull();
    for (let i = 0; i < SEMPLICE.battute.length; i++) avanti();
    passa(ATTESA_CONTINUA_MS);
    const figli = [...(q('.capitolo-piede') as HTMLElement).children].map((e) => e.className);
    expect(figli).toEqual(['capitolo-punti', 'capitolo-azioni']);
    expect(q('.capitolo-azioni [data-testid="capitolo-dopo"]')).not.toBeNull();
    expect(q('.capitolo-azioni [data-testid="capitolo-continua"]')).not.toBeNull();
    act(() => (q('[data-testid="capitolo-dopo"]') as HTMLButtonElement).click());
    expect(onDopo).toHaveBeenCalledTimes(1);
    expect(onContinua).not.toHaveBeenCalled();
    // senza onDopo: "Continua" da solo, come prima
    monta({ capitolo: cap(13, SEMPLICE.battute) });
    for (let i = 0; i < SEMPLICE.battute.length; i++) avanti();
    passa(ATTESA_CONTINUA_MS);
    expect(q('.capitolo-azioni')).toBeNull();
    expect(q('.capitolo-piede > [data-testid="capitolo-continua"]')).not.toBeNull();
  });

  it('esce: aggiunge la classe dell\'uscita', () => {
    monta({ capitolo: SEMPLICE, esce: true });
    expect(scena().classList.contains('capitolo--esce')).toBe(true);
  });
});
