# Handoff (04/11/2026, sera)

## Stato
T5 (storia a capitoli), T6 (vestiti per luogo, ricordi) e T7 punti 1-5, 8, 11 (usabilità) implementati, validati da agenti separati e DEPLOYATI su https://genna-12.github.io/sudoku/ (branch `main`). 421 test unitari, 5 E2E (due-client, personale, tre-dispositivi, arrivo-semina, capitoli-di-fila) verdi. Storia: 101 capitoli in `docs/storia/capitoli.md` (fonte unica, JSON in `src/config/capitoli.json`), rivisti dopo le note dei revisori e un passaggio di naturalezza. Report per Genna: `docs/REPORT-04-11-sera.md`.

## Prossimo passo
T8 collaudo reale della storia: Genna e Mati dal telefono (vedi "Da Genna"). Poi correzioni e i punti T7 rimasti (ROADMAP): accessibilità della griglia, menù unico, scena che conosce l'ora, accessori nelle schermate grandi.

## In sospeso
- Archivio v2: al primo avvio dopo l'aggiornamento ognuno trova gli arretrati (capitoli 0..fiori) da leggere dalla Home o dopo la prima vittoria; il giardino può restringersi finché non li legge (voluto, spec T5/T6).
- Scostamenti minori accettati: rotazione vestiti 0,75 stesso luogo / 90 s; stessa frase dello stesso mittente entro 120 s = una voce nella posta; il foglio "Adesso/Dopo" solo dopo una vittoria.
- Studio-ux extra non fatti: testate per atto nel diario, "il prossimo capitolo arriva col fiore N", "Capitolo N · rileggi" nel dettaglio del fiore, firma dell'eco toccabile, `leggendo` nella presenza.

## Da Genna
1. Telefono: aggiornare la PWA su entrambi (banner "Aggiorna"); leggere gli arretrati; verificare che Mati veda il capitolo 5 sul suo telefono anche se tu l'hai già letto; "Dopo" e chiusura a metà capitolo; diario; eco in Home; cassetta della posta (dal fiore 12) con le frasi di ieri; vestiti in Home dopo il capitolo 15 (mare).
2. Android: gesto indietro (foglio → Home → resta nell'app); iOS: `inert` e `100dvh` nel lettore, pushState in PWA.
3. Leggere i capitoli in gioco e segnare i numeri di quelli che suonano falsi: si correggono in `capitoli.md` + rigenera JSON (`python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json`).
4. Ok alla BUSSOLA (`docs/progettazione/BUSSOLA.md`) e ai 5 ADR.
5. Sul PC: `git pull` in C:\dev\sudoku; `C:\dev\_tools` non era collegata: push dal cloud.

## Attenzione
- Il repo è PUBBLICO: niente parole personali nei file (ADR 005); il materiale sta nel Project Claude.
- Visti per ruolo e per era; `payloadDa` conserva i campi sconosciuti; il client non scrive se `versioneDati` remota è più alta. Non reintrodurre unioni per coppia.
- Gli E2E sul dev server chiamano il Worker vero (nel cloud è bloccato dal proxy; sul PC scriverebbe sul KV con frasi di prova): da sistemare con `VITE_SYNC_URL` vuota (Riserva).
- Non far girare E2E mentre altri agenti toccano `src/` (HMR di vite fa fallire i test a caso).
- Semina mai prima del capitolo 5: elementi, blu, petali, vestiti, eco, chiacchiere di luogo derivano dai capitoli letti, non dai fiori.
- `Semino.tsx`, `Scena.tsx`, `CapitoloScena.tsx` grandi: agente dedicato e screenshot (390×844 e 360×640).
- Il browser integrato della chat occupa un posto nella stanza P2P; il connettore Cloudflare del Project è di un cliente.

## Chat
- Questa: PROG · Sudoku · storia e UX · 04/11 (chiusa; ha fatto anche da lead per T5-T7 su richiesta di Genna).
- Da aprire: LEAD · Sudoku · T8 collaudo · gg/mm (Opus), con "riprendi".
- Altre attive: nessuna. La LEAD · Sudoku · MVP · 03/11 si può eliminare.
