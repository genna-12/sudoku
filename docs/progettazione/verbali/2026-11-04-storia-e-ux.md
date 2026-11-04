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

## Alternative e obiezioni (si aggiorna durante la sessione)
- (vuoto)
