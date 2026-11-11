# T9 C — Comparse e ambienti per capitolo (decisioni della lead, 11/11/2026)

Parte da `docs/specs/T9-collaudo.md` §C e da `docs/storia/inventario-comparse.md`. Genna ha approvato l'11/11: le comparse sono poche, la vita la danno oggetti, ora e meteo per capitolo. Coerenza richiesta da Genna: non solo col testo del capitolo, ma col filo della storia e tra capitoli vicini (un oggetto che resta, il giorno che avanza, il meteo che non salta senza motivo).

## Formato in capitoli.md (righe meta nuove, dopo `@elemento:`)
```
@ambiente: momento=<alba|mattina|giorno|tramonto|sera|notte> meteo=<sereno|nuvole|vento|pioggia|temporale|nebbia|neve>
@comparse: id, id      (al massimo 3; vuoto ammesso)
@oggetti: id, id       (al massimo 3; vuoto ammesso)
```
- Solo dal capitolo 9 al 100. I capitoli 0-8 NON hanno queste righe: `controlla.py` lo verifica (errore se presenti prima del 9).
- `momento` e `meteo` sono obbligatori dal 9 al 100. Dove il testo li dice, si seguono; dove tace, si scelgono coerenti con battute, eco, capitolo prima e dopo.
- Vocabolario chiuso: gli id validi di comparse (max 10) e oggetti (max 30) sono elencati in `docs/storia/ambienti.md` e in `src/config/ambienti.ts`; `controlla.py` rifiuta id sconosciuti.
- Le comparse non parlano, non hanno nome sullo schermo, non sono secondari. Possono essere creature citate nel testo (lucciole, granchi, rane, piccione, tram) o creature di sfondo tipiche del luogo, se non contraddicono il testo.
- Gli oggetti sono cose citate nel capitolo o rimaste in scena da un capitolo vicino (continuità), disegnati piccoli nel palco o nel fondale, mai sopra le mascotte o il fumetto.
- I testi delle battute e delle eco non si toccano.

## Resa
- `Fondale` riceve `momento` e `meteo`: tinta del cielo (alba rosata, giorno chiaro, tramonto caldo, sera blu, notte con stelle), strati meteo leggeri (pioggia a righe, nebbia velata, vento con foglie, neve, temporale con lampo raro). Senza `ambiente` il Fondale resta identico a oggi.
- Comparse e oggetti: SVG nello stile di `Secondari.tsx` e `Fondale.tsx` (palette petrolio, tratti morbidi), animazioni piccole e lente, spente con `prefers-reduced-motion`.
- Livello z: dentro la scala unica di `tema.css`, sotto mascotte e fumetto.

## Segreto per Matilde
- Test di regressione: snapshot del render di `CapitoloScena` per i capitoli 0-8 preso PRIMA di ogni modifica (commit dedicato), che deve restare identico dopo. Anche il diario del giardino per i capitoli 0-8.

## Fatto quando
`controlla.py` verde e JSON rigenerato; snapshot 0-8 invariato; tutti i test e gli E2E verdi; screenshot 390×844 di almeno 8 capitoli (uno per luogo, più un temporale e una notte) controllati da un validatore a contesto separato.
