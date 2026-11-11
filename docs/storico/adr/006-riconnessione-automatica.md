# ADR 006 — Riconnessione automatica senza cambiare il contratto di rete
- Data: 2026-11-11
- Stato: accettato
- Ricerche: [2026-11-11 Connessione P2P su iPhone](../ricerca/2026-11-11-connessione-ios.md) — cause verificate nel codice e progetto della correzione (§6)
- Collegati: nessuno

## Decisione
La connessione si ricostruisce da sola, senza azioni dei giocatori, seguendo il progetto della ricerca (§6):
- dopo una perdita la segnalazione si rinnova con lo stesso Peer (`peer.reconnect()`), e si ricrea il Peer solo se il rinnovo fallisce;
- il token PeerJS è persistente per dispositivo, così il proprio ID vecchio non blocca il rientro (niente "sei già collegato da un altro dispositivo" per 60-90 s);
- il battito riusa `ping`/`pong`, già nel contratto, con soglie di silenzio più strette;
- tentativi con backoff finché la stanza è aperta, al rientro in primo piano e al ritorno della rete;
- lo storico inviato al `ciao` va a lotti sotto il limite del DataChannel, e un errore di invio non chiude più la connessione.

`src/net/types.ts` non cambia: verso l'interfaccia restano i quattro stati di connessione già esistenti. Un client vecchio continua a capire tutti i messaggi, perché i lotti di storico hanno il formato di sempre e il merge è commutativo e idempotente.

## Motivo
Le cause confermate sono nella logica della stanza (flag `disconnected` di PeerJS letto come segnalazione viva, nessun `reconnect()`, token casuale a ogni ripartenza, storico in un solo messaggio troppo grande), non nel contratto. Correggerle dentro `src/net/` lascia compatibili i telefoni che si aggiornano in momenti diversi.

## Note di attuazione (11/11, dalla validazione)
- Il posto `a` manda uno "squillo" a `b` quando lo vede tornare: è una connessione dati in più, che un client vecchio chiude senza errori.
- A pagina nascosta non si chiama `peer.disconnect()`: il token fisso per dispositivo basta a riprendere il posto al rientro.
- Il token è unico per dispositivo grazie ai Web Locks; due schede aperte insieme vanno provate dal vero.

## Cosa la farebbe cambiare
Se la prova reale su iPhone mostra che serve dire "mi ricollego…" con uno stato distinto, o che il server PeerJS pubblico non basta, si apre un ADR nuovo (stato `riconnessione` nel contratto, o relay proprio sul Worker).
