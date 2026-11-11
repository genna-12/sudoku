#!/usr/bin/env python3
"""Controlla il copione della storia (docs/storia/capitoli.md o un lotto) e produce il JSON.

Uso:
  python3 scripts/storia/controlla.py docs/storia/capitoli.md            # controlla e scrive capitoli.json accanto
  python3 scripts/storia/controlla.py docs/storia/lotti/lotto-a.md --da 7 --a 27 --salta 18,19
  python3 scripts/storia/controlla.py FILE --json OUT.json

Esce con 1 se ci sono errori. Gli avvisi (lista nera) non fermano.
Formato: vedi docs/storia/guida-dialoghi.md §5; righe d'ambiente (T9 C): docs/specs/T9-C-ambienti.md.

Ambienti (solo dal capitolo 9 al 100, vietati da 0 a 8):
  @ambiente: momento=<alba|mattina|giorno|tramonto|sera|notte> meteo=<sereno|nuvole|...>
  @comparse: id, id   /   @oggetti: id, id   (al massimo 3; vuoto ammesso; id da src/config/ambienti.json)
  L'obbligo di @ambiente dal 9 al 100 vale con AMBIENTE_OBBLIGATORIO = True o con --ambiente-obbligatorio;
  spento, la riga se c'è si controlla lo stesso.
"""
import argparse
import json
import re
import sys
from pathlib import Path

# vocabolario unico degli ambienti, letto anche dall'app (src/config/ambienti.ts)
AMBIENTI = json.loads((Path(__file__).resolve().parents[2] / "src" / "config" / "ambienti.json").read_text(encoding="utf-8"))
MOMENTI = set(AMBIENTI["momenti"])
METEO = set(AMBIENTI["meteo"])
COMPARSE = set(AMBIENTI["comparse"])
OGGETTI = set(AMBIENTI["oggetti"])
MAX_VOC_COMPARSE, MAX_VOC_OGGETTI = 10, 30
MAX_AMBIENTE = 3  # comparse e oggetti per capitolo
AMBIENTE_DA, AMBIENTE_A = 9, 100
# acceso dalla lead quando capitoli.md ha le righe @ambiente dal 9 al 100 (o con --ambiente-obbligatorio)
AMBIENTE_OBBLIGATORIO = True

LUOGHI = {"aiuola", "giardino", "mare", "montagna", "bosco", "citta", "cucina", "lontano"}
PRINCIPALI = {"semino", "semina"}
SECONDARI = {"fischio", "pinza", "nuvola", "nonnacapra", "gufo", "grillo", "briciola", "mulo"}
VOCI = PRINCIPALI | SECONDARI | {"narra"}
UMORI = {"neutro", "felice", "sorpreso", "estasiato", "festa", "imbarazzato", "preoccupato",
         "regalo", "saluta", "dorme", "arrabbiato", "euforico"}
VESTITI = {
    "semino": {"occhiali", "cuoco", "palla", "chitarra", "surf", "zaino-storto", "lanterna", "cuffie"},
    "semina": {"corona", "montagna", "cavallo", "animale", "paglia", "lucciola", "giacca", "grembiule", "camice", "surf"},
}
SEMINA_DA = 5
MAX_BATTUTA = 110
MAX_NARRA = 120
MAX_ECO = 90
MIN_BATTUTE, MAX_BATTUTE = 4, 10  # il capitolo 5 può arrivare a 10

# Lista nera (guida-dialoghi §3): parole-tema e formule. Solo avvisi.
NERA = [
    r"\binsieme\b", r"\bdivers[iae]\b", r"\bdiversit", r"\bdistanz", r"\bfiduci", r"\bamor[ei]\b", r"\bamar[ei]\b",
    r"\bmanc(a|hi|ato|ata)\b", r"\bmi manchi\b", r"\bpaur[ae]\b", r"\bcap(ì|ito|ire|isco)\b", r"\bimpar", r"\blezion",
    r"\bspecial[ei]\b", r"\bmagic", r"\bmeravigli", r"\bprezios", r"\bcuor[ei]\b", r"\banim[ae]\b", r"\bper sempre\b",
    r"\bin quel momento\b", r"\bper la prima volta\b", r"\bnon (è|era) solo\b", r"\be fu così\b", r"\bda quel giorno\b",
    r"\bl'importante è\b", r"\bquello che conta\b", r"\bgrazie per\b", r"\bmi hai insegnato\b", r"\bti voglio bene\b",
    r"\bscusa,? ma\b", r"\bno,? scusa tu\b", r"—", r"\bcome se\b", r"\bsorris", r"\bsussurr",
]

RE_TITOLO = re.compile(r"^## (\d+) · ([a-z]+) · (.+)$")
RE_META = re.compile(r"^@(vestiti|entra|elemento|eco|fondale|ambiente|comparse|oggetti):\s*(.*)$")
RE_BATTUTA = re.compile(r"^- ([a-z]+)(?: \(([a-z]+)\))?: (.*)$")


def parse(testo):
    capitoli = []
    cap = None
    errori = []
    for n, riga in enumerate(testo.splitlines(), 1):
        riga = riga.rstrip()
        if not riga:
            continue
        m = RE_TITOLO.match(riga)
        if m:
            cap = {"fiore": int(m.group(1)), "luogo": m.group(2), "titolo": m.group(3).strip(),
                   "vestiti": {}, "entra": None, "elemento": None, "fondale": None, "eco": None, "battute": [], "_riga": n}
            capitoli.append(cap)
            continue
        if riga.startswith("#"):
            continue  # intestazioni libere fuori dai capitoli
        if cap is None:
            if riga.startswith("@") or riga.startswith("- "):
                errori.append(f"riga {n}: testo prima del primo capitolo")
            continue
        m = RE_META.match(riga)
        if m:
            k, v = m.group(1), m.group(2).strip()
            if k == "vestiti":
                if v and v != "nessuno":
                    for pezzo in v.split():
                        if "=" not in pezzo:
                            errori.append(f"riga {n}: vestiti malformati '{pezzo}'")
                            continue
                        chi, ves = pezzo.split("=", 1)
                        cap["vestiti"][chi] = ves
            elif k == "entra":
                cap["entra"] = v or None
            elif k == "elemento":
                cap["elemento"] = v or None
            elif k == "fondale":
                cap["fondale"] = v or None
            elif k == "ambiente":
                if "_ambiente" in cap:
                    errori.append(f"riga {n}: @ambiente ripetuto")
                amb = {}
                for pezzo in v.split():
                    if "=" not in pezzo:
                        errori.append(f"riga {n}: ambiente malformato '{pezzo}'")
                        continue
                    chiave, val = pezzo.split("=", 1)
                    if chiave not in ("momento", "meteo") or chiave in amb:
                        errori.append(f"riga {n}: ambiente con chiave '{chiave}' sconosciuta o ripetuta")
                        continue
                    amb[chiave] = val
                cap["_ambiente"] = amb
            elif k in ("comparse", "oggetti"):
                if f"_{k}" in cap:
                    errori.append(f"riga {n}: @{k} ripetuto")
                cap[f"_{k}"] = [x.strip() for x in v.split(",") if x.strip()]
            elif k == "eco":
                if v:
                    if ":" not in v:
                        errori.append(f"riga {n}: eco senza 'chi:'")
                    else:
                        chi, t = v.split(":", 1)
                        cap["eco"] = {"chi": chi.strip(), "testo": t.strip()}
            continue
        m = RE_BATTUTA.match(riga)
        if m:
            cap["battute"].append({"chi": m.group(1), "umore": m.group(2), "testo": m.group(3).strip(), "_riga": n})
            continue
        errori.append(f"riga {n}: riga non riconosciuta: {riga[:60]}")
    return capitoli, errori


def controlla_vocabolario():
    errori = []
    if len(COMPARSE) > MAX_VOC_COMPARSE:
        errori.append(f"ambienti.json: {len(COMPARSE)} comparse > {MAX_VOC_COMPARSE}")
    if len(OGGETTI) > MAX_VOC_OGGETTI:
        errori.append(f"ambienti.json: {len(OGGETTI)} oggetti > {MAX_VOC_OGGETTI}")
    return errori


def controlla_ambiente(c, p, errori, obbligatorio):
    """@ambiente/@comparse/@oggetti: vietati prima del 9, id dal vocabolario, @ambiente obbligatorio se acceso."""
    dentro = AMBIENTE_DA <= c["fiore"] <= AMBIENTE_A
    if not dentro:
        for k in ("ambiente", "comparse", "oggetti"):
            if f"_{k}" in c:
                errori.append(f"{p}: @{k} ammesso solo dal capitolo {AMBIENTE_DA} al {AMBIENTE_A}")
        return
    amb = c.get("_ambiente")
    if amb is None:
        if obbligatorio:
            errori.append(f"{p}: manca @ambiente (obbligatorio dal {AMBIENTE_DA} al {AMBIENTE_A})")
    else:
        if amb.get("momento") not in MOMENTI:
            errori.append(f"{p}: momento '{amb.get('momento')}' non valido ({'|'.join(AMBIENTI['momenti'])})")
        if amb.get("meteo") not in METEO:
            errori.append(f"{p}: meteo '{amb.get('meteo')}' non valido ({'|'.join(AMBIENTI['meteo'])})")
    for k, voc in (("comparse", COMPARSE), ("oggetti", OGGETTI)):
        ids = c.get(f"_{k}", [])
        if len(ids) > MAX_AMBIENTE:
            errori.append(f"{p}: {len(ids)} {k} > {MAX_AMBIENTE}")
        if len(set(ids)) != len(ids):
            errori.append(f"{p}: @{k} con id ripetuti")
        for x in ids:
            if x not in voc:
                errori.append(f"{p}: @{k} '{x}' non è nel vocabolario (src/config/ambienti.json)")


def controlla(capitoli, da=None, a=None, salta=(), obbligatorio=None):
    if obbligatorio is None:
        obbligatorio = AMBIENTE_OBBLIGATORIO
    errori, avvisi = [], []
    attesi = None
    if da is not None and a is not None:
        attesi = [i for i in range(da, a + 1) if i not in salta]
    fiori = [c["fiore"] for c in capitoli]
    if attesi is not None and fiori != attesi:
        errori.append(f"capitoli attesi {attesi[0]}..{attesi[-1]} (salvo {sorted(salta)}), trovati {fiori}")
    if attesi is None and fiori != list(range(0, 101)):
        errori.append(f"attesi i capitoli 0..100 consecutivi, trovati {len(fiori)}: mancano {sorted(set(range(101)) - set(fiori))}")
    sei_mini = 0
    for c in capitoli:
        p = f"cap {c['fiore']} ({c['titolo']})"
        if c["luogo"] not in LUOGHI:
            errori.append(f"{p}: luogo '{c['luogo']}' non valido")
        nb = len(c["battute"])
        lim = MAX_BATTUTE if c["fiore"] == 5 else 8
        if not (MIN_BATTUTE <= nb <= lim):
            errori.append(f"{p}: {nb} battute (servono {MIN_BATTUTE}-{lim})")
        if sum(1 for b in c["battute"] if b["chi"] == "narra") > 2:
            errori.append(f"{p}: più di due note sceniche")
        if c["eco"] is None:
            errori.append(f"{p}: manca @eco")
        else:
            if c["eco"]["chi"] not in PRINCIPALI:
                errori.append(f"{p}: eco di '{c['eco']['chi']}'")
            if len(c["eco"]["testo"]) > MAX_ECO:
                errori.append(f"{p}: eco lunga {len(c['eco']['testo'])} > {MAX_ECO}")
            if c["fiore"] < SEMINA_DA and c["eco"]["chi"] == "semina":
                errori.append(f"{p}: eco di Semina prima del fiore {SEMINA_DA}")
        for chi, v in c["vestiti"].items():
            if chi not in VESTITI:
                errori.append(f"{p}: vestiti per '{chi}'")
            elif v not in VESTITI[chi]:
                errori.append(f"{p}: vestito '{v}' non esiste per {chi}")
            if c["fiore"] < SEMINA_DA and chi == "semina":
                errori.append(f"{p}: vestiti di Semina prima del fiore {SEMINA_DA}")
        controlla_ambiente(c, p, errori, obbligatorio)
        if c["entra"] and c["entra"] not in SECONDARI:
            errori.append(f"{p}: @entra '{c['entra']}' non è un secondario")
        testo_tutto = " ".join(b["testo"] for b in c["battute"]) + " " + (c["eco"]["testo"] if c["eco"] else "")
        if c["fiore"] < SEMINA_DA and re.search(r"\bsemina\b", testo_tutto, re.I):
            errori.append(f"{p}: nomina Semina prima del fiore {SEMINA_DA}")
        if re.search(r"\bsei mini\b", testo_tutto, re.I):
            sei_mini += 1
        for b in c["battute"]:
            q = f"{p} riga {b['_riga']}"
            if b["chi"] not in VOCI:
                errori.append(f"{q}: voce '{b['chi']}' sconosciuta")
            if b["chi"] in PRINCIPALI:
                if b["umore"] is None:
                    errori.append(f"{q}: manca l'umore")
                elif b["umore"] not in UMORI:
                    errori.append(f"{q}: umore '{b['umore']}' non valido")
                if c["fiore"] < SEMINA_DA and b["chi"] == "semina":
                    errori.append(f"{q}: Semina parla prima del fiore {SEMINA_DA}")
            elif b["umore"] is not None:
                errori.append(f"{q}: umore su una voce che non lo ha")
            lim = MAX_NARRA if b["chi"] == "narra" else MAX_BATTUTA
            if len(b["testo"]) > lim:
                errori.append(f"{q}: {len(b['testo'])} caratteri > {lim}")
            if b["chi"] == "narra" and re.search(r"\bsemina\b", b["testo"], re.I) and c["fiore"] < SEMINA_DA:
                errori.append(f"{q}: la nota nomina Semina prima del fiore {SEMINA_DA}")
            for pat in NERA:
                if re.search(pat, b["testo"], re.I):
                    avvisi.append(f"{q}: lista nera /{pat}/ in: {b['testo'][:70]}")
        if c["battute"] and c["battute"][-1]["chi"] not in ("narra",) and re.search(r"[!]{2,}", c["battute"][-1]["testo"]):
            avvisi.append(f"{p}: chiusura con esclamazioni")
    if attesi is None:
        if sei_mini < 6:
            avvisi.append(f"'sei mini' compare in {sei_mini} capitoli (<6)")
        if sei_mini > 15:
            avvisi.append(f"'sei mini' compare in {sei_mini} capitoli (>15%)")
    return errori, avvisi


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--da", type=int)
    ap.add_argument("--a", type=int)
    ap.add_argument("--salta", default="")
    ap.add_argument("--json")
    ap.add_argument("--silenzioso", action="store_true", help="non stampare gli avvisi")
    ap.add_argument("--ambiente-obbligatorio", action="store_true",
                    help=f"@ambiente obbligatorio dal {AMBIENTE_DA} al {AMBIENTE_A} anche con AMBIENTE_OBBLIGATORIO spento")
    args = ap.parse_args()
    testo = Path(args.file).read_text(encoding="utf-8")
    capitoli, err_parse = parse(testo)
    salta = {int(x) for x in args.salta.split(",") if x.strip()}
    errori, avvisi = controlla(capitoli, args.da, args.a, salta, AMBIENTE_OBBLIGATORIO or args.ambiente_obbligatorio)
    errori = controlla_vocabolario() + err_parse + errori
    for e in errori:
        print("ERRORE", e)
    if not args.silenzioso:
        for a in avvisi:
            print("avviso", a)
    print(f"{len(capitoli)} capitoli, {sum(len(c['battute']) for c in capitoli)} battute, {len(errori)} errori, {len(avvisi)} avvisi")
    if errori:
        print("JSON non scritto: ci sono errori")
    elif args.json or args.da is None:
        out = Path(args.json) if args.json else Path(args.file).with_suffix(".json")
        import hashlib
        pulito = [{"_sorgente_sha256": hashlib.sha256(testo.encode("utf-8")).hexdigest(), "_nota": "generato da controlla.py: non modificare a mano"}]
        for c in capitoli:
            d = {k: v for k, v in c.items() if not k.startswith("_")}
            # campi d'ambiente solo se presenti: i capitoli senza righe (0-8, e tutti oggi) restano identici
            if c.get("_ambiente"):
                d["ambiente"] = {"momento": c["_ambiente"]["momento"], "meteo": c["_ambiente"]["meteo"]}
            for k in ("comparse", "oggetti"):
                if c.get(f"_{k}"):
                    d[k] = c[f"_{k}"]
            d["battute"] = [{k: v for k, v in b.items() if not k.startswith("_") and v is not None} for b in c["battute"]]
            pulito.append(d)
        out.write_text(json.dumps(pulito, ensure_ascii=False, indent=1), encoding="utf-8")
        print("scritto", out)
    sys.exit(1 if errori else 0)


if __name__ == "__main__":
    main()
