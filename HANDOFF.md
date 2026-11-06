# Handoff (06/11/2026, notte)

## Stato
T5, T6 e T7 (tutti i punti tranne il 12, opzionale) implementati, validati e DEPLOYATI su https://genna-12.github.io/sudoku/ (branch `main`). 473 test unitari e 5 E2E verdi (due-client, personale, tre-dispositivi, arrivo-semina, capitoli-di-fila). Ultimi punti: menù unico `src/ui/Menu.tsx` (ex MenuHome) con `vociMenu.ts`; Esc e focus dei dialoghi (`indietro.ts`, `dialogo.ts`); griglia accessibile (`Griglia.tsx`, `cella.ts`); scena con l'ora (`config/sonno.ts` FASCE_MOMENTO, `momento.ts`, `scena.css`); vestiti in Ingresso/Vittoria/Giardino (`vestiti.ts`, `regole.ts` vestitiSchermata). Report: `docs/REPORT-06-11-notte.md`.

## Prossimo passo
T8 collaudo reale (Genna e Mati dal telefono), poi le correzioni che ne escono: hanno la precedenza su tutto. Senza esiti del collaudo: Riserva (ROADMAP).

## In sospeso
- T7.12 `leggendo` nella presenza P2P: rimandato dalla lead (tocca `src/net/types.ts`; un client vecchio e uno nuovo durante il collaudo). Rivalutare dopo T8.
- Minori: il toast "Frasi nuove…" copre la cima del menù aperto in Home; "Diagnostica rete" eredita lo stile grigio di `.menu-sezione`.
- Di giorno con il sistema in modalità scura il cielo resta scuro (voluto dall'implementatore): chiedere a Genna.
- Studio-ux extra non fatti (testate per atto nel diario, "il prossimo capitolo arriva col fiore N", ecc.): vedi ROADMAP "Dopo".

## Da Genna
1. Telefono (T8): aggiornare la PWA su entrambi; arretrati; Mati vede il capitolo 5 anche se tu l'hai letto; "Dopo" e chiusura a metà; diario; eco; posta (dal fiore 12); vestiti dopo il capitolo 15.
2. iPhone: tocco sulle celle senza tastiera né scorrimento; `100dvh` nel lettore. Android: indietro chiude menù → Home → resta nell'app.
3. Cielo all'alba/tramonto e di giorno in modalità scura: va bene?
4. Capitoli che suonano falsi: numeri → si correggono in `capitoli.md` + rigenera JSON.
5. Ok alla BUSSOLA e ai 5 ADR (ancora da dare).
6. Sul PC: `git pull` in C:\dev\sudoku; c'è un `worker/package-lock.json` non tracciato: va committato (il Worker lo usa) dal PC. `C:\dev\_tools` non era collegata neanche stavolta: push fatto dal cloud.

## Attenzione
- Il repo è PUBBLICO: niente parole personali nei file (ADR 005).
- Visti per ruolo e per era; `payloadDa` conserva i campi sconosciuti; il client non scrive se `versioneDati` remota è più alta.
- Gli E2E sul dev server chiamano il Worker vero (nel cloud bloccato dal proxy): da sistemare con `VITE_SYNC_URL` vuota (Riserva).
- Agenti in worktree: le copie stanno in `.claude/worktrees/` (esclusa da vitest; aggiungi `.claude/` a `.git/info/exclude` nel clone).
- Non far girare E2E mentre altri agenti toccano `src/` (HMR).
- Semina mai prima del capitolo 5: vale anche per i vestiti salvati in `sudoku-vestiti-ultimi-a/b` (riverificati con `accessorioPermesso`).
- Il tema forzato (notte/mattina) spegne il `momento`; il lettore dei capitoli resta sempre di notte.
- Il browser integrato della chat occupa un posto nella stanza P2P; il connettore Cloudflare del Project è di un cliente.

## Chat
- Questa: LEAD · Sudoku · T8 collaudo · 06/11 (chiusa dopo T7).
- Da aprire: LEAD · Sudoku · T8 correzioni · gg/mm, con "riprendi", quando ci sono gli esiti del collaudo.
- Altre attive: nessuna.
