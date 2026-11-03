All'avvio leggi HANDOFF.md.

# Sudoku di coppia
PWA per giocare a Sudoku e Killer Sudoku in due, a distanza, sulla stessa griglia, con le mascotte Semino (Genna, verde fluo) e Semina (Mati, blu elettrico) e una storia che cresce con le partite finite ("fiori"). Solo per loro due: la stanza si apre con una frase segreta.

## Stack
Vite + React 19 + TypeScript, CSS puro, nessuna libreria UI. Tempo reale P2P con PeerJS (WebRTC; server pubblico PeerJS solo per la stretta di mano; STUN/TURN in `src/config/ice.ts`). Memoria condivisa: Worker Cloudflare + KV nell'account di Genna (`worker/`, URL in `src/config/sync.ts`, deploy con wrangler dal PC). Vietato usare DB, account o servizi di altri progetti o di clienti (il connettore Cloudflare del Project NON è di Genna: non usarlo). PWA con vite-plugin-pwa. Test con vitest; E2E con Playwright e server PeerJS locale (`scripts/qa/`).

## Struttura
- `src/engine/` generatore/risolutore e valutazione mosse (puro TS) · `src/stato/` riduttore, merge, archivio locale versionato · `src/net/` stanze P2P (coppia con posti per profilo, personale) · `src/ui/` React (hook: useArchivio, usePartita, useRete, useMascotte; regole di gioco in `regole.ts`; mascotte `Semino.tsx`; scena del giardino `Scena.tsx`) · `src/config/` giocatori, punteggio, frasi, storia, sonno, livelli, ICE.
- Contratti in `src/*/types.ts`: cambiarli solo con decisione della lead.
- Spec dei traguardi: `docs/specs/traguardo.md`. Design: `docs/design/studio-ui.md` (palette, regole sui colori: verde e blu nei dettagli, mai a blocchi). Report per Genna: `docs/REPORT-notte-03-11.md`.

## Comandi
`npm run dev` · `npm test -- --run` · `npm run build` (output `dist/`, base `/sudoku/`). E2E: vedi README (peerjs locale su 9000 + vite 5173 con `VITE_PEER_*`).

## Deploy
GitHub Pages dal repo `genna-12/sudoku`, workflow `.github/workflows/deploy.yml` a ogni push su `main`. Sito: https://genna-12.github.io/sudoku/

## Regole del progetto
- Semplicità prima di tutto: niente router, store, librerie di animazione, ADR o storico. Decisioni in questo file.
- Fatti sui personaggi (vincolanti): Semino = mare, surf, palla in acqua, PC/nerd, cucina, chitarra, notte; NON ama la montagna. Semina = montagna, cavallo, natura, animali, alba, euforica, ogni tanto arrabbiata; il mare le piace solo con Semino. A entrambi piace dormire.
- Prima di 5 fiori Semina non esiste (sorpresa): niente nomi, niente mascotte, profili "Verde"/"Blu".
- Tutto ciò che si sblocca deriva dal numero di fiori e dalla data: aggiungere tappe/sblocchi non richiede migrazioni; le chiavi delle tappe viste sono stabili (`chi-partite`).
- Livelli in ordine: semini, facile, medio, difficile, extreme, supersemini.
- Si lavora su `main` (progetto personale). Push solo con tsc, test ed E2E verdi.
- Fallback se il P2P non attraversa le reti: relay WebSocket Python sul PC di Genna (non scritto).

## Decisioni
- 03/11 Niente Supabase né backend: P2P via PeerJS. Hosting GitHub Pages.
- 03/11 Ruolo di gioco dal profilo (Verde=a, Semino; Blu=b, Semina), mai dall'ordine di connessione; posti per profilo nella stanza di coppia; stanza personale per i dispositivi della stessa persona.
- 03/11 Memoria senza backend: archivio locale versionato + allineamento col partner + esporta/importa; azzeramento con data che vale per entrambi.
- 03/11 Palette "petrolio" (studio colori); verde fluo e blu elettrico solo nei dettagli.
- 03/11 Backend minimo accettato da Genna per la memoria che segue la frase: Worker + KV gratuiti (nessuna sospensione per inattività), una chiave per coppia = sha256(frase). Il P2P resta per il tempo reale.
- 03/11 Al riavvio si parte sempre dalla Home ("Continua"), mai dentro la partita.

Segnalazioni sul metodo: docs/segnalazioni-metodo.md (skill workflow-progetti)
