# Roadmap

## T1 — MVP giocabile e deployato — chiuso 03/11/2026, commit 0cd4a98
## T2 — Giardino di Semino: punti, regali, storico, profili, mascotte, archivio, multi-dispositivo — chiuso 03/11, commit 8f5ae7b
## T2b — Blu che cresce, fiori in quota, solletico, accessori, presenza e sonno — chiuso 03/11, commit 4209f09
## T3 — Storia da videogioco, sblocchi nel giardino, studio UI/colori, icone — chiuso 03/11 (notte), vedi docs/REPORT-notte-03-11.md

## T4 — Collaudo reale (prossimo)
Esiti della prima serata di gioco (HANDOFF, "Da Genna"); bug trovati sul telefono; relay Python se il P2P non passa; frasi/storia da ritoccare dopo averle lette in gioco.

## Dopo (solo se serve)
- Backend minimo (Cloudflare Worker + KV) per profilo ovunque anche a dispositivi spenti.
- Splash iOS; suoni opzionali; storico partite esportabile in immagine.

## Riserva
- E2E nel workflow CI (peer in devDependencies, playwright da installare in CI).
- Lazy load di Scena/Giardino se il bundle cresce.
