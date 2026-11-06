import { describe, expect, it } from 'vitest';
import { COLORE_BARRA, coloreBarra, temaVisto } from './barra';
import { CHIAVI } from './util';
import html from '../../index.html?raw';

describe('barra di stato e tema iniziale (T6, T7)', () => {
  it('il tema forzato vince sul sistema; "auto" segue il sistema', () => {
    expect(temaVisto('chiaro', false)).toBe('chiaro');
    expect(temaVisto('scuro', true)).toBe('scuro');
    expect(temaVisto('auto', true)).toBe('chiaro');
    expect(temaVisto('auto', false)).toBe('scuro');
  });
  it('col capitolo aperto la barra è di notte', () => {
    expect(coloreBarra('chiaro', true)).toBe(COLORE_BARRA.chiaro);
    expect(coloreBarra('chiaro', true, true)).toBe(COLORE_BARRA.scuro);
    expect(coloreBarra('auto', false)).toBe(COLORE_BARRA.scuro);
  });
  it('lo script iniziale di index.html usa la stessa chiave e gli stessi colori', () => {
    expect(html).toContain(`'${CHIAVI.tema}'`);
    expect(html).toContain(COLORE_BARRA.scuro);
    expect(html).toContain(COLORE_BARRA.chiaro);
    // prima di qualsiasi foglio di stile o modulo
    expect(html.indexOf(CHIAVI.tema)).toBeLessThan(html.indexOf('type="module"'));
  });
});
