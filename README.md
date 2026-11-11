# Sudoku di coppia

PWA per giocare a Sudoku e Killer Sudoku in due, a distanza, sulla stessa griglia. Niente backend: i due telefoni parlano direttamente tra loro (WebRTC via PeerJS). Si entra con un nome e una frase segreta comune.

Sito: https://genna-12.github.io/sudoku/ (si installa da "Aggiungi alla schermata Home").

## Personalizzare
- Frasi e voce di Semino e Semina: `src/config/frasi.ts`.
- Storia, sblocchi, sorprese, giorni speciali: `src/config/storia.ts`.
- Punti, regali, soglie: `src/config/punteggio.ts`. Orari di sonno: `src/config/sonno.ts`.
- Colori e nomi dei due giocatori: `src/config/giocatori.ts`. Difficoltà: `src/config/livelli.ts`.
- Design (palette, regole): `docs/design/studio-ui.md`. Report completo: `docs/REPORT-notte-03-11.md`.

## Limiti da sapere
- Due dispositivi alla volta nella stanza di coppia (uno per profilo); un secondo dispositivo tuo gioca tramite la stanza personale.
- La stessa partita giocata su due tuoi dispositivi NON collegati tra loro: i punti personali non si sommano (vince l'ultimo).
- "Ricomincia da zero" cancella anche dal partner le partite precedenti a quella data.
- Chi conosce la frase entra: sceglietene una vostra.

Ogni push su `main` ricostruisce e pubblica il sito (GitHub Actions → Pages).

## Sviluppo
```
npm install
npm run dev          # http://localhost:5173/sudoku/
npm test -- --run    # test unitari (motore, stato, rete)
npm run build
```
Test a due client in locale (serve un server PeerJS locale perché due schede sullo stesso PC usano la stessa frase):
```
npx peerjs --port 9000 --host 127.0.0.1
VITE_PEER_HOST=127.0.0.1 VITE_PEER_PORT=9000 VITE_PEER_SECURE=false npx vite --port 5173 --host 127.0.0.1
node scripts/qa/due-client.mjs http://127.0.0.1:5173/sudoku/
node scripts/qa/arrivo-semina.mjs http://127.0.0.1:5173/sudoku/     # archivio v1 a 4 fiori → vittoria → capitoli 0..5 su due client → Semino e Semina
node scripts/qa/capitoli-di-fila.mjs http://127.0.0.1:5173/sudoku/  # un capitolo per vittoria, chiuso a metà, "Nuova" del partner mentre leggo, diario
```
(anche `personale.mjs` e `tre-dispositivi.mjs`, stesso uso; `scripts/qa/comune.mjs` ha gli aiuti dei due E2E della storia.)
`node scripts/qa/ambienti-foto.mjs http://127.0.0.1:5173/sudoku/` (basta il dev server): screenshot del lettore con gli ambienti dei capitoli in `docs/design/img/t9-ambienti-*.png` e controllo delle sovrapposizioni su tutti i capitoli 9-100.
