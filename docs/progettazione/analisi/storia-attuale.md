# Storia attuale di Semino e Semina e come arriva a schermo

Analisi in sola lettura del codice (04/11/2026). Fonti: `src/config/storia.ts`, `storia.test.ts`, `frasi.ts`, `giocatori.ts`, `livelli.ts`, `docs/specs/traguardo.md`, `docs/REPORT-notte-03-11.md`, `src/ui/{ScenaSblocco,AnnuncioSblocco,Vittoria,Home,App,regole}.ts(x)`, `src/stato/{types,archivio,sync}.ts`, `src/ui/usePartita.ts`.

Nota di metodo: i numeri sotto sono contati dal codice. "Fiori" = numero di partite finite nello storico (`fioriDi(storico)` in `src/ui/regole.ts`, conta le voci con `finita`). Lo storico è condiviso tra i due, quindi i fiori sono di coppia.

---

## 1. Modello dati

### Tipi (`src/config/storia.ts`)
```ts
interface Sblocco { tipo: 'elemento'|'accessorio'|'frasi'|'regalo'; id: string; nome: string; descrizione: string }
interface Tappa {
  partite: number;                 // soglia di fiori (una sola tappa per numero)
  chi: 'semino'|'semina'|'entrambi'|'nessuno';
  testo: string;                   // max 240 caratteri (test)
  accessorio?: string;             // di chi parla (con 'entrambi': di Semino)
  accessorioSemina?: string;       // di Semina quando parlano in due
  scena?: string;                  // 'alba'|'notte'|'mare'|'montagna'|'pioggia'|'stelle'|'prato' (ambientazione suggerita)
  sblocca?: Sblocco;               // elemento del giardino che compare
}
type Battuta = { chi: ChiParla|'nessuno'; umore: string; testo: string }   // ChiParla = 'semino'|'semina'
```
Altri dati in `storia.ts`:
- `STORIA: Tappa[]` (43 tappe), `SBLOCCHI: {partite, sblocco}[]` (soglie con più voci), `SORPRESE: {partite, battute[]}[]` (9), `GIORNI_SPECIALI` (mare / montagna, deterministici dalla data), `elementiSbloccati(fiori)`.
- In `frasi.ts`: `SCENA_SBLOCCO` (8 battute dell'arrivo di Semina), `SEMINA_SBLOCCATA_A = 5`, `FRASI_EXTRA` (pacchetti per soglia), e due liste deprecate `STORIA_SEMINO` / `STORIA_EXTRA` (non più lette dalla UI, restano per compatibilità e per un test sulle tappe 0-5).

### Chiavi stabili
- Tappa: `chiaveDi(t) = `${chi}-${partite}`` (es. `semino-6`, `semina-5`). In `regole.ts` il tipo `Tappa` UI è `TappaStoria & { chiave }`.
- `tappaVista(partite, viste)` accetta la chiave con QUALSIASI `chi` per quel numero (compat con T2: `semina-8` vale per l'attuale `semino-8`). Quindi cambiare `chi` di una tappa già vista è sicuro; cambiare `partite` no.
- Sorpresa: `sorpresa-${partite}` (`chiaveSorpresa`).
- Scena di sblocco: usa la chiave della tappa 5: `CHIAVE_SBLOCCO = 'semina-5'`.
- Sblocco annunciato: `${tipo}:${id}` (`chiaveSblocco`), nel campo extra `sbloccatiVisti`.

### Condizioni
- Tutto deriva da `fiori` e (solo giorni speciali e sonno) dalla data/ora locale. Nessuna condizione su livello, modalità, durata, punti, giocatore presente.
- Soglia tappa: `t.partite <= fiori`. Sorpresa: `fiori === s.partite` esattamente, calcolato alla vittoria, e solo se Semina è già "sbloccata" su quel dispositivo.
- Semina sbloccata su un dispositivo: `fiori >= 5 && tappeViste.includes('semina-5')` (App.tsx riga ~96), cioè solo dopo aver visto la scena.
- Giorno speciale: `giornoDellAnno(d) % 7 === 2` mare, `=== 5` montagna (`giornoSpeciale`), solo dopo lo sblocco di Semina. Cambia chiacchiere/accessori, non la storia.

### Dove si segna "vista" (`src/stato/archivio.ts`, campo `Archivio`)
- `tappeViste: string[]` (nell'archivio locale, `localStorage['sudoku-coppia-archivio']`, versione 1): contiene chiavi di tappe, `semina-5` e `sorpresa-N`.
- `sbloccatiVisti` e `regaliBonus`: campi "extra" (non nel tipo, conservati da `migra` come sconosciuti), per gli annunci e i suggerimenti regalo in attesa.
- `azzerato` (data di "ricomincia"): azzera `tappeViste`, `sbloccatiVisti`, `regaliBonus` (`applicaAzzeramento`).
- Marcatura: tappa Home -> effetto in App.tsx (~riga 535) subito all'apparire; scena -> `fineScena()` al bottone "Andiamo"; sorpresa -> marcata appena parte (callback `effetti.vittoria` in App.tsx ~riga 322), non a fine lettura; annuncio -> `sblocchiNuovi` marca tutto all'ingresso in Home.

### Sincronizzazione tra i due
- P2P (PeerJS): le tappe viste NON viaggiano (spec: "riproporre la storia su un dispositivo nuovo va bene"). Si sincronizza lo storico (quindi i fiori).
- Worker Cloudflare + KV (`src/stato/sync.ts`, `src/ui/useSync.ts`): `PayloadSync` include `tappeViste`, e `unisciRemoto` fa l'UNIONE degli insiemi. La chiave KV è per COPPIA (sha256 della frase), non per giocatore. Conseguenza: "vista" è di coppia, non del singolo. Vedi vincoli.
- Anche import/esporta memoria (`src/ui/memoria.ts`) unisce le tappe viste. `sbloccatiVisti` NON è nel payload sync: gli annunci sono per dispositivo, le tappe invece si condividono.

---

## 2. Tabella delle tappe attuali (43)

Legenda presentazione (come appare oggi):
- **HOME** = fumetto di Semino/Semina nella Home ("tocca per chiudere"), l'unico canale per le tappe di storia. Mai in primo piano a schermo intero.
- **SCENA** = scena a schermo intero `ScenaSblocco` (solo fiori 5).
- **ANN** = in più, `AnnuncioSblocco` (modale "Nuovo nel giardino: ...") in Home, per le soglie con `sblocca`/`SBLOCCHI`.
- **SORP** = in più, mini-scena di 2-3 battute sopra la schermata di Vittoria (`SORPRESE`).
- Regali = voci `SBLOCCHI` di tipo regalo/frasi/accessorio per la stessa soglia (dettaglio nel punto 2b).

| Fiori | Chiave | Chi | Presentazione | Testo (testuale) |
|---|---|---|---|---|
| 0 | semino-0 | semino | HOME | Ciao. Sono Semino. Sono piccolo, ma se risolvete i sudoku insieme cresco. Promesso. |
| 1 | semino-1 | semino | HOME + ANN (elemento "Il primo fiore" + regalo suggerimento) | Il primo fiore! Il giardino comincia da qui. |
| 2 | semino-2 | semino | HOME | Stanotte ho sentito un fruscio dall'altra parte dell'aiuola. Sarà il vento. |
| 3 | semino-3 | semino | HOME + ANN (sentiero) | Tre fiori. Il fruscio è tornato. Non era il vento. |
| 4 | semino-4 | semino | HOME (Semino "solo", umore preoccupato; la Home invita a "Nuova partita insieme") | Quattro fiori. Stasera mi sento un po' solo, qui in mezzo. Dai... ne facciamo un altro insieme? |
| 5 | semina-5 | semina | SCENA (testo della tappa NON mostrato in Home: `tappaDaMostrare` salta `CHIAVE_SBLOCCO`) + regalo | Ciao. Sono Semina. Ero qui da un pezzo: aspettavo che il giardino fosse abbastanza grande per due. (vedi sotto le 8 battute di `SCENA_SBLOCCO`) |
| 6 | semino-6 | semino | HOME (scena suggerita: alba) | Semina si è svegliata alle sei e ha salutato ogni fiore per nome. Alle sei io stavo andando a dormire. Ci siamo incrociati sul sentiero e ci siamo detti "buongiorno" e "buonanotte". Insieme. |
| 7 | semina-7 | semina | HOME + SORP (acc. montagna) | Gli ho chiesto il suo posto preferito. "Il mare." Il mio è la montagna. Ci siamo guardati come due sudoku con la stessa soluzione e numeri diversi. |
| 8 | semino-8 | semino | HOME + ANN (stagno + 2 pacchetti frasi) (acc. palla) | È spuntato uno stagno. Ci ho tirato la palla per vedere se galleggia: galleggia. Semina dice che ci abitano tre rane. Ho chiesto scusa alle rane, una per una. |
| 9 | semina-9 | semina | HOME (scena notte) | Semino di notte resta sveglio col computer. Io di notte dormo come un ghiro. Abbiamo fatto un patto: lui veglia sul giardino fino alle quattro, io lo apro all'alba. |
| 10 | entrambi-10 | entrambi | HOME + ANN (merlo + regalo) + SORP (acc. occhiali / animale) | Dieci fiori, ed è arrivato un merlo. Semina gli ha dato un nome in tre secondi. Semino sta ancora valutando le opzioni. |
| 11 | semino-11 | semino | HOME (acc. cuoco) | Ho cucinato per lei. Pasta al pomodoro, niente di speciale. Ha detto "la più buona della mia vita" con la bocca piena. Ho deciso di crederci. |
| 12 | semina-12 | semina | HOME + ANN (cassetta della posta + pacchetto frasi "invio") (acc. corona) | In fondo al sentiero c'è una cassetta della posta. Dentro finiscono le frasi che vi mandate, Genna e Mati. Le leggo tutte. Non spio: le innaffio. |
| 13 | semino-13 | semino | HOME | Le ho chiesto se vuole stare nella stessa aiuola. Ha detto "forse". Da un semino, forse è un sì. |
| 14 | semina-14 | semina | HOME | Ho detto forse. Poi ho spostato le radici di un centimetro verso le sue. Non diteglielo. |
| 15 | semino-15 | semino | HOME + ANN (mare + accessorio surf) + SORP (acc. surf, scena mare) | Quindici fiori: laggiù si sente il mare. Ho trovato una tavola da surf. Semina dice che col mare si fa amicizia piano. Io sono già in acqua. |
| 16 | semina-16 | semina | HOME (acc. animale, scena mare) | Al mare con Semino. Lui sulle onde, io sulla sabbia a fare amicizia coi granchi. Ho deciso: il mare mi piace. Quando c'è lui. |
| 17 | semino-17 | semino | HOME (acc. occhiali) | Mi ha insegnato i nomi degli uccelli. Io le ho insegnato cos'è un bug. Pari. |
| 18 | semina-18 | semina | HOME + ANN (montagna + regalo) (acc. montagna, scena alba) | All'orizzonte è spuntata una montagna. La MIA montagna. Domani si sale all'alba! Semino ha chiesto se c'è l'ascensore. |
| 19 | semino-19 | semino | HOME (scena montagna) | Siamo saliti. Ogni dieci passi mi fermavo a "guardare il panorama". Lei ha capito e mi ha aspettato a ogni curva. In cima, devo dirlo, valeva la fatica. Una volta. |
| 20 | entrambi-20 | entrambi | HOME + ANN (cielo stellato + 2 pacchetti frasi) + SORP (scena stelle) | Venti. Di notte ogni fiore diventa una stella: lui le conta, lei si addormenta alla terza. Quando non ci siete parliamo di voi. I nostri due giganti. |
| 22 | semina-22 | semina | HOME | Oggi mi sono arrabbiata. Lui ha detto che la montagna è "una salita senza onde". Io che il mare è "acqua che non sta ferma". Siamo andati a dormire offesi. Lui alle quattro. |
| 23 | semino-23 | semino | HOME (scena notte) | Senza di lei il giardino è silenzioso. Ho provato a chiudere una riga da solo. Ci sono riuscito. Non mi è piaciuto per niente. |
| 24 | semina-24 | semina | HOME (scena alba) | All'alba davanti alla mia aiuola c'era un piatto di pasta e un biglietto: "la montagna è bella perché ci sei tu". La pasta era fredda. L'ho mangiata tutta. |
| 25 | entrambi-25 | entrambi | HOME + ANN (tavola da surf + regalo) + SORP (acc. surf / corona) | Pace fatta. Lui ha appoggiato la tavola da surf al muretto, "così pensi al mare". Lei ci ha disegnato sopra una montagna. Adesso la tavola è di tutti e due. |
| 27 | semino-27 | semino | HOME (acc. occhiali) | Genna, quando sbaglia un numero, sbuffa. Mati ride. Poi sbaglia lei e ride lui. Noi semini prendiamo appunti: sembra un ottimo sistema. |
| 30 | semina-30 | semina | HOME + ANN (cavallino + accessorio cavallo + 2 pacchetti frasi) + SORP (acc. cavallo, scena prato) | Trenta! Nel prato c'è un cavallino. Galoppa come me quando chiudete una riga. Semino lo guarda da lontano. Molto lontano. |
| 32 | semino-32 | semino | HOME | Mi ha fatto salire sul cavallino. Ho resistito quattro secondi. Il cavallino ha sbuffato. Credo che ridesse. Ora mi segue ovunque: forse gli sto simpatico. |
| 35 | entrambi-35 | entrambi | HOME + ANN (casetta + regalo) (acc. occhiali / corona) | Abbiamo costruito una casetta. Lui ha fatto i conti, lei ha scelto le finestre: una sul mare, una sulla montagna. Il divano è uno solo. Basta e avanza. |
| 38 | semina-38 | semina | HOME (acc. animale, scena notte) | Lui va a letto alle tre e mezza, io mi sveglio alle sei e mezza. Ci sono tre ore in cui il giardino non lo guarda nessuno. Abbiamo chiesto al merlo di fare il turno. |
| 40 | entrambi-40 | entrambi | HOME + ANN (chitarra + pacchetto frasi vittoria) + SORP (acc. chitarra x2) | Quaranta. Abbiamo appeso una chitarra alla casetta. Lui tiene il tempo, lei canta fuori tempo, il merlo fa il ritornello. È la nostra canzone. Il titolo non c'è ancora. |
| 43 | semino-43 | semino | HOME (scena notte) | Stanotte Genna ha messo qualche numero, stamattina Mati ha messo gli altri. La griglia si è riempita lo stesso. Funziona così, tra giganti lontani: uno lascia, l'altro trova. |
| 45 | semina-45 | semina | HOME (acc. cavallo) | Arrabbiata di nuovo: il cavallino si è mangiato un'aiuola. Semino ha detto "erano fiori vecchi". Mi sono arrabbiata anche con lui. Poi abbiamo ripiantato tutto insieme. |
| 48 | semino-48 | semino | HOME (acc. cuoco, scena alba) | Le ho preparato la colazione per l'alba. Per farcela sono rimasto sveglio tutta la notte. Lei crede che mi sia svegliato presto. Lasciamoglielo credere. |
| 50 | entrambi-50 | entrambi | HOME + ANN (fuochi d'artificio + pacchetto frasi brillante) + SORP (acc. occhiali / corona, scena stelle) | Cinquanta! Da oggi ogni vittoria ha i fuochi d'artificio. Il merlo si è offeso per il rumore. Semino ha calcolato le traiettorie. Semina ha urlato e basta. |
| 53 | semina-53 | semina | HOME | Oggi ho dormito con Semino fino a mezzogiorno. Non l'avevo mai fatto. Il sole era già alto e nessuno si è arrabbiato. Forse stare bene è questo. |
| 55 | semino-55 | semino | HOME (acc. occhiali) | Ho scritto un programma che risolve i sudoku da solo. Funziona. Non lo userò mai: il bello è farli con lei. E guardare voi due che li fate insieme. |
| 58 | semina-58 | semina | HOME | Genna e Mati si mandano "sei mini" dalla cassetta. Non sappiamo bene cosa voglia dire. Però ogni volta, nel giardino, spunta un fiore piccolissimo. |
| 60 | entrambi-60 | entrambi | HOME + ANN (arcobaleno + regalo) + SORP (scena pioggia) | Sessanta. È piovuto, poi è uscito un arcobaleno: un capo sul mare, uno sulla montagna. Ci abbiamo messo un po' a capirlo. Era il ponte che mancava. |
| 65 | semina-65 | semina | HOME (scena mare) | Sono andata al mare da sola, per la prima volta. Mi mancava qualcuno sulla tavola. Sono tornata di corsa a svegliarlo. Erano le dieci: per lui, l'alba. |
| 70 | semino-70 | semino | HOME | Settanta. Io ho imparato a svegliarmi un po' prima, lei a restare sveglia un po' di più. In mezzo c'è un'ora tutta nostra. La passiamo a guardare voi. |
| 80 | entrambi-80 | entrambi | HOME (scena prato) | Ottanta fiori. Il giardino non ha più bordi: dove finisce, ne cominciamo un altro pezzo. Non sappiamo fin dove arriva. Ci piace così. |
| 100 | entrambi-100 | entrambi | HOME (scena stelle) | Cento. Non contiamo più i fiori: contiamo le sere. Voi tornate, noi cresciamo. Il resto della storia lo scrivete voi due, un numero alla volta. |

Il campo `scena` delle tappe è dichiarato "ambientazione suggerita": in Home viene usato solo da `inEvidenza()` (Home.tsx ~riga 211) per far rientrare un elemento della Scena SVG; non cambia lo sfondo.

Totale: 43 tappe; 1 in primo piano a schermo intero (fiori 5, scena); 42 solo fumetto in Home. Con `sblocca`: 15 elementi del giardino (le soglie 1, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 60), tutte con tappa alla stessa soglia (lo impone un test).

### 2a. Scena di sblocco di Semina (fiori 5), `SCENA_SBLOCCO` in `frasi.ts`, una battuta per tocco
1. [semino, neutro] Cinque fiori. Il giardino è grande, adesso.
2. [narratore] ...fruscio...
3. [semino, sorpreso] Il fruscio! È qui, è qui dietro...
4. [semina, euforico] CIAO! Sono Semina! Vi guardavo giocare da un sacco di tempo, non ce la facevo più a stare zitta!
5. [semino, imbarazzato] Ehm. Ciao. Io sono Semino. Mi sentivo un po' solo, prima.
6. [semina, felice] Lo so. Ti ho sentito. Da adesso le righe le chiudiamo in due.
7. [narratore] Il verde è Semino. La blu è Semina. Siete voi, da sempre.  (qui si accendono i due colori)
8. [semina, euforico] E adesso... giochiamo!
Finale (hardcoded in `ScenaSblocco.tsx`): "Semino e Semina. Da adesso il giardino lo curano in due." + bottone "Andiamo".

### 2b. Sorprese alla vittoria (`SORPRESE`), 9 totali, battute testuali
- **7**: [semina, euforico] Sette! Il mio numero fortunato! / [semino, sorpreso] Ieri il tuo numero fortunato era il quattro. / [semina, felice] Ogni giorno ne ho uno. Oggi è il sette. Domani vediamo.
- **10**: [narratore] ...cip cip... / [semina, euforico] Un merlo! È venuto per voi! Si chiama... Merlo. No, aspetta. Si chiama Fischio. / [semino, neutro] Io avrei detto Merlo 1.0. Ma Fischio va bene.
- **15**: [semino, estasiato] Sentite? Sono onde. Il mare è arrivato fino al giardino. / [semina, sorpreso] È bello. È bagnato. È... bello. Vieni anche tu, vero? / [semino, felice] Sempre. Tu stai sulla sabbia, io ti saluto dalla tavola.
- **20**: [semino, felice] Guarda in alto: venti stelle. Una per ogni fiore. / [semina, dorme] Bellissime... sono le dieci... zzz... / [semino, imbarazzato] Le conto io anche per lei. Buonanotte, Mati. Buonanotte, Genna. Io resto sveglio.
- **25**: [semina, imbarazzato] Senti... scusa per la storia del mare. Non è acqua che non sta ferma. È acqua che balla. / [semino, felice] E la montagna non è una salita senza onde. È un'onda che ha deciso di stare ferma per farsi guardare. / [semina, euforico] Pace?
- **30**: [narratore] ...nitrito... / [semina, euforico] UN CAVALLINO! Nel NOSTRO prato! Semino, guarda! / [semino, preoccupato] Lo vedo. Lo vedo benissimo. Da qui. Ciao, cavallino.
- **40**: [semino, felice] Uno, due, tre, quattro... / [semina, euforico] LA LA LAAA / [semino, festa] Eri partita al due. Ma è venuta benissimo.
- **50**: [semina, euforico] Cinquanta fiori! Ci vogliono i fuochi! / [semino, festa] Li ho già programmati. Verde, blu, verde, blu. Pronti? / [narratore] BUM. BUM. BUUUM.
- **60**: [semina, sorpreso] Ha smesso di piovere. Guarda: parte dal mare... / [semino, sorpreso] ...e arriva sulla montagna. / [narratore] Sessanta fiori. Un ponte tra i vostri due posti preferiti.

### 2c. Sblocchi e regali per soglia (`SBLOCCHI`, 31 voci)
- Elementi (15): vedi sopra. Descrizioni: es. 1 "Il primo fiore / Il giardino comincia da qui."; 5 "Semina / La semina blu. Era qui da un pezzo, aspettava."; 10 "Il merlo / ...Canta fuori tempo, come Semina."; 12 "La cassetta della posta / Ci finiscono le frasi che vi mandate."; 60 "L'arcobaleno / Un capo sul mare, uno sulla montagna."
- Regali (+1 suggerimento nella prossima partita) a: 1, 5, 10, 18, 25, 35, 60.
- Accessori: `surf` a 15 (Semino), `cavallo` a 30 (Semina).
- Pacchetti di frasi (`FRASI_EXTRA`, id `${chi}-${categoria}-${partite}`): semino-chiacchiere-8, semina-chiacchiere-8, entrambi-invio-12, semino-chiacchiere-20, semina-chiacchiere-20, semina-chiacchiere-30, entrambi-serie-30, entrambi-vittoria-40, entrambi-brillante-50.

---

## 3. Flusso dopo una vittoria, passo per passo

1. L'ultima cella chiude la griglia; `usePartita.imposta()` (`src/ui/usePartita.ts` ~riga 140) rileva `finitaOra`, applica il bonus ai MIEI contatori, aggiorna lo storico (la partita entra tra i `finita` => fiori +1) e chiama `effetti.vittoria()`. Succede su OGNI dispositivo che riceve lo stato finito: per questo la sorpresa è calcolata localmente su ciascuno.
2. `effetti.vittoria` (App.tsx ~riga 322): `sorpresaDaMostrare(fiori, tappeViste, sbloccata)`. Se esiste e non vista, `setSorpresa` e la chiave `sorpresa-N` va subito in `tappeViste`. Poi parte la reazione di vittoria e, dopo 2,5 s, la frase di vittoria se non è arrivata da chi ha messo l'ultima cella.
3. `vittoriaAperta = schermata==='partita' && partita.finita && vittoriaChiusa !== partita.iniziata` -> si monta `<Vittoria>` (coriandoli, scena piccola con fuochi se sbloccati, mascotte). Se c'è una sorpresa, al posto di titolo e frase c'è un bottone che mostra una battuta per tocco ("tocca per continuare" / "tocca per chiudere"); finite le battute compaiono "Fiorita insieme!" e la frase di vittoria. Solo 9 soglie hanno questa scena; le altre vittorie mostrano solo titolo + frase.
4. La Vittoria offre due uscite: "Nuova partita" (`iniziaNuova(stessa modalità e livello)`, va DIRETTAMENTE in una nuova partita, mai in Home) e "guarda la griglia" (chiude l'overlay, si resta sulla griglia finita). Non esiste un ritorno automatico alla Home. In Home si torna solo a mano (`onEsci` -> `setSchermata('home')`), da Partita o da Giardino.
5. Scena dell'arrivo di Semina (fiori 5): `scena = io && schermata !== 'ingresso' && !vittoriaAperta && scenaDaMostrare(...)`. Parte quindi appena la Vittoria è chiusa (guarda la griglia), oppure subito in Home, sopra qualunque schermata tranne l'ingresso. Con "Nuova partita" subito dopo la vittoria del quinto fiore la nuova partita parte e la scena si sovrappone alla partita appena iniziata (`vittoriaAperta` diventa falso). A fine scena `fineScena()` salva `semina-5`, da lì Semina esiste.
6. Entrando in Home (`chiaveHome = fiori-azzerato`, cambia a ogni nuovo fiore o reset): `tappaDaMostrare(fiori, tappeViste)` sceglie la tappa PIÙ ALTA con `partite <= fiori`; se non è vista, appare come fumetto della mascotte (`Home.tsx` componente `Eroe`, `fumetto-storia`, "Semino/Semina/..., tocca per chiudere"), con gli accessori della tappa. La chiave viene salvata subito (non al tocco). Se la tappa corrente è la 5, null (la racconta la scena).
7. Sempre all'ingresso in Home, `sblocchiNuovi(fiori, sbloccatiVisti)`: prende gli sblocchi nuovi, annuncia SOLO quelli della soglia più alta (`AnnuncioSblocco`, modale con la Scena SVG che fa entrare l'elemento nuovo, titolo "Nuovo nel giardino: ...", eventuali regali, bottone "Continua"), marca viste tutte le soglie raggiunte, accredita `regaliBonus` per i soli regali annunciati. Se tra gli annunciati c'è l'elemento `semina` l'annuncio è soppresso (c'è già la scena), ma il regalo viene dato.
8. Mentre c'è `tappaHome`, scena, vittoria o annuncio, le chiacchiere automatiche sono sospese (App.tsx ~riga 562). Poi riprendono ogni 40-60 s in Home ("Semino parla" in senso di battute casuali), in partita dopo 45 s di quiete.
9. Quando "Semino parla" in Home: (a) tappa nuova -> fumetto storia (bloccante per le chiacchiere, chiuso al tocco), (b) solletico (tocco sulla mascotte), (c) chiacchiera casuale da `chiacchiereDi(...)` (VOCE.chiacchiere + pacchetti sbloccati + chiacchiere del giorno speciale), (d) saluto fisso ("Ciao {nome}. Nel giardino ci sono N fiori." o "Giorno del mare..."). Il fumetto-storia ha priorità sul solletico? No: nell'ordine del JSX il solletico (`sol`) viene prima della tappa; un tocco sulla mascotte sostituisce temporaneamente il fumetto della storia (la tappa è comunque già segnata vista).

### Come si perde una tappa (casi concreti, tutti voluti dal codice o conseguenza)
- Più livelli di fila con "Nuova partita": non si passa mai dalla Home, fiori sale (es. 6 -> 9). Alla Home appare solo la tappa 9 (o la più alta <= fiori); le 6, 7, 8 non vengono mai mostrate. Il codice lo dichiara ("la storia non torna mai indietro", `tappaDaMostrare`).
- Stesso per gli annunci: solo la soglia più alta; i `regalo` delle soglie saltate non vengono accreditati (`regali` conta solo l'annuncio) pur essendo marcate viste. Gli elementi del giardino e le frasi comunque si sbloccano perché dipendono da `fiori`.
- Sorpresa: serve `fiori === N` alla vittoria, in quel dispositivo, con Semina già sbloccata lì. Se una vittoria è avvenuta mentre l'altro non c'era, il suo storico si aggiorna dopo (ciao/sync) e i fiori saltano: la sorpresa N non parte mai su quel dispositivo. Se il dispositivo era presente la vede, ma la chiave `sorpresa-N` via Worker risulta vista anche per l'altro.
- Altro giocatore non presente: la tappa Home e l'annuncio non richiedono presenza (sono locali al dispositivo e dipendono solo dai fiori), quindi li vede ogni persona quando apre la Home, MA con la sync Worker `tappeViste` si unisce tra i due: se Genna apre la Home e vede la tappa 12, quando Mati sincronizza la tappa 12 risulta già vista e per lei non appare (e la chiave stabile `semina-5` vista da Genna sblocca Semina su tutti e due i dispositivi senza che Mati abbia visto la scena).
- Tappa vista senza essere letta: la chiave si segna all'apparizione, non alla lettura. Chiudere l'app o un tocco sulla mascotte fanno perdere il fumetto.
- Dispositivo nuovo / storico del partner che arriva con molti fiori: le tappe intermedie non si recuperano.
- "Ricomincia" (azzerato) svuota viste e riparte la storia.

---

## 4. Categorie di frasi (`src/config/frasi.ts`, 1432 righe)

Conteggi contati nel file. Sintassi segnaposto: `{nome}`, `{io}`, `{n}`, `{reale}`, `{realePartner}` (nelle VOCE i nomi veri Genna/Mati sono scritti direttamente). Una frase può essere `string` o `{testo, accessorio}`.

| Blocco | Cosa è | Quante | Quando si usa | Legame con fiori/data/personaggio |
|---|---|---|---|---|
| `FRASI` | frasi "della coppia", neutre, non legate a un personaggio | 14 categorie x 15-16 = 214: giusta, intelligente, brillante, completato, serie, sbagliata, sbagliataSerie, regalo, suggerimento, arrivo, partnerBrillante, vittoria, ripresa, invio | toast di gioco; 50% delle volte (se la VOCE ha frasi) altrimenti queste (`fraseMascotte` in regole.ts); `invio` = frasi da mandare al partner | `senzaSemina()` le filtra prima dello sblocco se nominano Semina. Nessun legame con fiori. |
| `VOCE[chi][categoria]` | voce di Semino e di Semina | ognuno 14 categorie (giusta, intelligente, brillante, completato, serie, sbagliata, sbagliataSerie, regalo, vittoria, solletico, chiacchiere, arrivo, partnerBrillante, ripresa, invio), circa 25 per categoria, chiacchiere circa 42 | ognuno commenta le mosse del PROPRIO giocatore dopo lo sblocco; prima parla solo Semino; chiacchiere ogni 40-60 s a riposo; solletico al tocco; `invio` sono frasi per il partner | personaggio: sì (vincoli su mare/montagna, test). Fiori: i pacchetti `FRASI_EXTRA` vi si aggiungono. Prima del fiore 5 solo `semino`. |
| `VOCE_SUGGERIMENTO` | frasi quando un regalo (suggerimento) riempie una cella | 25 (Semino) + circa 31 (Semina) | all'uso di un suggerimento | personaggio |
| `SONNO`, `SONNO_MOSSA` | frasi da svegliata nelle ore di sonno | 13 per personaggio; 3 per personaggio (da mossa) | orari in `src/config/sonno.ts` (ora locale): Semino dorme circa 3:30-11:30, Semina circa 22-6:30; un giorno su 4 Semina dorme fino a tardi | DATA/ORA + personaggio |
| `FRASI_EXTRA` | pacchetti sbloccabili | 9 pacchetti (vedi 2c) | si sommano alla lista della categoria quando `partite <= fiori` | FIORI + personaggio; `chi:'entrambi'` per categorie condivise |
| `GIORNI_SPECIALI[mare|montagna].chiacchiere` | in `storia.ts` | 8 + 8 per personaggio per giorno, 32 | chiacchiere dedicate al posto o in aggiunta | DATA (giorno dell'anno % 7) + personaggio |
| `SCENA_SBLOCCO`, `STORIA_SEMINO`, `STORIA_EXTRA` | scena di Semina; liste storia deprecate | 8 / 14 / 9 | solo SCENA_SBLOCCO è letta (ScenaSblocco). Le due storie sono morte (non importate dalla UI) | FIORI |

Esempi (testuali):
- giusta (FRASI): "sei mini", "un seme piantato bene", "mossa pulita"; VOCE.semino: "bracciata pulita", "compilato senza errori", "pulito come un tuffo senza schizzi".
- vittoria: FRASI "sei mini e abbiamo vinto", "Semino è fiorito"; semino "stasera cucino io", "build riuscita, si festeggia", "onda perfetta fino a riva"; semina "FIORITA! TUTTA!", "CIMA RAGGIUNTA!", "adesso mangio quello che ha cucinato Semino".
- chiacchiere: semino "oggi ho fatto quaranta vasche. Mentali.", "ho scritto un programma che conta i fiori. Dice che sono pochi. Lo sistemo."; semina "ho visto un riccio. Era mini. L'ho chiamato \"sei mini\".", "il muschio cresce lento ma non sbaglia mai una riga."
- invio (da mandare all'altra): "sei mini", "se(i)mini", "sei mignon", "smol", "ti penso", "ci sei?", "mini mini mini"; sbloccate a 12: "ti ho lasciato una frase nella cassetta", "sei il mio numero preferito", "giardino nostro".
- sonno: semino "mi sono addormentato sulla tastiera. Di nuovo", "sogno in esadecimale, non disturbare"; semina "dormire è il mio sport preferito dopo il cavallo", "non mi arrabbio solo perché ho sonno".
- giorno del mare (semina): "il mare mi piace quando c'è Semino. Oggi c'è. Quindi oggi il mare mi piace tantissimo."; montagna (semino): "la montagna è una griglia tutta in verticale. Con la fatica in ogni casella."
- Tono ricorrente "sei mini" e varianti: i test impongono più di 5 occorrenze e al massimo il 15% del totale.
- Scelta: memoria delle ultime 8 usate per categoria (`regole.ts`), mai due uguali di fila.

---

## 5. Punti del codice da toccare

### (a) Scena a dialogo "tap per continuare" in primo piano dopo OGNI livello
Il meccanismo esiste già in due forme riusabili:
- `src/ui/ScenaSblocco.tsx`: schermo intero, una `Battuta` per tocco (legge `SCENA_SBLOCCO` hardcoded in import: andrebbe parametrizzata con `battute` come prop), bottone finale `onFine`, solo per fiori 5.
- `src/ui/Vittoria.tsx`: già gestisce `sorpresa: Battuta[]` ("tocca per continuare") ma solo dentro la carta della vittoria e solo per 9 soglie.
Cosa modificare:
1. `src/config/storia.ts`: aggiungere un contenitore dati per livello (es. `SCENE: {partite|chiave, battute: Battuta[]}`) o far diventare `Tappa` portatrice di `battute?`. Oggi `Tappa` ha un solo `testo`.
2. `src/ui/regole.ts`: sostituire/affiancare `sorpresaDaMostrare(fiori, viste, sbloccata)` (riga ~539) con una funzione che sceglie la scena per OGNI vittoria (non `fiori === N` esatto, non scartata se `sorpresa-N` vista) e non dipende da `scenaDaMostrare`. Decidere cosa succede con più scene arretrate.
3. `src/ui/App.tsx`: `effetti.vittoria` (riga ~322) già è il punto di aggancio; `vittoriaAperta` (riga 517) e `scena` (riga 518) decidono cosa si vede. Per forzare la scena prima della Vittoria o al posto della Home-tappa si può: (i) mostrare la scena a tutto schermo con `schermata==='partita'` e `partita.finita`, prima di montare `<Vittoria>`; (ii) togliere "Nuova partita" dalla Vittoria o farla passare dalla scena (`onNuova` in riga ~796); (iii) rimuovere o trasformare `tappaHome`/`homeVista` (righe 520-538), `AnnuncioSblocco` (righe 540-552, 819) e `sblocchiNuovi`.
4. `src/ui/Vittoria.tsx`: se la scena diventa generale, togliere il blocco `battuta && sorpresa` (righe 120-139) o riusarlo come sotto-componente; separare le battute dalla carta.
5. `src/ui/ScenaSblocco.tsx`: parametrizzare (`battute`, `titolo`, chi compare in scena e quando sbuca Semina: oggi `primaDiLei`/`svela` sono ricavati da `chi === 'semina'`/`'nessuno'`, coupling con la scena di Semina).
6. `src/stato/archivio.ts`/`sync.ts`: le chiavi viste sono `string[]` libere, nessuna migrazione per nuove chiavi, ma decidere se "vista" resta di coppia (union nel Worker) o diventa per giocatore (`tappeViste` -> per ruolo/`io.nome`), con eventuale nuovo passo in `PASSI` e `VERSIONE_ARCHIVIO`.
7. Test da aggiornare: `src/config/storia.test.ts` (ordine, unicità chiavi, lunghezza max 240, "tappe 0-5 invariate", "fitta fino a 20", sorprese solo a soglie `[7,10,15,20,25,30,40,50,60]`, elementi alla stessa soglia), `src/ui/regole.test.ts`, `src/ui/compat-t2.test.ts`, E2E `scripts/qa/` (sblocco di Semina cerca `data-testid="scena-sblocco"`, `scena-andiamo`, `annuncio-sblocco`, `sorpresa`, `vittoria`).

### (b) Personaggi secondari
- `ChiParla = 'semino'|'semina'` (`frasi.ts` riga 316) e `Tappa.chi`/`Battuta.chi` sono unioni chiuse. `Profilo.id` e `ProfiloId` (`giocatori.ts`) sono lo stesso dominio: i personaggi giocanti coincidono con i giocatori. Un personaggio secondario non-giocante conviene come terzo tipo di "voce" di sola narrazione, senza passare per `ChiParla`, oppure estendere solo `Battuta.chi` (già ha `'nessuno'` come narratore).
- Rendering: `Semino.tsx` (`SeminoChi`, `ACCESSORI`, `ACCESSORI_DI` righe 621-640; componente `Semino`, `SeminoCoppia`), `Scena.tsx` (elementi SVG, `ELEMENTI_SCENA`, già ha merlo e cavallino come "elementi" non personaggi), `ScenaSblocco.tsx` (attori), `Vittoria.tsx` (`sorpresa-chi`: l'etichetta è hardcoded `'Semina' : 'Semino'`, righe 128), CSS `src/**/*.css` (classi `fumetto--semina`, `fumetto--entrambi`, `fumetto--narra`, `sorpresa-semina|semino|nessuno`).
- Logica: `Home.tsx` `Eroe` (`parla`, `variante`, `firma()`), `regole.ts` (`MAI`, `accessorioPermesso`, `nominaSemina`, `senzaSemina`, `frasiDisponibili`).
- Dati: `storia.ts` `Tappa.chi` e `Battuta`, `FRASI_EXTRA.chi`.
- Test vincolanti: `storia.test.ts` ("Semino: niente montagna...", "Semina: il mare solo con Semino", `CHI`, `ACC_SEMINO`, `ACC_SEMINA`, `PRINCIPALI`).

### (c) Skin dipendenti dai luoghi visitati
- Oggi NON esistono skin: `grep -ri skin src` è vuoto. Il concetto più vicino sono gli accessori (`ACCESSORI` in `Semino.tsx`) e gli elementi della Scena SVG (`ELEMENTI_SCENA` in `Scena.tsx`), sbloccati dai fiori.
- "Luoghi visitati" non è tracciato in nessun posto. I luoghi sono soltanto: i campi `Tappa.scena` ('alba'|'notte'|'mare'|'montagna'|'pioggia'|'stelle'|'prato'), le chiavi `GiornoSpeciale` ('mare'|'montagna') e gli elementi `mare`, `montagna`, `stagno`, ecc. Nessun valore salvato dice "il giocatore è stato in X".
- Da fare: aggiungere un campo derivabile, es. `luoghiVisitati: string[]` in `Archivio` (campo extra, senza migrazione obbligatoria, ma da includere in `payloadDa`/`leggiPayload`/`unisciRemoto` di `sync.ts` e in `memoria.ts` se deve viaggiare), da popolare in App.tsx dove si marcano le tappe/scene viste (righe ~326, ~535, `fineScena`). Oppure derivare i luoghi da `tappeViste` + `STORIA[].scena` (zero nuovi dati: `luoghi = new Set(STORIA.filter(t => viste.includes(chiaveDi(t))).map(t => t.scena))`).
- Applicazione skin: `regole.accessorioPermesso(chi, a, fiori, o)` (riga 473) filtra già per soglia di fiori tramite `SOGLIA_ACCESSORIO` (da `SBLOCCHI` di tipo accessorio): è il punto naturale per sostituire il test su `fiori` con un test sui luoghi; `Home.tsx` `accessoriTappa` / `useAccessoriRiposo` (righe ~236-290); `Semino.tsx` `ACCESSORI_DI`; `AnnuncioSblocco.tsx` (`chiDi`, `testoRegalo` per tipo 'accessorio'). Se la skin è più di un accessorio (tutto il corpo) serve un nuovo prop in `Semino`/`SeminoCoppia`.
- Attenzione: `giornoSpeciale` dipende dalla data, non dall'esperienza del giocatore.

---

## 6. Vincoli trovati

1. Prima di 5 fiori Semina non esiste (sorpresa). Applicato a più livelli: `Profilo.nomePrima` ('Verde'/'Blu'), `nomeVisibile()` ritorna ora sempre il nome reale, `senzaSemina()` filtra le frasi che nominano Semina (`nominaSemina`), niente `SeminoCoppia`, niente giorni speciali, niente sorprese (`sorpresaDaMostrare` esige `sbloccata`), chiacchiere di Semina assenti. `sbloccata` è per DISPOSITIVO e richiede `semina-5` in `tappeViste` (cioè aver visto la scena). Una tappa o sorpresa o frase che nomini Semina prima del fiore 5 viola il vincolo; un test (`storia.test.ts`) copre solo i conteggi/accessori, non esplicitamente "nessuna tappa 0-4 nomina Semina".
2. Ruoli: Verde = Semino = Genna = ruolo `'a'` = colore `#7CFF4A`; Blu = Semina = Mati = ruolo `'b'` = `#2F6BFF`. Il ruolo di gioco viene SOLO dal profilo (`ruoloDiNome`), mai dall'ordine di connessione. Posti per profilo nella stanza P2P (`-a` solo Semino, `-b` solo Semina). Le battute della storia nominano "Genna" e "Mati" nel testo (tappe 12, 27, 43, 58, sorpresa 20), quindi la storia è personale e fissa a questa coppia. Il colore nel gioco: verde/blu solo nei dettagli, mai a blocchi (`docs/design/studio-ui.md`).
3. Tappe e chiavi: una sola tappa per numero di fiori (test), chiave `${chi}-${partite}`: cambiare `partite` fa ripresentare la tappa a chi l'ha già vista; la tappa `semina-5` e `CHIAVE_SBLOCCO` sono agganciate al valore `SEMINA_SBLOCCATA_A`; le chiavi di tappe tra 0 e 5 e la tappa 6 `semino-6` sono bloccate da test ("tappe 0-5 invariate").
4. Vincoli del test sulla storia: testi <= 240 caratteri; densità fitta (gap <= 2 fino a 20, <= 5 fino a 60); devono esistere le tappe 60, 80 e 100; ogni elemento del giardino ha una tappa alla stessa soglia e la sua descrizione nell'`E` (se si riscrive la storia questi test vanno riscritti, sono i più rigidi); `SORPRESE` ha esattamente quelle 9 soglie, 2-3 battute.
5. Contenuto vincolante sui personaggi (`CLAUDE.md` e test): Semino = mare, surf, palla in acqua, PC/nerd, cucina, chitarra, notte; NON ama la montagna (nominarla solo con "fatica" o "lament*", regex `montagnaOk`); accessori Semino `occhiali, cuoco, palla, chitarra, surf`, mai `montagna`/`cavallo`. Semina = montagna, cavallo, natura, animali, alba, euforia, qualche arrabbiatura; accessori `corona, montagna, cavallo, animale, chitarra`; il mare nelle sue frasi solo con "Semino"/"lui" nel testo. A entrambi piace dormire.
6. Il numero di fiori non decresce e dipende dallo storico di coppia: la storia avanza con le vittorie, indipendentemente da livello o modalità (sudoku/killer, semini ... supersemini valgono tutti 1 fiore). Un livello facile e uno supersemini sbloccano lo stesso. `livelli.ts` non ha alcun legame con la storia.
7. "Visto" è di coppia (Worker) e non del giocatore; sblocco di Semina e sorprese hanno la stessa condizione. P2P non porta le tappe.
8. Dati dichiarativi ma accoppiati alla UI: l'etichetta del personaggio nella sorpresa è hardcoded a due nomi (Vittoria.tsx ~riga 128), i testi finali della scena sono nel componente (ScenaSblocco.tsx), il saluto è nel componente (Home.tsx).
9. `Tappa.scena` e `Tappa.accessorio` sono "suggerimenti" con effetto minimo/forte: `scena` pilota solo l'elemento in evidenza nella Scena SVG; gli accessori dipendono da `accessorioPermesso` (soglie e `MAI`).
10. Cambiare i contratti in `src/*/types.ts` richiede la decisione della lead (`CLAUDE.md`); `Archivio` accetta campi extra senza migrazione ma `src/stato/types.ts` non ha campi di storia (è lo stato partita). I campi storia stanno in `archivio.ts`.

## Appunti su cose inattese
- Il testo della tappa 5 (Semina che si presenta) non viene mostrato in Home: è sostituito da `SCENA_SBLOCCO`, che dice altro.
- Le tappe e gli annunci non richiedono la presenza dell'altro giocatore, ma le sorprese sì (di fatto, perché dipendono dalla vittoria al momento).
- Il riassunto del REPORT dice "43 tappe": confermato, ma solo 1 è in primo piano.
- `STORIA_SEMINO` e `STORIA_EXTRA` sono morti (testi diversi dalla storia attuale: es. "Semino parla nel sonno. Dice \"sei mini\"" a 8 e "Cinquanta... siete tornati. Sempre.", mai mostrati), con un test che ne verifica ancora le tappe 0-5.
