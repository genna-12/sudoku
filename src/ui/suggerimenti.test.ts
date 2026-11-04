import { describe, expect, it } from 'vitest';
import { MOSSE_PER_NOTE, suggerimentiVisti, suggerimentoDa } from './suggerimenti';

const c = (mosse = 0, fiori = 0) => ({ mosse, fiori });

describe('suggerimenti una tantum (T7.3)', () => {
  it('note: al primo tocco sul tastierino dopo 10 mosse', () => {
    expect(suggerimentoDa('tastierino', c(MOSSE_PER_NOTE - 1), [], false)).toBeNull();
    expect(suggerimentoDa('tastierino', c(MOSSE_PER_NOTE), [], false)).toBe('note');
  });
  it('semino: in Home solo dopo il primo fiore', () => {
    expect(suggerimentoDa('home', c(0, 0), [], false)).toBeNull();
    expect(suggerimentoDa('home', c(0, 1), [], false)).toBe('semino');
  });
  it('faro: alla prima cella con un numero', () => {
    expect(suggerimentoDa('cella-piena', c(), [], false)).toBe('faro');
  });
  it('una volta per dispositivo', () => {
    expect(suggerimentoDa('cella-piena', c(), ['faro'], false)).toBeNull();
    expect(suggerimentoDa('home', c(0, 3), ['semino', 'faro'], false)).toBeNull();
    expect(suggerimentoDa('tastierino', c(20), ['semino'], false)).toBe('note');
  });
  it('al massimo uno per sessione', () => {
    expect(suggerimentoDa('cella-piena', c(), [], true)).toBeNull();
    expect(suggerimentoDa('tastierino', c(30), [], true)).toBeNull();
  });
  it('la lista salvata tiene solo i nomi noti', () => {
    expect(suggerimentiVisti(['note', 'x', 3, 'faro'])).toEqual(['note', 'faro']);
    expect(suggerimentiVisti('note')).toEqual([]);
    expect(suggerimentiVisti(null)).toEqual([]);
  });
});
