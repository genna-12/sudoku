# Traguardo T7 — Dinamicità e usabilità (spec, 04/11/2026)

Dopo T5 e T6. Base: `docs/progettazione/analisi/mascotte-e-ui.md` §4 (audit) e `docs/design/studio-ux.md` §5 (soluzioni decise, con costi). Questa spec fissa l'ordine e il criterio di "fatto"; i dettagli stanno nello studio.

## Ordine (per impatto/costo; ogni punto è un commit con test o screenshot)
1. **Testi in partita che si leggono**: durata delle battute in base alla lunghezza (min 3,2 s, +60 ms per carattere oltre 40, max 7 s); tocco sul fumetto = resta aperto / chiude; niente `line-clamp` a 2 righe sul telefono (3 righe, poi scorre). Toast grande chiudibile al tocco; coda non scarta: accorcia.
2. **Transizioni tra schermate**: uscita 150 ms + entrata 250 ms (dissolvenza + 8 px), `animationend` prima di smontare; "Nuova partita" senza salto a vuoto (la griglia nuova entra sotto la dissolvenza). Reduced-motion: solo dissolvenza.
3. **Gesti scoperti**: suggerimento una tantum (chiave locale) la prima volta che serve: "tieni premuto per le note" al primo tocco sul tastierino dopo 10 mosse, "tocca Semino" al primo ingresso in Home dopo il fiore 1, "doppio tocco = faro" alla prima cella con numero già presente. Un solo suggerimento per sessione.
4. **La cassetta della posta vera**: toccabile in Home e Giardino; foglio con le ultime 20 frasi mandate/ricevute (data, chi); le frasi si salvano in archivio (`posta: Array<{ts, da, testo}>`, max 50, nel sync).
5. **Giardino vivo**: tocco su un fiore finito = dettaglio (livello, modalità, tempo, punti di ciascuno, chi ha messo l'ultima cella); il bottone giardino in Home con etichetta "Giardino · 23".
6. **Accessibilità della griglia e degli overlay**: roving tabindex sulle celle, `onKeyDown` già c'è per la tastiera fisica, `role=grid/gridcell` con `aria-selected`; Esc chiude menù e fogli; focus sul dialogo quando si apre; menù con `menuitem`.
7. **Menù unico**: lo stesso pannello in Home e in Partita (voci contestuali), tema e "cancella partita" anche in partita.
8. **Testo minimo 12 px** (etichette secondarie e `.tasto-resto`).
9. **La scena conosce l'ora**: prop `momento` ('alba'|'giorno'|'crepuscolo'|'notte') calcolata dall'ora locale (fasce in `config/sonno.ts`), che sovrascrive le `--sc-*`; il tema utente resta prioritario se è forzato.
10. **Accessori visibili dove i personaggi sono grandi**: Ingresso, Vittoria, capitoli (già T5), Giardino.
11. **Gesto indietro di Android**: oggi chiude la PWA. `pushState`/`popstate` per schermate e overlay (studio-ux §5 punto 4): indietro chiude il foglio o torna alla Home, mai fuori dall'app.
12. (opzionale, tocca il contratto di rete `src/net/types.ts`, decisione della lead) campo `leggendo` nella presenza P2P per mostrare "Mati sta leggendo…" in Home.

## Fuori perimetro
Suoni; splash iOS; riscrittura del cruscotto; qualunque libreria.

## Fatto quando
- Ogni punto ha un test unitario dove c'è logica (durate, coda dei toast, suggerimenti una tantum, posta nel sync) e uno screenshot o un E2E dove è visivo.
- Prova su telefono (Genna e Mati): una partita intera con le battute leggibili senza coprire i punti; cambio Home→Partita→Giardino senza scatti; la cassetta mostra le frasi di ieri; nessun testo sotto i 12 px (controllo con gli strumenti del browser).
- `prefers-reduced-motion` provato: nessuna animazione oltre la dissolvenza.
