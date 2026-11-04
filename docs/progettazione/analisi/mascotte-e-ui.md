# Mascotte e interfaccia: inventario (stato al 04/11/2026)

Analisi in sola lettura del codice a commit 25078f4, fatta da un sottoagente per la chat PROG · Sudoku · storia e UX · 04/11. Nulla è stato eseguito; la dimensione del bundle non è misurata.

## 1. Mascotte
**Semino.tsx** (1638 righe, SVG inline, stile in semino.css 24 KB). Esporta `Semino`, `SeminoPianta` (zolla e fiore statici per il giardino) e `SeminoCoppia` (i due vicini).

Props di `Semino`: `stadio` 0-4 (seme, germoglio, fogliolina, pianta, fiore), `umore`, `chi` ('semino'|'semina'), `accessorio`, `taglia`, `impulso`, `sguardo`{x,y}, `attenuato`, `parla`+`frase`, `entrata` ('salto'|'sbuca'|'nessuna'), `seguiPuntatore`, `azione`{tipo,id,verso}, `onSolletico`.

Varianti e stati:
- **12 umori** (`SEMINO_UMORI`): neutro, felice, sorpreso, estasiato, festa, imbarazzato, preoccupato, regalo, saluta, dorme, arrabbiato, euforico. Ognuno ha un'animazione `semino-r-*`. Con `impulso` si riavvia la stessa reazione.
- **Respiro e fronda**: CSS, sfasati per istanza.
- **Ciglia**: ogni 2-6 s, solo con occhi aperti.
- **Sguardo**: vaga ogni 5-9 s oppure segue `sguardo` (la cella selezionata in partita), oppure il puntatore su desktop se `(hover:hover) and (pointer:fine)`.
- **Micro-azioni a riposo** ogni 25-50 s (Semina ×1,4): sbadiglio, stiracchia, gratta, guarda-intorno, saltello. Da fuori anche saluta e salta-verso.
- **Parlato**: bocca a tre forme e cenni per la durata della frase.
- **Solletico**: tocco, tremolio di 250 ms e callback. Tenuto premuto oltre 600 ms è il "soffio".
- **Sonno**: umore 'dorme', zzz, sguardo azzerato.
- **Entrata**: salto o sbuca.
- **Reduced-motion**: resta solo il battito lento delle ciglia. Le micro-azioni sono spente.
- **Identità**: Semino ha accento verde e margherita; Semina blu, tulipano, ciglia e fiocco (parti del corpo, non accessori).

**Logica di umore e sonno**: `useMascotte.ts`.
- La reazione dura 1,8 s (6 s se svegliata di notte), poi si torna al riposo.
- Il riposo è 'dorme' per orario (`config/sonno.ts`: Semino a letto 3:30, sveglio 11:30; Semina 22:00-6:30, un giorno su 4 dorme fino alle 11:30) oppure dopo 60 s senza attività; altrimenti l'umore base.
- Di notte le reazioni sono attenuate (`attenuaUmore` in regole.ts).

**Accessori** (`ACCESSORI` in Semino.tsx; liste per personaggio in `ACCESSORI_DI`):

| id | di chi | dove si disegna | sblocco |
|---|---|---|---|
| occhiali | Semino | davanti | libero |
| cuoco (cappello) | Semino | testa, pianta alzata di 11 | libero |
| palla (pallanuoto) | Semino | davanti | libero |
| chitarra | Semino | davanti | libero (l'elemento di scena è a 40 fiori) |
| surf (tavola) | Semino; Semina solo il giorno del mare in coppia | davanti | 15 fiori |
| corona di fiori | Semina | testa | libero |
| montagna (cappello, zaino, spallacci) | Semina | testa, dietro e davanti, alzata 9 | libero (l'elemento montagna è a 18) |
| cavallo (caschetto e cavallino) | Semina | testa e davanti, alzata 9 | 30 fiori |
| animale (uccellino) | Semina | davanti, posatoio per stadio | libero |

- Mai indossati: Semino montagna e cavallo; Semina il surf, salvo eccezione sopra (`MAI` e `accessorioPermesso` in regole.ts).
- Ogni cambio di accessorio riparte con la `key` e l'animazione `semino-acc-pop`.

**Chi sceglie cosa**
- **Home**, riposo: `useAccessoriRiposo` in Home.tsx. Ogni circa 60 s (RIPOSO_MS ±10%), alternando Semino e Semina, sceglie con `aCasoDiverso` (regole.ts) tra `poolRiposo` = accessori sbloccati del personaggio (`accessoriSbloccati`, soglie da `SBLOCCHI`). Il pool non contiene mai "nessuno": una volta vestiti non tornano nudi. Non cambia mentre un fumetto è aperto, e rimanda di 5 s. Prima dell'arrivo di Semina vale solo Semino. Nei giorni speciali si parte con `GIORNI_SPECIALI[giorno].accessori`.
- **Home**, fumetto aperto: la tappa (`Tappa.accessorio` / `accessorioSemina`) o la chiacchiera (`Chiacchiera.accessorio`) vince sul riposo. Le frasi con accessorio in frasi.ts sono 79 in tutto (animale 13, chitarra 10, montagna 10, cavallo 10, occhiali 9, palla 7, surf 7, corona 7, cuoco 6). L'accessorio si ricava dal testo con `accessorioDi` (regole.ts).
- **Giardino**: un accessorio a caso per personaggio, fisso per visita (Giardino.tsx).
- **Partita**: solo quello della chiacchiera aperta (Partita.tsx). Mascotte a 44 px nel cruscotto, 96 px nel pannello desktop.
- **Senza accessorio**: Ingresso, Vittoria, ScenaSblocco.

**Legame con i fiori**: solo `surf` (15) e `cavallo` (30) sono gated. Gli altri non dipendono dai fiori. Crescita: `stadio = min(4, fiori)` in Home e Giardino; in partita segue la barra di crescita (`stadioDaCrescita`).

Altre decisioni vincolanti sono in CLAUDE.md: i fatti sui personaggi, e prima di 5 fiori Semina non esiste.

## 2. Scene
**Scena.tsx** (652 righe, scena.css 12,5 KB). SVG panoramico con altezza fissa di 220 unità e larghezza del viewBox che segue il contenitore (ResizeObserver, tra 360 e 2600). Elementi (`ELEMENTI_SCENA`, 15):
- fiore (margherita) e semina (tulipano) nell'aiuola in primo piano
- sentiero (15 sassi su una bezier)
- stagno (ninfea, rana, canne, riflesso della luna)
- merlo (sull'albero, che c'è sempre)
- cassetta della posta
- mare e spiaggia (a sinistra, 3 righe di onde animate)
- montagna (a destra, con neve)
- stelle (una per fiore, max 60, e la luna)
- tavola da surf sul muretto
- cavallino
- casetta (finestra sul mare e sulla montagna)
- chitarra appesa alla casetta
- fuochi (razzi nel prato, scoppi solo con `festa`)
- arcobaleno (si accende con `festa`)

Props: `elementi`, `fiori`, `bluPresenza` (tinge il chiarore dall'orizzonte dal verde al blu), `altezza`, `festa`, `sfuma`, `nuovi`, `figli` (slot sul prato per le mascotte del Giardino, `PRATO_Y`=188).

Varianti reali:
- **Fiori**: gli elementi compaiono per soglia e le stelle crescono.
- **Blu**: la presenza di Blu tinge il chiarore.
- **Tema**: notte è il default; mattina con `prefers-color-scheme: light` o `data-tema='chiaro'`, solo ricolorando le variabili `--sc-*`.
- **Elemento nuovo**: entra con `sc-sorge` e `sc-pop`, controllato da `sudoku-scena-visti` in localStorage.

Non esistono: ora del giorno reale, stagioni, meteo. I suggerimenti `Tappa.scena` ('alba','notte','pioggia','prato') non hanno rendering. `inEvidenza` in Home.tsx li scarta (filtra su `ELEMENTI_SCENA`) e conta solo per mare, montagna e stelle, che rifanno l'entrata.

Dove si usa: Home (220 px, sfuma), Giardino (180, con figli), Vittoria (118, `festa`), AnnuncioSblocco (168). È sempre `pointer-events:none`, tranne `.sc-figli`.

**Costo per aggiungere un luogo**
- *Elemento nel panorama* (es. faro, lago, bosco): circa 40-70 righe. Nell'ordine:
  1. id in `ELEMENTI_SCENA`;
  2. voce in `E` e in `SBLOCCHI` in storia.ts;
  3. una `Tappa` con `sblocca` alla stessa soglia (un test lo impone);
  4. blocco JSX con `el('id', ...)` in Scena.tsx;
  5. tinte `--sc-*` e classi in scena.css, più eventuale `@media (prefers-reduced-motion)`;
  6. una `SORPRESE` opzionale.
  Nessuna migrazione: tutto deriva dai fiori. Il vincolo è lo spazio: i lati sono presi da mare (30% di W) e monte (30%), il centro da casetta (x=116), cassetta (-72), cavallino (46), stagno e razzi. Con W=360 le cose rientrano già con regole ad hoc.
- *Luogo vero* (schermata o sfondo proprio, es. spiaggia di sera): servono una prop `luogo` o `momento` che scambi composizione e palette, più i punti d'uso in Home/Annuncio/Vittoria. Stima 150-250 righe, più CSS. Un `momento` (alba/notte/pioggia) è più economico: circa 30 righe CSS per variante per sovrascrivere le variabili `--sc-*`, e per la pioggia circa 20 righe TSX.
- Per far sbloccare le skin in base ai luoghi: oggi non esiste il concetto di "luogo visitato". I candidati più vicini sono la chiave `tappeViste` (tappe già viste, archivio) e `Tappa.scena`. Servirebbe un campo stabile (es. `luoghiVisti`, o derivarlo da `tappeViste`+`scena`) e un campo `luogo`/soglia nell'`Sblocco` tipo 'accessorio'. `accessorioPermesso` ha già il punto d'innesto.

## 3. Schermate
Navigazione: `useState<Schermata>` in App.tsx ('ingresso'|'home'|'partita'|'giardino'), nessun router. Ogni schermata ha `.schermata` con animazione `entra` (0,38 s, fade e +10 px). Non c'è animazione in uscita. Overlay: ScenaSblocco, Vittoria, AnnuncioSblocco, Toasts, banner di aggiornamento.

- **Ingresso** (Ingresso.tsx). Mostra il titolo "Sudoku di coppia", due card profilo (Verde/Blu prima dello sblocco con una goccia; poi Semino/Semina con mascotte a 72 px) e il campo frase segreta (min 4 caratteri). Azioni: scegliere il profilo, scrivere la frase, "Entra come…". Un avviso modale compare se il browser ricorda l'altro profilo. Animazioni: le card respirano a turno (alone e goccia), `entra`, `foglio-sale` per l'avviso. Feedback: `:active` sulla card, errore sul campo con `role=alert`. Passa a Home con `onEntra`.
- **Home** (Home.tsx, MenuHome.tsx). Mostra Scena, pallino di connessione, pulsante giardino (pianta e numero di fiori), menu ⋯, titolo, Eroe (mascotte con fumetto: tappa, chiacchiera, solletico o saluto), "Continua" (mini-griglia, livello, tempo), scelta Sudoku/Killer, 6 livelli e "Nuova partita". Azioni: solletico sulle mascotte, chiudere la tappa con un tocco, continua, modalità e livello (salvati in localStorage), nuova partita, giardino, "cambia profilo o frase". Animazioni: `semino-*`, cursore del segmentato che scivola, scala dei livelli, `invito` sul bottone con un fiore solo, entrata degli elementi nuovi in Scena. Feedback: `:active` su continua, livello, bottone, icona. Al riavvio si parte sempre dalla Home. Verso la Partita: "Nuova partita" (con "Preparo la griglia…" e una pausa di un giro) o "Continua".
- **Menù ⋯** (MenuHome.tsx). Impostazioni (errori, vibrazione, tema auto/notte/mattina), memoria (esporta, importa, stato sync, "Sincronizza ora"), ripartenze (cancella partita, ricomincia da zero), diagnostica rete, versione. Conferme con fogli (`foglio-sale`, `foglio-scorre`); "Ricomincia" richiede due passi e la parola "ricomincia". Si chiude toccando il velo.
- **Partita** (Partita.tsx, Griglia.tsx, Cruscotto.tsx, Tastierino.tsx). Barra con indietro, livello/modalità, timer, chip partner e menu (errori, vibrazione, home). Cruscotto con mascottine, barra di crescita, punti ed errori, fumetto e seme dei regali. Griglia 9×9 (killer con gabbie tratteggiate), strumenti (Annulla, Cancella, Note, Frase) e tastierino con "ne restano". Su desktop il pannello mascotte è accanto. Azioni: selezione della cella (`onPointerDown`), doppio tocco per il faro sul numero, 1-9, pressione lunga sul tasto per le note momentanee, matita, regalo (si sceglie la cella), frase al partner (foglio con 6 proposte o "A caso"), tastiera fisica (1-9, frecce, Backspace, n/p, Ctrl-Z, Esc deseleziona). Animazioni: numero che atterra (300 ms), onde su riga/box completati, respiro della griglia (scala 1,01) sul box chiuso, alone del partner, lampo d'oro per gli eventi, `scatta` sull'errore, tasto che si schiaccia (70 ms), reazione ×1,5 della mascottina, `battuta-entra`. Vibrazione: tastierino 8 ms, pattern in App.tsx. L'uscita è "indietro", che riporta alla Home senza conferma (la partita resta).
- **Vittoria** (Vittoria.tsx). Overlay con 48 coriandoli CSS (`cade`), mini Scena con fuochi e arcobaleno se sbloccati, mascotte in festa, "Fiorita (insieme)!", frase scelta, tempo, punti miei/suoi e bonus. Se c'è una `SORPRESE` per quella soglia, una battuta per tocco prima della frase. Azioni: solletico, "Nuova partita", "guarda la griglia". Animazioni: `entra` sulla carta, pop e coriandoli. Con reduced-motion i coriandoli spariscono.
- **Scena di sblocco** (ScenaSblocco.tsx). L'arrivo di Semina, una volta per dispositivo a 5 fiori. Una battuta per tocco su tutto lo schermo; Semina sbuca alla sua prima battuta; il narratore accende i colori; alla fine "Andiamo". Animazioni: `scena-buio`, `fruscio`, foglie, `accendi`. L'avanzamento è un `onClick` su un div, non da tastiera.
- **Annuncio sblocco** (AnnuncioSblocco.tsx). Dialogo "Nuovo nel giardino: …" con Scena e l'elemento nuovo, più regali (suggerimenti, frasi, accessori). Annuncia solo la soglia più alta tra le nuove. Il focus entra nel dialogo. Si chiude con "Continua".
- **Giardino** (Giardino.tsx). Barra, Scena con le due mascotte sul prato (gesti ogni 20-40 s: saltello, saluta, salta-verso), solletico con fumetto, totali (fiori, punti, errori, miglior tempo) e una card per partita. Il vuoto invita a "Scegliere la prima partita". Azioni: solletico, "Riprendi" solo sui germogli. I fiori finiti sono inerti.
- **Toasts** (Toasts.tsx). `useToasts`: banner 2,4 s o grande 3,6 s, uno alla volta, con coda limitata (oltre 3 si scartano). Fuori dalla partita, la frase del partner esce grande al centro. `useBattute` (in partita): 3,2 s, almeno 1,2 s prima di cedere il posto. Animazioni `banner`, `grande`, `battuta-entra`; con reduced-motion solo dissolvenza.
- **Aggiornamento** (Aggiornamento.tsx). Controllo versione ogni ora, al ritorno in primo piano e su `online`; banner in alto "C'è una versione nuova del giardino" con "Aggiorna" (si ricarica da solo, al massimo dopo 4 s). Animazione `aggiornamento-entra`.

## 4. Audit di usabilità e dinamicità (per impatto)
1. **Storia e sblocchi non rivedibili.** Home mostra solo la tappa più alta non vista; con più soglie saltate le intermedie sono perse. Non esiste diario né guardaroba. Per il progetto "skin per luoghi" manca la base dati. Dove: `tappaDaMostrare` e `sblocchiNuovi` (regole.ts), Home.tsx. Proposta: schermata "Diario" (tappe viste, luoghi, accessori) e guardaroba nel Giardino.
2. **La cassetta della posta è solo disegno.** Il suo testo dice che ci finiscono le frasi, ma non c'è nessuna cronologia. Dove: Scena.tsx (`Cassetta`), `mandaFrase` in App.tsx. Proposta: tappabile, con elenco delle ultime frasi.
3. **Griglia e overlay non accessibili.** Le celle sono div con `onPointerDown` e senza tabindex; ScenaSblocco usa `onClick` su un div; menu con `role="menu"` ma senza `menuitem`, senza Esc e senza focus trap; Vittoria non sposta il focus. Dove: Griglia.tsx, ScenaSblocco.tsx, MenuHome.tsx, Partita.tsx. Proposta: roving tabindex sulle celle, `onKeyDown`, Esc su menu e fogli, focus sul dialogo.
4. **Testi che si perdono in partita.** Battute di 3,2 s, tagliate a 2 righe sul telefono, sopra barra e punti. Il tooltip `title` non funziona al tocco. Il toast grande dura 3,6 s e non si chiude; oltre 3 in coda si scartano. Dove: Toasts.tsx, Cruscotto.tsx, tema.css (`line-clamp` a riga 2723). Proposta: tocco sul fumetto per espandere o chiudere, durata legata alla lunghezza del testo.
5. **Gesti nascosti.** Mascotte toccabili senza segnale, soffio, doppio tocco, pressione lunga per le note. Nessuno swipe (indietro, annulla). Dove: Semino.tsx, Griglia.tsx (`DOPPIO_TOCCO_MS`), Tastierino.tsx. Proposta: un suggerimento una tantum alla prima volta e gesto di bordo per tornare indietro.
6. **Il giardino è mezzo morto.** I fiori finiti sembrano card e non reagiscono; il pulsante giardino in Home è un'icona di 30 px con un numero. Dove: Giardino.tsx (`Pianta`), Home.tsx. Proposta: tap sul fiore apre un dettaglio (partita, chi ha messo cosa, tempo), il pulsante cresce con un'etichetta.
7. **Uscite brusche.** Solo `entra` in ingresso; nessuna animazione in uscita né tra Home, Partita e Giardino; "Nuova partita" ha una pausa e poi stacca. Dove: tema.css `.schermata` (riga 263), App.tsx (`setSchermata`). Proposta: animazione di uscita breve (≤150 ms) con `animationend`, oppure una transizione tra viste.
8. **Mascotte e accessori poco visibili.** 44 px nel cruscotto; in Partita compaiono solo con chiacchiera aperta; assenti in Ingresso, Vittoria e ScenaSblocco; nessuna scelta dell'utente. Dove: Cruscotto.tsx, Vittoria.tsx, Ingresso.tsx. Proposta: portare l'accessorio nelle schermate dove i personaggi sono grandi.
9. **Scena statica rispetto al mondo.** Non conosce ora, meteo o stagione; la notte/mattina dipende dal tema; `Tappa.scena` ('alba','notte','pioggia','prato') non è disegnata. Dove: Scena.tsx, scena.css. Proposta: prop `momento` che sovrascrive le `--sc-*`, calcolata da `dormePerOrario` o dalla tappa aperta.
10. **Incoerenze tra schermate.** Il menu in Partita ha solo errori, vibrazione e home (niente tema né "cancella partita"); due fumetti diversi (Home e Partita); lo stile "sei mini" non ha un posto fisso. Dove: Partita.tsx, MenuHome.tsx. Proposta: un solo menù condiviso.
11. **Testo piccolo.** Alcuni testi a 9,5-11,5 px (tema.css), tra cui `.tasto-resto` e etichette secondarie. Proposta: minimo 12 px.

## 5. Vincoli tecnici
- **Stack**: Vite 8, React 19.3, TypeScript, CSS puro. Dipendenze runtime: solo react, react-dom, peerjs. Nessuna libreria di animazione né UI (regola in CLAUDE.md).
- **Animazioni**: CSS keyframes (circa 32 in tema.css e 20+ in semino.css), più WAAPI (`element.animate`) per solletico, micro-azioni, respiro della griglia e reazione della mascottina.
- **Dimensioni dei sorgenti**: tema.css 84 KB, semino.css 24 KB, scena.css 12,5 KB, font Recursive 109 KB (woff2, latino). Bundle JS non misurato (nessun build); peerjs è la dipendenza più pesante.
- **Colore**: verde `#7CFF4A` e blu `#2F6BFF` solo nei dettagli, mai a blocchi (docs/design/studio-ui.md). Palette "petrolio"; la mascotte usa `--semino-verde` e `--semino-blu`; la scena ricava le tinte con `color-mix` da `--verde`, `--blu`, `--fondo`. Tema: notte, mattina, auto.
- **prefers-reduced-motion**: gestito. 4 blocchi in tema.css, 3 in semino.css, 1 in scena.css; in JS in Semino.tsx (`useRidotto`), Griglia.tsx e Cruscotto.tsx. Con reduced-motion i coriandoli spariscono, i toast diventano dissolvenze, le micro-azioni si fermano.
- **Altro**: viewport con `user-scalable=no`, quindi niente zoom; `touch-action: manipulation`, `overscroll-behavior: none`, safe-area gestite; target tattili 44 px (icone), tasti alti 58-76 px, strumenti 56 px.
- **Test**: vitest in `src/`; `storia.test.ts` verifica coerenza di tappe, sblocchi e accessori per personaggio.
