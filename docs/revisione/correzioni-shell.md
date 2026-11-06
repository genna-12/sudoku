# Correzioni 06/11 notte — shell dell'app e regole trasversali

Implementatore: Opus, area shell (App.tsx, tema.css globale, index.html, indietro/dialogo, Toasts, Aggiornamento).
Fonti: `docs/revisione/ui-2026-11-06-{trasversale,home,storia}.md`. Verifiche con build servita su 127.0.0.1:4191 e
PeerJS locale; script e screenshot in `/tmp/claude-0/-home-claude/db626878-f30e-5cfe-8af8-6ed804e2390a/scratchpad/fix-shell/`
(`t1.mjs`, `t1b.mjs`, `h7.mjs`, `t6.mjs`, `p9.mjs`, `p20.mjs`, `storia.mjs`, `varie.mjs`, `altezze.mjs`, `s19.mjs`).

Riepilogo: **21 corretti** (contando T1/H1/S1, H3/T4, H6/T5 una volta sola; 25 ID), **1 da decidere** (T18), più alcune scelte da confermare (sotto la tabella).
Test: 480 (base 473; +1 Toasts, +3 barra, +3 shell). `tsc -b` pulito, `oxlint` 20 avvisi come la base (nessuno nuovo).

## Esiti

| ID | Esito | Commit | Cosa |
|---|---|---|---|
| T1 = H1 = S1 (alta) | corretto | `1ebbdd2` | `.schermata` entra con riempimento `backwards`: a riposo niente `transform`, i fogli `fixed` tornano nel viewport. Misurato: "Ricomincia" 360×640 da 505..779 a 349..624; 844×390 da 567..796 (invisibile) a 144..374 con velo a tutta larghezza; fiore a scroll 500 da 1125..1470 a 279..624; fiore in orizzontale 49..374; avviso dell'Ingresso 844×390 167..374; foglio frasi in Partita invariato (già giusto). |
| H7 (media) | corretto | `0798cda` | Scala unica scritta come commento in `tema.css` (sezione "livelli"): aggiornamento 30 < vittoria 40 < toast 50 < menù 54/55 < fogli 60 < lettore 70. Tolta `isolation: isolate` dalla `.home` (chiudeva menù e fogli in un contesto suo; la scena resta dietro: screenshot identico). Ora toast, frase grande e banner di aggiornamento stanno sotto menù e fogli. |
| H3 = T4 (media) | corretto | `0798cda` | Banner "versione nuova" centrato con `left/right + margin auto` (336×58 a 360 invece di 191×121 su 4 righe), bottone **Dopo** che lo chiude per la sessione, bottoni alti 44 px. |
| H6 = T5 (media) | corretto | `0798cda` | Toast banner a capo (niente puntini: 2 righe a 360, `scrollWidth` = `clientWidth`), centrati senza il limite di metà finestra; il banner lungo resta di più (+60 ms per carattere oltre i 40, test). |
| T3 (media) | corretto | `403b5ca` | La carta lasciata ("Nuova partita", "guarda la griglia", "Vai") resta nello stesso posto dell'albero (stesso componente, niente seconda entrata) e svanisce in 200 ms; la griglia nuova sotto compare senza entrata. Registrazione: Partita sempre a opacità 1, carta 1 → 0 in ~190 ms (prima: 250 ms a vuoto). |
| T6 (media) | corretto | `6c11a8f` | Script inline nel `<head>` di `index.html`: legge `sudoku-coppia-tema` e mette `data-tema` prima del CSS e del bundle. Misurato a `DOMContentLoaded` (root ancora vuoto): tema e fondo giusti in tutti e 4 i casi (forzato/sistema). |
| T7 (media) | corretto (iPhone da provare) | `6c11a8f` | `theme-color` segue il tema visto (forzato o sistema) e diventa scuro col capitolo aperto (`src/ui/barra.ts`, test); col tema chiaro all'avvio la barra iOS è `default` (ora e batteria scure). Il meta iOS si legge all'avvio: cambiando tema dal menù vale al prossimo avvio. |
| T10 (media) | corretto | `403b5ca` | `.app-sotto` inert durante l'uscita (tastiera: vince la prima scelta, verificato); indietro durante un'uscita la annulla: la Home resta a opacità 1, niente dissolvenza e rientro. |
| T11 (bassa) | corretto | `403b5ca` | Dopo il cambio di schermata il focus va al titolo (`h1/h2`, `tabindex=-1`, senza anello) o alla schermata se non ha titolo (Partita: il primo Tab va a "Torna alla home"). Non ruba il focus a un `autoFocus`. |
| T12 (bassa) | corretto | `403b5ca` | Con reduced-motion la carta di vittoria entra solo in dissolvenza e il pallino del chip del partner è fermo. **Nota**: è lo stesso difetto di P13 (area Partita): se anche loro l'hanno corretto, una delle due regole si può togliere. |
| T13 (bassa) | corretto | `403b5ca` | `overflow-y: clip` su `.app`: durante l'entrata `scrollHeight` resta 844 (prima 852). Altezze a riposo di Home, Giardino, Partita, Ingresso identiche a 360, 844×390, 1280; menù lunghi non tagliati (hanno max-height propria). |
| T14 (bassa) | corretto | `403b5ca` | Scroll in cima a ogni cambio di schermata (`useLayoutEffect`): Home in fondo (y 427) → Ingresso a y 0. |
| T15 (bassa) | corretto | `403b5ca` | `vai()` chiude anche la conferma "Nuova partita?". Dimostrato dal codice (serve il partner). |
| T16 (bassa) | corretto | `403b5ca` | A pagina nascosta il giro delle chiacchiere non fa niente: nessuna chiacchiera locale né messaggio al partner. |
| T17 (bassa) | corretto (parte shell) | `403b5ca` | `.link` alto 44 px ("cambia profilo o frase", "guarda la griglia"). Gli icona-bottone 40×40 della Partita in orizzontale sono dell'area Partita. |
| T18 (bassa) | **da decidere** | — | Zoom bloccato (`user-scalable=no`) lasciato com'è: scelta per il gioco. Da decidere con Genna. |
| T19 (bassa) | corretto | `403b5ca` | Sotto il lettore le animazioni della schermata sono in pausa (Home: 9 infinite, 0 in corso col lettore aperto, ripartono alla chiusura); sotto la carta di vittoria dopo 1,2 s (la festa sulla griglia finisce prima). Niente smontaggi. |
| H12 (bassa) | corretto | `403b5ca` | Foglio "Hai N capitoli da leggere": Esc e indietro = "Dopo" (verificato: si chiude e arriva la carta). |
| S3 (alta, decisione lead) | corretto | `f97ac6b`, `403b5ca` | Lettore aperto dalla Home: Esc e indietro lo chiudono in qualsiasi momento (il capitolo a schermo resta arretrato); a fine capitolo, se dopo ce ne sono altri, **Dopo** accanto a "Continua" chiude segnando visto il capitolo appena finito. Il "Dopo" della vittoria esisteva solo nel foglio arretrati (App), non nel capitolo: aggiunta in `CapitoloScena.tsx` una prop facoltativa `onDopo` (modifica minima nell'area Storia, stili in `tema.css`). Il blocco del gesto indietro resta solo per i capitoli dopo una vittoria. |
| S16 (bassa) | corretto | `403b5ca` | Chiusa la rilettura il focus torna alla riga `diario-N`; chiuso il lettore della Home torna su "N capitoli da leggere" (o sul titolo). |
| S17 (bassa) | corretto | `f97ac6b` | Le ripetizioni di Invio/Spazio (`e.repeat`) sono ignorate: 3 s di Invio tenuto avanzano di una battuta sola (test e browser). |
| S19 (bassa) | corretto | `403b5ca` | Partita nuova del partner durante la rilettura: si resta nel Giardino; alla chiusura un banner "X ha iniziato una nuova partita" (verificato con due browser collegati). Solo logica locale, nessun messaggio nuovo. |

## Scelte da confermare con Genna (non bloccanti)
- **S3**: Esc/indietro non segnano visto il capitolo a schermo nemmeno se è finito (resta arretrato); solo "Dopo" lo segna. "Dopo" c'è solo per il lettore della Home, non dopo "Adesso" del foglio della vittoria (lì resta la regola "nessun salta tutto").
- **H7**: la frase grande del partner che arriva con un foglio aperto ora resta sotto il velo del foglio (prima, coi fogli del menù, ci passava sopra). Resta comunque nella Posta. Metterla in coda finché il foglio è aperto sarebbe una modifica a `useToasts`: non fatta.
- **H3**: in Partita il banner di aggiornamento copre ancora la testata finché non si tocca "Dopo" o "Aggiorna".
- **T3**: se è il partner ad aprire una partita nuova mentre la carta è aperta, la carta sparisce ancora di colpo (lo scambio arriva dalla rete, fuori dai bottoni della carta).

## Fuori dalla mia area (modifiche minime)
- `src/ui/CapitoloScena.tsx` (Storia): prop `onDopo` e guardia su `e.repeat`.
- `tema.css` fuori dalle parti globali: z-index di `.menu-velo`/`.menu` (54/55), tolta l'`isolation` di `.home`, `.link` a 44 px, stili `.capitolo-azioni`/`.capitolo-dopo`, regole reduced-motion di T12 (stesse di P13).
- Visto e non toccato (area Partita): in orizzontale 844×390 il foglio delle frasi è alto 424 px su 390 (16..440), il fondo esce dallo schermo.

## Da provare sul telefono
1. Home a 360 con partita in corso: menù → "Ricomincia da zero": il foglio intero in basso; Giardino scorso → tocco su un fiore: il dettaglio si vede. In orizzontale lo stesso.
2. Tema "mattina" col telefono scuro (e "notte" col telefono chiaro): all'apertura nessun lampo del colore sbagliato; colore della barra di stato su Android; su iPhone in PWA ora e batteria leggibili col tema chiaro (si legge all'avvio: chiudere e riaprire dopo aver cambiato tema).
3. Vincere e toccare "Nuova partita": la carta svanisce sopra la griglia nuova, nessuno schermo vuoto. Anche "guarda la griglia".
4. Home → "N capitoli da leggere": gesto indietro (Android) chiude il lettore; a fine capitolo "Dopo" chiude e il conteggio scende di uno.
5. Gesto indietro subito dopo "Continua": la Home non lampeggia.
6. Banner "versione nuova" (al prossimo aggiornamento): una riga e mezza, "Dopo" lo chiude.
7. Toast lunghi a 360 (es. "La partita resta nel giardino, come germoglio"): su due righe, leggibili.
