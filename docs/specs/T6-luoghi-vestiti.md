# Traguardo T6 — Luoghi visitati, vestiti e ricordi del giardino (spec, 04/11/2026)

Dopo T5. Visione: `docs/storia/bibbia.md` §5. Dettagli visivi: `docs/design/studio-ux.md` §4.

## Obiettivo
I vestiti di Semino e Semina sono una conseguenza del viaggio: si sbloccano arrivando in un luogo (primo capitolo dell'atto, per chi lo legge), in Home i due cambiano vestito solo tra quelli dei luoghi visitati, nei capitoli indossano quelli del luogo. Niente sezione skin. Il giardino in Home si riempie dei ricordi dei luoghi.

## Dati
- `src/config/luoghi.ts` (dati puri):
```ts
export const ATTI: Array<{ luogo: Luogo; da: number; a: number; vestiti: { semino: string[]; semina: string[] }; ricordi: Array<{ fiore: number; elemento: string }> }>
```
  Valori dalla bibbia §5: aiuola 0-5 (nessun vestito; ricordi: fiore@1, sentiero@3, semina@5); giardino 6-14 (occhiali | corona, animale@10; ricordi: stagno@8, merlo@10, cassetta@12); mare 15-27 (surf, palla | paglia; surf in coppia; ricordi: mare@15, stelle@20, surf@26 cioè la tavola sul muretto); montagna 28-42 (zaino-storto | montagna, cavallo@30; ricordi: montagna@29, cavallino@30, sasso@37); bosco 43-54 (lanterna | lucciola; ricordi: fuochi@50, lanterna@54); citta 55-66 (chitarra | giacca; ricordi: chitarra@63, locandina@65); cucina 67-76 (cuoco | grembiule; ricordi: casetta@67); lontano 77-90 (cuffie | camice; ricordi: cartina@88); giardino 91-100 (tutti; ricordo: arcobaleno@98). Un solo id per elemento (la tavola È `surf`).
- `luoghiVisitati(visti: string[]): Luogo[]` = luoghi degli atti il cui primo capitolo è in `visti` (derivato, niente da salvare). `vestitiDisponibili(chi, visti)`. `elementiSbloccati(maxVisto: number)` = ricordi con `fiore <= maxVisto`, dove `maxVisto` è il fiore più alto in `capitoliVisti[ruolo]` (prefisso, quindi un numero). Sostituisce le soglie per fiori. Conseguenza accettata: chi ha arretrati non letti (migrazione, telefono nuovo) vede il giardino con meno elementi finché non li legge; dopo la migrazione iniziale il giardino può restringersi per una sera. Test E2E sugli elementi da aggiornare.

## Vestiti nuovi (8) in `Semino.tsx`
`paglia` (Semina: cappello di paglia, conchiglia al collo), `zaino-storto` (Semino: zaino di traverso dietro, berretto troppo grande), `lanterna` (Semino: lanterna in mano davanti, luce calda), `lucciola` (Semina: corona di foglie con una lucciola che pulsa), `giacca` (Semina: giacca di jeans, occhiali da sole), `grembiule` (Semina: grembiule con farina), `cuffie` (Semino: cuffie sulla testa, biglietto del treno in mano), `camice` (Semina: camice e occhiali da laboratorio). Ciascuno ~40-80 righe SVG + CSS, due o tre parti (testa/dietro/davanti) come `montagna` oggi. Agente dedicato con screenshot (Semino.tsx è grande). `ACCESSORI_DI` si aggiorna; `MAI` diventa: Semino mai `montagna`/`cavallo`; Semina `surf` solo in coppia (`accessorioPermesso` invariato nel senso, ma la soglia passa da fiori a luoghi visitati).

## Home: rotazione
- `useAccessoriRiposo`: pool = `vestitiDisponibili(chi, visti)`; ogni ~60 s cambia uno dei due, scegliendo con probabilità 0,7 un vestito dello STESSO luogo che indossa l'altro (si vestono "da mare" insieme) e 0,3 misto. La prima volta che un vestito nuovo appare in Home: `semino-acc-pop` come oggi, più il fumetto di una chiacchiera del luogo (già esistono per mare/montagna; aggiungerne 4-6 per bosco, città, cucina, lontano in `frasi.ts`).
- Giorni speciali (mare/montagna per data): restano, ma solo se il luogo è già visitato.
- Capitoli: `CapitoloScena` passa `vestiti[chi]` del capitolo (T5 già lo legge).

## Ricordi nel giardino
- Nuovi elementi in `Scena.tsx` (ciascuno 40-70 righe, vedi analisi mascotte-e-ui §2): `sasso` (sasso di quota sul muretto), `lanterna` (appesa all'albero), `locandina` (sulla cassetta), `cartina` (sulla parete della casetta), `conchiglia` NON serve (resta in cima). Gli altri esistono già.
- Entrano con `sc-sorge`/`sc-pop` al primo ingresso in Home dopo il capitolo che li porta (chiave in `sudoku-scena-visti` come oggi).

## Fatto quando
- Test: `luoghi.test.ts` (atti consecutivi 0-100, ogni vestito appartiene a un luogo, ogni ricordo ha un capitolo con `@elemento` coerente in `capitoli.json`, i vestiti dei capitoli sono tra quelli del luogo del capitolo).
- Screenshot dei 8 vestiti su Semino/Semina a 3 taglie (cruscotto 44 px, Home, capitolo) allegati in `docs/design/img/`.
- Sul telefono: prima di 15 fiori letti nessun vestito da mare in Home; dopo il capitolo 15 compaiono; il giardino mostra la tavola dopo il 26, il sasso dopo il 37.
