# Handoff (03/11/2026, mattina)

## Stato
T1–T3 chiusi e deployati su https://genna-12.github.io/sudoku/ (branch `main`). 223 test unitari e 4 E2E (due-client, personale, tre-dispositivi, sblocco-semina) verdi. Repo sul PC in C:\dev\sudoku (pull fatto a fine sessione). Report completo per Genna: docs/REPORT-notte-03-11.md.

## Prossimo passo
T4 collaudo reale: Genna e Mati giocano dal telefono; raccogliere bug ed esiti (lista "Da Genna"), poi correggere. Se il P2P non passa sulle reti mobili: scrivere il relay WebSocket Python sul PC (nuova spec).

## In sospeso
- Nessuna decisione aperta. Splash iOS non fatte (troppe immagini).

## Da Genna
1. Riaprire l'app di ieri su entrambi i telefoni: nessuna scena/tappa ripetuta, al massimo un annuncio.
2. Telefono + telefono, stessa frase: connessione, mosse e reazioni identiche sui due lati, fumetti mai sulla griglia.
3. PC + telefono tuoi insieme: "sei già collegato da un altro dispositivo" ma le mosse si vedono.
4. 5° fiore: scena di Semina su entrambi, poi nomi Semino/Semina; "Nuova" premuto insieme → stessa griglia e regalo presente.
5. iPhone: note tenendo premuto, doppio tocco, niente zoom, vibrazione, esporta/importa memoria.
6. Leggere le frasi e la storia in gioco: cosa togliere/aggiungere (file in src/config).

## Attenzione
- Il server PeerJS pubblico e l'API Pages non sono raggiungibili dal cloud: E2E con `npx peerjs` locale e `VITE_PEER_*`; Pages si gestisce dal sito GitHub.
- Semina prima di 5 fiori non deve MAI comparire (sorpresa): ogni modifica a Home/Ingresso/Vittoria va controllata con `sbloccata=false`.
- Ruolo di gioco dal profilo (Verde=a, Blu=b), mai dal ruolo di rete. Posti per profilo nella stanza di coppia.
- Tappe della storia: viste per numero di fiori (qualunque personaggio), chiavi stabili; aggiungere tappe non richiede migrazioni; `migra` conserva i campi sconosciuti dell'archivio.
- Palette e regole colore in docs/design/studio-ui.md: verde e blu nei dettagli, mai a blocchi.
- Semino.tsx e Scena.tsx sono grandi (SVG): modifiche con un agente dedicato e screenshot.

## Chat
- Questa: LEAD · Sudoku · MVP · 03/11 (chiusa, ha coperto T1–T3 in una notte su richiesta di Genna).
- Altre attive: nessuna.
