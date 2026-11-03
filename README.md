# Sudoku di coppia

PWA per giocare a Sudoku e Killer Sudoku in due, a distanza, sulla stessa griglia. Niente backend: i due telefoni parlano direttamente tra loro (WebRTC via PeerJS). Si entra con un nome e una frase segreta comune.

Sito: https://genna-12.github.io/sudoku/ (si installa da "Aggiungi alla schermata Home").

## Personalizzare
- Frasi che compaiono durante il gioco: `src/config/frasi.ts`.
- Colori dei due giocatori: `COLORI` nello stesso file.
- Difficoltà dei livelli: `src/config/livelli.ts`.

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
```
