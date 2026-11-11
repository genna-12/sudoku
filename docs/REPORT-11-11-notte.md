# Report per Genna — notte dell'11/11/2026 (T9)

Sito: https://genna-12.github.io/sudoku/ — aggiornate la PWA su tutti e due i telefoni col banner "Aggiorna".

## In breve
- **A, connessione: corretta e pubblicata.** Al rientro dal background, al ritorno della rete e dopo una chiusura brusca, i due telefoni si ritrovano da soli in pochi secondi, senza uscire dalla stanza.
- **C, storia più viva dal capitolo 9: pubblicata.** Ora del giorno, meteo, comparse e oggetti cambiano capitolo per capitolo. I capitoli 0-8 sono identici a prima, e un test lo garantisce: Matilde non nota niente finché non arriva al 9.
- **B, colori della griglia: studio pronto, scegli tu.** `docs/design/studio-colori-griglia.md`, con 3 proposte e gli screenshot.

## A — Perché cadeva la connessione
Le cause trovate nel codice (dettagli in `docs/storico/ricerca/2026-11-11-connessione-ios.md`):
1. Al rientro dal background l'app credeva ancora attiva la linea con il server di segnalazione e non la riapriva: Semino restava su "aspetto il partner" per sempre.
2. A ogni ripartenza il telefono si presentava con un nome nuovo, ma per 60-90 s il server teneva occupato il posto col nome vecchio. Da qui il "sei già collegato da un altro dispositivo" e il bisogno di uscire e rientrare.
3. A ogni collegamento l'app mandava in un colpo solo lo storico delle partite. Con qualche partita lasciata a metà quel messaggio superava il limite del canale, e la connessione cadeva in ciclo.
4. "Nuova partita" premuta mentre il canale era giù andava persa.

Cosa fa adesso:
- riapre la linea da sola e ritenta con pause crescenti finché la stanza è aperta;
- ogni telefono ha un nome fisso, quindi il suo vecchio posto non lo blocca più;
- un battito ogni 3 s si accorge in circa 9 s di una connessione morta;
- lo storico parte a pezzi piccoli;
- il pallino dice "mi ricollego…".

Il formato dei messaggi è lo stesso di prima: un telefono aggiornato e uno no si capiscono. È provato con una versione vecchia contro una nuova, nei due sensi.

Verifiche: 10 E2E con due browser veri. I 5 nuovi simulano il background di iOS, il server riavviato a metà partita, "Nuova" mentre l'altro arriva, il rientro brusco e uno storico grande. Tutti i nuovi sono passati 3 volte di fila prima e dopo la validazione. Tempi misurati: si rivedono in 0,3-2 s dopo il background, in 2-4 s dopo una chiusura brusca.

## C — Cosa cambia dal capitolo 9
- **Cielo e meteo:** alba rosata, giorno, tramonto, sera, notte con le stelle; nuvole, vento con le foglie, pioggia, nebbia. Il temporale esiste, ma nessun capitolo lo prevede: il testo non lo dice mai.
- **Comparse disegnate (10):** lucciole, granchi, gabbiani, rane, farfalle, marmotta, scoiattolo, tram, falene, piccione. Non parlano.
- **Oggetti (30):** zaino, tavola, conchiglia, palla, PC, cartina, tazze, lettera, il sasso con il 40, 39, 38…
- **Coerenza:** ora, meteo e oggetti sono stati scelti seguendo il testo, il filo della storia e i capitoli vicini (`docs/storia/ambienti.md`, con una nota dove la scelta era mia), poi ricontrollati da un validatore separato. Correzioni fatte: la lanterna spenta al 43 e al 52, come dice il testo; niente neve all'83, perché l'inverno arriva al 94; le lucciole del bosco solo dove il testo le vuole.
- **Battute ed eco: non è cambiata una parola.** Unico cambio di dati oltre agli ambienti: al 26 e al 27 Semino tiene la palla invece della tavola, perché la tavola è sul muretto.
- Testi più leggibili sui cieli chiari (contrasto ≥4,5:1). In orizzontale il cielo occupa tutta la larghezza.

## Da provare sul telefono (non si può fare dal cloud)
1. **Connessione:** app in background 1-5 minuti e poi rientro; passaggio da Wi-Fi a dati; uno dei due che chiude l'app di colpo e la riapre. Devono rivedersi da soli. Se no, menù → Diagnostica rete, e mandami le righe.
2. Prima che vi aggiorniate tutti e due, giocate una partita con un telefono aggiornato e uno no.
3. **Storia:** quando arrivate al 9 guardate se cielo, meteo e oggetti vi tornano. Se qualcosa stona, dimmi il numero del capitolo.

## Da decidere tu
- **B, colori:** apri `docs/design/studio-colori-griglia.md` e scegli A, B o C. Io consiglio A ("anelli vivi"): il tuo anello verde pieno, il suo blu tratteggiato, l'errore sempre visibile, e la regola "verde e blu mai a blocchi" resta com'è. B e C la cambiano, quindi servirebbe anche un tuo ok su quello.
- Restano aperte le 7 scelte di `docs/REPORT-06-11-mattina.md`.

## Limiti noti
- Alcuni oggetti sullo sfondo restano in parte sotto il fumetto: falene al 55, 59 e 66, locandina al 65, lettera nel treno all'84, fuochi al 50. A 360×640, nel bosco, quasi tutto lo sfondo sta dietro i fumetti.
- Tavola e cartina al 92 e al 98 le disegna già la scena del giardino, quindi non sono ripetute.
