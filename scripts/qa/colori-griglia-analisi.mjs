// Analisi delle misure di colori-griglia.mjs: contrasto WCAG e differenza di colore (CIEDE2000) tra stati vicini.
// Uso: node scripts/qa/colori-griglia-analisi.mjs <cartellaOut> [modalita] [json]
import { readFileSync } from 'node:fs';

const OUT = process.argv[2];
const MODALITA = process.argv[3] ?? 'sudoku';
const COME_JSON = process.argv[4] === 'json';

const lin = (c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const wcag = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const lab = (rgb) => {
  const [r, g, b] = rgb.map(lin);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
export function deltaE(c1, c2) {
  const [L1, a1, b1] = lab(c1);
  const [L2, a2, b2] = lab(c2);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1;
  const ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1);
  const Cp2 = Math.hypot(ap2, b2);
  const hp = (b, a) => (Math.atan2(b, a) / rad + 360) % 360;
  const h1 = hp(b1, ap1);
  const h2 = hp(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh * rad) / 2);
  const Lm = (L1 + L2) / 2;
  const Cpm = (Cp1 + Cp2) / 2;
  let hm = h1 + h2;
  if (Cp1 * Cp2 === 0) hm = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) hm = (h1 + h2) / 2;
  else hm = (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2;
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * Cpm;
  const Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

/** Coppie di stati VICINI da confrontare: [etichetta, statoA, statoB, cosa] (cosa: bg = sfondi, ring = anello vs sfondo). */
export const COPPIE = [
  ['riga/colonna/box evidenziati vs cella vuota', 'vicina', 'vuota'],
  ['evidenziata vs numero uguale', 'vicina', 'stessa'],
  ['evidenziata vs cella selezionata', 'vicina', 'selezionata'],
  ['numero uguale vs cella selezionata', 'stessa', 'selezionata'],
  ['numero uguale vs vuota', 'stessa', 'vuota'],
  ['numero uguale vs faro (doppio tocco)', 'stessa', 'faro'],
  ['mia vs vuota (fondo)', 'mia', 'vuota'],
  ['sua vs vuota (fondo)', 'sua', 'vuota'],
  ['mia vs sua (fondo)', 'mia', 'sua'],
  ['mia dentro la riga evidenziata vs evidenziata vuota', 'mia vicina', 'vicina'],
  ['sua dentro la riga evidenziata vs evidenziata vuota', 'sua vicina', 'vicina'],
  ['errore vs vuota', 'errore', 'vuota'],
  ['errore vs evidenziata', 'errore', 'vicina'],
  ['errore con numero uguale vs numero uguale senza errore', 'errore stessa', 'stessa'],
  ['errore selezionato vs selezionata senza errore', 'errore selezionata', 'selezionata'],
  ['mia selezionata vs selezionata vuota', 'mia selezionata', 'selezionata'],
  ['partner sulla stessa cella della mia selezione vs solo mia selezione (fondo)', 'partner selezionata', 'selezionata'],
];

export function analizza(m, schema, riempimento = false) {
  const s = m.stati;
  const bg = (k) => s[k].bg;
  const righe = COPPIE.map(([et, a, b]) => ({ et, a, b, de: deltaE(bg(a), bg(b)), cr: wcag(bg(a), bg(b)) }));
  const anelli = [];
  // indicatore di una cella: anello a box-shadow, oppure bordo dello strato ::after, oppure (proposta "pieni") il riempimento
  const ring = (k) => {
    if (s[k].bordo && s[k].bordo.spessore >= 2.5) return s[k].bordo.colore;
    const a = s[k].anello;
    if (a && a.diffusione >= 2.5 && !riempimento) return a.colore;
    return riempimento ? s[k].bg : (a?.colore ?? s[k].bordo?.colore);
  };
  const aggiungi = (et, c1, c2) => anelli.push({ et, de: deltaE(c1, c2), cr: wcag(c1, c2) });
  aggiungi('anello della mia selezione vs suo fondo', ring('selezionata'), bg('selezionata'));
  aggiungi('anello della mia selezione vs riga evidenziata accanto', ring('selezionata'), bg('vicina'));
  aggiungi('anello della mia selezione vs cella vuota accanto', ring('selezionata'), bg('vuota'));
  aggiungi('anello del partner vs cella vuota', ring('partner'), bg('vuota'));
  aggiungi('anello del partner vs riga evidenziata', ring('partner'), bg('partner vicina'));
  if (s['vicina-suo'] && s['vicina-suo'].bg.join() !== s.vuota.bg.join()) aggiungi('anello del partner vs SUA riga evidenziata (fascia blu)', ring('partner'), bg('vicina-suo'));
  aggiungi('anello del partner vs numero uguale', ring('partner'), bg('partner stessa'));
  aggiungi('anello mio (selezione) vs anello del partner (colore)', ring('selezionata'), ring('partner'));
  aggiungi('anello partner vs anello selezione, quando coincidono: resta uno solo', ring('partner selezionata'), ring('selezionata'));
  if (s.partner.alone?.colore) aggiungi('alone interno del partner (pieno) vs vuota', s.partner.alone.colore, bg('vuota'));
  const testi = [];
  for (const k of ['data', 'mia', 'mia vicina', 'mia stessa', 'mia selezionata', 'sua', 'sua vicina', 'sua stessa', 'sua selezionata', 'data vicina', 'data stessa', 'data selezionata', 'errore', 'errore vicina', 'errore stessa', 'errore selezionata'])
    testi.push({ k, cr: wcag(s[k].testo, s[k].bg) });
  // mio-testo e suo-testo su sfondi diversi dalle celle "mia/sua": come appaiono davvero (mia = classe mia + vicina ecc.)
  return { righe, anelli, testi, vars: m.vars };
}

if (process.argv[1].endsWith('colori-griglia-analisi.mjs')) {
  const tutto = {};
  for (const schema of ['scuro', 'chiaro']) {
    const j = JSON.parse(readFileSync(`${OUT}/misure-${MODALITA}-${schema}.json`, 'utf8'));
    for (const [nome, m] of Object.entries(j.misure)) {
      tutto[nome] ??= {};
      tutto[nome][schema] = analizza(m, schema, nome.startsWith('c-'));
    }
  }
  if (COME_JSON) console.log(JSON.stringify(tutto, null, 1));
  else
    for (const [nome, per] of Object.entries(tutto)) {
      console.log(`\n===== ${nome} =====`);
      for (const schema of ['scuro', 'chiaro']) {
        const a = per[schema];
        console.log(`--- ${schema}: sfondi (dE2000 / contrasto)`);
        for (const r of a.righe) console.log(`${r.de.toFixed(1).padStart(5)} ${r.cr.toFixed(2).padStart(5)}  ${r.et}`);
        console.log('--- anelli');
        for (const r of a.anelli) console.log(`${r.de.toFixed(1).padStart(5)} ${r.cr.toFixed(2).padStart(5)}  ${r.et}`);
        console.log('--- numeri su sfondo');
        console.log(a.testi.map((t) => `${t.k}:${t.cr.toFixed(1)}`).join('  '));
      }
    }
}
