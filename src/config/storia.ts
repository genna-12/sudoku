// Storia di Semino e Semina, sblocchi del giardino, sorprese alla vittoria e giorni speciali.
// Dati puri: tutto deriva dal numero di fiori (partite finite) e dalla data, nulla da migrare.
// Sostituisce STORIA_SEMINO + STORIA_EXTRA di frasi.ts (le tappe 0–5 sono identiche).
// Chiave stabile di una tappa: `${chi}-${partite}` (una sola tappa per numero di fiori).
// Fatti vincolanti: Semino (Genna, verde) mare, surf, palla in acqua, PC, cucina, chitarra, notte;
// la montagna lo stanca. Semina (Mati, blu) montagna, cavallo, animali, natura, alba, euforia,
// qualche arrabbiatura; il mare le piace quando c'è Semino. A entrambi piace tantissimo dormire.
import type { ChiParla, FraseConAccessorio } from './frasi';

export interface Sblocco {
  tipo: 'elemento' | 'accessorio' | 'frasi' | 'regalo';
  /** elemento: id dell'elemento della scena; accessorio: id dell'accessorio; frasi: id del pacchetto; regalo: id univoco */
  id: string;
  nome: string;
  descrizione: string;
}

export interface Tappa {
  partite: number;
  chi: 'semino' | 'semina' | 'entrambi' | 'nessuno';
  testo: string;
  /** accessorio di chi parla (con 'entrambi': di Semino) */
  accessorio?: string;
  /** accessorio di Semina quando parlano in due */
  accessorioSemina?: string;
  /** ambientazione suggerita: 'alba' | 'notte' | 'mare' | 'montagna' | 'pioggia' | 'stelle' | 'prato' */
  scena?: string;
  /** l'elemento del giardino che compare con questa tappa */
  sblocca?: Sblocco;
}

// --- sblocchi del giardino (elementi della scena SVG) --------------------------------

const E = {
  fiore: { tipo: 'elemento', id: 'fiore', nome: 'Il primo fiore', descrizione: 'Il giardino comincia da qui.' },
  sentiero: { tipo: 'elemento', id: 'sentiero', nome: 'Il sentiero', descrizione: 'Un sentierino di sassi bianchi che attraversa il giardino.' },
  semina: { tipo: 'elemento', id: 'semina', nome: 'Semina', descrizione: 'La semina blu. Era qui da un pezzo, aspettava.' },
  stagno: { tipo: 'elemento', id: 'stagno', nome: 'Lo stagno', descrizione: 'Piccolo, con le rane e la luna dentro.' },
  merlo: { tipo: 'elemento', id: 'merlo', nome: 'Il merlo', descrizione: 'Il primo animale del giardino. Canta fuori tempo, come Semina.' },
  cassetta: { tipo: 'elemento', id: 'cassetta', nome: 'La cassetta della posta', descrizione: 'Ci finiscono le frasi che vi mandate.' },
  mare: { tipo: 'elemento', id: 'mare', nome: 'Il mare', descrizione: 'Onde in lontananza. Il posto di Semino.' },
  montagna: { tipo: 'elemento', id: 'montagna', nome: 'La montagna', descrizione: 'Un profilo all\'orizzonte. Il posto di Semina.' },
  stelle: { tipo: 'elemento', id: 'stelle', nome: 'Il cielo stellato', descrizione: 'Di notte ogni fiore è una stella.' },
  tavola: { tipo: 'elemento', id: 'tavola', nome: 'La tavola da surf', descrizione: 'Appoggiata al muretto, con una montagna disegnata sopra.' },
  cavallino: { tipo: 'elemento', id: 'cavallino', nome: 'Il cavallino', descrizione: 'Pascola nel prato e segue Semino ovunque.' },
  casetta: { tipo: 'elemento', id: 'casetta', nome: 'La casetta', descrizione: 'Una finestra sul mare, una sulla montagna.' },
  chitarra: { tipo: 'elemento', id: 'chitarra', nome: 'La chitarra', descrizione: 'Appesa alla casetta. La vostra canzone non ha ancora un titolo.' },
  fuochi: { tipo: 'elemento', id: 'fuochi', nome: 'I fuochi d\'artificio', descrizione: 'Da adesso ogni vittoria ha i suoi fuochi.' },
  arcobaleno: { tipo: 'elemento', id: 'arcobaleno', nome: 'L\'arcobaleno', descrizione: 'Un capo sul mare, uno sulla montagna.' },
} satisfies Record<string, Sblocco>;

// --- storia ----------------------------------------------------------------------------

export const STORIA: Tappa[] = [
  // Prologo: Semino da solo (invariate, già viste)
  { partite: 0, chi: 'semino', testo: 'Ciao. Sono Semino. Sono piccolo, ma se risolvete i sudoku insieme cresco. Promesso.' },
  { partite: 1, chi: 'semino', testo: 'Il primo fiore! Il giardino comincia da qui.', sblocca: E.fiore },
  { partite: 2, chi: 'semino', testo: 'Stanotte ho sentito un fruscio dall\'altra parte dell\'aiuola. Sarà il vento.' },
  { partite: 3, chi: 'semino', testo: 'Tre fiori. Il fruscio è tornato. Non era il vento.', sblocca: E.sentiero },
  { partite: 4, chi: 'semino', testo: 'Quattro fiori. Stasera mi sento un po\' solo, qui in mezzo. Dai... ne facciamo un altro insieme?' },
  { partite: 5, chi: 'semina', testo: 'Ciao. Sono Semina. Ero qui da un pezzo: aspettavo che il giardino fosse abbastanza grande per due.', sblocca: E.semina },

  // Capitolo 1: l'incontro e le differenze
  {
    partite: 6,
    chi: 'semino',
    testo: 'Semina si è svegliata alle sei e ha salutato ogni fiore per nome. Alle sei io stavo andando a dormire. Ci siamo incrociati sul sentiero e ci siamo detti "buongiorno" e "buonanotte". Insieme.',
    scena: 'alba',
  },
  {
    partite: 7,
    chi: 'semina',
    testo: 'Gli ho chiesto il suo posto preferito. "Il mare." Il mio è la montagna. Ci siamo guardati come due sudoku con la stessa soluzione e numeri diversi.',
    accessorio: 'montagna',
  },
  {
    partite: 8,
    chi: 'semino',
    testo: 'È spuntato uno stagno. Ci ho tirato la palla per vedere se galleggia: galleggia. Semina dice che ci abitano tre rane. Ho chiesto scusa alle rane, una per una.',
    accessorio: 'palla',
    sblocca: E.stagno,
  },
  {
    partite: 9,
    chi: 'semina',
    testo: 'Semino di notte resta sveglio col computer. Io di notte dormo come un ghiro. Abbiamo fatto un patto: lui veglia sul giardino fino alle quattro, io lo apro all\'alba.',
    scena: 'notte',
  },
  {
    partite: 10,
    chi: 'entrambi',
    testo: 'Dieci fiori, ed è arrivato un merlo. Semina gli ha dato un nome in tre secondi. Semino sta ancora valutando le opzioni.',
    accessorio: 'occhiali',
    accessorioSemina: 'animale',
    sblocca: E.merlo,
  },
  {
    partite: 11,
    chi: 'semino',
    testo: 'Ho cucinato per lei. Pasta al pomodoro, niente di speciale. Ha detto "la più buona della mia vita" con la bocca piena. Ho deciso di crederci.',
    accessorio: 'cuoco',
  },
  {
    partite: 12,
    chi: 'semina',
    testo: 'In fondo al sentiero c\'è una cassetta della posta. Dentro finiscono le frasi che vi mandate, Genna e Mati. Le leggo tutte. Non spio: le innaffio.',
    accessorio: 'corona',
    sblocca: E.cassetta,
  },
  {
    partite: 13,
    chi: 'semino',
    testo: 'Le ho chiesto se vuole stare nella stessa aiuola. Ha detto "forse". Da un semino, forse è un sì.',
  },
  {
    partite: 14,
    chi: 'semina',
    testo: 'Ho detto forse. Poi ho spostato le radici di un centimetro verso le sue. Non diteglielo.',
  },
  {
    partite: 15,
    chi: 'semino',
    testo: 'Quindici fiori: laggiù si sente il mare. Ho trovato una tavola da surf. Semina dice che col mare si fa amicizia piano. Io sono già in acqua.',
    accessorio: 'surf',
    scena: 'mare',
    sblocca: E.mare,
  },
  {
    partite: 16,
    chi: 'semina',
    testo: 'Al mare con Semino. Lui sulle onde, io sulla sabbia a fare amicizia coi granchi. Ho deciso: il mare mi piace. Quando c\'è lui.',
    accessorio: 'animale',
    scena: 'mare',
  },
  {
    partite: 17,
    chi: 'semino',
    testo: 'Mi ha insegnato i nomi degli uccelli. Io le ho insegnato cos\'è un bug. Pari.',
    accessorio: 'occhiali',
  },
  {
    partite: 18,
    chi: 'semina',
    testo: 'All\'orizzonte è spuntata una montagna. La MIA montagna. Domani si sale all\'alba! Semino ha chiesto se c\'è l\'ascensore.',
    accessorio: 'montagna',
    scena: 'alba',
    sblocca: E.montagna,
  },
  {
    partite: 19,
    chi: 'semino',
    testo: 'Siamo saliti. Ogni dieci passi mi fermavo a "guardare il panorama". Lei ha capito e mi ha aspettato a ogni curva. In cima, devo dirlo, valeva la fatica. Una volta.',
    scena: 'montagna',
  },
  {
    partite: 20,
    chi: 'entrambi',
    testo: 'Venti. Di notte ogni fiore diventa una stella: lui le conta, lei si addormenta alla terza. Quando non ci siete parliamo di voi. I nostri due giganti.',
    scena: 'stelle',
    sblocca: E.stelle,
  },

  // Capitolo 2: il litigio e la pace
  {
    partite: 22,
    chi: 'semina',
    testo: 'Oggi mi sono arrabbiata. Lui ha detto che la montagna è "una salita senza onde". Io che il mare è "acqua che non sta ferma". Siamo andati a dormire offesi. Lui alle quattro.',
  },
  {
    partite: 23,
    chi: 'semino',
    testo: 'Senza di lei il giardino è silenzioso. Ho provato a chiudere una riga da solo. Ci sono riuscito. Non mi è piaciuto per niente.',
    scena: 'notte',
  },
  {
    partite: 24,
    chi: 'semina',
    testo: 'All\'alba davanti alla mia aiuola c\'era un piatto di pasta e un biglietto: "la montagna è bella perché ci sei tu". La pasta era fredda. L\'ho mangiata tutta.',
    scena: 'alba',
  },
  {
    partite: 25,
    chi: 'entrambi',
    testo: 'Pace fatta. Lui ha appoggiato la tavola da surf al muretto, "così pensi al mare". Lei ci ha disegnato sopra una montagna. Adesso la tavola è di tutti e due.',
    accessorio: 'surf',
    accessorioSemina: 'corona',
    sblocca: E.tavola,
  },
  {
    partite: 27,
    chi: 'semino',
    testo: 'Genna, quando sbaglia un numero, sbuffa. Mati ride. Poi sbaglia lei e ride lui. Noi semini prendiamo appunti: sembra un ottimo sistema.',
    accessorio: 'occhiali',
  },

  // Capitolo 3: costruire il giardino insieme
  {
    partite: 30,
    chi: 'semina',
    testo: 'Trenta! Nel prato c\'è un cavallino. Galoppa come me quando chiudete una riga. Semino lo guarda da lontano. Molto lontano.',
    accessorio: 'cavallo',
    scena: 'prato',
    sblocca: E.cavallino,
  },
  {
    partite: 32,
    chi: 'semino',
    testo: 'Mi ha fatto salire sul cavallino. Ho resistito quattro secondi. Il cavallino ha sbuffato. Credo che ridesse. Ora mi segue ovunque: forse gli sto simpatico.',
  },
  {
    partite: 35,
    chi: 'entrambi',
    testo: 'Abbiamo costruito una casetta. Lui ha fatto i conti, lei ha scelto le finestre: una sul mare, una sulla montagna. Il divano è uno solo. Basta e avanza.',
    accessorio: 'occhiali',
    accessorioSemina: 'corona',
    sblocca: E.casetta,
  },
  {
    partite: 38,
    chi: 'semina',
    testo: 'Lui va a letto alle tre e mezza, io mi sveglio alle sei e mezza. Ci sono tre ore in cui il giardino non lo guarda nessuno. Abbiamo chiesto al merlo di fare il turno.',
    accessorio: 'animale',
    scena: 'notte',
  },
  {
    partite: 40,
    chi: 'entrambi',
    testo: 'Quaranta. Abbiamo appeso una chitarra alla casetta. Lui tiene il tempo, lei canta fuori tempo, il merlo fa il ritornello. È la nostra canzone. Il titolo non c\'è ancora.',
    accessorio: 'chitarra',
    accessorioSemina: 'chitarra',
    sblocca: E.chitarra,
  },
  {
    partite: 43,
    chi: 'semino',
    testo: 'Stanotte Genna ha messo qualche numero, stamattina Mati ha messo gli altri. La griglia si è riempita lo stesso. Funziona così, tra giganti lontani: uno lascia, l\'altro trova.',
    scena: 'notte',
  },
  {
    partite: 45,
    chi: 'semina',
    testo: 'Arrabbiata di nuovo: il cavallino si è mangiato un\'aiuola. Semino ha detto "erano fiori vecchi". Mi sono arrabbiata anche con lui. Poi abbiamo ripiantato tutto insieme.',
    accessorio: 'cavallo',
  },
  {
    partite: 48,
    chi: 'semino',
    testo: 'Le ho preparato la colazione per l\'alba. Per farcela sono rimasto sveglio tutta la notte. Lei crede che mi sia svegliato presto. Lasciamoglielo credere.',
    accessorio: 'cuoco',
    scena: 'alba',
  },
  {
    partite: 50,
    chi: 'entrambi',
    testo: 'Cinquanta! Da oggi ogni vittoria ha i fuochi d\'artificio. Il merlo si è offeso per il rumore. Semino ha calcolato le traiettorie. Semina ha urlato e basta.',
    accessorio: 'occhiali',
    accessorioSemina: 'corona',
    scena: 'stelle',
    sblocca: E.fuochi,
  },
  {
    partite: 53,
    chi: 'semina',
    testo: 'Oggi ho dormito con Semino fino a mezzogiorno. Non l\'avevo mai fatto. Il sole era già alto e nessuno si è arrabbiato. Forse stare bene è questo.',
  },
  {
    partite: 55,
    chi: 'semino',
    testo: 'Ho scritto un programma che risolve i sudoku da solo. Funziona. Non lo userò mai: il bello è farli con lei. E guardare voi due che li fate insieme.',
    accessorio: 'occhiali',
  },
  {
    partite: 58,
    chi: 'semina',
    testo: 'Genna e Mati si mandano "sei mini" dalla cassetta. Non sappiamo bene cosa voglia dire. Però ogni volta, nel giardino, spunta un fiore piccolissimo.',
  },
  {
    partite: 60,
    chi: 'entrambi',
    testo: 'Sessanta. È piovuto, poi è uscito un arcobaleno: un capo sul mare, uno sulla montagna. Ci abbiamo messo un po\' a capirlo. Era il ponte che mancava.',
    scena: 'pioggia',
    sblocca: E.arcobaleno,
  },

  // Epilogo aperto
  {
    partite: 65,
    chi: 'semina',
    testo: 'Sono andata al mare da sola, per la prima volta. Mi mancava qualcuno sulla tavola. Sono tornata di corsa a svegliarlo. Erano le dieci: per lui, l\'alba.',
    scena: 'mare',
  },
  {
    partite: 70,
    chi: 'semino',
    testo: 'Settanta. Io ho imparato a svegliarmi un po\' prima, lei a restare sveglia un po\' di più. In mezzo c\'è un\'ora tutta nostra. La passiamo a guardare voi.',
  },
  {
    partite: 80,
    chi: 'entrambi',
    testo: 'Ottanta fiori. Il giardino non ha più bordi: dove finisce, ne cominciamo un altro pezzo. Non sappiamo fin dove arriva. Ci piace così.',
    scena: 'prato',
  },
  {
    partite: 100,
    chi: 'entrambi',
    testo: 'Cento. Non contiamo più i fiori: contiamo le sere. Voi tornate, noi cresciamo. Il resto della storia lo scrivete voi due, un numero alla volta.',
    scena: 'stelle',
  },
];

/** Chiave stabile di una tappa (uguale a chiaveTappa di stato/archivio). */
export function chiaveDi(t: Pick<Tappa, 'chi' | 'partite'>): string {
  return `${t.chi}-${t.partite}`;
}

// --- sblocchi --------------------------------------------------------------------------

const regalo = (n: number, descrizione: string): Sblocco => ({
  tipo: 'regalo',
  id: `suggerimento-${n}`,
  nome: 'Un suggerimento in più',
  descrizione,
});

/**
 * Tutto ciò che si sblocca, per soglia di fiori (più voci per soglia). Ogni elemento del giardino ha la
 * sua tappa in STORIA (`sblocca`). `frasi` → id del pacchetto = `${chi}-${categoria}-${partite}` di FRASI_EXTRA.
 * `regalo` → un suggerimento in più nella prossima partita.
 */
export const SBLOCCHI: Array<{ partite: number; sblocco: Sblocco }> = [
  { partite: 1, sblocco: E.fiore },
  { partite: 1, sblocco: regalo(1, 'Per il primo fiore: un aiuto in più nella prossima partita.') },
  { partite: 3, sblocco: E.sentiero },
  { partite: 5, sblocco: E.semina },
  { partite: 5, sblocco: regalo(5, 'Semina è arrivata e porta un regalo.') },
  { partite: 8, sblocco: E.stagno },
  { partite: 8, sblocco: { tipo: 'frasi', id: 'semino-chiacchiere-8', nome: 'Le chiacchiere dello stagno', descrizione: 'Semino parla di rane, luna e palla che galleggia.' } },
  { partite: 8, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-8', nome: 'Gli abitanti dello stagno', descrizione: 'Semina presenta rane, libellule e un airone.' } },
  { partite: 10, sblocco: E.merlo },
  { partite: 10, sblocco: regalo(10, 'Il merlo ha portato un aiuto nel becco.') },
  { partite: 12, sblocco: E.cassetta },
  { partite: 12, sblocco: { tipo: 'frasi', id: 'entrambi-invio-12', nome: 'Posta del giardino', descrizione: 'Nuove frasi da mandarvi.' } },
  { partite: 15, sblocco: E.mare },
  { partite: 15, sblocco: { tipo: 'accessorio', id: 'surf', nome: 'La tavola da surf', descrizione: 'Semino può portare la tavola da surf.' } },
  { partite: 18, sblocco: E.montagna },
  { partite: 18, sblocco: regalo(18, 'Dalla cima, Semina ha visto un aiuto.') },
  { partite: 20, sblocco: E.stelle },
  { partite: 20, sblocco: { tipo: 'frasi', id: 'semino-chiacchiere-20', nome: 'Discorsi notturni', descrizione: 'Semino e le stelle delle tre di notte.' } },
  { partite: 20, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-20', nome: 'Stelle all\'alba', descrizione: 'Semina saluta le stelle quando se ne vanno.' } },
  { partite: 25, sblocco: E.tavola },
  { partite: 25, sblocco: regalo(25, 'Pace fatta: un regalo per festeggiare.') },
  { partite: 30, sblocco: E.cavallino },
  { partite: 30, sblocco: { tipo: 'accessorio', id: 'cavallo', nome: 'Il cavallino', descrizione: 'Semina può andare a cavallo nel giardino.' } },
  { partite: 30, sblocco: { tipo: 'frasi', id: 'semina-chiacchiere-30', nome: 'Storie di cavallino', descrizione: 'Semina racconta le giornate col cavallino.' } },
  { partite: 30, sblocco: { tipo: 'frasi', id: 'entrambi-serie-30', nome: 'Serie al galoppo', descrizione: 'Nuove frasi per le serie lunghe.' } },
  { partite: 35, sblocco: E.casetta },
  { partite: 35, sblocco: regalo(35, 'Un aiuto per inaugurare la casetta.') },
  { partite: 40, sblocco: E.chitarra },
  { partite: 40, sblocco: { tipo: 'frasi', id: 'entrambi-vittoria-40', nome: 'La canzone della vittoria', descrizione: 'Vittorie con la chitarra.' } },
  { partite: 50, sblocco: E.fuochi },
  { partite: 50, sblocco: { tipo: 'frasi', id: 'entrambi-brillante-50', nome: 'Mosse da fuochi d\'artificio', descrizione: 'Nuove frasi per le mosse brillanti.' } },
  { partite: 60, sblocco: E.arcobaleno },
  { partite: 60, sblocco: regalo(60, 'Sotto l\'arcobaleno c\'era un aiuto.') },
];

/** Elementi del giardino visibili con questi fiori (id in ordine di comparsa). */
export function elementiSbloccati(fiori: number): string[] {
  return SBLOCCHI.filter((s) => s.sblocco.tipo === 'elemento' && s.partite <= fiori).map((s) => s.sblocco.id);
}

// --- sorprese alla vittoria ------------------------------------------------------------

export type Battuta = { chi: ChiParla | 'nessuno'; umore: string; testo: string };

/** Scene brevi (2–3 battute) mostrate alla vittoria che porta a quel numero di fiori, una volta. */
export const SORPRESE: Array<{ partite: number; battute: Battuta[] }> = [
  {
    partite: 7,
    battute: [
      { chi: 'semina', umore: 'euforico', testo: 'Sette! Il mio numero fortunato!' },
      { chi: 'semino', umore: 'sorpreso', testo: 'Ieri il tuo numero fortunato era il quattro.' },
      { chi: 'semina', umore: 'felice', testo: 'Ogni giorno ne ho uno. Oggi è il sette. Domani vediamo.' },
    ],
  },
  {
    partite: 10,
    battute: [
      { chi: 'nessuno', umore: '', testo: '...cip cip...' },
      { chi: 'semina', umore: 'euforico', testo: 'Un merlo! È venuto per voi! Si chiama... Merlo. No, aspetta. Si chiama Fischio.' },
      { chi: 'semino', umore: 'neutro', testo: 'Io avrei detto Merlo 1.0. Ma Fischio va bene.' },
    ],
  },
  {
    partite: 15,
    battute: [
      { chi: 'semino', umore: 'estasiato', testo: 'Sentite? Sono onde. Il mare è arrivato fino al giardino.' },
      { chi: 'semina', umore: 'sorpreso', testo: 'È bello. È bagnato. È... bello. Vieni anche tu, vero?' },
      { chi: 'semino', umore: 'felice', testo: 'Sempre. Tu stai sulla sabbia, io ti saluto dalla tavola.' },
    ],
  },
  {
    partite: 20,
    battute: [
      { chi: 'semino', umore: 'felice', testo: 'Guarda in alto: venti stelle. Una per ogni fiore.' },
      { chi: 'semina', umore: 'dorme', testo: 'Bellissime... sono le dieci... zzz...' },
      { chi: 'semino', umore: 'imbarazzato', testo: 'Le conto io anche per lei. Buonanotte, Mati. Buonanotte, Genna. Io resto sveglio.' },
    ],
  },
  {
    partite: 25,
    battute: [
      { chi: 'semina', umore: 'imbarazzato', testo: 'Senti... scusa per la storia del mare. Non è acqua che non sta ferma. È acqua che balla.' },
      { chi: 'semino', umore: 'felice', testo: 'E la montagna non è una salita senza onde. È un\'onda che ha deciso di stare ferma per farsi guardare.' },
      { chi: 'semina', umore: 'euforico', testo: 'Pace?' },
    ],
  },
  {
    partite: 30,
    battute: [
      { chi: 'nessuno', umore: '', testo: '...nitrito...' },
      { chi: 'semina', umore: 'euforico', testo: 'UN CAVALLINO! Nel NOSTRO prato! Semino, guarda!' },
      { chi: 'semino', umore: 'preoccupato', testo: 'Lo vedo. Lo vedo benissimo. Da qui. Ciao, cavallino.' },
    ],
  },
  {
    partite: 40,
    battute: [
      { chi: 'semino', umore: 'felice', testo: 'Uno, due, tre, quattro...' },
      { chi: 'semina', umore: 'euforico', testo: 'LA LA LAAA' },
      { chi: 'semino', umore: 'festa', testo: 'Eri partita al due. Ma è venuta benissimo.' },
    ],
  },
  {
    partite: 50,
    battute: [
      { chi: 'semina', umore: 'euforico', testo: 'Cinquanta fiori! Ci vogliono i fuochi!' },
      { chi: 'semino', umore: 'festa', testo: 'Li ho già programmati. Verde, blu, verde, blu. Pronti?' },
      { chi: 'nessuno', umore: '', testo: 'BUM. BUM. BUUUM.' },
    ],
  },
  {
    partite: 60,
    battute: [
      { chi: 'semina', umore: 'sorpreso', testo: 'Ha smesso di piovere. Guarda: parte dal mare...' },
      { chi: 'semino', umore: 'sorpreso', testo: '...e arriva sulla montagna.' },
      { chi: 'nessuno', umore: '', testo: 'Sessanta fiori. Un ponte tra i vostri due posti preferiti.' },
    ],
  },
];

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

/** Giorno del mare / della montagna (deterministico dalla data locale, uguale sui due dispositivi), o null. */
export function giornoSpeciale(d: Date = new Date()): GiornoSpeciale | null {
  const r = giornoDellAnno(d) % GIORNI_SPECIALI_OGNI;
  if (r === RESTO_MARE) return 'mare';
  if (r === RESTO_MONTAGNA) return 'montagna';
  return null;
}

/**
 * Giorni speciali: accessori a tema e chiacchiere dedicate (si usano al posto delle chiacchiere solite,
 * o in aggiunta). Semino non porta mai montagna/cavallo; Semina al mare c'è solo con Semino.
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
