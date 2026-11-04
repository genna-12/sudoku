# Bussola — Sudoku di coppia

La leggono all'avvio tutte le chat del progetto. Si cambia solo con decisione di Genna e un ADR (registro in fondo).

## Visione (parole di Genna)
- Project, descrizione: "Io e la mia ragazza siamo a distanza e ci piace molto giocare a sudoku insieme. [...] una pwa da poter utilizzare giocando solo noi due e vietare l'ingresso agli altri, non deve essere complessa [...] le varie modalità in ordine: semini facile medio difficile extreme supersemini [...] interfaccia grafica ui/ux devono essere super dinamiche, fluide e responsive."
- 04/11/2026: "rendere la storia una progressione di cose che possano insegnare in maniera delicata e fine come affrontare le varie difficoltà e i problemi più profondi o di incompatibilità che si possono incontrare in una relazione"; "scambi di battute non banali e profondi che non spieghino sempre il 100% delle cose"; "un po' come i vecchi cartoni animati di tom e jerry o mickie mouse"; "un 'viaggio' in cui si incontrano e conoscono tanti altri personaggi"; "semino e semina devono imparare a stare insieme perché sebbene si vogliano bene si pestano i piedi ogni tanto e devono imparare a incastrare le loro differenze".

## Obiettivi
1. Giocare in due sulla stessa griglia, a distanza, senza account e senza costi.
2. Una storia che cresce con le partite finite e che Mati e Genna leggono ciascuno sul proprio telefono, senza perdere nulla.
3. Interfaccia viva: le mascotte reagiscono, le schermate si muovono, i testi si leggono.

## Cosa il progetto non fa
- Non entra nessun altro: una frase segreta, una coppia. Niente account, niente DB di terzi, niente servizi di clienti.
- Non spiega: nessuna morale, nessun cattivo, nessun tema detto in chiaro nella storia.
- Non ha menù di personalizzazione (skin, temi della storia): tutto deriva dal viaggio.
- Non promette un finale sulla vita vera: la storia resta aperta (cartina a turni, terza strada di nessuno).

## Glossario
- **Fiore**: una partita finita (qualunque livello o modalità). Il numero di fiori è di coppia.
- **Capitolo**: la scena della storia legata a un fiore (0→100), letta una battuta per tocco. **Arretrati**: capitoli non ancora visti da questo giocatore.
- **Eco**: la battuta in Home che richiama l'ultimo capitolo visto.
- **Atto / luogo**: aiuola, giardino, mare, montagna, bosco, città, cucina, lontano, ritorno.
- **Vestito**: accessorio (anche multi-parte) legato a un luogo. **Ricordo**: elemento del panorama del giardino portato da un capitolo.
- **Secondari**: Fischio, Pinza, Nuvola, Nonna Capra, il Mulo, Gufo, Grillo, Briciola.
- **Silly / ombra**: i due livelli di ogni capitolo (gag; cosa vera non detta).
- **Verde/Blu**: i profili prima dell'arrivo di Semina (fiore 5). **Ruolo a/b**: Semino/Semina, dal profilo.

## Direzione attuale
ADR 001-004 (docs/storico/adr/): storia a capitoli in primo piano con visti per giocatore; viaggio per luoghi con secondari; vestiti dai luoghi visitati; capitoli.md come fonte unica. Traguardi: T5 capitoli → T6 luoghi e vestiti → T7 UX. Prima o insieme a T5: T4 collaudo reale (non ancora fatto al 04/11).

## Distinzioni facili da perdere
- "Insegnare" vuol dire mostrare: se un capitolo dice il tema, è sbagliato anche se è bello.
- I temi non si risolvono: un capitolo che "chiude" vicinanza/spazio o le strade diverse è falso (ricerca coppia-lezioni, Trappole).
- Visto è del giocatore, non della coppia; i fiori sono della coppia.
- Prima del fiore 5 Semina non esiste in nessun testo, vestito, eco o profilo.
- Semino non ama la montagna e non lo dirà mai; può piacergli una cosa precisa. Semina al mare solo con Semino. Semino non indossa i vestiti di Semina (può avere i suoi "da montagna").
- Il repo è pubblico: le parole personali di Genna restano nel Project Claude (ADR 005).
- Le battute della storia si cambiano in capitoli.md e si rigenera il JSON, mai nel codice.

## Registro delle modifiche
- 2026-11-04: creata (chat PROG · Sudoku · storia e UX · 04/11). Da approvare da Genna al risveglio.
