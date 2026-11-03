import { useCallback, useEffect, useState } from 'react';
import type { Messaggio, StatoConnessione } from '../net';
import type { StatoPartita } from '../stato';
import { useStanza } from './useStanza';
import type { Io } from './useStanza';

/** Da quale stanza arriva un messaggio: quella di coppia o quella dei miei dispositivi. */
export type Origine = 'coppia' | 'personale';
export type Destinazione = Origine | 'entrambe';

/** Se la stanza di coppia resta "mi collego" così a lungo mentre un mio dispositivo è collegato,
 *  i due posti della stanza sono presi (dal partner e dal mio altro dispositivo). */
const SOSPETTO_OCCUPATA_MS = 8000;

export function chiavePersonale(io: Io): string {
  return `${io.frase}#${io.nome.trim().toLowerCase().replace(/\s+/g, '')}`;
}

/**
 * Le due stanze: di coppia (frase) e personale (frase#nome: solo i miei dispositivi).
 * Stessi messaggi in entrambe; chi gestisce sa da dove arrivano e non li rimbalza nell'altra.
 */
export function useRete(
  io: Io | null,
  gestori: { statoCorrente: () => StatoPartita | null; messaggio: (m: Messaggio, da: Origine) => void },
) {
  const coppia = useStanza(io?.frase ?? null, io?.nome ?? null, {
    statoCorrente: gestori.statoCorrente,
    messaggio: (m) => gestori.messaggio(m, 'coppia'),
  });
  const personale = useStanza(io ? chiavePersonale(io) : null, io?.nome ?? null, {
    statoCorrente: gestori.statoCorrente,
    messaggio: (m) => gestori.messaggio(m, 'personale'),
  });
  const personaleConnesso = personale.connessione === 'connesso';

  const [sospetto, setSospetto] = useState(false);
  const inStallo = coppia.connessione === 'connessione' && personaleConnesso;
  useEffect(() => {
    if (!inStallo) return;
    const t = window.setTimeout(() => setSospetto(true), SOSPETTO_OCCUPATA_MS);
    return () => {
      window.clearTimeout(t);
      setSospetto(false);
    };
  }, [inStallo]);
  const occupata = (inStallo && sospetto) || /occupat/i.test(coppia.dettaglio ?? '');

  const inviaCoppia = coppia.invia;
  const inviaPersonale = personale.invia;
  const invia = useCallback(
    (m: Messaggio, dove: Destinazione = 'entrambe') => {
      if (dove !== 'personale') inviaCoppia(m);
      if (dove !== 'coppia') inviaPersonale(m);
    },
    [inviaCoppia, inviaPersonale],
  );

  const connessione: StatoConnessione = coppia.connessione;
  return { connessione, personaleConnesso, occupata, invia };
}
