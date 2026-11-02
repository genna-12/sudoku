# Traguardo 1 — MVP giocabile e deployato (03/11/2026)

Obiettivo: PWA su GitHub Pages con cui Genna e la sua ragazza giocano **insieme, in tempo reale, sulla stessa griglia**: Sudoku e Killer Sudoku, sei livelli, nessun backend.

## Vincoli (non negoziabili)
- Nessun backend, nessun database, nessun account di terzi. Sincronizzazione P2P (WebRTC via PeerJS, server pubblico di PeerJS solo per la stretta di mano; STUN Google + TURN gratuito Open Relay per attraversare i NAT).
- Solo loro due: una **frase segreta** apre la "stanza"; da essa derivano gli ID PeerJS. Chi non la conosce non trova la stanza.
- Semplice: Vite + React + TypeScript, CSS puro, zero librerie oltre peerjs e vite-plugin-pwa. Niente store esterni, niente router.
- Interfaccia dinamica, fluida, responsive: mobile-first (si gioca da telefono), anche desktop.
- Livelli, in quest'ordine, per entrambe le modalità: `semini`, `facile`, `medio`, `difficile`, `extreme`, `supersemini` (semini = più facile, supersemini = più difficile).
- Frasi della coppia (es. "sei mini") che compaiono negli eventi di gioco: lista in `src/config/frasi.ts`, modificabile da Genna.
- Persistenza locale (localStorage) della partita in corso e della frase/nome: alla riapertura si continua.

## Architettura (tre moduli indipendenti + UI)
```
src/engine/   generatore e risolutore puzzle (puro TS, testato con vitest)
src/net/      stanza P2P (PeerJS), messaggi, riconnessione
src/config/   frasi.ts (frasi e nomi), livelli.ts (parametri difficoltà)
src/ui/       React: schermate Ingresso, Home, Partita
src/stato/    riduttore dello stato condiviso della partita (puro TS)
```
I contratti sono in `src/engine/types.ts`, `src/net/types.ts`, `src/stato/types.ts`: **gli agenti implementano contro quei file senza cambiarli** (se serve cambiarli, fermarsi e riportare).

## Motore (src/engine)
- `generaPuzzle(modalita, livello, seed)`: deterministico dato il seed (così i due client possono anche rigenerare lo stesso puzzle). Soluzione unica garantita (contatore di soluzioni con limite 2).
- Sudoku: difficoltà = numero di celle date, da `config/livelli.ts` (semini 50, facile 42, medio 36, difficile 31, extreme 27, supersemini 24). Rimozione simmetrica delle celle, mantenendo unicità.
- Killer: gabbie generate partizionando la griglia risolta in gruppi contigui di 1–5 celle (dimensione media cresce col livello), somma per gabbia, nessuna cifra ripetuta dentro una gabbia (automatico perché partizione della soluzione). Celle date: semini 24, facile 12, medio 6, difficile 0 (gabbie piccole, max 3), extreme 0 (max 4), supersemini 0 (max 5). Unicità: verificata con risolutore killer (vincolo somma + distinte); se non unica, aggiungere celle date finché unica.
- Prestazioni: generazione < 1,5 s su telefono medio per tutti i livelli (test con timer in vitest, soglia 3 s in Node per margine).
- Funzioni esportate: `generaPuzzle`, `contaSoluzioni`, `verificaCompleta(stato)`, `celleInConflitto(stato)`.

## Rete (src/net)
- `apriStanza(frase, nome)`: ID = `sudoku-coppia-<sha256(frase) primi 20 hex>-a` e `-b`. Il client prova a registrarsi come `a`; se l'ID è occupato diventa `b` e si connette ad `a`. Se `a` cade, `b` resta e prova a ridiventare `a` ogni 3 s.
- Config ICE: STUN `stun:stun.l.google.com:19302` + TURN Open Relay (`turn:openrelay.metered.ca:80`, user `openrelayproject`, cred `openrelayproject`), in `src/config/ice.ts`.
- Eventi: `stato` (connessione | in-attesa | connesso | errore), `messaggio`, `partner` (nome). Metodi: `invia(msg)`, `chiudi()`.
- Messaggi (vedi `net/types.ts`): `ciao` (nome + stato partita + ts), `stato` (stato partita completo), `cella` (idx, valore, note, autore, ts), `cursore` (idx|null), `nuova` (stato partita nuovo), `frase` (testo da far comparire all'altro).
- Riconciliazione: a `ciao` entrambi inviano lo stato; vince la partita con `iniziata` più recente; a parità, per cella vince `ts` maggiore. La logica di merge sta in `src/stato/` (puro, testato), non in rete.
- Heartbeat ogni 5 s; se mancano 3 battiti → stato `in-attesa` e tentativo di riconnessione.

## Stato condiviso (src/stato)
- `StatoPartita`: puzzle, mappa celle `{v, note, da, ts}`, `iniziata`, `finita?`, `errori` contatore.
- Riduttore puro `applica(stato, azione)`; `unisci(a, b)` per il merge; serializzabile in JSON (localStorage e rete).

## UI (src/ui)
Schermate (nessun router: uno `useState` di schermata):
1. **Ingresso**: nome tuo + frase segreta. Memorizzati; la volta dopo si salta.
2. **Home**: stato connessione col partner (pallino + nome), partita in corso ("continua"), scelta modalità (Sudoku / Killer) e livello (sei chip in ordine). "Nuova partita" la invia anche al partner.
3. **Partita**: griglia 9×9 (Killer: gabbie con contorno tratteggiato e somma in alto a sinistra), tastierino 1–9, modalità note (matita), cancella, evidenziazione riga/colonna/box e stesso numero, celle date distinte, errori evidenziati (verifica contro la soluzione, opzione per spegnerla), timer, cursore del partner nel suo colore (ognuno dei due ha un colore), piccolo badge "sta scrivendo". Vittoria: schermata con festa e frase.
- Frasi: compaiono come toast/fluttuanti quando: cella giusta (ogni tanto, non sempre), riga/colonna/box completati, vittoria, partner che entra, errore (frase consolatoria). Pulsante "manda una frase" invia una frase a caso all'altro.
- Stile: caldo e giocoso, non infantile. Palette definita in `src/ui/tema.css` con variabili; dark mode automatica. Transizioni su ogni cambio di stato (selezione, numero inserito, pop del toast). Font via Google Fonts (uno solo).
- Responsive: griglia che riempie la larghezza su telefono, centrata max 520 px su desktop; tastierino sempre raggiungibile col pollice.
- PWA: manifest (nome "Sudoku di coppia", icona generata in `public/`), service worker con precache (vite-plugin-pwa, `registerType: 'autoUpdate'`).

## Deploy
- GitHub Pages dal repo `genna-12/sudoku`, workflow `.github/workflows/deploy.yml` (build + deploy su push a `main`). `base: '/sudoku/'` in vite.config.
- Verifica finale: due browser (o due profili) sul sito deployato, stessa frase, mosse che si vedono da entrambi i lati.

## Criterio di "fatto"
- `npm run build` e `npm test` passano; nessun errore in console.
- Due client sul sito deployato vedono le mosse reciproche entro 1 s; chiudendo e riaprendo un client la partita riprende.
- Tutte le 12 combinazioni modalità × livello generano un puzzle a soluzione unica.
- Test su telefono reale (iPhone/Android, Safari/Chrome) fatto da Genna: installazione PWA e una partita con la ragazza.
