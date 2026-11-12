# T9 B — Colori della griglia: fasce personali (decisione di Genna, 12/11/2026)

Parte da `docs/design/studio-colori-griglia.md`, proposta B ("due fasce"), con le modifiche chieste da Genna. Rivede la regola "verde e blu solo nei dettagli, mai a blocchi" solo per la griglia (ADR 007).

## Cosa si vede sul MIO schermo (vale uguale per i due ruoli: "mio" = il colore di chi guarda)
- **Mie fasce**: riga, colonna e box della mia selezione con un velo del mio colore (verde per Genna, blu per Mati). Valori di partenza: `--g-velo-mio` della proposta B nello studio (scuro e chiaro).
- **Mia selezione**: velo del mio colore più forte e anello pieno del mio colore (3,5 px), come in B.
- **Le fasce del partner NON si vedono.** Del partner si vede solo la sua casella: anello **tratteggiato** vivo del suo colore (circa 3 px), con il respiro leggero di oggi (fermo con reduced-motion). Niente classe `vicina-suo`.
- **Siamo sulla stessa casella**: anello mio pieno dentro, suo tratteggiato fuori, entrambi visibili.
- **Chi ha scritto un numero**: solo col colore del numero (mio verde vivo, suo blu vivo, quelli della partita crema pesante). Il fondo delle caselle `mia` e `sua` torna `--carta`: l'unico velo colorato di fondo è la mia fascia. Il numero colorato deve restare ben distinguibile anche dentro la fascia e sulla selezione.
- **Numero uguale** (`stessa`), **errore** e **faro** come nella proposta B. L'errore resta visibile sotto ogni altro stato (fondo rosso tenue più numero rosso), anche dentro la fascia e sulla selezione.
- Gabbie del killer e note leggibili dentro la fascia.

## Soglie (motivo: leggibilità su telefono, WCAG)
- Numeri (miei, suoi, dati, errore) ≥ 4,5:1 sul loro fondo in ogni combinazione: vuota, fascia, selezione, stessa, faro, errore. Scuro e chiaro.
- Anello tratteggiato del partner ≥ 3:1 (contrasto per elementi grafici) sia sulla carta sia sulla mia fascia (lo studio misurava 2,8:1 per B: va alzato, per esempio con un filo scuro sotto il tratteggio o una tinta più chiara o più scura).
- Fascia rispetto a casella vuota: ΔE ≥ 10, cioè ben visibile.
- Numero mio rispetto a numero suo sullo stesso fondo: distinguibili anche senza vedere i colori, per tinta e luminosità diverse (ΔE ≥ 20).

## Fatto quando
- tsc, test, build e i 10 E2E verdi.
- Screenshot a 390×844, in chiaro e scuro, dai due lati (Genna e Mati), con selezioni, numeri di entrambi, un errore e la stessa casella. Più un killer.
- Contrasti misurati con lo script dello studio, aggiornato.
- Validatore a contesto separato.
