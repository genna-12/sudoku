// Validazione indipendente della stanza di revisione (T9). Complementare a revisione.mjs:
//  A. profilo con dati (archivio, capitoli visti, eco, scena): memoria del browser (localStorage,
//     sessionStorage, IndexedDB, Cache Storage) byte per byte prima/durante/dopo la revisione; nessuna
//     richiesta esterna né WebSocket in revisione; poi la stanza di coppia si riapre (WebSocket PeerJS).
//  B. varianti della frase (maiuscole, spazi, una lettera sbagliata/mancante/in più): apre solo la frase
//     normalizzata; nessuna parola "revision" in Ingresso, Home e Menù (testo, aria, classi, title).
//  C. Ingresso: frase della coppia scritta e inviata nello stesso istante (hash non pronto): ritardo;
//     doppio invio: quanti WebSocket verso PeerJS.
//  D. lettore: fondale e palco dei capitoli 0, 9, 46, 77, 100 battuta per battuta uguali a quelli di App
//     (rilettura dal diario con 100 fiori); la barra in fondo non copre fumetto né Continua (360×640, 390×844).
// Uso: REVISIONE_FRASE=… node scripts/qa/revisione-val.mjs [urlBase]  (PeerJS locale e vite con VITE_PEER_*)
// La frase arriva solo dall'ambiente e non si stampa mai (nemmeno le varianti).
import { attendi, chromium, contesto, fallisci, finche, leggiCoda, log, scriviArchivio, visibile } from './comune.mjs';

const base = process.argv[2] ?? 'http://127.0.0.1:5373/sudoku/';
const frase = process.env.REVISIONE_FRASE;
if (!frase) fallisci('manca REVISIONE_FRASE nell’ambiente');
const CAPS = [0, 9, 46, 77, 100];
const PARTI = process.env.QA_PARTI ?? 'ABCD'; // E solo con la build (vite preview)
const difetti = [];
const difetto = (m) => {
  difetti.push(m);
  console.log('DIFETTO ' + m);
};

async function memoria(page) {
  return page.evaluate(async () => {
    const tutto = (s) =>
      Object.fromEntries(
        Array.from({ length: s.length }, (_, i) => s.key(i))
          .sort()
          .map((k) => [k, s.getItem(k)]),
      );
    const nomi = indexedDB.databases ? (await indexedDB.databases()).map((d) => `${d.name}@${d.version}`).sort() : [];
    const righe = [];
    for (const x of nomi) {
      righe.push(
        await new Promise((ok) => {
          const r = indexedDB.open(x.split('@')[0]);
          r.onsuccess = () => {
            const d = r.result;
            const negozi = Array.from(d.objectStoreNames).sort();
            if (!negozi.length) return (d.close(), ok([x, []]));
            const t = d.transaction(negozi, 'readonly');
            const out = [];
            let mancano = negozi.length;
            for (const n of negozi) {
              const g = t.objectStore(n).getAll();
              g.onsuccess = () => {
                out.push([n, JSON.stringify(g.result)]);
                if (--mancano === 0) (d.close(), ok([x, out.sort()]));
              };
            }
          };
          r.onerror = () => ok([x, 'errore']);
        }),
      );
    }
    const cache = [];
    if (self.caches) for (const k of (await caches.keys()).sort()) cache.push([k, (await (await caches.open(k)).keys()).map((q) => q.url).sort()]);
    return JSON.stringify({
      local: tutto(localStorage),
      session: tutto(sessionStorage),
      db: righe,
      cache,
    });
  });
}
function differenze(a, b) {
  const x = JSON.parse(a);
  const y = JSON.parse(b);
  const d = [];
  for (const s of ['local', 'session']) for (const k of new Set([...Object.keys(x[s]), ...Object.keys(y[s])])) if (x[s][k] !== y[s][k]) d.push(`${s}:${k}`);
  if (JSON.stringify(x.db) !== JSON.stringify(y.db)) d.push('indexedDB');
  if (JSON.stringify(x.cache) !== JSON.stringify(y.cache)) d.push('cache');
  return d;
}
async function entraRevisione(page) {
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('frase').press('Enter');
  await finche(() => visibile(page, 'revisione'), 5000, 'la frase non apre la revisione');
}

const browser = await chromium.launch();
try {
  // ---------------- A. profilo con dati ----------------
  if (PARTI.includes('A')) {
    const { page } = await contesto(browser, 'A');
    await page.route(/workers\.dev/, (r) => r.abort());
    const origine = new URL(base).origin;
    const fuori = [];
    const ws = [];
    let ascolta = false;
    page.on('request', (r) => ascolta && !r.url().startsWith(origine) && fuori.push(r.url()));
    page.on('websocket', (w) => {
      if (/peerjs/.test(w.url())) {
        const v = { quando: Date.now(), chiuso: false, inRevisione: ascolta };
        ws.push(v);
        w.on('close', () => (v.chiuso = true));
      } else if (ascolta && !/vite|__vite|token=/.test(w.url())) fuori.push(w.url());
    });
    await scriviArchivio(page, {
      nome: 'Semino',
      frase: 'qa val coppia dati',
      fiori: 12,
      viste: [],
      seed: 7,
      mancanti: 3,
    });
    // un po' di vita vera: capitoli letti, eco, scena vista
    await attendi(800);
    if (!(await visibile(page, 'capitolo-scena')) && (await visibile(page, 'capitoli-da-leggere'))) await page.getByTestId('capitoli-da-leggere').click();
    if (await visibile(page, 'capitolo-scena').then((v) => v || attendi(800).then(() => visibile(page, 'capitolo-scena')))) {
      const letti = await leggiCoda(page, 20);
      console.log(`A: letti i capitoli ${letti.join(',')}`);
    }
    await finche(() => visibile(page, 'home'), 5000, 'A: Home dopo la lettura');
    await attendi(1500);
    const arch = JSON.parse(await page.evaluate(() => localStorage.getItem('sudoku-coppia-archivio')));
    console.log(
      `A: archivio con ${arch.storico?.length} voci, visti a=${arch.capitoliVisti?.a?.length}, eco ${arch.ecoViste?.length}; chiavi: ${await page.evaluate(() => Object.keys(localStorage).join(','))}`,
    );
    await page.getByText('cambia profilo o frase').click();
    await finche(() => visibile(page, 'frase'), 3000, 'A: Ingresso mai visto');
    await attendi(1500);
    const s0 = await memoria(page);
    ascolta = true;
    await entraRevisione(page);
    for (const n of CAPS) {
      await page.getByTestId(`revisione-${n}`).click();
      for (let k = 0; k < 4; k++) {
        await attendi(340);
        await page
          .locator('.capitolo-avanti')
          .click({ position: { x: 195, y: 300 } })
          .catch(() => {});
      }
      await page.getByTestId('revisione-anteprima').click();
      await attendi(300);
      await page.getByTestId('revisione-dopo-chiudi').click();
      await page.getByTestId('revisione-elenco').click();
    }
    await attendi(1500);
    const s1 = await memoria(page);
    let d = differenze(s0, s1);
    if (d.length) difetto(`A: memoria cambiata durante la revisione: ${d.join(', ')}`);
    ascolta = false;
    if (fuori.length) difetto(`A: richieste esterne in revisione: ${[...new Set(fuori)].join(', ')}`);
    if (ws.some((w) => w.inRevisione)) difetto('A: WebSocket PeerJS aperto in revisione');
    if (!ws.every((w) => w.chiuso)) difetto('A: WebSocket della stanza ancora aperto in revisione');
    console.log(`A: in revisione: ${ws.length} WebSocket della stanza tutti chiusi, nessuno nuovo, ${fuori.length} richieste esterne`);
    const primaEsci = ws.length;
    await page.getByTestId('revisione-esci').click();
    await finche(() => visibile(page, 'frase'), 3000, 'A: Esci non torna all’Ingresso');
    // App rinasce con l'io dell'archivio: la stanza di coppia si riapre da sola (come all'Ingresso prima)
    await finche(async () => ws.length > primaEsci, 10000, 'A: dopo Esci la stanza di coppia non si riapre');
    await attendi(2500);
    const s2 = await memoria(page);
    d = differenze(s0, s2);
    if (d.length) difetto(`A: memoria cambiata dopo Esci (Ingresso, prima di entrare): ${d.join(', ')}`);
    console.log(`A: revisione e Esci: memoria ${differenze(s0, s2).length ? 'DIVERSA' : 'identica'} (local, session, IDB, cache); stanza riaperta`);
    // la stanza di coppia di nuovo: il colore è ricordato, la frase pure (campo precompilato?)
    const val = await page.getByTestId('frase').inputValue();
    if (val !== 'qa val coppia dati')
      console.log(`A: nota: dopo Esci il campo frase non ha la frase della coppia (${val === '' ? 'vuoto' : 'altro testo, lunghezza ' + val.length})`);
    await page.getByTestId('frase').fill('qa val coppia dati');
    if (!(await page.getByTestId('entra').isEnabled())) await page.getByTestId('scegli-semino').click();
    await page.getByTestId('entra').click();
    await finche(() => visibile(page, 'home'), 5000, 'A: la frase della coppia non riporta in Home');
    await finche(async () => ws.some((w) => !w.chiuso), 10000, 'A: in Home nessun WebSocket PeerJS aperto');
    await attendi(1500);
    const s3 = await memoria(page);
    const a0 = JSON.parse(JSON.parse(s0).local['sudoku-coppia-archivio']);
    const a3 = JSON.parse(JSON.parse(s3).local['sudoku-coppia-archivio']);
    const campi = Object.keys({ ...a0, ...a3 }).filter((k) => JSON.stringify(a0[k]) !== JSON.stringify(a3[k]));
    console.log(`A: di nuovo nella stanza di coppia; campi dell'archivio diversi da prima della revisione: ${campi.join(',') || 'nessuno'}`);
    await page.reload();
    await finche(() => visibile(page, 'home'), 15000, 'A: dopo il ricaricamento non si torna in Home');
    if (await visibile(page, 'revisione')) difetto('A: revisione aperta dopo il ricaricamento');
    console.log('A: ricaricato in Home, stanza di coppia ok');
    await page.context().close();
  }

  // ---------------- B. varianti e tracce nella UI ----------------
  if (PARTI.includes('B')) {
    const norm = frase.trim().toLowerCase().replace(/\s+/g, ' ');
    const cambia = (s, i) => s.slice(0, i) + (s[i] === 'x' ? 'y' : 'x') + s.slice(i + 1);
    const varianti = [
      ['maiuscole', norm.toUpperCase(), true],
      ['iniziali maiuscole', norm.replace(/\b\w/g, (c) => c.toUpperCase()), true],
      ['spazi in più dentro e fuori', '  ' + norm.replace(/ /g, '   ') + '  ', true],
      ['tab al posto degli spazi', norm.replace(/ /g, '\t'), true],
      ['una lettera sbagliata', cambia(norm, 3), false],
      ['ultima lettera mancante', norm.slice(0, -1), false],
      ['una lettera in più', norm + 'e', false],
      ['senza spazi', norm.replace(/ /g, ''), false],
      ['punto finale', norm + '.', false],
    ];
    const { page } = await contesto(browser, 'B');
    await page.route(/workers\.dev/, (r) => r.abort());
    for (const [nome, testo, apre] of varianti) {
      await page.goto(base);
      await finche(() => visibile(page, 'frase'), 15000, 'B: Ingresso mai visto');
      await page.getByTestId('frase').fill(testo);
      await page.getByTestId('frase').press('Enter');
      await attendi(700);
      const aperta = await visibile(page, 'revisione');
      console.log(`B: ${nome}: ${aperta ? 'apre' : 'non apre'}${aperta === apre ? '' : '  <-- inatteso'}`);
      if (aperta !== apre) difetto(`B: variante "${nome}" ${aperta ? 'apre' : 'non apre'}`);
    }
    // tracce: Ingresso (anche con colore scelto), Home e Menù
    const traccia = async (dove) => {
      // DOM senza <style>/<script> (in dev vite inietta revisione.css come <style>: regole, non UI)
      const html = await page.evaluate(() => {
        const c = document.documentElement.cloneNode(true);
        c.querySelectorAll('style,script').forEach((s) => s.remove());
        return c.outerHTML + document.title;
      });
      const m = html.match(/revision/gi);
      if (m) difetto(`B: "${m[0]}" compare nell'HTML di ${dove} (${m.length} volte)`);
      else console.log(`B: ${dove}: nessuna traccia`);
    };
    await page.goto(base);
    await finche(() => visibile(page, 'frase'), 15000, 'B: Ingresso');
    await traccia('Ingresso');
    await page.getByTestId('scegli-semino').click();
    await page.getByTestId('frase').fill('qa val tracce');
    await traccia('Ingresso col colore');
    await page.getByTestId('entra').click();
    await finche(() => visibile(page, 'home'), 5000, 'B: Home');
    await attendi(800);
    await traccia('Home');
    const menu = page.locator('[data-testid="menu"], [aria-label*="enù"], [aria-label*="enu"]').first();
    if (await menu.count()) {
      await menu.click();
      await attendi(400);
      await traccia('Home col Menù aperto');
    } else console.log('B: bottone del Menù non trovato');
    const ss = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
    if (/revision/i.test(ss)) difetto('B: "revision" nella memoria del browser');
    await page.context().close();
  }

  // ---------------- C. Ingresso: tempi e doppio invio ----------------
  if (PARTI.includes('C')) {
    for (const doppio of [false, true]) {
      const { page } = await contesto(browser, doppio ? 'C2' : 'C1');
      await page.route(/workers\.dev/, (r) => r.abort());
      let peer = 0;
      page.on('websocket', (w) => /peerjs/.test(w.url()) && peer++);
      await page.goto(base);
      await page.getByTestId('frase').waitFor({ timeout: 15000 });
      await page.getByTestId('scegli-semino').click();
      // scrittura e invio nello stesso compito: l'hash della frase non può essere pronto
      const ms = await page.evaluate(async (doppio) => {
        const el = document.querySelector('[data-testid="frase"]');
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(el, 'qa val ingresso subito ' + (doppio ? 'due' : 'uno'));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        const t0 = performance.now();
        el.form.requestSubmit();
        if (doppio) el.form.requestSubmit();
        while (!document.querySelector('[data-testid="home"]')) {
          if (performance.now() - t0 > 5000) return -1;
          await new Promise((r) => setTimeout(r, 1));
        }
        return performance.now() - t0;
      }, doppio);
      const hash = await page.evaluate(async () => {
        const t0 = performance.now();
        for (let i = 0; i < 20; i++) await crypto.subtle.digest('SHA-256', new TextEncoder().encode('qa val prova ' + i));
        return (performance.now() - t0) / 20;
      });
      await attendi(3000);
      const arch = await page.evaluate(() => localStorage.getItem('sudoku-coppia-archivio') ?? '');
      console.log(
        `C: invio ${doppio ? 'doppio' : 'singolo'} con hash non pronto: Home dopo ${ms.toFixed(1)} ms (sha256 medio ${hash.toFixed(2)} ms); WebSocket PeerJS aperti ${peer}; frase nell'archivio ${arch.includes('qa val ingresso subito') ? 'sì' : 'NO'}`,
      );
      if (ms < 0) difetto('C: la frase della coppia inviata subito non porta in Home');
      await page.context().close();
    }
    // frase normale: scrittura con la tastiera, poi Entra (il caso reale)
    const { page } = await contesto(browser, 'C3');
    await page.route(/workers\.dev/, (r) => r.abort());
    await page.goto(base);
    await page.getByTestId('frase').waitFor({ timeout: 15000 });
    await page.getByTestId('scegli-semino').click();
    await page.getByTestId('frase').pressSequentially('qa val tastiera', { delay: 5 });
    const t0 = Date.now();
    await page.getByTestId('entra').click();
    await page.getByTestId('home').waitFor({ timeout: 5000 });
    console.log(`C: digitata e Entra: Home dopo ${Date.now() - t0} ms (clic compreso)`);
    await page.context().close();
  }

  // ---------------- D. lettore: revisione = App; barra in fondo ----------------
  for (const vp of !PARTI.includes('D')
    ? []
    : [
        { width: 390, height: 844 },
        { width: 360, height: 640 },
      ]) {
    const scatta = async (page, n) => {
      // fondale e palco del capitolo n alla battuta corrente, senza attributi di animazione
      return page.evaluate(() => {
        const s = document.querySelector('[data-testid="capitolo-scena"]');
        // via gli id di useId (dipendono da quanti componenti sono montati) e le fasi casuali del respiro
        const id = (t) => t.replace(/_r_[0-9a-z]+_/g, '_r_');
        // e il fotogramma della bocca che parla (data-b, scorre col tempo)
        const pulisci = (el) => (el ? id(el.outerHTML.replace(/ style="[^"]*"/g, '').replace(/ data-b="\d+"/g, '')) : '');
        const stile = (t) => id(t ?? '').replace(/--fase-[a-z]+: [-0-9.]+s;?/g, '');
        return {
          battuta: s.dataset.battuta,
          fondale: pulisci(s.querySelector('.capitolo-fondale')),
          palco: pulisci(s.querySelector('.capitolo-palco')),
          testo: s.querySelector('.capitolo-battuta')?.textContent ?? '',
          stile: [...s.querySelectorAll('.capitolo-fondale [style], .capitolo-palco [style]')].map((e) => stile(e.getAttribute('style'))).join('|'),
        };
      });
    };
    const avanti = async (page) => {
      await attendi(340);
      await page.locator('.capitolo-avanti').click({ position: { x: vp.width / 2, y: vp.height * 0.4 } });
    };
    // App: archivio con 100 fiori e tutti i capitoli letti, rilettura dal diario
    const app = await contesto(browser, 'D-app', vp);
    await app.page.route(/workers\.dev/, (r) => r.abort());
    await scriviArchivio(app.page, {
      nome: 'Semino',
      frase: 'qa val lettore cento',
      fiori: 100,
      viste: [],
      seed: 9,
      mancanti: 3,
    });
    await attendi(1500);
    await app.page.evaluate(() => {
      const a = JSON.parse(localStorage.getItem('sudoku-coppia-archivio'));
      const tutti = Array.from({ length: 101 }, (_, k) => `capitolo-${k}`);
      a.capitoliVisti = { a: tutti, b: tutti };
      a.ecoViste = Array.from({ length: 101 }, (_, k) => `eco-${k}`);
      localStorage.setItem('sudoku-coppia-archivio', JSON.stringify(a));
    });
    await app.page.reload();
    await app.page.getByTestId('home').waitFor({ timeout: 15000 });
    await attendi(800);
    const rev = await contesto(browser, 'D-rev', vp);
    await rev.page.route(/workers\.dev/, (r) => r.abort());
    await rev.page.goto(base);
    await rev.page.getByTestId('frase').waitFor({ timeout: 15000 });
    await entraRevisione(rev.page);
    for (const n of CAPS) {
      await app.page.getByTestId('giardino').click();
      await app.page.getByTestId('diario').waitFor({ timeout: 5000 });
      await app.page.evaluate((n) => document.querySelector(`[data-testid="diario-${n}"]`).click(), n);
      await app.page.getByTestId('capitolo-scena').waitFor({ timeout: 5000 });
      await rev.page.getByTestId(`revisione-${n}`).click();
      await rev.page.getByTestId('capitolo-scena').waitFor({ timeout: 5000 });
      const totale = await rev.page.locator('.capitolo-punti li').count();
      let uguali = 0;
      for (let k = 0; k < totale; k++) {
        await attendi(450);
        const [a, r] = [await scatta(app.page, n), await scatta(rev.page, n)];
        for (const parte of ['battuta', 'fondale', 'palco', 'testo', 'stile'])
          if (a[parte] !== r[parte]) {
            difetto(`D ${vp.width}: capitolo ${n} battuta ${k}: ${parte} diverso da App`);
            if (process.env.QA_LOG) {
              let j = 0;
              while (j < a[parte].length && a[parte][j] === r[parte][j]) j++;
              console.log(`  app: …${a[parte].slice(Math.max(0, j - 160), j + 120)}\n  rev: …${r[parte].slice(Math.max(0, j - 160), j + 120)}`);
            }
          } else if (parte === 'palco') uguali++;
        // barra in fondo: non copre fumetto, nota, lettera né Continua
        const sovrap = await rev.page.evaluate(() => {
          const b = document.querySelector('.revisione-barra')?.getBoundingClientRect();
          if (!b) return ['barra assente'];
          const out = [];
          for (const sel of ['.capitolo-battuta > *', '.capitolo-battuta .fumetto', '[data-testid="capitolo-continua"]', '.capitolo-dopo']) {
            for (const e of document.querySelectorAll(sel)) {
              const r = e.getBoundingClientRect();
              if (!r.width || !r.height) continue;
              const x = Math.min(r.right, b.right) - Math.max(r.left, b.left);
              const y = Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top);
              if (x > 1 && y > 1) out.push(`${sel} (${Math.round(y)} px)`);
            }
          }
          return out;
        });
        if (sovrap.length) difetto(`D ${vp.width}×${vp.height}: capitolo ${n} battuta ${k}: la barra copre ${sovrap.join(', ')}`);
        if (k < totale - 1) {
          await avanti(app.page);
          await avanti(rev.page);
        }
      }
      if (!(await visibile(rev.page, 'capitolo-continua'))) difetto(`D: capitolo ${n}: Continua non visibile all'ultima battuta`);
      console.log(`D ${vp.width}×${vp.height}: capitolo ${n}: ${totale} battute, palco uguale ad App in ${uguali}`);
      await app.page.getByTestId('capitolo-continua').click();
      await finche(async () => !(await visibile(app.page, 'capitolo-scena')), 3000, 'D: la rilettura in App non si chiude');
      await app.page.keyboard.press('Escape');
      await attendi(300);
      if (!(await visibile(app.page, 'home'))) {
        await app.page.goBack().catch(() => {});
        await attendi(300);
      }
      await rev.page.getByTestId('revisione-elenco').click();
    }
    // tutti i capitoli all'ultima battuta: Continua libero dalla barra (solo 360×640)
    if (vp.width === 360) {
      let coperti = 0;
      await rev.page.getByTestId('revisione-0').click();
      for (let n = 0; n <= 100; n++) {
        const tot = await rev.page.locator('.capitolo-punti li').count();
        for (let k = 1; k < tot; k++) await avanti(rev.page);
        await rev.page.getByTestId('capitolo-continua').waitFor({ timeout: 3000 });
        const c = await rev.page.evaluate(() => {
          const b = document.querySelector('.revisione-barra').getBoundingClientRect();
          const out = [];
          for (const e of document.querySelectorAll('.capitolo-battuta > *, [data-testid="capitolo-continua"]')) {
            const r = e.getBoundingClientRect();
            if (r.height && r.bottom > b.top + 1 && r.top < b.bottom) out.push(e.className || e.dataset.testid);
          }
          return out;
        });
        if (c.length) {
          coperti++;
          difetto(`D 360×640: capitolo ${n} ultima battuta: la barra copre ${c.join(', ')}`);
        }
        if (n < 100) await rev.page.getByTestId('revisione-succ').click();
      }
      console.log(`D 360×640: ultime battute di 101 capitoli, coperte ${coperti}`);
    }
    await app.ctx.close();
    await rev.ctx.close();
  }

  // ---------------- E. (solo con la build: vite preview) service worker e Cache Storage ----------------
  if (PARTI.includes('E')) {
    const { page } = await contesto(browser, 'E');
    await page.route(/workers\.dev/, (r) => r.abort());
    await page.goto(base);
    await page.getByTestId('frase').waitFor({ timeout: 15000 });
    const sw = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return 'assente';
      await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 8000))]);
      return navigator.serviceWorker.controller ? 'controlla' : (await navigator.serviceWorker.getRegistration()) ? 'registrato' : 'nessuno';
    });
    await attendi(3000);
    const e0 = await memoria(page);
    const cache0 = JSON.parse(e0).cache;
    await entraRevisione(page);
    for (const n of CAPS) {
      await page.getByTestId(`revisione-${n}`).click();
      await attendi(400);
      await page.getByTestId('revisione-anteprima').click();
      await attendi(300);
      await page.getByTestId('revisione-dopo-chiudi').click();
      await page.getByTestId('revisione-elenco').click();
    }
    await attendi(1500);
    const e1 = await memoria(page);
    await page.getByTestId('revisione-esci').click();
    await attendi(1500);
    const e2 = await memoria(page);
    const d1 = differenze(e0, e1);
    const d2 = differenze(e0, e2);
    if (d1.length) difetto(`E: memoria cambiata in revisione: ${d1.join(', ')}`);
    if (d2.length) difetto(`E: memoria cambiata dopo Esci: ${d2.join(', ')}`);
    console.log(
      `E: service worker ${sw}; cache ${cache0.map(([k, v]) => `${k} (${v.length})`).join(', ') || 'vuota'}; in revisione e dopo Esci ${d1.length || d2.length ? 'DIVERSA' : 'identica'}`,
    );
    await page.context().close();
  }

  const errori = log.filter((r) => /uncaught/i.test(r));
  if (errori.length) difetto(`errori in console:\n${errori.join('\n')}`);
  if (difetti.length) fallisci(`${difetti.length} difetti`);
  console.log('OK revisione-val');
} finally {
  await browser.close();
}
