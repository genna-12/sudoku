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

Il namespace KV `sudoku-coppia-archivi` è già creato (id in wrangler.toml).
