// Memoria condivisa via Worker Cloudflare (worker/): giardino, azzeramento e partita in corso
// seguono la frase segreta su qualunque dispositivo.
// URL_SYNC vuoto = sync disattivata (l'app si comporta come senza Worker).
// URL del Worker senza barra finale.
export const URL_SYNC: string = 'https://sudoku-coppia.gennari-lorenzo05.workers.dev';

/** Scritture "normali" (mosse, tick): al massimo una ogni tanto. Il piano gratuito KV dà ~1000 PUT/giorno. */
export const INTERVALLO_SYNC_MS = 60_000;

/** Letture al ritorno in primo piano: al massimo una ogni tanto. */
export const LETTURA_PRIMO_PIANO_MS = 30_000;
