// Risolutore a bitmask con scelta della cella a minor numero di candidati (MRV).
// Bit (v-1) = cifra v. Per il killer usa, per ogni gabbia, l'unione delle cifre
// che compaiono in almeno una combinazione valida (cifre distinte, somma residua).
import type { Gabbia } from './types';

export const RIGA = new Int8Array(81);
export const COLONNA = new Int8Array(81);
export const BOX = new Int8Array(81);
for (let i = 0; i < 81; i++) {
  RIGA[i] = Math.floor(i / 9);
  COLONNA[i] = i % 9;
  BOX[i] = Math.floor(RIGA[i] / 3) * 3 + Math.floor(COLONNA[i] / 3);
}

/** Le 27 case (righe, colonne, box), 9 celle ciascuna. */
const CASE: number[][] = [];
for (let k = 0; k < 9; k++) {
  CASE.push(Array.from({ length: 9 }, (_, j) => k * 9 + j));
  CASE.push(Array.from({ length: 9 }, (_, j) => j * 9 + k));
  CASE.push(Array.from({ length: 9 }, (_, j) => (Math.floor(k / 3) * 3 + Math.floor(j / 3)) * 9 + (k % 3) * 3 + (j % 3)));
}

const POP = new Int8Array(512);
for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);

// UNIONE[(disponibili * 10 + k) * 46 + s] = cifre usabili per scegliere k cifre distinte
// tra `disponibili` con somma s. 0 = impossibile (per k=0, s=0 vale 512 come "ok").
// INTERSEZIONE[...] = cifre presenti in tutte le combinazioni valide (obbligatorie nella gabbia).
let UNIONE: Uint16Array | null = null;
let INTERSEZIONE: Uint16Array | null = null;
function tabellaUnione(): Uint16Array {
  if (UNIONE) return UNIONE;
  const t = new Uint16Array(512 * 10 * 46);
  const x = new Uint16Array(512 * 10 * 46).fill(511);
  for (let s = 0; s < 512; s++) {
    let somma = 0;
    for (let d = 0; d < 9; d++) if (s & (1 << d)) somma += d + 1;
    const k = POP[s];
    const libero = 511 & ~s;
    // tutti i sovrainsiemi di s
    for (let extra = libero; ; extra = (extra - 1) & libero) {
      const a = s | extra;
      const idx = (a * 10 + k) * 46 + somma;
      t[idx] |= k === 0 ? 512 : s;
      x[idx] &= s;
      if (extra === 0) break;
    }
  }
  INTERSEZIONE = x;
  UNIONE = t;
  return t;
}

/** Gruppi con più celle vuote di così saltano la consistenza esatta (costo esponenziale). */
const MAX_GAC = 3;

export interface OpzioniRicerca {
  limite: number;
  /** Nodi massimi; oltre, la ricerca si interrompe e `interrotta` è true. */
  maxNodi?: number;
  /** Se presente, le cifre vengono provate in ordine casuale. */
  rng?: () => number;
}

export interface EsitoRicerca {
  soluzioni: number;
  interrotta: boolean;
  /** Prima soluzione trovata (se c'è). */
  prima: number[] | null;
  /** Seconda soluzione trovata (se c'è). */
  seconda: number[] | null;
  /** Nodi visitati. */
  nodi: number;
}

export function cerca(dati: ArrayLike<number>, gabbie: Gabbia[] | undefined, opz: OpzioniRicerca): EsitoRicerca {
  const esito: EsitoRicerca = { soluzioni: 0, interrotta: false, prima: null, seconda: null, nodi: 0 };
  const g = new Int8Array(81);
  const rM = new Int16Array(9);
  const cM = new Int16Array(9);
  const bM = new Int16Array(9);
  const killer = !!gabbie && gabbie.length > 0;
  const cand = new Int16Array(81);

  // Gruppi-somma a cifre distinte: le gabbie vere più i "residui" delle case (regola del 45:
  // le celle di una casa non coperte da gabbie interamente contenute sommano 45 - somme interne).
  const gruppi: { celle: number[]; somma: number }[] = [];
  const gabbiaDi = new Int16Array(81).fill(-1);
  if (killer) {
    for (let c = 0; c < gabbie!.length; c++) {
      const cage = gabbie![c];
      for (const i of cage.celle) {
        if (!Number.isInteger(i) || i < 0 || i > 80 || gabbiaDi[i] !== -1) return esito; // gabbie non valide
        gabbiaDi[i] = c;
      }
      gruppi.push({ celle: cage.celle.slice(), somma: cage.somma });
    }
    for (const casa of CASE) {
      const dentro = new Set<number>();
      let sommaDentro = 0;
      for (let c = 0; c < gabbie!.length; c++) {
        const cage = gabbie![c];
        if (cage.celle.every((i) => casa.includes(i))) {
          for (const i of cage.celle) dentro.add(i);
          sommaDentro += cage.somma;
        }
      }
      const resto = casa.filter((i) => !dentro.has(i));
      if (resto.length === 0) {
        if (sommaDentro !== 45) return esito;
        continue;
      }
      if (resto.length === 9) continue;
      const somma = 45 - sommaDentro;
      if (somma < 0) return esito;
      gruppi.push({ celle: resto, somma });
    }
  }
  const nG = gruppi.length;
  const gUsate = new Int16Array(nG);
  const gResto = new Int16Array(nG);
  const gVuote = new Int16Array(nG);
  const gruppiDi: number[][] = Array.from({ length: 81 }, () => []);
  for (let c = 0; c < nG; c++) {
    gResto[c] = gruppi[c].somma;
    gVuote[c] = gruppi[c].celle.length;
    for (const i of gruppi[c].celle) gruppiDi[i].push(c);
  }
  const U = killer ? tabellaUnione() : null;
  const X = killer ? INTERSEZIONE : null;

  for (let i = 0; i < 81; i++) {
    const v = dati[i] | 0;
    if (v === 0) continue;
    if (v < 1 || v > 9) return esito;
    const bit = 1 << (v - 1);
    if ((rM[RIGA[i]] | cM[COLONNA[i]] | bM[BOX[i]]) & bit) return esito;
    g[i] = v;
    rM[RIGA[i]] |= bit;
    cM[COLONNA[i]] |= bit;
    bM[BOX[i]] |= bit;
    for (const c of gruppiDi[i]) {
      if (gUsate[c] & bit) return esito;
      gUsate[c] |= bit;
      gResto[c] -= v;
      gVuote[c]--;
    }
  }
  for (let c = 0; c < nG; c++) {
    if (gResto[c] < 0 || gResto[c] > 45) return esito;
    if (U![((511 & ~gUsate[c]) * 10 + gVuote[c]) * 46 + gResto[c]] === 0) return esito;
  }

  const maxNodi = opz.maxNodi ?? Infinity;
  const rng = opz.rng;
  let nodi = 0;
  const cifre = new Int8Array(9);
  const gCelle = new Int16Array(9);
  const gSup = new Int16Array(9);
  const gPerc = new Int16Array(9);
  const gPieno = new Int16Array(9);
  let gacCelle = 0;
  let gacFatto = false;
  const dfsGruppo = (j: number, usate: number, resto: number): void => {
    if (j === gacCelle) {
      if (resto !== 0) return;
      let tutti = true;
      for (let q = 0; q < gacCelle; q++) {
        gSup[q] |= gPerc[q];
        if (gSup[q] !== gPieno[q]) tutti = false;
      }
      gacFatto = tutti; // ogni candidato ha già un supporto: inutile continuare
      return;
    }
    if (U![((511 & ~usate) * 10 + (gacCelle - j)) * 46 + resto] === 0) return;
    const m = cand[gCelle[j]] & ~usate;
    for (let d = 0; d < 9 && d < resto; d++) {
      const bit = 1 << d;
      if (!(m & bit)) continue;
      gPerc[j] = bit;
      dfsGruppo(j + 1, usate | bit, resto - d - 1);
      if (gacFatto) return;
    }
  };

  const ricorri = (): void => {
    if (esito.soluzioni >= opz.limite || esito.interrotta) return;
    if (++nodi > maxNodi) {
      esito.interrotta = true;
      return;
    }
    // Candidati di ogni cella vuota; MRV; poi singoli nascosti in case e gabbie.
    let migliore = -1;
    let mMask = 0;
    let mCnt = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) {
        cand[i] = 0;
        continue;
      }
      let m = 511 & ~(rM[RIGA[i]] | cM[COLONNA[i]] | bM[BOX[i]]);
      for (const c of gruppiDi[i]) m &= U![((511 & ~gUsate[c]) * 10 + gVuote[c]) * 46 + gResto[c]];
      cand[i] = m;
      const n = POP[m];
      if (n === 0) return;
      if (n < mCnt) {
        mCnt = n;
        migliore = i;
        mMask = m;
      }
    }
    if (killer && migliore !== -1 && mCnt > 1) {
      // Consistenza di gruppo: tiene solo i candidati che compaiono in almeno un
      // completamento del gruppo (cifre distinte, somma esatta) con i candidati reali.
      for (let c = 0; c < nG; c++) {
        const k = gVuote[c];
        if (k < 2 || k > MAX_GAC) continue;
        let n = 0;
        for (const i of gruppi[c].celle) if (g[i] === 0) gCelle[n++] = i;
        for (let j = 0; j < k; j++) {
          gSup[j] = 0;
          gPieno[j] = cand[gCelle[j]] & ~gUsate[c];
        }
        gacCelle = k;
        gacFatto = false;
        dfsGruppo(0, gUsate[c], gResto[c]);
        for (let j = 0; j < k; j++) {
          if (gSup[j] === 0) return;
          cand[gCelle[j]] &= gSup[j];
        }
      }
      mCnt = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        const n = POP[cand[i]];
        if (n < mCnt) {
          mCnt = n;
          migliore = i;
          mMask = cand[i];
        }
      }
    }
    if (migliore !== -1 && mCnt > 1) {
      // Singoli nascosti nelle case: cifra con un solo posto → forzata; con zero → vicolo cieco.
      for (let h = 0; h < 27 && mCnt > 1; h++) {
        const casa = CASE[h];
        let una = 0;
        let due = 0;
        let piazzate = 0;
        for (let j = 0; j < 9; j++) {
          const i = casa[j];
          if (g[i] !== 0) piazzate |= 1 << (g[i] - 1);
          else {
            due |= una & cand[i];
            una |= cand[i];
          }
        }
        if ((piazzate | una) !== 511) return;
        const singoli = una & ~due;
        if (singoli) {
          const bit = singoli & -singoli;
          for (let j = 0; j < 9; j++) {
            const i = casa[j];
            if (g[i] === 0 && cand[i] & bit) {
              migliore = i;
              mMask = bit;
              mCnt = 1;
              break;
            }
          }
        }
      }
      // Gabbie: cifre obbligatorie (presenti in ogni combinazione) con un solo posto.
      if (killer && mCnt > 1) {
        for (let c = 0; c < nG && mCnt > 1; c++) {
          if (gVuote[c] < 2) continue;
          const obblig = X![((511 & ~gUsate[c]) * 10 + gVuote[c]) * 46 + gResto[c]];
          if (!obblig) continue;
          let una = 0;
          let due = 0;
          for (const i of gruppi[c].celle) {
            if (g[i] !== 0) continue;
            due |= una & cand[i];
            una |= cand[i];
          }
          if ((obblig & una) !== obblig) return;
          const singoli = obblig & ~due;
          if (singoli) {
            const bit = singoli & -singoli;
            for (const i of gruppi[c].celle) {
              if (g[i] === 0 && cand[i] & bit) {
                migliore = i;
                mMask = bit;
                mCnt = 1;
                break;
              }
            }
          }
        }
      }
    }
    if (migliore === -1) {
      esito.soluzioni++;
      const sol = Array.from(g);
      if (!esito.prima) esito.prima = sol;
      else if (!esito.seconda) esito.seconda = sol;
      return;
    }
    let n = 0;
    for (let d = 0; d < 9; d++) if (mMask & (1 << d)) cifre[n++] = d + 1;
    const ordine = Array.from(cifre.subarray(0, n));
    if (rng) {
      for (let k = ordine.length - 1; k > 0; k--) {
        const j = Math.floor(rng() * (k + 1));
        const t = ordine[k];
        ordine[k] = ordine[j];
        ordine[j] = t;
      }
    }
    const i = migliore;
    const r = RIGA[i];
    const co = COLONNA[i];
    const b = BOX[i];
    const gi = gruppiDi[i];
    for (const v of ordine) {
      const bit = 1 << (v - 1);
      g[i] = v;
      rM[r] |= bit;
      cM[co] |= bit;
      bM[b] |= bit;
      for (const c of gi) {
        gUsate[c] |= bit;
        gResto[c] -= v;
        gVuote[c]--;
      }
      ricorri();
      g[i] = 0;
      rM[r] &= ~bit;
      cM[co] &= ~bit;
      bM[b] &= ~bit;
      for (const c of gi) {
        gUsate[c] &= ~bit;
        gResto[c] += v;
        gVuote[c]++;
      }
      if (esito.soluzioni >= opz.limite || esito.interrotta) return;
    }
  };

  ricorri();
  esito.nodi = nodi;
  return esito;
}
