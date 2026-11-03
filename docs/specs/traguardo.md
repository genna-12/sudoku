# Traguardo 2 — Il giardino di Semino (03/11/2026)

T1 (MVP deployato, spec in git: commit 55da6ce) resta valido: qui solo ciò che cambia o si aggiunge.

## Concept (deciso dalla lead, non in discussione)
**Semino** è la mascotte: un semino (il pun con "sei mini") che cresce mentre i due risolvono. Ogni partita è una pianta nel **giardino** condiviso: finita = fiorita, lasciata a metà = germoglio (si può riprendere). La barra punti è la **crescita** di Semino nella partita corrente. I **regali** sono i suoi doni: suggerimenti. Semino parla (frasi in `src/config/frasi.ts`, storia in `STORIA_SEMINO`) e reagisce alle mosse: giuste, intelligenti, brillanti, chiusure, serie, errori. A `SEMINA_SBLOCCATA_A` fiori (5) si sblocca **Semina**, la sua compagna (stesso componente, `chi='semina'`, accento blu): da lì la storia la raccontano in due e nella Home compaiono insieme (`SeminoCoppia`). Le tappe della storia hanno il campo `chi` (semino | semina | entrambi) che decide chi parla nel fumetto.

Estetica: "notte in giardino". Niente viola generico da template: fondo verde-nero profondo con grana leggera, carta crema per il testo, i DUE colori dei giocatori come unici accenti vivi — **verde fluo per Genna, blu elettrico per lei** (`src/config/giocatori.ts`, decisi dal nome inserito). Superfici con bordi morbidi tipo foglia/seme, non card rettangolari uniformi. Tipografia: Recursive resta (il suo asse "casual" distingue stampato/scritto a mano). Tema chiaro: "mattina in giardino" (crema, verde salvia), stessa struttura.

## Contratti (già scritti; gli agenti NON li cambiano)
- `src/engine/types.ts`: `QualitaMossa`, `Valutazione`, `MotoreValutazione` (`valutaMossa`, `candidati`).
- `src/stato/types.ts`: `Contatori` per giocatore (own-writer), `StatoPartita.contatori`, azione `contatori`, `VoceStorico`, `voceStorico`, `unisciStorico`.
- `src/net/types.ts`: `ciao.storico?`, messaggi `storico`, `contatori`, `evento`.
- `src/config/giocatori.ts` (colori per nome), `src/config/punteggio.ts` (punti/regali/soglie), `src/config/frasi.ts` (frasi + storia).

## Motore (src/engine) — aggiunta
- `candidati(puzzle, griglia, idx)`: cifre non presenti in riga/colonna/box; nel killer anche non già nella gabbia e tali che la somma resti raggiungibile (somma parziale + v ≤ somma, e se è l'ultima cella della gabbia = somma esatta).
- `valutaMossa(puzzle, grigliaPrima, idx, v)` (v corretto per ipotesi): `completate` = unità (riga, colonna, box, gabbia) che con questa mossa risultano piene e tutte corrette; `candidati` = numero di candidati prima della mossa. `qualita`: se `completate` non vuoto → `chiusura`; altrimenti 1 candidato → `giusta`; altrimenti se v era "hidden single" in riga, colonna o box (nessun'altra cella vuota di quell'unità ammette v) → `intelligente`; altrimenti ≥3 candidati → `brillante`, 2 candidati → `giusta`.
- Esportare da `src/engine/index.ts` anche `valutaMossa`, `candidati` e un oggetto `valutazione: MotoreValutazione`. Test con casi costruiti per ciascuna qualità.

## Stato (src/stato) — aggiunta
- `applica` con azione `contatori`: accetta solo se `contatori.ts` > ts attuale di quel giocatore (o assente).
- `unisci`: contatori per giocatore, vince ts maggiore.
- `voceStorico(stato)`: progresso = celle corrette / celle da riempire; punti = somma punti dei giocatori; errori = somma; `stato` incluso solo se non finita; `aggiornata` = max(ts delle celle, contatori, finita, iniziata).
- `unisciStorico(a, b)`: per id vince `aggiornata` maggiore; ordina per `iniziata` decrescente; max 200.
- Test per tutto.

## Regole di gioco (UI; i numeri stanno in `config/punteggio.ts`)
- **Punti**: ogni mossa giusta → `PUNTI[qualita] × moltiplicatoreSerie(serie)` + `PUNTI.chiusura × completate.length`. Errore → −PENALITA_ERRORE (mai sotto 0) e serie = 0. Vittoria → BONUS_VITTORIA + bonusTempo(secondi) a entrambi. Ogni giocatore aggiorna SOLO i propri contatori e invia `contatori`.
- **Errori**: contatore in alto nella partita (mio e suo, nei rispettivi colori), e totale nello storico. Si conta errore un valore ≠ soluzione inserito in una cella vuota o diversa (riscrivere lo stesso sbagliato non conta due volte).
- **Serie**: celle giuste consecutive del singolo giocatore; frase `serie` a 5, 10, 15...
- **Regali**: ogni PUNTI_PER_REGALO punti del giocatore → +1 regalo (toast `regalo`, Semino felice, `evento` al partner). Un regalo = **suggerimento**: tocchi il regalo poi una cella vuota → Semino la riempie col valore giusto (mossa attribuita a chi lo usa, vale 0 punti, frase `suggerimento`). Regali non usati restano nella partita (`regaliDisponibili`).
- **Barra crescita** (sempre visibile in partita): punti di coppia / PUNTI_CRESCITA_PIENA; Semino disegnato accanto cresce in 5 stadi (seme, germoglio, fogliolina, pianta, fiore). Le due quote colorate mostrano chi ha contribuito quanto.
- **Semino reagisce**: espressione/animazione diversa per giusta, intelligente, brillante, chiusura, errore, errore in serie (≥3 di fila), regalo, vittoria, arrivo del partner, attesa (idle: ogni ~20 s un piccolo movimento). Il partner VEDE le reazioni importanti dell'altro: `evento` con tipo `brillante`/`intelligente`/`regalo`/`serie` + idx → toast `partnerBrillante` e lampo sulla cella.
- **Storico ("Giardino")**: schermata dalla Home: una griglia di piante, una per partita (fiorita o germoglio), ordinate dalla più recente; ogni pianta mostra modalità, livello, data, tempo, punti, errori; i germogli hanno "riprendi" (invia `nuova` con quello stato, frase `ripresa`). In alto: totale fiori, miglior tempo per livello, punti totali di coppia, errori totali. Sincronizzazione: lo storico sta in localStorage (`sudoku-coppia-storico`), si invia in `ciao` e come `storico` a ogni cambio; si unisce con `unisciStorico` → i due vedono lo stesso giardino. Una partita entra nello storico alla prima mossa e si aggiorna a ogni cambio (debounce 2 s); quando si avvia una `nuova`, quella precedente non finita resta come germoglio.
- **Storia di Semino**: `STORIA_SEMINO`, mostrata una volta per tappa (tappe salvate in localStorage) in un fumetto di Semino nella Home.
- **Frasi**: usare TUTTE le categorie di `FRASI` nei momenti indicati; `{nome}`, `{io}`, `{n}` sostituiti. Mai due toast uguali di fila.

## UX "super interattiva" (vincoli)
- Ogni tocco ha una risposta visibile entro 100 ms: pressione dei tasti (scale), numero che "atterra" nella cella, onda su riga/box chiusi, Semino che reagisce, barra che cresce con easing. Vibrazione breve (`navigator.vibrate`, se disponibile) su errore e chiusura; disattivabile dal menù.
- Gesti: tenere premuto un tasto numero = modalità note momentanea; doppio tocco su una cella piena evidenzia tutte le celle con quel numero.
- Rispettare `prefers-reduced-motion`. Nessuna libreria nuova. Suoni: NO (per ora).

## Fatto quando
- `npm test -- --run`, `npx tsc -b --noEmit`, `npm run build` passano; `scripts/qa/due-client.mjs` passa (va esteso: punti/errori che si vedono dall'altro lato, regalo usato, storico uguale su entrambi dopo il `ciao`, ripresa di un germoglio).
- Screenshot delle schermate (Home con Semino, Partita con barra e contatori, Giardino, Vittoria) guardati dalla lead.
- Genna prova sul telefono con la ragazza.

## Archivio locale, azzeramento e compatibilità futura (aggiunta 02:25)
- Tutto ciò che persiste sta in UN modulo `src/stato/archivio.ts` (puro TS, testato): chiave localStorage `sudoku-coppia-archivio`, forma `{ versione: 1, io, partner, partita, storico, azzerato, tappeViste: string[], impostazioni }`. `carica()` legge, applica `migra(dati)` (da versione N a N+1, a catena; la versione 0 = le chiavi sparse di T1: `sudoku-coppia`, `sudoku-coppia-storico`... vanno importate e poi rimosse), e restituisce sempre un archivio valido. `salva(archivio)`. Aggiungere campi in futuro = alzare `versione` e scrivere un passo di `migra`: lo storico e le tappe viste non si toccano mai.
- Tappe della storia identificate da chiave stabile `${chi}-${partite}` in `tappeViste`, mai da indice: aggiungere tappe in mezzo non cambia cosa è già stato visto. Lo sblocco di Semina è derivato (fiori ≥ SEMINA_SBLOCCATA_A), non salvato: aggiungere fiori nello storico lo mantiene.
- **Ricomincia da zero** (menù ⋯ della Home, in fondo, in rosso): prima conferma con spiegazione ("cancella giardino, punti, storia sbloccata e Semina, per tutti e due"), seconda conferma che chiede di scrivere la parola `ricomincia`. Effetto: `azzerato = Date.now()`, storico svuotato, tappeViste svuotate, partita corrente chiusa; nome e frase restano. Si invia `storico` con `azzerato`; chi lo riceve scarta le voci con `iniziata < azzerato`, salva `azzerato` (max tra il suo e quello ricevuto) e svuota anche le sue tappe viste. Da lì in poi `unisciStorico` viene sempre seguito dal filtro `iniziata >= azzerato` su entrambi i lati (anche in `ciao`).
- Nel menù anche "Cancella solo la partita in corso" (una conferma), che la lascia come germoglio nel giardino.
