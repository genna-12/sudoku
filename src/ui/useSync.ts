// Memoria condivisa via Worker: GET all'avvio / cambio frase / ritorno in primo piano, PUT con
// debounce. Mai bloccante: errori solo come console.warn('[sync]', …). Con URL_SYNC vuoto non fa nulla.
// Il Worker è un terzo "dispositivo": stesso merge del P2P, e nulla va inviato al P2P per la sync.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { INTERVALLO_SYNC_MS, LETTURA_PRIMO_PIANO_MS, URL_SYNC } from '../config/sync';
import type { Archivio } from '../stato/archivio';
import { chiaveSync, decidiScrittura, impronta, leggiPayload, motivoCambio, payloadDa, puoScrivere, unisciRemoto } from '../stato/sync';
import type { MotivoScrittura, PayloadSync } from '../stato/sync';
import type { StatoPartita } from '../stato/types';

export type StatoSync = 'spenta' | 'ok' | 'errore' | 'in-corso';
export interface InfoSync {
  stato: StatoSync;
  ultimo: number | null;
}

/** I browser rifiutano fetch keepalive con corpi oltre 64 KB. */
const MAX_KEEPALIVE = 60_000;

export interface DipendenzeSync {
  url: string;
  leggi: () => Archivio;
  modifica: (fn: (a: Archivio) => Archivio) => Archivio;
  /** partita remota da unire passando da usePartita (passi, vittoria); senza, si unisce nell'archivio */
  riceviPartita?: (p: StatoPartita) => void;
  notifica: (i: InfoSync) => void;
  fetch?: typeof fetch;
  ora?: () => number;
  chiave?: (frase: string) => Promise<string>;
}

export interface MotoreSync {
  avvia(frase: string): void;
  ferma(): void;
  cambiato(prima: Archivio, dopo: Archivio): void;
  /** sincronizza subito (bottone, importa) */
  adesso(): void;
  nascosta(): void;
  primoPiano(): void;
}

/** Il motore senza React (testabile con fetch finto). */
export function creaSync(d: DipendenzeSync): MotoreSync {
  const fetcher = d.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const ora = d.ora ?? Date.now;
  let gen = 0;
  let chiave: string | null = null;
  /** una lettura è riuscita per questa chiave: solo da qui in poi si scrive (un dispositivo vuoto non cancella) */
  let pronta = false;
  /** impronta di ciò che (per quanto sappiamo) sta sul Worker */
  let noto: string | null = null;
  /** ultimo payload letto: i suoi campi sconosciuti si ricopiano; se è di una versione più nuova non si scrive */
  let ultimoRemoto: PayloadSync | null = null;
  let ultimoContatto: number | null = null;
  let ultimaLettura = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let occupato = false;
  let ancora = false;
  let info: InfoSync = { stato: 'in-corso', ultimo: null };

  const imposta = (stato: StatoSync, ultimo = info.ultimo) => {
    if (stato === info.stato && ultimo === info.ultimo) return;
    info = { stato, ultimo };
    d.notifica(info);
  };
  const indirizzo = () => `${d.url}/archivio/${chiave}`;
  const sporco = () => !pronta || impronta(payloadDa(d.leggi())) !== noto;
  const fermaTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const errore = (e: unknown) => {
    console.warn('[sync]', e instanceof Error ? e.message : e);
    imposta('errore');
    fermaTimer();
    const g = gen;
    timer = setTimeout(() => {
      timer = null;
      if (g === gen) void sincronizza();
    }, INTERVALLO_SYNC_MS);
  };

  async function scrivi(keepalive = false): Promise<void> {
    // app non aggiornata (dati remoti più nuovi): legge soltanto
    if (!puoScrivere(ultimoRemoto)) return;
    const p = payloadDa(d.leggi(), ora(), ultimoRemoto);
    const corpo = JSON.stringify(p);
    const g = gen;
    const r = await fetcher(indirizzo(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      keepalive: keepalive && corpo.length < MAX_KEEPALIVE,
    });
    if (!r.ok) throw new Error(`PUT ${r.status}`);
    if (g !== gen) return;
    noto = impronta(p);
    ultimoContatto = ora();
  }

  /** GET → unione → (se serve) PUT. Una alla volta; le richieste nel frattempo si accodano in una. */
  async function sincronizza(): Promise<void> {
    if (!chiave) return;
    if (occupato) {
      ancora = true;
      return;
    }
    occupato = true;
    fermaTimer();
    const g = gen;
    imposta('in-corso');
    try {
      ultimoContatto = ora();
      const r = await fetcher(indirizzo(), { cache: 'no-store' });
      if (!r.ok) throw new Error(`GET ${r.status}`);
      const corpo = (await r.json()) as { valore?: unknown } | null;
      if (g !== gen) return;
      ultimaLettura = ora();
      const remoto = leggiPayload(corpo?.valore ?? null);
      ultimoRemoto = remoto;
      const prova = unisciRemoto(d.leggi(), remoto);
      if (prova.cambiatoLocale) {
        if (d.riceviPartita && remoto?.partita) {
          d.modifica((a) => unisciRemoto(a, { ...remoto, partita: null }).archivio);
          d.riceviPartita(remoto.partita);
        } else {
          d.modifica((a) => unisciRemoto(a, remoto).archivio);
        }
      }
      noto = impronta(remoto);
      pronta = true;
      if (impronta(payloadDa(d.leggi())) !== noto) await scrivi();
      if (g === gen) imposta('ok', ora());
    } catch (e) {
      if (g === gen) errore(e);
    } finally {
      if (g === gen) {
        occupato = false;
        if (ancora) {
          ancora = false;
          void sincronizza();
        }
      }
    }
  }

  function pianifica(motivo: MotivoScrittura) {
    if (!chiave) return;
    const ritardo = decidiScrittura(ultimoContatto, ora(), motivo);
    if (ritardo === 0) {
      if (sporco()) void sincronizza();
      return;
    }
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (sporco()) void sincronizza();
    }, ritardo);
  }

  return {
    avvia(frase) {
      this.ferma();
      const g = gen;
      imposta('in-corso');
      (d.chiave ?? chiaveSync)(frase).then(
        (k) => {
          if (g !== gen) return;
          chiave = k;
          void sincronizza();
        },
        (e) => g === gen && errore(e),
      );
    },
    ferma() {
      gen++;
      fermaTimer();
      chiave = null;
      pronta = false;
      noto = null;
      ultimoRemoto = null;
      ultimoContatto = null;
      ultimaLettura = 0;
      occupato = false;
      ancora = false;
    },
    cambiato(prima, dopo) {
      if (!chiave) return;
      const m = motivoCambio(prima, dopo);
      if (!m) return;
      if (m === 'cancella') {
        // si scrive senza rileggere: con la rilettura la partita appena chiusa tornerebbe dal Worker
        if (!pronta || occupato) return pianifica('urgente');
        fermaTimer();
        const g = gen;
        scrivi().then(
          () => g === gen && imposta('ok', ora()),
          (e) => g === gen && errore(e),
        );
        return;
      }
      pianifica(m);
    },
    adesso() {
      void sincronizza();
    },
    nascosta() {
      if (!chiave || !pronta || occupato || !sporco()) return;
      fermaTimer();
      const g = gen;
      scrivi(true).then(
        () => g === gen && imposta('ok', ora()),
        (e) => g === gen && errore(e),
      );
    },
    primoPiano() {
      if (chiave && ora() - ultimaLettura >= LETTURA_PRIMO_PIANO_MS) void sincronizza();
    },
  };
}

interface OpzioniSync {
  archivio: Archivio;
  ref: RefObject<Archivio>;
  modifica: (fn: (a: Archivio) => Archivio) => Archivio;
  frase: string | null;
  riceviPartita?: (p: StatoPartita) => void;
}

export function useSync({ archivio, ref, modifica, frase, riceviPartita }: OpzioniSync) {
  const [info, setInfo] = useState<InfoSync>(() => ({ stato: URL_SYNC ? 'in-corso' : 'spenta', ultimo: null }));
  const motore = useRef<MotoreSync | null>(null);
  const ricevi = useRef(riceviPartita);
  useEffect(() => {
    ricevi.current = riceviPartita;
  });

  useEffect(() => {
    if (!URL_SYNC) return;
    const m = creaSync({
      url: URL_SYNC,
      leggi: () => ref.current,
      modifica,
      riceviPartita: (p) => (ricevi.current ? ricevi.current(p) : modifica((a) => unisciRemoto(a, { ...payloadDa(a), partita: p }).archivio)),
      notifica: setInfo,
    });
    motore.current = m;
    const visibilita = () => (document.visibilityState === 'hidden' ? m.nascosta() : m.primoPiano());
    const via = () => m.nascosta();
    document.addEventListener('visibilitychange', visibilita);
    window.addEventListener('pagehide', via);
    return () => {
      document.removeEventListener('visibilitychange', visibilita);
      window.removeEventListener('pagehide', via);
      m.ferma();
      motore.current = null;
    };
  }, [ref, modifica]);

  useEffect(() => {
    if (!motore.current) return;
    if (frase) motore.current.avvia(frase);
    else motore.current.ferma();
  }, [frase]);

  const prima = useRef(archivio);
  useEffect(() => {
    const p = prima.current;
    prima.current = archivio;
    if (p !== archivio) motore.current?.cambiato(p, archivio);
  }, [archivio]);

  const sincronizzaOra = useCallback(() => motore.current?.adesso(), []);
  return { ...info, sincronizzaOra };
}
