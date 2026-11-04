// Validazione T5 (validatore indipendente): invarianti e casi limite di capitoli visti, migrazione,
// payload, regali. Solo test: nessuna modifica al codice applicativo.
import { describe, expect, it } from 'vitest';
import { CAPITOLI, SEMINA_ARRIVA_A, chiaveCapitolo } from '../config/capitoli';
import { SBLOCCHI } from '../config/storia';
import { VERSIONE_ARCHIVIO, applicaAzzeramento, migra, unisciStoricoRemoto } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { impronta, leggiPayload, motivoCambio, payloadDa, puoScrivere, unisciRemoto } from '../stato/sync';
import type { VoceStorico } from '../stato/types';
import { chiacchiera } from './regole';
import { codaCapitoli, diario, ecoDaMostrare, ecoDi, seminaSbloccata, segnaVisto } from './capitoli';
import { apriLettore, avanza, capitoloDelLettore, conCapitoloVisto } from './lettore';
import { esporta, importa, ricomincia } from './memoria';

const fino = (n: number) => Array.from({ length: n }, (_, k) => chiaveCapitolo(k));
const base = (x: Partial<Archivio> = {}): Archivio => ({ ...migra(undefined), io: { nome: 'Semino', frase: 'sei mini' }, ...x });
function voce(n: number, iniziata: number, finita = true): VoceStorico {
  return { id: `sudoku-${n}`, modalita: 'sudoku', livello: 'medio', iniziata, secondi: 0, progresso: 1, punti: 0, errori: 0, aggiornata: iniziata, ...(finita ? { finita: iniziata + 1 } : {}) };
}
function prefisso(l: readonly string[]): boolean {
  return l.every((k, i) => k === chiaveCapitolo(i));
}
function controllaInvariante(a: Archivio, dove: string) {
  for (const r of ['a', 'b'] as const) {
    if (!prefisso(a.capitoliVisti[r])) throw new Error(`${dove}: ${r} non è un prefisso: ${a.capitoliVisti[r].join(',')}`);
  }
}

/** PRNG deterministico */
function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('T5 validazione: invariante prefisso', () => {
  it('resta un prefisso dopo 4000 operazioni a caso (segna, unione remota, importa, azzeramento ricevuto, ricomincia, migra, payload sporchi)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const caso = mulberry(seed);
      const n = (k: number) => Math.floor(caso() * k);
      let dev: Archivio[] = [base(), base({ io: { nome: 'Semina', frase: 'sei mini' } }), base()];
      let t = 1000;
      for (let i = 0; i < 200; i++) {
        const k = n(dev.length);
        const altro = dev[n(dev.length)];
        const ruolo = caso() < 0.5 ? 'a' : 'b';
        const op = n(9);
        let x = dev[k];
        if (op === 0) x = conCapitoloVisto(x, ruolo, n(12));
        else if (op === 1) x = unisciRemoto(x, leggiPayload(JSON.parse(JSON.stringify(payloadDa(altro, t))))).archivio;
        else if (op === 2) x = importa(x, esporta(altro))!.archivio;
        else if (op === 3) x = applicaAzzeramento(x, (t += 10));
        else if (op === 4) x = ricomincia(x, (t += 10));
        else if (op === 5) x = migra(JSON.parse(JSON.stringify(x)));
        else if (op === 6) {
          // payload remoto sporco: chiavi sparse, tipi sbagliati, doppioni
          const sporco = { ...payloadDa(altro, t), capitoliVisti: { a: ['capitolo-3', 'capitolo-0', 'capitolo-0', 7], b: 'x' } };
          x = unisciRemoto(x, leggiPayload(sporco)).archivio;
        } else if (op === 7) x = unisciStoricoRemoto(x, [voce(i, (t += 5))], caso() < 0.2 ? t : undefined);
        else x = { ...x, storico: [...x.storico, voce(1000 + i, (t += 5))] };
        controllaInvariante(x, `seed ${seed} passo ${i} op ${op}`);
        dev = dev.map((d, j) => (j === k ? x : d));
      }
    }
  });

  it('"stessa era": dopo un azzeramento ricevuto, i visti vecchi del Worker non tornano né via sync né via importa', () => {
    const vecchio = base({ capitoliVisti: { a: fino(9), b: fino(9) }, storico: [voce(1, 100)] });
    const azzerato = applicaAzzeramento(vecchio, 500);
    expect(azzerato.capitoliVisti).toEqual({ a: [], b: [] });
    expect(azzerato.ecoViste).toEqual([]);
    expect(unisciRemoto(azzerato, payloadDa(vecchio, 1)).archivio.capitoliVisti).toEqual({ a: [], b: [] });
    expect(importa(azzerato, esporta(vecchio))!.archivio.capitoliVisti).toEqual({ a: [], b: [] });
    // e il dispositivo vecchio, ricevendo il nuovo, si svuota (unione per era, non per massimo)
    const nuovo = conCapitoloVisto(azzerato, 'a', 0);
    expect(unisciRemoto(vecchio, payloadDa(nuovo, 2)).archivio.capitoliVisti).toEqual({ a: fino(1), b: [] });
  });
});

describe('T5 validazione: migrazione v1 → v2', () => {
  const v1 = (io: Archivio['io'], tappe: string[]) => ({
    versione: 1,
    io,
    partner: '',
    partita: null,
    storico: [voce(1, 100), voce(2, 200), voce(3, 300), voce(4, 400), voce(5, 500), voce(6, 600)],
    azzerato: 0,
    tappeViste: tappe,
    impostazioni: { mostraErrori: true, vibrazione: true },
    sbloccatiVisti: ['x'],
  });

  it('Blu con semina-5: 0..5 solo in b; Semina sbloccata solo per b', () => {
    const a = migra(v1({ nome: 'Semina', frase: 'f' }, ['semino-1', 'semina-5']));
    expect(a.versione).toBe(VERSIONE_ARCHIVIO);
    expect(a.capitoliVisti).toEqual({ a: [], b: fino(SEMINA_ARRIVA_A + 1) });
    expect(seminaSbloccata(6, a.capitoliVisti.b)).toBe(true);
    expect(seminaSbloccata(6, a.capitoliVisti.a)).toBe(false);
    expect(a.tappeViste).toEqual(['semino-1', 'semina-5']); // inerte, resta in locale
    expect(a.sbloccatiVisti).toEqual(['x']);
  });

  it('io null (archivio senza profilo) con semina-5: nessun visto a nessuno; la coda riparte da 0', () => {
    const a = migra(v1(null, ['semina-5']));
    expect(a.capitoliVisti).toEqual({ a: [], b: [] });
    expect(codaCapitoli(6, a.capitoliVisti.a).map((c) => c.fiore)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('due migrazioni di fila (anche passando da JSON e da leggiPayload) non duplicano né spostano', () => {
    const una = migra(v1({ nome: 'Semino', frase: 'f' }, ['semina-5']));
    const due = migra(JSON.parse(JSON.stringify(una)));
    expect(due).toEqual(una);
    expect(due.capitoliVisti.a).toEqual(fino(6));
    // una copia v2 con `io` cambiato non riapplica il passo (niente visti regalati a b)
    const altroIo = migra({ ...JSON.parse(JSON.stringify(una)), io: { nome: 'Semina', frase: 'f' } });
    expect(altroIo.capitoliVisti).toEqual({ a: fino(6), b: [] });
    // il payload sul Worker non passa dai PASSI
    expect(leggiPayload({ storico: [], tappeViste: ['semina-5'] })!.capitoliVisti).toEqual({ a: [], b: [] });
  });
});

describe('T5 validazione: payload', () => {
  it('campi sconosciuti: leggiPayload → payloadDa → JSON → leggiPayload li conserva; tappeViste non torna', () => {
    const remoto = leggiPayload({ ...payloadDa(base(), 1), bacheca: [{ testo: 'ciao' }], futuro: { x: 1 }, tappeViste: ['semina-5'] })!;
    const scritto = JSON.parse(JSON.stringify(payloadDa(base({ capitoliVisti: { a: fino(2), b: [] } }), 2, remoto)));
    expect(scritto.bacheca).toEqual([{ testo: 'ciao' }]);
    expect(scritto.futuro).toEqual({ x: 1 });
    expect(scritto).not.toHaveProperty('tappeViste');
    const riletto = leggiPayload(scritto)!;
    expect(riletto.bacheca).toEqual([{ testo: 'ciao' }]);
    expect(riletto.capitoliVisti).toEqual({ a: fino(2), b: [] });
  });

  it('versioneDati 3 sul Worker: puoScrivere = false', () => {
    expect(puoScrivere(leggiPayload({ ...payloadDa(base(), 1), versioneDati: 3 }))).toBe(false);
  });

  it('motivoCambio/impronta: reagiscono a segnaVisto, non a cambi di soli extra o di eco', () => {
    const a = base({ capitoliVisti: { a: fino(1), b: [] } });
    const visto = conCapitoloVisto(a, 'a', 1);
    expect(motivoCambio(a, visto)).toBe('cambio');
    expect(impronta(payloadDa(visto, 1))).not.toBe(impronta(payloadDa(a, 1)));
    for (const extra of [{ ecoViste: ['eco-0'] }, { sbloccatiVisti: ['y'] }, { regaliBonus: 3 }, { tappeViste: ['z'] }, { futuro: 1 }]) {
      const b = { ...a, ...extra } as Archivio;
      expect(motivoCambio(a, b)).toBeNull();
      expect(impronta(payloadDa(b, 1))).toBe(impronta(payloadDa(a, 1)));
    }
  });
});

describe('T5 validazione: regali', () => {
  it('`regalo` non è più in SBLOCCHI', () => {
    expect(SBLOCCHI.some((s) => (s.sblocco.tipo as string) === 'regalo')).toBe(false);
  });

  it('due dispositivi dello stesso ruolo: dopo l\'unione col remoto, rileggere non riaccredita', () => {
    const d1 = conCapitoloVisto(base({ capitoliVisti: { a: fino(1), b: [] } }), 'a', 1);
    expect(d1.regaliBonus).toBe(1);
    const d2 = unisciRemoto(base({ capitoliVisti: { a: fino(1), b: [] } }), payloadDa(d1, 1)).archivio;
    const d2letto = conCapitoloVisto(d2, 'a', 1);
    expect(d2letto.regaliBonus ?? 0).toBe(0);
  });

  it('SCOSTAMENTO (accettato?): se i due dispositivi dello stesso ruolo leggono prima di sincronizzarsi, il regalo è accreditato due volte', () => {
    const prima = base({ capitoliVisti: { a: fino(1), b: [] } });
    const d1 = conCapitoloVisto(prima, 'a', 1);
    const d2 = conCapitoloVisto(prima, 'a', 1);
    // ognuno tiene il suo regaliBonus locale (non sincronizzato): 2 suggerimenti per un capitolo
    expect((d1.regaliBonus as number) + (d2.regaliBonus as number)).toBe(2);
    // l'unione dei visti poi converge, ma i regali restano due
    const u = unisciRemoto(d2, payloadDa(d1, 1)).archivio;
    expect(u.regaliBonus).toBe(1);
  });
});

describe('T5 validazione: lettore', () => {
  it('coda congelata, "Dopo" non segna, chiusura a metà non segna, onContinua segna solo quel capitolo', () => {
    let a = base({ storico: [voce(1, 1), voce(2, 2), voce(3, 3), voce(4, 4)] });
    const l = apriLettore(4, a.capitoliVisti.a, 'vittoria', 0)!;
    expect(l.chiedi).toBe(true);
    expect(l.coda).toEqual([0, 1, 2, 3, 4]);
    // "Dopo": nessuna modifica all'archivio; la coda resta intera
    expect(codaCapitoli(4, a.capitoliVisti.a)).toHaveLength(5);
    // leggo il primo, poi chiudo l'app a metà del secondo
    const l2 = { ...l, chiedi: false };
    a = conCapitoloVisto(a, 'a', capitoloDelLettore(l2)!.fiore);
    expect(a.capitoliVisti).toEqual({ a: fino(1), b: [] });
    expect(capitoloDelLettore(avanza(l2))!.fiore).toBe(1);
    expect(codaCapitoli(4, a.capitoliVisti.a)[0].fiore).toBe(1);
    // un fiore nuovo mentre leggo: la coda del lettore non cresce
    expect(avanza({ ...l2, pos: 4 })).toBeNull();
  });

  it('capitolo 0 a fiori 0: coda [0], dalla Home niente foglio', () => {
    const l = apriLettore(0, [], 'home', 0)!;
    expect(l.coda).toEqual([0]);
    expect(l.chiedi).toBe(false);
  });
});

describe('T5 validazione: Semina prima del 5', () => {
  it('capitoli 0-4: né titoli, né battute, né eco, né diario nominano Semina', () => {
    for (const c of CAPITOLI.slice(0, SEMINA_ARRIVA_A)) {
      expect(JSON.stringify(c)).not.toMatch(/semina/i);
    }
    const d = diario(fino(5));
    expect(JSON.stringify(d)).not.toMatch(/semina/i);
    expect(ecoDi(fino(5), 'semina')).toEqual([]);
    expect(ecoDaMostrare(fino(5), [])!.chi).toBe('semino');
  });

  it('telefono nuovo con fiori ≥ 5 e visti vuoti: non sbloccata; le chiacchiere con eco non nominano Semina', () => {
    expect(seminaSbloccata(9, [])).toBe(false);
    expect(seminaSbloccata(9, fino(5))).toBe(false);
    const eco = ecoDi(fino(5), 'semino');
    for (let i = 0; i < 200; i++) {
      const t = chiacchiera('semino', [], { nome: 'Mati', io: 'Genna' }, mulberry(i), { fiori: 9, sbloccata: false, eco });
      expect(t).not.toMatch(/semina/i);
    }
  });
});

describe('T5 validazione: segnaVisto fuori ordine', () => {
  it('un capitolo oltre il primo non visto non entra (niente buchi)', () => {
    const v = segnaVisto({ a: fino(2), b: [] }, 'a', 5);
    expect(v.a).toEqual(fino(2));
  });
});
