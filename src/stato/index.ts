import type { Puzzle } from '../engine/types';
import type { Azione, Cella, Contatori, Giocatore, Stato, StatoPartita, VoceStorico } from './types';

export type { Azione, Cella, Contatori, Giocatore, StatoPartita, VoceStorico } from './types';

const GIOCATORI: Giocatore[] = ['a', 'b'];
/** Voci massime nello storico. */
export const MAX_STORICO = 200;

export function nuovaPartita(puzzle: Puzzle, iniziata = Date.now()): StatoPartita {
  return { puzzle, celle: {}, iniziata, secondi: 0 };
}

export function griglia(stato: StatoPartita): number[] {
  const g = stato.puzzle.dati.slice();
  for (const k in stato.celle) {
    const i = Number(k);
    if (g[i] === 0) g[i] = stato.celle[i].v;
  }
  return g;
}

export function applica(stato: StatoPartita, azione: Azione): StatoPartita {
  switch (azione.tipo) {
    case 'tick':
      return stato.finita ? stato : { ...stato, secondi: stato.secondi + 1 };
    case 'finita':
      return stato.finita ? stato : { ...stato, finita: azione.ts };
    case 'cella': {
      const { idx, v, note, da, ts } = azione;
      if (idx < 0 || idx > 80 || stato.puzzle.dati[idx] !== 0 || stato.finita) return stato;
      const prec = stato.celle[idx];
      if (prec && prec.ts >= ts) return stato;
      const cella: Cella = { v, note: [...note].sort(), da, ts };
      return { ...stato, celle: { ...stato.celle, [idx]: cella } };
    }
    case 'contatori': {
      // accettati anche a partita finita: il bonus vittoria arriva dopo `finita`
      const { da, contatori } = azione;
      const prec = stato.contatori?.[da];
      if (prec && prec.ts >= contatori.ts) return stato;
      return { ...stato, contatori: { ...stato.contatori, [da]: { ...contatori } } };
    }
  }
}

/** Ordine totale tra due versioni della stessa cella: ts, poi autore, poi valore, poi note (tie-break deterministico). */
function vinceCella(n: Cella, c: Cella): boolean {
  if (n.ts !== c.ts) return n.ts > c.ts;
  if (n.da !== c.da) return n.da > c.da;
  if (n.v !== c.v) return n.v > c.v;
  return n.note.join(',') > c.note.join(',');
}

function stessoPuzzle(a: Puzzle, b: Puzzle): boolean {
  return a.modalita === b.modalita && a.livello === b.livello && a.seed === b.seed;
}

export function unisci(a: StatoPartita, b: StatoPartita): StatoPartita {
  if (!stessoPuzzle(a.puzzle, b.puzzle)) {
    if (a.iniziata !== b.iniziata) return a.iniziata > b.iniziata ? a : b;
    // stesso istante, puzzle diversi: ordine deterministico sul seed
    return a.puzzle.seed >= b.puzzle.seed ? a : b;
  }
  // Se b non aggiunge nulla si restituisce `a` stesso (accettaNuova e la UI contano sull'identità).
  let cambiato = false;
  let celle = a.celle;
  for (const k in b.celle) {
    const i = Number(k);
    const cb = b.celle[i];
    const ca = a.celle[i];
    if (!ca || vinceCella(cb, ca)) {
      if (celle === a.celle) celle = { ...a.celle };
      celle[i] = cb;
      cambiato = true;
    }
  }
  let contatori = a.contatori;
  for (const g of GIOCATORI) {
    const cb = b.contatori?.[g];
    const ca = a.contatori?.[g];
    if (cb && (!ca || cb.ts > ca.ts)) {
      if (contatori === a.contatori) contatori = { ...a.contatori };
      contatori![g] = cb;
      cambiato = true;
    }
  }
  const finita = a.finita && b.finita ? Math.min(a.finita, b.finita) : (a.finita ?? b.finita);
  const iniziata = Math.min(a.iniziata, b.iniziata);
  const secondi = Math.max(a.secondi, b.secondi);
  if (!cambiato && finita === a.finita && iniziata === a.iniziata && secondi === a.secondi) return a;
  return {
    puzzle: a.puzzle,
    celle,
    iniziata,
    secondi,
    ...(finita ? { finita } : {}),
    ...(contatori ? { contatori } : {}),
  };
}

/**
 * Una `nuova` arrivata dal partner va accettata? Sì, salvo quando anche noi abbiamo appena
 * iniziato una partita diversa e più recente (due "nuova" incrociate): stessa regola di `unisci`,
 * così entrambi i lati scelgono la stessa partita.
 */
export function accettaNuova(mia: StatoPartita | null, arrivata: StatoPartita): boolean {
  return !mia || unisci(mia, arrivata) !== mia;
}

/** Voce di storico derivata dalla partita (`stato` incluso solo se non finita). */
export function voceStorico(s: StatoPartita): VoceStorico {
  const { puzzle } = s;
  const g = griglia(s);
  let daRiempire = 0;
  let corrette = 0;
  for (let i = 0; i < 81; i++) {
    if (puzzle.dati[i] !== 0) continue;
    daRiempire++;
    if (g[i] === puzzle.soluzione[i]) corrette++;
  }
  let punti = 0;
  let errori = 0;
  let aggiornata = Math.max(s.iniziata, s.finita ?? 0);
  for (const chi of GIOCATORI) {
    const c: Contatori | undefined = s.contatori?.[chi];
    if (!c) continue;
    punti += c.punti;
    errori += c.errori;
    aggiornata = Math.max(aggiornata, c.ts);
  }
  for (const k in s.celle) aggiornata = Math.max(aggiornata, s.celle[k].ts);
  return {
    id: `${puzzle.modalita}-${puzzle.seed}`,
    modalita: puzzle.modalita,
    livello: puzzle.livello,
    iniziata: s.iniziata,
    ...(s.finita ? { finita: s.finita } : {}),
    secondi: s.secondi,
    progresso: daRiempire ? corrette / daRiempire : 1,
    punti,
    errori,
    aggiornata,
    ...(s.finita ? {} : { stato: s }),
  };
}

/** Merge per id: vince `aggiornata` maggiore (a parità, più secondi; poi la voce di `a`); più recenti prima; max 200. */
/** Ordine totale tra due versioni della stessa voce: aggiornata, secondi, poi il JSON (tie-break deterministico). */
function vinceVoce(n: VoceStorico, c: VoceStorico): boolean {
  if (n.aggiornata !== c.aggiornata) return n.aggiornata > c.aggiornata;
  if (n.secondi !== c.secondi) return n.secondi > c.secondi;
  return JSON.stringify(n) > JSON.stringify(c);
}

export function unisciStorico(a: VoceStorico[], b: VoceStorico[]): VoceStorico[] {
  const perId = new Map<string, VoceStorico>();
  for (const v of [...a, ...b]) {
    const c = perId.get(v.id);
    if (!c || vinceVoce(v, c)) perId.set(v.id, v);
  }
  return [...perId.values()]
    .sort((x, y) => y.iniziata - x.iniziata || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .slice(0, MAX_STORICO);
}

export const stato: Stato = { nuovaPartita, applica, unisci, griglia, voceStorico, unisciStorico };
