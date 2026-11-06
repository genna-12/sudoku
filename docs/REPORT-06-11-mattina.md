# Report per Genna: revisione UI, 06/11/2026 mattina

Tutto è online su https://genna-12.github.io/sudoku/: aggiorna la PWA su entrambi i telefoni col banner "Aggiorna".

## Cosa è stato fatto
Quattro revisori hanno controllato ogni schermata a 6 misure:
- schermi: 360, 390 e 430 px di larghezza, tablet e computer, telefono in orizzontale;
- tema chiaro e scuro, le 4 fasce del cielo e "animazioni ridotte";
- uso col dito e col mouse, da soli e in coppia.

Hanno trovato **69 difetti**: 10 gravi, 30 medi, 29 lievi. Dettagli in `docs/revisione/ui-2026-11-06-*.md`.

Quattro implementatori li hanno corretti, un validatore separato ha ricontrollato l'insieme e ha sistemato 3 punti dove i lavori si toccavano. Risultato: 518 test unitari (prima 473) e tutti e 5 gli E2E verdi. Il protocollo tra i telefoni non è stato toccato. Esiti per difetto in `docs/revisione/correzioni-*.md`.

## I difetti gravi, ora corretti
- **Timer**: si fermava mentre si giocava, quindi il tempo e il bonus di vittoria erano sbagliati.
- **Annulla in coppia**: cancellava il numero del partner. Ora annulla solo la tua mossa. Se il partner ha cambiato quella cella, avvisa "Quella cella è cambiata nel frattempo" e non tocca niente.
- **Fogli fuori schermo**: le conferme del menù, il dettaglio del fiore e l'avviso dell'Ingresso si aprivano fuori vista se la pagina era scorsa.
- **Tocco che passava sotto**: chiudere menù, posta o fogli toccando fuori premeva anche il bottone sotto, e si finiva nel Giardino o in partita senza volerlo.
- **Vittoria in orizzontale**: la carta era tagliata e "guarda la griglia" non si raggiungeva.
- **Telefono di Mati prima di Semina**: Semino la chiamava "Genna".
- **Capitoli su tablet, computer e in orizzontale**: il fondale si ingrandiva e spariva.
- **Arretrati aperti dalla Home**: non si potevano chiudere fino all'ultimo capitolo. Ora c'è "Dopo", e Esc e indietro lo chiudono.

## Tra i medi
- **Note e frasi**: le frasi di sonno non sostituiscono più le reazioni agli errori.
- **Ultima mossa**: il lampo non si ripete più al rientro.
- **Killer**: le note non finiscono più sotto la somma.
- **Storia**:
  - Briciola e Nuvola ora compaiono nei capitoli che le fanno entrare: prima non comparivano mai, nemmeno nel 68.
  - Un solo merlo in scena, e Semino non sta più in piedi nello stagno.
  - Tra un capitolo arretrato e l'altro c'è la dissolvenza.
- **Diario**: si chiude per atti, così i fiori non finiscono a metri di distanza.
- **Avvisi**: il banner di aggiornamento e gli avvisi in alto non sono più stretti o tagliati.
- **Batteria**: l'animazione sulla cella del partner non consuma più processore per tutta la partita.

## Scelte da confermare (tutte già fatte, dimmi se le vuoi diverse)
1. **Arretrati dalla Home**: Esc e indietro chiudono senza segnare letto il capitolo a schermo, che resta arretrato. Solo "Dopo" lo segna come letto.
2. **Bottone Giardino**: su telefoni stretti, quando compare "altro dispositivo", mostra solo la piantina e il numero.
3. **Frase grande del partner** che arriva con un foglio aperto: resta sotto il foglio, ma la trovi comunque nella Posta.
4. **Banner "Aggiorna" in Partita**: copre la testata finché non tocchi "Dopo" o "Aggiorna".
5. **Zoom con due dita**: resta bloccato, per non disturbare il gioco. Si può sbloccare.
6. **Note e somme del Killer a 360 px**: restano a 11 px, perché la cella è di 35 px e non ci starebbero più grandi.
7. **Cassetta della posta in Home**: tocca ancora un po' il titolo. Si può spostare il disegno, se dà fastidio.

## Da provare sul telefono (lo stretto necessario)
1. **iPhone**: la barra di stato in alto si legge col tema chiaro, e toccando le celle non compare la tastiera.
2. **Android, dalla PWA installata**: col gesto indietro si chiude il menù, poi si torna alla Home, poi si resta nell'app. Prova anche dopo aver ricaricato la pagina.
3. **Una partita in due**:
   - il timer va avanti normalmente;
   - Annulla dopo una mossa dell'altro mostra l'avviso;
   - chiudere menù e posta toccando fuori non apre niente sotto.
4. **Telefono in orizzontale**: la carta di vittoria scorre e il foglio delle frasi si legge.
5. Il collaudo T8 (HANDOFF, "Da Genna") resta valido.
