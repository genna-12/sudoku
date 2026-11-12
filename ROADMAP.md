# Roadmap

## T1 — MVP giocabile e deployato — chiuso 03/11/2026, commit 0cd4a98
## T2 — Giardino di Semino: punti, regali, storico, profili, mascotte, archivio, multi-dispositivo — chiuso 03/11, commit 8f5ae7b
## T2b — Blu che cresce, fiori in quota, solletico, accessori, presenza e sonno — chiuso 03/11, commit 4209f09
## T3 — Storia da videogioco, sblocchi nel giardino, studio UI/colori, icone — chiuso 03/11 (notte), vedi docs/REPORT-notte-03-11.md
## PROG — Storia a capitoli, viaggio per luoghi, vestiti, studio UX — progettazione chiusa 04/11 (chat PROG · Sudoku · storia e UX · 04/11): docs/storia/, docs/specs/, docs/storico/adr/001-005

## T4 — Collaudo reale (aperto, in parallelo a T5)
Genna e Mati giocano dal telefono: connessione 4G, mosse e reazioni identiche, iPhone (note, doppio tocco, vibrazione, esporta/importa). Esiti nella sezione "Da Genna" di HANDOFF. Non bloccare T5 per questo, ma ogni bug di rete trovato ha la precedenza.

## T5 — La storia a capitoli — chiuso 04/11 (pomeriggio), deployato; spec docs/specs/traguardo.md; validato (docs/design/img/t5-*.png)
## T6 — Luoghi visitati, vestiti e ricordi — chiuso 04/11, deployato; spec docs/specs/T6-luoghi-vestiti.md
## T7 — Dinamicità e usabilità — chiuso 06/11 (punti 1-11; 12 rimandato), deployato, commit cfbc483; spec docs/specs/T7-ux.md, report docs/REPORT-06-11-notte.md

## Revisione UI approfondita — chiusa 06/11 mattina, deployata, commit 9eef5dc: 69 difetti (10 alti) corretti; docs/revisione/, report docs/REPORT-06-11-mattina.md

## T8 — Collaudo reale — primo giro fatto l'11/11 da Genna e Matilde (iPhone, PWA, capitolo 8): esiti in docs/specs/T9-collaudo.md

## T9 — Correzioni dal collaudo: spec docs/specs/T9-collaudo.md
- A connessione — chiuso 11/11, deployato (ADR 006, ricerca 2026-11-11-connessione-ios); report docs/REPORT-11-11-notte.md
- C storia viva dal capitolo 9 — chiuso 11/11, deployato (spec T9-C-ambienti.md, docs/storia/ambienti.md)
- B colori della griglia — chiuso 12/11, deployato (fasce personali, ADR 007, spec T9-B-colori.md)
- Stanza di revisione dei capitoli (frase solo come hash in src/config/revisione.ts) — chiusa 12/11, deployata

## Dopo (solo se serve)
- T7.12 `leggendo` nella presenza P2P ("Mati sta leggendo…"), dopo T8: tocca `src/net/types.ts`.
- Toast "Frasi nuove…" che copre il menù aperto; stile di "Diagnostica rete" nel menù.
- Capitoli oltre il 100 (nuovi atti con lo stesso metodo); "leggi dopo" più fine per gli arretrati.
- Splash iOS; suoni opzionali; storico partite esportabile in immagine.

## Riserva
- E2E che scrivono sul Worker vero: farli puntare a un Worker finto o a chiavi di test.
- Instabilità dell'E2E arrivo-semina ("niente eco del capitolo 5 in Home", 1 volta su più giri) prima di metterlo in CI.
- Oggetti dell'ambiente coperti dal fumetto (scripts/qa/ambienti-coperti.mjs).
- E2E nel workflow CI (peer in devDependencies, playwright da installare in CI).
- Lazy load di Scena/Giardino se il bundle cresce.
- Riverificare le fonti [C] di docs/storico/ricerca/2026-11-04-coppia-lezioni.md (Sonnet, solo WebSearch).
- Chiacchiere nuove per bosco, città, cucina, lontano in frasi.ts (4-6 per personaggio per luogo), nello spirito della bibbia.
- Codice morto: STORIA_SEMINO/STORIA_EXTRA in frasi.ts (cade con T5).
