// Screenshot del lettore dei capitoli con gli ambienti (T9 C) e controllo delle sovrapposizioni.
// Uso: node scripts/qa/ambienti-foto.mjs [urlBase] [cartella] [capitoli]
//   default http://localhost:5173/sudoku/ e docs/design/img; basta il dev server (niente PeerJS).
//   capitoli (es. 21,50,62): foto solo di quelli, a 390×844 e alla prima battuta, al posto della lista sotto.
//   CHROME=/percorso/del/browser per usare un Chrome installato.
// Per ogni capitolo della lista apre il lettore come dopo una vittoria (scripts/qa/lettore-ambienti.tsx),
// va alla battuta indicata e salva t9-ambienti-<n>-<luogo>-<L>x<A>.png, con reduced-motion (immagini
// ferme e ripetibili). Esce con 1 se un pezzo della striscia tocca mascotte, secondari, fumetto, nota,
// testa o piede, o se un pezzo esce dallo schermo.
import { chromium } from './comune.mjs';

const base = process.argv[2] ?? 'http://localhost:5173/sudoku/';
const cartella = process.argv[3] ?? 'docs/design/img';

/** [capitolo, battuta da fotografare, perché] */
const scelti = process.argv[4]?.split(',').map(Number);
const CAPITOLI = scelti ? scelti.map((n) => [n, 0, 'a scelta']) : [
  [13, 1, 'giardino: rane allo stagno, sasso delle misure, nuvole'],
  [23, 2, 'mare: gabbiani e ombrellone, con Pinza'],
  [26, 1, 'mare: la tavola sul muretto, Semino col vestito palla'],
  [41, 1, 'montagna: marmotta, carrucola e corda col nodo'],
  [45, 1, 'bosco: alba, lanterna spenta, scoiattolo, piuma e bacca sul ramo'],
  [46, 1, 'bosco: pioggia, niente lucciole'],
  [48, 1, 'bosco: notte con le lucciole'],
  [55, 1, 'città: notte, tram e falene al lampione'],
  [77, 1, 'cucina: lettera sotto il piatto, piantina'],
  [83, 1, 'montagna: sera con la neve, carrucola e secchio'],
  [84, 1, 'lontano (treno): lettera sulla mensola, zaino e nodo'],
  [100, 1, 'ritorno: tramonto, bastoncino, biscotti, sasso delle misure'],
];
const STRETTI = [55, 77];
const MISURE = scelti
  ? [[390, 844]]
  : [
      [390, 844],
      [360, 640],
    ];

/**
 * Nella pagina: i pezzi della striscia non toccano mascotte, secondari, fumetto, nota, lettera, testa, piede
 * (anche il posto di "Continua", che compare a fine capitolo: gli ultimi 92 px) né fra loro, e restano
 * nello schermo. I pezzi sul fondale stanno sotto per scelta (z 0) e non si controllano.
 */
function controlla() {
  const box = (el) => el.getBoundingClientRect();
  const tocca = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const altri = [
    ...document.querySelectorAll(
      '.capitolo-attore > .semino, .capitolo-secondario, .capitolo-fumetto, .capitolo-nota, .capitolo-lettera, .capitolo-testa, .capitolo-punti, .capitolo-continua',
    ),
  ].map((a) => [String(a.className.baseVal ?? a.className).split(' ')[0], box(a)]);
  altri.push(['posto di Continua', { left: 0, right: innerWidth, top: innerHeight - 92, bottom: innerHeight }]);
  const urti = [];
  const fuori = [];
  const pezzi = [...document.querySelectorAll('.amb-pezzo')];
  const striscia = pezzi.filter((p) => p.dataset.posto === 'striscia').map((p) => [p.dataset.comparsa ?? p.dataset.oggetto, box(p)]);
  striscia.forEach(([nome, b], i) => {
    for (const [n, a] of altri) if (tocca(b, a)) urti.push(`${nome} × ${n}`);
    for (const [n, a] of striscia.slice(i + 1)) if (tocca(b, a)) urti.push(`${nome} × ${n}`);
    if (b.left < 0 || b.right > innerWidth || b.bottom > innerHeight) fuori.push(nome);
  });
  return { pezzi: pezzi.map((p) => `${p.dataset.comparsa ?? p.dataset.oggetto}@${p.dataset.posto}`), urti, fuori };
}

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let errori = 0;
for (const [w, h] of MISURE) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  page.on('pageerror', (e) => {
    errori++;
    console.error('errore nella pagina', e.message);
  });
  // la pagina dell'app (col preambolo di React di Vite); il banco di prova sostituisce il body
  await page.goto(base);
  for (const [fiore, battuta, perche] of CAPITOLI) {
    if (w !== 390 && !STRETTI.includes(fiore)) continue;
    const luogo = await page.evaluate(async (f) => {
      const root = location.pathname;
      const m = await import(`${root}scripts/qa/lettore-ambienti.tsx`);
      m.monta(f);
      const c = await import(`${root}src/config/capitoli.ts`);
      return c.CAPITOLI[f].luogo;
    }, fiore);
    await page.getByTestId('capitolo-scena').waitFor();
    await page.waitForTimeout(500);
    for (let k = 0; k < battuta; k++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(360);
    }
    await page.waitForTimeout(500);
    const r = await page.evaluate(controlla);
    const file = `${cartella}/t9-ambienti-${fiore}-${luogo}-${w}x${h}.png`;
    await page.screenshot({ path: file });
    const ok = r.urti.length === 0 && r.fuori.length === 0;
    if (!ok) errori++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${w}x${h} cap ${fiore} (${perche}) → ${file} · ${r.pezzi.join(', ') || 'niente'}${r.urti.length ? ` · urti: ${r.urti.join('; ')}` : ''}${r.fuori.length ? ` · fuori: ${r.fuori.join(', ')}` : ''}`);
  }
  // tutti i capitoli 9-100 a questa misura, alla prima battuta: solo il controllo, niente foto
  let pezziTotali = 0;
  for (let n = 9; n <= 100; n++) {
    await page.evaluate(async (f) => (await import(`${location.pathname}scripts/qa/lettore-ambienti.tsx`)).monta(f), n);
    await page.waitForTimeout(150);
    const r = await page.evaluate(controlla);
    pezziTotali += r.pezzi.length;
    if (r.urti.length || r.fuori.length) {
      errori++;
      console.log(`FAIL ${w}x${h} cap ${n} · urti: ${r.urti.join('; ')} · fuori: ${r.fuori.join(', ')}`);
    }
  }
  console.log(`${w}x${h}: capitoli 9-100 controllati (${pezziTotali} pezzi)`);
  await page.close();
}
await browser.close();
process.exit(errori ? 1 : 0);
