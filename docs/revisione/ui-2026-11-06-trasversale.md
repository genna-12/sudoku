# Revisione UI/UX 06/11 — area trasversale

Revisore: Opus, sola lettura del codice. Build servita su `http://127.0.0.1:4180/sudoku/`, PeerJS locale, Chromium di Playwright.
Area: transizioni tra schermate, gesto indietro e cronologia, focus e dialoghi, temi e momento del cielo, reduced-motion, safe-area e altezze, orizzontale, testi minimi e bersagli di tocco, contrasto, prestazioni delle animazioni, PWA.

Script, screenshot e misure: `/tmp/claude-0/-home-claude/db626878-f30e-5cfe-8af8-6ed804e2390a/scratchpad/rev-trasversale/` (sotto: `SP/`). Archivi di prova generati con i moduli veri (`SP/gen.mjs`); ogni contesto usa una frase sua (`rev-trasv-<pid>-<n>`), così due prove non finiscono nella stessa stanza personale.

Riepilogo: **1 alta, 9 medie, 9 basse.**

---

## Difetti

### T1 — alta — I fogli dentro una schermata si aprono fuori vista quando la pagina è scorsa
- **Dove**: tutti i `.foglio-velo` montati DENTRO una `.schermata`: dettaglio del fiore nel Giardino (`Giardino.tsx:383`), conferme del menù in Home (`Menu.tsx:290`: ricomincia da zero, cancella partita), avviso profilo dell'Ingresso (`Ingresso.tsx:114`), frasi in Partita (`Partita.tsx:364`, oggi innocuo perché la Partita non scorre). Non colpisce i fogli montati da App fuori dalla schermata (posta, conferma nuova, arretrati).
- **Come riprodurlo**: 360×640, Giardino, scorrere a 500 px, toccare un fiore: la pagina si sfoca ma il foglio non si vede (è a 1125..1470 px con viewport 640). Oppure Home a 360×640 → menù → "Ricomincia da zero": il foglio sta a 505..779 px, i bottoni fuori schermo. In orizzontale 844×390 il foglio "ricomincia" è tutto fuori (567..796) e il velo copre solo la colonna centrale, non i lati.
- **Causa**: `tema.css:267` `.schermata { animation: entra 0.25s var(--curva) both; }`. Il riempimento `both` lascia per sempre `transform: matrix(1,0,0,1,0,0)` sulla schermata (misurato), e un elemento con transform diventa il blocco contenitore dei `position: fixed` discendenti: `.foglio-velo` (`tema.css:2165`, `inset: 0; align-items: end`) si allinea al fondo della SCHERMATA (alta 795–1986 px), non della finestra. Con `.schermata{animation:none}` il foglio torna a 279..624 (misurato). Il focus iniziale usa `preventScroll: true` (`dialogo.ts:63`), quindi nemmeno la tastiera porta il foglio in vista.
- **Correzione**: `animation-fill-mode: backwards` per `entra` (e `entra-dissolvenza`): serve solo lo stato iniziale prima che parta; `esce` può restare `both`. In alternativa montare i fogli in un portale fuori dalla `.schermata`.
- **Prove**: `SP/T1-foglio-fiore-scroll500.png`, `SP/T1-foglio-ricomincia-360.png`, `SP/T1-foglio-ricomincia-orizz.png`, `SP/misura-T1-foglio-fiore.txt`, `SP/misura-T1-ricomincia-360.txt`, `SP/misura-T1-ricomincia-844.txt` (script `p12.mjs`, `p13.mjs`, `p13b.mjs`).

### T2 — media — Vittoria in orizzontale: carta tagliata sopra e sotto, niente scorrimento
- **Dove**: overlay `.vittoria` (`tema.css:1841-1852`).
- **Come riprodurlo**: 844×390, finire una partita, dopo il capitolo arriva la carta: è alta 594 px in una finestra di 390, va da −102 a 492 px; titolo e mascotte tagliati sopra, "Nuova partita" visibile a metà, "guarda la griglia" (y 425) irraggiungibile. La rotella non scorre niente (`overflow-y: visible`, carta centrata con `place-items: center`).
- **Causa**: overlay fisso a griglia centrata senza `overflow-y: auto` né regola per schermi bassi (la regola `@media (orientation: landscape) and (max-height: 500px)` di `tema.css:3598` copre solo la Partita).
- **Correzione**: `.vittoria { overflow-y: auto; align-items: safe center; }` e, in orizzontale basso, carta più compatta (mascotte più piccole o striscia del cielo nascosta). Su Android il gesto indietro chiude la carta; su iPhone in PWA no (vedi in fondo).
- **Prove**: `SP/scr-844x390-vittoria.png`, `SP/misura-vittoria-orizzontale.txt` (script `p6.mjs`).

### T3 — media — "Nuova partita" dalla Vittoria: la carta sparisce di colpo e la griglia nuova entra da vuoto
- **Dove**: `App.tsx:1047` (`onNuova` → `iniziaNuova` → `vai('partita')`), `App.tsx:185` (vai esce subito se la schermata è già `partita`).
- **Come riprodurlo**: vincere, toccare "Nuova partita". Registrazione per fotogramma: a t=6 ms carta opaca; a t=99 ms né carta né griglia (la Partita nuova parte da opacità 0), poi 250 ms di entrata su fondo vuoto. La spec T7.2 chiede "senza salto a vuoto (la griglia nuova entra sotto la dissolvenza)". Stesso taglio netto su "guarda la griglia" (`App.tsx:1048`): la carta scompare in un fotogramma.
- **Causa**: la Vittoria non ha uscita; la Partita ha una `key` nuova e rimonta con `entra` da opacità 0.
- **Correzione**: dare alla Vittoria un'uscita di 150 ms (stato "esce" come per `CapitoloScena`) e montare la Partita nuova mentre la carta svanisce sopra; oppure, per il cambio di griglia, non rianimare l'entrata della `.schermata` (solo la griglia).
- **Prove**: `SP/misura-vittoria-nuova-partita.txt`, `SP/T-nuova-da-vittoria-sequenza.png` (script `p20.mjs`).

### T4 — media — Banner "Aggiorna" stretto a metà schermo, su 4 righe, copre la testata della partita e non si chiude
- **Dove**: `.aggiornamento` (`tema.css:3281-3299`), `Aggiornamento.tsx:56-72`.
- **Come riprodurlo**: con il markup del componente montato in `.app` (lo stesso nodo che rende React) a 360×640 in Partita: il banner è largo 191 px e alto 121, testo su 4 righe, copre livello, tempo e chip di connessione e parte del cruscotto. Resta finché non si tocca "Aggiorna" (che ricarica la pagina).
- **Causa**: `left: 50%; transform: translateX(-50%)` senza larghezza esplicita: la larghezza "shrink-to-fit" è limitata alla metà destra della finestra (180 px), `max-width: calc(100vw - 24px)` non basta. Nessun bottone per rimandare.
- **Correzione**: `width: max-content; max-width: calc(100vw - 24px)` (o `left: 12px; right: 12px; margin-inline: auto; width: fit-content`); in Partita metterlo in basso o farlo chiudibile ("dopo").
- **Prove**: `SP/T-aggiornamento-partita-360.png`, `SP/misura-banner-aggiornamento.txt` (script `p17.mjs`).

### T5 — media — I toast "banner" tagliano il testo con i puntini a 360 px
- **Dove**: `.toasts > .toast { white-space: nowrap }` (`tema.css:1756`), `.toast-banner` con `max-width: calc(100vw - 32px)`, `overflow: hidden`, `text-overflow: ellipsis`.
- **Come riprodurlo**: 360×640, Home → menù → cancella partita → conferma: il banner mostra "La partita resta nel giardino, come g…" (scrollWidth 376 > 326). Stesso destino per "Da un altro tuo dispositivo: si ricomincia da zero", "Questo file non è una memoria del giardino" e le frasi lunghe del partner in Home.
- **Causa**: una sola riga obbligata.
- **Correzione**: `white-space: normal` con al massimo 2–3 righe e raggio meno "pillola"; insieme a `width: max-content` per non cadere nello stesso limite di T4.
- **Prove**: `SP/T-toast-tagliato-360.png` (script `p21.mjs`).

### T6 — media — Al primo caricamento il tema forzato arriva dopo: fondo nel colore sbagliato
- **Dove**: `App.tsx:214-218` (il `data-tema` si mette in un `useEffect`), `main.tsx:8` (il montaggio aspetta `ripristinaDaIndexedDB`), `index.html` senza script iniziale.
- **Come riprodurlo**: tema "mattina" con sistema scuro (o "notte" con sistema chiaro), ricaricare: per i primi ~200 ms (in questo ambiente; su telefono di più: bundle + IndexedDB) la pagina vuota è nel tema del sistema, poi scatta. Registrazione: t=35 ms `tema=-` cielo `#0a1613` testo crema; t=214 ms `tema=chiaro`.
- **Causa**: il tema scelto vive in `localStorage` (`sudoku-coppia-tema`) e si applica solo dopo il primo render React.
- **Correzione**: tre righe inline in `index.html`, nel `<head>`, che leggono `sudoku-coppia-tema` e mettono `data-tema` su `<html>` prima del CSS (in try/catch).
- **Prove**: `SP/misura-fouc-blu-presenza.txt` (script `p3.mjs`).

### T7 — media — Barra di stato: colore fisso scuro e, su iPhone, testo bianco sopra il cielo chiaro
- **Dove**: `index.html:6` `<meta name="theme-color" content="#0a1613">`, `index.html:8` `apple-mobile-web-app-status-bar-style = black-translucent`, manifest `theme_color`/`background_color` `#0a1613` (`vite.config.ts`).
- **Come riprodurlo**: dimostrato dal codice. Con `black-translucent` iOS disegna ora e batteria in BIANCO sopra la pagina; col tema "mattina" (o sistema chiaro in "auto") il cielo in alto è `#eef0e4`, quindi la barra di stato diventa illeggibile. Su Android la barra resta verde scurissima anche col tema chiaro.
- **Correzione**: due `theme-color` con `media="(prefers-color-scheme: light|dark)"` e aggiornamento del meta da `cambiaTema` quando il tema è forzato; su iOS valutare `default` per il tema chiaro (il meta iOS si legge all'avvio: va scelto prima, nello script di T6).
- **Prove**: da verificare su iPhone (vedi in fondo).

### T8 — media — Il cielo "vira" verso il blu a ogni apertura dell'app
- **Dove**: `tema.css:123-124` (`:root { transition: --blu-presenza 1.6s }`), `App.tsx:223-225` (la presenza del blu si imposta in un effetto, partendo dall'`initial-value: 0` di `tema.css:23-27`).
- **Come riprodurlo**: aprire l'app con 8 fiori: `--blu-presenza` va da 0 a 1 in 1,6 s dopo il primo disegno. Col sistema chiaro la fascia alta passa da rgb(233,235,225) a rgb(213,218,223), le stelle compaiono in dissolvenza; col sistema scuro il blu sale di 6–8 livelli. Succede a ogni avvio, non solo quando arriva un fiore.
- **Causa**: transizione sempre attiva sul root e valore iniziale 0.
- **Correzione**: impostare `--blu-presenza` prima del primo disegno (stile inline calcolato nello script di T6 o in `useState` iniziale con `useLayoutEffect`) e accendere la transizione solo dopo il primo fotogramma (classe sul root).
- **Prove**: `SP/misura-fouc-blu-presenza.txt`, `SP/T-avvio-light-0.png` contro `SP/T-avvio-light-2s.png`, `SP/misura-avvio-blu-presenza-costo.txt` (script `p3.mjs`, `p18.mjs`, `p19.mjs`).

### T9 — media — Animazioni infinite su `box-shadow` (ridisegno a ogni fotogramma) per tutta la partita in coppia
- **Dove**: `.cella.partner { animation: cerca 1.8s infinite }` (`tema.css:1008-1012`, keyframes `box-shadow` e `background`), `.regalo.disponibile` `regalo-pulsa` (`tema.css:1547`), `.bottone.primario.invito` `invito` (`tema.css:2594`).
- **Come riprodurlo**: in Partita, metà del tempo CPU del thread principale in 4 s: senza cursore del partner 0,10 s e 39 ricalcoli di stile; con `.cella.partner` 0,54 s e 241 ricalcoli (circa 5 volte). Il cursore del partner c'è quasi sempre quando si gioca in due: è il caso d'uso principale, per tutta la durata della partita, sul telefono a batteria.
- **Causa**: `box-shadow` e `background` non si animano sul compositore.
- **Correzione**: animare l'opacità (o `transform: scale`) di uno pseudo-elemento `::after` che porta già l'alone; stesso schema per `regalo-pulsa` e `invito`.
- **Prove**: `SP/misura-cerca-box-shadow.txt` (script `p15.mjs`), inventario `SP/misura-animazioni.txt`.

### T10 — media — Tastiera e gesto indietro possono agire sulla schermata che sta uscendo
- **Dove**: `tema.css:276-279` (durante l'uscita solo `pointer-events: none`), `App.tsx:184-192` (`vai`).
- **Come riprodurlo**: (a) in Home focus su "Giardino", Invio, entro 30 ms focus su "Continua" e Invio: si finisce in Partita (vince l'ultimo); i clic del mouse invece sono bloccati bene (verificato). (b) "Continua" e gesto indietro 60 ms dopo: la Home si dissolve del tutto (opacità 0) e poi rientra (circa 470 ms di lampeggio sulla stessa schermata) invece di annullare l'uscita.
- **Causa**: la schermata uscente non è `inert`; un `vai` verso la schermata attuale durante l'uscita lascia finire la dissolvenza e poi la fa rientrare.
- **Correzione**: `inert` sulla `.schermata` mentre `data-esce` c'è; in `vai`, se `s === schermata` durante un'uscita: togliere `verso` (annulla l'uscita) senza rifare l'entrata.
- **Prove**: `SP/misura-doppia-navigazione-indietro-focus.txt` (casi b, c; script `p9.mjs`).

### T11 — bassa — Dopo ogni cambio di schermata il focus finisce sul `<body>`
- **Dove**: `App.tsx:147-154` (`arriva`): nessuna gestione del focus.
- **Come riprodurlo**: con la tastiera, Invio su "Continua": dopo l'entrata `document.activeElement` è `BODY`; il primo Tab riparte dall'inizio della Partita. Un lettore di schermo non annuncia la schermata nuova.
- **Correzione**: dopo `arriva`, focus (con `preventScroll`) sul titolo della schermata nuova reso `tabIndex=-1`, o sul suo primo bottone.
- **Prove**: `SP/misura-doppia-navigazione-indietro-focus.txt` (caso d).

### T12 — bassa — Reduced-motion: due animazioni sfuggono alla regola "solo dissolvenza"
- **Dove**: (1) `.vittoria-carta { animation: atterra 0.4s 0.1s … both }` a `tema.css:3124` viene DOPO il blocco reduced-motion di `tema.css:2503-2528` con la stessa specificità e lo annulla: con reduced-motion la carta entra ancora con `translateY(30px) scale(0.9)` (misurato fotogramma per fotogramma). (2) Il pallino del chip del partner in Partita (`Partita.tsx:241`, classe `partner-chip pallino-in-attesa`, non `.pallino`) continua `respiro` infinito (scala e opacità): la regola ridotta colpisce solo `.pallino i`.
- **Altrimenti**: con reduced-motion Home e Giardino hanno solo `entra-dissolvenza`, il capitolo solo `cap-dissolvi` (inventario completo in `SP/misura-animazioni.txt`).
- **Correzione**: spostare la regola ridotta dopo `tema.css:3124` (o aggiungere `.vittoria .vittoria-carta`) e aggiungere `.partner-chip i` all'elenco.
- **Prove**: `SP/misura-reduced-motion-perdite.txt` (script `p16.mjs`), `SP/misura-animazioni.txt` (script `p4.mjs`).

### T13 — bassa — Durante l'entrata la pagina è più alta di 8 px (barra di scorrimento che lampeggia su desktop)
- **Dove**: `keyframes entra` (`tema.css:269-274`, `translateY(8px)`).
- **Come riprodurlo**: 390×844, Home → Partita: `scrollHeight` 852 contro una finestra di 844 per circa 200 ms (h=852→844 nel registro). Sui desktop con barre di scorrimento classiche (Windows) compare e sparisce la barra, e la pagina si sposta di lato; sul telefono le barre sono sovrapposte e non si vede.
- **Correzione**: `overflow-y: clip` sull'`.app-sotto`/`.app` durante l'entrata, oppure entrata dall'alto (`translateY(-8px)`) o solo dissolvenza su desktop.
- **Prove**: `SP/misura-transizioni-home-partita-giardino.txt` (script `p1.mjs`).

### T14 — bassa — Cambiando schermata lo scorrimento resta dov'era
- **Dove**: `App.tsx:147-154` (`arriva` non riporta lo scroll in cima).
- **Come riprodurlo**: 844×390, Home in fondo, "cambia profilo o frase": l'Ingresso si apre a scrollY 220 (in fondo), senza titolo né scelta in vista. Da Home scorsa a 422 con un tocco su "Giardino" (via tastiera o JS) il Giardino si apre a 422, dentro il diario. Il gesto indietro di sistema invece ripristina 0 (scroll restoration del browser), e in verticale le schermate corte annullano l'effetto.
- **Correzione**: `window.scrollTo(0, 0)` in `arriva`, prima di montare la nuova schermata.
- **Prove**: `SP/T-scroll-ingresso-844.png`, `SP/T-scroll-home-giardino-844.png` (script `p22.mjs`, `p24.mjs`).

### T15 — bassa — La conferma "Nuova partita?" sopravvive al cambio di schermata
- **Dove**: `App.tsx:186` (`vai` chiude solo la posta), `App.tsx:1084-1096` (`ConfermaNuova` montata a prescindere dalla schermata).
- **Come riprodurlo**: dimostrato dal codice. Nel Giardino toccare un germoglio con una partita toccata in corso: si apre "Nuova partita?"; se intanto il partner apre una partita nuova (`suMessaggio` caso `nuova`, `App.tsx:510`) si passa alla Partita col foglio ancora aperto, e "Nuova" esegue la ripresa del germoglio di prima sopra la partita appena arrivata.
- **Correzione**: in `vai` anche `setDaConfermare(null)` (e valutare `cartaVai`).

### T16 — bassa — Le chiacchiere girano anche a pagina nascosta e partono verso il partner
- **Dove**: `useOgniTanto` (`useMascotte.ts:124-145`), usato in `App.tsx:720`.
- **Come riprodurlo**: dimostrato dal codice. Il timer di 40–60 s non guarda `document.visibilityState`; con l'app in background (rallentato dal browser ma vivo) genera una chiacchiera e la manda col P2P (`inviaReazione`, `App.tsx:743`). Gli equivalenti in `Semino.tsx:1381-1403` e `Giardino.tsx:262-281` invece si fermano a pagina nascosta.
- **Correzione**: stesso schema di `Semino.tsx` (fermare su `visibilitychange`, ripartire al ritorno).

### T17 — bassa — Bersagli di tocco sotto i 44 px
- **Dove e misure** (testo minimo 12 px rispettato ovunque: nessun testo sotto i 12 px in nessuna schermata a nessuna misura):
  - Partita in orizzontale: `.barra .icona-bottone` 40×40 ("Torna alla home", "Altre opzioni"), da `tema.css:3598+` (`width: 40px; height: 40px`).
  - Bottoni testuali `button.link` alti 36 px: "cambia profilo o frase" (Home), "guarda la griglia" (Vittoria).
  - Tastierino a 360 px: tasti 37×58 (larghezza dettata dai 9 tasti in fila; accettabile, segnalato per completezza).
  - Mascotte del Giardino toccabili 40×58 (locale, Giardino).
  - Gli interruttori del menù sono 46×28 ma dentro una `label` a tutta riga: non è un difetto.
- **Correzione**: `min-height: 44px` per `.link` e per gli icona-bottone anche in orizzontale.
- **Prove**: `SP/misura-360x640.txt`, `SP/misura-844x390.txt`, `SP/misura-390x844.txt`, `SP/misura-768x1024.txt`, `SP/misura-1280x800.txt` (script `p5.mjs` con `misure.mjs`).

### T18 — bassa — Zoom con le dita bloccato
- **Dove**: `index.html:5` `user-scalable=no`.
- **Nota**: Android Chrome lo rispetta (iOS lo ignora). Il doppio tocco è già disinnescato da `touch-action: manipulation` (`tema.css:161`), quindi `user-scalable=no` non serve al gioco e toglie solo l'ingrandimento a chi ne ha bisogno.
- **Correzione**: togliere `user-scalable=no`.

### T19 — bassa — Sotto il lettore dei capitoli e la Vittoria la Partita resta montata e anima
- **Dove**: `App.tsx:913-1097` (la Partita resta sotto, `inert`).
- **Misura**: con il capitolo aperto sono attive 17 animazioni infinite, di cui 9 della Partita coperta (mascotte che respirano/dormono, pallino); sotto la Vittoria 12. Sono su transform/opacità (compositore), quindi il costo è basso.
- **Correzione** (facoltativa): classe sull'`.app-sotto` quando c'è il lettore, con `animation-play-state: paused` per i discendenti.
- **Prove**: `SP/misura-animazioni.txt`.

---

## Cose verificate senza difetti
- Transizioni Home↔Partita↔Giardino: uscita 150 ms (opacità 1→0, −8 px), poi entrata 250 ms; nessuna doppia entrata, nessun fotogramma con due schermate, `animationend` filtrato bene sul nome `esce*` e sulla classe `.schermata`, riserva a 270 ms. Clic ripetuti col mouse durante l'uscita bloccati. Capitolo: apertura in dissolvenza dopo 900 ms di festa; chiusura capitolo → Vittoria pulita.
- Gesto indietro: guardia unica nella cronologia (`history.length` resta 3), indietro dal Giardino torna alla Home, nel capitolo resta.
- Contrasto: 4 fasce del momento (orologio forzato a 06:30, 12:30, 19:00, 22:30) × sistema chiaro/scuro + i due temi forzati, Home e Giardino a 360×640: nessun testo sotto 4,5:1 (3:1 per i grandi) contro lo sfondo campionato dietro ogni testo (`SP/contrasto.py`, `SP/misura-contrasto.txt`, panoramica `SP/contr-griglia-home.png`). Il momento si applica davvero (`data-momento` corretto in ogni caso).
- Reduced-motion: a parte T12, solo dissolvenze (Home e Giardino: 1 animazione; prima 23 e 21).
- Animazioni: tutte le keyframes su transform/opacità tranne quelle di T9 (e `arrivo`, `lampo-evento`, brevi); timer del tempo di gioco fermo a pagina nascosta; `useMomento` si riarma al ritorno in primo piano.
- Orizzontale 844×390: Partita a due colonne corretta, capitolo leggibile, Home e Giardino scorrono. Nessuno scorrimento orizzontale a nessuna misura.
- PWA: manifest completo (nome, `start_url`/`scope` `/sudoku/`, standalone, icone 192/512/maskable 200 OK); l'icona maskable sta nella zona sicura; aggiornamento con `registerType: 'prompt'` e ricarica alla presa di controllo.

## Solo un telefono vero può verificare
1. **iPhone, tema mattina**: ora e batteria leggibili nella barra di stato (T7); colore della barra su Android col tema chiaro.
2. **Tastiera virtuale**: Ingresso (frase segreta) e foglio "Ricomincia da zero" con la parola da scrivere: con il viewport che non si ridimensiona (default di Chrome Android dal 108 e di iOS) il campo dentro un foglio `fixed` in basso può finire sotto la tastiera; manca `interactive-widget=resizes-content` nel meta viewport.
3. **iPhone in PWA standalone**: esiste un gesto indietro? Se no, in orizzontale la Vittoria (T2) e i fogli fuori vista (T1) restano senza uscita.
4. **Notch in orizzontale** (iPhone con Dynamic Island a sinistra/destra): bottone indietro della testata del capitolo e testata della Partita rispetto a `env(safe-area-inset-left/right)`.
5. **`background-attachment: fixed`** su `html` (`tema.css:172`): iOS lo ignora, quindi nel Giardino (alto ~1900 px) il gradiente del cielo si stira su tutta la pagina invece di restare fermo.
6. **Batteria in una partita lunga in due** con il cursore del partner acceso (T9) e scie di toast/battute: temperatura e fluidità.
7. **Ritorno dal background dopo minuti**: il cielo cambia fascia senza scatto, i timer non si accumulano (chiacchiere di T16), la stanza si riaggancia.
8. **Avvio a freddo** (bundle + IndexedDB): quanto dura davvero il fondo nel tema sbagliato (T6) e il viraggio del cielo (T8).
9. **Barre di scorrimento classiche su PC Windows**: lampeggio di T13.
