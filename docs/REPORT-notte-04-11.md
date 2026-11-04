# Report per Genna — notte del 04/11/2026 (progettazione: storia e UX)

Chat: PROG · Sudoku · storia e UX · 04/11 (Fable). Niente codice toccato: la lead Opus parte da qui con "riprendi".

## Cosa leggere, in ordine
1. `docs/storia/bibbia.md` (10 minuti): cos'è la storia, i due, i sette secondari, i luoghi e i vestiti, la mappa dei temi, le cose piantate.
2. `docs/storia/capitoli.md` (i 101 capitoli, 715 battute). Leggili come li leggerà Mati: una battuta alla volta. Segna i numeri di quelli che ti suonano falsi, troppo "carini" o che spiegano: si correggono lì, poi `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json`.
3. `docs/progettazione/BUSSOLA.md`: da approvare (è la prima stesura).
4. `docs/design/studio-ux.md`: come sarà la schermata del capitolo e cosa si sistema nell'interfaccia.

## Cosa ho deciso (ADR in docs/storico/adr/)
- Dopo OGNI partita finita il capitolo appare in primo piano, una battuta per tocco, prima della carta dei punti; i capitoli non visti si accodano in ordine e si leggono anche dalla Home; visto è per giocatore (oggi era per coppia: se tu vedevi una tappa, Mati la perdeva). Diario nel giardino per rileggere.
- La storia è un viaggio: aiuola → giardino → mare → montagna → bosco al crepuscolo → città di notte → cucina → oltre la montagna (treno, laboratorio) → ritorno. Sette secondari a nota fissa (Fischio il merlo, Pinza il granchio, Nuvola la cavalla, Nonna Capra e il Mulo, Gufo, Grillo, Briciola il gatto) che si rivedono. Niente cattivo, niente morale: i temi si vedono nei gesti.
- I vestiti dipendono dai luoghi visitati (8 nuovi, 9 esistenti riusati); in Home ruotano solo quelli dei luoghi già visti. Semino in montagna ha il suo zaino storto.
- I testi vivono in `capitoli.md`, con uno script che controlla formato e vincoli (Semina mai prima del 5, lunghezze, lista nera) e genera il JSON per il codice.
- Le tue parole sulle difficoltà NON sono nel repo (è pubblico): stanno nel Project Claude, documento `storia-materiale-riservato.md`. Nel repo i temi sono in forma neutra.

## Come è stata scritta la storia
Due ricerche (coppia: Gottman, demand-withdraw, distanza; scrittura: sottotesto, cartoni, lista nera anti-IA), la bibbia e la scaletta dei 101 capitoli scritte da me, 12 capitoli campione miei, 4 scrittori Opus in parallelo sui lotti, 4 revisori Opus separati con checklist di 12 domande (hanno ritoccato 25 capitoli), rilettura integrale mia alla fine. I revisori segnalano, con onestà: l'atto finale è molto affettuoso e con poco attrito; 43 e 45 tiepidi; 91 e 93 sono elenchi. Decidi tu dopo averli letti in gioco.

## Cosa serve da te
HANDOFF.md, sezione "Da Genna" (5 punti: lettura, ok alla bussola, git pull, prova reale, quanti fiori avete).

## Prossimo
Apri una chat nuova con Opus e scrivi: riprendi. Nome: LEAD · Sudoku · T5 capitoli · gg/mm. La spec T5 è in `docs/specs/traguardo.md`; T6 e T7 seguono.
