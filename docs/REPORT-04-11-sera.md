# Report per Genna — 04/11/2026, pomeriggio e sera

Tutto è online: https://genna-12.github.io/sudoku/ (aggiorna la PWA su entrambi i telefoni col banner "Aggiorna").

## Cosa è cambiato in gioco
- **Dopo ogni partita finita** il capitolo del nuovo fiore appare in primo piano: fondale del luogo, Semino e Semina grandi, i secondari (Fischio, Pinza, Nuvola, Nonna Capra, Gufo, Grillo, Briciola), una battuta per tocco, la lettera del Mulo come foglio. Indietro con "‹". Niente avanzamento automatico, niente "salta": nessun dettaglio si perde.
- **Arretrati**: se si fanno più partite o uno gioca da solo, i capitoli non letti si accodano in ordine ("2 di 3") e si leggono anche dalla Home ("N capitoli da leggere"). Con 4 o più, "Li leggi adesso? / Dopo". Visto è per giocatore: Mati legge tutto sul suo telefono anche se tu hai già letto.
- **Al primo avvio** troverete gli arretrati dal capitolo 0 (la storia nuova si legge dall'inizio); se avevate già visto l'arrivo di Semina, i capitoli 0-5 risultano letti solo per chi l'ha vista davvero. Il giardino mostra i ricordi fino al capitolo letto: può sembrare più vuoto per una sera.
- **Eco** in Home: dopo un capitolo la mascotte lo richiama di sbieco; **diario** nel giardino per rileggere.
- **Vestiti**: si sbloccano arrivando in un luogo (capitolo 15 mare, 28 montagna, 43 bosco, 55 città, 67 cucina, 77 lontano) e in Home ruotano solo tra i luoghi visitati, di solito tutti e due dello stesso posto. Otto vestiti nuovi (`docs/design/img/vestiti.png`). Il giardino si riempie dei ricordi (tavola, sasso di quota, lanterna, locandina, cartina).
- **Usabilità**: battute in partita che durano in base alla lunghezza e si fermano al tocco; transizioni tra schermate; suggerimenti dei gesti la prima volta; cassetta della posta vera (dal fiore 12: le ultime frasi mandate e ricevute); fiori del giardino toccabili (dettaglio della partita); nessun testo sotto i 12 px; gesto indietro di Android che non chiude più l'app.

## La storia
- 101 capitoli, 718 battute. Dopo la notte: 43, 45, 91, 93 riscritti con una gag vera (lucciola "difettosa" nella lanterna; la piuma che Semina si prova e Fischio reclama; il bastoncino nello stagno con la rana; le lettere a valanga perché Fischio ha starnutito); 21-22 senza il conto; 19 capitoli resi più parlati (via le battute-elenco e le simmetrie da sketch); il 100 chiude con "Io intanto metto su l'acqua per la pasta."
- Punti delicati da rivedere leggendo in gioco (segnali i numeri, si correggono in `docs/storia/capitoli.md`):
  1. **Atto 8 (91-99)**: è una parata di ritorni affettuosi con poco attrito. Tu hai detto che l'affetto va bene; i revisori lo trovano un po' piatto. Da sentire in gioco.
  2. **Capitoli 32-33** (il temporale e la roccia): è il primo "storto" vero; se Mati lo sente troppo vicino a qualcosa di reale, si può smussare la battuta delle tre domande.
  3. **Capitolo 60** (la finestra del laboratorio) e **77-90** (treno, cartina a turni, "quello che non lascio"): sono i capitoli più vicini alle vostre strade. Nessuno conclude niente: è voluto (la ricerca dice che chiudere il tema sarebbe falso). Se uno dei due vi sembra una previsione invece che una scena, dimmelo.
  4. **"sei mini"** compare in 6 capitoli (48, 58, 64, 85, 93, 95): se vuoi più presenza, va messa nelle eco, non nelle scene.
  5. Le **chiacchiere nuove** di bosco, città, cucina e lontano (5 per personaggio) le ha scritte l'agente di T6 seguendo la guida: non le ho rilette una per una come i capitoli. Se una stona, sta in `src/config/frasi.ts`.

## Verifica fatta
Per ogni traguardo: implementatore Opus, poi validatore Opus a contesto separato (test aggiuntivi, fuzz di 4000 operazioni sull'invariante dei visti, screenshot a 390×844 e 360×640). Trovati e corretti: tracce di Semina prima dello sblocco (tulipano, blu, petali), fondale dei capitoli in giardino, frasi del partner scartate dalla coda delle battute, un ricordo che non entrava con l'animazione nei giorni speciali, tre sovrapposizioni di layout. 421 test, 5 E2E, build, deploy verdi.

## Da provare sul telefono (non provabile dal cloud)
iOS: lettore a tutto schermo (`100dvh`, `inert`), gesto indietro in PWA; Android: indietro prima di qualunque tocco potrebbe ancora chiudere l'app (limite di Chrome); due telefoni che finiscono insieme; il partner che preme "Nuova" mentre l'altro legge ("Vai").

## Prossimo
Apri una chat nuova con Opus e scrivi: riprendi (LEAD · Sudoku · T8 collaudo). I punti T7 rimasti sono in ROADMAP.
