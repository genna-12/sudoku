import { useCallback, useEffect, useRef, useState } from 'react';
import { apriStanza } from '../net';
import type { Messaggio, Stanza, StatoConnessione } from '../net';
import type { Giocatore, StatoPartita } from '../stato';

export interface Io {
  nome: string;
  frase: string;
}

interface Gestori {
  statoCorrente: () => StatoPartita | null;
  messaggio: (m: Messaggio) => void;
  partner: (nome: string) => void;
}

/** Apre la stanza P2P quando nome e frase sono noti; espone stato connessione, ruolo e invio. */
export function useStanza(io: Io | null, gestori: Gestori) {
  const [connessione, setConnessione] = useState<StatoConnessione>('connessione');
  const [ruolo, setRuolo] = useState<Giocatore | null>(null);
  const stanzaRef = useRef<Stanza | null>(null);
  const gestoriRef = useRef(gestori);
  useEffect(() => {
    gestoriRef.current = gestori;
  });

  const frase = io?.frase;
  const nome = io?.nome;

  useEffect(() => {
    if (!frase || !nome) return;
    let stanza: Stanza | null = null;
    let spegni: (() => void)[] = [];
    let intervallo = 0;
    // Apertura rimandata di un giro: in StrictMode il primo mount viene smontato subito,
    // così non si registra (e libera) un ID PeerJS a vuoto.
    const avvio = window.setTimeout(() => {
      const s = apriStanza(frase, nome, () => gestoriRef.current.statoCorrente());
      stanza = s;
      stanzaRef.current = s;
      setConnessione(s.stato);
      setRuolo(s.ruolo);
      spegni = [
        s.on('stato', (st) => {
          setConnessione(st);
          setRuolo(s.ruolo);
        }),
        s.on('messaggio', (m) => {
          setRuolo(s.ruolo);
          gestoriRef.current.messaggio(m);
        }),
        s.on('partner', (n) => gestoriRef.current.partner(n)),
      ];
      // il ruolo può cambiare (b che ridiventa a): lo rileggo ogni tanto
      intervallo = window.setInterval(() => setRuolo(s.ruolo), 2000);
    }, 0);
    return () => {
      window.clearTimeout(avvio);
      window.clearInterval(intervallo);
      spegni.forEach((f) => f());
      stanza?.chiudi();
      stanzaRef.current = null;
      setConnessione('connessione');
    };
  }, [frase, nome]);

  const invia = useCallback((m: Messaggio) => {
    try {
      stanzaRef.current?.invia(m);
    } catch {
      /* stanza non pronta: la riconciliazione al prossimo `ciao` rimette tutto in pari */
    }
  }, []);

  return { connessione, ruolo, invia };
}
