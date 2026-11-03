// Test end-to-end: due browser, stessa frase, mosse che si vedono da entrambi i lati.
// Uso: node scripts/qa/due-client.mjs [urlBase]   (default http://localhost:5173/sudoku/)
// Richiede: `npx peerjs --port 9000` in esecuzione e il dev server avviato con
//   VITE_PEER_HOST=localhost VITE_PEER_PORT=9000 VITE_PEER_SECURE=false npx vite --port 5173
import { createRequire } from 'node:module';
// playwright può stare nel progetto o in un'installazione globale (cloud: /opt/npm-tools)
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();

const base = process.argv[2] ?? 'http://localhost:5173/sudoku/';
const FRASE = 'frase di prova ' + Date.now();
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

function fallisci(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

async function entra(page, nome) {
  await page.goto(base);
  await page.getByTestId('nome').fill(nome);
  await page.getByTestId('frase').fill(FRASE);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 10000 });
}

const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();
const log = [];
for (const [p, n] of [[a, 'A'], [b, 'B']]) p.on('console', (m) => log.push(`[${n}] ${m.text()}`));

try {
  await entra(a, 'Genna');
  await entra(b, 'Lei');

  // connessione
  await a.getByTestId('connesso').waitFor({ timeout: 20000 });
  await b.getByTestId('connesso').waitFor({ timeout: 20000 });
  console.log('OK connessi');

  // A avvia una partita sudoku semini
  await a.getByTestId('modalita-sudoku').click();
  await a.getByTestId('livello-semini').click();
  await a.getByTestId('nuova').click();
  await a.getByTestId('griglia').waitFor({ timeout: 10000 });
  await b.getByTestId('griglia').waitFor({ timeout: 10000 });
  console.log('OK partita aperta su entrambi');

  // stesso puzzle?
  const datiA = await a.getByTestId('griglia').getAttribute('data-seed');
  const datiB = await b.getByTestId('griglia').getAttribute('data-seed');
  if (!datiA || datiA !== datiB) fallisci(`seed diversi: ${datiA} vs ${datiB}`);
  console.log('OK stesso seed', datiA);

  // A scrive nella prima cella vuota il valore giusto
  const idx = Number(await a.getByTestId('griglia').getAttribute('data-prima-vuota'));
  const giusto = Number(await a.getByTestId('griglia').getAttribute('data-prima-vuota-valore'));
  await a.getByTestId(`cella-${idx}`).click();
  await a.getByTestId(`tasto-${giusto}`).click();
  await attendi(1500);
  const vistoB = (await b.getByTestId(`cella-${idx}`).textContent())?.trim();
  if (vistoB !== String(giusto)) fallisci(`B vede "${vistoB}" invece di ${giusto}`);
  console.log('OK mossa di A vista da B');

  // B scrive una nota in un'altra cella vuota e A la vede
  const idx2 = Number(await b.getByTestId('griglia').getAttribute('data-seconda-vuota'));
  await b.getByTestId(`cella-${idx2}`).click();
  await b.getByTestId('matita').click();
  await b.getByTestId('tasto-5').click();
  await attendi(1500);
  const noteA = await a.getByTestId(`cella-${idx2}`).getAttribute('data-note');
  if (!noteA?.includes('5')) fallisci(`A non vede la nota di B (data-note=${noteA})`);
  console.log('OK nota di B vista da A');

  // ricarica B: la partita riprende e lo stato è allineato
  await b.reload();
  await b.getByTestId('griglia').waitFor({ timeout: 15000 });
  await attendi(2000);
  const dopo = (await b.getByTestId(`cella-${idx}`).textContent())?.trim();
  if (dopo !== String(giusto)) fallisci(`dopo reload B vede "${dopo}"`);
  console.log('OK stato ripreso dopo reload');

  // killer: nuova partita da B, A la riceve
  await b.getByTestId('indietro').click();
  await b.getByTestId('modalita-killer').click();
  await b.getByTestId('livello-facile').click();
  await b.getByTestId('nuova').click();
  await b.getByTestId('griglia').waitFor({ timeout: 10000 });
  await attendi(2000);
  const seedK = await b.getByTestId('griglia').getAttribute('data-seed');
  const seedKA = await a.getByTestId('griglia').getAttribute('data-seed');
  if (seedK !== seedKA) fallisci(`killer: seed diversi ${seedK} vs ${seedKA}`);
  const gabbie = await a.locator('[data-testid^="somma-"]').count();
  if (gabbie < 10) fallisci(`killer: poche somme visibili (${gabbie})`);
  console.log('OK killer condiviso, gabbie visibili:', gabbie);

  // PeerJS logga come errore anche il percorso previsto "ID -a occupato → divento -b": non è un errore nostro.
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
