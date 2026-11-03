// Test della stanza personale: due dispositivi della STESSA persona (stesso profilo, stessa frase).
// Entrambi devono mostrare "altro mio dispositivo" e vedere le mosse dell'altro.
// Uso: node scripts/qa/personale.mjs [urlBase]   (stessi server di due-client.mjs)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();

const base = process.argv[2] ?? 'http://localhost:5173/sudoku/';
const FRASE = 'frase personale ' + Date.now();
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

function fallisci(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

async function entra(page) {
  await page.goto(base);
  await page.getByTestId('scegli-semino').click();
  await page.getByTestId('frase').fill(FRASE);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 10000 });
}

const browser = await chromium.launch();
const telefono = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const pc = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const log = [];
for (const [p, n] of [[telefono, 'tel'], [pc, 'pc']]) {
  p.on('console', (m) => log.push(`[${n}] ${m.text()}`));
  p.on('pageerror', (e) => log.push(`[${n}] uncaught ${e.message}`));
}

try {
  await entra(telefono);
  await entra(pc);
  await telefono.getByTestId('personale-connesso').waitFor({ timeout: 20000 });
  await pc.getByTestId('personale-connesso').waitFor({ timeout: 20000 });
  console.log('OK entrambi vedono "altro mio dispositivo"');

  await telefono.getByTestId('livello-semini').click();
  await telefono.getByTestId('nuova').click();
  await telefono.getByTestId('griglia').waitFor({ timeout: 10000 });
  await pc.getByTestId('griglia').waitFor({ timeout: 10000 });
  const seed = await telefono.getByTestId('griglia').getAttribute('data-seed');
  if (seed !== (await pc.getByTestId('griglia').getAttribute('data-seed'))) fallisci('seed diversi');
  console.log('OK stessa partita sui due dispositivi');

  const idx = Number(await telefono.getByTestId('griglia').getAttribute('data-prima-vuota'));
  const v = Number(await telefono.getByTestId('griglia').getAttribute('data-prima-vuota-valore'));
  await telefono.getByTestId(`cella-${idx}`).click();
  await telefono.getByTestId(`tasto-${v}`).click();
  await attendi(1500);
  const visto = (await pc.getByTestId(`cella-${idx}`).textContent())?.trim();
  if (visto !== String(v)) fallisci(`il pc vede "${visto}" invece di ${v}`);
  if ((await pc.getByTestId('punti-mio').textContent())?.trim() !== (await telefono.getByTestId('punti-mio').textContent())?.trim())
    fallisci('punti diversi fra i due dispositivi della stessa persona');
  console.log('OK mossa del telefono vista dal pc, stessi punti');

  if ((await telefono.getByTestId('personale-connesso').count()) !== 1) fallisci('indicatore sparito in partita');
  const attesi = /favicon|is taken|Aborting!|\[stanza\]/i;
  const errori = log.filter((l) => /error|uncaught/i.test(l) && !attesi.test(l));
  if (errori.length) {
    console.log('Errori in console:\n' + errori.join('\n'));
    fallisci('errori in console');
  }
  console.log('TUTTO OK');
} catch (e) {
  console.log(log.slice(-30).join('\n'));
  fallisci(e.message);
} finally {
  await browser.close();
}
