# Correzioni UI 06/11 — Storia a capitoli, Giardino, scena e mascotte

Implementatore dell'area storia (difetti in `ui-2026-11-06-storia.md`, T8 in `ui-2026-11-06-trasversale.md`).
Verifiche su build servita (porta 4194, PeerJS locale), script e screenshot in
`/tmp/claude-0/-home-claude/db626878-f30e-5cfe-8af8-6ed804e2390a/scratchpad/fix-storia/` (`prima/` = prima delle
correzioni, `s2/` `v1/`…`v3/` = dopo, `giro/` = giro delle sovrapposizioni a ogni battuta).

## Riepilogo
Corretti 16 su 16 assegnati (S2, S4-S15, S18, T8); S1 e S3 sono dell'area shell. Test: 480 (base 473), tsc e oxlint
come la base. Giro delle sovrapposizioni a ogni battuta (21 capitoli × 360×640, 390×844, 844×390, 1280×800): da 140
segnalazioni a 0, tolte quelle volute del 99 (Briciola in groppa a Nuvola).

## Esito per difetto

| ID | Esito | Commit | Cosa è cambiato |
|---|---|---|---|
| S1 | non mio | — | lo corregge l'area shell (tema.css:267) |
| S2 | corretto | `S2` | Il fondale scala sull'altezza (mai più stretto di 360 px) e il suo suolo cade su `--cap-suolo`, lo stesso del palco. Sugli schermi più larghi i bordi del disegno sfumano in un riempimento di cielo, fascia del luogo (mare) e suolo, con qualche stella. Telefoni verticali invariati. Cucina a 1280: finestre e tazze in scala; 15 a 1280: mare e cielo; 79 in orizzontale: finestrino visibile; giardino a 768/1280: un solo orizzonte. |
| S3 | non mio | — | area shell. Il piede del lettore non è stato riorganizzato (vedi S14 per il posto di "Continua") |
| S4 | corretto | lettore | Fischio e il Gufo stanno su un ramo sopra le teste dei due; quando sono in scena (`capitolo--ramo`) i fumetti dei due salgono sopra il ramo e chi ci sta posato. |
| S5 | corretto | lettore | `@media (max-height: 500px)`: suolo al 78%, taglia 80, testa, nota, lettera, fumetti e "Continua" più compatti; nota e lettera subito sotto la testa. Il fondale segue lo stesso suolo. |
| S6 | corretto | lettore | `entra` è letto: chi entra senza parlare è in scena dalla prima battuta, fermo e senza fumetto (Briciola nel 68, Nuvola nel 30); chi entra e poi parla (Fischio nel 10, il Gufo nel 44…) c'è già dalla nota che lo presenta e non rifà l'entrata. Il Mulo resta una lettera. Test. |
| S7 | corretto | lettore | Nel 99 ci sono tutti dalla prima battuta ("Ci sono tutti"): a terra Nonna Capra, Nuvola (con Briciola che dorme in groppa), Grillo, Pinza; Fischio e il Gufo sullo stesso ramo. Sotto i 430 px i due e la fila scalano a 0,834, i due stanno al 17% (sotto i 380 px al 15%, fila a 0,75). Tutti i fumetti del 99 stanno sopra il ramo; la coda punta all'x di chi parla (`--cap-coda-dx`). Giro delle sovrapposizioni a 360, 390, 844×390, 1280: nel 99 resta solo Briciola su Nuvola (voluto). Test. |
| S8 | corretto | lettore | Quando Fischio è in scena il merlo della Scena non sta sull'albero (CSS `:has`, solo nel lettore); allo stesso modo il cavallino al pascolo sparisce quando c'è Nuvola (nel 99 erano due cavalli). |
| S9 | corretto | `S9` | Nella Scena "intera" (lettore) lo stagno va più a sinistra e un po' più indietro: Semino ci sta davanti. Home e Giardino invariati. |
| S10 | corretto | `S10` | Gli atti del diario sono `<details>` con "capitoli 15-27"; oltre 15 capitoli letti è aperto solo l'ultimo. A 100 capitoli: diario da 5295 a 1019 px, primo fiore da y 5820 a 1544 (390×844). Con pochi capitoli tutto aperto (l'E2E del diario resta valido). Test. |
| S11 | corretto | lettore | Fra due capitoli della coda fondale, palco e punti si rimontano (`key` sul capitolo) ed entrano in dissolvenza di 360 ms (`capitolo--cambio`); col movimento ridotto 120 ms di sola opacità. Misura: opacità 0 → 0,8 a 120 ms → 1 a 420 ms. Test. |
| S12 | corretto | `S12` | Mascotte del giardino a -28/+22: punti del bersaglio della cassetta che finivano su Semino da 7/25 a 3/25 (solo il piede della tavola). |
| S13 | corretto | lettore | Il posto "in alto" ha sempre un appoggio disegnato: ramo che entra da destra e sfuma (fuori), mensola con staffa (cucina, laboratorio, treno), filo (città, piazza, stazione). |
| S14 | corretto | lettore | I punti restano fermi in fondo: "Continua" e "tocca per continuare" compaiono sopra di loro in posizione assoluta. |
| S15 | corretto | lettore | `touch-action: none` e `overscroll-behavior: contain` sul lettore: swipe e rotella in rilettura non spostano più il diario sotto (scrollY 701 → 701). |
| S18 | corretto | lettore | Uno solo dei due senza secondari (0-4, 85, 91): `--cap-lato: 0.4`, accanto all'aiuola. Nel 5 prima che Semina sbuchi resta com'era. Test. |
| T8 | corretto | `T8` | `--blu-presenza` si scrive prima del primo disegno (`useLayoutEffect`) e la transizione si accende dopo il primo fotogramma (`:root[data-cielo='pronto']`). Misura: al primo fotogramma con la Home il valore è già 1. |

Vincoli rispettati: nessuna traccia di Semina prima del 5 (la logica di `presente` non cambia; il 99 e gli `entra`
riguardano solo i secondari); il lettore resta di notte (il fondale non riceve il `momento`); nessun vestito nuovo.

## File fuori dalla mia area
- `src/ui/App.tsx` (T8): `useLayoutEffect` per `--blu-presenza` e un effetto che mette `data-cielo="pronto"` sul root.
- `src/ui/tema.css`: la transizione di `--blu-presenza` spostata su `:root[data-cielo='pronto']` (T8); le regole
  di `summary` del diario (S10), accanto a `.diario`.
- La regola `.capitolo-sfondo` di tema.css resta; capitolo.css la sovrascrive dentro il lettore con `--cap-suolo`.

## Da sapere per il validatore
- Il fondale usa le container query (`cqh`/`cqw`, `@container`) e il merlo nascosto usa `:has`: servono Safari 16+
  e Chrome 105+. Senza `:has` resta solo il merlo doppio (S8), senza container query il disegno usa le unità
  dello schermo, che nel lettore coincidono.
- Se l'area shell aggiunge un bottone nel piede del lettore (S3, "Dopo"), come figlio diretto di `.capitolo-piede`
  finisce nel flusso sotto i punti: va messo nella regola di S14 (posizione assoluta sopra i punti) o accanto a
  "Continua".
- Il test "nel capitolo 99…" è cambiato: prima si aspettava solo i secondari che avevano già parlato.

## Da provare sul telefono
- Capitoli 10, 44, 77, 99: Fischio e il Gufo sul ramo/mensola, i fumetti dei due sopra di loro.
- Capitolo 68 (Briciola in cucina dalla prima battuta) e 30 (Nuvola in montagna).
- Telefono girato in un capitolo qualsiasi: fondale riconoscibile, testa, fumetti e "Continua" senza sovrapporsi.
- Coda di arretrati (es. 14 → 15): il passaggio fra i capitoli sfuma invece di cambiare di colpo.
- Giardino con molti capitoli: il diario a righe per atto, il tocco apre e chiude; i fiori subito sotto.
- Aprire l'app con qualche fiore: il cielo non deve più virare al blu nei primi due secondi.
- Rilettura dal diario: scorrere col dito sul lettore non sposta la pagina sotto.
