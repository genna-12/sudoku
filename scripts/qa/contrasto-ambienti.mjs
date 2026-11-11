// Validazione T9 C: contrasto del testo crema (titolo, etichetta, nota, nome) sui cieli dei capitoli 9-100,
// misurato pixel per pixel col testo nascosto (senza contare text-shadow). Più alcune foto extra.
// Uso: [NOFOTO=1] [TEMI=scuro,chiaro] node scripts/qa/contrasto-ambienti.mjs <urlBase> <cartella>
import { chromium } from './comune.mjs';

const base = process.argv[2];
const out = process.argv[3];

const lum = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

async function apri(page, f) {
  await page.evaluate(async (n) => (await import(`${location.pathname}scripts/qa/lettore-ambienti.tsx`)).monta(n), f);
  await page.getByTestId('capitolo-scena').waitFor();
  await page.waitForTimeout(400);
}
async function avanti(page) {
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(340);
}

/** misura il contrasto di un elemento: testo nascosto, foto della sua area, contrasto pixel per pixel col colore del testo */
async function misura(page, sel) {
  const el = page.locator(sel).first();
  if (!(await el.count())) return null;
  const info = await el.evaluate((e) => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    // area del testo: un rettangolo per riga (Range), così il velo che sfuma ai bordi non conta
    const range = document.createRange();
    range.selectNodeContents(e);
    const righe = [...range.getClientRects()].map((q) => ({ x: q.x, y: q.y, w: q.width, h: q.height }));
    const colore = cs.color;
    e.style.setProperty('color', 'transparent', 'important');
    e.style.setProperty('text-shadow', 'none', 'important');
    return { colore, box: { x: r.x, y: r.y, w: r.width, h: r.height }, righe };
  });
  await page.waitForTimeout(60);
  const png = await page.screenshot({ type: 'png' });
  await el.evaluate((e) => {
    e.style.removeProperty('color');
    e.style.removeProperty('text-shadow');
  });
  // decodifica col canvas della pagina
  const pixel = await page.evaluate(
    async ({ b64, righe }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const px = [];
      for (const q of righe) {
        const d = x.getImageData(Math.max(0, Math.round(q.x)), Math.max(0, Math.round(q.y)), Math.max(1, Math.round(q.w)), Math.max(1, Math.round(q.h))).data;
        for (let i = 0; i < d.length; i += 4 * 3) px.push([d[i], d[i + 1], d[i + 2]]);
      }
      return px;
    },
    { b64: png.toString('base64'), righe: info.righe },
  );
  let m = info.colore.match(/[\d.]+/g).map(Number);
  if (info.colore.startsWith("color(")) m = [m[0] * 255, m[1] * 255, m[2] * 255, m[3] ?? 1];
  // colore con alfa (color-mix con transparent): composto sullo sfondo medio
  const media = pixel.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / pixel.length);
  const alfa = m.length > 3 ? m[3] : 1;
  const testo = [0, 1, 2].map((i) => m[i] * alfa + media[i] * (1 - alfa));
  const rapporti = pixel.map((p) => cr(testo, p)).sort((a, b) => a - b);
  const q = (t) => rapporti[Math.floor(t * (rapporti.length - 1))];
  return { min: q(0), p5: q(0.05), mediana: q(0.5), colore: info.colore };
}

const CIELI = [
  [10, 'alba giardino'],
  [14, 'alba nuvole giardino'],
  [45, 'alba bosco'],
  [36, 'alba montagna'],
  [21, 'mattina mare'],
  [26, 'mattina mare'],
  [28, 'mattina montagna'],
  [33, 'mattina nuvole montagna'],
  [62, 'mattina nebbia citta'],
  [79, 'mattina treno'],
  [84, 'mattina nuvole treno'],
  [90, 'mattina nebbia stazione'],
  [93, 'mattina giardino'],
  [12, 'giorno giardino'],
  [15, 'giorno mare'],
  [17, 'giorno mare (nome Pinza)'],
  [18, 'giorno nuvole mare'],
  [23, 'giorno mare (nome Pinza)'],
  [29, 'giorno montagna'],
  [34, 'giorno montagna (nome Nonna Capra)'],
  [37, 'giorno vento montagna'],
  [80, 'giorno piazza (nome Grillo)'],
  [91, 'giorno giardino'],
  [98, 'giorno nuvole giardino'],
  [19, 'tramonto mare'],
  [35, 'tramonto montagna'],
  [49, 'tramonto bosco'],
  [100, 'tramonto giardino'],
];

const browser = await chromium.launch();
const risultati = [];
for (const tema of (process.env.TEMI ?? "scuro").split(",")) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: tema === 'chiaro' ? 'light' : 'dark' });
  await page.goto(base);
  await page.evaluate((t) => (document.documentElement.dataset.tema = t), tema);
  for (const [f, perche] of CIELI) {
    await apri(page, f);
    const n = await page.evaluate(async (k) => (await import(`${location.pathname}src/config/capitoli.ts`)).CAPITOLI[k].battute.length, f);
    const visti = {};
    for (let b = 0; b < n; b++) {
      for (const sel of ['.capitolo-titolo', '.capitolo-etichetta', '.capitolo-nota', '.capitolo-nome']) {
        if (visti[sel]) continue;
        const r = await misura(page, sel);
        if (r) {
          visti[sel] = r;
          risultati.push({ tema, f, perche, sel, ...r });
        }
      }
      if (b < n - 1) await avanti(page);
    }
  }
  await page.close();
}
for (const r of risultati) console.log(`${r.tema.padEnd(6)} cap ${String(r.f).padStart(3)} ${r.perche.padEnd(34)} ${r.sel.padEnd(20)} min ${r.min.toFixed(2)}  p5 ${r.p5.toFixed(2)}  mediana ${r.mediana.toFixed(2)}  (${r.colore})`);

if (process.env.NOFOTO) { await browser.close(); process.exit(0); }
// foto extra
const foto = async (w, h, tema, f, fine, nome) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', colorScheme: tema === 'chiaro' ? 'light' : 'dark', deviceScaleFactor: 1 });
  await page.goto(base);
  await page.evaluate((t) => (document.documentElement.dataset.tema = t), tema);
  await apri(page, f);
  if (fine) {
    const n = await page.evaluate(async (k) => (await import(`${location.pathname}src/config/capitoli.ts`)).CAPITOLI[k].battute.length, f);
    for (let b = 1; b < n; b++) await avanti(page);
    await page.waitForTimeout(900);
  } else {
    await avanti(page);
  }
  await page.screenshot({ path: `${out}/${nome}` });
  await page.close();
};
await foto(390, 844, 'chiaro', 15, false, 't9-val-15-mare-chiaro-390x844.png');
await foto(390, 844, 'chiaro', 45, false, 't9-val-45-bosco-chiaro-390x844.png');
await foto(390, 844, 'chiaro', 13, false, 't9-val-13-giardino-chiaro-390x844.png');
await foto(390, 844, 'scuro', 10, false, 't9-val-10-giardino-alba-390x844.png');
await foto(390, 844, 'scuro', 33, false, 't9-val-33-montagna-mattina-nuvole-390x844.png');
await foto(390, 844, 'scuro', 62, false, 't9-val-62-citta-nebbia-390x844.png');
await foto(360, 640, 'scuro', 100, true, 't9-val-100-fine-360x640.png');
await foto(360, 640, 'scuro', 84, true, 't9-val-84-fine-360x640.png');
await foto(360, 640, 'scuro', 41, true, 't9-val-41-fine-360x640.png');
await foto(360, 640, 'scuro', 13, true, 't9-val-13-fine-360x640.png');
await foto(844, 390, 'scuro', 41, false, 't9-val-41-orizzontale-844x390.png');
await foto(844, 390, 'scuro', 100, true, 't9-val-100-orizzontale-fine-844x390.png');
await foto(844, 390, 'scuro', 77, false, 't9-val-77-orizzontale-844x390.png');
await browser.close();
