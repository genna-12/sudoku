# Handoff (06/11/2026, mattina)

## Stato
T5, T6, T7 e la revisione UI approfondita del 06/11 sono deployati su https://genna-12.github.io/sudoku/ (branch `main`): 69 difetti trovati da 4 revisori, corretti da 4 implementatori, validati a contesto separato. 518 test unitari, 5 E2E verdi. Report: `docs/REPORT-06-11-mattina.md` (prima: `docs/REPORT-06-11-notte.md`). Esiti per difetto: `docs/revisione/` (`ui-2026-11-06-*.md` = difetti, `correzioni-*.md` = esiti).

## Prossimo passo
T8 collaudo reale (Genna e Mati dal telefono), poi le correzioni che ne escono: hanno la precedenza su tutto. Poi le 7 scelte da confermare del report della mattina. Senza esiti: Riserva (ROADMAP).

## In sospeso
- Le 7 scelte da confermare di `docs/REPORT-06-11-mattina.md` (S3 Esc senza segnare letto, bottone Giardino compatto, H7 frase sotto il foglio, H3 banner in Partita, T18 zoom bloccato, note a 11 px a 360, cassetta vicino al titolo).
- T7.12 `leggendo` nella presenza P2P: rimandato (tocca `src/net/types.ts`).
- Estetico: in orizzontale dopo "guarda la griglia" il tasto "Nuova partita" è una mattonella alta.
- Cielo di giorno con sistema scuro: resta scuro (chiedere a Genna).

## Da Genna
1. Telefono (T8 + revisione): aggiornare la PWA su entrambi; arretrati e "Dopo"; Mati vede il capitolo 5; posta; vestiti; una partita in due (timer, Annulla dopo una mossa dell'altro, chiusure toccando fuori); orizzontale (vittoria, foglio frasi).
2. iPhone: barra di stato col tema chiaro; tocco sulle celle senza tastiera. Android: indietro dalla PWA installata, anche dopo un ricaricamento.
3. Capitoli che suonano falsi: numeri → `capitoli.md` + rigenera JSON.
4. Ok alla BUSSOLA e ai 5 ADR; risposta alle 7 scelte.
5. Sul PC: `git pull` in C:\dev\sudoku; committare `worker/package-lock.json` (non tracciato); eliminare su GitHub i branch d'appoggio `t7-resto` e `correzioni-ui` (dal cloud il proxy non permette di cancellarli).

## Attenzione
- Il repo è PUBBLICO: niente parole personali nei file (ADR 005).
- Scala z-index unica commentata in `tema.css` (aggiornamento 30, vittoria 40, toast 50, menù 54/55, fogli 60, lettore 70): non aprire livelli per schermata.
- `.schermata` entra con fill `backwards`: un `both` lascerebbe una trasformazione e i `position: fixed` dentro si misurerebbero sulla schermata (causa di T1).
- Veli dei fogli: chiudere con `chiudiToccandoFuori` (`src/ui/velo.ts`), mai su `pointerdown` (il tocco passa al bottone sotto).
- Annulla: solo la propria ultima mossa ancora valida; nessun messaggio di rete nuovo.
- Fondale: container query con riserva in vh/vw; `:has` per nascondere il merlo doppio (Safari 16+).
- Visti per ruolo e per era; `payloadDa` conserva i campi sconosciuti; il client non scrive se `versioneDati` remota è più alta.
- Gli E2E sul dev server chiamano il Worker vero (nel cloud bloccato): `VITE_SYNC_URL` vuota in Riserva.
- Agenti in worktree: `.claude/` in `.git/info/exclude` del clone; vitest esclude `.claude/**`.
- Semina mai prima del capitolo 5 visto (anche secondari con `entra`, vestiti salvati).
- 9 agenti Opus in una notte hanno esaurito il limite delle 5 ore: dosare (revisori Sonnet dove basta).

## Chat
- Questa: LEAD · Sudoku · T8 collaudo · 06/11 (chiusa dopo T7 e revisione UI).
- Da aprire: LEAD · Sudoku · T8 correzioni · gg/mm, con "riprendi", quando ci sono gli esiti del collaudo.
- Altre attive: nessuna.
