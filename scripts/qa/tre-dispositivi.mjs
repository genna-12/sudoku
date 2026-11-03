// Test con tre dispositivi: A1 e A2 = Verde (Genna su due dispositivi), B = Blu (lei), stessa frase.
// La stanza di coppia ha un posto per profilo: B si collega con A1, A2 trova il posto occupato e
// gioca tramite la stanza personale (A1 inoltra le mosse in entrambi i sensi, senza cicli).
// Uso: node scripts/qa/tre-dispositivi.mjs [urlBase]   (stessi server di due-client.mjs, vite in dev)
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
const FRASE = 'frase tre dispositivi ' + Date.now();
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

function fallisci(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

async function finche(f, ms, msg) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (await f()) return;
    await attendi(150);
  }
  fallisci(typeof msg === 'function' ? await msg() : msg);
}

const browser = await chromium.launch();
const log = [];
const ricevuti = []; // [ora, nome, testo] dei messaggi di rete (console.debug '[rete] ...')

async function dispositivo(nome, profilo) {
  const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('console', (m) => {
    const t = m.text();
    if (t.startsWith('[rete]')) ricevuti.push([Date.now(), nome, t]);
    else log.push(`[${nome}] ${t}`);
  });
  p.on('pageerror', (e) => log.push(`[${nome}] uncaught ${e.message}`));
  await p.goto(base);
  await p.getByTestId(`scegli-${profilo}`).click();
  await p.getByTestId('frase').fill(FRASE);
  await p.getByTestId('entra').click();
  await p.getByTestId('home').waitFor({ timeout: 10000 });
  return p;
}

const testo = async (p, id) => (await p.getByTestId(id).textContent())?.trim();
const cella = async (p, i) => (await p.getByTestId(`cella-${i}`).textContent())?.trim();

try {
  const a1 = await dispositivo('A1', 'semino');
  await a1.waitForTimeout(1500);
  const b = await dispositivo('B', 'semina');
  await b.getByTestId('connesso').waitFor({ timeout: 20000 });
  const a2 = await dispositivo('A2', 'semino');
  await a2.getByTestId('personale-connesso').waitFor({ timeout: 20000 });
  await finche(async () => (await a2.locator('.pallino-occupata').count()) === 1, 20000, 'A2 non mostra "occupata"');
  if ((await b.getByTestId('connesso').count()) !== 1 || (await a1.getByTestId('connesso').count()) !== 1)
    fallisci('B e A1 non sono più collegati dopo l’arrivo di A2');
  console.log('OK B collegata con A1; A2 vede "occupata" e il suo altro dispositivo');

  await b.getByTestId('livello-semini').click();
  await b.getByTestId('nuova').click();
  for (const p of [a1, a2, b]) await p.getByTestId('griglia').waitFor({ timeout: 10000 });
  const seed = await b.getByTestId('griglia').getAttribute('data-seed');
  for (const [p, n] of [[a1, 'A1'], [a2, 'A2']])
    await finche(async () => (await p.getByTestId('griglia').getAttribute('data-seed')) === seed, 8000, `${n} non è sulla partita di B`);
  console.log('OK la nuova partita di B arriva anche ad A2 (inoltrata da A1)');

  const g = b.getByTestId('griglia');
  const i1 = Number(await g.getAttribute('data-prima-vuota'));
  const v1 = Number(await g.getAttribute('data-prima-vuota-valore'));
  await b.getByTestId(`cella-${i1}`).click();
  await b.getByTestId(`tasto-${v1}`).click();
  await attendi(200);
  const localeB = await testo(b, 'punti-mio'); // calcolato sul dispositivo che ha mosso
  await finche(async () => (await cella(a2, i1)) === String(v1), 8000, async () => `A2 vede "${await cella(a2, i1)}" invece di ${v1}`);
  console.log('OK mossa di B vista da A2');

  const i2 = Number(await a2.getByTestId('griglia').getAttribute('data-seconda-vuota'));
  const v2 = await a2.evaluate((i) => JSON.parse(localStorage.getItem('sudoku-coppia-archivio')).partita.puzzle.soluzione[i], i2);
  await a2.getByTestId(`cella-${i2}`).click();
  await a2.getByTestId(`tasto-${v2}`).click();
  await attendi(200);
  const localeA2 = await testo(a2, 'punti-mio');
  await finche(async () => (await cella(b, i2)) === String(v2), 8000, async () => `B vede "${await cella(b, i2)}" invece di ${v2}`);
  console.log('OK mossa di A2 vista da B');

  await attendi(1500);
  const pA2 = await testo(a2, 'punti-mio');
  const pB = await testo(b, 'punti-mio');
  const viste = {
    'A1 Verde': await testo(a1, 'punti-mio'),
    'B vede Verde': await testo(b, 'punti-suo'),
    'A2 Verde': pA2,
    'A1 vede Blu': await testo(a1, 'punti-suo'),
    'A2 vede Blu': await testo(a2, 'punti-suo'),
    'B Blu': pB,
  };
  if (new Set([viste['A1 Verde'], viste['B vede Verde'], viste['A2 Verde']]).size !== 1) fallisci('punti di Verde diversi: ' + JSON.stringify(viste));
  if (new Set([viste['A1 vede Blu'], viste['A2 vede Blu'], viste['B Blu']]).size !== 1) fallisci('punti di Blu diversi: ' + JSON.stringify(viste));
  if (Number(pA2) <= 0 || Number(pB) <= 0) fallisci('punti a zero: ' + JSON.stringify(viste));
  // dopo gli inoltri i punti restano quelli calcolati da chi ha mosso: niente somme doppie
  if (pA2 !== localeA2 || pB !== localeB) fallisci(`punti cambiati dagli inoltri: A2 ${localeA2}→${pA2}, B ${localeB}→${pB}`);
  console.log('OK contatori uguali sui tre dispositivi, nessun doppio conteggio:', JSON.stringify(viste));

  const da = Date.now();
  await attendi(10000);
  const storici = ricevuti.filter(([t, , s]) => t >= da && / storico/.test(s)).length;
  const tutti = ricevuti.filter(([t, , s]) => t >= da && !/ (ping|pong|evento|cursore)/.test(s));
  if (storici >= 10) fallisci(`${storici} messaggi storico in 10 s: ciclo?\n` + tutti.slice(-20).map((r) => r.slice(1).join(' ')).join('\n'));
  console.log(`OK nessun ciclo: ${storici} messaggi storico in 10 s di quiete`);

  const attesi = /favicon|is taken|Aborting!|\[stanza\]|ERR_CONNECTION|fonts/i;
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
