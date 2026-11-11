# Handoff (11/11/2026, mattina presto)

## Stato
T9 A (connessione) e T9 C (storia viva dal capitolo 9) sono su `main` e deployati: https://genna-12.github.io/sudoku/. Il report per Genna è in `docs/REPORT-11-11-notte.md`. Test: 611 unitari; E2E 10 (5 storici + 5 della riconnessione) verdi su main dopo il merge. B (colori della griglia): studio fatto, `docs/design/studio-colori-griglia.md`, in attesa della scelta di Genna.

## Prossimo passo
1. **B, colori della griglia.** Quando Genna sceglie la proposta (A, B o C dello studio; consigliata A, "anelli vivi"), implementarla. Le variabili CSS esatte di ogni proposta sono nello studio. A tocca solo `tema.css`; B aggiunge la classe `vicina-suo` in `Griglia.tsx`. B e C cambiano la regola "verde e blu mai a blocchi": serve l'ok di Genna, da scrivere in `docs/design/studio-ui.md` e in CLAUDE.md. Rifare gli screenshot con `scripts/qa/colori-griglia-proposte.mjs`.
2. Esiti della prova reale di A (vedi "Da Genna"). Se non si ricollegano, partire da Diagnostica rete e dalla ricerca `docs/storico/ricerca/2026-11-11-connessione-ios.md` §9.

## In sospeso
- Le 7 scelte di `docs/REPORT-06-11-mattina.md`: Genna non ha ancora risposto.
- T7.12 `leggendo` nella presenza P2P: rimandato.
- C: oggetti sullo sfondo in parte sotto il fumetto (falene 55/59/66, locandina 65, lettera 84, fuochi 50). Lo script `scripts/qa/ambienti-coperti.mjs` li elenca.

## Da Genna
1. Scegliere la proposta di colori B.
2. Prova reale con Matilde: background 1-5 minuti; cambio da Wi-Fi a dati; chiusura brusca e riapertura; una partita con un telefono aggiornato e uno no.
3. Dire i numeri dei capitoli dal 9 in poi in cui cielo, meteo o oggetti stonano.
4. Rispondere alle 7 scelte del report del 06/11 mattina.
5. Sul PC: `git pull` in C:\dev\sudoku; committare `worker/package-lock.json`; cancellare su GitHub i branch `t7-resto`, `correzioni-ui`, `t9-a-connessione`, `t9-c-testi`, `t9-c-ambienti`, ormai uniti a main.

## Attenzione
- **Segreto per Matilde**: i capitoli 0-8 sono protetti da `src/ui/segreto-matilde.test.tsx`. Non aggiornarne mai lo snapshot. Tutto ciò che cambia la storia vale dal 9 (`AMBIENTE_DA` in `CapitoloScena.tsx`).
- **Ambienti**: righe `@ambiente/@comparse/@oggetti` in capitoli.md, vocabolario chiuso in `src/config/ambienti.json`, regole in `docs/specs/T9-C-ambienti.md` e `docs/storia/ambienti.md`.
- **Rete** (ADR 006): `src/net/types.ts` non è cambiato. Un client vecchio deve capire tutto (`src/net/compat.test.ts`, con una copia della logica di main). Gli E2E della riconnessione avviano da soli un proxy su 9000 e peer su 9001: niente `npx peerjs` per quelli (README).
- **Repo PUBBLICO**: niente parole personali nei file (ADR 005).
- **Agenti**: in worktree, push del branch di lavoro dopo ogni commit (il container si è riavviato una volta stanotte). Porte diverse per agenti paralleli (9000/5173 e 9100/5273).
- E2E `arrivo-semina` instabile: una volta su più giri.

## Chat
- Questa: LEAD · Sudoku · T9 connessione e storia · 11/11, chiusa.
- Da aprire: LEAD · Sudoku · T9 B colori · gg/mm, con "riprendi", dopo la scelta di Genna.
- Altre attive: nessuna.
