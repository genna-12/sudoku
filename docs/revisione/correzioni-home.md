# Correzioni della revisione UI 06/11 — area Home, Ingresso, Menù, Posta

Fonte dei difetti: `docs/revisione/ui-2026-11-06-home.md`. Verifiche con la build di preview (porta 4192),
Chromium di Playwright con mouse e tocco (`hasTouch`, `isMobile`), 360×640, 390×844, 430×932, 768×1024,
844×390, 1280×800. Script e screenshot fuori dal repo, nella cartella `fix-home/` dello scratchpad della sessione.

`npx tsc -b` pulito, `npx vitest --run --dir src` 487 verdi (base 473: +14 in `velo.test.tsx` e
`home-revisione.test.tsx`), `npx oxlint src` con gli stessi avvisi di prima.

## Esito per difetto

| ID | Gravità | Esito | Commit |
|---|---|---|---|
| H2 | alta | corretto | `H2: i veli di menù, Posta, avviso e conferma si chiudono sul click…` |
| H1 | alta | dell'agente shell; i fogli di quest'area stanno nello schermo senza il transform residuo (sotto) | — |
| H4 | media | corretto | `H4: pallino della presenza su due righe al massimo…` |
| H5 | media | corretto (resta il 2% dei testi più lunghi, sotto) | `H5: altezza riservata al fumetto della Home…` |
| H8 | bassa | corretto | `H8: firma dell'eco toccabile…` |
| H9 | bassa | corretto | `H9, H10, H11, H13: ritocchi bassi…` |
| H10 | bassa | corretto | idem |
| H11 | bassa | corretto | idem |
| H13 | bassa | corretto in parte (sotto) | idem |
| H14 | bassa | corretto | `H14: modalità e livello come radiogroup…` |

H3, H6, H7, H12 sono dell'agente shell: non toccati.

### H2 — tocco che passa sotto il velo
Helper `chiudiToccandoFuori` in `src/ui/velo.ts`: il velo chiude sul `click` (che così consuma lui) e solo se
anche la pressione è cominciata sul velo (trascinare fuori da un campo del foglio non chiude). Usato in
`Menu.tsx` (velo del menù e foglio di conferma), `Posta.tsx`, `Ingresso.tsx` e **`App.tsx` (area shell): solo
la riga del velo di `ConfermaNuova`** più l'import.
Verifica (`t18.mjs`, `h2b.mjs`, tocco e mouse): Posta + tocco sopra "Giardino", menù + tocco sopra "Continua" e
sopra "cambia profilo", "Nuova partita?" + tocco sopra "Giardino", avviso dell'Ingresso + tocco sopra la card:
in tutti i casi si chiude il foglio e basta (prima: Giardino, partita, Ingresso).
Fuori area, stesso difetto, non toccati: `Giardino.tsx:383` (foglio del giardino) e `Partita.tsx:364`
("Manda una frase"); possono usare lo stesso helper.

### H1 — altezza dei fogli di quest'area
Simulata la correzione della shell con movimento ridotto (niente transform sulla schermata): a 844×390 menù
(scorre, `max-height` 294), "Ricominciare da zero?" passi 1 e 2, Posta (lista che scorre) e avviso
dell'Ingresso stanno tutti dentro il viewport (fondo a y 374 su 390); idem a 360×640 e 1280×800. Nessuna
correzione mia necessaria. Da provare sul telefono: passo 2 con la tastiera aperta in orizzontale.

### H4 — pallino della presenza
- Testo breve in testata: "già collegato/a altrove" (stanza occupata) e "non mi collego, riprovo" (errore);
  la frase intera resta nel `title` e per il lettore di schermo (`src/ui/presenza.ts`, pura).
- `.pallino-testo` al massimo 2 righe (`line-clamp`), testata alta 46 px in ogni stato.
- Con il chip dell'altro dispositivo o la stanza occupata, sotto 400 px il bottone del giardino mostra solo
  pianta e numero (l'`aria-label` resta "Giardino: N fiori"): ritocco di design, da confermare con Genna.
Misure (`t14.mjs`, `t19.mjs`): stanza occupata a 360 e 390, testata sempre 46 px, titolo fermo a y 86 (prima
44→83 px e titolo +39 px); chip e testo non si sovrappongono più.

### H5 — salto del fumetto
`min-height` di `.home-eroe` dal 98° percentile dell'altezza misurata su tutti i testi che possono comparire
in Home (304: chiacchiere, chiacchiere di luogo ed extra, solletico, giorni speciali, eco con firma):
110 px, 130 sotto 420 px, 150 per la coppia sotto 380 px. Con l'eco che scade (6 fiori, 360 e 390) nessun
`layout-shift` registrato (prima 0.0167, 24 px). Restano più alti della riserva 2-8 testi su 304 secondo la
misura (fino a 169 px per la coppia a 360): lì un salto piccolo resta.

### H8 — eco
Firma come `<button>` ("… : rileggi il capitolo") che apre la rilettura di quel capitolo; toccare il fumetto
dell'eco lo chiude (torna il saluto), come chiede studio-ux §4. `Chiacchiera.capitolo` (nuovo campo opzionale,
interfaccia in `Home.tsx`). **`App.tsx` (area shell)**: `mostraChiacchiera` accetta e passa `capitolo`, l'eco
lo passa, e `<Home onRileggi={setRilettura}>`. Verificato col tocco e col mouse: si apre la rilettura del
capitolo della firma.

### H9, H10, H11
- H9: contenitore della Diagnostica con `menu-gruppo menu-diagnostica` (filetto sopra): stessa x, colore e
  corpo delle altre voci, temi chiaro e scuro.
- H10: "Chiudi" largo quanto il foglio; lista con `tabIndex={0}` e `aria-label`, nel giro del Tab del
  foglio: Tab dalla Posta → lista, le frecce la scorrono (scrollTop 0 → 394).
- H11: Invio con la frase e senza colore → "Scegli il tuo colore." sotto le card (`role="alert"`) e focus
  sulla prima card; sparisce scegliendo il colore. Il bottone resta disabilitato (l'Invio è gestito nel campo).

### H13 — bersaglio della cassetta
Bersaglio sceso di 4 px (`top: 162px`) e fumetto sopra di lui (`z-index`): toccare il bordo del fumetto non
apre più la Posta. **Non risolto del tutto**: il titolo resta sotto il bersaglio perché da 430 px in su il
disegno della cassetta cade dentro la riga di "di coppia" (il titolo sopra lo renderebbe intoccabile: provato,
il centro del disegno non apriva più la Posta). La sovrapposizione col titolo cala di 4 px. Da decidere:
spostare il disegno della cassetta nella scena (fuori area, `Scena.tsx`) se il tocco sul titolo dà fastidio.

### H14 — radio
`tabIndex` mobile (solo l'opzione scelta a 0) e frecce/Inizio/Fine che cambiano scelta e focus
(`src/ui/radio.ts`). Tab dalla Home: … Continua → Sudoku → facile → Nuova partita (prima 8 fermate).

## File toccati fuori area
- `src/ui/App.tsx`: riga del velo di `ConfermaNuova` (H2); `mostraChiacchiera` con `capitolo`, eco con
  `capitolo`, prop `onRileggi` alla Home (H8).
- File nuovi: `src/ui/velo.ts`, `src/ui/presenza.ts`, `src/ui/radio.ts`, test `velo.test.tsx`,
  `home-revisione.test.tsx`.

## Da provare sul telefono
1. H2 su Safari iOS e Chrome Android: aprire Posta e menù e chiudere toccando fuori sopra un bottone.
2. H4 con due dispositivi dello stesso profilo: testata ferma, "già collegato altrove" su due righe, chip
   accanto; dire se il giardino col solo numero (sotto 400 px, testata piena) va bene.
3. H8: entrare in Home dopo un capitolo, toccare la firma (si rilegge) o il fumetto (si chiude).
4. H5: la Home non salta quando l'eco scade e quando arrivano le chiacchiere.
5. "Ricomincia da zero", passo 2, in orizzontale con la tastiera aperta (dopo la correzione H1 della shell).
