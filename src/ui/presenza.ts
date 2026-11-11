// Il testo della presenza nel pallino della Home (pura: la usano Home e i test).
import type { StatoConnessione } from '../net';
import { testoConnessione } from './util';

/**
 * Il testo del pallino in testata: breve, al massimo due righe anche a 360 px (H4, revisione UI 06/11);
 * la frase intera resta per il lettore di schermo e nel title.
 * "già collegato altrove" solo con la prova (`occupata`, vedi useRete); `ricollego`: "mi ricollego…".
 */
export function testoPallino(
  connessione: StatoConnessione,
  partner: string,
  occupata = false,
  femminile = false,
  ricollego = false,
): { breve: string; intero: string } {
  const collegato = femminile ? 'collegata' : 'collegato';
  if (occupata) return { breve: `già ${collegato} altrove`, intero: `sei già ${collegato} da un altro dispositivo` };
  // dopo una perdita, o mentre il mio posto si libera: la connessione si sta ricostruendo da sola
  if (ricollego && connessione === 'in-attesa') return { breve: 'mi ricollego…', intero: 'mi ricollego…' };
  const intero = testoConnessione(connessione, partner);
  return { breve: connessione === 'errore' ? 'non mi collego, riprovo' : intero, intero };
}
