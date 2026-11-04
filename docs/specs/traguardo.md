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
  fondale?: string;                                       // variante del fondale (es. 'laboratorio'); default = luogo
  eco: { chi: 'semino'|'semina'; testo: string };
  battute: BattutaCapitolo[];
}
export const CAPITOLI: readonly Capitolo[];              // 101, ordinati per fiore, fiore = indice
export const ULTIMO_CAPITOLO = 100;
export const SEMINA_ARRIVA_A = 5;                        // sostituisce SEMINA_SBLOCCATA_A
export function chiaveCapitolo(fiore: number): string;   // `capitolo-${fiore}` (stabile: non cambiarla mai)
export function capitolo(fiore: number): Capitolo | undefined;
```
Il JSON è la sola fonte: non ricopiare testi a mano. Il test TS sul JSON controlla solo ciò che lo script non controlla: 101 capitoli con `fiore` = indice, ogni `entra` una sola volta e nell'ordine fischio(10) pinza(17) nuvola(30) nonnacapra(33) gufo(44) grillo(56) briciola(68), e che il JSON committato corrisponda a `capitoli.md` (lo script mette come primo elemento del JSON un oggetto `{ _sorgente_sha256, _nota }`: il test ricalcola lo sha256 di `capitoli.md` e lo confronta; `CAPITOLI` salta quel primo elemento).

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

## Archivio e sync (riscritto dopo la revisione avversaria: il Worker NON unisce, fa PUT; l'unione è nel client, `sync.ts` `unisciRemoto`)
- Invariante: per ogni ruolo, `capitoliVisti[ruolo]` è un PREFISSO `capitolo-0..k` (la coda è ordinata e si segna un capitolo alla volta). Test dell'invariante dopo migrazione, unione, importazione, azzeramento.
- `VERSIONE_ARCHIVIO` 1 → 2, passo in `PASSI`: aggiunge `capitoliVisti: { a: [], b: [] }` ed `ecoViste: []`. Migrazione dei visti: se `tappeViste` contiene `semina-5`, aggiunge `capitolo-0..5` SOLO al ruolo di `io` sul dispositivo (non a entrambi: `tappeViste` era unito per coppia e non dice chi ha visto davvero; chi non l'ha vista la vedrà). Tutto il resto resta non visto: gli arretrati si leggono in ordine. `tappeViste` resta nell'archivio locale (inerte) ma ESCE dal payload di sync e da esporta/importa.
- Payload (`src/stato/sync.ts`): `PayloadSync` aggiunge `capitoliVisti` (per ruolo) e `versioneDati: 2`. `leggiPayload` legge `capitoliVisti` direttamente, senza passare dai `PASSI` (altrimenti la migrazione si riapplica a ogni lettura). `payloadDa` ricopia i campi remoti che non conosce (così un telefono vecchio non cancella i campi nuovi quando scrive; e `posta` di T7 ne beneficia). Il client NON scrive se la `versioneDati` remota è più alta della sua (telefono non aggiornato: legge soltanto).
- `unisciRemoto`, `importa`: unione PER RUOLO (a con a, b con b), solo se stessa era (`r.azzerato >= a.azzerato`, come per lo storico); poi si rinormalizza al prefisso. `motivoCambio` e `impronta` includono `capitoliVisti` (motivo 'cambio'): test "segnaVisto ⇒ daScrivere".
- "Ricomincia da zero" (`applicaAzzeramento`, che vale anche quando l'azzeramento arriva dal partner): svuota `capitoliVisti` di ENTRAMBI i ruoli ed `ecoViste`.
- Regali: `regalo` esce da `SBLOCCHI`/`sblocchiNuovi` (niente doppio conteggio). `REGALI_A_CAPITOLO` si accredita solo se la chiave è nuova per il ruolo DOPO l'unione con il remoto (due dispositivi dello stesso ruolo: un solo regalo). Pacchetti `frasi` di `SBLOCCHI`: restano per fiori; senza `AnnuncioSblocco` si annunciano con un toast "Frasi nuove per …" al primo ingresso in Home.
- P2P: niente (come oggi).

## Flusso dopo una vittoria (App.tsx)
0. Capitolo 0: non ha una partita finita. Si mostra alla prima entrata in Home dopo l'ingresso (coda non vuota con fiori = 0), come gli altri arretrati.
1. Il capitolo è DERIVATO dallo stato, non aperto da un evento (come oggi `scena` in App.tsx): `capitoloAperto = coda non vuota && (schermata === 'partita' && partita.finita && !vittoriaChiusa || lettoreApertoDaHome)`. `effetti.vittoria` fa solo la festa sulla griglia ~900 ms (reazione e lampo come oggi); la `finitaOra` che arriva via P2P o via Worker mentre sono in Home non apre niente da sola: la coda compare come bottone in Home. Se la coda è vuota → carta di vittoria come oggi.
2. Se piena → `CapitoloScena` a tutto schermo sopra la partita, PRIMA della carta di vittoria (motivo: la storia è il premio, la carta è lo scontrino; e i due finiscono nello stesso istante su due telefoni: ognuno legge al suo ritmo). Indicatore "N di M" se `coda.length > 1`. Con 4 o più arretrati, prima del primo un foglio "Hai N capitoli da leggere. Li leggi adesso?" con "Adesso" / "Dopo": "Dopo" lascia tutto non visto, va alla carta di vittoria, e la coda torna in Home e alla vittoria successiva (sempre in ordine). Alla fine di ogni capitolo "Continua" → `segnaVisto` → capitolo successivo o carta di vittoria. La carta legge un riassunto salvato alla fine della partita (`riassuntoVittoria`: tempo, punti, bonus), così resta giusta anche se il partner ha già iniziato una partita nuova; in quel caso il bottone diventa "Vai" verso la nuova partita.
3. La carta di vittoria perde il blocco `sorpresa`; "Nuova partita" resta. Se il partner preme "Nuova" mentre leggo: il capitolo resta aperto; la nuova partita si carica sotto, IN PAUSA (timer fermo, come la pausa esistente al cambio di scheda, se c'è; altrimenti si aggiunge un flag `inPausa` locale) finché non chiudo il lettore; la carta mostra "Vai" (oggi l'E2E `sblocco-semina` righe ~177-181 copre il caso: va riscritto per questo comportamento).
3b. La coda non cresce mentre leggo: si calcola all'apertura del lettore; i capitoli arrivati nel frattempo compaiono come bottone in Home dopo.
4. Capitolo 5: dentro `CapitoloScena`, con il comportamento attuale di `ScenaSblocco` (buio, fruscio, Semina che sbuca alla sua prima battuta, i colori che si accendono alla nota `narra` "Il verde è Semino..."): tenere l'animazione e i testid attuali (`scena-sblocco`, `scena-andiamo` → possono restare come alias di `capitolo-scena`, `capitolo-continua`).
5. In Home, se `codaCapitoli` non è vuota (es. il partner ha giocato da solo, o un dispositivo nuovo): bottone "1 capitolo da leggere" / "N capitoli da leggere" sopra "Continua"; apre la stessa `CapitoloScena`. Il fumetto-tappa di oggi sparisce.
6. Giardino: sezione "Diario" (vedi studio-ux §3): capitoli visti per atto, tocco = rilettura senza segnare niente.

## Schermata del capitolo (`src/ui/CapitoloScena.tsx`, CSS proprio)
- Props: `capitolo`, `indice/totale`, `sbloccata`, `onContinua`, `rilettura?: boolean`.
- Fondale per `luogo` (7, semplici: cielo + 2-3 sagome, variabili `--sc-*` della palette; vedi studio-ux §2); per aiuola/giardino si riusa la `Scena` della Home con gli elementi sbloccati; il campo opzionale `fondale` del capitolo (es. `laboratorio` per il luogo lontano) sceglie una variante. Nessuna libreria.
- Avanzamento protetto: per 300 ms dopo ogni battuta i tocchi sono ignorati; all'ultima battuta il tocco non fa niente e compare "Continua" dopo 400 ms (una raffica di tocchi non salta nulla). Indietro con un bottone vero "‹".
- `narra` = didascalia nel cielo, senza fumetto. I secondari hanno un posto fisso nel fondale, entrano alla loro prima battuta, fumetto crema con il nome sopra; verde e blu restano solo ai due. In scena un solo secondario alla volta: l'ultimo che ha parlato (il precedente esce); nel capitolo 99 restano tutti. `mulo` = un foglio che si riempie una riga per tocco.
- In scena: Semino e Semina (componente `Semino` esistente, `taglia` grande, `umore` della battuta corrente, `parla` mentre la battuta è sua, `accessorio` = `vestiti[chi]` se esiste nei vestiti disegnati, altrimenti nessuno). Semina compare solo se `capitolo.fiore >= 5` (condizione sul capitolo, NON su `sbloccata`: così i capitoli 0-4 riletti dal diario restano senza di lei; nel 5 sbuca alla sua prima battuta). Il secondario del capitolo (se parla o se `entra`) compare in piccolo, dal lato; i 7 secondari sono SVG semplici in `src/ui/Secondari.tsx` (~40-80 righe ciascuno, due stati: fermo/parla). `narra` = didascalia in corsivo in basso, senza personaggio. `mulo` = una lettera (foglio di carta con il testo).
- Avanzamento: un tocco ovunque = battuta successiva; bottone invisibile a tutto schermo per l'accessibilità (tastiera: Invio/Spazio avanti, Backspace indietro); tocco sull'angolo in alto a sinistra "◂" = battuta precedente; nessun auto-avanzamento; nessun "salta tutto" (decisione: niente deve perdersi; per rileggere c'è il diario). Alla fine: bottone "Continua" vero (focus su di lui).
- Testi: ≤ 110 caratteri, fumetto a 2-3 righe, niente `line-clamp`. Dimensione minima 16 px.
- Animazioni: entrata battuta 180 ms, personaggio che parla con `parla`, uscita scena 150 ms; con `prefers-reduced-motion` solo dissolvenze.
- Marcatura "visto" solo alla fine (vedi Regole).

## Condizione d'ingresso
`docs/storia/capitoli.md` unito e `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json` senza errori e senza `--da/--a` (lo script non scrive il JSON se ci sono errori).

## Decisioni esplicite (domande che una lead farebbe)
- Capitolo 0: a fiori 0 la Home mostra "1 capitolo da leggere" al primo avvio; si legge da lì (la coda ha solo il 0).
- Luoghi 8, fondali 7: `aiuola` e `giardino` usano lo stesso fondale (la `Scena` della Home).
- JSON: `entra`, `elemento`, `fondale`, `umore` assenti sono `null` nel file e diventano `undefined` nel tipo (`capitolo()` normalizza).
- `ecoViste` e `capitoliVisti` entrano nel tipo `Archivio`, non tra gli extra.
- Il bottone "capitoli da leggere" in Home non blocca le chiacchiere; il lettore aperto sì (come oggi scena/vittoria).
- `importa` di un file v1 (senza `capitoliVisti`): nessun visto importato; l'utente rilegge gli arretrati.
- Due dispositivi dello stesso ruolo: visti uniti per ruolo via Worker; tra una sync e l'altra possono divergere (un capitolo letto su un telefono può ricomparire sull'altro fino alla prossima sync): accettato.
- Dispositivo nuovo con fiori ≥ 5 e nessun visto: la coda parte da 0 e il 5 arriva al suo posto; `sbloccata` resta falsa finché non si legge il 5: la Home prima mostra Verde/Blu. È il caso da provare a mano (vedi sotto), non "capitoli 0-4 senza Semina", che è garantito dallo script.

## Fatto quando
- `npm test -- --run` verde con i test nuovi (coda, prefisso, migrazione solo per `io`, unione per ruolo e per era, azzeramento ricevuto che svuota, `segnaVisto ⇒ daScrivere`, regalo una volta sola); `tsc` pulito; E2E verdi: due-client, personale, tre-dispositivi, più due E2E nuovi che SOSTITUISCONO `sblocco-semina`: (1) "arrivo di Semina": archivio v1 con 4 fiori → vittoria → coda 0..5 letta per intero → nomi Semino/Semina; (2) "partner che preme Nuova mentre leggo": il lettore resta, la nuova partita è in pausa, "Vai" alla fine. `compat-t2.test.ts` e `storia.test.ts` riscritti.
- Sul telefono (Genna e Mati, ciascuno sul proprio): Mati con telefono "nuovo" (archivio vuoto, frase della coppia, fiori ≥ 5 dal Worker) vede Verde/Blu, legge 0..5 dalla Home e solo dopo compaiono i nomi; Genna gioca da solo una partita → sul telefono di Mati compare "1 capitolo da leggere"; chiudere l'app a metà di un capitolo → al riavvio è ancora in coda; "Ricomincia" su un telefono → anche sull'altro si riparte dal capitolo 0 dopo la sync.
- Nessun testo della storia vecchia compare più (grep di "STORIA_SEMINO", "SORPRESE", "fumetto-storia", "AnnuncioSblocco" vuoto).
- Un telefono con l'app vecchia che scrive sul Worker non cancella `capitoliVisti` (test unitario su `payloadDa` con campi sconosciuti; prova manuale: due versioni in parallelo).

## Stime (da verificare al primo commit)
`CapitoloScena` + CSS: 300-450 righe (11 voci, lettera, indietro, tastiera, "N di M", foglio "Adesso/Dopo"). Fondali: 6 nuovi × 50-80 righe. Secondari: 7 × 40-80 righe. Regole + archivio + sync + test: 250-400 righe. App.tsx: 100-150 righe di modifica. E2E nuovi: 2 × 100-150 righe. Totale ~1.500-2.000 righe: tre sessioni, nell'ordine dati+regole+archivio+sync (con test), poi schermata+fondali+flusso, poi secondari+diario+eco+E2E.

## Rischi e trappole
- `tappeViste` unite per coppia (bug attuale): non riprodurlo con `capitoliVisti`: unione per ruolo.
- Chi ha già fiori > 0 vede gli arretrati: può essere lungo (fino a `fiori` capitoli). Accettato; il bottone in Home permette di leggerli quando si vuole, e la coda dopo la vittoria si può interrompere chiudendo l'app senza perdere niente (visto solo alla fine di ogni capitolo).
- Due telefoni che finiscono insieme: nessuna sincronizzazione delle letture, voluto.
- Il browser integrato della chat occupa un posto nella stanza: chiudere prima delle prove.
- Testi: nessuna modifica ai capitoli in codice; si cambia `capitoli.md`, si rigenera il JSON, si ricommitta tutto insieme.
