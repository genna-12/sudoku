# Ricerca 2026-11-11 — Connessione P2P su iPhone: cause e correzione
- Data: 2026-11-11
- Domanda: perché la connessione tra i due iPhone non si ricostruisce da sola e come correggerla
- Usata da: [ADR 006](../adr/006-riconnessione-automatica.md)
- Da riverificare: stabile

## Sintesi
- Il battito c'è già (ping/pong ogni 5 s, perdita dopo 3 ping senza risposta) e anche gli ascoltatori `visibilitychange`/`online`. Il difetto non è che manchino. È che, dopo essersi accorta della perdita, la stanza **si fida del flag `peer.disconnected` di PeerJS** e lo prende come prova che la segnalazione sia viva. Su iOS il WebSocket di segnalazione può restare "aperto" ma morto (zombie), oppure chiudersi solo dal lato del telefono. In questi casi:
  - **Semino (posto `a`) resta fermo per sempre** su "aspetto il partner" (`logica.ts:430-434`, `logica.ts:454`);
  - **Semina (posto `b`)** chiama nel vuoto. Dopo 10 s ricrea il Peer con un **token nuovo**, trova il proprio ID "fantasma" ancora sul server e lo legge come "posto occupato da un altro mio dispositivo" (`logica.ts:268-277`). Riprova ogni 10 s per 60-90 s, mentre il pallino mostra un messaggio falso ("sei già collegata da un altro dispositivo").
- La stanza non usa mai `peer.reconnect()`: ogni ripartenza distrugge il Peer e ne crea uno nuovo, con un token casuale nuovo (`index.ts:60`, opzioni senza `token` a `index.ts:26`, `peer.ts:232`). Il server PeerJS restituisce l'ID allo stesso token (`webSocketServer:87-104`), a nessun altro. Per questo il proprio ID vecchio blocca il rientro.
- **Causa nuova e grave, latente**: qualunque errore della connessione dati, anche "messaggio troppo grande", viene trattato come chiusura (`index.ts:51-54` → `logica.ts:356-357`). Il canale JSON di PeerJS rifiuta i messaggi da 16 300 byte in su (`Json.ts:29-31`). A ogni `ciao` si manda lo **storico completo** (`App.tsx:542`, `App.tsx:474-478`), e ogni germoglio porta la partita intera (2,3-6 KB misurati). Con 3-4 germogli lo storico supera il limite: da quel momento la connessione si apre e cade in ciclo continuo.
- Il cambio schermata non c'entra con la rete: la rete vive in `App` e non si rimonta. Una "Nuova partita" mandata mentre il canale è giù, però, si perde in silenzio (`logica.ts:363-364`). Al rientro arriva con il merge del `ciao`, ma senza portare il partner sulla griglia e senza dirglielo.
- Correzione proposta (nessun cambio a `src/net/types.ts`, nessun messaggio nuovo):
  1. macchina a stati con "rinnovo della segnalazione" (`disconnect()` + `reconnect()` con lo stesso token) a ogni ritorno in primo piano, a ogni `online` e al risveglio rilevato dal timer;
  2. token **persistente per dispositivo**, così il proprio fantasma si recupera subito;
  3. battito più stretto, basato sul silenzio;
  4. backoff con tetto basso per `b` finché la pagina è visibile;
  5. storico mandato a lotti sotto i 12 KB, e gli errori di invio che non chiudono più la connessione.

## 1. Come funziona oggi (mappa breve)
- `src/ui/App.tsx:620` apre `useRete` una volta sola per tutta l'app. `src/ui/useRete.ts:30-40` apre due stanze con `useStanza`: quella di coppia (posto fisso: Semino `-a`, Semina `-b`) e quella personale. Le dipendenze di `useStanza` sono stringhe (`src/ui/useStanza.ts:59`): cambiare schermata non riapre nulla.
- `src/net/index.ts` adatta PeerJS. Collega `visibilitychange` (solo quando torna `visible`) e `online` a `primoPiano()` (`index.ts:82-91`). Non ci sono `pageshow`, `pagehide`, `focus` né un rilevatore di risveglio.
- `src/net/logica.ts` è la macchina a stati. Solo `b` chiama `a` (`connettiAdA`, `logica.ts:307-319`); `a` accetta solo da `-b` (`logica.ts:321-330`). Ogni ripartenza passa da `ricomincia()` → `distruggiPeer()` → `registra()` → nuovo `Peer` (`logica.ts:201-211`, `229-236`).
- Battito: `setInterval(battito, 5000)` all'apertura (`logica.ts:380`). Ogni dato ricevuto azzera `mancati` (`logica.ts:394`). Al 4° giro senza dati si dichiara la perdita (`logica.ts:411-419`): circa 15-20 s. Al ritorno in primo piano, se c'è un canale, parte un ping di prova con 3 s di attesa (`logica.ts:440-452`).
- PeerJS 1.5.5 (`package.json:14`, `package-lock.json:6765`):
  - il socket di segnalazione manda un heartbeat ogni 5 s senza aspettare risposta (`socket.ts:87-104`);
  - se il WebSocket non è OPEN, `send()` scarta il messaggio in silenzio (`socket.ts:141-143`);
  - lo stato ICE `disconnected` non chiude il canale (`negotiator.ts:112-117`); lo chiudono solo `failed` e `closed`.
- Server PeerJS (`peer` 1.0.2, usato negli E2E; quello pubblico è dello stesso progetto, ma la versione non si può verificare):
  - un ID già presente con un **token diverso** riceve `ID-TAKEN` (`webSocketServer:87-101`);
  - con lo **stesso token** il server sostituisce il socket e **non manda `OPEN`** (`webSocketServer:103`). `OPEN` arriva solo con una registrazione nuova (`webSocketServer:134`);
  - un client si libera quando il server vede chiudere il socket (`webSocketServer:144-145`), oppure dopo `alive_timeout` senza heartbeat (`config:28` = 90 s di default, controllo ogni 300 ms in `checkBrokenConnections:5,67`);
  - i messaggi per un ID assente restano in coda e dopo 5 s tornano indietro come `EXPIRE` (`transmission:52`, `messagesExpire:80`, `config:27`). Se invece l'ID è presente ma il suo socket è mezzo aperto, il messaggio "parte" (`transmission:25`) e si perde senza nessun `EXPIRE`.

## 2. Ipotesi della spec, una per una

### H1 — iOS sospende la PWA e chiude il WebSocket di segnalazione e i DataChannel → **probabile** (non verificabile nel codice)
- Il codice non può provarlo. Le fonti dicono che su iOS bloccare il telefono o mandare la app in background chiude il WebSocket con `onclose`. Perdere la rete, invece (per esempio il passaggio Wi-Fi → dati), lasciava il socket "attivo" senza `onclose`: bug WebKit 247943, regressione di Safari 15.6-16.6, segnalato come risolto in iOS 17.3, ma la causa era fuori da WebKit.
- Per il DataChannel il codice conferma un punto: PeerJS non lo chiude quando ICE va in `disconnected` (`negotiator.ts:112-117`). Dopo il background il canale resta quindi "open" ma morto, finché il battito non se ne accorge.
- Conseguenza: il codice deve funzionare in tutti e due i casi, socket chiuso con evento e socket zombie senza evento. Oggi funziona solo nel primo, e solo se il server ha visto la chiusura.

### H2 — Al rientro nessuno fa `reconnect()` o ricrea il Peer, e nessuno richiama il partner → **confermata nella sostanza, smentita alla lettera**
- Gli ascoltatori ci sono (`index.ts:82-91`) e chiamano `primoPiano()` (`logica.ts:440-462`). I buchi sono altri:
  - `a` senza canale e con il Peer creduto vivo non fa nulla: `if (tentato === 'a' && peerVivo()) return;` (`logica.ts:454`). `peerVivo()` legge solo `peer.disconnected` (`logica.ts:213-215`), che resta `false` con un socket zombie (PeerJS non ha risposta all'heartbeat: `socket.ts:93-104`).
  - Lo stesso vale nella perdita: `a` con il Peer creduto vivo "resta e aspetta" (`logica.ts:430-434`) e non rinnova mai la segnalazione.
  - `b` con il Peer creduto vivo richiama `a` (`logica.ts:436`, `455-458`). L'offerta però viene scartata in silenzio (`socket.ts:141-143`) o finisce in un socket morto: arriva il timeout di 10 s (`logica.ts:312-318`), poi `ricomincia` crea un Peer **nuovo con token nuovo** e incontra il fantasma (vedi H3).
  - `peer.reconnect()` non si usa mai. Si distrugge e si ricrea sempre, quindi il token cambia (`peer.ts:232`; `index.ts:26` non passa `token`).
  - Nessun `pageshow`, `focus` o rilevatore di risveglio. Se iOS non manda `visibilitychange` (capita in standalone) o non manda `online` al cambio Wi-Fi → dati (`navigator.onLine` resta `true`), resta solo il battito.
- "Nessuno richiama il partner": `a` per progetto non chiama mai; `b` chiama, ma da una segnalazione che può essere morta.

### H3 — Il posto resta occupato dall'ID fantasma per circa 60 s → **confermata**
- Catena:
  1. iOS chiude il socket solo dal lato del telefono (rete cambiata, sospensione): il server non vede la chiusura;
  2. il client ricrea il Peer (`logica.ts:461` o `437`) con un token nuovo;
  3. il server risponde `ID-TAKEN` perché il token è diverso (`webSocketServer:90-101`);
  4. `gestisciErrore('unavailable-id')` con posto fisso e non registrato (`logica.ts:268-277`) mostra "occupata" e riprova ogni 10 s (`OCCUPATA_RITENTA_MS`, `logica.ts:18`);
  5. il pallino dice "sei già collegato/a da un altro dispositivo" (`src/ui/presenza.ts:16`, via `useRete.ts:52`).
- Il fantasma vive fino ad `alive_timeout`, contato dall'ultimo heartbeat ricevuto: 90 s nel server degli E2E (`config:28`), circa 60 s secondo la spec per il server pubblico (non verificabile). Il caso tipico è il background di 30-90 s.
- Uscire e rientrare "funziona" solo perché nel frattempo il fantasma scade, e perché si riparte da zero anche dal lato `a` bloccato (H2).

### H4 — Manca un battito per i DataChannel morti ma "open" → **smentita**
- Il battito c'è (`logica.ts:8-12`, `380`, `399-403`, `411-419`) e c'è anche la prova al primo piano (`logica.ts:440-452`). Il canale morto viene scoperto in 15-20 s, o in 3 s al ritorno in primo piano.
- Il problema sta dopo la scoperta (H2): cosa si fa con la segnalazione. Margine di miglioramento: 15-20 s non sono i "pochi secondi" della spec quando il cambio di rete avviene a pagina visibile.

### H5 — Il partner arriva durante il cambio di schermata ("Nuova partita") → **smentita per la connessione, probabile per la percezione**
- La rete non dipende dalle schermate (`App.tsx:620`, `useStanza.ts:59`), e la generazione del puzzle non blocca il thread: misurata in Node, al massimo 175 ms (killer supersemini), contro i 15 s che servono al battito per scattare.
- Però se il canale è giù, o è zombie non ancora scoperto, il `nuova` si perde: `inviaGrezzo` senza `conn` lo scarta in silenzio (`logica.ts:363-364`), e su uno zombie `send` riesce ma non arriva nulla.
- Al rientro il `ciao` porta la partita più recente e il merge la sceglie (`App.tsx:535-544` → `usePartita.ts:371-381` → `stato/index.ts:59-64`). Il ramo `ciao`, però, non porta il partner sulla griglia e non annuncia la partita nuova come fa il ramo `nuova` (`App.tsx:563-585`). Il partner resta in Home o sulla Vittoria: "si è persa la connessione".

## 3. Cause aggiuntive trovate
- **N1 — Messaggio troppo grande = connessione chiusa (confermata nel codice, latente nei dati).**
  - PeerJS JSON: un messaggio da 16 300 byte in su genera l'errore `message-too-big` e non parte (`Json.ts:29-31`; `dist/bundler.mjs:11`, `:1408`).
  - L'adattatore tratta **ogni** `error` della connessione dati come chiusura (`index.ts:51-54`), e `prepara()` la trasforma in `perdita` (`logica.ts:356-357`). Così anche `not-open-yet` chiude.
  - Lo storico completo parte a ogni `ciao` (`App.tsx:542`, `474-478`).
  - Misure con i moduli veri: voce finita circa 200 B; germoglio (voce con `stato`) da 2,3 KB (sudoku semini) a 6 KB (killer); `nuova` da 0,5 a 1,7 KB.
  - Non c'è tetto ai germogli: solo `MAX_STORICO = 200` voci (`stato/index.ts:8`). Con 3 germogli killer o circa 4 germogli sudoku più una decina di fiori si supera il limite. Da lì: connetti → `ciao` → storico → errore → perdita → riconnetti, ogni pochi secondi. Uscire e rientrare non serve.
  - Si riconosce dal menù Diagnostica, riga `errore connessione dati message-too-big` (`index.ts:52`).
- **N2 — `b` si blocca da solo sul proprio fantasma (confermata, se il socket è zombie).** Percorso: `logica.ts:436`/`455-458` → offerta persa → timeout 10 s (`logica.ts:312-318`) → `ricomincia` → token nuovo → `ID-TAKEN` → "occupata" fino a 90 s. In tutto 10 s + fino a 90 s, con un testo falso nel pallino.
- **N3 — Credenziali TURN tenute per tutta la vita della pagina (probabile, latente).** `caricaIce` le mette in cache senza scadenza (`src/net/ice.ts:32-40`). Il Worker le genera con TTL di 24 h e le tiene in cache per 1 h (`worker/src/index.ts:22-23`). Una PWA iOS che resta in memoria per più di 23 h circa, sui dati con NAT simmetrico, non trova più il relay: compare in ciclo "il partner c'è ma la connessione diretta non riesce" (`logica.ts:316`). Uscire dalla stanza non serve; serve uccidere la app.
- **N4 — `peer-unavailable` per `a` distrugge anche una connessione viva (possibile, raro).** `gestisciErrore` non controlla `conn` per `a` (`logica.ts:286-291`). Un `EXPIRE` di risposte o candidati in ritardo verso un `b` che ha perso la segnalazione abbatte il canale buono.
- **N5 — Nessun timeout di registrazione e nessun backoff.** Se il WebSocket resta in "connecting" si aspetta il timeout del sistema. I tentativi sono fissi a 3 s, anche per ore (`RITENTA_MS`, `logica.ts:8`).
- **N6 — Storico perso mentre si è scollegati (fuori dal tema, da segnalare).** Il timer dello storico segna come "inviate" anche le voci mandate con canale assente (`App.tsx:510-513`, con `invia` che le scarta). Il riallineamento completo al `ciao` ripara, quindi non fa danni oggi, ma diventa un problema se N1 viene corretto togliendo l'invio completo.

## 4. Sintomi → cause, in ordine di gravità
1. **Al rientro non si riconnette da sola** (sintomo 3):
   - H2: `a` fermo con segnalazione zombie, `logica.ts:430-434`, `454`; confermata, con H1 probabile;
   - H3/N2: fantasma con token nuovo, poi "occupata" per 60-90 s; confermata;
   - aggravante: nessun evento sul cambio di rete; probabile.
2. **Entrando a volte non si vedono** (sintomo 1):
   - H3: fantasma della sessione precedente, dopo che iOS ha ucciso la app o dopo un cambio di rete; confermata;
   - H2 lato `a`: confermata;
   - N1, se lo storico è cresciuto (non risolto rientrando): latente;
   - N3 (non risolto rientrando): latente.
3. **Persa premendo "Nuova partita"** (sintomo 2, una volta sola):
   - stesso meccanismo del sintomo 1, con un dei due appena tornato da un'altra app o passato ai dati; probabile;
   - più H5: `nuova` perso e `ciao` che non porta sulla griglia; confermata nel codice;
   - N1 solo se lo storico era già vicino al limite.

## 5. Compatibilità: messaggi di tipo sconosciuto
- **Sì, il client attuale li ignora senza errori.**
  - `ricevi()` azzera `mancati` (`logica.ts:394`): anche un messaggio sconosciuto conta come segno di vita.
  - `eMessaggio()` filtra con la lista `TIPI` (`logica.ts:99-103`). Un `t` sconosciuto produce `log('messaggio ignorato', d)` e niente altro (`logica.ts:395-397`). `App.suMessaggio` non lo vede mai, e il suo `switch` non ha `default` (`App.tsx:534-610`).
  - Campi in più su un tipo noto passano senza controlli a runtime.
- Avvertenza: ogni messaggio ignorato aggiunge una riga al REGISTRO (80 righe, `index.ts:16-20`). Un battito di tipo nuovo, ogni pochi secondi, svuoterebbe la Diagnostica del telefono vecchio.
- **Il battito deve riusare `ping`/`pong`**: sono già nel contratto (`types.ts:20-21`) e il client vecchio risponde già `pong` (`logica.ts:399-402`).

## 6. Progetto della correzione (niente codice)

### 6.1 Principi
- Nessun messaggio nuovo e nessun ID nuovo: il telefono vecchio deve continuare a parlare con quello nuovo. I posti restano `-a`/`-b`, chiama sempre `b`, il battito è `ping`/`pong`.
- Il flag `peer.disconnected` non basta come prova che la segnalazione sia viva. A ogni occasione di dubbio la segnalazione **si rinnova** in modo economico: stesso Peer, `disconnect()` seguito da `reconnect()`. Il Peer si ricrea da zero solo come ultima risorsa, e con lo stesso token.

### 6.2 Macchina a stati (interna a `logica.ts`; verso fuori restano i 4 `StatoConnessione`)
| stato interno | `StatoConnessione` / dettaglio | esce con |
|---|---|---|
| AVVIO | `connessione` / "mi collego" | frase derivata → REGISTRAZIONE |
| REGISTRAZIONE | `connessione` / "mi collego" | `open` → ATTESA; nessun `open` né errore entro 4 s → RECUPERO_POSTO; `ID-TAKEN` → RECUPERO_POSTO; altro errore → backoff |
| RECUPERO_POSTO | `in-attesa` / "mi ricollego…" | vedi 6.4 |
| ATTESA (a) | `in-attesa` / "aspetto il partner" | connessione in arrivo da `-b` → APERTURA; ogni 30 s, se visibile: rinnovo della segnalazione |
| ATTESA (b) | `in-attesa` / "cerco il partner" | chiamata a `-a` con backoff (6.3) → APERTURA |
| APERTURA | `in-attesa` / "mi collego al partner" | `open` → CONNESSO; 12 s → ATTESA (b: tentativo successivo) |
| CONNESSO | `connesso` | silenzio oltre il limite (6.5) o `close` → RICONNESSIONE |
| RICONNESSIONE | `in-attesa` / "mi ricollego…" | rinnovo della segnalazione, poi ATTESA (`b` chiama subito) |
| SOSPESO | stato precedente congelato | pagina nascosta: niente tentativi; al ritorno → VERIFICA |
| VERIFICA | invariato per al massimo 2,5 s | con canale: `ping` di prova → CONNESSO o RICONNESSIONE; senza canale → RICONNESSIONE |
| OCCUPATA | `in-attesa` / `occupata` | solo con la prova di un altro mio dispositivo (6.4) |
| ERRORE | `errore` | fatali di oggi (`logica.ts:293-300`) |

Eventi che portano a VERIFICA:
- `visibilitychange` → `visible`;
- `pageshow` (anche con `persisted`);
- `focus`;
- `online`;
- **rilevatore di risveglio**: un `setInterval` da 2 s; se tra due giri passano più di 6 s, la pagina era sospesa. Funziona anche quando iOS non manda eventi.

Su `visibilitychange` → `hidden` e su `pagehide`: `peer.disconnect()`, cioè si chiude solo la segnalazione, il canale dati resta. Così il server libera subito l'ID, se il frame di chiusura riesce a partire. Poi SOSPESO.

Rinnovo della segnalazione:
- se il Peer non è distrutto: `disconnect()`, pausa di 300 ms, `reconnect()` (stesso ID, stesso token);
- se il Peer è distrutto: Peer nuovo con il token persistente (6.4).

Per `b` il rinnovo è seguito subito da una chiamata ad `a`. Per `a` basta il rinnovo: `b` lo trova entro il suo backoff.

Correzioni puntuali:
- `peer-unavailable` per `a` con canale vivo: ignorarlo (N4).
- `disconnected` con canale vivo: rinnovare la segnalazione, invece di non fare nulla (`logica.ts:257-262`). Il canale resta, e intanto il partner può tornare a chiamare.

### 6.3 Backoff
- Chiamate di `b` verso `a`, solo a pagina visibile: 0 → 1 → 2 → 4 → 8 s, poi fisso a 8 s, con ±20% di casualità. Si azzera su CONNESSO, VERIFICA o `online`.
- Ricreazione del Peer (ultima risorsa): 0 → 2 → 5 → 10 → 20 → 30 s, poi fisso a 30 s.
- OCCUPATA vera: 10 → 20 → 30 s.
- Pagina nascosta: nessun timer. Al ritorno si riparte dal primo gradino.
- Tutto si ferma su `chiudi()`, come oggi.

### 6.4 ID vecchio: recupero del posto (scelta consigliata) e alternative
- **Consigliata: token persistente per dispositivo.**
  - `index.ts` passa a PeerJS `token` letto da `localStorage`: casuale, generato una volta, una chiave per dispositivo, con `try/catch` e un token casuale di riserva.
  - Il server ridà l'ID allo stesso token (`webSocketServer:87-104`): il fantasma lasciato dallo stesso telefono non blocca più, nemmeno dopo che iOS ha ucciso la app.
  - Un altro mio dispositivo ha un token diverso: riceve ancora `ID-TAKEN`, e la regola dei posti per profilo resta intatta.
  - Insidia trovata nel server: con lo stesso token **non arriva `OPEN`** (`webSocketServer:103`). Da qui la regola della REGISTRAZIONE: nessun `open` né errore entro 4 s vuol dire "posto ripreso in silenzio". Allora `disconnect()`, pausa di 300 ms e `reconnect()`: il server vede chiudere il socket appena ripreso, libera l'ID (`webSocketServer:144-145`) e alla riconnessione manda `OPEN` (`webSocketServer:134`). Se ancora non arriva `OPEN`, `a` si considera registrato (lo verifica la prima chiamata di `b`) e `b` chiama comunque: un `EXPIRE` o il timeout dicono se la segnalazione funziona.
  - Due schede sullo stesso dispositivo (per esempio il browser integrato della chat) si ruberebbero il posto. Con `navigator.locks` (Web Locks, iOS 15.4+) solo la scheda che tiene il lucchetto usa il token persistente; le altre usano un token casuale e ricevono "occupata" come oggi.
- `ID-TAKEN` con token persistente si spiega in due modi: un altro mio dispositivo, oppure un fantasma di un'installazione precedente (storage cancellato). Si distinguono con la stanza personale: "occupata" solo se `personaleConnesso` (già presente in `useRete.ts`). Altrimenti si mostra "mi ricollego… (il posto si libera entro un minuto)", con il backoff di 6.3 fino ad `alive_timeout`.
- Alternativa scartata: **ID con suffisso di sessione** (`-a-<sessione>`). Il server pubblico non permette di elencare i peer (`allow_discovery: false`), quindi `b` non potrebbe trovare `a` senza un registro esterno. Il KV del Worker è eventualmente consistente (fino a circa 60 s) e ha un limite di scritture (CLAUDE.md, `config/sync.ts:7-8`). In più il telefono vecchio non lo capirebbe.
- Alternativa scartata: **più posti per ruolo** (`-a0..-a3`). `b` chiamerebbe tutti i posti e il controllo "occupata" si romperebbe. Più complessa e meno compatibile.

### 6.5 Battito
- Restano `ping`/`pong`. Si passa a un controllo "silenzio": si conta il tempo dall'ultimo dato ricevuto, qualunque dato.
  - `ping` ogni 3 s, solo se negli ultimi 3 s non si è inviato altro;
  - perdita se il silenzio supera **9 s**, con motivo `silenzio 9 s (ultimo dato hh:mm:ss)`;
  - prova al primo piano: `ping` con 2,5 s di attesa, motivo `nessuna risposta dopo il ritorno`.
- Traffico: circa 30 byte ogni 3 s, trascurabile.
- A pagina nascosta il conteggio si sospende, così il ritardo dei timer non genera false perdite.
- Ogni perdita scrive nel REGISTRO uno di questi motivi: `silenzio`, `close`, `errore negoziazione`, `ritorno senza risposta`.

### 6.6 Errori di invio e storico a lotti (N1)
- In `adattaConn` solo `negotiation-failed` e `connection-closed` contano come chiusura. `message-too-big` e `not-open-yet` si scrivono nel REGISTRO e non chiudono nulla.
- `inviaGrezzo` misura il JSON. Sopra i 15 000 byte non lo manda e lo scrive nel REGISTRO con il tipo del messaggio.
- Lo `storico` si spezza in **lotti da al massimo circa 12 KB**, più messaggi `storico` di fila. È compatibile: `riceviStorico` fonde liste parziali e `daRimandare` lavora per lotto (`App.tsx:480-500`, `regole.ts:829-833`). Va in `App.tsx` o in un aiuto di `regole.ts`, non nel contratto.
- Le voci segnate "inviate" a canale assente vanno sistemate (N6), prima di pensare di togliere l'invio completo al `ciao`.

### 6.7 Altri ritocchi collegati
- `caricaIce`: la cache scade dopo 12 h e si rinnova anche alla RICONNESSIONE quando le ultime due APERTURE sono fallite (N3). I server nuovi valgono per il Peer successivo.
- `ciao` con una partita diversa e più recente (`nuova` persa): `App` si comporta come per `nuova`, cioè porta sulla griglia e mostra il banner "X ha iniziato una nuova partita" (H5). È un cambio solo in `App.tsx`.
- Pallino:
  - `useRete` espone anche `coppia.dettaglio`;
  - in Partita la chip mostra "mi ricollego…" quando lo stato è `in-attesa` con quel dettaglio (`Partita.tsx:76-80`);
  - "già collegato altrove" solo con la prova della stanza personale (6.4).

### 6.8 Chi richiama chi
- Resta **solo `b` → `a`**, per compatibilità. Il vecchio `a` accetta solo da `-b` (`logica.ts:321-327`) e il vecchio `b` chiude le connessioni in arrivo.
- Dopo una perdita, `a` non chiama. Rinnova la segnalazione e la tiene fresca (al ritorno e ogni 30 s mentre aspetta).
- `b` chiama subito e poi con il backoff. Chi torna per ultimo fa ripartire tutto:
  - se torna `b`, chiama subito;
  - se torna `a`, `b` lo trova entro 8 s;
  - con il rinnovo al ritorno, `a` è raggiungibile in meno di 1 s.
- Se arriva una nuova chiamata da `b` mentre `a` crede ancora vivo il canale vecchio, oggi si sostituisce correttamente (`logica.ts:372-375`): da tenere.
- La partita riprende con il `ciao` e il merge di oggi (`logica.ts:388`, `App.tsx:535-544`).

## 7. `src/net/types.ts`: cambia?
- **No, per la correzione proposta.**
  - `ping`/`pong` ci sono già (`types.ts:20-21`).
  - Gli stati restano i 4 di `StatoConnessione` (`types.ts:4`), con dettagli nuovi: il dettaglio è una stringa libera.
  - Il token persistente e i nuovi eventi del browser stanno dentro `index.ts` e `logica.ts`, cioè `OpzioniStanza` e `PeerMinimo`, che non sono contratto.
  - Lo storico a lotti usa il messaggio `storico` così com'è.
- **Serve un ADR solo se la lead sceglie** uno di questi:
  - (a) uno stato `riconnessione` in `StatoConnessione`;
  - (b) un metodo `riprova()` o `primoPiano()` in `Stanza`, per un tasto "riprova ora";
  - (c) un campo nuovo nel `ciao` (per esempio una versione del client, per la Diagnostica).
- Nessuno dei tre è necessario.
- Fuori da `types.ts` cambiano anche interfacce interne di `logica.ts` (`PeerMinimo`: `riconnetti()`, `aperto`; `GestoriConn`: il tipo d'errore). Non sono contratto, ma `logica.test.ts` (492 righe) va adattato.

## 8. E2E da scrivere (Playwright, come `scripts/qa/*.mjs`)
Base comune: due contesti Chromium 390×844 (A = Semino `a`, B = Semina `b`), stessa frase, aiuti di `scripts/qa/comune.mjs`. Il criterio è sempre lo stesso:
- `[data-testid="connesso"]` su entrambi entro **8 s** dal "ritorno";
- poi una mossa di A si vede su B e viceversa;
- `archivio.partita` uguale sui due lati (seed e celle, da `localStorage`).

Attrezzi nuovi da preparare:
- `scripts/qa/proxy-segnale.mjs`: proxy TCP fra i browser (porta 9000, quella di `VITE_PEER_PORT`) e il server PeerJS su 9001, avviato dallo script come processo figlio (`npx peerjs --port 9001 --alive_timeout 60000`, opzione già nella CLI). Riconosce chi è chi dal parametro `id=…-a` / `id=…-b` della richiesta di upgrade, e per ogni posto sa fare tre cose:
  - **chiudi pulito**: chiude tutti e due i lati;
  - **fantasma**: chiude il lato del browser e lascia aperto quello del server, che tiene l'ID fino ad `alive_timeout`;
  - **zombie**: smette di inoltrare in tutte e due le direzioni senza chiudere niente; il WebSocket del browser resta OPEN.
- Script iniettato con `context.addInitScript`:
  - `document.visibilityState`/`hidden` comandabili (`window.__qa.nascondi()` e `mostra()`, che mandano `visibilitychange`, `pagehide` e `pageshow`);
  - registro dei `RTCDataChannel`, con modalità **muto** (`send` diventa no-op e i `message` in arrivo si scartano) per un canale "open" ma morto, come su iOS.
- Sospensione vera dei timer: CDP `Page.setWebLifecycleState` con `frozen` e poi `active`, da `context.newCDPSession(page)`. Da provare in headless. Se non funziona, si usa la pagina "nascosta" con il canale muto, senza congelare.
- Rete: `context.setOffline(true/false)` fa scattare `offline`/`online` e `navigator.onLine`. Non tocca il WebRTC su localhost, per questo serve il canale muto.

Test:
1. **`background-ios.mjs`**: pagina nascosta 30-120 s, socket chiuso, offline, poi ritorno.
   - Matrice (fra parentesi i default per non far durare troppo il test):
     - lato nascosto: A, B;
     - durata: 30 s, 75 s (sotto e sopra `alive_timeout` 60 s), 120 s;
     - socket: pulito, fantasma, zombie.
   - Passi: tutti e due in partita con alcune mosse. Sul lato X:
     - nascondi, congela, canale muto, socket secondo la variante, `setOffline(true)`;
     - aspetta la durata; nel frattempo l'altro lato fa 2 mosse;
     - `setOffline(false)`, scongela, mostra.
   - Atteso: connessi entro 8 s; le 2 mosse fatte durante l'assenza presenti su X; il pallino non dice mai "già collegato altrove" (`presenza.ts:16`).
   - Oggi deve fallire almeno nelle varianti fantasma (X = A o B) e zombie (X = A).
2. **`cambio-rete.mjs`**: Wi-Fi → dati a pagina visibile. Zombie più canale muto su X, **senza** eventi `online` o visibilità. Atteso: perdita scoperta dal battito e connessi entro 9 s + 8 s.
3. **`server-riavviato.mjs`**: server PeerJS locale riavviato a metà partita.
   - Il processo del server viene ucciso con SIGKILL: i socket si chiudono con RST.
   - Le mosse continuano sul canale dati: atteso, perché il canale non dipende dal server.
   - Il server riparte dopo 5-10 s. Poi si forza una perdita del canale (muto su B per 12 s).
   - Atteso: connessi entro 8 s grazie al server nuovo.
   - Variante: il server riparte mentre B è nascosto.
4. **`nuova-mentre-arriva.mjs`**: "Nuova partita" mentre il partner si collega.
   - A in partita; B ricarica la pagina.
   - Si clicca "Nuova" su A (`vittoria-nuova` dopo una vittoria, come in `capitoli-di-fila.mjs:86`, oppure dal menù della partita) in tre momenti, letti dalla console di B:
     - (a) a `[stanza] provo a registrarmi come b`;
     - (b) a `cerco il partner`;
     - (c) a `connesso`, con un ritardo da 0 a 300 ms.
   - Ripetere ogni momento 3 volte. Anche a ruoli invertiti (B fa "Nuova" mentre A arriva).
   - Atteso: connessi entro 8 s; `partita.puzzle.seed` uguale sui due; B sulla griglia o con il banner della partita nuova (H5).
5. **`storico-grande.mjs`** (per N1): archivi costruiti come in `scriviArchivio` (`comune.mjs:48-84`), con 20 fiori e 5 germogli killer da tutti e due i lati. Atteso: `connesso` stabile per 30 s, nessuna riga `message-too-big` nella console, storico unito sui due lati. Oggi deve fallire.
6. Gli E2E esistenti restano verdi: `due-client`, `personale`, `tre-dispositivi` (che controlla "occupata" vera), `arrivo-semina`, `capitoli-di-fila`.

## 9. Limiti e cose da verificare
- Il comportamento esatto di iOS (WebSocket chiuso con evento o zombie, durata della sospensione, eventi in standalone) viene da fonti web e dal codice, non da prove sul telefono. Per la prova reale di Genna e Matilde: aprire Diagnostica dopo un rientro fallito e cercare `posto … occupato`, `perso il server`, `message-too-big`, `la connessione diretta non si apre`.
- `alive_timeout` e versione del server PeerJS pubblico non sono verificabili. Il recupero con lo stesso token è letto dal codice di `peer` 1.0.2: va confermato dall'E2E 1 (variante fantasma) e, se possibile, con una prova sul server pubblico.
- Misure di dimensione e tempo fatte in Node con i moduli veri (`generaPuzzle`, `nuovaPartita`, `voceStorico`), su seed di prova e griglie riempite a metà. Sul telefono i tempi sono più alti, ma restano lontani dai 15 s.
- Non ho modificato codice. `npm ci` è stato eseguito per leggere `node_modules/peerjs` e `node_modules/peer`.

## Fonti
Repo (sudoku):
- `docs/specs/T9-collaudo.md` (sezione A), `CLAUDE.md`, `README.md` (E2E)
- `src/net/types.ts`, `src/net/index.ts`, `src/net/logica.ts`, `src/net/ice.ts`
- `src/ui/useRete.ts`, `src/ui/useStanza.ts`, `src/ui/App.tsx`, `src/ui/usePartita.ts`, `src/ui/presenza.ts`, `src/ui/Partita.tsx`, `src/ui/regole.ts`
- `src/stato/index.ts`, `src/stato/types.ts`, `src/stato/archivio.ts`
- `src/config/ice.ts`, `src/config/sync.ts`, `worker/src/index.ts`
- `scripts/qa/comune.mjs`, `scripts/qa/due-client.mjs`, `scripts/qa/capitoli-di-fila.mjs`
- `package.json`, `package-lock.json`

Codice di terze parti (sorgenti letti dalle source map in `node_modules`):
- `node_modules/peerjs` 1.5.5: `dist/bundler.mjs` e `dist/bundler.mjs.map` → `lib/peer.ts`, `lib/socket.ts`, `lib/negotiator.ts`, `lib/dataconnection/DataConnection.ts`, `lib/dataconnection/BufferedConnection/Json.ts`
- `node_modules/peer` 1.0.2 (server degli E2E): `dist/module.mjs.map` → `src/config/index.ts`, `src/services/webSocketServer/index.ts`, `src/services/checkBrokenConnections/index.ts`, `src/services/messagesExpire/index.ts`, `src/messageHandler/handlers/transmission/index.ts`, `src/instance.ts`; `dist/bin/peerjs.js` (opzioni `--alive_timeout`, `--expire_timeout`)

Web, consultate il 2026-11-11:
- WebKit Bugzilla 247943, "REGRESSION (Safari 15.6.1-16.6): WebSocket … does not emit onclose event when internet is turned off": https://bugs.webkit.org/show_bug.cgi?id=247943. Socket "attivo" ma morto quando cade la rete; bloccare il telefono o mandare in background invece chiudeva con `onclose`; segnalato come risolto in iOS 17.3.
- Elixir Forum, "LiveView does not reconnect when waking phone from sleep": https://elixirforum.com/t/liveview-does-not-reconnect-when-waking-phone-from-sleep/45962. Mancata riconnessione dopo il sonno del telefono; rimedi: riconnessione forzata, timeout del server più lungo.
- Ricerca a cui ho guardato solo l'elenco dei risultati, senza leggere le pagine: Apple Developer Forums 696310 ("WebSocket issue in IOS 15 Safari"), discuss-webrtc "Keeping RTCDataChannel open in background mode iOS".
