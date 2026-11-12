# Handoff (12/11/2026, notte)

## Stato
T9 chiuso: A (connessione), C (storia viva dal 9), B (fasce personali nella griglia, ADR 007) e la stanza di revisione dei capitoli sono su `main` e deployati: https://genna-12.github.io/sudoku/. Report per Genna: `docs/REPORT-11-11-notte.md`, con un aggiornamento in fondo per il 12/11. Test: 629 unitari; E2E 11 (5 storici, 5 della riconnessione, revisione).

## Prossimo passo
Raccogliere il feedback di Genna dalla prova reale: connessione su iPhone, capitoli rivisti nella stanza di revisione, colori. Tradurlo in un traguardo T10 con una spec breve in docs/specs/. Se il feedback sui capitoli tocca i testi: si cambia solo capitoli.md, mai i capitoli 0-8 già letti da Matilde (`segreto-matilde.test.tsx`).

## In sospeso
- Le 7 scelte di `docs/REPORT-06-11-mattina.md`: Genna non ha ancora risposto.
- T7.12 `leggendo` nella presenza P2P: rimandato.
- C: alcuni oggetti dello sfondo finiscono sotto il fumetto (`scripts/qa/ambienti-coperti.mjs`).
- B: di giorno l'errore dentro la fascia verde tende al beige (leggibile, annotato nello studio §8). Le note scendono a 3,9:1 sulla selezione.

## Da Genna
1. Feedback su connessione (background, cambio da Wi-Fi a dati, chiusura brusca), sui capitoli e sui colori.
2. Revisione dei capitoli: scheda privata di Safari, poi la frase della revisione (gliel'ho data in chat; non è in nessun file) nel campo della frase segreta.
3. Le 7 scelte del report del 06/11 mattina.
4. Sul PC: `git pull` in C:\dev\sudoku; committare `worker/package-lock.json`; cancellare su GitHub i branch uniti (`t7-resto`, `correzioni-ui`, `t9-*`).

## Attenzione
- **Frase della revisione**: nel codice c'è solo lo sha256 (`src/config/revisione.ts`). La frase non va scritta in file, test, commit o log: l'E2E la legge da `REVISIONE_FRASE`. Se va cambiata, si ricalcola l'hash con `normalizzaFrase`.
- **Segreto per Matilde**: i capitoli 0-8 sono congelati dallo snapshot; non aggiornarlo mai. Ambiente, comparse e oggetti valgono solo dal 9.
- **Griglia** (ADR 007): variabili `--g-*` in tema.css, blocco "Stati della griglia"; `.app[data-ruolo='b']` corregge le tinte per Mati. Le soglie si verificano con `node scripts/qa/colori-griglia-t9b.mjs --rapido` (esce con 1 se una soglia salta).
- **Rete** (ADR 006): `types.ts` invariato; compatibilità con i client vecchi in `src/net/compat.test.ts`. Gli E2E della riconnessione avviano da soli 9000/9001.
- Gli E2E storici scrivono sul Worker vero (vedi Riserva). Agenti in parallelo: porte diverse, push del branch dopo ogni commit.
- Repo PUBBLICO: niente parole personali (ADR 005).

## Chat
- Questa: LEAD · Sudoku · T9 connessione e storia · 11/11, chiusa.
- Prossima: LEAD · Sudoku · T10 feedback · gg/mm, da aprire con "riprendi".
