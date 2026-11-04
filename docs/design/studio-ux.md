# Studio UX — capitoli, fondali, diario, eco e dinamicità

Scritto il 04/11/2026 per la chat PROG · Sudoku · storia e UX. Per Genna (deve capire e approvare) e per la chat tech lead (implementa). Parte dalle decisioni già prese (bibbia §9) e dall'audit in `docs/progettazione/analisi/mascotte-e-ui.md` §4, che qui non si rifà. Telefono di riferimento: 390×844, una mano, pollice in basso. Regole di colore e tempi da `studio-ui.md`: verde e blu solo nei dettagli, nessuna reazione oltre 400 ms, tutto spento con reduced-motion.

Ogni scelta non ovvia ha il suo motivo dopo la freccia (→).

## In breve (per Genna)
- Finita la griglia: un attimo di festa sulla griglia, poi il capitolo a tutto schermo, poi la carta con i punti.
- Il capitolo si legge toccando ovunque; c'è un bottone per tornare indietro; non c'è "salta".
- L'ultimo tocco non può saltare niente: per uscire serve il bottone "Continua".
- Niente avanzamento automatico: ognuno legge al suo ritmo.
- Se ci si è persi tanti capitoli (4 o più), l'app chiede se leggerli adesso o dopo dal diario.
- Ogni luogo ha un fondale semplice; il giardino usa lo stesso disegno della Home.
- I personaggi secondari hanno un posto fisso nel fondale e un fumetto color crema col nome sopra.
- Le lettere del Mulo sono un foglio di carta che si riempie una riga per tocco.
- In Home dopo il capitolo parla l'eco; i due cambiano vestito insieme ogni minuto e mezzo circa.
- Il diario sta nel Giardino; si rilegge tutto, i capitoli non letti hanno un puntino.
- Il resto dell'app: testi in partita che durano quanto serve, transizioni tra schermate, gesto indietro di Android, giardino e cassetta toccabili.

---

## 1. La schermata del capitolo

### 1.1 Cosa si vede
Un overlay a tutto schermo (`Capitolo.tsx`, generalizza `ScenaSblocco.tsx`), sopra la partita appena finita. Dall'alto in basso:

```
┌────────────────────────────────────┐
│ CAPITOLO 12 · AL MARE       2 di 3 │  testa: 12 px, testo-2, maiuscoletto
│ La riva                            │  titolo: 17 px, peso 650, crema
│                                    │
│        cielo del luogo             │  fondale (tutto lo schermo, dietro)
│   Semina cammina lungo la riva.    │  ← nota scenica (narra): corsivo,
│   Si allontana.                    │    centrata, senza fumetto, nel cielo
│                                    │
│      ┌──────────────────────┐      │
│      │ Dove vai?            │      │  ← fumetto, sopra chi parla,
│      └───▽──────────────────┘      │    coda verso di lui
│                     PINZA          │  ← etichetta del secondario
│    (Semino)       (pinza)  (Semina)│  palco: linea del suolo al 70%
│ ~~~~~~~~~~~ sabbia / prato ~~~~~~~ │
│                                    │
│  ‹          ● ● ● ○ ○ ○        ›   │  piede: indietro, punti, avanti
└────────────────────────────────────┘
```

- **Fondale**: copre tutto lo schermo, `aria-hidden`. Il suolo sta al 70% dell'altezza → il pollice lavora sul piede, gli occhi sul fumetto, nessuno dei due copre i personaggi.
- **Personaggi**: Semino a sinistra, Semina a destra (come `SeminoCoppia`), taglia 120 px (100 sotto i 700 px di altezza). Chi parla sale di 4 px e scala a 1,04; gli altri vanno `attenuato` (opacità 0,8). Indossano i vestiti di `@vestiti`. In scena c'è chi ha almeno una battuta o un vestito nel capitolo.
- **Secondario**: al centro, più piccolo (60% della taglia), in un **posto fisso per id** (`POSTI_SECONDARI`): Fischio e Gufo in alto su un ramo/filo del fondale, Pinza sulla sabbia, Nuvola dietro Semina, Nonna Capra su una roccia, Grillo sotto il lampione, Briciola sul bancone. → si riconosce dal posto prima ancora che parli. Compare alla sua **prima battuta** (con `sbuca`, 360 ms), non prima → l'entrata dice "è arrivato qualcuno". Al massimo due secondari in scena (bibbia §4); il 99 è l'unica eccezione, con i secondari in fila sul suolo a taglia 45%.
- **Fumetto**: uno solo alla volta, sopra chi parla, larghezza max 300 px, 16 px, CASL 1 (la "voce"). Bordo: verde-filo per Semino, blu-alone per Semina, **crema neutro** per i secondari, più l'etichetta col nome sopra il fumetto (11 → 12 px, maiuscoletto, testo-2) → il colore resta dei due, i secondari non lo prendono. Briciola e Nuvola non parlano: le loro battute (se scritte) diventano note sceniche.
- **Nota scenica (`narra`)**: niente fumetto; è una didascalia nel cielo, sotto il titolo, corsivo 15 px crema all'85%, centrata. Mentre c'è una nota nessuno parla, i due guardano verso il secondario o tra loro. → si distingue a colpo d'occhio "cosa succede" da "cosa si dice". Le azioni descritte non si recitano (niente animazioni per "il sasso rotola"): solo l'umore dell'ultima battuta di ciascuno, come oggi → costo fisso, nessun lavoro per capitolo.
- **Testa**: "Capitolo 12 · al mare" e il titolo del capitolo, sempre visibili. "2 di 3" solo se ci sono arretrati in coda. Per l'aiuola: "nell'aiuola"; per lontano: "lontano".
- **Punti**: uno per battuta, pieni fino a quella attuale (stile `sorpresa-passi`). → dice quanto manca senza numeri.

### 1.2 Tocco, indietro, salto
- **Avanti**: tocco **ovunque** (fumetto, sfondo, personaggi) → un solo gesto da imparare, bersaglio enorme, si legge con il pollice. Nessuna differenza tra fumetto e sfondo; il solletico sui personaggi è spento nel capitolo.
- **Guardia**: per 300 ms dopo ogni nuova battuta i tocchi sono ignorati → evita il doppio tocco che salta una battuta (il rischio più grosso su telefono).
- **Indietro**: bottone vero "‹" in basso a sinistra (48×48), visibile dalla battuta 2. Non una zona invisibile a sinistra → nessun gesto nascosto, e chi tocca a caso il bordo non torna indietro senza volerlo.
- **Salto**: **nessun "salta"** dentro un capitolo → sono 4-8 battute, ~20 secondi; il visto è per giocatore, quindi saltare significa perdere la storia per sempre (il diario aiuta, ma nessuno ci torna). Unica via d'uscita, solo con arretrati: vedi 1.4.
- **Fine**: all'ultima battuta il tocco sullo schermo **non fa più niente**; dopo 400 ms sale dal piede il bottone primario "Continua" (o "Andiamo" al 5) e prende il focus → l'ultimo tocco frettoloso non salta la carta di vittoria né il capitolo dopo.
- **Nessun auto-avanzamento** → si legge a velocità diverse, spesso parlando al telefono con l'altra persona; un testo che scappa è il problema n. 4 dell'audit, non va rifatto qui.
- **Aiuto**: "tocca per continuare" (12 px, testo-2) sotto i punti, solo nelle prime due battute dei primi tre capitoli letti; se dopo 5 s non si tocca, il "›" fa un piccolo cenno una volta. Poi sparisce per sempre (`aiutoCapitoloVisto`, localStorage per dispositivo).

### 1.3 Animazioni (CSS, curva `--curva`, ease-out)
| cosa | come | ms |
|---|---|---|
| apertura | fondale in dissolvenza, testa scende di 6 px | 360 |
| personaggi presenti | `salto` esistente, sfalsati di 80 ms | 300 |
| battuta che esce | dissolvenza + scala 0,96 | 120 |
| battuta che entra | da +6 px e scala 0,96, a 1 | 220 |
| nota scenica | solo dissolvenza (è "voce fuori campo") | 220 |
| secondario alla prima battuta | `sbuca` dal suo posto | 360 |
| "Continua" | sale di 8 px, dopo 400 ms | 240 |
| chiusura | dissolvenza dell'overlay mentre la carta di vittoria entra | 200 |

Reduced-motion: tutto diventa dissolvenza da 120 ms, niente salti né `sbuca`, i colori del 5 si accendono di colpo, i dettagli animati dei fondali sono fermi.

### 1.4 Arretrati
Coda in ordine dal più vecchio al più nuovo (`codaCapitoli(fiori, visti)` in regole.ts), l'ultimo è sempre quello del fiore appena fatto. Fra un capitolo e l'altro: "Continua" → dissolvenza del fondale (se cambia luogo, 360 ms), "2 di 3" si aggiorna.
- Con **4 o più** capitoli in coda (telefono nuovo, l'altro ha giocato da solo per giorni), prima del primo compare una carta: "Ti sei perso 9 capitoli. Li leggi adesso?" con "Leggi dal 23" e "Dopo, dal diario". → 9 capitoli sono ~3 minuti mentre l'altra metà aspetta; scegliere è meglio che subire. "Dopo" non segna niente: restano "da leggere" e la coda si ripropone alla prossima vittoria, sempre in ordine.
- **Visto si segna all'arrivo sull'ultima battuta** (non all'apertura, come oggi) → chiudere l'app a metà non fa perdere il capitolo.

### 1.5 Capitolo 5 (l'arrivo di Semina)
Stesso componente con `rivelazione`. Indicatore normale ("Capitolo 5 · nell'aiuola · Il fruscio ha un nome": il titolo non svela). Il fondale parte **spento**: solo il verde (lucciole, filo dello schermo di Semino), stelle grigie, posto di destra vuoto. Alla prima battuta di Semina lei sbuca (`sbuca`, foglie di `scena-foglie`). Alla nota "Il verde è Semino. La blu è Semina." si accendono insieme alone blu di lei, stelle blu del fondale e il `--blu-presenza` dell'app (900 ms, l'unica eccezione ai 400 ms → è il momento più grande della storia). Fino al 5 il diario e la testa non nominano mai Semina; la parola compare solo nel fumetto. Bottone finale "Andiamo" (si tiene quello di oggi). Mantenere `data-testid` `scena-sblocco` e `scena-andiamo` per gli E2E.

### 1.6 Lettere del Mulo
Le battute `mulo:` non hanno personaggio: il fondale si scurisce del 30% e dal basso sale un **foglio** (crema, angolo storto di -1,5°, 270 px, testo 16 px CASL 1 in inchiostro scuro, firma "— il Mulo" in basso a destra). Battute `mulo` consecutive si **aggiungono come righe allo stesso foglio** (ogni tocco una riga) → si legge come una lettera, non come tre fumetti. Alla prima battuta non-mulo il foglio scende (200 ms). Classi: `capitolo-lettera`, `capitolo-lettera-riga`.

### 1.7 Il raccordo con la Vittoria
Ordine: **griglia chiusa → 900 ms di festa sulla griglia → capitolo → carta di vittoria**.
- I 900 ms (onde esistenti, mascottine in festa, vibrazione) → chi chiude l'ultima cella deve sentire subito il "fatto"; il capitolo non deve sembrare un'interruzione.
- Capitolo prima dei punti (deciso) → la storia è il premio; i punti sono il riassunto.
- La carta di vittoria perde il blocco `sorpresa` (le SORPRESE diventano capitoli) e prende una riga per i regali: "+1 suggerimento nella prossima partita". `AnnuncioSblocco` si ritira: l'elemento nuovo sorge in Home con `sc-sorge` come oggi → una sola interruzione per vittoria.
- **Due telefoni insieme**: ognuno ha la sua coda (Genna 1 capitolo, Mati magari 3) e legge al suo ritmo. Se uno preme "Nuova partita" mentre l'altro legge, la partita nuova parte sotto ma l'overlay di chi legge **resta** (la griglia sotto è `inert`). Quando il secondo arriva alla carta di vittoria, la carta usa i dati salvati al momento della fine (`riassuntoVittoria`) e al posto di "Nuova partita" mostra "Mati ha aperto una nuova partita · Vai". Il timer della nuova partita intanto corre: accettato → al massimo un minuto, e il timer è condiviso.
- Opzionale, richiede la lead (contratto di rete): un campo `leggendo` nella presenza, per mostrare a chi è già sulla carta "Mati sta leggendo…". Senza, funziona lo stesso.

### 1.8 Accessibilità
Overlay `role="dialog" aria-modal`, il resto dell'app `inert`. Lo schermo di avanzamento è un **`<button>` vero** a tutto schermo (`capitolo-avanti`) con etichetta "Avanti, battuta 3 di 6"; "‹" e "Continua" sono bottoni separati. Tastiera: Spazio, Invio, → avanti; ← indietro; Esc nulla (non c'è salto). Focus sul bottone avanti all'apertura, su "Continua" alla fine, ritorna alla griglia o alla Home alla chiusura. Regione `aria-live="polite"` che legge "Semino: Dove vai?" o "Nota: Semina cammina lungo la riva" (il nome conta: a schermo lo dice il colore).

### 1.9 Capitolo 0
Non c'è una partita finita: il capitolo 0 parte alla prima entrata in Home dopo l'Ingresso, con lo stesso overlay, e finisce con "Andiamo" senza carta di vittoria. Anche la rilettura dal diario finisce con "Chiudi" e senza carta.

---

## 2. I fondali dei luoghi

`Fondale.tsx` con `luogo` e `momento` ('alba'|'giorno'|'crepuscolo'|'notte'). Un SVG con `viewBox` 0 0 100 180 e `preserveAspectRatio="xMidYMax slice"` (il suolo resta in basso su ogni telefono), tinte `--fd-*` ricavate con `color-mix` da `--fondo`, `--testo`, `--oro`, come fa `scena.css`. Sono **quinte**: cielo a gradiente di 2-3 stop, 2-3 sagome piene a tinte vicine, un solo dettaglio animato. Verde e blu solo in un filo o in qualche punto. Ogni luogo ha un momento predefinito; un capitolo può cambiarlo (vedi §7). Base comune: ~40 righe TSX + 30 CSS.

1. **Aiuola / giardino** (momento: notte all'aiuola, alba al giardino). Cielo dal petrolio scuro al salvia vicino all'orizzonte. Non è un disegno nuovo: in basso si monta la `Scena` esistente con `elementiSbloccati(n)` del capitolo → nel 100 si vede il giardino pieno, nel 3 c'è solo il sentiero; la storia e la Home sono lo stesso posto. Dettaglio: lucciole verdi (aiuola), merlo sul ramo. **~20 righe.**
2. **Mare** (giorno). Cielo da petrolio chiaro a crema rosata all'orizzonte. Sagome: tre fasce d'onda (la più vicina oscilla in 6 s), riva di sabbia in diagonale da destra, muretto basso a sinistra (servirà per la tavola). Filo verde sulla cresta dell'onda vicina; di sera stelle blu e riflesso di luna. **~45 SVG + 25 CSS.**
3. **Montagna** (alba). Cielo dal crema caldo (in basso) al petrolio (in alto). Sagome: cresta lontana chiara con neve crema, cresta vicina scura con alone blu sul bordo, roccia a sinistra in primo piano; in alto a destra la baita con il filo della carrucola in diagonale (serve a Nonna Capra e al Mulo). **~45 + 20.**
4. **Bosco al crepuscolo** (crepuscolo). Cielo petrolio-viola con una banda bassa color `--oro` al 30%. Sagome: cinque tronchi verticali di larghezze diverse, un ramo orizzontale alto (il ramo di Gufo e Fischio), sottobosco ondulato. Dettaglio: cinque lucciole verdi che pulsano lente (3-4 s, sfasate). **~40 + 25.**
5. **Città di notte** (notte). Cielo petrolio-blu scuro. Sagome: skyline di 6-8 rettangoli con finestre crema (due si accendono e spengono ogni 8-12 s), un lampione con cono di luce crema al 15%, il filo del tram in alto in curva. Una finestra con filo blu, una piccola insegna con filo verde. **~50 + 25.**
6. **Cucina** (sera). Non c'è cielo: muro caldo (petrolio verso terra), una finestra rettangolare con il cielo del momento dentro, bancone in primo piano (fascia piena con bordo di luce), mensola con due tazze: una con filo verde, una con filo blu. **~40 + 20.**
7. **Lontano** (giorno). Cornice di un finestrino in primo piano (rettangolo con angoli arrotondati, bordo spesso), dentro un paesaggio a strisce (prato, montagna lontana) che scorre lentissimo (40 s, fermo con reduced-motion). Variante `laboratorio`: stessa cornice ferma, sotto un bancone e una beuta col filo blu → un solo disegno per treno e laboratorio. **~55 + 30.**

Totale fondali: ~330 righe SVG/TSX + ~175 CSS.

---

## 3. Il diario

- **Dove**: bottone "Diario" nella barra del Giardino, con il numero dei capitoli letti; schermata `'diario'` nello `useState<Schermata>` di App (niente router). Ci si arriva anche toccando la firma dell'eco in Home (§4) → apre la rilettura di quel capitolo.
- **Cosa mostra**: un blocco per atto raggiunto, in ordine. Testata del blocco: una striscia di 48 px del fondale del luogo, con sopra "Il mare · capitoli 15-27". Sotto, una riga per capitolo visto: numero (tabellare, testo-2) e titolo (16 px). Gli atti non raggiunti non ci sono; in fondo una riga sola: "Il prossimo capitolo arriva col fiore 13." → nessuno spoiler, ma si sa che c'è un seguito.
- **Rilettura**: tocco sulla riga → lo stesso overlay del capitolo, con i vestiti di quel capitolo, "‹" sempre disponibile, Esc chiude, alla fine "Chiudi" e si torna al diario nello stesso punto di scorrimento. Niente carta di vittoria, niente "2 di 3".
- **Arretrati**: le righe non lette ci sono, con un puntino nel colore di chi legge (`--mio`) e "da leggere". Se ce ne sono, in cima al diario c'è "Leggi i 4 capitoli che mancano", che avvia la coda in ordine come dopo una vittoria. Anche il bottone del giardino in Home porta un puntino → l'unico segnale fuori dal diario, discreto.
- **Vuoto**: con zero capitoli letti (succede solo se il capitolo 0 è stato rimandato): Semino che saluta, "Il diario si scrive da solo. Il primo capitolo è già qui." e bottone "Leggi".
- **Prima del 5**: nessuna traccia di Semina, nemmeno nelle testate.
- Costo: ~150 righe TSX + ~80 CSS.

---

## 4. L'eco in Home e la rotazione dei vestiti

**Eco**
- Alla prima entrata in Home dopo un capitolo, il primo fumetto è l'eco di chi la dice nel copione, con la firma "Semina · dal capitolo 12" (la firma è toccabile e apre la rilettura). Non è bloccante come la tappa di oggi: resta 8 s o finché non si tocca, poi riprendono saluto e chiacchiere → la Home non deve tornare a essere una pagina della storia.
- Dopo una coda di arretrati c'è solo l'eco dell'ultimo capitolo letto.
- Fino al capitolo seguente le ultime tre eco lette entrano nel mazzo delle chiacchiere con peso doppio → la storia "riaffiora" ogni tanto senza ripetersi a ogni apertura.
- La tappa Home di oggi (`tappaDaMostrare`, `fumetto-storia`) si ritira.

**Vestiti**
- Pool = vestiti dei luoghi dei capitoli **letti da questo giocatore**, derivati da capitoli visti + luogo (nessun dato nuovo).
- All'entrata in Home: i vestiti del luogo dell'ultimo capitolo letto → continuità con la scena appena vista.
- Ogni ~90 s (±10%) **cambiano tutti e due insieme**, non a turno come oggi: 3 volte su 4 un luogo solo per entrambi, 1 volta su 4 misti (ognuno da un luogo diverso). Mai mentre un fumetto è aperto (si riprova dopo 5 s, come oggi). → due che cambiano insieme si leggono come "sono stati lì", uno alla volta sembra casuale.
- Prima del 5: solo Semino, e nell'aiuola non ha vestiti (resta nudo, come nel copione).
- **Vestito nuovo**: niente annuncio né dialogo (il capitolo l'ha già mostrato). La prima volta che un vestito compare in Home: `semino-acc-pop` più tre scintille crema attorno (500 ms), una volta per vestito per giocatore (`vestitiVisti`, localStorage). → la scoperta resta piccola e visibile, senza una quarta interruzione.
- Il solletico non cambia vestito. Gli stessi vestiti si vedono in Giardino, Vittoria e Ingresso (§5, punto 8).
- Costo eco + vestiti: ~100 righe (le 8 forme nuove dei vestiti in `Semino.tsx` sono a parte: ~30 righe SVG l'una, ~240).

---

## 5. Dinamicità e usabilità del resto dell'app

Punti 2-11 dell'audit, in ordine di impatto/costo (prima i più utili per riga scritta).

1. **Testi in partita che si perdono** (audit 4). Durata del fumetto = 1200 ms + 45 ms per carattere, fra 2400 e 6500 (`DURATA_BATTUTA_MS` in Toasts.tsx diventa una funzione). Tocco sul fumetto: si espande (tolto il `line-clamp` a riga 2723 di tema.css, 180 ms in altezza) e il timer si ferma; secondo tocco chiude. Il toast grande fuori partita si chiude al tocco. Coda: le frasi del partner non si scartano mai (si scartano solo i commenti automatici oltre il terzo). ~40 righe.
2. **Testo minimo 12 px** (audit 11). Tema.css righe 1098, 1142, 1438, 3394 e le altre sotto i 12 (`.tasto-resto` compreso); dove manca spazio si riduce la spaziatura, non il corpo. ~10 righe.
3. **Uscite brusche** (audit 7). Un `vai(schermata)` in App.tsx: aggiunge `.schermata.esce` (dissolvenza + 6 px verso l'alto, 140 ms), all'`animationend` (con riserva di 200 ms) cambia schermata; `entra` scende da 380 a 260 ms. "Nuova partita": nessuna pausa vuota; il bottone dice "Preparo la griglia…" e la griglia entra a cascata per box (20 ms di sfasamento, ≤ 300 ms in tutto). Con reduced-motion cambio immediato. → CSS e `animationend` funzionano su ogni Safari e Android, la View Transitions API no in modo uniforme. ~45 righe.
4. **Gesti nascosti e tasto indietro** (audit 5). Niente swipe dal bordo → su iPhone e Android i bordi sono del sistema. In cambio: (a) il **gesto indietro di Android** oggi chiude la PWA: con `pushState` a ogni cambio di schermata e `popstate` si torna alla Home e si chiudono fogli e menù; (b) tre suggerimenti una tantum, nella voce di Semino nel fumetto esistente, per dispositivo: in Home dopo 4 s fermi "Puoi toccarmi, eh" con un cerchio che si allarga due volte sulla mascotte; in partita al primo minuto "Tieni premuto un tasto per scrivere una nota"; alla terza selezione di una cella piena "Tocca due volte un numero: li accendo tutti". ~55 righe.
5. **Griglia e overlay accessibili** (audit 3). Roving tabindex in Griglia.tsx: la cella selezionata ha `tabIndex 0`, le altre -1, frecce spostano focus e selezione, `aria-selected`, etichetta "riga 3, colonna 7, 5, di Mati". Menù: `menuitem`, Esc chiude e il focus torna al bottone ⋯, focus trap nei fogli. Vittoria: focus su "Nuova partita". ScenaSblocco sparisce dentro il capitolo (§1.8). ~60 righe.
6. **Giardino mezzo morto** (audit 6). Ogni fiore finito diventa un bottone: al tocco rimbalza (200 ms) e si apre un foglio con modalità, livello, data, tempo, celle di ciascuno e "Capitolo 12 · La riva · rileggi". Il bottone del giardino in Home cresce in una pillola "Giardino · 12" (44 px d'altezza) con il puntino degli arretrati. ~70 righe.
7. **Cassetta della posta vera** (audit 2). Dal fiore 12, sopra la cassetta della Scena in Home un `<button>` HTML trasparente di 44 px posizionato in percentuale del viewBox (la Scena resta `pointer-events:none`) → più robusto e accessibile di un gruppo SVG cliccabile. Apre un foglio con le ultime 20 frasi mandate e ricevute ("Mati → te · ieri 23:10"), nuove in cima. Se ne sono arrivate mentre eri via, nella Scena si alza la bandierina della cassetta. Archivio: campo extra `posta` (max 30, locale; nel sync solo se la lead vuole). ~110 righe.
8. **Mascotte e vestiti poco visibili** (audit 8). Un hook `useVestiti` in App, usato da Home, Giardino, Vittoria e Ingresso (che mostra gli ultimi indossati, salvati in localStorage). Mascottine del cruscotto da 44 a 52 px dove l'altezza lo permette (≥ 760 px). ~35 righe.
9. **Scena che non conosce l'ora** (audit 9). Prop `momento` su `Scena` e `Fondale`, calcolata dall'ora locale: alba 5:30-8, giorno 8-18, crepuscolo 18-20:30, notte 20:30-5:30; ricalcolata ogni 10 minuti e al ritorno in primo piano. Cambia solo il cielo della scena (variabili `--sc-*`), non il tema dell'app, che resta scelta dell'utente. Pioggia solo nei capitoli che la chiedono. ~110 righe (3 varianti CSS + 15 TSX).
10. **Incoerenze tra schermate** (audit 10). Un solo componente `Menu` per Home e Partita: in partita in cima "Torna alla Home", poi le stesse sezioni (la Memoria chiusa). Un solo `Fumetto` (`chi`, `variante`, `espandibile`) per Home, Partita e capitolo. Refactor: ~80 righe nuove, ~60 tolte. Per ultimo → non si vede, ma rende più economico tutto il resto.

Totale UX: ~615 righe.

---

## 6. Da provare a mano su telefono

1. Due telefoni chiudono la stessa griglia: ognuno vede il suo capitolo; uno preme "Nuova partita" mentre l'altro legge; il secondo arriva a una carta di vittoria con i punti giusti e "Vai".
2. Tocchi veloci a raffica durante un capitolo: non si salta più di una battuta per tocco, l'ultimo tocco non salta "Continua".
3. Chiudere l'app a metà capitolo: alla riapertura il capitolo è ancora da leggere (diario e coda).
4. Telefono nuovo con 10 fiori: carta "Ti sei perso…", poi "Dopo" e rilettura dal diario.
5. Capitolo 5 su tutti e due i telefoni: Semina non compare prima, i colori si accendono alla nota giusta.
6. Lettera del Mulo: le righe si aggiungono allo stesso foglio.
7. iPhone in Safari (non installata) e da Home: barra degli indirizzi che compare e sparisce, notch, gesto home; il piede del capitolo resta sopra la safe area.
8. Android: gesto indietro su Partita, Giardino, Diario, menù aperto.
9. Reduced-motion attivo: nessun salto, capitolo leggibile, colori del 5 accesi.
10. Lettura con VoiceOver/TalkBack di un capitolo: si sente chi parla.
11. Fumetto lungo in partita: dura di più, si espande al tocco.

## 7. Rischi e note per la tech lead

- **Tocco accidentale**: guardia di 300 ms e ultima battuta inerte. Se dal vero si salta ancora, si alza a 400 ms, non si aggiunge una conferma.
- **Due telefoni insieme**: la carta di vittoria deve leggere `riassuntoVittoria` e non lo stato della partita, che nel frattempo può essere già quella nuova.
- **Overlay sopra la partita**: la griglia sotto va `inert`, altrimenti la tastiera fisica e i lettori di schermo scrivono nella partita nuova.
- **iPhone Safari e `100dvh`**: l'overlay usa `position:fixed; inset:0`, non `100dvh` → non salta quando la barra di Safari cambia altezza. Piede con `env(safe-area-inset-bottom)`.
- **Reduced-motion**: il cenno del "›" e le scintille dei vestiti nuovi vanno tolti anche in JS (`useRidotto`), non solo in CSS.
- **Il visto per giocatore** cambia `tappeViste` (oggi di coppia, unite nel Worker): è un cambio di dati, va deciso con la lead.
- **Dati da aggiungere al formato dei capitoli** (guida-dialoghi §formato): `@momento:` opzionale (alba, giorno, crepuscolo, notte, pioggia) e `@fondale: laboratorio` solo per lontano. Senza questi campi vale il predefinito del luogo.
- **Disegni dei secondari** (7 sagome, il Mulo non si disegna): non sono fondali né vestiti, ~35 righe SVG l'uno, ~250 in tutto. Vanno nello stesso lotto della schermata del capitolo, perché il 17 (Pinza) arriva presto.
- **Da ritirare**: `AnnuncioSblocco`, `SORPRESE` dentro Vittoria, la tappa Home bloccante; gli E2E che cercano `annuncio-sblocco` e `sorpresa` vanno riscritti.

## 8. Stima dei costi (righe di codice, TSX + CSS)

| blocco | cosa | righe |
|---|---|---|
| A | `Capitolo.tsx` (overlay, avanti/indietro, coda, lettera, capitolo 5) | ~190 TSX |
| A | CSS del capitolo | ~140 |
| A | coda e visto in regole.ts / App.tsx, `riassuntoVittoria` | ~70 |
| A | 7 fondali + base comune | ~505 |
| A | sagome dei 7 secondari | ~250 |
| | **totale A** | **~1.150** (900 senza secondari) |
| B | diario | ~230 |
| B | eco e rotazione dei vestiti | ~100 |
| B | 8 vestiti nuovi in Semino.tsx | ~240 |
| | **totale B** | **~570** (330 senza vestiti nuovi) |
| C | miglioramenti UX §5 | **~615** |

Ordine consigliato: A senza secondari, poi B senza vestiti nuovi, poi C1-C5; secondari e vestiti nuovi quando arrivano i lotti dei capitoli che li usano.
