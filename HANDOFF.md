# Handoff (11/11/2026, notte)

## Stato
T5, T6, T7 e la revisione UI del 06/11 sono deployati su https://genna-12.github.io/sudoku/ (branch `main`, ultimo commit di codice 9eef5dc). 518 test unitari, 5 E2E verdi.

Primo collaudo reale fatto da Genna e Matilde: entrambi iPhone con la PWA installata, entrambi al capitolo 8. Gli esiti sono in `docs/specs/T9-collaudo.md`.

## Prossimo passo
T9, spec `docs/specs/T9-collaudo.md`. È già approvata da Genna nei contenuti (sono le sue richieste); resta il checkpoint su B.
1. **A, connessione** (priorità massima). Prima un agente di ricerca legge `src/net/` e `useRete.ts` e scrive le cause in `docs/storico/ricerca/` (iOS in background, ID fantasma del posto nella stanza, riconnessione assente). Poi l'implementazione con gli E2E di background e riconnessione.
2. **C, storia viva dal capitolo 9**, in parallelo ad A: inventario delle comparse, poi i disegni, poi `@comparse:` in `capitoli.md`. I capitoli 0-8 restano identici, verificato da un test.
3. **B, colori della griglia**: studio con 2-3 proposte e screenshot, poi Genna sceglie, poi si implementa.

## In sospeso
- Le 7 scelte da confermare di `docs/REPORT-06-11-mattina.md`: Genna non ha ancora risposto.
- T7.12 `leggendo` nella presenza P2P: rimandato.
- Cielo di giorno con il sistema scuro: resta scuro.

## Da Genna
1. Scegliere la proposta di colori (B) quando arriva.
2. Dopo il deploy di A: prova reale con Matilde, cioè app in background 1-5 minuti e poi rientro, e cambio da Wi-Fi a dati.
3. Rispondere alle 7 scelte del report del 06/11 mattina.
4. Sul PC (al 11/11 non era collegato alla sessione):
   - `git pull` in C:\dev\sudoku;
   - committare `worker/package-lock.json`;
   - cancellare su GitHub i branch d'appoggio `t7-resto` e `correzioni-ui`.

## Attenzione
- **Matilde non deve accorgersi delle novità della storia**: tutto ciò che cambia vale dal capitolo 9 in poi, rilettura dei capitoli 0-8 compresa.
- **Messaggi P2P compatibili**: un client vecchio deve ignorare i messaggi nuovi senza errori, perché le PWA non si aggiornano nello stesso istante.
- **iPhone PWA**: il background sospende WebSocket e WebRTC. Va provato con gli E2E (pagina nascosta, rete offline, server PeerJS riavviato), non solo a mano.
- **Repo PUBBLICO**: niente parole personali nei file (ADR 005).
- **Regole UI della revisione del 06/11**, scritte in CLAUDE.md, nella sezione Decisioni: scala z-index unica, `chiudiToccandoFuori`, fill `backwards`.
- **Agenti in parallelo**: dosare. Il 06/11, 9 agenti Opus hanno esaurito il limite delle 5 ore. Usare Sonnet per inventari e studi.
- **Agenti in worktree**: `.claude/` va in `.git/info/exclude` del clone; vitest esclude già `.claude/**`.

## Chat
- Questa: LEAD · Sudoku · T8 collaudo · 06/11, chiusa. Ha fatto T7 e la revisione UI e ha registrato gli esiti del collaudo.
- Da aprire: LEAD · Sudoku · T9 connessione e storia · 11/11, con "riprendi".
- Altre attive: nessuna.
