# Report della notte 2–3 novembre 2026 — Sudoku di coppia

Sito: https://genna-12.github.io/sudoku/ · Repo: genna-12/sudoku · Codice sul PC: C:\dev\sudoku

## In una riga
Dall'idea a una PWA completa in una notte: Sudoku e Killer a due in tempo reale senza backend, Semino e Semina con una storia che cresce col giardino, punti, regali, sblocchi, e una UI rifatta con uno studio di design e colori.

## Cosa c'è nell'app (per schermata)
**Ingresso.** Scegli Verde (Genna) o Blu (Mati) e la frase segreta. Prima dei 5 fiori nessuno ha un personaggio: Semina deve restare una sorpresa. Chi aveva già un nome libero di ieri viene mappato al colore giusto (una conferma).

**Home.** Dietro al titolo c'è la Scena del giardino, che cambia con i fiori; Semino (poi Semino e Semina) con il fumetto della storia, le chiacchiere, gli accessori; scelta Sudoku/Killer e dei sei livelli (semini → supersemini); "Continua" sulla partita in corso; bottone Giardino con il conto dei fiori; menù ⋯ (mostra errori, vibrazione, tema, esporta/importa memoria, cancella partita, ricomincia da zero con doppia conferma).

**Partita.** Griglia (Killer con gabbie tratteggiate e somme), tastierino con contatore per cifra, note (anche tenendo premuto un numero), annulla, cancella, evidenziazione riga/colonna/box e stesso numero (doppio tocco), errori evidenziati, timer. Cruscotto: barra di crescita di coppia con le quote dei due colori e lo stadio di Semino (seme → fiore), punti ed errori di ciascuno, regalo (suggerimento) quando disponibile. Le mascotte reagiscono alle mosse (giusta, intelligente, brillante, chiusura, serie, errore, errori in serie, regalo, vittoria) e seguono con lo sguardo la cella selezionata; dopo lo sblocco ognuna reagisce alle mosse del proprio giocatore e lo vedono tutti e due. Le frasi stanno nel fumetto del cruscotto, mai sulla griglia. Cursore del partner nel suo colore, "Manda frase". Su desktop le mascotte stanno in un pannello laterale grande.

**Vittoria.** Festa, tempo, punti, frase; alle tappe giuste una "sorpresa" in tre battute; fuochi d'artificio quando sbloccati.

**Giardino.** La Scena in alto, statistiche (fiori, punti di coppia, errori, migliori tempi per livello), una pianta per partita: fiore se finita (verde all'inizio, poi sempre più blu fino al 5°, poi in proporzione a chi ha fatto più punti), germoglio se lasciata a metà, con "Riprendi". Le mascotte con un accessorio.

**Scena di sblocco (5 fiori).** Fruscio, Semino sorpreso, Semina che sbuca, "il verde è Semino, la blu è Semina: siete voi". Da lì i profili cambiano nome e le due mascotte sono alla pari.

## Regole di gioco (tutte in `src/config/punteggio.ts`)
Punti per mossa giusta (10), intelligente (25, "hidden single"), brillante (50, deduzione profonda), +30 per ogni riga/colonna/box/gabbia chiusa, moltiplicatore di serie fino a ×3, −15 per errore, +150 e bonus tempo alla vittoria. Un regalo ogni 200 punti personali = un suggerimento (Semino riempie una cella). La barra di crescita si riempie a 1200 punti di coppia.

## Storia e sblocchi (`src/config/storia.ts`)
43 tappe legate ai fiori fino a 100, con arco: incontro, differenze (mare/montagna, notte/alba), litigio e pace (22–25), costruzione del giardino (30–60), epilogo aperto. Sblocchi visibili nella Scena: 1 primo fiore, 3 sentiero, 5 Semina, 8 stagno, 10 merlo, 12 cassetta, 15 mare (+ surf per Semino), 18 montagna, 20 cielo stellato, 25 tavola, 30 cavallino (+ cavallo per Semina), 35 casetta, 40 chitarra, 50 fuochi, 60 arcobaleno; a tappe anche regali (+1 suggerimento) e pacchetti di frasi. Sorprese alla vittoria a 7, 10, 15, 20, 25, 30, 40, 50, 60. Giorni speciali deterministici dalla data: giorno del mare e della montagna. Orari di sonno: Semino va a letto alle 3:30 e si sveglia alle 11:30, Semina a letto alle 22 e sveglia alle 6:30; un giorno su quattro Semina dorme con Semino fino a tardi; di giorno, dopo 60 s senza tocchi, si addormentano e si svegliano alle mosse o al solletico.

## Frasi (`src/config/frasi.ts`)
1125 frasi: voce di Semino (mare, surf, palla in acqua, PC, cucina, chitarra, notte) e di Semina (montagna, cavallo, animali, natura, alba, euforia, qualche arrabbiatura), 25+ per categoria e per personaggio, 42 chiacchiere ciascuno, frasi da mezzo sonno, solletico, pacchetti che si sbloccano. "Sei mini", "se(i)mini", "sei mignon", "smol", "mini" ci sono ma con misura. L'app evita le ultime 8 frasi usate per categoria.

## Design (`docs/design/studio-ui.md`)
Ricerca anti-slop con fonti, audit delle schermate, studio dei colori con tre palette candidate e prove di contrasto: scelta "petrolio" (fondo a metà tra verde e blu, crema 15:1). Verde fluo e blu elettrico vivono nei dettagli; niente gradienti a blocchi; il cielo vira verso il blu con i fiori, la terra resta verde. Interazioni: tasti che si schiacciano, numero che atterra, griglia che respira, occhi che seguono, card che respirano, menù a sezioni. Font Recursive in locale (offline ok). Prima/dopo per ogni schermata nel documento. Icone PWA nuove (Semino su petrolio, maskable, apple-touch, favicon).

## Tecnica (per capire cosa consegni)
- Niente backend: P2P WebRTC (PeerJS) con posti per profilo nella stanza di coppia (Verde = a, Blu = b) e una stanza personale per i dispositivi della stessa persona; inoltro tra le due stanze con guardia di idempotenza. Il server pubblico di PeerJS serve solo alla stretta di mano; STUN Google + TURN gratuito Open Relay.
- Stato condiviso: per cella vince l'ultimo timestamp; contatori per giocatore; merge commutativo e idempotente con pareggi deterministici (testato su archivi divergenti casuali).
- Archivio locale versionato (`src/stato/archivio.ts`) con migrazione, conservazione dei campi sconosciuti, azzeramento con data (vale anche per il partner), esporta/importa.
- Motore: generatore deterministico sudoku e killer con soluzione unica, valutazione delle mosse (naked/hidden single).
- Test: 208 unitari (motore, stato, archivio, rete, regole, storia, sonno) + 4 E2E con browser veri (due client, stanza personale, tre dispositivi, sblocco di Semina). Deploy automatico su GitHub Pages a ogni push.

## Cosa provare a mano (in ordine)
1. Telefono tuo + telefono suo, stessa frase: pallino "connesso", mosse e reazioni che si vedono da entrambi i lati.
2. PC + telefono tuoi aperti insieme: il secondo dice "sei già collegato da un altro dispositivo" ma vede le mosse.
3. Il 5° fiore insieme: la scena di Semina su entrambi, poi i nomi nuovi.
4. iPhone: tenere premuto un numero per le note, doppio tocco su una cella piena, niente zoom, vibrazione.
5. Menù: esporta memoria e importa sull'altro dispositivo.

## Limiti noti
- Il TURN gratuito può non bastare su alcune reti mobili: sintomo "in attesa" per sempre con entrambi dentro. Fallback pronto da scrivere: relay Python sul PC.
- Due tuoi dispositivi sulla stessa partita senza essere collegati tra loro: i punti personali non si sommano (vince l'ultimo).
- Chi conosce la frase entra: scegliete una frase vostra.
- Gli accessori "montagna/cavallo" non li indossa mai Semino; la tavola da surf la usa Semina solo nel giorno del mare con lui.
