// Orari di sonno delle mascotte (ora locale del dispositivo). A entrambi piace un sacco dormire.
// Semino: va a letto tardissimo e si sveglia tardissimo. Semina: prestissimo e prestissimo.
// Alcuni giorni (uno su SEMINA_DORME_TARDI_OGNI, scelto dalla data) Semina dorme con Semino fino a tardi.

export interface OrarioSonno {
  /** ora (0-23, decimali ammessi) in cui va a letto */
  aLetto: number;
  /** ora in cui si sveglia */
  sveglia: number;
}

export const ORARI_SONNO: Record<'semino' | 'semina', OrarioSonno> = {
  semino: { aLetto: 3.5, sveglia: 11.5 },
  semina: { aLetto: 22, sveglia: 6.5 },
};

export const SEMINA_DORME_TARDI_OGNI = 4;

/** Secondi senza tocchi dopo i quali la mascotte si addormenta (di giorno). */
export const SECONDI_PRIMA_DI_DORMIRE = 60;

function oraDecimale(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/** True se nell'intervallo [aLetto, sveglia) considerando il passaggio della mezzanotte. */
function dentro(ora: number, o: OrarioSonno): boolean {
  return o.aLetto < o.sveglia ? ora >= o.aLetto && ora < o.sveglia : ora >= o.aLetto || ora < o.sveglia;
}

/** Giorno dell'anno, per scelte "a caso ma fisse per tutto il giorno" uguali su entrambi i dispositivi. */
function giornoDellAnno(d: Date): number {
  const inizio = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - inizio.getTime()) / 86400000);
}

export function seminaDormeTardiOggi(d: Date = new Date()): boolean {
  return giornoDellAnno(d) % SEMINA_DORME_TARDI_OGNI === 0;
}

// --- il momento del giorno della scena (studio-ux §5 punto 9) ---------------------------------

export type Momento = 'alba' | 'giorno' | 'crepuscolo' | 'notte';

/** Fasce della scena in ora locale (decimali): ognuna va da `da` (incluso) all'inizio della seguente; la notte passa la mezzanotte. */
export const FASCE_MOMENTO: readonly { momento: Momento; da: number }[] = [
  { momento: 'alba', da: 5.5 },
  { momento: 'giorno', da: 8 },
  { momento: 'crepuscolo', da: 18 },
  { momento: 'notte', da: 20.5 },
];

/** Il momento del giorno all'ora locale di `d`. */
export function momentoDa(d: Date = new Date()): Momento {
  const ora = oraDecimale(d);
  let m: Momento = FASCE_MOMENTO[FASCE_MOMENTO.length - 1].momento;
  for (const f of FASCE_MOMENTO) if (ora >= f.da) m = f.momento;
  return m;
}

/** Millisecondi da `d` al prossimo cambio di fascia (con setHours: giusto anche nei giorni del cambio d'ora). */
export function msAlProssimoMomento(d: Date = new Date()): number {
  let min = Infinity;
  for (const giorni of [0, 1]) {
    for (const f of FASCE_MOMENTO) {
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + giorni);
      t.setHours(Math.floor(f.da), Math.round((f.da % 1) * 60), 0, 0);
      const ms = t.getTime() - d.getTime();
      if (ms > 0 && ms < min) min = ms;
    }
  }
  return min;
}

/** La mascotte sta dormendo per orario (indipendentemente dall'attività). */
export function dormePerOrario(chi: 'semino' | 'semina', d: Date = new Date()): boolean {
  const ora = oraDecimale(d);
  if (chi === 'semina' && seminaDormeTardiOggi(d)) return dentro(ora, { aLetto: ORARI_SONNO.semina.aLetto, sveglia: ORARI_SONNO.semino.sveglia });
  return dentro(ora, ORARI_SONNO[chi]);
}
