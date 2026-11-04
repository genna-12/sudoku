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

## Stessa memoria su più dispositivi (aggiunta 02:26)
- Nessun backend: la memoria sta nell'archivio locale di ogni dispositivo e viene **allineata col partner** a ogni collegamento: `ciao` porta storico + azzerato (già previsto) e la partita in corso; chi riceve unisce (`unisciStoricoRemoto`) e, se il suo archivio è cambiato, rimanda `storico`. Risultato: PC e telefono di Genna si allineano attraverso il dispositivo di lei (uno alla volta: la stanza è a due).
- Menù ⋯: **Esporta memoria** (scarica `sudoku-coppia-AAAA-MM-GG.json` con l'intero archivio tranne la frase) e **Importa memoria** (file picker; unione con `unisciStoricoRemoto` + azzeramento max + tappe viste unite, mai sovrascrittura; mostra "importate N partite"). Stesso nome su due dispositivi = stesso colore, nessun problema.
- Le tappe viste non viaggiano in rete (riproporre la storia su un dispositivo nuovo va bene).

## Profilo su più dispositivi senza backend (deciso 02:28)
- Profilo = nome + frase, inseriti uguali su ogni dispositivo.
- **Stanza personale**: oltre alla stanza di coppia, ogni dispositivo apre `apriStanza(frase + '#' + nomeNormalizzato, nome, ...)` (prefisso diverso → stanza diversa). Vi si incontrano SOLO i dispositivi della stessa persona. Protocollo identico (`ciao` con stato + storico + azzerato; `storico`; `stato`; `cella`; `contatori`; `nuova`), gestito dallo stesso codice di riconciliazione; la UI mostra un piccolo segno "altro mio dispositivo collegato". Se un solo dispositivo è acceso, resta in attesa in silenzio (nessun avviso).
- **Posti per profilo nella stanza di coppia** (deciso 03:20): `apriStanza(frase, nome, stato, ruolo)` con `ruolo = ruoloDiNome(nome)`: Semino si registra SOLO come `-a`, Semina SOLO come `-b` (che si collega ad `-a`). Se il mio posto è occupato è un altro mio dispositivo: stato `in-attesa` con dettaglio `occupata` ("sei già collegato da un altro dispositivo"), nuovo tentativo ogni 10 s; il dispositivo gioca tramite la stanza personale. Così due dispositivi dello stesso profilo non riempiono mai la stanza di coppia lasciando fuori l'altra persona. La stanza personale resta senza posti fissi (primo libero fra `a` e `b`).
- **Inoltro idempotente fra le due stanze** (deciso 03:20, sostituisce "nulla rimbalza"): `cella`, `contatori`, `nuova`, `stato` (anche quello del `ciao`) ricevuti da una stanza si inoltrano all'altra SOLO se hanno cambiato la mia partita (confronto per identità dello stato): un messaggio già noto non cambia nulla e si ferma, quindi niente cicli. `evento`, `cursore`, `frase` si inoltrano sempre ma una volta sola: il messaggio inoltrato porta `inoltrato: true` e chi lo riceve non lo reinoltra; un messaggio inoltrato arrivato dalla stanza personale conta come "del partner" (toast, cursore, lampo). Cursore e frase si mandano a entrambe le stanze. Lo storico non si inoltra (si allinea a ogni `ciao`). Test: `scripts/qa/tre-dispositivi.mjs`.
- Fallback: esporta/importa (sezione precedente) e allineamento tramite il partner.

## Robustezza delle memorie divergenti (deciso 02:33)
- Ruolo di gioco (`Giocatore` 'a'|'b') deciso SOLO dal nome con `ruoloDiNome` (Genna = 'a', chiunque altro = 'b'): non più dall'ordine alfabetico né dal ruolo di rete. Il ruolo di rete (chi è `-a`/`-b` su PeerJS) non compare mai nello stato di gioco.
- `migra` conserva i campi sconosciuti dell'archivio (app vecchia che legge dati nuovi non li perde al salvataggio).
- Test di robustezza in src/stato (archivio.test.ts): dati due archivi divergenti A e B (partite diverse, stessa partita con celle diverse e contatori diversi, azzeramenti diversi), `unisci(A,B)` ≡ `unisci(B,A)` e `unisci(unisci(A,B),B)` ≡ `unisci(A,B)` (commutativa, idempotente); il vuoto non vince mai.
- Limiti accettati e documentati in README: stessa partita giocata su due dispositivi propri NON collegati tra loro → i contatori personali non si sommano (vince l'ultimo); nome diverso su due dispositivi = persona diversa; orologio sballato altera i conflitti sulla stessa cella; "ricomincia" cancella anche dal partner le partite precedenti alla data.

## Semino e Semina alla pari (richiesta 02:38)
- Dopo lo sblocco, in Partita si vedono entrambe le mascotte: ognuna reagisce SOLO alle mosse del proprio giocatore (Semino = 'a', Semina = 'b'), su entrambi i dispositivi. Prima dello sblocco Semino reagisce a tutto. Home e Vittoria: SeminoCoppia dopo lo sblocco.
- Carattere e voce in `src/config/frasi.ts`: `CARATTERE` (umore base), `VOCE` (frasi per personaggio e categoria, metà delle volte al posto di FRASI), `chiacchiere` (fumetti a caso ogni 40–60 s quando non succede nulla), `STORIA_EXTRA` (tappe aggiuntive con le loro passioni: acqua e palla in acqua, nerd, cucina, musica insieme; animali, natura, euforia, arrabbiature).
- Umori nuovi del componente: `arrabbiato`, `euforico`. Semina: euforica su brillante/chiusura/vittoria, arrabbiata su errori in serie.

## Sorpresa Semina (richiesta 02:45)
- Fino a SEMINA_SBLOCCATA_A fiori NESSUNO dei due giocatori ha un personaggio: all'Ingresso si sceglie solo un colore, **Verde** (profilo 'semino', ruolo 'a') o **Blu** (profilo 'semina', ruolo 'b'), con due card colorate senza mascotte (`nomeVisibile(profilo, sbloccata)` in giocatori.ts dà "Verde"/"Blu" prima e "Semino"/"Semina" dopo). Semino è il compagno del gioco per entrambi e reagisce a tutto. Semina non compare MAI prima: niente SeminoCoppia, voce o chiacchiere sue, nessuna menzione del nome. I nomi dei profili cambiano ovunque (Home, contatori, toast, giardino) al momento dello sblocco.
- Tappa 4: Semino "un po' solo" (umore preoccupato) e la Home mette in evidenza "Nuova partita insieme".
- Al raggiungimento di 5 fiori: **scena di sblocco** a schermo intero (`SCENA_SBLOCCO` in frasi.ts): sfondo che si scurisce, foglie che frusciano (CSS), Semino al centro; a ogni tocco la battuta successiva; alla battuta di Semina lei sbuca da dietro/accanto con animazione (scala da 0 + saltello) e umore euforico; alla fine la battuta "Il verde è Semino. La blu è Semina. Siete voi" con i due colori che si accendono sulle mascotte, poi SeminoCoppia e bottone "andiamo". La scena si vede una volta per dispositivo (tappa `semina-5` in tappeViste); se la vittoria che sblocca avviene in partita, la scena parte dopo la schermata di vittoria.

## T2b — colori che crescono, fiori di Semina, solletico, accessori (richiesta 03:17)
- **Nomi reali**: Verde = Genna, Blu = Mati (`nomeReale` in PROFILI). Le mascotte li usano nelle chiacchiere e nella storia (`{reale}` e `{realePartner}` nelle frasi). Nei contatori e nei toast restano Verde/Blu (poi Semino/Semina).
- **Presenza del blu** (`presenzaBlu` 0..1 in regole.ts = min(fiori / SEMINA_SBLOCCATA_A, 1), e 1 fisso dopo lo sblocco): variabile CSS `--blu-presenza` sul root. Prima dello sblocco gli accenti "di coppia" (bottone primario, bordi evidenziati, barra di crescita vuota, grana dello sfondo, pallino di connessione, chip livello attivo) sono verdi e il blu si mescola in proporzione (gradienti verde→blu con stop a `--blu-presenza`); dallo sblocco presenza pari: tutti gli elementi di coppia sono bicolore 50/50. I colori PERSONALI (celle, cursore, quote) restano sempre verde = Genna, blu = Mati.
- **Fiori nel giardino** (`quotaBlu` 0..1 = frazione di petali blu): i fiori si numerano per data di fine; i primi 5 seguono la progressione fiore 1 = tutto verde → fiore 5 = metà e metà (quota = (n−1)/4 × 0.5), e restano così per sempre; dal sesto in poi quota = punti di Mati / punti totali della partita (salvata nella voce di storico alla fine della partita come campo `quotaBlu`). I germogli restano neutri.
- **Solletico**: toccare/cliccare una mascotte (Home, Partita, Giardino, Vittoria) produce una reazione a caso MAI uguale alla precedente (umore tra felice/sorpreso/euforico/festa/imbarazzato/arrabbiato(solo Semina, raro)/saluta + battuta da `VOCE[chi].solletico`); dopo lo sblocco viene inviata come `evento` `chi:umore:solletico` e l'altro la vede identica. Limite: una ogni 700 ms.
- **Accessori** (prop `accessorio` di Semino/Semina): Semino: `occhiali` (nerd), `cuoco` (cappello), `palla` (pallanuoto, in mano o sulla testa), `chitarra`; Semina: `corona` (fiori), `montagna` (cappellino + zainetto), `cavallo` (caschetto da equitazione + cavallino di peluche in mano), `animale` (uccellino sulla testa). Ogni chiacchiera e tappa di storia ha un accessorio opzionale (`accessorio` nel dato) che viene indossato mentre il fumetto è aperto; in Home a riposo ogni 60 s circa cambia accessorio a caso. Nel giardino, l'intestazione mostra le mascotte con un accessorio casuale.
- Frasi nuove in frasi.ts: `VOCE[chi].solletico` (≥8 ciascuno), chiacchiere su montagna, cavallo e animali per Semina, e tappe di storia con montagna/cavallo.

## Presenza e sonno delle mascotte (richiesta 03:25)
- **Dimensioni**: su desktop (≥ 860 px) le mascotte stanno in un pannello laterale accanto alla griglia (56–72 px ciascuna, con fumetto sotto), non nell'angolo in alto; su telefono il cruscotto le mostra a 44 px (era 34), reazione a 1.5×. Devono "esserci" senza rubare spazio alla griglia.
- **Sonno per inattività**: dopo SECONDI_PRIMA_DI_DORMIRE (60) senza tocchi/mosse la mascotte si addormenta (`dorme`); si sveglia a qualunque mossa (propria o del partner) o tocco, con reazione normale.
- **Orari** (`src/config/sonno.ts`, ora locale): nelle proprie ore di sonno la mascotte è addormentata di default anche con attività; una mossa o un tocco la sveglia per ~6 s con la reazione dovuta ma umore attenuato e, una volta su due, una frase da `SONNO[chi]` al posto della normale; poi si riaddormenta. `seminaDormeTardiOggi` (un giorno su 4, deterministico dalla data) estende il sonno di Semina alla sveglia di Semino: quel giorno in Home dormono insieme (SeminoCoppia con umore dorme per entrambi) e, se svegliata, Semina usa la frase apposita.
- Il partner vede lo stesso stato di sonno della mia mascotte (dipende dall'orario, non da chi tocca; il risveglio per tocco viaggia come evento di solletico).

# Traguardo 3 — Storia, sblocchi, UI con gusto (notte 03/11, autonomo)

## Fatti sui personaggi (correzione di Genna: vincolante)
- **Semino** (Genna, verde): ama il mare e il surf; la palla in acqua; è un po' nerd (PC, occhiali); cucina per Semina; suonano insieme. NON ama la montagna: troppo faticosa (ci va solo per lei, lamentandosi). Va a letto tardissimo, si sveglia tardissimo.
- **Semina** (Mati, blu): ama la montagna, andare a cavallo, la natura e gli animali; euforica e positiva, ogni tanto si arrabbia; preferisce la montagna al mare, ma il mare le piace quando c'è Semino; mangia quello che lui cucina; suonano insieme. A letto prestissimo, sveglia prestissimo; ogni tanto dorme con lui fino a tardi. A entrambi piace moltissimo dormire.
- Accessori: Semino → occhiali, cuoco, palla, chitarra, **surf** (tavola, nuovo), mai montagna/cavallo. Semina → corona, montagna, cavallo, animale, chitarra; mare solo in scene con Semino.

## Bug da chiudere subito
- I toast delle frasi NON devono mai coprire la griglia: in Partita vanno nel cruscotto (fumetto accanto alla mascotte, a larghezza limitata) su telefono e nel pannello laterale su desktop; mai sopra le celle; niente toast grandi al centro durante il gioco (la frase ricevuta dal partner si mostra nello stesso posto, col suo colore). La vittoria resta a schermo intero.

## Storyline e sblocchi (src/config/storia.ts, dati puri)
- Capitoli legati ai fiori (partite finite), con progressione fino ad almeno 60 fiori e un epilogo aperto; ogni tappa: `{ partite, chi, testo, accessorio?, scena?, sblocca? }`. La storia è quella di due semini che crescono in un giardino condiviso, scoprono le differenze (mare/montagna, notte/alba), litigano e fanno pace, costruiscono cose, con richiami a Genna e Mati. Toni: tenero, buffo, mai stucchevole; ogni tappa ≤ 240 caratteri.
- **Sblocchi visibili nel giardino** (scena SVG di sfondo in Giardino e in Home, `src/ui/Scena.tsx`): elementi che compaiono a soglie: 1 primo fiore; 3 sentiero; 5 Semina; 8 stagno; 10 merlo (animale); 12 cassetta della posta (le frasi inviate); 15 onde del mare in lontananza (Semino); 18 profilo di montagna (Semina); 20 cielo stellato notturno con stelle = fiori; 25 tavola da surf appoggiata; 30 cavallino nel prato; 35 casetta; 40 chitarra appesa; 50 fuochi d'artificio alla vittoria; 60 arcobaleno. Ogni sblocco ha una tappa di storia e un piccolo "regalo" (un suggerimento in più nella prossima partita, un accessorio nuovo, un pacchetto di frasi).
- **Pacchetti di frasi** sbloccabili: `FRASI_EXTRA[livelloSblocco]` che si aggiungono alle liste a quella soglia (la varietà cresce col gioco).
- **Sorprese**: a tappe scelte, alla vittoria una scena breve (2–3 battute) invece del solo overlay; "giorno speciale" (seminaDormeTardi) già esiste; giorno del mare/giorno della montagna (deterministici dalla data) con accessori a tema e chiacchiere dedicate.
- Tutto derivato dal numero di fiori e dalla data: nulla da migrare, le tappe viste restano per chiave stabile.

## Frasi (src/config/frasi.ts)
- Obiettivo: ≥ 25 frasi per categoria e per personaggio nelle categorie principali (giusta, intelligente, brillante, completato, serie, sbagliata, sbagliataSerie, regalo, suggerimento, vittoria, solletico, chiacchiere, sonno), con i loro interessi; "sei mini / se(i)mini / sei mignon / smol / mini" ricorrenti ma non ossessivi. Mai due uguali di fila, e memoria delle ultime 8 usate per categoria (regole.ts).

## Studio UI anti-slop (docs/design/studio-ui.md + implementazione)
- Ricerca breve sui principi (tipografia con carattere, spaziatura ritmica, pochi colori usati con intenzione, niente gradienti spiaccicati, niente card tutte uguali, micro-interazioni con senso) e audit onesto delle schermate attuali con screenshot.
- Sfondo: "cielo del giardino" che vira dal verde-notte al blu-notte con la presenza del blu, con gradiente ampio e grana, non blocchi di colore; il bicolore sui bottoni va usato con parsimonia (un solo elemento primario), i titoli tornano monocromi con un dettaglio bicolore.
- Interattività: feedback su ogni tocco, tastierino con pressione fisica, griglia con "respiro" al completamento, mascotte che seguono con lo sguardo la cella selezionata (occhi che si spostano), fumetti con coda verso chi parla.
- Criterio: due screenshot prima/dopo per schermata nel documento, con le scelte spiegate in una riga ciascuna.

## Icone (richiesta 03:49)
- Dopo lo studio colori: icona PWA (192, 512, maskable con margine sicuro), favicon SVG/PNG per desktop, apple-touch-icon e splash iOS (vite-plugin-pwa assets o PNG dedicate). Soggetto: Semino (stadio 2) o i due semini dopo lo sblocco? No: l'icona è fissa e non spoilera: Semino solo, su fondo della palette scelta, con un dettaglio verde fluo e uno blu nei dettagli (non 50/50). Niente testo, niente effetti gratuiti, leggibile a 48 px. Verifica resa su sfondo chiaro e scuro della home del telefono.
