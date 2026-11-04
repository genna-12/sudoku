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
## T7 — Dinamicità e usabilità — punti 1-5, 8, 11 chiusi 04/11; spec docs/specs/T7-ux.md
Restano: 6 accessibilità della griglia (roving tabindex, Esc nei menù), 7 menù unico Home/Partita, 9 scena che conosce l'ora (`momento`), 10 accessori nelle schermate grandi, 12 `leggendo` nella presenza (opzionale). Scostamenti minori accettati: rotazione vestiti 0,75/90 s; posta: stessa frase entro 120 s = una voce.

## T8 — Collaudo reale della storia (prossimo)
Genna e Mati giocano dal telefono con la versione nuova: arretrati, lettura del capitolo su entrambi, vestiti, posta, gesto indietro Android, iOS PWA. Esiti in HANDOFF "Da Genna"; poi correzioni e i punti T7 rimasti.

## Dopo (solo se serve)
- Capitoli oltre il 100 (nuovi atti con lo stesso metodo); "leggi dopo" più fine per gli arretrati.
- Splash iOS; suoni opzionali; storico partite esportabile in immagine.

## Riserva
- E2E nel workflow CI (peer in devDependencies, playwright da installare in CI).
- Lazy load di Scena/Giardino se il bundle cresce.
- Riverificare le fonti [C] di docs/storico/ricerca/2026-11-04-coppia-lezioni.md (Sonnet, solo WebSearch).
- Chiacchiere nuove per bosco, città, cucina, lontano in frasi.ts (4-6 per personaggio per luogo), nello spirito della bibbia.
- Codice morto: STORIA_SEMINO/STORIA_EXTRA in frasi.ts (cade con T5).
