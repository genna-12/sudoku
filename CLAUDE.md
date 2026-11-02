All'avvio leggi HANDOFF.md.

# Sudoku di coppia
PWA per giocare a Sudoku e Killer Sudoku in due, a distanza, sulla stessa griglia. Solo per Genna e la sua ragazza: la stanza si apre con una frase segreta.

## Stack
Vite + React 19 + TypeScript, CSS puro. Sincronizzazione P2P con PeerJS (WebRTC; server pubblico PeerJS solo per la stretta di mano; STUN/TURN in `src/config/ice.ts`). Nessun backend, nessun database: vietato usare DB o servizi di altri progetti. PWA con vite-plugin-pwa. Test con vitest.

## Struttura
- `src/engine/` generatore/risolutore (puro TS) · `src/stato/` riduttore e merge della partita · `src/net/` stanza P2P · `src/ui/` React · `src/config/` frasi, livelli, ICE.
- Contratti in `src/*/types.ts`: cambiarli solo con decisione della lead.
- Spec del traguardo: `docs/specs/traguardo.md`.

## Comandi
`npm run dev` · `npm test -- --run` · `npm run build` (output `dist/`, base `/sudoku/`).

## Deploy
GitHub Pages dal repo `genna-12/sudoku`, workflow `.github/workflows/deploy.yml` a ogni push su `main`. Sito: https://genna-12.github.io/sudoku/

## Regole del progetto
- Semplicità prima di tutto: niente router, store, librerie di animazione, ADR o storico. Decisioni in questo file.
- Livelli in ordine: semini, facile, medio, difficile, extreme, supersemini (semini = più facile).
- Frasi della coppia: `src/config/frasi.ts` (le modifica Genna).
- Si lavora su `main` (progetto personale, due persone).
- Fallback se il P2P non attraversa le reti: relay WebSocket Python sul PC di Genna (non ancora scritto).

## Decisioni
- 03/11/2026 Niente Supabase né backend: P2P via PeerJS (deciso con Genna). Hosting GitHub Pages.

Segnalazioni sul metodo: docs/segnalazioni-metodo.md (skill workflow-progetti)
