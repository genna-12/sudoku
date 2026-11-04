#!/usr/bin/env python3
"""Unisce i lotti di docs/storia/lotti/*.md in docs/storia/capitoli.md, ordinati per numero di capitolo.

Uso: python3 scripts/storia/unisci.py [--out docs/storia/capitoli.md]
Ogni capitolo deve esistere una volta sola; i duplicati fermano l'unione.
"""
import argparse
import re
import sys
from pathlib import Path

RE_TITOLO = re.compile(r"^## (\d+) · ")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lotti", default="docs/storia/lotti")
    ap.add_argument("--out", default="docs/storia/capitoli.md")
    a = ap.parse_args()
    capitoli = {}
    for f in sorted(Path(a.lotti).glob("*.md")):
        corrente, buf = None, []
        for riga in f.read_text(encoding="utf-8").splitlines():
            m = RE_TITOLO.match(riga)
            if m:
                if corrente is not None:
                    capitoli.setdefault(corrente, []).append(("\n".join(buf).rstrip(), f.name))
                corrente, buf = int(m.group(1)), [riga]
            elif corrente is not None:
                buf.append(riga)
        if corrente is not None:
            capitoli.setdefault(corrente, []).append(("\n".join(buf).rstrip(), f.name))
    errori = [f"capitolo {n} in più file: {[x[1] for x in v]}" for n, v in capitoli.items() if len(v) > 1]
    mancanti = sorted(set(range(101)) - set(capitoli))
    if mancanti:
        errori.append(f"mancano i capitoli {mancanti}")
    for e in errori:
        print("ERRORE", e)
    if errori:
        sys.exit(1)
    testa = "# Semino e Semina — i capitoli (fiori 0→100)\n\nFonte unica dei testi della storia. Formato: docs/storia/guida-dialoghi.md §5. Controllo e JSON: `python3 -I scripts/storia/controlla.py docs/storia/capitoli.md --json src/config/capitoli.json`. Scaletta: scaletta.md. Non modificare i lotti in lotti/: dopo l'unione fanno fede questo file.\n"
    corpo = "\n\n".join(capitoli[n][0][0] for n in range(101))
    Path(a.out).write_text(testa + "\n" + corpo + "\n", encoding="utf-8")
    print("scritto", a.out, "con", len(capitoli), "capitoli")


if __name__ == "__main__":
    main()
