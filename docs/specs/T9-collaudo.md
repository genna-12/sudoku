# T9 — Correzioni dal collaudo reale (11/11/2026)

Esiti del primo collaudo di Genna e Matilde: entrambi **iPhone con la PWA installata** nella schermata Home. I problemi capitano in tutte le combinazioni di rete (Wi-Fi/dati). Sono arrivati entrambi al **capitolo 8**.

Ordine di lavoro: A (connessione, la più grave) → B (colori della griglia) → C (storia più viva dal capitolo 9). A e C toccano file diversi e possono andare in parallelo. B parte da uno studio, con checkpoint di Genna prima del codice.

## A — Connessione tra i due telefoni (priorità massima)
Sintomi riportati da Genna, con le sue parole:
1. "Ci connettiamo entrando in app ma a volte non ci vede". Per farsi vedere devono toccare "cambia frase o stanza" e rientrare nella stessa stanza.
2. Una volta, dopo una partita, "al click nuova partita" la connessione si è persa. Una sola volta: altre volte con "Nuova partita" è andato tutto bene.
3. Uscendo dalla app senza chiuderla (Home del telefono, un'altra app per mandare un messaggio), dopo un po' la connessione cade, e questo è accettabile. Al rientro però **non si riconnette da sola**: deve uscire dalla griglia, uscire dalla stanza e rientrare.

Ipotesi da verificare (non sono certezze):
- iOS sospende le PWA in background e chiude il WebSocket di segnalazione di PeerJS e i DataChannel.
- Al rientro (`visibilitychange`/`pageshow`) nessuno fa `peer.reconnect()` o ricrea il Peer, e nessuno richiama il partner.
- Il posto della stanza può restare occupato dall'ID "fantasma" della sessione precedente, e allora rientrare con lo stesso profilo viene rifiutato o ignorato finché il server PeerJS non libera l'ID (circa 60 s).
- Manca un battito (heartbeat) che si accorga di un DataChannel morto ma ancora "open".
- Partner che arriva mentre l'altro è in un passaggio di schermata (Nuova partita).

Cosa serve:
- Riconnessione automatica al rientro in primo piano, alla rete che torna (`online`) e a intervalli crescenti (backoff) finché la stanza è aperta, senza azioni di Genna. Stato visibile e onesto nel pallino ("mi ricollego…").
- Il proprio ID vecchio non deve mai bloccare il proprio rientro.
- Battito sul canale per accorgersi dei canali morti.
- Rifare la chiamata quando il partner ricompare; la partita in corso riprende con il merge che esiste già.

Vincoli:
- Il formato dei messaggi deve restare compatibile, perché per un po' un telefono aggiornato e uno no devono capirsi. Un messaggio nuovo (per esempio il battito) va ignorato senza errori dal client vecchio: verificalo nel codice di ricezione attuale.
- Contratti in `src/net/types.ts` solo con decisione della lead, scritta in un ADR.

Test (obbligatori):
- E2E nuovi che simulano il background di iOS:
  - pagina nascosta per 30-120 s, socket di segnalazione chiuso, rete offline e poi online, poi ritorno;
  - il server PeerJS locale riavviato a metà partita;
  - "Nuova partita" mentre il partner si collega.
- Il criterio è che i due si rivedano da soli entro pochi secondi e che la partita resti uguale su entrambi.
- Gli E2E esistenti restano verdi.

Prova reale (Genna e Matilde):
- mettere la app in background 1-5 minuti, poi rientrare;
- passare dal Wi-Fi ai dati.

## B — Colori della griglia: si capisce dove sei?
Problema: durante il gioco i colori non permettono sempre di distinguere bene le celle selezionate, la propria selezione, quella del partner, la riga/colonna/box evidenziati, i numeri uguali e gli errori. Genna vuole mantenere **verde per lui e blu per lei** e "giocare di più coi contrasti e la vivacità dei colori".

Prima lo studio (agente UI/UX), senza codice:
- inventario di tutti gli stati di una cella e delle loro combinazioni (mia selezione + partner sulla stessa riga, numero uguale + errore, …), in chiaro e in scuro e nelle 4 fasce del momento;
- misura dei contrasti tra stati vicini (non solo testo/sfondo);
- 2-3 proposte di palette o gerarchia, con screenshot a 390×844 di una partita vera in coppia (per esempio selezione con bordo spesso e pieno vivo, partner con bordo tratteggiato, riga e colonna più tenui ma distinguibili).

Checkpoint: Genna sceglie la proposta. Poi si implementa.

Va aggiornato `docs/design/studio-ui.md`: la regola "verde e blu solo nei dettagli, mai a blocchi" si rivede per la griglia solo se Genna lo approva.

## C — Storia più viva, solo dal capitolo 9 in poi
Problema:
- I personaggi e le creature di cui si parla non hanno una forma: "nessuno ha mai disegnato le tre rane o un merlo".
- Genna vorrebbe ambienti più dinamici, che cambino con più dettagli da un capitolo all'altro.

Situazione attuale:
- `Secondari.tsx` disegna 7 secondari con nome (Fischio, Pinza, Nuvola, Nonna Capra, Gufo, Grillo, Briciola), che entrano con `@entra:`.
- `@elemento:` esiste (per esempio `merlo` nel capitolo 10).
- Le comparse citate nel testo (le rane dello stagno, i granchi, la conchiglia, la tavola, …) non sono disegnate.
- Il fondale cambia per luogo, non per capitolo.

Cosa serve:
1. Inventario da `docs/storia/capitoli.md`, capitoli 9-100: creature, oggetti, momenti del giorno e meteo citati per capitolo. Il risultato va in un file sotto docs/storia/.
2. **Comparse** disegnate in SVG nello stile di Secondari/Fondale, con piccole animazioni (rispettando reduced-motion). Si dichiarano per capitolo in `capitoli.md` con una chiave nuova (per esempio `@comparse:`), poi si rigenera il JSON. `scripts/storia/controlla.py` va aggiornato.
3. **Dettagli d'ambiente per capitolo**, dichiarati in `capitoli.md` come le comparse: ora del giorno, meteo, oggetti in scena.

Vincoli:
- **Segreto per Matilde**: tutto ciò che cambia vale solo dal capitolo 9 in poi. I capitoli 0-8, anche riletti dal diario, devono restare identici a oggi. Serve un test che lo verifichi, per esempio uno snapshot del render dei capitoli 0-8 prima e dopo.
- Nessuna traccia di Semina prima del capitolo 5 (già vero, visto il vincolo sopra).
- I testi delle battute non si toccano.
- Le comparse non parlano e non sono secondari nuovi.

## Fatto quando
- A: gli E2E di background e riconnessione sono verdi, e la prova reale di Genna e Matilde va bene.
- B: Genna ha scelto la proposta, è implementata e gli screenshot sono approvati.
- C: comparse e dettagli presenti dal capitolo 9, i capitoli 0-8 sono invariati per test, e gli screenshot sono stati controllati da un validatore.
