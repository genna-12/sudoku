# Verbale 2026-11-04 — Storia, dialoghi, skin per luoghi, usabilità

Chat: PROG · Sudoku · storia e UX · 04/11 (Fable). Scritto durante la discussione.

## Richiesta di Genna (testuale, 04/11 04:09)
- "Vorrei intanto che l'interfaccia migliorasse in generale la dinamicità e interattività oltre che uno studio a puntino sull'usabilità."
- "vorrei che con l'avanzamento della storia dopo ogni livello apparisse in primo piano la scena con l'avanzamento della storia come quando si presenta per la prima volta semina, in maniera che non vengano persi dettagli durante il corso della storia perche si fanno piu livelli di seguito e poi perche ora tipo da livello 3 a livello 4 non arriva in primo piano niente torni alla home e vedi solo semino che parla ma se non fai attenzione bene a cosa dice non ti rendi conto che dice di sentire un fruscio ecc, per questo vorrei in primo piano alla fine di ogni livello con il tap per continuare la conversazione un po alla volta."
- "obbiettivo principale ora, rendere la storia una progressione di cose che possano insegnare in maniera delicata e fine come affrontare le varie difficoltà e i problemi più profondi o di incompatibilità che si possono incontrare in una relazione."
- "una storia che progredisca ad ogni livello e faccia passare a semino e semina tantissimi momenti belli ma anche momenti di confusione indecisione eccetera basandosi sulle cose che piacciono e che non e su tutte quelle cose che gli accomunano e non."
- "trasformare le conversazioni dei due in veri e propri scambi di battute non banali e profondi che non spieghino sempre il 100% delle cose ma che lascino ogni tanto capire al lettore da se, cose che facciano ragionare e accompagnino il lettore in un ragionamento senza per forza descrivergli al 100% quello che è successo. Un po' come i vecchi cartoni animati di tom e jerry o mickie mouse ecc che al di la di tutto quel silly e cose carine c'era anche qualcosa di profondo."
- "uno studio intero sullo storytelling comprendendo anche l'inserimento di personaggi secondari, non penso di voler un cattivo preferisco che sia un 'viaggio' in cui si incontrano e conoscono tanti altri personaggi chi piu e chi meno e magari fare in modo di poterli rivedere da qualche parte e una volta scritta la storia uno studio sugli scambi di semino e semina."
- "le varie 'skin' dei semini si sblocchino man mano che visitano il mondo tipo la skin di lei in montagna mentre va in montagna e magari li anche lui vestito da montagna e quando vanno al mare da mare ecc. Non voglio una sezione skin ma dal momento che abbiamo visitato un posto ecc poi le skin dei due semini che cambiano in continuazione nella home sono quelle che abbiamo scoperto e non skin a caso che non abbiamo mai visto."
- Contesto: "la mati e io oggi non abbiamo giocato" (collaudo T4 non ancora fatto).

## Stato di fatto (dalle analisi in analisi/)
- 43 tappe (0→100 fiori), ma solo 1 in primo piano (arrivo di Semina, 5 fiori); le altre 42 sono un fumetto in Home. Mini-scene di 2-3 battute in Vittoria a 9 soglie. In Home si mostra solo la tappa più alta non vista: le intermedie si perdono (conferma del problema segnalato da Genna).
- `tappeViste` è unita per coppia dal Worker: se uno vede una tappa, per l'altro risulta vista. Le sorprese in Vittoria richiedono il numero esatto di fiori sul dispositivo.
- Il livello non conta nella storia: ogni partita finita = 1 fiore, qualunque livello.
- "Skin" oggi = 9 accessori (5 Semino, 4 Semina), quasi tutti liberi da subito; nessun concetto di luogo visitato; la Scena è un unico panorama fisso (mare a sinistra, montagna a destra).
- Codice morto: `STORIA_SEMINO` e `STORIA_EXTRA` in frasi.ts mai mostrati.
- UX: i 5 problemi più gravi sono nell'analisi mascotte-e-ui.md §4 (storia non rivedibile, cassetta solo disegno, griglia non accessibile, testi in partita che si perdono, gesti nascosti).

## Interpretazioni proposte a Genna (in attesa di conferma)
1. Un fiore = un capitolo in primo piano, a tocchi, per entrambi, mai perso: coda delle scene non viste in ordine; viste per giocatore, non per coppia; diario per rileggere.
2. La storia è un viaggio per luoghi; ogni luogo porta i vestiti dei due; la Home ruota solo tra i vestiti dei luoghi già visitati. Nessuna sezione skin.
3. Niente morale esplicita: le difficoltà nascono dalle differenze dei personaggi già fissate in CLAUDE.md e il lettore capisce da sé.

## Domande poste a Genna
Lunghezza (partite per serata, serate a settimana); quanto "vera" deve essere la storia e temi vietati; 3-5 difficoltà reali da affrontare; personaggi secondari ispirati a persone/animali veri o inventati; tono delle frasi esistenti da tenere o no.

## Risposte di Genna (04/11 04:31, testuali dove non personali)
- Conferma le due interpretazioni ("Perfette entrambe") e aggiunge: "i personaggi secondari lasciano in qualche modo degli insegnamenti ma [...] non esplicitano le cose bensì noi leggiamo le loro conversazioni e li vediamo magari mentre si fanno dei regali o determinati gesti e capiamo cosa è andato storto e come hanno risolto".
- Sul perché non esplicitare: "per non farlo sembrare banale e soprattutto per evitare l'ai slop nella storia perché voi ai tendere a rendere gli scambi banali e le storie che dichiarano tutto nero su bianco perdendo di emozione".
- "potresti fare uno studio anche sulla scrittura e sulle difficoltà e lezioni di coppia che si dovrebbero insegnare/imparare".
- Lunghezza: "inizia con 100 livelli poi vedremo".
- Riconoscibilità: "si vorrei che si riconoscesse ma non ho modo di darti delle situazioni precise".
- Difficoltà: quattro, elencate da Genna in forma personale; nel repo restano in forma neutra (bibbia §6): vicinanza e spazio; sentirsi al secondo posto; dire come si sta; strade diverse (musica/sport vs ricerca anche all'estero), con la volontà di un compromesso. Il testo originale è nel Project Claude, documento `claude/storia-materiale-riservato.md` (ADR 005: il repo è pubblico).
- Secondari: "non ho nessuno in mente puoi inventare". Frasi esistenti: "va bene" (si tiene lo spirito).
- Mandato: "vorrei facessi tutto in autonomia così domani è finito per l'implementazione adotta l'ufficio di subagenti dedicato ma ho bisogno che presti la massima attenzione e cura nei dettagli della storia e delle conversazioni".

## Decisioni prese in autonomia (da confermare al risveglio)
1. Capitolo prima della carta di vittoria; visti per ruolo; arretrati in coda; nessun "salta tutto"; diario (ADR 001).
2. Otto atti, sette luoghi, sette secondari (più il Mulo per lettera); ordine dei temi dalla ricerca (ADR 002). La scaletta dei 101 capitoli l'ha scritta la chat; i dialoghi li hanno scritti scrittori Opus a lotti sulla scaletta, con revisione separata; i capitoli 0-6, 18, 19, 33, 61, 100 sono della chat.
3. Vestiti per luogo, derivati dai capitoli visti; Semino con `zaino-storto` (cambia la regola "Semino mai da montagna" dei test: ADR 003).
4. capitoli.md come fonte unica con script di controllo (ADR 004).
5. Le parole personali fuori dal repo (ADR 005).
6. Rimosso dal CLAUDE.md il "niente ADR o storico": con una decisione di questa portata serve lo storico (conflitto tra la regola del progetto e la skill, annotato in segnalazioni).

## Alternative scartate
- Storia come diario in prima persona (com'è oggi): racconta invece di mostrare; sostituita da scene al presente.
- Un cattivo o un antagonista: Genna non lo vuole; gli attriti bastano.
- Skin come menù o come premi a soglie di fiori: contro la richiesta; i vestiti derivano dai luoghi.
- Capitolo dopo la carta di vittoria: "Nuova partita" lo salterebbe.
- Visti per coppia (come oggi): uno dei due perde le scene.

## Obiezioni aperte
- Gli arretrati possono essere lunghi per chi ha già molti fiori (migrazione): accettato, con bottone in Home per leggerli quando si vuole.
- La ricerca sulle coppie ha fonti solide solo in parte ([C] da riverificare prima di citarle fuori dal progetto).
- Le stime in righe dei fondali e dei secondari sono della chat UX: da verificare al primo lotto di T5.

## Esito della sessione (chiusura, notte)
- Scritto: bibbia, guida ai dialoghi, scaletta (101 voci), capitoli.md (101 capitoli, 715 battute) con script di controllo e JSON; studio UX; spec T5/T6/T7; ADR 001-005; ricerche; BUSSOLA, STATO, PASSAGGIO; CLAUDE.md, ROADMAP, HANDOFF aggiornati.
- Metodo: scaletta e capitoli chiave scritti dalla chat (Fable); 4 scrittori Opus a lotti; 4 revisori Opus separati con checklist (toccati 25 capitoli su 89, nessuno riscritto da capo); rilettura integrale finale della chat con ritocchi (32, 66, 97, luoghi dell'atto 7, "sei mini" a 6 capitoli).
- Revisione avversaria delle spec: 7 bloccanti integrati (Worker fa PUT e non unisce; migrazione da non riapplicare; visti per ruolo e per era; azzeramento ricevuto; regali una volta sola; stato derivato invece di evento; E2E da riscrivere).
- Giudizi onesti dei revisori da tenere a mente: atto 8 quasi senza attrito; 43 e 45 tiepidi; 91 e 93 elenchi; contare come gag da dosare. Si valuta dopo la lettura in gioco.
