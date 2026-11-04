# Passaggio — risposte attese (con fonte)

1. Il capitolo, a tutto schermo, prima della carta di vittoria; con arretrati, prima gli arretrati in ordine con "N di M", poi la carta. Fonte: ADR 001; spec T5 "Flusso dopo una vittoria".
2. Lo vede: "visto" è per ruolo (a/b), unito per ruolo nel Worker; la Home mostra "1 capitolo da leggere". Fonte: ADR 001; spec T5 "Archivio e sync".
3. No: "mancare" è parola-tema in lista nera e la chiusura dichiara il sentimento. Si riscrive la chiusura su un oggetto o un gesto (es. lei lascia una cosa nello zaino). Fonte: guida-dialoghi §1 regola 3-6, §3; bibbia §2.
4. In `docs/storia/capitoli.md`; poi `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json` e commit di entrambi. Mai nel codice. Fonte: ADR 004; spec T5 "Dati".
5. Sì, il suo (`zaino-storto`); no, mai `montagna`/`cavallo` di Semina. Fonte: ADR 003; bibbia §5.
6. Migrazione archivio v2: se aveva visto l'arrivo di Semina, i capitoli 0-5 risultano visti per entrambi; tutti gli altri (6-30) sono arretrati e si leggono dalla Home o alla prima vittoria, in ordine. Fonte: spec T5 "Archivio e sync".
