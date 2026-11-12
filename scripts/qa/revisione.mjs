// E2E della stanza di revisione: si entra dall'Ingresso con la frase della revisione, si aprono i
// capitoli 0, 9, 50 e 100 e si scorrono tutte le battute (avanti e indietro), più l'anteprima "dopo il
// capitolo"; localStorage, sessionStorage e IndexedDB restano identici, nessuna richiesta fuori dalla
// pagina e nessun WebSocket (PeerJS) durante la revisione; Esci e il ricaricamento tornano all'Ingresso.
// Seconda parte: già dentro la stanza di coppia (frase di prova, Worker bloccato), "cambia profilo o frase"
// e poi la revisione: il WebSocket di PeerJS si chiude e non se ne aprono altri.
// Uso: REVISIONE_FRASE=… node scripts/qa/revisione.mjs [urlBase]   (default http://127.0.0.1:5373/sudoku/)
// Server PeerJS locale e vite con VITE_PEER_* come per gli altri E2E (README). La frase arriva solo dalla
// variabile d'ambiente: mai nei file né nel log.
// Screenshot 390×844 in docs/design/img/t9-revisione-*.png.
import { attendi, chromium, contesto, fallisci, finche, log, visibile } from './comune.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:5373/sudoku/';
const frase = process.env.REVISIONE_FRASE;
if (!frase) fallisci('manca REVISIONE_FRASE nell’ambiente');
const IMG = new URL('../../docs/design/img/', import.meta.url).pathname;

/** Tutto quello che il browser ricorda per questa origine. */
async function memoria(page) {
  return page.evaluate(async () => {
    const tutto = (s) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)).map((k) => [k, s.getItem(k)]));
    const db = indexedDB.databases ? (await indexedDB.databases()).map((d) => `${d.name}@${d.version}`).sort() : [];
    let righe = [];
    // il contenuto della copia di riserva (stato/persistenza.ts), se c'è
    if (db.length) {
      righe = await Promise.all(
        db.map(
          (x) =>
            new Promise((ok) => {
              const r = indexedDB.open(x.split('@')[0]);
              r.onsuccess = () => {
                const d = r.result;
                const negozi = Array.from(d.objectStoreNames);
                if (!negozi.length) return ok([x, []]);
                const t = d.transaction(negozi, 'readonly');
                const out = [];
                let mancano = negozi.length;
                for (const n of negozi) {
                  const g = t.objectStore(n).getAll();
                  g.onsuccess = () => {
                    out.push([n, JSON.stringify(g.result)]);
                    if (--mancano === 0) {
                      d.close();
                      ok([x, out.sort()]);
                    }
                  };
                }
              };
              r.onerror = () => ok([x, 'errore']);
            }),
        ),
      );
    }
    return JSON.stringify({ local: tutto(localStorage), session: tutto(sessionStorage), db, righe });
  });
}

const browser = await chromium.launch();
try {
  const { page } = await contesto(browser, 'R');
  const origine = new URL(base).origin;
  let fuori = [];
  let socket = [];
  let ascolta = false;
  page.on('request', (r) => {
    if (ascolta && !r.url().startsWith(origine)) fuori.push(r.url());
  });
  page.on('websocket', (w) => {
    if (ascolta && !/\/@vite|vite-hmr|__vite/.test(w.url()) && !w.url().startsWith(origine.replace('http', 'ws'))) socket.push(w.url());
  });

  await page.goto(base);
  await finche(() => visibile(page, 'frase'), 15000, 'Ingresso mai visto');
  // nessuna parola della revisione nell'Ingresso
  const testoIngresso = (await page.locator('body').innerText()).toLowerCase();
  if (testoIngresso.includes('revision')) fallisci('l’Ingresso nomina la revisione');
  await attendi(800);
  const prima = await memoria(page);

  ascolta = true;
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('frase').press('Enter');
  await finche(() => visibile(page, 'revisione'), 5000, 'la frase non apre la revisione');
  const righe = await page.locator('.revisione-riga').count();
  if (righe !== 101) fallisci(`righe nell'elenco: ${righe} (attese 101)`);
  await page.screenshot({ path: `${IMG}t9-revisione-elenco.png` });

  for (const n of [0, 9, 50, 100]) {
    await page.getByTestId(`revisione-${n}`).click();
    const scena = page.getByTestId('capitolo-scena');
    await finche(async () => (await scena.getAttribute('data-fiore').catch(() => null)) === String(n), 3000, `capitolo ${n} non aperto`);
    if ((await scena.getAttribute('data-battuta')) !== '0') fallisci(`capitolo ${n}: non parte dalla prima battuta`);
    const totale = await page.locator('.capitolo-punti li').count();
    for (let k = 1; k < totale; k++) {
      await attendi(340); // guardia di 300 ms dopo ogni battuta
      await page.locator('.capitolo-avanti').click({ position: { x: 195, y: 300 } });
      await finche(async () => (await scena.getAttribute('data-battuta')) === String(k), 2000, `capitolo ${n}: battuta ${k} mai arrivata`);
      if ((n === 9 || n === 50) && k === Math.min(3, totale - 1)) await page.screenshot({ path: `${IMG}t9-revisione-capitolo-${n}.png` });
    }
    // indietro di una e di nuovo avanti
    await page.locator('.capitolo-indietro').click();
    await finche(async () => (await scena.getAttribute('data-battuta')) === String(totale - 2), 2000, `capitolo ${n}: indietro non torna`);
    await attendi(340);
    await page.locator('.capitolo-avanti').click({ position: { x: 195, y: 300 } });
    // all'ultima battuta "Continua" porta al capitolo dopo (dal 100 all'elenco)
    await finche(() => visibile(page, 'capitolo-continua'), 3000, `capitolo ${n}: Continua mai comparso`);
    if (n === 50) {
      await page.getByTestId('revisione-anteprima').click();
      await finche(() => visibile(page, 'revisione-dopo'), 3000, 'anteprima mai aperta');
      await attendi(400);
      await page.screenshot({ path: `${IMG}t9-revisione-dopo-50.png` });
      await page.getByTestId('revisione-dopo-chiudi').click();
    }
    await page.getByTestId('capitolo-continua').click();
    if (n < 100) {
      await finche(async () => (await scena.getAttribute('data-fiore').catch(() => null)) === String(n + 1), 3000, `dopo il ${n} non arriva il ${n + 1}`);
      await page.getByTestId('revisione-prec').click();
      await finche(async () => (await scena.getAttribute('data-fiore').catch(() => null)) === String(n), 3000, `capitolo precedente: non torna al ${n}`);
      await page.getByTestId('revisione-elenco').click();
    }
    await finche(async () => !(await visibile(page, 'capitolo-scena')), 3000, `capitolo ${n}: l'elenco non torna`);
    console.log(`capitolo ${n}: ${totale} battute, avanti e indietro`);
  }

  await attendi(800);
  const dopo = await memoria(page);
  if (dopo !== prima) fallisci(`memoria del browser cambiata durante la revisione\nprima ${prima.length} car., dopo ${dopo.length} car.`);
  if (fuori.length) fallisci(`richieste fuori dalla pagina: ${[...new Set(fuori)].join(', ')}`);
  if (socket.length) fallisci(`WebSocket aperti: ${socket.join(', ')}`);
  console.log('memoria identica, nessuna richiesta esterna, nessun WebSocket');

  await page.getByTestId('revisione-esci').click();
  await finche(() => visibile(page, 'frase'), 3000, 'Esci non torna all’Ingresso');
  ascolta = false;
  // ricaricando non si resta in revisione
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('frase').press('Enter');
  await finche(() => visibile(page, 'revisione'), 5000, 'seconda entrata mancata');
  await page.reload();
  await finche(() => visibile(page, 'frase'), 15000, 'ricaricando non si torna all’Ingresso');
  if (await visibile(page, 'revisione')) fallisci('dopo il ricaricamento la revisione è ancora aperta');
  const finale = await memoria(page);
  if (finale !== prima) fallisci('memoria del browser cambiata dopo uscita e ricaricamento');
  console.log('Esci e ricaricamento: di nuovo all’Ingresso, memoria identica');

  // --- seconda parte: dalla stanza di coppia aperta alla revisione ---
  const s = await contesto(browser, 'S');
  // mai il Worker vero (KV di Genna) dagli E2E: senza, ICE statici e nessuna sync
  await s.page.route(/workers\.dev/, (r) => r.abort());
  const aperti = [];
  s.page.on('websocket', (w) => {
    if (/peerjs/.test(w.url())) {
      const voce = { url: w.url(), quando: Date.now(), chiuso: false };
      aperti.push(voce);
      w.on('close', () => (voce.chiuso = true));
    }
  });
  await s.page.goto(base);
  await finche(() => visibile(s.page, 'frase'), 15000, 'S: Ingresso mai visto');
  await s.page.getByTestId('scegli-semino').click();
  await s.page.getByTestId('frase').fill('qa revisione stanza di prova');
  await s.page.getByTestId('entra').click();
  await finche(async () => aperti.length > 0, 10000, 'S: nessun WebSocket verso PeerJS: la stanza di coppia non si apre');
  await s.page.getByText('cambia profilo o frase').click();
  await finche(() => visibile(s.page, 'frase'), 3000, 'S: "cambia profilo o frase" non porta all’Ingresso');
  await s.page.getByTestId('frase').fill(frase);
  await s.page.getByTestId('frase').press('Enter');
  await finche(() => visibile(s.page, 'revisione'), 5000, 'S: la frase non apre la revisione');
  const entrata = Date.now();
  await finche(async () => aperti.every((w) => w.chiuso), 5000, 'S: la stanza resta aperta in revisione');
  await attendi(800);
  const memS = await memoria(s.page);
  await s.page.getByTestId('revisione-9').click();
  await attendi(400);
  await s.page.getByTestId('revisione-anteprima').click();
  await attendi(400);
  await s.page.getByTestId('revisione-dopo-chiudi').click();
  await s.page.getByTestId('revisione-elenco').click();
  await attendi(4000);
  if (aperti.some((w) => w.quando >= entrata)) fallisci('S: aperto un WebSocket verso PeerJS durante la revisione');
  if ((await memoria(s.page)) !== memS) fallisci('S: memoria del browser cambiata durante la revisione');
  if (!(await s.page.evaluate(() => (localStorage.getItem('sudoku-coppia-archivio') ?? '').includes('qa revisione stanza di prova'))))
    fallisci('S: la frase della coppia non è più nell’archivio');
  console.log(`dalla stanza di coppia: ${aperti.length} WebSocket chiusi entrando, nessuno nuovo, memoria identica`);

  const errori = log.filter((r) => /uncaught/i.test(r));
  if (errori.length) fallisci(`errori in console:\n${errori.join('\n')}`);
  console.log('OK revisione');
} finally {
  await browser.close();
}
