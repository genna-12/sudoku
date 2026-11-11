"""Alleggerisce gli scatti di colori-griglia.mjs e ne ricava i ritagli della griglia per il documento.

Uso: python3 -I scripts/qa/colori-griglia-immagini.py
- t9-colori-sudoku-*.png: scatto intero 390x844 a 2x, 256 colori senza dithering.
- t9-colori-killer-*.png, *-insieme.png, banco: a 1x o 2x, 256 colori.
- t9-colori-griglia-<variante>-<schema>.png: ritaglio della sola griglia (585 px), quello che si vede nel documento.
"""
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parents[2] / "docs" / "design" / "img"
VARIANTI = ["attuale", "a-anelli", "b-fasce", "c-pieni"]
SCHEMI = ["scuro", "chiaro"]


def salva(im, path):
    im.convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)


for s in SCHEMI:
    for v in VARIANTI:
        pieno = D / f"t9-colori-sudoku-{v}-{s}.png"
        im = Image.open(pieno).convert("RGB")
        # ritaglio della griglia (y da 460 a 1210 a 2x) prima di ridurre a 256 colori
        griglia = im.crop((0, 456, 780, 1212)).resize((585, 567), Image.LANCZOS)
        salva(griglia, D / f"t9-colori-griglia-{v}-{s}.png")
        salva(im, pieno)
        k = D / f"t9-colori-killer-{v}-{s}.png"
        if k.exists():
            salva(Image.open(k).convert("RGB").resize((390, 844), Image.LANCZOS), k)
        i = D / f"t9-colori-sudoku-{v}-{s}-insieme.png"
        if i.exists():
            salva(Image.open(i).convert("RGB").resize((585, 585), Image.LANCZOS), i)
        ki = D / f"t9-colori-killer-{v}-{s}-insieme.png"
        if ki.exists():
            ki.unlink()
        b = D / f"t9-colori-banco-{v}-{s}.png"
        if b.exists():
            salva(Image.open(b), b)
