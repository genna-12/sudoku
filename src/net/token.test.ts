import { describe, expect, it } from 'vitest';
import { CHIAVE_TOKEN, creaGestoreToken, tokenCasuale, tokenDispositivo } from './token';

function memoria() {
  const dati = new Map<string, string>();
  return {
    dati,
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
  };
}

/** Web Locks finti: il primo che chiede prende il lucchetto, gli altri no (ifAvailable). */
function lucchetti() {
  let preso = false;
  return {
    request(_n: string, _o: { ifAvailable: boolean }, cb: (l: unknown) => unknown) {
      const mio = !preso;
      preso = true;
      return Promise.resolve().then(() => cb(mio ? {} : null));
    },
  };
}

describe('token PeerJS del dispositivo', () => {
  it('casuale, alfanumerico, diverso ogni volta', () => {
    const a = tokenCasuale();
    expect(a).toMatch(/^[a-z0-9]{12,}$/);
    expect(tokenCasuale()).not.toBe(a);
  });

  it('persistente: creato la prima volta, poi sempre lo stesso', () => {
    const s = memoria();
    const t = tokenDispositivo(s);
    expect(s.dati.get(CHIAVE_TOKEN)).toBe(t);
    expect(tokenDispositivo(s)).toBe(t);
  });

  it('valore salvato rovinato → se ne crea uno nuovo', () => {
    const s = memoria();
    s.setItem(CHIAVE_TOKEN, '<<rotto>>');
    const t = tokenDispositivo(s);
    expect(t).not.toBe('<<rotto>>');
    expect(tokenDispositivo(s)).toBe(t);
  });

  it('storage che lancia o assente → token casuale, senza errori', () => {
    const rotto = {
      getItem: (): string | null => {
        throw new Error('bloccato');
      },
      setItem: () => {
        throw new Error('bloccato');
      },
    };
    expect(tokenDispositivo(rotto)).toMatch(/^[a-z0-9]+$/);
    expect(tokenDispositivo(null)).toMatch(/^[a-z0-9]+$/);
  });

  it('due schede: solo quella col lucchetto usa il token fisso, l’altra uno casuale stabile', async () => {
    const s = memoria();
    const locks = lucchetti();
    const prima = creaGestoreToken({ storage: s, locks });
    const seconda = creaGestoreToken({ storage: s, locks });
    await Promise.resolve();
    await Promise.resolve();
    expect(prima.stato).toBe('mio');
    expect(seconda.stato).toBe('altrui');
    const fisso = tokenDispositivo(s);
    expect(prima.token()).toBe(fisso);
    expect(seconda.token()).not.toBe(fisso);
    expect(seconda.token()).toBe(seconda.token());
  });

  it('senza Web Locks: token fisso', () => {
    const s = memoria();
    const g = creaGestoreToken({ storage: s, locks: null });
    expect(g.stato).toBe('assente');
    expect(g.token()).toBe(tokenDispositivo(s));
  });
});
