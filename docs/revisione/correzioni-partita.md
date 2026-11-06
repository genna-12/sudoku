# Correzioni della revisione UI: Partita e Vittoria (06/11 notte)

Fonte dei difetti: `ui-2026-11-06-partita.md` (P1-P17) e `ui-2026-11-06-trasversale.md` (T2, T9).
Verifica: test unitari (`src/ui/partita-correzioni.test.tsx`, `src/ui/partita-vista.test.tsx`, 16 nuovi, totale 489) e
build servita con PeerJS locale, Playwright a 360×640, 390×844, 430×932, 844×390, 1280×800, chiaro e
scuro, reduced-motion, da soli e in coppia (Verde + Blu). Script e catture nello scratchpad
`fix-partita/` (m1 barra e note, m2 cruscotto, m3 vittoria, m4 foglio frasi, m5 coppia, m6 invito, m7 rientro).

Esito: **19 su 19 corretti** (P1-P17, T2 insieme a P3, T9). Nessuno "da decidere"; un compromesso a 360 su P12/P17 (sotto).

| ID | Esito | Commit | Cosa è cambiato e come è verificato |
|---|---|---|---|
| P1 | corretto | f406cd7 | `tick` stabile (`useCallback`) e nuovo `useTimerPartita` in `usePartita.ts` (intervallo che dipende solo da "in gioco", tick in un ref); App lo usa al posto del suo effetto. Test con fake timers: 25 tocchi di note ogni 600 ms con render forzati fanno 21 s (prima restava a 6), render ogni 300 ms per 10 s = 10 s. Il test fallisce col codice vecchio (provato). In browser: "Finita in 00:17" dopo ~17 s di gioco, bonus coerente. |
| P2 | corretto | f406cd7 | Ogni passo ricorda come ho lasciato la cella. Annulla agisce solo se la cella è ancora mia e uguale; se l'ha cambiata il partner o è diventata giusta e definitiva, non tocca niente, scarta quel passo, avvisa nel fumetto ("Quella cella è cambiata nel frattempo: la lascio com'è" / "Quella cella ormai è giusta: resta così") e si ferma: mai un salto silenzioso a una mossa vecchia. Le mie mosse giuste definitive non occupano Annulla. La cella interessata si seleziona. Nessun messaggio di rete nuovo (solo `cella` e `contatori`, verificato nel test). In coppia (m5): l'8 del partner resta su tutti e due i telefoni. |
| P3 = T2 | corretto | 2a43cd1 | `.vittoria` con `place-items: safe center` e `overflow-y: auto`; in orizzontale (altezza ≤ 500) carta su due colonne senza striscia di giardino. 844×390: carta alta 351 px, "Nuova partita" e "guarda la griglia" in vista; 360×640 e 390×844: carta dentro lo schermo. |
| P4 | corretto | 43a79e7 | `fraseMascotte` riceve il ruolo di chi ha mosso: se parla una mascotte non sua (prima di Semina, sul telefono di Blu parla Semino) scarta le frasi di voce che nominano il giocatore di quella mascotte ("Genna"). Test: 9 categorie × 400 estrazioni sul ruolo b senza "Genna"; sul ruolo a la voce resta intera. |
| P5 | corretto | 5f5804b | `.barra-livello` con max-width e puntini come riserva; sotto i 400 px barra più compatta (livello clamp 15-19 px, timer 16 px, chip 12,5 px, gap 4). A 360 "supersemini" sta intero (95 px in 104), a 390 103 in 133; nessuna sovrapposizione col timer a nessuna misura. |
| P6 | corretto | a79db6b | Sotto i 380 px, in due: mascottine da 36 px (svg scalato 0,82), seme d'oro largo 38, contatori con meno aria (etichette restano a 12 px). Sovrapposizioni misurate a 360 chiaro e scuro e a 390: 0 px² (prima 722 sul contatore, 104 sulle cifre). |
| P7 | corretto | 43a79e7 | Di notte la frase di sonno sostituisce solo una cella giusta semplice (`sonnoPuoSostituire`); errori e serie di errori restano la loro frase "a mezza voce" (`zzz… quasi`), vittoria, chiusure e regali la loro frase. Mai "bella mossa" su un errore. Test unitario. |
| P8 | corretto | e4e0543 | Griglia ignora lampi e arrivi nati prima del suo montaggio (rientro con Continua, griglia nuova, anche il "respiro"); la mascottina del cruscotto non rianima l'impulso al montaggio; la scossa del contatore solo per gli errori arrivati dopo l'ingresso. Test unitario della Griglia; in browser (m7) al rientro dopo riga chiusa ed errore: 0 `.fx-lampo`, nessun `scatta` né balzo; dopo la nuova del partner (m5) 0 lampi e 0 arrivi. |
| P9 | corretto | 4267e6f | Prima di Semina le reazioni del partner portano la firma col suo nome vero ("Mati"/"Genna"), nel colore del tono (rosso sull'errore): niente blu di Semina. In coppia (m5): su A per l'errore di B il fumetto è "Mati · …" in rosso. |
| P10 | corretto | 129fe67 | Il suggerimento una tantum ha categoria `gesto` (prima era `suggerimento`, la stessa del regalo) e ferma da sé il fumetto: le reazioni aspettano in coda (meccanismo `ferma`/`riprendi` già esistente), dopo 4,5 s si chiude e ripartono; un tocco lo chiude prima. Test sulla Partita. |
| P11 | corretto | 6b3ad01 | `.foglio-frasi` con max-height (100dvh − 32 px) e scorrimento; in orizzontale frasi su due colonne. 844×390: foglio da 100 a 374 px, "Chiudi" e "A caso" in vista; 390×844 invariato. |
| P12 | corretto (compromesso a 360) | 898771f | Nel Killer la cella con la somma (classe `con-somma` in Griglia) mette 1 2 3 stretti a destra della somma; le righe 4-9 restano al loro posto. A 390 e oltre nessuna nota sotto la somma (misura sui glifi). A 360 (cella da 35 px, somma a 11 px) la prima riga scende a 9,5 px e tocca la somma per circa 1 px di riquadro: si leggono tutte e nove (cattura `m1-zoom-360.png`). |
| P13 | corretto | 6cace80 | Nel blocco reduced-motion in fondo: `.vittoria-carta` solo `entra-dissolvenza` (la regola con `atterra` la riattivava) e `.partner-chip i` fermo. Misurato: con reduced-motion le sole animazioni sono `entra-dissolvenza` e `dissolvi`. |
| P14 | corretto | a579e27 | `vittoriaAperta` aspetta anche la festa quando non c'è un capitolo in coda. Con 100 fiori già letti la carta si monta dopo ~1,3 s dall'ultima cella (prima subito). |
| P15 | corretto | 5f5804b | Chip del partner con larghezza minima pari a "in attesa" (7,4 em; 7,1 em sotto i 400 px). In coppia (m5) all'arrivo del partner: timer spostato di 0 px (prima 31). |
| P16 | corretto | 129fe67 | Dopo "guarda la griglia" al posto di Annulla, Cancella e Note: "Fiorita!" (o "Fiorita insieme!") e "Nuova partita" (stesso tipo e livello); tastierino spento (`inert`), seme d'oro senza numero né pulsazione. "Frase" resta. Test sulla Partita e verifica a 844×390 e 390×844. |
| P17 | corretto (eccezione motivata) | 898771f | Note `clamp(11px, 3.3cqi, 14px)` peso 700 e riquadro più largo: 12,1 px a 390, 13,4 a 430, 12,2 a 844×390, 14 su desktop. A 360 restano 11 px: la cella è di 35 px e tre righe di cifre da 12 non ci stanno con un minimo di aria (36 px). Somme `max(11px, min(12px, 3.3cqi), 2.65cqi)`: 12 px da 390, 11 a 360 per lo stesso motivo. |
| T9 | corretto | cbbbdec | `cerca` (cursore del partner), `regalo-pulsa` (ora `regalo-anello` sull'anello) e `invito`: l'alone sta in un `::after` che anima solo `opacity` (e `transform` per anello e invito); il bordo resta fermo. Verificato con `getAnimations()`: `cerca` su `::after` con sola `opacity`, `invito` su `::after` con `opacity` e `transform`. Con reduced-motion fermi. |

## File toccati fuori dall'area
- `src/ui/App.tsx` oltre al timer, righe piccole: `frase()` (P4 ruolo, P7 sonno), firma del partner in `mostraReazione` (P9), `avviso` negli effetti della partita (P2), categoria `gesto` del suggerimento (P10), condizione `vittoriaAperta` (P14), prop `onNuova` alla Partita (P16).
- `src/ui/regole.ts`: parametro `perRuolo` di `fraseMascotte`, `sonnoPuoSostituire`, `aMezzaVoce` (la logica di scelta delle frasi sta qui, non in `frasi.ts`; nessuna battuta riscritta).
- `src/ui/Icone.tsx`: `IconaNuova` (un "+").
- `src/ui/tema.css`: `.bottone.primario.invito` è il bottone della Home (T9), solo l'alone.

## Da provare sul telefono
- Partita lunga in due: il timer non si ferma, anche con lo schermo bloccato e riacceso; la batteria col cursore del partner acceso (T9).
- Annulla in coppia su una cella appena cambiata dall'altra: resta il suo numero, compare l'avviso nel fumetto.
- Telefono in orizzontale: carta di vittoria su due colonne e foglio delle frasi, con notch e barre del browser.
- Killer a 360 (es. telefoni piccoli): leggibilità delle note 1 2 3 accanto alla somma, al buio e col tema notte.
- Dopo "guarda la griglia": la riga "Fiorita! · Nuova partita" e il tastierino spento.
- Prima di Semina, sul telefono di Mati: Semino non la chiama mai "Genna"; un errore dell'altro porta la firma col nome.
