// Token PeerJS persistente per dispositivo (ricerca 2026-11-11 §6.4, ADR 006).
// Il server PeerJS ridà un ID solo a chi presenta lo stesso token: con un token fisso il proprio ID
// "fantasma" (lasciato da una sessione chiusa male, da iOS che sospende la app, da un cambio di rete)
// non blocca più il rientro. Un altro dispositivo ha un altro token e trova ancora il posto occupato.
// Due schede dello stesso browser condividerebbero il token e si ruberebbero il posto: con Web Locks
// solo la scheda che tiene il lucchetto usa il token fisso, le altre uno casuale (come prima).

export const CHIAVE_TOKEN = 'sudoku-coppia-token';
export const LUCCHETTO_TOKEN = 'sudoku-coppia-token';

export function tokenCasuale(): string {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const b = c.getRandomValues(new Uint8Array(12));
    return Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

type Archivio = Pick<Storage, 'getItem' | 'setItem'>;

function storageDiDefault(): Archivio | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Il token di questo dispositivo: letto da localStorage, creato la prima volta; casuale se lo storage non va. */
export function tokenDispositivo(storage: Archivio | null = storageDiDefault()): string {
  try {
    const t = storage?.getItem(CHIAVE_TOKEN);
    if (t && /^[a-z0-9]{8,64}$/i.test(t)) return t;
    const nuovo = tokenCasuale();
    storage?.setItem(CHIAVE_TOKEN, nuovo);
    // se non si è salvato (storage pieno o bloccato) resta comunque valido per questa sessione
    return nuovo;
  } catch {
    return tokenCasuale();
  }
}

/** Stato del lucchetto della scheda: 'mio' (uso il token fisso), 'altrui' (un'altra scheda lo ha), 'assente' (niente Web Locks). */
export type StatoLucchetto = 'attesa' | 'mio' | 'altrui' | 'assente';

interface LocksMinimi {
  request(nome: string, opz: { ifAvailable: boolean }, cb: (l: unknown) => Promise<unknown> | unknown): Promise<unknown>;
}

export function creaGestoreToken(o: { storage?: Archivio | null; locks?: LocksMinimi | null } = {}) {
  let stato: StatoLucchetto = 'attesa';
  let casuale: string | null = null;
  const locks =
    o.locks !== undefined ? o.locks : ((globalThis.navigator as unknown as { locks?: LocksMinimi } | undefined)?.locks ?? null);
  if (!locks) stato = 'assente';
  else {
    try {
      locks
        .request(LUCCHETTO_TOKEN, { ifAvailable: true }, (l) => {
          if (!l) {
            stato = 'altrui';
            return undefined;
          }
          stato = 'mio';
          // tenuto finché la scheda vive
          return new Promise(() => {});
        })
        .catch(() => {
          stato = 'assente';
        });
    } catch {
      stato = 'assente';
    }
  }
  return {
    get stato() {
      return stato;
    },
    /** Il token da dare al prossimo Peer. */
    token(): string {
      // 'attesa': la richiesta del lucchetto si risolve in pochi ms, prima del primo Peer; nel dubbio il token fisso
      if (stato !== 'altrui') return tokenDispositivo(o.storage === undefined ? storageDiDefault() : o.storage);
      // lucchetto di un'altra scheda: token casuale, stabile per questa scheda
      casuale ??= tokenCasuale();
      return casuale;
    },
  };
}
