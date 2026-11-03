// Generatore deterministico di Sudoku e Killer a soluzione unica.
// Tutti i limiti sono in nodi/tentativi (mai in tempo) per restare deterministici.
import { LIVELLI_PARAMETRI } from '../config/livelli';
import { creaRng, intero, mescola, type Rng } from './rng';
import { cerca, type EsitoRicerca } from './risolutore';
import type { Gabbia, Livello, Modalita, Puzzle } from './types';

/** Nodi massimi per un controllo di unicità; oltre si considera "non unico" (prudente). */
const NODI_SUDOKU = 20_000;
const NODI_KILLER = 2_000;
/** Griglie risolte provate per avvicinarsi al target di date nel Sudoku. */
const TENTATIVI_SUDOKU = 40;
/** Partizioni in gabbie provate prima di ripiegare aggiungendo date. */
const TENTATIVI_KILLER = 30;
/** Nodi totali spendibili in partizioni+ritocchi prima del ripiego (limite deterministico). */
const BUDGET_KILLER = 300_000;
/** Ritocchi locali delle gabbie per tentativo. */
const RIPARAZIONI = 12;

function grigliaRisolta(rng: Rng): number[] {
  const es = cerca(new Array(81).fill(0), undefined, { limite: 1, rng });
  return es.prima!;
}

function unica(dati: number[], gabbie: Gabbia[] | undefined, maxNodi: number) {
  return cerca(dati, gabbie, { limite: 2, maxNodi });
}

/** Coppie simmetriche (rotazione 180°): [i, 80-i] per i<40, più il centro da solo. */
function coppie(rng: Rng): number[][] {
  const c: number[][] = [];
  for (let i = 0; i < 40; i++) c.push([i, 80 - i]);
  return mescola(rng, c);
}

function rimuoviSimmetrico(sol: number[], target: number, rng: Rng): number[] {
  const dati = sol.slice();
  let date = 81;
  // Parità: 81 - 2k è dispari; per un target pari serve togliere anche il centro.
  if (target % 2 === 0) {
    dati[40] = 0;
    if (unica(dati, undefined, NODI_SUDOKU).soluzioni === 1) date--;
    else dati[40] = sol[40];
  }
  for (const p of coppie(rng)) {
    if (date - p.length < target) continue;
    for (const i of p) dati[i] = 0;
    const es = unica(dati, undefined, NODI_SUDOKU);
    if (es.soluzioni === 1 && !es.interrotta) date -= p.length;
    else for (const i of p) dati[i] = sol[i];
  }
  return dati;
}

function contaDate(dati: number[]): number {
  let n = 0;
  for (const v of dati) if (v !== 0) n++;
  return n;
}

function generaSudoku(livello: Livello, seed: number, rng: Rng): Puzzle {
  const target = LIVELLI_PARAMETRI[livello].dateSudoku;
  let miglioreSol: number[] = [];
  let miglioriDati: number[] = [];
  let migliori = 82;
  for (let t = 0; t < TENTATIVI_SUDOKU && migliori > target; t++) {
    const sol = grigliaRisolta(rng);
    const dati = rimuoviSimmetrico(sol, target, rng);
    const n = contaDate(dati);
    if (n < migliori) {
      migliori = n;
      miglioreSol = sol;
      miglioriDati = dati;
    }
  }
  return { modalita: 'sudoku', livello, seed, soluzione: miglioreSol, dati: miglioriDati };
}

const VICINI: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const v: number[] = [];
  if (r > 0) v.push(i - 9);
  if (r < 8) v.push(i + 9);
  if (c > 0) v.push(i - 1);
  if (c < 8) v.push(i + 1);
  return v;
});

/**
 * Partiziona le 81 celle in gabbie contigue, cifre distinte, dimensione 1..max.
 * `tenute`: gabbie da conservare; si fanno crescere gabbie nuove solo sulle celle libere.
 */
function partiziona(sol: number[], max: number, rng: Rng, tenute: number[][] = []): Gabbia[] {
  const di = new Int16Array(81).fill(-1);
  const celle: number[][] = [];
  const usate: number[] = [];
  for (const c of tenute) {
    for (const i of c) di[i] = celle.length;
    celle.push(c.slice());
    usate.push(c.reduce((m, i) => m | (1 << (sol[i] - 1)), 0));
  }
  const minTarget = Math.min(max, 2);
  for (const start of mescola(rng, Array.from({ length: 81 }, (_, i) => i))) {
    if (di[start] !== -1) continue;
    const id = celle.length;
    // Con max 5 le gabbie da 5 sono metà rare: unicità molto più facile da dimostrare,
    // dimensione media comunque sopra quella di extreme (≈3,25 contro 3).
    const target = max >= 5 && rng() < 0.5 ? intero(rng, minTarget, max - 1) : intero(rng, minTarget, max);
    const gruppo = [start];
    let mask = 1 << (sol[start] - 1);
    di[start] = id;
    while (gruppo.length < target) {
      const frontiera: number[] = [];
      for (const x of gruppo)
        for (const n of VICINI[x])
          if (di[n] === -1 && !(mask & (1 << (sol[n] - 1))) && !frontiera.includes(n)) frontiera.push(n);
      if (frontiera.length === 0) break;
      const n = frontiera[Math.floor(rng() * frontiera.length)];
      gruppo.push(n);
      di[n] = id;
      mask |= 1 << (sol[n] - 1);
    }
    celle.push(gruppo);
    usate.push(mask);
  }
  // Le gabbie da 1 rimaste: prova a unirle a una gabbia vicina che ha spazio.
  for (let id = 0; id < celle.length; id++) {
    if (celle[id].length !== 1) continue;
    const x = celle[id][0];
    const bit = 1 << (sol[x] - 1);
    const candidati = VICINI[x]
      .map((n) => di[n])
      .filter((g, k, a) => g !== id && a.indexOf(g) === k && celle[g].length < max && !(usate[g] & bit));
    if (candidati.length === 0) continue;
    const g = candidati[Math.floor(rng() * candidati.length)];
    celle[g].push(x);
    usate[g] |= bit;
    di[x] = g;
    celle[id] = [];
  }
  return celle
    .filter((c) => c.length > 0)
    .map((c) => {
      const ordinate = c.slice().sort((a, b) => a - b);
      return { celle: ordinate, somma: ordinate.reduce((s, i) => s + sol[i], 0) };
    });
}

function altraSoluzione(es: EsitoRicerca, sol: number[]): number[] | null {
  for (const x of [es.prima, es.seconda]) if (x && x.some((v, i) => v !== sol[i])) return x;
  return null;
}

function generaKiller(livello: Livello, seed: number, rng: Rng): Puzzle {
  const { dateKiller, gabbiaMax } = LIVELLI_PARAMETRI[livello];
  const sol = grigliaRisolta(rng);
  let ripiego: Gabbia[] | null = null;

  const dati = new Array(81).fill(0);
  const ordDate = coppie(rng);
  for (let k = 0, date = 0; date < dateKiller && k < ordDate.length; k++) {
    for (const i of ordDate[k]) dati[i] = sol[i];
    date += ordDate[k].length;
  }

  // Ogni tentativo: partizione nuova, poi fino a RIPARAZIONI ritocchi locali: si sciolgono
  // le gabbie che toccano le celle dove un'altra soluzione differisce e si fanno ricrescere.
  let spesi = 0;
  for (let t = 0; t < TENTATIVI_KILLER && spesi < BUDGET_KILLER; t++) {
    let gabbie = partiziona(sol, gabbiaMax, rng);
    for (let r = 0; r <= RIPARAZIONI && spesi < BUDGET_KILLER; r++) {
      const es = unica(dati, gabbie, NODI_KILLER);
      spesi += es.nodi;
      if (es.soluzioni === 1 && !es.interrotta) {
        return { modalita: 'killer', livello, seed, soluzione: sol, dati, gabbie };
      }
      if (!ripiego) ripiego = gabbie;
      const alt = altraSoluzione(es, sol);
      if (!alt) break;
      const tocca = new Set<number>();
      // Celle diverse e loro vicine: sciogliere solo le diverse può ricreare lo stesso schema
      // (es. rettangolo a/b che si riaccoppia sempre in gabbie a somma invariata).
      for (let i = 0; i < 81; i++) if (alt[i] !== sol[i]) for (const n of [i, ...VICINI[i]]) tocca.add(n);
      const tenute = gabbie.filter((gb) => !gb.celle.some((i) => tocca.has(i))).map((gb) => gb.celle);
      gabbie = partiziona(sol, gabbiaMax, rng, tenute);
    }
  }

  // Ripiego (raro): sulla prima partizione aggiunge date simmetriche finché è unica.
  const gabbie = ripiego!;
  const ord = coppie(rng);
  for (;;) {
    const es = unica(dati, gabbie, NODI_KILLER);
    if (es.soluzioni === 1 && !es.interrotta) break;
    // Se ho una seconda soluzione, rivelo una cella dove differisce (progresso garantito).
    let scelta = -1;
    const alt = altraSoluzione(es, sol);
    if (alt) {
      const diverse: number[] = [];
      for (let i = 0; i < 81; i++) if (dati[i] === 0 && alt[i] !== sol[i]) diverse.push(i);
      if (diverse.length) scelta = diverse[Math.floor(rng() * diverse.length)];
    }
    if (scelta === -1) {
      const p = ord.find((q) => q.some((i) => dati[i] === 0));
      if (!p) break; // tutte date: unica per costruzione
      scelta = p.find((i) => dati[i] === 0)!;
    }
    dati[scelta] = sol[scelta];
    dati[80 - scelta] = sol[80 - scelta];
  }
  return { modalita: 'killer', livello, seed, soluzione: sol, dati, gabbie };
}

export function genera(modalita: Modalita, livello: Livello, seed: number): Puzzle {
  const rng = creaRng(seed);
  return modalita === 'killer' ? generaKiller(livello, seed, rng) : generaSudoku(livello, seed, rng);
}
