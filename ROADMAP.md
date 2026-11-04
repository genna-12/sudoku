# Roadmap

## T1 — MVP giocabile e deployato — chiuso 03/11/2026, commit 0cd4a98
## T2 — Giardino di Semino: punti, regali, storico, profili, mascotte, archivio, multi-dispositivo — chiuso 03/11, commit 8f5ae7b
## T2b — Blu che cresce, fiori in quota, solletico, accessori, presenza e sonno — chiuso 03/11, commit 4209f09
## T3 — Storia da videogioco, sblocchi nel giardino, studio UI/colori, icone — chiuso 03/11 (notte), vedi docs/REPORT-notte-03-11.md
## PROG — Storia a capitoli, viaggio per luoghi, vestiti, studio UX — progettazione chiusa 04/11 (chat PROG · Sudoku · storia e UX · 04/11): docs/storia/, docs/specs/, docs/storico/adr/001-005

## T4 — Collaudo reale (aperto, in parallelo a T5)
Genna e Mati giocano dal telefono: connessione 4G, mosse e reazioni identiche, iPhone (note, doppio tocco, vibrazione, esporta/importa). Esiti nella sezione "Da Genna" di HANDOFF. Non bloccare T5 per questo, ma ogni bug di rete trovato ha la precedenza.

## T5 — La storia a capitoli (prossimo) — spec: docs/specs/traguardo.md
Capitoli in primo piano dopo ogni partita, visti per giocatore, arretrati, eco, diario; `capitoli.json` da `docs/storia/capitoli.md`; schermata del capitolo con 7 fondali e 7 secondari; rimozione di tappe/sorprese/annunci. Stima: 2-3 sessioni (regole+archivio+sync; schermata+fondali; secondari+diario+E2E).

## T6 — Luoghi visitati, vestiti e ricordi — spec: docs/specs/T6-luoghi-vestiti.md
8 vestiti nuovi, rotazione in Home per luogo, ricordi del giardino. Stima: 1-2 sessioni (vestiti con agente dedicato e screenshot).

## T7 — Dinamicità e usabilità — spec: docs/specs/T7-ux.md, studio in docs/design/studio-ux.md
Testi leggibili in partita, transizioni, gesti scoperti, cassetta vera, giardino vivo, accessibilità, menù unico, 12 px, scena che conosce l'ora, gesto indietro Android. Stima: 2 sessioni, a punti indipendenti.

## Dopo (solo se serve)
- Capitoli oltre il 100 (nuovi atti con lo stesso metodo); "leggi dopo" più fine per gli arretrati.
- Splash iOS; suoni opzionali; storico partite esportabile in immagine.

## Riserva
- E2E nel workflow CI (peer in devDependencies, playwright da installare in CI).
- Lazy load di Scena/Giardino se il bundle cresce.
- Riverificare le fonti [C] di docs/storico/ricerca/2026-11-04-coppia-lezioni.md (Sonnet, solo WebSearch).
- Chiacchiere nuove per bosco, città, cucina, lontano in frasi.ts (4-6 per personaggio per luogo), nello spirito della bibbia.
- Codice morto: STORIA_SEMINO/STORIA_EXTRA in frasi.ts (cade con T5).
