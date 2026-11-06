# Revisione UI/UX: Partita e Vittoria (06/11/2026)

Revisore: area Partita (griglia, tastierino, cruscotto, note, faro, gabbie del Killer, errori, annulla, battute della mascotte, frasi del partner, suggerimenti dei gesti, presenza) e Vittoria (coriandoli, punti, "Nuova partita", "guarda la griglia", passaggio al capitolo).

Metodo: build servita su `127.0.0.1:4180/sudoku/` con PeerJS locale, Playwright (Chromium), da soli e in coppia (Verde + Blu, due contesti), Sudoku e Killer, livelli semini, facile, extreme e supersemini, con profili prima e dopo l'arrivo di Semina (archivio preparato con 6 o 40 fiori e i capitoli già visti). Misure: 360×640, 390×844, 430×932, 768×1024, 1280×800 e 844×390, temi chiaro e scuro, `prefers-reduced-motion`, `hasTouch` e `isMobile`. Gli script e le catture stanno in `/tmp/claude-0/-home-claude/db626878-f30e-5cfe-8af8-6ed804e2390a/scratchpad/rev-partita/` (abbreviato **RP/** qui sotto). L'ora del browser era quella di Roma (04:46-05:10), cioè notte: le mascotte dormivano, e questo conta per P7.

Console: nessun errore né avviso di React in nessuno scenario. Gli unici errori sono quelli del Worker di sync bloccato dal proxy (dipendono dall'ambiente).

Riepilogo: **17 difetti: 4 alti, 8 medi, 5 bassi.**

| ID | Gravità | Titolo |
|---|---|---|
| P1 | alta | Il timer si ferma mentre si gioca (e il bonus di tempo è falsato) |
| P2 | alta | "Annulla" cancella il numero del partner o, senza dirlo, una tua mossa vecchia |
| P3 | alta | Carta di Vittoria in orizzontale: tagliata e senza scorrimento, "guarda la griglia" irraggiungibile |
| P4 | alta | Prima di Semina, sul telefono di Mati Semino le dice "quasi, Genna" |
| P5 | media | "supersemini" nella barra si sovrappone al timer (360 e 390) |
| P6 | media | A 360, dopo Semina, la mascottina di Semina e il seme d'oro coprono i punti del partner |
| P7 | media | Di notte le reazioni diventano frasi di sonno: "zzz... bella mossa... zzz" su un errore e come frase della vittoria |
| P8 | media | Lampo, alone e reazioni dell'ultima mossa si ripetono al rientro e sulla griglia nuova |
| P9 | media | Prima di Semina un errore del partner appare identico al tuo |
| P10 | media | Il suggerimento una tantum dei gesti resta a schermo 1,2 s |
| P11 | media | Foglio "Manda una frase" in orizzontale: "Chiudi" e "A caso" fuori schermo |
| P12 | media | Killer: la nota "1" (e a 360 anche la "2") sta sotto la somma della gabbia |
| P13 | bassa | Reduced-motion: la carta di vittoria si muove ancora e il pallino "in attesa" pulsa |
| P14 | bassa | Senza un capitolo in coda la carta copre subito la griglia, senza i 900 ms di festa |
| P15 | bassa | Il partner che si collega fa spostare timer e titolo nella barra |
| P16 | bassa | Dopo "guarda la griglia" si resta in un vicolo cieco |
| P17 | bassa | Note e somme del Killer sotto i 12 px sui telefoni |

---

## P1 · alta · Il timer si ferma mentre si gioca
- **Dove**: Partita, tutte le misure; si vede anche nella Vittoria ("Finita in 00:02" dopo minuti di gioco).
- **Riproduzione**: entra in partita e resta fermo 6 s: il timer segna 00:06. Poi metti note su una cella, un tocco ogni 600 ms per 15 s: il timer resta **fermo a 00:06**. Con selezioni ogni 400 ms segna 7 s su 10. Nella festa dopo una partita intera il timer segnava 00:00 (`RP/s2-timer.mjs`).
- **Causa**: `src/ui/App.tsx:580-587`: l'intervallo da 1 s dipende da `[inGioco, tick]`, ma `gioco.tick` è una funzione nuova a ogni render (`src/ui/usePartita.ts:376`, non memorizzata). Ogni render di App (mossa, battuta, cursore, umore delle mascotte) cancella e ricrea l'intervallo, così con render più frequenti di 1 s il tick non arriva mai. Effetti a catena: tempo sbagliato nel giardino e nei record, e bonus di vittoria più alto (`bonusVittoria(secondi)`, `regole.ts:96`: "+389 di bonus" con 00:02).
- **Correzione**: rendere `tick` stabile (`useCallback` con dipendenze vuote, visto che legge da `o.current`) oppure tenerlo in un ref e lasciare `[inGioco]` come unica dipendenza dell'effetto.
- **Screenshot**: `RP/s1-festa-390.png`, `RP/s3-vittoria-1-390x844.png`, `RP/s12-A-vittoria.png` ("00:06").

## P2 · alta · "Annulla" cancella il numero del partner o una tua mossa vecchia
- **Dove**: Partita in coppia (390×844).
- **Riproduzione**:
  1. A scrive un 7 sbagliato nella cella Y, poi B scrive 8 in Y. A preme Annulla: Y si **svuota su tutti e due i telefoni**, e l'8 di B sparisce.
  2. A sbaglia in Z1, poi sbaglia in Z2. B corregge Z2 col numero giusto, che diventa definitivo. A preme Annulla: Z2 resta, ma **sparisce il numero di A in Z1**, una mossa più vecchia, senza nessun segnale (`RP/s6-coppia.mjs`, righe "ANNULLA").
- **Causa**: `src/ui/usePartita.ts:188-191` salva solo il valore precedente della cella. `annulla()` (`usePartita.ts:249-254`) lo riscrive senza controllare se nel frattempo la cella è stata cambiata dal partner. Quando la cella è bloccata, `mossa()` restituisce false (`usePartita.ts:180`) e il ciclo passa al passo precedente.
- **Correzione**: nel passo, salvare anche il valore e le note che ho scritto io (e il `ts`). All'annulla, se la cella non è più come l'ho lasciata (scritta dal partner o diventata definitiva), scartare il passo invece di applicarlo, e fermarsi lì: un tocco su Annulla non deve mai saltare a un passo più vecchio. Meglio anche selezionare la cella annullata, così si vede cosa è cambiato.
- **Screenshot**: `RP/s6-A-contemporanee.png` e `RP/s6-B-contemporanee.png` (stato prima dell'annulla). La prova è nel log dello script.

## P3 · alta · Carta di Vittoria in orizzontale tagliata
- **Dove**: Vittoria a 844×390 (telefono in orizzontale, layout supportato dalla Partita).
- **Riproduzione**: vinci una partita col telefono in orizzontale. La carta è alta 570 px in 390: il cielo e il titolo escono sopra (top −90), "Nuova partita" è tagliato in basso (bottom 411) e "guarda la griglia" (425-461) è fuori schermo. La pagina non scorre (`RP/s3-vittoria.mjs 844 390`).
- **Causa**: `src/ui/tema.css:1841-1852`: `.vittoria` è `position: fixed; display: grid; place-items: center` senza `overflow`, e la carta più alta della finestra deborda da tutte e due le parti. Il blocco `@media (orientation: landscape) and (max-height: 500px)` (`tema.css:3598`) non tocca la Vittoria.
- **Correzione**: `.vittoria { overflow-y: auto; place-items: safe center; }` (oppure `align-items: start` e carta con `margin: auto`). In orizzontale, una carta compatta: niente `vittoria-cielo`, mascotte più piccola, punti e bottoni su due colonne.
- **Screenshot**: `RP/s3-vittoria-1-844x390.png`.

## P4 · alta · Prima di Semina, Semino chiama "Genna" anche Mati
- **Dove**: Partita sul profilo Blu, prima dei 5 fiori. Vale per tutte le misure.
- **Riproduzione**: entra come Blu e fai errori in celle diverse, uno ogni 1,3 s. Dopo qualche decina il fumetto di Semino dice **"quasi, Genna"** per l'errore di Mati. La stessa frase arriva anche al telefono di Genna, dove sembra un commento sulla mossa di lei (`RP/s15-nomi.mjs`).
- **Causa**: prima dello sblocco `chiParla()` restituisce `'semino'` per entrambi i ruoli (`src/ui/usePartita.ts:122-124`). `fraseMascotte` prende metà delle volte la voce di Semino (`src/ui/regole.ts:353-354`), che si rivolge a Genna per nome ("preciso, Genna", "Genna, hai il radar acceso", "Genna, ma come?", "quasi, Genna", "Genna, rallenta…": `src/config/frasi.ts:308, 348, 355, 373, 426, 445, 469`). Il commento in `frasi.ts:268-270` dice "dopo lo sblocco": prima dello sblocco nessuno filtra i nomi.
- **Correzione**: prima dello sblocco, sul ruolo `b`, usare solo FRASI (neutre) oppure escludere dalla voce di Semino le frasi che contengono `Genna`. In alternativa: `{reale}` al posto del nome scritto a mano.
- **Screenshot**: `RP/s15-blu-chiamata-genna.png` (si vede anche P5).

## P5 · media · "supersemini" si sovrappone al timer
- **Dove**: barra della Partita, 360×640 (548 px² di sovrapposizione) e 390×844 (92 px²), qualunque modalità. A 430 non succede.
- **Riproduzione**: Nuova partita a livello supersemini: "supersemini" e "00:00" si sovrappongono ("supersemini00:01").
- **Causa**: `.barra-titolo` ha `min-width: 0; flex: 1` (`tema.css:795-801`), ma `.barra-livello` (`tema.css:802`, 19 px, 850) non ha `overflow`, `text-overflow` né riduzione: il testo (116 px) esce dalla sua scatola (74 px a 360, 104 a 390) e passa sotto il timer.
- **Correzione**: `.barra-livello { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }` oppure `font-size: clamp(15px, 4.6vw, 19px)`. Da valutare anche il chip del partner più stretto sotto i 400 px.
- **Screenshot**: `RP/z-barra-360.png`, `RP/s4-killer-supersemini-360x640.png`, `RP/s15-blu-chiamata-genna.png`.

## P6 · media · A 360 la mascottina di Semina copre i punti del partner
- **Dove**: cruscotto della Partita dopo lo sblocco (`in-due`), 360×640, chiaro e scuro. A 390 la mascottina tocca ancora il contatore (317 px²) ma non le cifre.
- **Riproduzione**: profilo con 6 fiori e i capitoli visti, partita qualunque a 360. La testa di Semina sta sopra il numero dei punti del partner (90 px² sulle cifre, 682 px² sul contatore), e il seme d'oro col suo alone copre il bordo destro del contatore (257 px²) e il pallino blu.
- **Causa**: a 360 `.crescita-corpo` è largo 164 px, ma i due contatori (punti ed errori ciascuno) superano quella larghezza. Il nome dello stadio è già nascosto (`tema.css:2772-2776`) e i contatori debordano verso la mascottina (44 px, `tema.css:2733-2736`, `z-index: 3`) e il regalo (`tema.css:1517`).
- **Correzione**: sotto i 380 px, mascottine da 36 px e regalo senza padding laterale. Oppure contatori compatti (errori sotto i punti, come nel pannello desktop), o il regalo nella riga del fumetto.
- **Screenshot**: `RP/z-cruscotto-360-dark.png`, `RP/s11-360x640-dark.png`, `RP/z-cruscotto-360-sb.png`.

## P7 · media · Di notte le reazioni diventano frasi di sonno fuori luogo
- **Dove**: Partita e Vittoria, nelle ore di sonno della mascotte (il momento in cui Genna gioca più spesso).
- **Riproduzione**: alle 04:46 un numero sbagliato riceve come risposta "zzz... bella mossa... zzz", "svegliami quando c'è il sugo pronto", "non è mattina finché non lo dico io", "cinque minuti". La frase della carta di vittoria era "zzz... bella mossa... zzz" (solo) e "zzz... brava... zzz" (in coppia).
- **Causa**: `src/ui/App.tsx:248-253`: `frase()` sostituisce metà delle volte qualunque categoria (sbagliata, sbagliataSerie, completato, vittoria) con `fraseSonno(..., { mossa: true })`, che pesca da `SONNO_MOSSA` ("bella mossa", "brava", `frasi.ts:1242-1254`) anche quando la mossa è un errore o la vittoria.
- **Correzione**: la frase di sonno solo per `giusta` e `chiacchiere`. Per errore e vittoria tenere la frase della categoria, attenuata (eventualmente con "zzz…" davanti). Mai "bella mossa" su un errore.
- **Screenshot**: `RP/s4-sudoku-extreme-360x640-sb.png` (errore → "zzz… bella mossa… zzz"), `RP/s3-vittoria-2-390x844.png`, `RP/s12-A-vittoria.png`.

## P8 · media · Lampo, alone e reazioni dell'ultima mossa si ripetono
- **Dove**: Partita, tutte le misure, da soli e in coppia.
- **Riproduzione**:
  1. Chiudi una riga (lampo), vai in Home e torna con "Continua": il lampo della riga riparte (9 animazioni `lampo`) insieme alla sua battuta.
  2. Fai un errore, aspetta 4 s, Home e poi Continua: ripartono il balzo della mascottina (WAAPI `scale(1.5)`), la reazione imbarazzata con sudore e la scossa del contatore errori (`scatta`).
  3. "Nuova partita" dalla carta (o una nuova aperta dal partner): sulla **griglia nuova** compaiono le bande del lampo della partita vecchia (21 `.fx-lampo` nel DOM).
- **Causa**: `lampo` e `arrivo` sono stato di App (`src/ui/App.tsx:157-158`, impostati in `385`, `347` e `495`) e nessuno li azzera. Partita si rimonta (key per seme) e `Griglia.tsx:263-277` ricrea gli span con l'animazione; anche l'effetto "respira" (`Griglia.tsx:125-134`) gira al montaggio. La mascottina anima al montaggio se `impulso > 0` (`Cruscotto.tsx:114-122`, e lo stesso per Semino in `Semino.tsx:1505-1517`), e `Contatore` con `key={errori}` ha la classe `scatta` fissa (`Cruscotto.tsx:153-154`).
- **Correzione**: azzerare `lampo` e `arrivo` quando cambia il seme e quando si esce dalla partita. In Griglia ignorare un lampo o un arrivo più vecchio di circa 1,5 s (`Date.now() - lampo.id`, perché l'id è un timestamp). In Mascottina e Semino saltare l'animazione al primo render (ref "montato"). `scatta` solo quando `errori` aumenta rispetto al render precedente.
- **Screenshot**: `RP/s7-lampo-ripetuto.png`, `RP/s3-nuova-strip.png` (bande grigie su colonna 9 e riga 9 della griglia nuova), `RP/s12-B-dopo-nuova-di-A.png`.

## P9 · media · Prima di Semina, un errore del partner sembra tuo
- **Dove**: Partita in coppia, prima dei 5 fiori.
- **Riproduzione**: B sbaglia e sul telefono di A Semino (a sinistra, la "tua" mascotte) dice la frase d'errore nel fumetto rosso, senza firma né nome. È identico a quando sbaglia A. Solo il contatore "errori" di destra rivela chi è stato (`RP/s6-coppia.mjs`, "FUMETTO su A per errore di B").
- **Causa**: `src/ui/App.tsx:322-324`: la firma (`prefisso`) si mette solo se `sbloccata`, e il tono `errore` prevale su `suo`.
- **Correzione**: prima dello sblocco, per le reazioni del partner usare la firma col nome vero (già usato nel chip: "Mati"/"Genna") oppure un tono "errore del partner" (bordo rosso più il pallino del suo colore).
- **Screenshot**: `RP/s6-A-errore-di-B.png`.

## P10 · media · Il suggerimento dei gesti dura 1,2 s
- **Dove**: Partita, primo tocco su una cella piena ("Tocca due volte una cella piena: accendo tutti i numeri uguali") o sul tastierino dopo 10 mosse ("Tieni premuto un numero…").
- **Riproduzione**: profilo nuovo. Tocca una cella con un numero e subito dopo scrivi un numero sbagliato: il suggerimento (61 caratteri, 4,5 s secondo `durataBattuta`) è sostituito dopo circa 1,2 s dalla reazione all'errore. È una tantum: segnato come visto, non torna più (`RP/s9-suggerimento.mjs`).
- **Causa**: `src/ui/Toasts.tsx:192`: un commento automatico in attesa accorcia quello a schermo a `MINIMO_BATTUTA_MS`, e il suggerimento (`App.tsx` in `suggerisci`, categoria `suggerimento`) è trattato come un commento qualunque. Per "note", la reazione alla mossa parte nello stesso tocco che fa uscire il suggerimento.
- **Correzione**: dare al suggerimento la stessa protezione delle frasi del partner (resta per tutta la sua durata e salta i commenti automatici), oppure segnarlo come visto solo dopo che è rimasto a schermo per la sua durata.
- **Screenshot**: `RP/s9-suggerimento-faro.png`.

## P11 · media · Foglio "Manda una frase" in orizzontale
- **Dove**: Partita a 844×390.
- **Riproduzione**: tocca "Frase": il foglio va da 16 a 440 px in una finestra di 390. "Chiudi" e "A caso" sono fuori schermo e la rotella o il dito non lo fanno scorrere. Si chiude solo toccando il velo o col gesto indietro.
- **Causa**: `.foglio-frasi` e `.foglio` non hanno `max-height` né `overflow`, e il velo è `position: fixed` con overflow visibile (`tema.css:3505`, blocco orizzontale `tema.css:3598`).
- **Correzione**: `.foglio { max-height: calc(100dvh - 24px); overflow-y: auto }`. In orizzontale, lista delle frasi su due colonne.
- **Screenshot**: `RP/s16-foglio-844x390.png`.

## P12 · media · Killer: le note sotto la somma della gabbia
- **Dove**: Killer, cella con la somma e le note, a tutte le misure. A 360 sparisce anche la "2".
- **Riproduzione**: Killer supersemini, metti le note 1-9 nella cella in alto a sinistra di una gabbia: la somma (con il suo fondo pieno) copre la nota "1". A 360 copre anche la "2".
- **Causa**: `.griglia-killer .note { inset: 16% 11% 9% }` (`tema.css:1077`), ma la somma è alta `max(11px, 2.65cqi)` più il padding (`tema.css:1090-1105`, `3406-3411`) e a 35-41 px di cella supera il 16%. La somma ha `z-index: 2` e `background: var(--bg)`.
- **Correzione**: nel Killer, bordo alto delle note pari all'altezza della somma, ad esempio `top: calc(max(11px, 2.65cqi) + 0.6cqi)`, oppure la prima riga di note spostata a destra della somma.
- **Screenshot**: `RP/z-note-360.png`, `RP/s4-killer-supersemini-360x640.png`.

## P13 · bassa · Reduced-motion: movimento residuo
- **Dove**: Partita e Vittoria con `prefers-reduced-motion: reduce`.
- **Riproduzione**: `document.getAnimations()` mostra `atterra` (translateY più scale) sulla carta di vittoria e `respiro` (scale) sul pallino del chip "in attesa".
- **Causa**: `tema.css:3124-3126` ridefinisce `.vittoria-carta { animation: atterra … }` dopo il blocco reduced-motion di `tema.css:2512`, e il blocco di `3131` non la include. Il pallino del chip: `.partner-chip.pallino-in-attesa i` (`tema.css:473-479`) non rientra in `.pallino i` (`tema.css:2516`).
- **Correzione**: aggiungere `.vittoria-carta { animation-name: entra-dissolvenza }` e `.partner-chip i { animation: none }` al blocco reduced-motion in fondo.
- **Screenshot**: log di `RP/s8-rm.mjs`, `RP/s8-vittoria-rm.png`.

## P14 · bassa · Carta immediata quando non c'è un capitolo
- **Dove**: Partita → Vittoria, con la coda dei capitoli vuota (dopo il capitolo 100, oppure capitoli già letti altrove).
- **Riproduzione**: profilo con 100 fiori e i capitoli visti, completa l'ultima cella: la carta compare subito (opacità 0 → 1 in circa 300 ms) e copre il lampo e la reazione dell'ultima cella. Con un capitolo in coda invece ci sono 900 ms di festa (`RP/s13-transiz.mjs`).
- **Causa**: `src/ui/App.tsx:615`: `vittoriaAperta` non aspetta `festa` (solo il lettore passa da `FESTA_MS`, `App.tsx:603-611`), mentre il commento in `App.tsx:398` dice "il capitolo e la carta arrivano dopo".
- **Correzione**: aggiungere `festa === iniziataFinita` alla condizione di `vittoriaAperta`.
- **Screenshot**: nessuno (misura nel log).

## P15 · bassa · La barra si sposta quando arriva il partner
- **Dove**: barra della Partita, 390×844.
- **Riproduzione**: entra in partita da solo, poi entra il partner: il chip passa da "in attesa" (100 px) a "Mati" (68 px), il timer si sposta di 31 px e il titolo si allarga. La griglia non si muove (`RP/s6-coppia.mjs`, righe SHIFT).
- **Causa**: il chip ha larghezza variabile (`tema.css:817`, `max-width: 120px` senza minimo) e il timer è un fratello in flex (`Partita.tsx:237-249`).
- **Correzione**: chip con `min-width` fisso (o timer allineato a destra con larghezza fissa) e cambio del testo in dissolvenza.
- **Screenshot**: `RP/s6-A-connesso.png`.

## P16 · bassa · "guarda la griglia" porta in un vicolo cieco
- **Dove**: Partita finita, dopo "guarda la griglia".
- **Riproduzione**: dalla carta tocca "guarda la griglia": la griglia piena non ha un segno di "finita", né un modo per riaprire la carta o iniziare la prossima. "Cancella" e "Note" restano attivi e non fanno nulla, e il seme d'oro mostra ancora il numero dei regali (disattivato). Si esce solo con ← e la Home.
- **Causa**: `Partita.tsx` non ha uno stato per `partita.finita` (i bottoni di `Partita.tsx:324-350` sono sempre abilitati salvo Annulla), e `setVittoriaChiusa` (`App.tsx:1048`) non si può annullare.
- **Correzione**: con la partita finita, al posto degli strumenti una riga "Fiorita · Nuova partita", con Cancella e Note disattivati.
- **Screenshot**: `RP/s3-guarda-390x844.png`.

## P17 · bassa · Note e somme sotto i 12 px
- **Dove**: Partita a 360, 390, 430 e 844×390.
- **Misure**: note a 9,2 px (360), 10,6 px (390), 11,8 px (430), 10,7 px (844×390). Somme del Killer a 11 px (minimo voluto nel CSS, `tema.css:3406-3411`).
- **Causa**: `.note { font-size: 2.9cqi }` (`tema.css:1064-1075`). Una cella da 35 px non contiene nove cifre da 12 px.
- **Correzione**: decisione della lead. O un'eccezione esplicita alla regola dei 12 px per note e somme (con peso 700 per compensare), oppure, a 360, note più grandi quando sono al massimo 4 (layout 2×2).
- **Screenshot**: `RP/s4-killer-supersemini-360x640.png`.

---

## Verificato e a posto (nessun difetto)
- Nessuno scorrimento orizzontale o verticale della Partita a nessuna misura. Il tastierino sta sempre nello schermo e il cruscotto non va a capo (altezza 34 px).
- Il fumetto della partita non copre mai griglia, contatori, barra o tastierino (copre solo la barra di crescita, come previsto). A 1280×800 sta nel pannello.
- Mosse contemporanee sulla stessa cella: i due telefoni convergono sullo stesso valore e contano un errore a testa.
- Arrivo di una mossa del partner: solo `pop` sulla cella, l'alone e il cursore. Nessuna cella lampeggia quando arriva lo stato e in 4 s di quiete nessuna animazione.
- Pressione lunga (touch CDP, 600 ms) = nota; tocco normale dopo = valore; dito che scivola via prima di 380 ms = niente.
- Il doppio tocco accende il faro (6 celle). Con menù o foglio frasi aperti i tasti fisici non scrivono, e dopo Esc sì.
- I coriandoli non ripartono (non si può tornare alla carta). Con reduced-motion i coriandoli sono nascosti.
- Partita → capitolo: circa 1 s di festa, poi il capitolo; nessun doppio montaggio. "Nuova partita": la griglia nuova entra in dissolvenza (opacità 0,26 → 1).
- Tema chiaro e scuro: nessuna sovrapposizione diversa tra i due.

## Fuori area (solo annotato)
- Home e Giardino: niente di rilevato in questo giro.
- Trasversale: a 768×1024 c'è una fascia vuota di circa 90 px tra barra e cruscotto (scelta di layout, non verificata).

## Cose che solo un telefono vero può verificare
- Pressione lunga su iOS Safari e in PWA: menù contestuale o lente di selezione (qui c'è `onContextMenu` e il CSS, ma il comportamento di iOS va visto). Su iOS `navigator.vibrate` non esiste.
- Doppio tocco a 320 ms sul dito vero: falsi doppi tocchi scrivendo veloce sulla stessa cella, e lo zoom del doppio tocco con `user-scalable=no` su iOS.
- Carta di vittoria e foglio frasi in orizzontale con notch e barre del browser (`100dvh` e `safe-area-inset`), dopo le correzioni di P3 e P11.
- Fluidità di `backdrop-filter: blur` della Vittoria e dei 48 coriandoli su un Android economico.
- Il timer (P1) e il tick con lo schermo bloccato e poi riacceso (`visibilityState`).
- Leggibilità reale delle note a 360 (P17) alla distanza di gioco, al buio, col tema notte.
