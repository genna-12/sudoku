// Colore della barra di stato (T7): segue il tema che si vede davvero (forzato o del sistema) e, col
// lettore dei capitoli aperto, la notte del capitolo. Lo stesso calcolo, in piccolo, sta nello script
// iniziale di index.html (T6), che lo applica prima del primo disegno.
import { useEffect, useState } from 'react';
import type { Tema } from './Menu';

/** Il cielo in alto della pagina nei due temi (tema.css: --notte-verde). */
export const COLORE_BARRA = { scuro: '#0a1613', chiaro: '#eef0e4' } as const;

/** Il tema che si vede: quello forzato, o quello del sistema con "auto". */
export function temaVisto(tema: Tema, sistemaChiaro: boolean): 'scuro' | 'chiaro' {
  if (tema === 'scuro' || tema === 'chiaro') return tema;
  return sistemaChiaro ? 'chiaro' : 'scuro';
}

/** Colore della barra: quello del tema visto; col capitolo aperto (sempre di notte) quello scuro. */
export function coloreBarra(tema: Tema, sistemaChiaro: boolean, notte = false): string {
  return COLORE_BARRA[notte ? 'scuro' : temaVisto(tema, sistemaChiaro)];
}

const CHIARO = '(prefers-color-scheme: light)';

function sistemaChiaroOra(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(CHIARO).matches;
  } catch {
    return false;
  }
}

/** Tiene il `<meta name="theme-color">` allineato a tema, sistema e capitolo aperto. */
export function useColoreBarra(tema: Tema, notte: boolean) {
  const [sistemaChiaro, setSistemaChiaro] = useState(sistemaChiaroOra);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(CHIARO) : undefined;
    if (!mq) return;
    const cambia = () => setSistemaChiaro(mq.matches);
    mq.addEventListener?.('change', cambia);
    return () => mq.removeEventListener?.('change', cambia);
  }, []);
  const colore = coloreBarra(tema, sistemaChiaro, notte);
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = colore;
  }, [colore]);
}
