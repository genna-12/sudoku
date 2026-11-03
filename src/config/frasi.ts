// Frasi della coppia e voce di Semino. Modifica liberamente: una stringa per riga.
// {nome} = nome del partner, {io} = il tuo nome. Semino parla in prima persona.

export const FRASI = {
  /** cella giusta semplice (compare circa 1 volta su 4) */
  giusta: ['sei mini', 'se(i)mini', 'sei mignon', 'smol', 'mini', 'brava/o!', 'che testa', 'semplice e pulito', 'uno alla volta', 'Semino approva', 'mini ma precisa/o'],
  /** mossa intelligente (hidden single) */
  intelligente: ['occhio fino', 'l\'hai vista!', 'intelligente, mini', 'sei mignon e sveglia/o', 'smol brain? no.', 'Semino ha fatto gli occhi grandi', 'nessun altro posto: giusto'],
  /** mossa brillante (deduzione profonda) */
  brillante: ['BRILLANTE', 'ma come hai fatto', 'mini e geniale', 'Semino è senza parole', 'mossa da campione/essa', 'questa me la segno'],
  /** riga, colonna, box o gabbia completati */
  completato: ['sei mini', 'se(i)mini', 'chiusa!', 'un pezzetto di giardino in più', 'Semino cresce', 'mignon e completa/o'],
  /** serie di celle giuste (5, 10, 15...) */
  serie: ['sei in serie', '{n} di fila, mini', 'non ti ferma nessuno', 'Semino batte le foglioline'],
  /** numero sbagliato */
  sbagliata: ['sei mini lo stesso', 'smol errore', 'mignon, ma sbagliato', 'quasi!', 'Semino fa finta di niente', 'capita anche ai migliori', 'respira, riprova'],
  /** tre errori di fila */
  sbagliataSerie: ['fermati un attimo, mini', 'Semino ti porta un tè', 'guarda le note, dai'],
  /** regalo ottenuto */
  regalo: ['Semino ha un regalo per te', 'un seme d\'oro!', 'te lo sei meritato/a'],
  /** regalo usato (suggerimento) */
  suggerimento: ['Semino sussurra...', 'ecco, qui', 'piccolo aiuto, grande amore'],
  /** il partner entra nella stanza */
  arrivo: ['{nome} è qui', 'eccoti, mini', 'Semino saluta {nome}', 'in due si cresce meglio'],
  /** il partner fa una mossa brillante (lo vedo io) */
  partnerBrillante: ['{nome} ha fatto una mossa brillante', 'hai visto {nome}?', 'applausi per {nome}'],
  /** vittoria */
  vittoria: ['sei mini e abbiamo vinto', 'fatto! insieme', 'Semino è fiorito', 'un altro fiore nel giardino'],
  /** partita ripresa dallo storico */
  ripresa: ['il germoglio si risveglia', 'si riparte da dove eravamo', 'Semino si stiracchia'],
  /** frasi inviabili al partner col pulsante apposito */
  invio: ['sei mini', 'se(i)mini', 'sei mignon', 'smol', 'ti penso', 'ci sei?', 'mini mini mini', 'Semino ti manda un abbraccio', 'manca poco'],
} as const;

/**
 * Storia di Semino (e poi di Semina): una tappa per numero di fiori (partite finite), mostrata
 * la prima volta che la si raggiunge. `chi` dice chi parla. Semina compare dalla tappa 5.
 */
export const SEMINA_SBLOCCATA_A = 5;

/** Scena di sblocco di Semina (a SEMINA_SBLOCCATA_A fiori): battute in ordine, una per tocco. */
export const SCENA_SBLOCCO: Array<{ chi: 'semino' | 'semina' | 'nessuno'; umore: string; testo: string }> = [
  { chi: 'semino', umore: 'neutro', testo: 'Cinque fiori. Il giardino è grande, adesso.' },
  { chi: 'nessuno', umore: '', testo: '...fruscio...' },
  { chi: 'semino', umore: 'sorpreso', testo: 'Il fruscio! È qui, è qui dietro...' },
  { chi: 'semina', umore: 'euforico', testo: 'CIAO! Sono Semina! Vi guardavo giocare da un sacco di tempo, non ce la facevo più a stare zitta!' },
  { chi: 'semino', umore: 'imbarazzato', testo: 'Ehm. Ciao. Io sono Semino. Mi sentivo un po\' solo, prima.' },
  { chi: 'semina', umore: 'felice', testo: 'Lo so. Ti ho sentito. Da adesso le righe le chiudiamo in due.' },
  { chi: 'nessuno', umore: '', testo: 'Il verde è Semino. La blu è Semina. Siete voi, da sempre.' },
  { chi: 'semina', umore: 'euforico', testo: 'E adesso... giochiamo!' },
];
export const STORIA_SEMINO: Array<{ partite: number; chi: 'semino' | 'semina' | 'entrambi'; testo: string }> = [
  { partite: 0, chi: 'semino', testo: 'Ciao. Sono Semino. Sono piccolo, ma se risolvete i sudoku insieme cresco. Promesso.' },
  { partite: 1, chi: 'semino', testo: 'Il primo fiore! Il giardino comincia da qui.' },
  { partite: 2, chi: 'semino', testo: 'Stanotte ho sentito un fruscio dall\'altra parte dell\'aiuola. Sarà il vento.' },
  { partite: 3, chi: 'semino', testo: 'Tre fiori. Il fruscio è tornato. Non era il vento.' },
  { partite: 4, chi: 'semino', testo: 'Quattro fiori. Stasera mi sento un po\' solo, qui in mezzo. Dai... ne facciamo un altro insieme?' },
  { partite: 5, chi: 'semina', testo: 'Ciao. Sono Semina. Ero qui da un pezzo: aspettavo che il giardino fosse abbastanza grande per due.' },
  { partite: 6, chi: 'semino', testo: 'Semina conta i fiori in modo diverso da me. Dice che i miei sono storti. Sono storti.' },
  { partite: 8, chi: 'semina', testo: 'Semino parla nel sonno. Dice "sei mini". Non so a chi.' },
  { partite: 10, chi: 'entrambi', testo: 'Dieci fiori. Ora ci vengono le api. Le contiamo insieme, ma arriviamo a numeri diversi.' },
  { partite: 13, chi: 'semino', testo: 'Le ho chiesto se vuole stare nella stessa aiuola. Ha detto "forse". Da un semino, forse è un sì.' },
  { partite: 15, chi: 'semina', testo: 'Ho detto forse. Poi ho spostato le radici di un centimetro verso le sue. Non diteglielo.' },
  { partite: 20, chi: 'entrambi', testo: 'Venti. Quando non ci siete, parliamo di voi due. Siete il nostro sudoku preferito.' },
  { partite: 30, chi: 'semino', testo: 'Trenta fiori. Ci siamo intrecciati senza accorgercene. Succede, a crescere vicini.' },
  { partite: 50, chi: 'entrambi', testo: 'Cinquanta. Non sappiamo più contare, ma sappiamo che siete tornati. Sempre.' },
];

export { COLORI } from './giocatori';

// ---------------------------------------------------------------------------------------------
// Voce dei due personaggi. Dopo lo sblocco di Semina, ognuno commenta le mosse del PROPRIO
// giocatore (Semino = Genna, Semina = lei) con queste frasi, in aggiunta a FRASI. Prima dello
// sblocco parla solo Semino. `chiacchiere` = frasi a caso quando non succede nulla (Home, attesa).
// ---------------------------------------------------------------------------------------------

export type ChiParla = 'semino' | 'semina';

export const CARATTERE: Record<ChiParla, { descrizione: string; umoreBase: 'neutro' | 'felice' }> = {
  semino: { descrizione: 'ama l\'acqua e la palla in acqua, un po\' nerd, cucina per Semina, suona con lei', umoreBase: 'neutro' },
  semina: { descrizione: 'ama animali e natura, euforica e positiva, ogni tanto si arrabbia, suona con Semino, mangia quello che lui cucina', umoreBase: 'felice' },
};

/** Una frase può portare un accessorio da far indossare alla mascotte mentre parla. */
export type FraseConAccessorio = string | { testo: string; accessorio: string };

export const VOCE: Record<ChiParla, Record<string, FraseConAccessorio[]>> = {
  semino: {
    giusta: ['passaggio pulito', 'compilato senza errori', 'un numero alla volta, come in piscina'],
    intelligente: ['debuggata al volo', 'l\'hai vista prima di me', 'tiro dall\'angolo, dentro'],
    brillante: ['questo è un gol da metà vasca', 'ricorsione pura', 'devo scriverlo nel diario'],
    completato: ['vasca finita', 'chiusa, come una parentesi'],
    serie: ['ritmo da allenamento', '{n} di fila: fiato lungo'],
    sbagliata: ['palla fuori, niente', 'un typo, capita', 'respira, mini'],
    sbagliataSerie: ['pausa acqua?', 'fermo il cronometro un attimo'],
    regalo: ['ho cucinato qualcosa per te', 'regalo: niente codice, solo un aiuto'],
    vittoria: ['stasera cucino io', 'vinto, insieme. Sempre così'],
    chiacchiere: [
      { testo: 'oggi ho fatto quaranta vasche. Mentali.', accessorio: 'palla' },
      { testo: 'ho scritto un programma che conta i fiori. Dice che sono pochi. Lo sistemo.', accessorio: 'occhiali' },
      { testo: 'secondo me la palla in acqua è un sudoku con più schizzi', accessorio: 'palla' },
      { testo: 'ho una ricetta nuova. Mati la assaggia solo se finisce la riga.', accessorio: 'cuoco' },
      { testo: 'provo un accordo nuovo. Se Semina canta sopra, funziona.', accessorio: 'chitarra' },
      'ho perso il segno. Lo ritrovo con una nota a matita.',
      { testo: 'ho rifattorizzato il giardino. Ora le aiuole sono in ordine alfabetico. Semina non è d\'accordo.', accessorio: 'occhiali' },
      { testo: 'stasera risotto. Genna, tu porti il sudoku.', accessorio: 'cuoco' },
    ],
    solletico: [
      'ehi! fa il solletico',
      'le foglie no, le foglie no',
      'ok ok, sono sveglio',
      'ho il semino sensibile',
      'se mi tocchi ancora conto i fiori a voce alta',
      'ahah, basta, perdo il segno',
      'un semino ha la sua dignità',
      'mi hai fatto cadere la fogliolina',
      'tocca Semina, io sono timido',
    ],
  },
  semina: {
    giusta: ['SÌ!', 'bravissima/o!', 'che bella mossa, davvero'],
    intelligente: ['OCCHIO DI FALCO', 'l\'hai vista come un gufo', 'sveglissima/o'],
    brillante: ['NON CI CREDO', 'saltello come un capriolo', 'applausi con tutte le foglie'],
    completato: ['fiorita!', 'un\'aiuola in più, evviva'],
    serie: ['sei un torrente', '{n} di fila, non ti fermi più'],
    sbagliata: ['uffa.', 'ma no, dai', 'niente, riproviamo (sbuffo)'],
    sbagliataSerie: ['OK ORA MI ARRABBIO', 'guardo le note e respiro. Respiro.', 'mi serve un animale da coccolare'],
    regalo: ['un regalo! lo apro io? no, aprilo tu', 'ti ho portato una ghianda, è un aiuto'],
    vittoria: ['FIORITA! TUTTA!', 'adesso mangio quello che ha cucinato Semino', 'vinto! vinto! vinto!'],
    chiacchiere: [
      { testo: 'ho visto un riccio. Era mini. L\'ho chiamato "sei mini".', accessorio: 'animale' },
      { testo: 'Semino cucina e io mangio. Equilibrio perfetto dell\'ecosistema.', accessorio: 'corona' },
      { testo: 'c\'è un merlo che canta sulla nostra aiuola. Secondo me vuole suonare con noi.', accessorio: 'animale' },
      'il muschio cresce lento ma non sbaglia mai una riga.',
      'oggi sono euforica senza motivo. Il motivo è che ci siete.',
      'se Semino rifà la battuta sulla ricorsione mi arrabbio. Un po\'.',
      { testo: 'in montagna l\'aria sa di sudoku risolto. Mati lo sa.', accessorio: 'montagna' },
      { testo: 'sono andata a cavallo. Il cavallo ha chiuso una riga meglio di Semino.', accessorio: 'cavallo' },
      { testo: 'ho fatto una corona di fiori. Ne manca uno: finite la partita.', accessorio: 'corona' },
      { testo: 'dalla cima si vede tutto il giardino. Siete anche voi lì sotto.', accessorio: 'montagna' },
    ],
    solletico: [
      'AHAHAH no no no',
      'mi scappa il fiocco!',
      'ancora! ancora!',
      'ok adesso ti faccio il solletico io',
      'sono fatta di risate e foglie',
      'se mi tocchi divento euforica. Troppo tardi.',
      'il cavallo mi fa meno solletico',
      'uffa, mi hai spettinato la corona',
      'Genna, guarda che ride anche Semino',
    ],
  },
};

/** Tappe della storia aggiunte (si uniscono a STORIA_SEMINO: chiave stabile chi-partite). */
export const STORIA_EXTRA: Array<{ partite: number; chi: 'semino' | 'semina' | 'entrambi'; testo: string; accessorio?: string }> = [
  { partite: 7, chi: 'semino', testo: 'Le ho fatto vedere la piscina. Ha detto che è "un lago con le regole". Poi si è tuffata.', accessorio: 'palla' },
  { partite: 9, chi: 'semina', testo: 'Ho portato Semino nel bosco. Ha contato gli alberi. Tutti. Poi ha sorriso.', accessorio: 'animale' },
  { partite: 14, chi: 'semina', testo: 'Montagna. Semino ha portato il computer. L\'ha usato come vassoio per i panini.', accessorio: 'montagna' },
  { partite: 18, chi: 'semina', testo: 'L\'ho messo a cavallo. Ha detto "è un algoritmo con le zampe". Il cavallo ha approvato.', accessorio: 'cavallo' },
  { partite: 11, chi: 'entrambi', testo: 'Abbiamo suonato insieme per la prima volta. Lui a tempo, io fuori tempo, bellissimo.', accessorio: 'chitarra' },
  { partite: 12, chi: 'semina', testo: 'Semino ha cucinato. Ho mangiato tutto. Ho chiesto il bis. Era un sudoku di sapori.', accessorio: 'corona' },
  { partite: 17, chi: 'semino', testo: 'Mi ha insegnato i nomi degli uccelli. Io le ho insegnato cos\'è un bug. Pari.' },
  { partite: 25, chi: 'semina', testo: 'Mi sono arrabbiata per una riga sbagliata. Lui ha aspettato. Poi abbiamo riso.' },
  { partite: 40, chi: 'entrambi', testo: 'Quaranta. Abbiamo un merlo, un riccio e una ricetta nostra. E voi due.' },
];
