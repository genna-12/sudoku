// Frasi della coppia. Modifica liberamente: una stringa per riga.
// Le frasi compaiono nei momenti di gioco indicati. {nome} viene sostituito col nome del partner.

export const FRASI = {
  /** quando una cella è giusta (compare ogni tanto, non sempre) */
  giusta: ['sei mini', 'brava/o!', 'che testa'],
  /** riga, colonna o box completati */
  completato: ['sei mini', 'mini e geniale'],
  /** numero sbagliato */
  sbagliata: ['sei mini lo stesso', 'quasi!'],
  /** il partner entra nella stanza */
  arrivo: ['{nome} è qui', 'eccoti, mini'],
  /** vittoria */
  vittoria: ['sei mini e abbiamo vinto', 'fatto! insieme'],
  /** frasi inviabili al partner col pulsante apposito */
  invio: ['sei mini', 'ti penso', 'ci sei?', 'mini mini mini'],
} as const;

/** Colori dei due giocatori (chi apre per primo è "a"). */
export const COLORI = { a: '#ff7a59', b: '#5b8def' } as const;
