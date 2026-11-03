# Handoff (03/11/2026, mattina)

## Stato
Dopo la notte: test cieco (17 correzioni), nomi veri Genna/Mati, aggiornamento PWA con bottone, versione e diagnostica rete nel menù, mascotte vive, Home al riavvio, IndexedDB + storage persistente, **memoria condivisa via Worker Cloudflare** (worker/ deployato da Genna su https://sudoku-coppia.gennari-lorenzo05.workers.dev, KV `ARCHIVI`). 245 test, 4 E2E + 1 con Worker finto.
T1–T3 chiusi e deployati su https://genna-12.github.io/sudoku/ (branch `main`). 223 test unitari e 4 E2E (due-client, personale, tre-dispositivi, sblocco-semina) verdi. Repo sul PC in C:\dev\sudoku (pull fatto a fine sessione). Report completo per Genna: docs/REPORT-notte-03-11.md.

## Prossimo passo
T4 collaudo reale: Genna e Mati giocano dal telefono; raccogliere bug ed esiti (lista "Da Genna"), poi correggere. Se il P2P non passa sulle reti mobili: scrivere il relay WebSocket Python sul PC (nuova spec).

## In sospeso
- Nessuna decisione aperta. Splash iOS non fatte (troppe immagini).

## Da Genna
0. RISOLTO 15:45: PC ↔ telefono in 4G non si collegavano perché il TURN gratuito Open Relay non era raggiungibile (nessun evento ICE). Ora TURN di Cloudflare Realtime nel Worker (`GET /ice`, secrets TURN_KEY_ID/TURN_API_TOKEN messi da Genna con wrangler): registro telefono `ice: cloudflare (8 server)` → `ice -a connected`. Resta da fare la prova pulita PC=Genna, telefono=Mati, poi la partita vera con Mati.
1. Riaprire l'app di ieri su entrambi i telefoni: nessuna scena/tappa ripetuta, al massimo un annuncio.
2. Telefono + telefono, stessa frase: connessione, mosse e reazioni identiche sui due lati, fumetti mai sulla griglia.
3. PC + telefono tuoi insieme: "sei già collegato da un altro dispositivo" ma le mosse si vedono.
4. 5° fiore: scena di Semina su entrambi, poi nomi Semino/Semina; "Nuova" premuto insieme → stessa griglia e regalo presente.
5. iPhone: note tenendo premuto, doppio tocco, niente zoom, vibrazione, esporta/importa memoria.
6. Leggere le frasi e la storia in gioco: cosa togliere/aggiungere (file in src/config).

## Attenzione
- Il connettore Cloudflare del Project è di un CLIENTE: mai usarlo (errore del 03/11, annotato). Tutto Cloudflare passa da wrangler sul PC di Genna.
- Il Worker non è raggiungibile dal cloud (proxy): i test della sync e di /ice usano fetch finto. Il Worker serve anche le credenziali TURN (src/net/ice.ts, fallback ai server statici di src/config/ice.ts).
- Il browser integrato della chat (Claude) resta loggato come un profilo e occupa un posto nella stanza: chiuderlo prima delle prove di Genna.
- Il server PeerJS pubblico e l'API Pages non sono raggiungibili dal cloud: E2E con `npx peerjs` locale e `VITE_PEER_*`; Pages si gestisce dal sito GitHub.
- Semina prima di 5 fiori non deve MAI comparire (sorpresa): ogni modifica a Home/Ingresso/Vittoria va controllata con `sbloccata=false`.
- Ruolo di gioco dal profilo (Verde=a, Blu=b), mai dal ruolo di rete. Posti per profilo nella stanza di coppia.
- Tappe della storia: viste per numero di fiori (qualunque personaggio), chiavi stabili; aggiungere tappe non richiede migrazioni; `migra` conserva i campi sconosciuti dell'archivio.
- Palette e regole colore in docs/design/studio-ui.md: verde e blu nei dettagli, mai a blocchi.
- Semino.tsx e Scena.tsx sono grandi (SVG): modifiche con un agente dedicato e screenshot.

## Chat
- Questa: LEAD · Sudoku · MVP · 03/11 (chiusa, ha coperto T1–T3 in una notte su richiesta di Genna).
- Altre attive: nessuna.
