// E2E: capitoli dopo partite di fila, arretrati dalla Home, partner che preme "Nuova" mentre leggo,
// diario (T5). Uso: node scripts/qa/capitoli-di-fila.mjs [urlBase]   (default http://localhost:5173/sudoku/)
// Richiede il server PeerJS locale e il dev server con VITE_PEER_* (vedi README, sezione E2E).
// Fasi:
//  1. Archivio v1 con 6 fiori e l'arrivo di Semina già visto (visti 0..5 per il ruolo di ciascuno):
//     "1 capitolo da leggere" (il 6) in Home, letto da lì su entrambi; poi l'eco del 6.
//  2. Partita 1: B mette l'ultima cella → capitolo 7 su entrambi (niente "N di M"). B chiude la pagina a
//     metà capitolo → al riavvio "1 capitolo da leggere" in Home; A preme "Nuova"; B lo legge dalla Home.
//  3. Partita 2: A la risolve → capitolo 8 su entrambi. A legge e preme "Nuova" mentre B legge ancora:
//     il lettore di B resta, la partita nuova sta sotto (timer fermo), la carta dice "Vai".
//  4. Diario: rilegge il capitolo 3 (senza Semina) senza cambiare visti né coda.
import {
  archivioDi,
  attendi,
  chromium,
  contesto,
  continua,
  controllaConsole,
  daLeggere,
  fallisci,
  finche,
  leggiCapitolo,
  leggiCoda,
  scriviArchivio,
  visibile,
} from './comune.mjs';

/** Mette tutte le celle mancanti della partita aperta (soluzione letta dall'archivio locale). */
async function risolvi(page) {
  await attendi(500); // l'archivio si salva con 300 ms di ritardo
  const celle = await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem('sudoku-coppia-archivio'));
    const p = a.partita;
    return p.puzzle.dati.map((d, i) => [i, p.puzzle.soluzione[i], d || p.celle[i]?.v === p.puzzle.soluzione[i]]).filter((x) => !x[2]);
  });
  for (const [i, v] of celle) {
    await page.getByTestId(`cella-${i}`).click();
    await page.getByTestId(`tasto-${v}`).click();
  }
  return celle.length;
}

const seme = (page) => page.getByTestId('griglia').getAttribute('data-seed');

const browser = await chromium.launch();
try {
  const FRASE = 'qa di fila ' + Date.now();
  const viste6 = ['semino-0', 'semino-1', 'semino-2', 'semino-3', 'semino-4', 'semina-5', 'semino-6'];
  const A = await contesto(browser, 'A', { width: 390, height: 844 });
  const B = await contesto(browser, 'B', { width: 375, height: 667 });
  const [[idx, v]] = await scriviArchivio(A.page, { nome: 'Semino', frase: FRASE, fiori: 6, viste: viste6, seed: 4321, mancanti: 1 });
  await scriviArchivio(B.page, { nome: 'Semina', frase: FRASE, fiori: 6, viste: viste6, seed: 4321, mancanti: 1 });

  // --- 1. arretrato dalla Home --------------------------------------------------------------------
  for (const { page, nome } of [A, B]) {
    if ((await daLeggere(page)) !== '1 capitolo da leggere') fallisci(`${nome}: in Home "${await daLeggere(page)}"`);
    await page.getByTestId('capitoli-da-leggere').click();
    const r = await leggiCapitolo(page);
    if (r.fiore !== 6 || r.etichetta !== 'Continua') fallisci(`${nome}: dalla Home il capitolo ${r.fiore} ("${r.etichetta}")`);
    await page.getByTestId('capitolo-scena').waitFor({ state: 'detached', timeout: 3000 });
    if (await daLeggere(page)) fallisci(`${nome}: il bottone resta dopo la lettura`);
    await page.getByTestId('fumetto-eco').waitFor({ timeout: 3000 }).catch(() => fallisci(`${nome}: niente eco del capitolo 6`));
    await continua(page);
  }
  await finche(async () => (await A.page.locator('.partner-chip.pallino-connesso').count()) > 0, 20000, 'A e B non si collegano');
  console.log('OK "1 capitolo da leggere" in Home, letto da lì su entrambi; poi la sua eco');

  // --- 2. partita 1 → capitolo 7; B chiude la pagina a metà ----------------------------------------
  await B.page.getByTestId(`cella-${idx}`).click();
  await B.page.getByTestId(`tasto-${v}`).click();
  for (const { page, nome } of [A, B]) {
    await page.getByTestId('capitolo-scena').waitFor({ timeout: 5000 }).catch(() => fallisci(`${nome}: niente capitolo dopo la vittoria`));
    const f = await page.getByTestId('capitolo-scena').getAttribute('data-fiore');
    if (f !== '7') fallisci(`${nome}: dopo la vittoria il capitolo ${f} invece del 7`);
    if (await page.locator('.capitolo-conta').count()) fallisci(`${nome}: "N di M" con un capitolo solo`);
  }
  await leggiCapitolo(A.page);
  await A.page.getByTestId('vittoria').waitFor({ timeout: 3000 });
  await leggiCapitolo(B.page, { fermaA: 2 });
  await B.page.reload();
  await B.page.getByTestId('home').waitFor({ timeout: 10000 });
  await attendi(800);
  if ((await daLeggere(B.page)) !== '1 capitolo da leggere') fallisci(`B: dopo il riavvio a metà capitolo "${await daLeggere(B.page)}"`);
  console.log('OK vittoria → capitolo 7 su entrambi; chiuso a metà, al riavvio è ancora da leggere');

  await A.page.getByTestId('vittoria-nuova').click();
  await A.page.getByTestId('griglia').waitFor({ timeout: 6000 });
  // B era in Home: la "nuova" di A lo porta sulla partita; il capitolo 7 resta da leggere
  await B.page.getByTestId('griglia').waitFor({ timeout: 8000 }).catch(() => fallisci('B: la nuova partita di A non arriva'));
  await B.page.getByTestId('indietro').click();
  await B.page.getByTestId('home').waitFor({ timeout: 4000 });
  if ((await daLeggere(B.page)) !== '1 capitolo da leggere') fallisci(`B: "${await daLeggere(B.page)}" dopo la nuova partita`);
  await B.page.getByTestId('capitoli-da-leggere').click();
  const r7 = await leggiCapitolo(B.page);
  if (r7.fiore !== 7) fallisci(`B: dalla Home il capitolo ${r7.fiore}`);
  await B.page.getByTestId('capitolo-scena').waitFor({ state: 'detached', timeout: 3000 });
  await continua(B.page);
  if ((await seme(A.page)) !== (await seme(B.page))) fallisci('A e B su partite diverse');
  console.log('OK B legge il 7 dalla Home dopo la nuova partita di A, poi la raggiunge');

  // --- 3. partita 2 → capitolo 8; A preme "Nuova" mentre B legge ------------------------------------
  const n = await risolvi(A.page);
  for (const { page, nome } of [A, B]) {
    await page.getByTestId('capitolo-scena').waitFor({ timeout: 6000 }).catch(() => fallisci(`${nome}: niente capitolo dopo la partita 2 (${n} celle)`));
    const f = await page.getByTestId('capitolo-scena').getAttribute('data-fiore');
    if (f !== '8') fallisci(`${nome}: dopo la partita 2 il capitolo ${f} invece dell'8`);
  }
  await leggiCapitolo(A.page);
  await A.page.getByTestId('vittoria-nuova').click();
  await A.page.getByTestId('griglia').waitFor({ timeout: 6000 });
  const nuovo = await seme(A.page);
  await finche(async () => (await seme(B.page)) === nuovo, 8000, 'B: la partita nuova di A non arriva sotto il lettore');
  if (!(await visibile(B.page, 'capitolo-scena'))) fallisci('B: il lettore si è chiuso con la "Nuova" di A');
  if ((await B.page.getByTestId('capitolo-scena').getAttribute('data-fiore')) !== '8') fallisci('B: il lettore ha cambiato capitolo');
  if (!(await B.page.evaluate(() => document.querySelector('.app-sotto')?.inert))) fallisci('B: la partita sotto il lettore non è inert');
  // l'archivio si scrive poco dopo la griglia: si misura il timer della partita nuova, non della vecchia
  await finche(async () => String((await archivioDi(B.page))?.partita?.puzzle?.seed) === nuovo, 5000, 'B: la partita nuova non arriva nell’archivio');
  const s1 = (await archivioDi(B.page)).partita.secondi;
  await attendi(2600);
  const s2 = (await archivioDi(B.page)).partita.secondi;
  if (s2 !== s1) fallisci(`B: il timer della partita nuova corre mentre leggo (${s1} → ${s2})`);
  await leggiCapitolo(B.page);
  await B.page.getByTestId('vittoria-vai').waitFor({ timeout: 3000 }).catch(() => fallisci('B: la carta non dice "Vai"'));
  if (await visibile(B.page, 'vittoria-nuova')) fallisci('B: "Nuova partita" al posto di "Vai"');
  await B.page.getByTestId('vittoria-vai').click();
  await attendi(300);
  if (await visibile(B.page, 'vittoria')) fallisci('B: la carta resta dopo "Vai"');
  if ((await seme(B.page)) !== nuovo) fallisci('B: "Vai" non porta alla partita nuova');
  await attendi(1500);
  const s3 = (await archivioDi(B.page)).partita.secondi;
  if (!(s3 > s2)) fallisci(`B: il timer non riparte dopo "Vai" (${s2} → ${s3})`);
  console.log('OK "Nuova" di A mentre B legge: il lettore resta, partita sotto in pausa, poi "Vai"');

  // --- 4. diario -------------------------------------------------------------------------------------
  await B.page.getByTestId('indietro').click();
  await B.page.getByTestId('home').waitFor({ timeout: 4000 });
  const prima = (await archivioDi(B.page)).capitoliVisti;
  if (prima.b.length !== 9) fallisci(`B: visti ${JSON.stringify(prima)}`);
  await B.page.getByTestId('giardino').click();
  await B.page.getByTestId('diario').waitFor({ timeout: 4000 });
  const righe = await B.page.locator('[data-testid^="diario-"]:not([data-testid="diario"])').count();
  if (righe !== 9) fallisci(`B: ${righe} righe nel diario invece di 9`);
  await B.page.getByTestId('diario-3').click();
  if ((await B.page.getByTestId('capitolo-scena').getAttribute('data-fiore')) !== '3') fallisci('B: il diario non apre il capitolo 3');
  if (await B.page.locator('.capitolo-lei').count()) fallisci('B: Semina nel capitolo 3 riletto');
  const r3 = await leggiCapitolo(B.page);
  if (r3.etichetta !== 'Chiudi') fallisci(`B: rilettura finisce con "${r3.etichetta}"`);
  await B.page.getByTestId('capitolo-scena').waitFor({ state: 'detached', timeout: 3000 });
  await B.page.getByTestId('diario').waitFor({ timeout: 2000 });
  await attendi(500);
  const dopo = (await archivioDi(B.page)).capitoliVisti;
  if (JSON.stringify(dopo) !== JSON.stringify(prima)) fallisci('B: la rilettura ha cambiato i visti');
  await B.page.getByTestId('indietro').click();
  await B.page.getByTestId('home').waitFor({ timeout: 4000 });
  if (await daLeggere(B.page)) fallisci(`B: dopo la rilettura "${await daLeggere(B.page)}"`);
  console.log('OK diario: 9 capitoli, rilettura del 3 senza Semina, visti e coda invariati');

  await A.ctx.close();
  await B.ctx.close();
  controllaConsole();
  console.log('TUTTO OK');
} catch (e) {
  fallisci(e.message);
} finally {
  await browser.close();
}
