# Handoff (04/11/2026, notte)

## Stato
Progettazione chiusa (chat PROG · Sudoku · storia e UX · 04/11, Fable): storia nuova in 101 capitoli (`docs/storia/`), bibbia, guida ai dialoghi, scaletta, `src/config/capitoli.json` generato; specifiche T5 (`docs/specs/traguardo.md`), T6, T7; studio UX (`docs/design/studio-ux.md`); ADR 001-005 e ricerche in `docs/storico/`; BUSSOLA in `docs/progettazione/`. Codice applicativo invariato dal 25078f4 (T1-T3 deployati, 245 test, E2E verdi). Branch `main`, tutto pushato.

## Prossimo passo
T5 — la storia a capitoli, da `docs/specs/traguardo.md`, nell'ordine: (1) dati, regole, archivio v2, sync con test; (2) `CapitoloScena`, fondali, flusso dopo la vittoria; (3) secondari, diario, eco, due E2E nuovi. Prima di iniziare: leggere BUSSOLA.md e rispondere alle domande di `docs/progettazione/PASSAGGIO.md`.

## In sospeso
- Genna deve approvare la BUSSOLA e leggere i capitoli (almeno 0-27) prima che la lead li metta in gioco; correzioni in `capitoli.md` + rigenerare il JSON.
- T4 collaudo reale (4G, iPhone) non fatto: va in parallelo; i bug di rete hanno la precedenza.

## Da Genna
1. Leggere `docs/storia/bibbia.md` e `capitoli.md`; dire cosa suona falso o troppo spiegato (numero di capitolo).
2. Ok alla BUSSOLA (docs/progettazione/BUSSOLA.md) e ai 5 ADR.
3. Sul PC: `git pull` in C:\dev\sudoku. La cartella `C:\dev\_tools` non era collegata alla sessione: nessun uso di coda/esecutore; i push sono partiti dal cloud.
4. Prova reale PC=Genna, telefono=Mati (dal HANDOFF precedente), quando possibile.
5. Quanti fiori avete oggi sui due telefoni e chi ha già visto la scena di Semina: serve alla lead per la migrazione e per sapere quanti arretrati vi troverete.

## Attenzione
- Il repo è PUBBLICO: niente parole personali nei file (ADR 005); il materiale sta nel Project Claude (`claude/storia-materiale-riservato.md`).
- Il Worker NON unisce: fa PUT, l'unione è nel client (`sync.ts`); `payloadDa` oggi butta i campi sconosciuti (spec T5 "Archivio e sync" dice come cambiarlo).
- `tappeViste` era unito per coppia: non ripetere l'errore con `capitoliVisti` (per ruolo, per era).
- Lo script `scripts/storia/controlla.py` non scrive il JSON se ci sono errori; i testi si cambiano solo in `capitoli.md`.
- Semina mai prima del fiore 5: vale anche per eco, vestiti e diario (rilettura dei capitoli 0-4 senza di lei).
- Il connettore Cloudflare del Project è di un cliente: mai usarlo. Il browser integrato della chat occupa un posto nella stanza P2P.
- `Semino.tsx` e `Scena.tsx` sono grandi: modifiche con agente dedicato e screenshot.
- Fonti [C] della ricerca sulle coppie non riaperte: non citarle fuori dal progetto senza verifica.

## Chat
- Questa: PROG · Sudoku · storia e UX · 04/11 (chiusa).
- Da aprire: LEAD · Sudoku · T5 capitoli · gg/mm (Opus), con "riprendi".
- Altre attive: nessuna. La LEAD · Sudoku · MVP · 03/11 si può eliminare.
