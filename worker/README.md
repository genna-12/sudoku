# Worker della memoria condivisa

Serve solo a far seguire il giardino alla frase, su qualunque dispositivo. Piano gratuito Cloudflare: nessuna sospensione per inattività.

Deploy (dal PC, una volta):
```
cd C:\dev\sudoku\worker
npm install
npx wrangler login          # apre il browser
npx wrangler deploy         # stampa l'URL https://sudoku-coppia.<account>.workers.dev
```
Poi metti l'URL in `src/config/sync.ts` (campo `URL_SYNC`) e fai push: il sito si aggiorna da solo.

Il namespace KV `ARCHIVI` è nell'account Cloudflare di Genna (id in wrangler.toml).

## TURN di Cloudflare (serve quando il P2P non passa, es. telefono in 4G ↔ PC)

Il Worker genera credenziali TURN temporanee (24 h) con `GET /ice`; l'app le chiede all'avvio.
Senza questi passi l'app usa i server statici di `src/config/ice.ts` (che dal 4G spesso non bastano).

1. Dashboard Cloudflare → **Realtime → TURN** (o "TURN Server") → **Create** una TURN key (nome libero, es. `sudoku`).
   Copia il **Turn Token ID** e l'**API Token** (il token si vede una volta sola).
2. Dal PC, nella cartella del worker:
   ```
   cd C:\dev\sudoku\worker
   npx wrangler secret put TURN_KEY_ID       # incolla il Turn Token ID
   npx wrangler secret put TURN_API_TOKEN    # incolla l'API Token
   npx wrangler deploy
   ```
3. Verifica:
   ```
   curl https://sudoku-coppia.gennari-lorenzo05.workers.dev/ice
   ```
   Deve rispondere `{"iceServers":[{"urls":"stun:stun.l.google.com:19302"},{"urls":["stun:stun.cloudflare.com:3478",...]},{"urls":["turn:turn.cloudflare.com:3478?transport=udp",...],"username":"...","credential":"..."}]}`.
   Se risponde `{"iceServers":null,"motivo":"..."}` il motivo dice cosa manca (secrets, token sbagliato = `cloudflare 401/403`).
   Nell'app, menù Diagnostica: la riga `ice: cloudflare (N server)` conferma che il TURN è in uso.

Costi: Realtime ha una quota gratuita mensile di traffico (1000 GB all'ultima verifica, controllare la pagina prezzi); il sudoku passa pochi KB a partita.
