# Traguardo T5 — La storia a capitoli (spec per la chat lead, 04/11/2026)

Scritta dalla chat PROG · Sudoku · storia e UX. Decisioni in `docs/storico/adr/`, visione in `docs/progettazione/BUSSOLA.md`. Le spec T6 (luoghi e vestiti) e T7 (UX) sono in `docs/specs/T6-luoghi-vestiti.md` e `T7-ux.md`: si fanno DOPO T5, in quest'ordine. Dettagli visivi della schermata del capitolo: `docs/design/studio-ux.md` §1-2 (vale dove questa spec non dice).

## Obiettivo
Sostituire la storia attuale (43 tappe come fumetti in Home, 9 sorprese, annunci "Nuovo nel giardino") con i 101 capitoli di `docs/storia/capitoli.md`: dopo ogni partita finita il capitolo del nuovo fiore appare in primo piano, una battuta per tocco, su entrambi i telefoni; nessun capitolo si perde mai; ognuno legge sul suo.

## Perimetro
1. Dati: `src/config/capitoli.json` generato da `docs/storia/capitoli.md` con `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json`; tipi e accesso in `src/config/capitoli.ts`.
2. Regole (puro TS, `src/ui/regole.ts` o nuovo `src/ui/capitoli.ts`): coda dei capitoli da mostrare, visto per giocatore, eco, Semina sbloccata.
3. Archivio e sync: campo nuovo `capitoliVisti`, per ruolo; migrazione; unione nel Worker e in esporta/importa.
4. UI: schermata `CapitoloScena` (generalizza `ScenaSblocco`), 7 fondali semplici, i 7 secondari disegnati, la lettera del Mulo, flusso dopo la vittoria, arretrati dalla Home, eco in Home, diario nel Giardino.
5. Rimozione: tappe in Home (`tappaDaMostrare`, `fumetto-storia`), `SORPRESE` e il blocco sorpresa in `Vittoria.tsx`, `AnnuncioSblocco`, `STORIA`/`STORIA_SEMINO`/`STORIA_EXTRA`/`SCENA_SBLOCCO`. Restano: `SBLOCCHI` solo per `frasi` e `regalo` (vedi sotto), `GIORNI_SPECIALI`, sonno, chiacchiere, `FRASI_EXTRA`.
6. Test: `storia.test.ts` riscritto sui capitoli; `regole.test.ts` per coda/visti/eco; E2E `sblocco-semina` e `due-client` adeguati; un E2E "tre partite di fila, nessun capitolo perso".

## Fuori perimetro (T6, T7)
Vestiti nuovi e rotazione per luogo (T6: in T5 i capitoli passano `@vestiti` ma si disegnano solo gli accessori che esistono già; i nuovi id si ignorano con un fallback a "nessuno"). Ricordi nuovi del giardino (T6). Transizioni, cassetta vera, accessibilità della griglia (T7).

## Dati (contratto: `src/config/capitoli.ts`)
```ts
export type Luogo = 'aiuola'|'giardino'|'mare'|'montagna'|'bosco'|'citta'|'cucina'|'lontano';
export type Secondario = 'fischio'|'pinza'|'nuvola'|'nonnacapra'|'gufo'|'grillo'|'briciola'|'mulo';
export type Voce = 'semino'|'semina'|'narra'|Secondario;
export interface BattutaCapitolo { chi: Voce; umore?: string; testo: string }   // umore solo per semino/semina
export interface Capitolo {
  fiore: number; luogo: Luogo; titolo: string;
  vestiti: Partial<Record<'semino'|'semina', string>>;   // id di accessorio/vestito (T6 ne aggiunge 8)
  entra?: Secondario; elemento?: string;                  // elemento: ricordo del giardino (T6)
  eco: { chi: 'semino'|'semina'; testo: string };
  battute: BattutaCapitolo[];
}
export const CAPITOLI: readonly Capitolo[];              // 101, ordinati per fiore, fiore = indice
export const ULTIMO_CAPITOLO = 100;
export const SEMINA_ARRIVA_A = 5;                        // sostituisce SEMINA_SBLOCCATA_A
export function chiaveCapitolo(fiore: number): string;   // `capitolo-${fiore}` (stabile: non cambiarla mai)
export function capitolo(fiore: number): Capitolo | undefined;
```
Il JSON è la sola fonte: non ricopiare testi a mano. Un test verifica: 101 capitoli, fiori consecutivi, battute 4-8 (10 per il 5), testi ≤ 110/120, umori validi, nessuna battuta/eco/vestito di Semina prima del 5, ogni `entra` compare una sola volta e nell'ordine fischio(10) pinza(17) nuvola(30) nonnacapra(33) gufo(44) grillo(56) briciola(68).

## Regole (puro TS, testate)
- `fiori` resta `fioriDi(storico)` (di coppia).
- `ruoloIo`: 'a' (Verde/Semino) o 'b' (Blu/Semina) dal profilo, come oggi.
- `capitoliVisti: { a: string[]; b: string[] }` nell'archivio. `vistiDi(ruolo)`.
- `codaCapitoli(fiori, visti: string[]): Capitolo[]` = tutti i capitoli con `fiore <= fiori` non in `visti`, in ordine crescente. È la coda da mostrare: dopo una vittoria e dalla Home.
- `segnaVisto(archivio, ruolo, fiore)`: aggiunge la chiave quando l'utente preme "Continua" alla fine del capitolo (non all'apparire: se chiude l'app a metà, lo rivede).
- `seminaSbloccata(fiori, visti)` = `fiori >= 5 && visti.includes(chiaveCapitolo(5))`. Per dispositivo/ruolo, come oggi; la UI prima dello sblocco resta identica a oggi (profili Verde/Blu, `senzaSemina`, niente coppia).
- `ecoDaMostrare(visti, ecoViste)`: l'eco del capitolo visto più alto non ancora "echeggiato" (chiave `eco-${fiore}` in un campo locale `ecoViste`, NON sincronizzato); si mostra una volta entrando in Home; poi le eco dei capitoli visti entrano nel pool delle chiacchiere della mascotte con peso basso (1 su 4 chiacchiere circa, numero in `config/punteggio.ts` o un nuovo `config/storia.ts` ridotto).
- Regali: lista `REGALI_A_CAPITOLO = [1, 5, 10, 18, 25, 35, 60]` (gli stessi di oggi): +1 suggerimento accreditato quando si segna visto quel capitolo, per chi lo vede. Pacchetti `FRASI_EXTRA`: invariati, per fiori.
- Elementi del giardino: finché T6 non c'è, `elementiSbloccati(fiori)` resta come oggi (soglie attuali) così il panorama non cambia.

## Archivio e sync
- `VERSIONE_ARCHIVIO` 1 → 2, passo in `PASSI`: aggiunge `capitoliVisti: { a: [], b: [] }` e `ecoViste: []`. Se `tappeViste` contiene `semina-5`, aggiunge `capitolo-0..5` a ENTRAMBI i ruoli (chi ha già visto l'arrivo non lo rivede; i capitoli 0-4 nuovi si perdono per chi è già oltre: accettato). Tutto il resto resta non visto: alla prima vittoria o dalla Home si leggono gli arretrati in ordine (è voluto: la storia nuova si legge dall'inizio). `tappeViste` resta nel file (campo inerte) per non rompere import di memorie vecchie.
- Worker/KV (`src/stato/sync.ts`): `PayloadSync` aggiunge `capitoliVisti`; `unisciRemoto` fa l'unione PER RUOLO (a con a, b con b). Esporta/importa (`memoria.ts`): idem. P2P: niente (come oggi).
- "Ricomincia da zero": azzera `capitoliVisti` di entrambi e `ecoViste`.

## Flusso dopo una vittoria (App.tsx)
1. `effetti.vittoria` (ogni dispositivo che riceve `finitaOra`): `coda = codaCapitoli(fiori, vistiDi(ruolo))`. Se vuota → carta di vittoria come oggi.
2. Se piena → `CapitoloScena` a tutto schermo sopra la partita, PRIMA della carta di vittoria (motivo: la storia è il premio, la carta è lo scontrino; e i due finiscono nello stesso istante su due telefoni: ognuno legge al suo ritmo). Indicatore "N di M" se `coda.length > 1`. Alla fine di ogni capitolo "Continua" → `segnaVisto` → capitolo successivo o carta di vittoria.
3. La carta di vittoria perde il blocco `sorpresa`; "Nuova partita" resta.
4. Capitolo 5: dentro `CapitoloScena`, con il comportamento attuale di `ScenaSblocco` (buio, fruscio, Semina che sbuca alla sua prima battuta, i colori che si accendono alla nota `narra` "Il verde è Semino..."): tenere l'animazione e i testid attuali (`scena-sblocco`, `scena-andiamo` → possono restare come alias di `capitolo-scena`, `capitolo-continua`).
5. In Home, se `codaCapitoli` non è vuota (es. il partner ha giocato da solo, o un dispositivo nuovo): bottone "1 capitolo da leggere" / "N capitoli da leggere" sopra "Continua"; apre la stessa `CapitoloScena`. Il fumetto-tappa di oggi sparisce.
6. Giardino: sezione "Diario" (vedi studio-ux §3): capitoli visti per atto, tocco = rilettura senza segnare niente.

## Schermata del capitolo (`src/ui/CapitoloScena.tsx`, CSS proprio)
- Props: `capitolo`, `indice/totale`, `sbloccata`, `onContinua`, `rilettura?: boolean`.
- Fondale per `luogo` (7, semplici: cielo + 2-3 sagome, variabili `--sc-*` della palette; vedi studio-ux §2). Nessuna libreria.
- In scena: Semino e Semina (componente `Semino` esistente, `taglia` grande, `umore` della battuta corrente, `parla` mentre la battuta è sua, `accessorio` = `vestiti[chi]` se esiste nei vestiti disegnati, altrimenti nessuno). Semina compare solo se `sbloccata` o dal capitolo 5 in poi (nel 5 sbuca alla sua prima battuta). Il secondario del capitolo (se parla o se `entra`) compare in piccolo, dal lato; i 7 secondari sono SVG semplici in `src/ui/Secondari.tsx` (~40-80 righe ciascuno, due stati: fermo/parla). `narra` = didascalia in corsivo in basso, senza personaggio. `mulo` = una lettera (foglio di carta con il testo).
- Avanzamento: un tocco ovunque = battuta successiva; bottone invisibile a tutto schermo per l'accessibilità (tastiera: Invio/Spazio avanti, Backspace indietro); tocco sull'angolo in alto a sinistra "◂" = battuta precedente; nessun auto-avanzamento; nessun "salta tutto" (decisione: niente deve perdersi; per rileggere c'è il diario). Alla fine: bottone "Continua" vero (focus su di lui).
- Testi: ≤ 110 caratteri, fumetto a 2-3 righe, niente `line-clamp`. Dimensione minima 16 px.
- Animazioni: entrata battuta 180 ms, personaggio che parla con `parla`, uscita scena 150 ms; con `prefers-reduced-motion` solo dissolvenze.
- Marcatura "visto" solo alla fine (vedi Regole).

## Fatto quando
- `npm test -- --run` verde con i test nuovi; `tsc` pulito; E2E verdi (due-client, personale, tre-dispositivi, sblocco-semina adeguato, più "tre partite di fila").
- Sul telefono (Genna e Mati, ciascuno sul proprio): tre partite di fila → tre capitoli in ordine, "1 di 3"...; chiudere l'app a metà di un capitolo → al riavvio il capitolo è in coda in Home; Mati legge il capitolo 5 sul suo telefono anche se Genna l'ha già letto; il diario rilegge senza cambiare nulla; "Ricomincia" riparte dal capitolo 0.
- Nessun testo della storia vecchia compare più (grep di "STORIA_SEMINO", "SORPRESE", "fumetto-storia" vuoto).
- Prima del fiore 5, con `capitoliVisti` vuoti: nessuna traccia di Semina (controllo manuale della Home, dell'Ingresso, della Vittoria e dei capitoli 0-4).

## Rischi e trappole
- `tappeViste` unite per coppia (bug attuale): non riprodurlo con `capitoliVisti`: unione per ruolo.
- Chi ha già fiori > 0 vede gli arretrati: può essere lungo (fino a `fiori` capitoli). Accettato; il bottone in Home permette di leggerli quando si vuole, e la coda dopo la vittoria si può interrompere chiudendo l'app senza perdere niente (visto solo alla fine di ogni capitolo).
- Due telefoni che finiscono insieme: nessuna sincronizzazione delle letture, voluto.
- Il browser integrato della chat occupa un posto nella stanza: chiudere prima delle prove.
- Testi: nessuna modifica ai capitoli in codice; si cambia `capitoli.md`, si rigenera il JSON, si ricommitta tutto insieme.
