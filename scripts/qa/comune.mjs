// Aiuti comuni agli E2E della storia (arrivo-semina, capitoli-di-fila): browser, attese, archivi
// costruiti nella pagina con i moduli veri (import dinamico dal dev server), lettura dei capitoli.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();

export const base = process.argv[2] ?? 'http://localhost:5173/sudoku/';
export const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
export const log = [];

export function fallisci(msg) {
  console.error('FAIL', msg);
  console.log(log.slice(-25).join('\n'));
  process.exit(1);
}

export async function finche(f, ms, msg) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (await f()) return;
    await attendi(150);
  }
  fallisci(typeof msg === 'function' ? await msg() : msg);
}

export const visibile = (page, id) => page.getByTestId(id).isVisible().catch(() => false);

export async function contesto(browser, nome, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => log.push(`[${nome}] ${m.text()}`));
  page.on('pageerror', (e) => log.push(`[${nome}] uncaught ${e.message}`));
  return { ctx, page, nome };
}

/**
 * Archivio della versione 1 (prima dei capitoli) costruito nella pagina con engine e stato veri e
 * scritto in localStorage PRIMA di aprire l'app; poi l'app si apre in Home.
 * o: { nome, frase, fiori, viste (tappe di T2-T4), seed, mancanti (celle lasciate vuote) }
 * Restituisce le celle mancanti [[idx, valore], ...].
 */
export async function scriviArchivio(page, o) {
  await page.goto(new URL('src/engine/index.ts', base).href);
  await page.evaluate(async (o) => {
    const root = location.pathname.replace(/src\/engine\/index\.ts$/, '');
    const eng = await import(`${root}src/engine/index.ts`);
    const st = await import(`${root}src/stato/index.ts`);
    const T0 = Date.now() - 3_600_000;
    const storico = [];
    for (let k = 1; k <= o.fiori; k++) {
      const p = st.nuovaPartita(eng.generaPuzzle('sudoku', 'semini', 500 + k), T0 + k * 10000);
      storico.push(st.voceStorico(st.applica(p, { tipo: 'finita', ts: p.iniziata + 5000 })));
    }
    const puzzle = eng.generaPuzzle('sudoku', 'semini', o.seed);
    let partita = st.nuovaPartita(puzzle, T0 + 900000);
    const vuote = puzzle.dati.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
    vuote.slice(0, vuote.length - o.mancanti).forEach((i, n) => {
      partita = st.applica(partita, { tipo: 'cella', idx: i, v: puzzle.soluzione[i], note: [], da: n % 2 ? 'b' : 'a', ts: T0 + 900001 + n });
    });
    const a = {
      versione: 1,
      io: { nome: o.nome, frase: o.frase },
      partner: o.nome === 'Semino' ? 'Semina' : 'Semino',
      partita,
      storico: [...storico, st.voceStorico(partita)],
      azzerato: 0,
      tappeViste: o.viste,
      impostazioni: { mostraErrori: true, vibrazione: true },
    };
    localStorage.clear();
    localStorage.setItem('sudoku-coppia-archivio', JSON.stringify(a));
    sessionStorage.setItem('qa-ultime', JSON.stringify(vuote.slice(vuote.length - o.mancanti).map((i) => [i, puzzle.soluzione[i]])));
  }, o);
  const ultime = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qa-ultime')));
  await page.goto(base);
  await page.getByTestId('home').waitFor({ timeout: 10000 });
  return ultime;
}

/** Dalla Home alla partita in corso. */
export async function continua(page) {
  await page.getByTestId('continua').click();
  await page.getByTestId('griglia').waitFor({ timeout: 10000 });
}

/** Testo del bottone "N capitoli da leggere" in Home ('' se non c'è). */
export async function daLeggere(page) {
  return (await visibile(page, 'capitoli-da-leggere')) ? ((await page.getByTestId('capitoli-da-leggere').textContent()) ?? '').trim() : '';
}

/**
 * Tocca il capitolo aperto battuta per battuta (pause > 300 ms, lontano dall'angolo in alto a sinistra)
 * fino a "Continua". `fermaA`: si ferma a quella battuta senza finire. Controlla che nessuna battuta
 * venga saltata. Restituisce { fiore, battute, etichetta } (etichetta = testo del bottone finale).
 */
export async function leggiCapitolo(page, { fermaA, premi = true } = {}) {
  const scena = page.getByTestId('capitolo-scena');
  await scena.waitFor({ timeout: 8000 });
  const fiore = Number(await scena.getAttribute('data-fiore'));
  const { width, height } = page.viewportSize();
  let passo = Number(await scena.getAttribute('data-battuta'));
  if (passo !== 0) fallisci(`capitolo ${fiore}: si apre alla battuta ${passo}`);
  for (let k = 0; k < 60; k++) {
    if (fermaA !== undefined && passo >= fermaA) return { fiore, battute: passo + 1, etichetta: '' };
    if (await visibile(page, 'capitolo-continua')) break;
    await attendi(380);
    await page.mouse.click(Math.round(width * 0.62), Math.round(height * 0.52));
    const ora = Number(await scena.getAttribute('data-battuta').catch(() => passo));
    if (ora !== passo && ora !== passo + 1) fallisci(`capitolo ${fiore}: da battuta ${passo} a ${ora} con un tocco`);
    passo = ora;
  }
  await page.getByTestId('capitolo-continua').waitFor({ timeout: 3000 }).catch(() => fallisci(`capitolo ${fiore}: niente "Continua"`));
  const etichetta = ((await page.getByTestId('capitolo-continua').textContent()) ?? '').trim();
  // il capitolo 5 tiene i testid della vecchia scena di Semina
  if (fiore === 5 && !((await visibile(page, 'scena-sblocco')) && (await visibile(page, 'scena-andiamo')))) fallisci('capitolo 5 senza scena-sblocco/scena-andiamo');
  if (premi) {
    await attendi(150);
    await page.getByTestId('capitolo-continua').click();
  }
  return { fiore, battute: passo + 1, etichetta };
}

/** Legge capitoli finché il lettore resta aperto; restituisce i fiori letti in ordine (e `etichette` dei bottoni finali). */
export async function leggiCoda(page, max = 20) {
  const letti = [];
  letti.etichette = [];
  for (let k = 0; k < max; k++) {
    const r = await leggiCapitolo(page);
    letti.push(r.fiore);
    letti.etichette.push(r.etichetta);
    // il prossimo capitolo, o la chiusura (uscita 150 ms)
    await attendi(400);
    if (!(await visibile(page, 'capitolo-scena'))) break;
    const f = Number(await page.getByTestId('capitolo-scena').getAttribute('data-fiore'));
    if (f === r.fiore) await attendi(400);
  }
  return letti;
}

export async function archivioDi(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-coppia-archivio') ?? 'null'));
}

/** Errori in console non attesi (rete PeerJS e favicon a parte). */
export function controllaConsole() {
  const attesi = /favicon|is taken|Aborting!|\[stanza\]/i;
  const errori = log.filter((l) => /error|uncaught/i.test(l) && !attesi.test(l));
  if (errori.length) {
    console.log('Errori in console:\n' + errori.join('\n'));
    fallisci('errori in console');
  }
}
