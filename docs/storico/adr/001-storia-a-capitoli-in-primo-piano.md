# ADR 001 — Storia a capitoli in primo piano, visti per giocatore
- Data: 2026-11-04
- Stato: accettato
- Ricerche: nessuna
- Collegati: dipende da [ADR 002](002-storia-come-viaggio-per-luoghi.md), [ADR 004](004-fonte-unica-della-storia.md)

## Decisione
Un capitolo per partita finita (fiore 0→100), mostrato a tutto schermo con una battuta per tocco subito dopo la vittoria, prima della carta dei punti. I capitoli non visti si accodano in ordine e si leggono anche dalla Home; "visto" è per giocatore (ruolo a/b) e si segna solo alla fine del capitolo. Sostituisce le tappe come fumetto in Home, le sorprese alla vittoria e gli annunci "Nuovo nel giardino". Spec: docs/specs/traguardo.md (T5).

## Contesto
Oggi solo l'arrivo di Semina è in primo piano; 42 tappe sono fumetti in Home e la Home mostra solo la più alta non vista: le intermedie si perdono (segnalato da Genna il 04/11: "da livello 3 a livello 4 non arriva in primo piano niente"). Le tappe viste sono unite per coppia dal Worker: se uno le vede, l'altro non le riceve.

## Opzioni scartate
- Capitolo dopo la carta di vittoria: la carta spinge a "Nuova partita" e salta la storia.
- Visti per coppia (come oggi): uno dei due perde la scena.
- "Salta tutti gli arretrati": contraddice "nessun dettaglio si perde"; per rileggere c'è il diario.

## Cosa la farebbe cambiare
Se gli arretrati risultano troppo lunghi nell'uso reale (dispositivo nuovo con 60 fiori), aggiungere "leggi dopo" che lascia la coda in Home senza segnare visto.
