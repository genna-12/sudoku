# ADR 004 — Fonte unica della storia: capitoli.md → JSON con script di controllo
- Data: 2026-11-04
- Stato: accettato
- Ricerche: nessuna
- Collegati: nessuno

## Decisione
I testi della storia vivono in `docs/storia/capitoli.md` (formato rigido, guida-dialoghi §5), leggibile e modificabile da Genna. `scripts/storia/controlla.py` verifica formato, limiti, vincoli (Semina mai prima del 5, umori, vestiti) e lista nera, e genera `src/config/capitoli.json`, che il codice importa. Nessun testo di storia nel codice TS.

## Motivo
Oggi i testi stanno in `storia.ts`/`frasi.ts` con liste morte (STORIA_SEMINO, STORIA_EXTRA) e test rigidi sulle soglie. Un file di testo con un controllo automatico permette di correggere una battuta senza toccare il codice e senza rompere i vincoli.

## Cosa la farebbe cambiare
Se servisse localizzare o avere più storie (non previsto), il JSON diventerebbe uno per storia.
