// E2E: l'arrivo di Semina con i capitoli (T5). Sostituisce sblocco-semina.mjs.
// Uso: node scripts/qa/arrivo-semina.mjs [urlBase]   (default http://localhost:5173/sudoku/)
// Richiede il server PeerJS locale e il dev server con VITE_PEER_* (vedi README, sezione E2E).
// Fasi:
//  1. Archivio v1 (prima dei capitoli) con 4 fiori su A (Semino) e B (Semina), stessa frase, partita con
//     una cella mancante. In Home: Verde/Blu, "5 capitoli da leggere" (0..4), una mascotte sola.
//  2. B mette l'ultima cella: vittoria su entrambi; festa, poi (6 arretrati) il foglio "Adesso/Dopo",
//     mai la carta prima del capitolo. "Adesso" → coda 0..5 letta per intero su A, poi su B (B vede il
//     5 anche se A l'ha già letto). Poi la carta "Fiorita insieme!" e i nomi Semino/Semina.
//  3. Al riavvio: nessun capitolo da leggere, nessuna scena ripetuta; l'eco del 5 una volta sola.
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
  leggiCoda,
  scriviArchivio,
  visibile,
} from './comune.mjs';

const browser = await chromium.launch();
try {
  const FRASE = 'qa arrivo ' + Date.now();
  const viste4 = ['semino-0', 'semino-1', 'semino-2', 'semino-3', 'semino-4'];
  const A = await contesto(browser, 'A', { width: 390, height: 844 });
  const B = await contesto(browser, 'B', { width: 375, height: 667 });
  const [[idx, v]] = await scriviArchivio(A.page, { nome: 'Semino', frase: FRASE, fiori: 4, viste: viste4, seed: 777, mancanti: 1 });
  await scriviArchivio(B.page, { nome: 'Semina', frase: FRASE, fiori: 4, viste: viste4, seed: 777, mancanti: 1 });

  // --- 1. prima: la UI di sempre, gli arretrati come bottone in Home ----------------------------
  for (const { page, nome } of [A, B]) {
    const t = await daLeggere(page);
    if (t !== '5 capitoli da leggere') fallisci(`${nome}: in Home "${t}" invece di "5 capitoli da leggere"`);
    if (await page.locator('.home-mascotte .semino-coppia').count()) fallisci(`${nome}: Semina in Home prima del suo capitolo`);
    if (await visibile(page, 'capitolo-scena')) fallisci(`${nome}: il lettore si apre da solo in Home`);
    const salvato = await archivioDi(page);
    if (salvato.versione !== 2 || salvato.capitoliVisti.a.length || salvato.capitoliVisti.b.length) fallisci(`${nome}: migrazione ${JSON.stringify(salvato.capitoliVisti)}`);
    await continua(page);
  }
  await finche(
    async () => (await A.page.locator('.partner-chip.pallino-connesso').count()) && (await B.page.locator('.partner-chip.pallino-connesso').count()),
    20000,
    'A e B non si collegano',
  );
  console.log('OK 4 fiori: "5 capitoli da leggere" in Home, Semina non c’è, A e B collegati');

  // --- 2. vittoria → festa → foglio → coda 0..5 -------------------------------------------------
  await B.page.getByTestId(`cella-${idx}`).click();
  await B.page.getByTestId(`tasto-${v}`).click();
  // durante la festa (900 ms) né carta né capitolo
  await attendi(300);
  for (const { page, nome } of [A, B]) {
    if (await visibile(page, 'vittoria')) fallisci(`${nome}: la carta di vittoria prima del capitolo`);
  }
  for (const { page, nome } of [A, B]) {
    await page.getByTestId('capitoli-chiedi').waitFor({ timeout: 5000 }).catch(() => fallisci(`${nome}: niente foglio "Adesso/Dopo" con 6 arretrati`));
    const t = ((await page.getByTestId('capitoli-chiedi').textContent()) ?? '').trim();
    if (!t.includes('6 capitoli')) fallisci(`${nome}: foglio "${t}"`);
    if (await visibile(page, 'vittoria')) fallisci(`${nome}: carta di vittoria sotto il foglio`);
  }
  console.log('OK vittoria su entrambi: festa, poi "Hai 6 capitoli da leggere" (niente carta prima)');

  for (const { page } of [A, B]) await page.getByTestId('capitoli-adesso').click();
  const lettiA = await leggiCoda(A.page);
  if (lettiA.join() !== '0,1,2,3,4,5') fallisci(`A ha letto ${lettiA} invece di 0..5`);
  if (lettiA.etichette[0] !== 'Andiamo' || lettiA.etichette[5] !== 'Andiamo' || lettiA.etichette[2] !== 'Continua') fallisci(`A: bottoni finali ${lettiA.etichette}`);
  const vistiA = (await archivioDi(A.page)).capitoliVisti;
  if (vistiA.a.length !== 6 || vistiA.b.length) fallisci(`A: visti ${JSON.stringify(vistiA)}`);
  // B legge dopo A: il suo lettore è rimasto lì, e il 5 c'è anche per lei
  if (!(await visibile(B.page, 'capitolo-scena'))) fallisci('B: il lettore si è chiuso mentre A leggeva');
  const lettiB = await leggiCoda(B.page);
  if (lettiB.join() !== '0,1,2,3,4,5') fallisci(`B ha letto ${lettiB} invece di 0..5`);
  console.log('OK coda 0..5 letta per intero su A e poi su B (il 5 anche per B)');

  // --- dopo: la carta, Semino e Semina ---------------------------------------------------------
  for (const { page, nome } of [A, B]) {
    await page.getByTestId('vittoria').waitFor({ timeout: 4000 }).catch(() => fallisci(`${nome}: niente carta di vittoria dopo i capitoli`));
    const titolo = ((await page.locator('.vittoria-titolo').textContent()) ?? '').trim();
    if (titolo !== 'Fiorita insieme!') fallisci(`${nome}: titolo "${titolo}" (Semina non è arrivata?)`);
    if (!(await page.locator('[data-testid="vittoria"] .semino-coppia').count())) fallisci(`${nome}: nella carta una mascotte sola`);
  }
  await finche(async () => (await A.page.locator('.partner-chip').textContent())?.trim() === 'Mati', 4000, 'A: il partner non è Mati');
  await finche(async () => (await B.page.locator('.partner-chip').textContent())?.trim() === 'Genna', 4000, 'B: il partner non è Genna');
  const salvatoB = await archivioDi(B.page);
  if (salvatoB.capitoliVisti.b.length !== 6) fallisci(`B: visti ${JSON.stringify(salvatoB.capitoliVisti)}`);
  if (!(salvatoB.regaliBonus >= 2)) fallisci(`B: regali dei capitoli 1 e 5 non messi da parte (${salvatoB.regaliBonus})`);
  console.log('OK carta "Fiorita insieme!", Semino e Semina su entrambi, regali dei capitoli 1 e 5 da parte');

  // --- 3. Home e riavvio -----------------------------------------------------------------------
  for (const { page, nome } of [A, B]) {
    await page.getByText('guarda la griglia').click();
    await page.getByTestId('indietro').click();
    await page.getByTestId('home').waitFor({ timeout: 4000 });
    await page.getByTestId('fumetto-eco').waitFor({ timeout: 3000 }).catch(() => fallisci(`${nome}: niente eco del capitolo 5 in Home`));
    if (!((await page.getByTestId('fumetto-eco').textContent()) ?? '').includes('dal capitolo 5')) fallisci(`${nome}: eco senza firma del capitolo 5`);
    if (!(await page.locator('.home-mascotte .semino-coppia').count())) fallisci(`${nome}: in Home non ci sono tutti e due`);
    if (await daLeggere(page)) fallisci(`${nome}: ancora capitoli da leggere: ${await daLeggere(page)}`);
    await attendi(500);
    await page.reload();
    await page.getByTestId('home').waitFor({ timeout: 10000 });
    await attendi(1500);
    if (await visibile(page, 'capitolo-scena')) fallisci(`${nome}: scena ripetuta dopo il riavvio`);
    if (await visibile(page, 'fumetto-eco')) fallisci(`${nome}: eco ripetuta dopo il riavvio`);
    if (await daLeggere(page)) fallisci(`${nome}: capitoli da leggere dopo il riavvio: ${await daLeggere(page)}`);
  }
  console.log('OK al riavvio: nessun capitolo da leggere, nessuna scena, eco una volta sola');
  await A.ctx.close();
  await B.ctx.close();

  controllaConsole();
  console.log('TUTTO OK');
} catch (e) {
  fallisci(e.message);
} finally {
  await browser.close();
}
