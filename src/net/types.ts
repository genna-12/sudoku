// Contratto della stanza P2P. Non modificare senza riportarlo alla lead.
import type { Contatori, StatoPartita, VoceStorico } from '../stato/types';

export type StatoConnessione = 'connessione' | 'in-attesa' | 'connesso' | 'errore';

/** `inoltrato`: messaggio passato da una stanza all'altra (coppia ↔ personale); `evento`, `cursore`
 *  e `frase` con questo segno non si inoltrano di nuovo. */
export type Messaggio = (
  | { t: 'ciao'; nome: string; stato: StatoPartita | null; ts: number; storico?: VoceStorico[]; azzerato?: number }
  | { t: 'stato'; stato: StatoPartita }
  /** `azzerato`: Date.now() dell'ultimo "ricomincia da zero"; le voci con iniziata < azzerato si scartano ovunque */
  | { t: 'storico'; storico: VoceStorico[]; azzerato?: number }
  | { t: 'cella'; idx: number; v: number; note: number[]; da: 'a' | 'b'; ts: number }
  | { t: 'contatori'; da: 'a' | 'b'; contatori: Contatori }
  | { t: 'cursore'; idx: number | null }
  | { t: 'nuova'; stato: StatoPartita }
  | { t: 'frase'; testo: string }
  /** evento di gioco da mostrare all'altro (mossa brillante, regalo, ecc.) */
  | { t: 'evento'; tipo: string; idx?: number; testo?: string }
  | { t: 'ping' }
  | { t: 'pong' }
) & { inoltrato?: true };

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

/**
 * Apre (o raggiunge) la stanza derivata dalla frase segreta.
 * `ruolo`: posto fisso nella stanza (stanza di coppia = ruolo di gioco, Semino 'a', Semina 'b'):
 * mi registro solo come `-<ruolo>` e mi collego all'altro; se il posto è preso da un altro mio
 * dispositivo lo stato è 'in-attesa' con dettaglio 'occupata' e si riprova ogni 10 s.
 * Senza `ruolo` (stanza personale): primo libero fra `a` e `b`.
 * `ice`: server STUN/TURN da usare (da `caricaIce()` in net/ice.ts: TURN di Cloudflare via Worker);
 * senza, i server statici di config/ice.ts.
 */
export type ApriStanza = (
  frase: string,
  nome: string,
  statoIniziale: () => StatoPartita | null,
  ruolo?: 'a' | 'b',
  ice?: { server: RTCIceServer[]; fonte: 'cloudflare' | 'statico' },
) => Stanza;
