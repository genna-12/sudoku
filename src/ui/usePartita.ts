// La partita in corso: mosse, punteggio, regali, vittoria, ricezione dalla rete e voce nel giardino.
// Lo stato vive nell'archivio (useArchivio); qui solo le transizioni. Le regole stanno in regole.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ChiParla } from '../config/frasi';
import { generaPuzzle, verificaCompleta } from '../engine';
import type { Livello, Modalita } from '../engine';
import type { Messaggio } from '../net';
import { accettaNuova, applica, griglia, nuovaPartita, unisci } from '../stato';
import type { Contatori, Giocatore, StatoPartita, VoceStorico } from '../stato';
import { aggiornaStorico } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import {
  conQuotaBlu,
  celleCompletate,
  conBonusVittoria,
  contatoriVuoti,
  esitoMossa,
  mascotteDi,
  partitaToccata,
  regaliBonusDi,
  stessoPuzzle,
  umoreEvento,
  usaRegalo,
} from './regole';
import type { CategoriaFrase, EventoMascotte } from './regole';
import type { Destinazione, Origine } from './useRete';

/** Reazione di una mascotte, decisa da chi fa la mossa e mandata uguale all'altro. */
export interface Reazione {
  chi: ChiParla;
  umore: string;
  categoria: CategoriaFrase | 'chiacchiera' | 'solletico';
  testo: string;
  idx?: number;
}

export interface Effetti {
  /** reazione generata qui: App la mostra e la manda al partner */
  reazione: (r: Reazione) => void;
  lampo: (centro: number, celle: number[]) => void;
  vibra: (schema: number | number[]) => void;
  /** la partita è appena diventata "finita" (qui o dal partner) */
  vittoria: () => void;
  /** suggerimenti regalati dagli sblocchi, appena accreditati alla partita nuova */
  regaliGiardino?: (n: number) => void;
}

interface Opzioni {
  /** la partita dello stato React (per il render); `ref` per la versione più recente */
  partita: StatoPartita | null;
  ref: MutableRefObject<Archivio>;
  modifica: (fn: (a: Archivio) => Archivio) => Archivio;
  mioRuolo: Giocatore;
  sbloccata: boolean;
  mostraErrori: boolean;
  invia: (m: Messaggio, dove?: Destinazione) => void;
  frase: (c: CategoriaFrase, chi: ChiParla, n?: number) => string;
  effetti: Effetti;
}

interface Passo {
  idx: number;
  v: number;
  note: number[];
}

const STORICO_OGNI_MS = 2000;
const PROBABILITA_FRASE_GIUSTA = 0.25;

export function usePartita(opzioni: Opzioni) {
  const o = useRef(opzioni);
  useEffect(() => {
    o.current = opzioni;
  });
  const { partita, modifica } = opzioni;

  const passi = useRef<Passo[]>([]);
  const [nPassi, setNPassi] = useState(0);
  /** celle che hanno già dato punti in questa partita (annulla + riscrivi non conta due volte) */
  const contate = useRef<{ seed: number; celle: Set<number> }>({ seed: -1, celle: new Set() });
  const erroriDiFila = useRef(0);

  const azzeraPassi = useCallback(() => {
    passi.current = [];
    setNPassi(0);
  }, []);

  /**
   * Celle che non danno più punti: quelle già giuste quando si vede la partita (anche dopo un reload,
   * da chiunque o da un regalo) e quelle diventate giuste dopo. Cancellare e riscrivere non paga due volte.
   */
  function celleContate(p: StatoPartita): Set<number> {
    if (contate.current.seed !== p.puzzle.seed) contate.current = { seed: p.puzzle.seed, celle: new Set() };
    const set = contate.current.celle;
    for (const k in p.celle) if (p.celle[k].v !== 0 && p.celle[k].v === p.puzzle.soluzione[Number(k)]) set.add(Number(k));
    return set;
  }

  function mieiContatori(p: StatoPartita): Contatori | undefined {
    return p.contatori?.[o.current.mioRuolo];
  }

  /** ts dei miei contatori: sempre crescente anche con orologi uguali al millisecondo. */
  function tsContatori(p: StatoPartita): number {
    return Math.max(Date.now(), (mieiContatori(p)?.ts ?? 0) + 1);
  }

  function chiParla(): ChiParla {
    return o.current.sbloccata ? mascotteDi(o.current.mioRuolo) : 'semino';
  }

  function reagisci(e: EventoMascotte, categoria: CategoriaFrase, testo: string | null, idx?: number, n?: number) {
    const chi = chiParla();
    o.current.effetti.reazione({
      chi,
      umore: umoreEvento(chi, e),
      categoria,
      testo: testo ?? o.current.frase(categoria, chi, n),
      idx,
    });
  }

  /**
   * Unico punto in cui cambia la partita: rileva la vittoria (bonus ai miei contatori, una volta),
   * lascia nel giardino la partita precedente se si passa a un'altra.
   */
  const imposta = useCallback((nuova: StatoPartita | null, daMe = false) => {
    const prima = o.current.ref.current.partita;
    let n = nuova;
    if (n && !n.finita && verificaCompleta(n.puzzle, griglia(n))) n = applica(n, { tipo: 'finita', ts: Date.now() });
    const finitaOra = !!n && !!n.finita && stessoPuzzle(prima, n) && !prima?.finita;
    if (finitaOra && n) {
      const c = conBonusVittoria(mieiContatori(n), n.secondi, tsContatori(n));
      n = applica(n, { tipo: 'contatori', da: o.current.mioRuolo, contatori: c });
      o.current.invia({ t: 'contatori', da: o.current.mioRuolo, contatori: c });
    }
    const fin = n;
    if (fin) celleContate(fin);
    o.current.modifica((a) => {
      let b = a;
      if (a.partita && !stessoPuzzle(a.partita, fin) && partitaToccata(a.partita)) b = conQuotaBlu(aggiornaStorico(b, a.partita), a.partita);
      if (fin && fin.finita) b = conQuotaBlu(aggiornaStorico(b, fin), fin);
      return b.partita === fin && b === a ? a : { ...b, partita: fin };
    });
    if (finitaOra) {
      o.current.effetti.vittoria();
      if (daMe) reagisci('vittoria', 'vittoria', null);
    }
  }, []);

  // --- mosse -----------------------------------------------------------------

  function mossa(idx: number, v: number, note: number[], daAnnulla = false) {
    const p = o.current.ref.current.partita;
    if (!p || p.finita || p.puzzle.dati[idx] !== 0) return;
    const prec = p.celle[idx];
    const prima = griglia(p);
    // ts sempre dopo `iniziata`: l'altro scarta le mosse con ts <= iniziata (residui di partite vecchie)
    const ts = Math.max(Date.now(), (prec?.ts ?? 0) + 1, p.iniziata + 1);
    const mio = o.current.mioRuolo;
    let n = applica(p, { tipo: 'cella', idx, v, note, da: mio, ts });
    if (n === p) return;
    if (!daAnnulla) {
      passi.current.push({ idx, v: prec?.v ?? 0, note: prec?.note ?? [] });
      if (passi.current.length > 200) passi.current.shift();
      setNPassi(passi.current.length);
    }
    o.current.invia({ t: 'cella', idx, v, note, da: mio, ts });

    const contateQui = celleContate(p);
    const esito = daAnnulla
      ? ({ tipo: 'nessuno' } as const)
      : esitoMossa({
          puzzle: p.puzzle,
          grigliaPrima: prima,
          idx,
          v,
          contatori: mieiContatori(p),
          erroriDiFila: erroriDiFila.current,
          giaContata: contateQui.has(idx),
          ts: tsContatori(p),
        });
    if (esito.tipo !== 'nessuno') {
      n = applica(n, { tipo: 'contatori', da: mio, contatori: esito.contatori });
      o.current.invia({ t: 'contatori', da: mio, contatori: esito.contatori });
    }
    imposta(n, true);

    if (esito.tipo === 'errore') {
      erroriDiFila.current = esito.diFila;
      if (!o.current.mostraErrori) return;
      o.current.effetti.vibra([28, 40, 28]);
      if (esito.diFila >= 3 && esito.diFila % 3 === 0) reagisci('erroreSerie', 'sbagliataSerie', null, idx);
      else reagisci('errore', 'sbagliata', null, idx);
      return;
    }
    if (esito.tipo !== 'giusta') return;
    erroriDiFila.current = 0;
    contateQui.add(idx);
    const q = esito.valutazione.qualita;
    if (q === 'chiusura') {
      o.current.effetti.lampo(idx, celleCompletate(p.puzzle, idx, esito.valutazione.completate));
      o.current.effetti.vibra(18);
      reagisci('chiusura', 'completato', null, idx);
    } else if (q === 'brillante') reagisci('brillante', 'brillante', null, idx);
    else if (q === 'intelligente') reagisci('intelligente', 'intelligente', null, idx);
    else reagisci('giusta', 'giusta', Math.random() < PROBABILITA_FRASE_GIUSTA ? null : '', idx);
    if (esito.serieTraguardo) reagisci('giusta', 'serie', null, undefined, esito.serieTraguardo);
    if (esito.regaliNuovi > 0 && !o.current.ref.current.partita?.finita) {
      o.current.effetti.vibra(12);
      reagisci('regalo', 'regalo', null);
    }
  }

  function annulla() {
    const passo = passi.current.pop();
    setNPassi(passi.current.length);
    if (passo) mossa(passo.idx, passo.v, passo.note, true);
  }

  /** Regalo di Semino: riempie `idx` col valore giusto (0 punti, attribuito a me). */
  function suggerisci(idx: number): boolean {
    const p = o.current.ref.current.partita;
    if (!p || p.finita || p.puzzle.dati[idx] !== 0) return false;
    const giusto = p.puzzle.soluzione[idx];
    if (griglia(p)[idx] === giusto) return false;
    const c = usaRegalo(mieiContatori(p), tsContatori(p));
    if (!c) return false;
    const mio = o.current.mioRuolo;
    const ts = Math.max(Date.now(), (p.celle[idx]?.ts ?? 0) + 1, p.iniziata + 1);
    let n = applica(p, { tipo: 'cella', idx, v: giusto, note: [], da: mio, ts });
    n = applica(n, { tipo: 'contatori', da: mio, contatori: c });
    o.current.invia({ t: 'cella', idx, v: giusto, note: [], da: mio, ts });
    o.current.invia({ t: 'contatori', da: mio, contatori: c });
    celleContate(p).add(idx);
    imposta(n, true);
    reagisci('regalo', 'suggerimento', null, idx);
    return true;
  }

  /**
   * I suggerimenti regalati dagli sblocchi del giardino (archivio.regaliBonus) vanno ai miei
   * contatori della partita appena iniziata, una volta sola.
   */
  function accreditaRegaliGiardino() {
    const a = o.current.ref.current;
    const n = regaliBonusDi(a.regaliBonus);
    const p = a.partita;
    if (!n || !p || p.finita) return;
    const base = mieiContatori(p) ?? contatoriVuoti();
    const c: Contatori = { ...base, regaliDisponibili: base.regaliDisponibili + n, ts: tsContatori(p) };
    const mio = o.current.mioRuolo;
    o.current.modifica((x) => ({ ...x, regaliBonus: 0 }));
    imposta(applica(p, { tipo: 'contatori', da: mio, contatori: c }));
    o.current.invia({ t: 'contatori', da: mio, contatori: c });
    o.current.effetti.regaliGiardino?.(n);
  }

  function iniziaNuova(m: Modalita, l: Livello) {
    const st = nuovaPartita(generaPuzzle(m, l, Date.now()));
    imposta(st);
    azzeraPassi();
    erroriDiFila.current = 0;
    o.current.invia({ t: 'nuova', stato: st });
    accreditaRegaliGiardino();
  }

  /** Riprende un germoglio: diventa la partita più recente (così l'altro la accetta) e si manda come `nuova`. */
  function riprendi(v: VoceStorico): boolean {
    if (!v.stato || v.finita) return false;
    const st: StatoPartita = { ...v.stato, iniziata: Math.max(Date.now(), v.stato.iniziata + 1) };
    imposta(st);
    azzeraPassi();
    erroriDiFila.current = 0;
    o.current.invia({ t: 'nuova', stato: st });
    accreditaRegaliGiardino();
    return true;
  }

  // --- dalla rete --------------------------------------------------------------

  function valida(s: StatoPartita | null | undefined): s is StatoPartita {
    return !!s && !!s.puzzle && Array.isArray(s.puzzle.dati) && s.iniziata >= o.current.ref.current.azzerato;
  }

  /** `stato` o `ciao`: unione con la mia. Restituisce la partita risultante (da rimandare). */
  function riceviStato(s: StatoPartita | null | undefined): StatoPartita | null {
    const mia = o.current.ref.current.partita;
    if (!valida(s)) return mia;
    const unita = mia ? unisci(mia, s) : s;
    if (unita !== mia) {
      if (!stessoPuzzle(mia, unita)) azzeraPassi();
      imposta(unita);
    }
    return o.current.ref.current.partita;
  }

  /** `nuova`: stesso puzzle → unione; altrimenti si accetta (salvo "nuova" incrociate più vecchie). */
  function riceviNuova(s: StatoPartita, da: Origine): 'unita' | 'nuova' | 'rifiutata' {
    const mia = o.current.ref.current.partita;
    if (!valida(s)) return 'rifiutata';
    if (mia && stessoPuzzle(mia, s)) {
      const u = unisci(mia, s);
      if (u !== mia) imposta(u);
      return 'unita';
    }
    if (!accettaNuova(mia, s)) {
      if (mia) o.current.invia({ t: 'stato', stato: mia }, da);
      return 'rifiutata';
    }
    imposta(s);
    azzeraPassi();
    erroriDiFila.current = 0;
    // dopo l'inoltro della `nuova` all'altra stanza (il chiamante la inoltra subito dopo): i miei
    // contatori non devono arrivare al mio altro dispositivo prima della partita a cui appartengono
    queueMicrotask(accreditaRegaliGiardino);
    return 'nuova';
  }

  function riceviCella(m: Extract<Messaggio, { t: 'cella' }>): boolean {
    const mia = o.current.ref.current.partita;
    // mossa della partita precedente, arrivata dopo una "nuova": non va sulla griglia nuova
    if (!mia || m.ts <= mia.iniziata) return false;
    const n = applica(mia, { tipo: 'cella', idx: m.idx, v: m.v, note: m.note, da: m.da, ts: m.ts });
    if (n === mia) return false;
    imposta(n);
    return true;
  }

  /** true se ha cambiato la partita (solo allora si inoltra all'altra stanza). */
  function riceviContatori(m: Extract<Messaggio, { t: 'contatori' }>): boolean {
    const mia = o.current.ref.current.partita;
    if (!mia || !m.contatori) return false;
    const n = applica(mia, { tipo: 'contatori', da: m.da, contatori: m.contatori });
    if (n === mia) return false;
    imposta(n);
    return true;
  }

  function tick() {
    const p = o.current.ref.current.partita;
    if (p && !p.finita) o.current.modifica((a) => (a.partita === p ? { ...a, partita: applica(p, { tipo: 'tick' }) } : a));
  }

  function chiudi() {
    azzeraPassi();
  }

  // --- giardino: la partita toccata entra nello storico, aggiornata al massimo ogni 2 s --------
  const inAttesa = useRef(0);
  useEffect(() => {
    if (!partita || !partitaToccata(partita) || inAttesa.current) return;
    inAttesa.current = window.setTimeout(() => {
      inAttesa.current = 0;
      modifica((a) => (a.partita && partitaToccata(a.partita) ? conQuotaBlu(aggiornaStorico(a, a.partita), a.partita) : a));
    }, STORICO_OGNI_MS);
  }, [partita, modifica]);
  useEffect(() => () => window.clearTimeout(inAttesa.current), []);

  return {
    partita,
    puoAnnullare: nPassi > 0 && !!partita && !partita.finita,
    mossa,
    annulla,
    suggerisci,
    iniziaNuova,
    riprendi,
    riceviStato,
    riceviNuova,
    riceviCella,
    riceviContatori,
    tick,
    chiudi,
  };
}
