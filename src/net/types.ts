// Contratto della stanza P2P. Non modificare senza riportarlo alla lead.
import type { StatoPartita } from '../stato/types';

export type StatoConnessione = 'connessione' | 'in-attesa' | 'connesso' | 'errore';

export type Messaggio =
  | { t: 'ciao'; nome: string; stato: StatoPartita | null; ts: number }
  | { t: 'stato'; stato: StatoPartita }
  | { t: 'cella'; idx: number; v: number; note: number[]; da: 'a' | 'b'; ts: number }
  | { t: 'cursore'; idx: number | null }
  | { t: 'nuova'; stato: StatoPartita }
  | { t: 'frase'; testo: string }
  | { t: 'ping' }
  | { t: 'pong' };

export interface EventiStanza {
  stato: (s: StatoConnessione, dettaglio?: string) => void;
  messaggio: (m: Messaggio) => void;
  /** nome del partner quando arriva il suo `ciao` */
  partner: (nome: string) => void;
}

export interface Stanza {
  /** 'a' o 'b': assegnato dopo la registrazione su PeerJS */
  readonly ruolo: 'a' | 'b' | null;
  readonly stato: StatoConnessione;
  on<K extends keyof EventiStanza>(evento: K, cb: EventiStanza[K]): () => void;
  invia(m: Messaggio): void;
  chiudi(): void;
}

/** Apre (o raggiunge) la stanza derivata dalla frase segreta. */
export type ApriStanza = (frase: string, nome: string, statoIniziale: () => StatoPartita | null) => Stanza;
