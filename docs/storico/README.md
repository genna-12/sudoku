# Storico del progetto

Decisioni (ADR) e ricerche, una per file, con intestazione fissa (skill workflow-progetti, sezione Storico). Cartella autosufficiente: i link interni sono relativi; i riferimenti al codice sono percorsi scritti, non link.
- `adr/README.md`: indice delle decisioni.
- `ricerca/README.md`: indice delle ricerche.
Un ADR non si riscrive: se superato, Stato "sostituito da" e un ADR nuovo. Indici rigenerati con `python3 C:/dev/_tools/bin/storico.py REPO --correggi` (sul PC); nel cloud si aggiornano a mano.
