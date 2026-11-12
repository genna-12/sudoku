All'avvio leggi HANDOFF.md.

# Sudoku di coppia
PWA per giocare a Sudoku e Killer Sudoku in due, a distanza, sulla stessa griglia, con le mascotte Semino (Genna, verde fluo) e Semina (Mati, blu elettrico) e una storia che cresce con le partite finite ("fiori"). Solo per loro due: la stanza si apre con una frase segreta.

## Stack
Vite + React 19 + TypeScript, CSS puro, nessuna libreria UI. Tempo reale P2P con PeerJS (WebRTC; server pubblico PeerJS solo per la stretta di mano; STUN/TURN in `src/config/ice.ts`). Memoria condivisa: Worker Cloudflare + KV nell'account di Genna (`worker/`, URL in `src/config/sync.ts`, deploy con wrangler dal PC). Vietato usare DB, account o servizi di altri progetti o di clienti (il connettore Cloudflare del Project NON è di Genna: non usarlo). PWA con vite-plugin-pwa. Test con vitest; E2E con Playwright e server PeerJS locale (`scripts/qa/`).

## Struttura
- `src/engine/` generatore/risolutore e valutazione mosse (puro TS) · `src/stato/` riduttore, merge, archivio locale versionato · `src/net/` stanze P2P (coppia con posti per profilo, personale) · `src/ui/` React (hook: useArchivio, usePartita, useRete, useMascotte; regole di gioco in `regole.ts`; storia: regole dei capitoli `capitoli.ts`, lettore `lettore.ts`, schermata `CapitoloScena.tsx` con `Fondale.tsx` e `Secondari.tsx`, diario nel `Giardino.tsx`; mascotte `Semino.tsx`; scena del giardino `Scena.tsx`) · `src/config/` giocatori, punteggio, frasi, storia, sonno, livelli, ICE.
- Contratti in `src/*/types.ts`: cambiarli solo con decisione della lead.
- Spec dei traguardi: `docs/specs/traguardo.md`. Design: `docs/design/studio-ui.md` (palette, regole sui colori: verde e blu nei dettagli, mai a blocchi, salvo le fasce personali della griglia, ADR 007). Report per Genna: `docs/REPORT-11-11-notte.md` (prima: `docs/REPORT-06-11-mattina.md`, `docs/REPORT-06-11-notte.md`, `docs/REPORT-04-11-sera.md`, `docs/REPORT-notte-04-11.md`, `docs/REPORT-notte-03-11.md`).

## Comandi
`npm run dev` · `npm test -- --run` · `npm run build` (output `dist/`, base `/sudoku/`). E2E: vedi README (peerjs locale su 9000 + vite 5173 con `VITE_PEER_*`).

## Deploy
GitHub Pages dal repo `genna-12/sudoku`, workflow `.github/workflows/deploy.yml` a ogni push su `main`. Sito: https://genna-12.github.io/sudoku/

## Regole del progetto
- Semplicità prima di tutto: niente router, store, librerie di animazione. Decisioni piccole in questo file; decisioni grosse in `docs/storico/adr/` (indice in `docs/storico/adr/README.md`); visione e glossario in `docs/progettazione/BUSSOLA.md` (si legge all'avvio).
- Storia: `docs/storia/` (bibbia, guida ai dialoghi, scaletta, `capitoli.md` = fonte unica dei testi). I testi si cambiano lì e si rigenera `src/config/capitoli.json` con `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json`. Mai testi di storia nel codice.
- Fatti sui personaggi (vincolanti): Semino = mare, surf, palla in acqua, PC/nerd, cucina, chitarra, notte; NON ama la montagna (può piacergli una cosa precisa; si veste da montagna solo a modo suo, `zaino-storto`). Semina = montagna, cavallo, natura, animali, alba, euforica, ogni tanto arrabbiata; il mare le piace solo con Semino. A entrambi piace dormire. Nessun personaggio dice mai il tema della storia (guida-dialoghi).
- Prima di 5 fiori Semina non esiste (sorpresa): niente nomi, niente mascotte, niente eco o vestiti, profili "Verde"/"Blu".
- Tutto ciò che si sblocca deriva dal numero di fiori, dai capitoli visti (per giocatore: ruolo a/b) e dalla data: aggiungere capitoli non richiede migrazioni; le chiavi dei capitoli visti sono stabili (`capitolo-N`).
- Livelli in ordine: semini, facile, medio, difficile, extreme, supersemini.
- Si lavora su `main` (progetto personale). Push solo con tsc, test ed E2E verdi.
- TURN: credenziali temporanee di Cloudflare Realtime via Worker `GET /ice` (secrets nel Worker); i server statici in src/config/ice.ts sono solo riserva.

## Decisioni
- 03/11 Niente Supabase né backend: P2P via PeerJS. Hosting GitHub Pages.
- 03/11 Ruolo di gioco dal profilo (Verde=a, Semino; Blu=b, Semina), mai dall'ordine di connessione; posti per profilo nella stanza di coppia; stanza personale per i dispositivi della stessa persona.
- 03/11 Memoria senza backend: archivio locale versionato + allineamento col partner + esporta/importa; azzeramento con data che vale per entrambi.
- 03/11 Palette "petrolio" (studio colori); verde fluo e blu elettrico solo nei dettagli.
- 03/11 Backend minimo accettato da Genna per la memoria che segue la frase: Worker + KV gratuiti (nessuna sospensione per inattività), una chiave per coppia = sha256(frase). Il P2P resta per il tempo reale.
- 03/11 Al riavvio si parte sempre dalla Home ("Continua"), mai dentro la partita.
- 04/11 Storia a capitoli in primo piano dopo ogni partita, visti per giocatore; viaggio per luoghi con secondari; vestiti dai luoghi visitati; capitoli.md fonte unica; materiale personale fuori dal repo (pubblico). ADR 001-005.
- 06/11 Menù unico (`Menu.tsx`) in Home e Partita; in partita niente esporta/importa né "Ricomincia da zero". Il tema forzato spegne il `momento` della scena.
- 06/11 Revisione UI (docs/revisione/): scala z-index unica in tema.css; veli dei fogli chiusi con `chiudiToccandoFuori` (velo.ts), mai su pointerdown; `.schermata` con fill `backwards`; lettore degli arretrati dalla Home chiudibile ("Dopo" segna letto, Esc/indietro no); Annulla solo sulla propria ultima mossa valida.
- 11/11 Riconnessione automatica senza cambiare `src/net/types.ts` (ADR 006). Storia dal capitolo 9 con `@ambiente/@comparse/@oggetti` (spec T9-C-ambienti); capitoli 0-8 congelati da `segreto-matilde.test.tsx`.
- 12/11 Griglia: ognuno vede solo le proprie fasce (velo del proprio colore); il partner solo come anello tratteggiato; chi ha scritto si capisce dal colore del numero, mai dal fondo (ADR 007, spec T9-B-colori).
- 12/11 Stanza di revisione: una frase (solo hash in `src/config/revisione.ts`) apre tutti i capitoli nel lettore vero, senza scritture né rete (`Radice.tsx`, `Revisione.tsx`). La frase non va mai scritta nel repo.

## Strumenti
Nessun connettore: Cloudflare si gestisce con wrangler dal PC di Genna (il connettore Cloudflare del Project è di un cliente, non usarlo); GitHub via git dalla sessione. Il browser integrato della chat occupa un posto nella stanza P2P: chiuderlo prima delle prove.

Segnalazioni sul metodo: docs/segnalazioni-metodo.md (skill workflow-progetti)
