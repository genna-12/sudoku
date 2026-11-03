// Test end-to-end: due browser, stessa frase, mosse che si vedono da entrambi i lati.
// Uso: node scripts/qa/due-client.mjs [urlBase]   (default http://localhost:5173/sudoku/)
// Richiede: `npx peerjs --port 9000` in esecuzione e il dev server avviato con
//   VITE_PEER_HOST=localhost VITE_PEER_PORT=9000 VITE_PEER_SECURE=false npx vite --port 5173
// A = profilo verde (scegli-semino), B = profilo blu (scegli-semina).
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

async function entra(page, profilo) {
  await page.goto(base);
  await page.getByTestId(`scegli-${profilo}`).click();
  await page.getByTestId('frase').fill(FRASE);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 10000 });
}

const testo = async (page, id) => (await page.getByTestId(id).textContent())?.trim();

/** Aspetta che `f()` diventi vero (entro `ms`), altrimenti fallisce con `msg()`. */
async function finche(f, ms, msg) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (await f()) return;
    await attendi(150);
  }
  fallisci(await msg());
}

/** Una cella vuota nella stessa riga (poi colonna, poi box) di `idx`, diversa da quelle escluse. */
async function vuotaVicina(page, idx, escluse) {
  return page.evaluate(
    ({ idx, escluse }) => {
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      const box = (i) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);
      const vuota = (i) => {
        const el = document.querySelector(`[data-testid="cella-${i}"]`);
        return el && !el.parentElement.classList.contains('data') && !el.textContent.trim() && !escluse.includes(i);
      };
      const tutte = [...Array(81).keys()];
      for (const stessa of [(i) => Math.floor(i / 9) === r, (i) => i % 9 === c, (i) => box(i) === box(idx)]) {
        const trovata = tutte.find((i) => i !== idx && stessa(i) && vuota(i));
        if (trovata !== undefined) return trovata;
      }
      return -1;
    },
    { idx, escluse },
  );
}

const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();
const log = [];
for (const [p, n] of [[a, 'A'], [b, 'B']]) {
  p.on('console', (m) => log.push(`[${n}] ${m.text()}`));
  p.on('pageerror', (e) => log.push(`[${n}] uncaught ${e.message}`));
}

try {
  await entra(a, 'semino');
  await entra(b, 'semina');

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
  const seed = await a.getByTestId('griglia').getAttribute('data-seed');
  const seedB = await b.getByTestId('griglia').getAttribute('data-seed');
  if (!seed || seed !== seedB) fallisci(`seed diversi: ${seed} vs ${seedB}`);
  console.log('OK stesso seed', seed);
  const idSudoku = `sudoku-${seed}`;

  // A scrive nella prima cella vuota il valore giusto
  const idx = Number(await a.getByTestId('griglia').getAttribute('data-prima-vuota'));
  const giusto = Number(await a.getByTestId('griglia').getAttribute('data-prima-vuota-valore'));
  await a.getByTestId(`cella-${idx}`).click();
  await a.getByTestId(`tasto-${giusto}`).click();
  await attendi(1500);
  const vistoB = await testo(b, `cella-${idx}`);
  if (vistoB !== String(giusto)) fallisci(`B vede "${vistoB}" invece di ${giusto}`);
  console.log('OK mossa di A vista da B');

  // punti di A visibili su B
  const puntiA = await testo(a, 'punti-mio');
  if (!(Number(puntiA) > 0)) fallisci(`A non ha punti dopo una mossa giusta (${puntiA})`);
  await finche(
    async () => (await testo(b, 'punti-suo')) === puntiA,
    3000,
    async () => `punti-suo di B = ${await testo(b, 'punti-suo')}, punti-mio di A = ${puntiA}`,
  );
  console.log('OK punti di A visti da B:', puntiA);

  // B scrive una nota in un'altra cella vuota e A la vede
  const idx2 = Number(await b.getByTestId('griglia').getAttribute('data-seconda-vuota'));
  await b.getByTestId(`cella-${idx2}`).click();
  await b.getByTestId('matita').click();
  await b.getByTestId('tasto-5').click();
  await b.getByTestId('matita').click();
  await attendi(1500);
  const noteA = await a.getByTestId(`cella-${idx2}`).getAttribute('data-note');
  if (!noteA?.includes('5')) fallisci(`A non vede la nota di B (data-note=${noteA})`);
  console.log('OK nota di B vista da A');

  // A sbaglia: nella stessa riga/colonna/box di idx, il valore di idx è per forza sbagliato
  const idx3 = await vuotaVicina(a, idx, [idx2]);
  if (idx3 < 0) fallisci('nessuna cella vuota vicina per l’errore');
  await a.getByTestId(`cella-${idx3}`).click();
  await a.getByTestId(`tasto-${giusto}`).click();
  const toastA = a.locator('.toast[data-categoria^="sbagliata"] [data-testid="toast-testo"]').first();
  const toastB = b.locator('.toast[data-categoria^="sbagliata"] [data-testid="toast-testo"]').first();
  await toastA.waitFor({ timeout: 2000 });
  const fraseA = (await toastA.textContent())?.trim();
  await toastB.waitFor({ timeout: 2000 });
  const fraseB = (await toastB.textContent())?.trim();
  if (!fraseA || fraseA !== fraseB) fallisci(`frase dell'errore diversa: A "${fraseA}" vs B "${fraseB}"`);
  console.log('OK stessa frase di Semino su entrambi:', fraseA);
  if ((await testo(a, 'errori-mio')) !== '1') fallisci(`errori-mio di A = ${await testo(a, 'errori-mio')}`);
  await finche(
    async () => (await testo(b, 'errori-suo')) === '1',
    3000,
    async () => `errori-suo di B = ${await testo(b, 'errori-suo')}`,
  );
  console.log('OK errore di A contato su entrambi');
  await a.getByTestId('cancella').click();

  // ricarica B: la partita riprende e lo stato è allineato
  await b.reload();
  // al riavvio si parte dalla Home: la partita è su "Continua"
  await b.getByTestId('continua').waitFor({ timeout: 15000 });
  await b.getByTestId('continua').click({ force: true });
  await b.getByTestId('griglia').waitFor({ timeout: 15000 });
  await attendi(2000);
  const dopo = await testo(b, `cella-${idx}`);
  if (dopo !== String(giusto)) fallisci(`dopo reload B vede "${dopo}"`);
  console.log('OK stato ripreso dopo reload');

  // B apre il giardino: c'è la partita in corso, non finita
  await b.getByTestId('indietro').click();
  await b.getByTestId('giardino').click();
  const listaB = b.getByTestId('giardino-lista');
  await finche(
    async () => Number(await listaB.getAttribute('data-voci')) >= 1,
    4000,
    async () => `giardino di B con ${await listaB.getAttribute('data-voci')} voci`,
  );
  const finitaB = await b.getByTestId(`pianta-${idSudoku}`).getAttribute('data-finita');
  if (finitaB !== 'false') fallisci(`pianta della partita corrente con data-finita=${finitaB}`);
  console.log('OK giardino di B con la partita in corso');

  // killer: nuova partita da A (B è nel giardino e la riceve)
  await a.getByTestId('indietro').click();
  await a.getByTestId('modalita-killer').click();
  await a.getByTestId('livello-facile').click();
  await a.getByTestId('nuova').click();
  // c'è una partita già iniziata: conferma leggera ("resta nel giardino come germoglio")
  await a.getByTestId('conferma-nuova').waitFor({ timeout: 3000 });
  await a.getByTestId('nuova-conferma').click();
  console.log('OK conferma "Nuova partita?" con una partita in corso');
  await a.getByTestId('griglia').waitFor({ timeout: 10000 });
  await b.getByTestId('griglia').waitFor({ timeout: 10000 });
  await attendi(1000);
  const seedK = await a.getByTestId('griglia').getAttribute('data-seed');
  const seedKB = await b.getByTestId('griglia').getAttribute('data-seed');
  if (seedK !== seedKB) fallisci(`killer: seed diversi ${seedK} vs ${seedKB}`);
  const gabbie = await b.locator('[data-testid^="somma-"]').count();
  if (gabbie < 10) fallisci(`killer: poche somme visibili (${gabbie})`);
  console.log('OK killer condiviso, gabbie visibili:', gabbie);

  // nel giardino di B la partita sudoku è un germoglio riprendibile; B la riprende
  await b.getByTestId('indietro').click();
  await b.getByTestId('giardino').click();
  const germoglio = b.getByTestId(`pianta-${idSudoku}`);
  await germoglio.waitFor({ timeout: 4000 });
  if ((await germoglio.getAttribute('data-finita')) !== 'false') fallisci('la partita lasciata non è un germoglio');
  await b.getByTestId(`riprendi-${idSudoku}`).click();
  await b.getByTestId('griglia').waitFor({ timeout: 5000 });
  await finche(
    async () => (await a.getByTestId('griglia').getAttribute('data-seed')) === seed,
    4000,
    async () => `dopo la ripresa A è sul seed ${await a.getByTestId('griglia').getAttribute('data-seed')} invece di ${seed}`,
  );
  if ((await testo(a, `cella-${idx}`)) !== String(giusto)) fallisci('la partita ripresa ha perso la mossa di A');
  console.log('OK germoglio ripreso da B, A è tornato sulla stessa partita');

  // ricomincia da zero su A: il giardino di B si svuota
  await b.getByTestId('indietro').click();
  await b.getByTestId('giardino').click();
  await finche(
    async () => Number(await b.getByTestId('giardino-lista').getAttribute('data-voci')) >= 1,
    4000,
    async () => `giardino di B prima dell'azzeramento: ${await b.getByTestId('giardino-lista').getAttribute('data-voci')} voci`,
  );
  await a.getByTestId('indietro').click();
  await a.getByTestId('menu').click();
  await a.getByTestId('ricomincia').click();
  await a.getByTestId('ricomincia-conferma-1').click();
  await a.getByTestId('ricomincia-parola').fill('ricomincia');
  await a.getByTestId('ricomincia-conferma-2').click();
  await finche(
    async () => (await b.getByTestId('giardino-lista').getAttribute('data-voci')) === '0',
    3000,
    async () => `dopo "ricomincia" il giardino di B ha ancora ${await b.getByTestId('giardino-lista').getAttribute('data-voci')} voci`,
  );
  await a.getByTestId('giardino').click();
  if ((await a.getByTestId('giardino-lista').getAttribute('data-voci')) !== '0') fallisci('il giardino di A non è vuoto');
  console.log('OK ricomincia da zero: giardino vuoto su entrambi');

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
