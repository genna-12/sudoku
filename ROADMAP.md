# Roadmap

## T1 — MVP giocabile e deployato — chiuso 03/11/2026, commit 0cd4a98
Motore sudoku+killer, stanza P2P, UI, PWA, deploy GitHub Pages, test a due client. Resta il collaudo sul telefono (HANDOFF, "Da Genna").

## T2 — Collaudo reale e frasi vere (prossimo)
Esiti del test in due; frasi della coppia in `src/config/frasi.ts`; eventuale relay Python se il P2P non passa.

## Dopo (solo se serve)
- Storico partite vinte (localStorage).
- Badge "sta scrivendo".

## Riserva
- Test end-to-end anche nel workflow CI (serve `peer` in CI: già in devDependencies).
