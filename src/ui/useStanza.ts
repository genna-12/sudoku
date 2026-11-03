import { useCallback, useEffect, useRef, useState } from 'react';
import { apriStanza } from '../net';
import type { Messaggio, Stanza, StatoConnessione } from '../net';
import type { StatoPartita } from '../stato';

export interface Io {
  nome: string;
  frase: string;
}

export interface GestoriStanza {
  statoCorrente: () => StatoPartita | null;
  messaggio: (m: Messaggio) => void;
}

/** Apre una stanza P2P per `chiave` (la frase, o frase#nome per la stanza personale). */
export function useStanza(chiave: string | null, nome: string | null, gestori: GestoriStanza) {
  const [connessione, setConnessione] = useState<StatoConnessione>('connessione');
  const [dettaglio, setDettaglio] = useState<string | undefined>();
  const stanzaRef = useRef<Stanza | null>(null);
  const gestoriRef = useRef(gestori);
  useEffect(() => {
    gestoriRef.current = gestori;
  });

  useEffect(() => {
    if (!chiave || !nome) return;
    let stanza: Stanza | null = null;
    let spegni: (() => void)[] = [];
    // Apertura rimandata di un giro: in StrictMode il primo mount viene smontato subito,
    // così non si registra (e libera) un ID PeerJS a vuoto.
    const avvio = window.setTimeout(() => {
      const s = apriStanza(chiave, nome, () => gestoriRef.current.statoCorrente());
      stanza = s;
      stanzaRef.current = s;
      setConnessione(s.stato);
      spegni = [
        s.on('stato', (st, d) => {
          setConnessione(st);
          setDettaglio(d);
        }),
        s.on('messaggio', (m) => gestoriRef.current.messaggio(m)),
      ];
    }, 0);
    return () => {
      window.clearTimeout(avvio);
      spegni.forEach((f) => f());
      stanza?.chiudi();
      stanzaRef.current = null;
      setConnessione('connessione');
      setDettaglio(undefined);
    };
  }, [chiave, nome]);

  const invia = useCallback((m: Messaggio) => {
    try {
      stanzaRef.current?.invia(m);
    } catch {
      /* stanza non pronta: la riconciliazione al prossimo `ciao` rimette tutto in pari */
    }
  }, []);

  return { connessione, dettaglio, invia };
}
