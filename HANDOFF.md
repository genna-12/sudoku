# Handoff (03/11/2026, ore 01:30)

## Stato
MVP completo e deployato su https://genna-12.github.io/sudoku/ (branch `main`, commit 0cd4a98 + README/HANDOFF). 65 test unitari verdi, test a due client (`scripts/qa/due-client.mjs`) verde su server PeerJS locale. Repo clonato sul PC in C:\dev\sudoku. Nessun backend: P2P PeerJS, frase segreta → id stanza.

## Prossimo passo
Collaudo reale di Genna con la ragazza (vedi "Da Genna"). Poi: inserire le frasi vere in `src/config/frasi.ts` e push.

## In sospeso
- Nessuna decisione aperta. Badge "sta scrivendo" della spec non implementato (rinunciato, non serve).

## Da Genna
1. Dal telefono, stessa frase su entrambi: le mosse si vedono entro 1 s? Il pallino diventa "connesso"?
2. Dalla schermata di vittoria premete "Nuova" insieme: dovete finire sulla stessa griglia.
3. Uno mette il telefono in background 30 s e torna: si riconnette? I colori delle celle restano gli stessi?
4. iPhone, sia in Safari sia installata: griglia grande, tastierino intero, doppio tap tra i tasti non zooma, campi dell'Ingresso visibili con la tastiera aperta.
5. Le frasi vostre (nomi + frasi per: cella giusta, completato, sbagliata, arrivo, vittoria, invio).

## Attenzione
- Il server PeerJS pubblico non è raggiungibile dal cloud: i test a due client usano `npx peerjs` locale con le variabili `VITE_PEER_*`.
- Se il P2P non passa tra le reti mobili (TURN gratuito Open Relay poco affidabile): fallback previsto = relay WebSocket Python sul PC di Genna, non scritto. Sintomo: pallino fermo su "in attesa" con entrambi dentro la stessa frase.
- I puzzle sono deterministici dal seed solo a parità di `src/engine/genera.ts`: i due client devono avere la stessa versione (la PWA si aggiorna da sola; dopo un deploy riaprire l'app su entrambi).
- Il colore di ciascuno è deciso dall'ordine alfabetico dei nomi (`src/ui/App.tsx`, `mioRuolo`), non dal ruolo di rete.
- Chiunque conosca la frase entra: la sicurezza è tutta nella frase.
- Il token GitHub della sessione cloud non vale per l'API Pages (403 via proxy): Pages si attiva a mano dalle impostazioni del repo (già fatto).

## Chat
- Questa: LEAD · Sudoku · MVP · 03/11 (chiusa).
- Altre attive: nessuna.
