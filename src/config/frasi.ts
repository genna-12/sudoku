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
export const STORIA_SEMINO: Array<{ partite: number; chi: 'semino' | 'semina' | 'entrambi'; testo: string }> = [
  { partite: 0, chi: 'semino', testo: 'Ciao. Sono Semino. Sono piccolo, ma se risolvete i sudoku insieme cresco. Promesso.' },
  { partite: 1, chi: 'semino', testo: 'Il primo fiore! Il giardino comincia da qui.' },
  { partite: 2, chi: 'semino', testo: 'Stanotte ho sentito un fruscio dall\'altra parte dell\'aiuola. Sarà il vento.' },
  { partite: 3, chi: 'semino', testo: 'Tre fiori. Il fruscio è tornato. Non era il vento.' },
  { partite: 4, chi: 'semino', testo: 'Ho lasciato una fogliolina vicino al fruscio. Stamattina non c\'era più.' },
  { partite: 5, chi: 'semina', testo: 'Ciao. Sono Semina. Ero qui da un pezzo, aspettavo che il giardino fosse abbastanza grande per due.' },
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
