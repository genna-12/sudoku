// La scena conosce l'ora (studio-ux §5 punto 9): il momento del giorno dall'ora locale, fasce in
// config/sonno.ts. Cambia solo il cielo della Scena (variabili --sc-*), mai il tema dell'app; il lettore
// dei capitoli resta sempre di notte (T5) e non lo riceve.
import { useEffect, useState } from 'react';
import { momentoDa, msAlProssimoMomento } from '../config/sonno';
import type { Momento } from '../config/sonno';
import type { Tema } from './Menu';

/** Il timer si riarma almeno ogni tanto: i telefoni in sospensione ritardano i timeout lunghi. */
const RIARMO_MAX_MS = 30 * 60 * 1000;

/**
 * Il momento che vale per la scena: quello dell'ora se il tema segue il sistema; con il tema forzato
 * (chiaro o scuro) vince la scelta dell'utente e la scena resta com'è nel tema (nessun momento).
 */
export function momentoScena(tema: Tema, ora: Momento): Momento | undefined {
  return tema === 'auto' ? ora : undefined;
}

/** Il momento dell'ora locale, aggiornato al cambio di fascia (un timeout fino al bordo) e al ritorno in primo piano. */
export function useMomento(tema: Tema): Momento | undefined {
  const [ora, setOra] = useState<Momento>(() => momentoDa());
  useEffect(() => {
    let t = 0;
    const aggiorna = () => {
      window.clearTimeout(t);
      const adesso = new Date();
      setOra(momentoDa(adesso));
      t = window.setTimeout(aggiorna, Math.min(RIARMO_MAX_MS, msAlProssimoMomento(adesso) + 500));
    };
    const visibile = () => {
      if (document.visibilityState === 'visible') aggiorna();
    };
    aggiorna();
    document.addEventListener('visibilitychange', visibile);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', visibile);
    };
  }, []);
  return momentoScena(tema, ora);
}
