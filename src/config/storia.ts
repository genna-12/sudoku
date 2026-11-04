// Pacchetti di frasi sbloccati coi fiori, giorni speciali, peso delle eco. Dati puri: tutto deriva dal
// numero di fiori (partite finite) e dalla data, nulla da migrare. Vestiti e ricordi: config/luoghi.ts.
// La storia vera e propria sono i capitoli (config/capitoli.ts, da docs/storia/capitoli.md).
// Fatti vincolanti: Semino (Genna, verde) mare, surf, palla in acqua, PC, cucina, chitarra, notte;
// la montagna lo stanca. Semina (Mati, blu) montagna, cavallo, animali, natura, alba, euforia,
// qualche arrabbiatura; il mare le piace quando c'è Semino. A entrambi piace tantissimo dormire.
import type { ChiParla, FraseConAccessorio } from './frasi';

export interface Sblocco {
  /** solo pacchetti di frasi: elementi del giardino e vestiti vengono dai luoghi (config/luoghi.ts) */
  tipo: 'frasi';
  /** id del pacchetto */
  id: string;
  nome: string;
  descrizione: string;
}

/**
 * Pacchetti di frasi che si sbloccano coi fiori (più voci per soglia): id = `${chi}-${categoria}-${partite}`
 * di FRASI_EXTRA. I regali (suggerimenti) vanno coi capitoli (REGALI_A_CAPITOLO in ui/capitoli.ts);
 * ricordi del giardino e vestiti coi luoghi visitati (config/luoghi.ts).
 */
export const SBLOCCHI: Array<{ partite: number; sblocco: Sblocco }> = [
  { partite: 8, sblocco: { tipo: 'frasi', id: 'semino-chiacchiere-8', nome: 'Le chiacchiere dello stagno', descrizione: 'Semino parla di rane, luna e palla che galleggia.' } },
  { partite: 8, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-8', nome: 'Gli abitanti dello stagno', descrizione: 'Semina presenta rane, libellule e un airone.' } },
  { partite: 12, sblocco: { tipo: 'frasi', id: 'entrambi-invio-12', nome: 'Posta del giardino', descrizione: 'Nuove frasi da mandarvi.' } },
  { partite: 20, sblocco: { tipo: 'frasi', id: 'semino-chiacchiere-20', nome: 'Discorsi notturni', descrizione: 'Semino e le stelle delle tre di notte.' } },
  { partite: 20, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-20', nome: 'Stelle all\'alba', descrizione: 'Semina saluta le stelle quando se ne vanno.' } },
  { partite: 30, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-30', nome: 'Storie di cavallino', descrizione: 'Semina racconta le giornate col cavallino.' } },
  { partite: 30, sblocco: { tipo: 'frasi', id: 'entrambi-serie-30', nome: 'Serie al galoppo', descrizione: 'Nuove frasi per le serie lunghe.' } },
  { partite: 40, sblocco: { tipo: 'frasi', id: 'entrambi-vittoria-40', nome: 'La canzone della vittoria', descrizione: 'Vittorie con la chitarra.' } },
  { partite: 50, sblocco: { tipo: 'frasi', id: 'entrambi-brillante-50', nome: 'Mosse da fuochi d\'artificio', descrizione: 'Nuove frasi per le mosse brillanti.' } },
];

/** Quota delle chiacchiere in Home che ripetono l'eco di un capitolo già letto (circa 1 su 4). */
export const QUOTA_ECO_CHIACCHIERE = 0.25;

// --- giorni speciali -------------------------------------------------------------------

export type GiornoSpeciale = 'mare' | 'montagna';

/** Ogni quanti giorni torna il ciclo; resto del giorno dell'anno per il mare e per la montagna. */
export const GIORNI_SPECIALI_OGNI = 7;
export const RESTO_MARE = 2;
export const RESTO_MONTAGNA = 5;

function giornoDellAnno(d: Date): number {
  const inizio = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - inizio.getTime()) / 86400000);
}

/** Giorno del mare / della montagna (deterministico dalla data locale, uguale sui due dispositivi), o null.
 * Il luogo deve essere già visitato su questo dispositivo: lo filtra chi lo usa (App, con `luoghiVisitati`). */
export function giornoSpeciale(d: Date = new Date()): GiornoSpeciale | null {
  const r = giornoDellAnno(d) % GIORNI_SPECIALI_OGNI;
  if (r === RESTO_MARE) return 'mare';
  if (r === RESTO_MONTAGNA) return 'montagna';
  return null;
}

/**
 * Giorni speciali: accessori a tema e chiacchiere dedicate (si usano al posto delle chiacchiere solite,
 * o in aggiunta), solo se il luogo è già visitato da chi tiene il telefono (App, `luoghiVisitati`).
 * Semino non porta mai montagna/cavallo; Semina al mare c'è solo con Semino.
 */
export const GIORNI_SPECIALI: Record<
  GiornoSpeciale,
  {
    nome: string;
    descrizione: string;
    /** elemento della scena da mettere in primo piano */
    scena: string;
    accessori: Record<ChiParla, string>;
    chiacchiere: Record<ChiParla, FraseConAccessorio[]>;
  }
> = {
  mare: {
    nome: 'Giorno del mare',
    descrizione: 'Oggi Semino porta tutti al mare. Semina viene, perché c\'è lui.',
    scena: 'mare',
    accessori: { semino: 'surf', semina: 'animale' },
    chiacchiere: {
      semino: [
        { testo: 'oggi è il giorno del mare. Ho già la tavola sotto il braccio.', accessorio: 'surf' },
        { testo: 'onde da un metro e mezzo. Perfette. Il sudoku può aspettare. No, scherzo, finiamolo.', accessorio: 'surf' },
        { testo: 'partita di palla in acqua: io contro il merlo. Il merlo non sa nuotare. Vinco io.', accessorio: 'palla' },
        { testo: 'ho preparato i panini per la spiaggia. Semina li ha già mangiati. Erano le otto.', accessorio: 'cuoco' },
        'Semina sta sotto l\'ombrellone a contare i granchi. Ogni tanto mi saluta. Io cado dalla tavola per salutarla.',
        { testo: 'il mare oggi è un sudoku facile: onda, onda, onda, tutte al loro posto.', accessorio: 'surf' },
        'giorno del mare: niente sveglia, niente salite, solo sale e numeri.',
        { testo: 'stasera grigliata sulla spiaggia. Mati, Genna: voi portate la griglia. Quella del sudoku.', accessorio: 'cuoco' },
      ],
      semina: [
        { testo: 'oggi mare con Semino! Ho portato il secchiello per i granchi.', accessorio: 'animale' },
        'lui sulla tavola, io sulla sabbia. Lo applaudo anche quando cade. Soprattutto quando cade.',
        { testo: 'ho trovato una stella marina! Non è una stella alpina, ma le voglio bene uguale.', accessorio: 'animale' },
        'il mare mi piace quando c\'è Semino. Oggi c\'è. Quindi oggi il mare mi piace tantissimo.',
        { testo: 'un gabbiano mi ha rubato mezzo panino. Ho deciso di non arrabbiarmi. È un animale.', accessorio: 'animale' },
        'Semino mi ha insegnato a galleggiare. Galleggio! Un pochino. Con le braccia di Semino sotto.',
        { testo: 'ho fatto un castello di sabbia a forma di montagna. Semino dice che vale.', accessorio: 'corona' },
        'al tramonto il mare diventa blu come me. Lo sapevo che c\'era un motivo.',
      ],
    },
  },
  montagna: {
    nome: 'Giorno della montagna',
    descrizione: 'Oggi Semina porta tutti in montagna. Semino viene, lamentandosi.',
    scena: 'montagna',
    accessori: { semino: 'occhiali', semina: 'montagna' },
    chiacchiere: {
      semino: [
        'giorno della montagna. Già sveglio alle sette. Per lei. Che fatica.',
        { testo: 'ho calcolato il dislivello: troppo. Semina dice che il calcolo è sbagliato. Il calcolo è giusto.', accessorio: 'occhiali' },
        'salita, salita, salita. Mi lamento solo un po\'. Tanto lei è già in cima.',
        { testo: 'ho portato i panini. Almeno al rifugio sarò utile.', accessorio: 'cuoco' },
        'la montagna è una griglia tutta in verticale. Con la fatica in ogni casella.',
        'Semina saltella sui sassi. Io mi siedo su ogni sasso. Lo chiamo riposo attivo.',
        { testo: 'in cima c\'era campo. Ho controllato il PC. Semina mi ha guardato male. Molto male.', accessorio: 'occhiali' },
        'lo ammetto: il panorama è bello. Ma che fatica arrivarci. Domani mare, per riprendermi.',
      ],
      semina: [
        { testo: 'oggi montagna!!! Zaino pronto dalle cinque e mezza.', accessorio: 'montagna' },
        { testo: 'ho visto uno stambecco! Ci siamo guardati. Mi ha capita.', accessorio: 'animale' },
        { testo: 'giro a cavallo fino all\'alpeggio. Semino ci raggiunge a piedi. Prima o poi.', accessorio: 'cavallo' },
        { testo: 'l\'aria qui sa di pino e di vittoria. Finiamo la griglia in cima!', accessorio: 'montagna' },
        'Semino si lamenta ma sale. Questo è amore, credo. O fame: al rifugio c\'è la polenta.',
        { testo: 'le marmotte fischiano. Ho risposto. Abbiamo fatto amicizia.', accessorio: 'animale' },
        { testo: 'alba dalla cima: rosa, oro, blu. Ho svegliato Semino per vederla. Si è arrabbiato. Poi l\'ha vista.', accessorio: 'montagna' },
        { testo: 'ho intrecciato una corona di stelle alpine. Una è per Mati. Le altre pure.', accessorio: 'corona' },
      ],
    },
  },
};
