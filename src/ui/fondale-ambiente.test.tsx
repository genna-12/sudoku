// @vitest-environment jsdom
// T9 C: momento e meteo del Fondale. Senza i due il disegno è quello di prima (lo garantisce anche
// segreto-matilde.test.tsx per i capitoli 0-8).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { METEO, MOMENTI_AMBIENTE } from '../config/ambienti';
import { Fondale } from './Fondale';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
});

const fd = () => box.querySelector<HTMLElement>('.fd')!;
const senzaId = (s: string) => s.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g, 'ID');

describe('Fondale con momento e meteo', () => {
  it('senza momento né meteo: nessun attributo nuovo e lo stesso disegno di notte', () => {
    act(() => root.render(<Fondale luogo="mare" />));
    const prima = senzaId(box.innerHTML);
    expect(fd().hasAttribute('data-momento')).toBe(false);
    expect(fd().hasAttribute('data-meteo')).toBe(false);
    act(() => root.render(<Fondale luogo="mare" momento={undefined} meteo={undefined} />));
    expect(senzaId(box.innerHTML)).toBe(prima);
    act(() => root.render(<Fondale luogo="mare" momento="notte" />));
    // la notte del momento è la notte di sempre, più l'attributo
    expect(fd().dataset.notte).toBe('1');
    expect(box.querySelector('.fd-stelle')).not.toBeNull();
  });

  it.each(MOMENTI_AMBIENTE.map((m) => [m]))('momento %s: stelle e luna solo di notte', (m) => {
    act(() => root.render(<Fondale luogo="montagna" momento={m} />));
    expect(fd().dataset.momento).toBe(m);
    expect(fd().dataset.notte).toBe(m === 'notte' ? '1' : '0');
    expect(box.querySelector('.fd-stelle') !== null).toBe(m === 'notte');
    expect(box.querySelector('.fd-luna') !== null).toBe(m === 'notte');
  });

  it('il momento vince su notte', () => {
    act(() => root.render(<Fondale luogo="citta" notte momento="giorno" />));
    expect(fd().dataset.notte).toBe('0');
  });

  it.each(METEO.map((m) => [m]))('meteo %s: uno strato (niente col sereno)', (m) => {
    act(() => root.render(<Fondale luogo="bosco" momento="sera" meteo={m} />));
    expect(fd().dataset.meteo).toBe(m);
    const strato = box.querySelector('.fd-meteo');
    if (m === 'sereno') expect(strato).toBeNull();
    else expect(strato?.classList.contains(`fd-meteo-${m}`)).toBe(true);
  });

  it('temporale: pioggia fitta e un lampo; pioggia: righe senza lampo', () => {
    act(() => root.render(<Fondale luogo="mare" momento="notte" meteo="temporale" />));
    expect(box.querySelector('.fd-pioggia-fitta')).not.toBeNull();
    expect(box.querySelector('.fd-lampo')).not.toBeNull();
    act(() => root.render(<Fondale luogo="mare" momento="notte" meteo="pioggia" />));
    expect(box.querySelectorAll('.fd-pioggia path').length).toBeGreaterThan(20);
    expect(box.querySelector('.fd-lampo')).toBeNull();
  });

  it('interni senza meteo; nel treno il meteo sta nel finestrino', () => {
    act(() => root.render(<Fondale luogo="cucina" momento="giorno" meteo="pioggia" />));
    expect(box.querySelector('.fd-meteo')).toBeNull();
    expect(fd().hasAttribute('data-meteo')).toBe(false);
    expect(fd().dataset.momento).toBe('giorno');
    act(() => root.render(<Fondale luogo="lontano" fondale="treno" momento="giorno" meteo="neve" />));
    expect(box.querySelector('g[clip-path] .fd-meteo-neve')).not.toBeNull();
    expect(box.querySelectorAll('.fd-meteo').length).toBe(1);
  });

  it('stesso disegno a ogni render (niente casuale)', () => {
    act(() => root.render(<Fondale luogo="mare" momento="notte" meteo="neve" />));
    const a = senzaId(box.innerHTML);
    act(() => root.unmount());
    root = createRoot(box);
    act(() => root.render(<Fondale luogo="mare" momento="notte" meteo="neve" />));
    expect(senzaId(box.innerHTML)).toBe(a);
  });
});
