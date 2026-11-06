// I vestiti delle schermate dove i personaggi sono grandi (T7.10): gli ultimi a riposo in Home, salvati
// per giocatore in localStorage, passati da `vestitiSchermata` (regole.ts) che li ricontrolla.
import type { GiornoSpeciale } from '../config/storia';
import type { Giocatore } from '../stato';
import { vestitiSchermata } from './regole';
import { accessorioValido } from './useMascotte';
import type { Indossati } from './useMascotte';
import { leggi } from './util';

/** gli ultimi vestiti a riposo in Home, per giocatore (`-a`/`-b`): li ritrovano Ingresso, Vittoria e Giardino */
export const CHIAVE_ULTIMI_VESTITI = 'sudoku-vestiti-ultimi';

/**
 * I vestiti dove i personaggi sono grandi (Ingresso, Vittoria, Giardino): gli ultimi a riposo in Home se
 * nel frattempo non si è letto un capitolo, altrimenti quelli d'entrata (`vestitiSchermata`).
 */
export function vestitiGrandi(ruolo: Giocatore, o: { visti: readonly string[]; sbloccata: boolean; giorno: GiornoSpeciale | null }): Indossati {
  const v = vestitiSchermata({ ...o, ultimi: leggi<unknown>(`${CHIAVE_ULTIMI_VESTITI}-${ruolo}`) });
  const out: Indossati = { semino: accessorioValido(v.semino) };
  if (o.sbloccata) out.semina = accessorioValido(v.semina);
  return out;
}
