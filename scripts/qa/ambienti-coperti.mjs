// Validazione T9 C: i pezzi dell'ambiente legati al fondale restano visibili in tutte le battute?
// Per ogni capitolo e misura scorre tutte le battute e segnala i pezzi "fondale" coperti da fumetto, nome,
// nota, lettera, testa o puntini, o fuori dallo schermo (rettangoli dei disegni; i pezzi della striscia li
// controlla già ambienti-foto.mjs).
// Uso: node scripts/qa/ambienti-coperti.mjs [urlBase] [capitoli, es. 41,45] [misure, es. 390x844,844x390]
//   default: tutti i capitoli 9-100 con pezzi sul fondale, a 390×844, 360×640 e 844×390. Esce con 1 se c'è un pezzo coperto.
import { chromium } from './comune.mjs';

const base = process.argv[2] ?? 'http://localhost:5173/sudoku/';
const scelti = process.argv[3] ? process.argv[3].split(',').map(Number) : undefined;
const MISURE = (process.argv[4] ?? '390x844,360x640,844x390').split(',').map((m) => m.split('x').map(Number));
/** quanto di un pezzo può stare sotto qualcosa (frazione dell'area) prima di dirlo coperto */
const SOGLIA = 0.25;

function guarda(SOGLIA) {
  const box = (el) => el.getBoundingClientRect();
  const sopra = [
    ...document.querySelectorAll('.capitolo-fumetto, .capitolo-nome, .capitolo-nota, .capitolo-lettera, .capitolo-titoli, .capitolo-indietro, .capitolo-punti'),
  ].map((a) => [String(a.className).split(' ')[0], box(a)]);
  const out = [];
  for (const p of document.querySelectorAll('.amb-pezzo[data-posto="fondale"]')) {
    const b = box(p);
    const area = Math.max(1, b.width * b.height);
    const nome = p.dataset.comparsa ?? p.dataset.oggetto;
    // la parte dentro lo schermo
    const vis = Math.max(0, Math.min(b.right, innerWidth) - Math.max(b.left, 0)) * Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
    if (vis / area < 1 - SOGLIA) out.push(`${nome} fuori schermo (${Math.round((1 - vis / area) * 100)}%)`);
    for (const [n, a] of sopra) {
      const w = Math.min(b.right, a.right) - Math.max(b.left, a.left);
      const h = Math.min(b.bottom, a.bottom) - Math.max(b.top, a.top);
      if (w > 0 && h > 0 && (w * h) / area > SOGLIA) out.push(`${nome} sotto ${n} (${Math.round(((w * h) / area) * 100)}%)`);
    }
  }
  return out;
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let coperti = 0;
for (const [w, h] of MISURE) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await page.goto(base);
  await page.waitForLoadState('networkidle').catch(() => {});
  const lista = scelti ?? (await page.evaluate(async () => {
    const { CAPITOLI } = await import(`${location.pathname}src/config/capitoli.ts`);
    return CAPITOLI.filter((c) => c.fiore >= 9 && (c.comparse?.length || c.oggetti?.length)).map((c) => c.fiore);
  }));
  for (const f of lista) {
    const n = await page.evaluate(async (k) => {
      (await import(`${location.pathname}scripts/qa/lettore-ambienti.tsx`)).monta(k);
      return (await import(`${location.pathname}src/config/capitoli.ts`)).CAPITOLI[k].battute.length;
    }, f);
    await page.getByTestId('capitolo-scena').waitFor();
    await page.waitForTimeout(150);
    const visti = new Set();
    for (let b = 0; b < n; b++) {
      for (const r of await page.evaluate(guarda, SOGLIA)) visti.add(`b${b + 1} ${r}`);
      if (b < n - 1) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(320);
      }
    }
    if (visti.size) {
      coperti++;
      console.log(`COPERTO ${w}x${h} cap ${f}: ${[...visti].join('; ')}`);
    }
  }
  console.log(`${w}x${h}: ${lista.length} capitoli guardati`);
  await page.close();
}
await browser.close();
process.exit(coperti ? 1 : 0);
