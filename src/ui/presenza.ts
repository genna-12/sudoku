// Il testo della presenza nel pallino della Home (pura: la usano Home e i test).
import type { StatoConnessione } from '../net';
import { testoConnessione } from './util';

/**
 * Il testo del pallino in testata: breve, al massimo due righe anche a 360 px (H4, revisione UI 06/11);
 * la frase intera resta per il lettore di schermo e nel title.
 */
export function testoPallino(
  connessione: StatoConnessione,
  partner: string,
  occupata = false,
  femminile = false,
): { breve: string; intero: string } {
  const collegato = femminile ? 'collegata' : 'collegato';
  if (occupata) return { breve: `già ${collegato} altrove`, intero: `sei già ${collegato} da un altro dispositivo` };
  const intero = testoConnessione(connessione, partner);
  return { breve: connessione === 'errore' ? 'non mi collego, riprovo' : intero, intero };
}
