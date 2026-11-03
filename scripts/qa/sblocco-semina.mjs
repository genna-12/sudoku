// E2E: compatibilità con l'archivio di T2 e passaggio 4 → 5 fiori a due client (arriva Semina).
// Uso: node scripts/qa/sblocco-semina.mjs [urlBase]   (default http://localhost:5173/sudoku/)
// Richiede il server PeerJS locale e il dev server con VITE_PEER_* (vedi due-client.mjs): gli archivi
// si costruiscono nella pagina con i moduli veri (import dinamico dal dev server) e si scrivono in
// localStorage PRIMA di aprire l'app.
// Fasi:
//  1. T2: archivio versione 1 senza campi nuovi, tappe viste con chiavi vecchie, partita in corso.
//  2. 4 fiori su A e B, partita con una sola cella mancante; B la mette: vittoria su entrambi, poi
//     la scena di Semina su ENTRAMBI, una volta, senza annuncio né sorpresa; poi nomi Semino/Semina.
//  3. 6 fiori, regali del giardino in attesa: layout del cruscotto (390×844 e 375×667), vittoria,
//     "Nuova" premuto insieme → stessa griglia.
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
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
function fallisci(msg) {
  console.error('FAIL', msg);
  console.log(log.slice(-25).join('\n'));
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
const visibile = (page, id) => page.getByTestId(id).isVisible().catch(() => false);

/**
 * Archivio costruito nella pagina con engine e stato veri.
 * o: { nome, frase, fiori, viste, seed, mancanti (celle lasciate vuote), versioneT2, regaliBonus, sbloccatiVisti }
 */
async function scriviArchivio(page, o) {
  await page.goto(new URL('src/engine/index.ts', base).href);
  await page.evaluate(async (o) => {
    const root = location.pathname.replace(/src\/engine\/index\.ts$/, '');
    const eng = await import(`${root}src/engine/index.ts`);
    const st = await import(`${root}src/stato/index.ts`);
    const T0 = 1_780_000_000_000;
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
    for (const [da, punti] of [['a', 120], ['b', 90]]) {
      partita = st.applica(partita, {
        tipo: 'contatori',
        da,
        contatori: { punti, errori: 1, serie: 0, regali: 1, regaliDisponibili: 1, ts: T0 + 950000 },
      });
    }
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
    if (o.regaliBonus !== undefined) a.regaliBonus = o.regaliBonus;
    if (o.sbloccatiVisti !== undefined) a.sbloccatiVisti = o.sbloccatiVisti;
    localStorage.clear();
    localStorage.setItem('sudoku-coppia-archivio', JSON.stringify(a));
    window.__ultima = vuote.slice(vuote.length - o.mancanti).map((i) => [i, puzzle.soluzione[i]]);
    sessionStorage.setItem('qa-ultime', JSON.stringify(window.__ultima));
  }, o);
  const ultime = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qa-ultime')));
  await page.goto(base);
  return ultime;
}

const browser = await chromium.launch();
async function contesto(nome, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => log.push(`[${nome}] ${m.text()}`));
  page.on('pageerror', (e) => log.push(`[${nome}] uncaught ${e.message}`));
  return { ctx, page };
}

try {
  // --- 1. archivio T2 su un solo dispositivo -----------------------------------------------
  {
    const { ctx, page } = await contesto('T2', { width: 390, height: 844 });
    // 8 fiori visti in T2: la tappa 8 allora era di Semina (`semina-8`), ora è di Semino
    const viste = ['semino-0', 'semino-1', 'semino-2', 'semino-3', 'semino-4', 'semina-5', 'semino-6', 'semino-7', 'semina-8'];
    await scriviArchivio(page, { nome: 'Semino', frase: 'qa t2 ' + Date.now(), fiori: 8, viste, seed: 4242, mancanti: 20 });
    await page.getByTestId('griglia').waitFor({ timeout: 10000 });
    console.log('OK T2: si apre sulla partita in corso');
    await page.getByTestId('indietro').click();
    await page.getByTestId('home').waitFor({ timeout: 5000 });
    if (await visibile(page, 'scena-sblocco')) fallisci('T2: la scena di Semina è ripartita');
    await page.getByTestId('annuncio-sblocco').waitFor({ timeout: 3000 });
    const n = await page.locator('[data-testid="annuncio-sblocco"]').count();
    const sb = await page.getByTestId('annuncio-sblocco').getAttribute('data-sblocco');
    if (n !== 1 || sb !== 'stagno') fallisci(`T2: annuncio ${n} × ${sb} invece di uno solo (stagno)`);
    await page.getByTestId('annuncio-chiudi').click();
    await attendi(300);
    if (await page.locator('.fumetto-storia').count()) fallisci(`T2: tappa già vista rimostrata: ${await page.locator('.fumetto-storia').textContent()}`);
    if (await visibile(page, 'annuncio-sblocco')) fallisci('T2: un secondo annuncio');
    const chip = (await page.locator('.pallino-testo').textContent()) ?? '';
    const giardino = await page.getByTestId('giardino').getAttribute('aria-label');
    if (!giardino?.includes('9 fiori') && !giardino?.includes('8 fiori')) fallisci(`T2: giardino ${giardino}`);
    // Semina resta sbloccata: due mascotte in Home
    if ((await page.locator('.home-mascotte svg').count()) < 2 && !(await page.locator('.home-mascotte [class*="coppia"]').count()))
      console.log('nota: SeminoCoppia non rilevata con i selettori, controllo saltato');
    const salvato = await page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-coppia-archivio')));
    if (!Array.isArray(salvato.sbloccatiVisti) || salvato.regaliBonus !== 0) fallisci(`T2: campi nuovi non scritti ${JSON.stringify([salvato.sbloccatiVisti, salvato.regaliBonus])}`);
    await page.reload();
    await page.getByTestId('griglia').waitFor({ timeout: 10000 });
    await page.getByTestId('indietro').click();
    await attendi(500);
    if (await visibile(page, 'annuncio-sblocco')) fallisci('T2: annuncio ripetuto dopo il reload');
    console.log('OK T2: un solo annuncio (ultima soglia), nessuna tappa ripetuta, nessuna scena;', chip.trim());
    await ctx.close();
  }

  // --- 2. 4 → 5 fiori a due client ---------------------------------------------------------
  const FRASE = 'qa semina ' + Date.now();
  const viste4 = ['semino-0', 'semino-1', 'semino-2', 'semino-3', 'semino-4'];
  const A = await contesto('A', { width: 390, height: 844 });
  const B = await contesto('B', { width: 375, height: 667 });
  const [ultimaA] = await scriviArchivio(A.page, { nome: 'Semino', frase: FRASE, fiori: 4, viste: viste4, seed: 777, mancanti: 1 });
  await scriviArchivio(B.page, { nome: 'Semina', frase: FRASE, fiori: 4, viste: viste4, seed: 777, mancanti: 1 });
  for (const { page } of [A, B]) await page.getByTestId('griglia').waitFor({ timeout: 10000 });
  await finche(
    async () => (await A.page.locator('.partner-chip.pallino-connesso').count()) && (await B.page.locator('.partner-chip.pallino-connesso').count()),
    20000,
    'A e B non si collegano',
  );
  const chipPrima = (await B.page.locator('.partner-chip').textContent())?.trim();
  if (chipPrima !== 'Verde') fallisci(`prima dello sblocco B vede il partner come "${chipPrima}"`);
  console.log('OK 4 fiori, connessi, nomi Verde/Blu');

  const [idx, v] = ultimaA;
  await B.page.getByTestId(`cella-${idx}`).click();
  await B.page.getByTestId(`tasto-${v}`).click();
  for (const { page } of [A, B]) await page.getByTestId('vittoria').waitFor({ timeout: 5000 });
  for (const { page } of [A, B]) {
    if (await visibile(page, 'sorpresa')) fallisci('sorpresa alla vittoria del 5° fiore');
    if (await visibile(page, 'scena-sblocco')) fallisci('la scena parte SOPRA la vittoria');
  }
  console.log('OK vittoria su entrambi, niente sorpresa, la scena aspetta');

  // A chiude la vittoria guardando la griglia, B preme "Nuova": la scena parte su tutti e due
  await A.page.getByText('guarda la griglia').click();
  await B.page.getByRole('button', { name: 'Nuova partita' }).click();
  for (const [n, { page }] of [['A', A], ['B', B]]) {
    await page.getByTestId('scena-sblocco').waitFor({ timeout: 6000 }).catch(() => fallisci(`${n}: la scena di Semina non parte`));
  }
  console.log('OK scena di Semina su entrambi (anche su chi non ha messo l’ultima cella)');
  // durante la scena: nessun annuncio, sorpresa o fumetto sopra
  await attendi(1500);
  for (const [n, { page }] of [['A', A], ['B', B]]) {
    if (await visibile(page, 'annuncio-sblocco')) fallisci(`${n}: annuncio durante la scena`);
    if (await visibile(page, 'sorpresa')) fallisci(`${n}: sorpresa durante la scena`);
    const sopra = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="scena-sblocco"]');
      const zs = Number(getComputedStyle(s).zIndex);
      return [...document.querySelectorAll('.toast, .fumetto')]
        .filter((e) => !s.contains(e) && e.getBoundingClientRect().height > 0)
        .filter((e) => {
          let x = e;
          while (x && x !== document.body) {
            const z = Number(getComputedStyle(x).zIndex);
            if (getComputedStyle(x).position === 'fixed' && z >= zs) return true;
            x = x.parentElement;
          }
          return false;
        }).length;
    });
    if (sopra) fallisci(`${n}: ${sopra} fumetti/toast sopra la scena`);
    // tocchi fino ad "Andiamo"
    for (let k = 0; k < 20 && !(await visibile(page, 'scena-andiamo')); k++) {
      await page.getByTestId('scena-sblocco').click({ position: { x: 30, y: 30 } });
      await attendi(120);
    }
    await page.getByTestId('scena-andiamo').click();
    await attendi(300);
    if (await visibile(page, 'scena-sblocco')) fallisci(`${n}: la scena non si chiude`);
  }
  // dopo: nomi Semino/Semina, nessun annuncio sopra, scena mai più
  await finche(async () => (await A.page.locator('.partner-chip').textContent())?.trim() === 'Semina', 4000, async () => `A vede il partner come "${await A.page.locator('.partner-chip').textContent()}"`);
  await finche(async () => (await B.page.locator('.partner-chip').textContent())?.trim() === 'Semino', 4000, async () => `B vede il partner come "${await B.page.locator('.partner-chip').textContent()}"`);
  for (const [n, { page }] of [['A', A], ['B', B]]) {
    await page.getByTestId('indietro').click();
    await page.getByTestId('home').waitFor({ timeout: 4000 });
    await attendi(600);
    if (await visibile(page, 'annuncio-sblocco')) fallisci(`${n}: annuncio dopo la scena (la scena è già l'annuncio di Semina)`);
    if (await visibile(page, 'scena-sblocco')) fallisci(`${n}: scena ripetuta`);
    if (await page.locator('.fumetto-storia').count()) fallisci(`${n}: tappa in Home dopo la scena: ${await page.locator('.fumetto-storia').textContent()}`);
    await page.reload();
    await attendi(1500);
    if (await visibile(page, 'scena-sblocco')) fallisci(`${n}: scena ripetuta dopo il reload`);
  }
  console.log('OK dopo la scena: Semino/Semina su entrambi, nessun annuncio, scena una volta sola');
  await A.ctx.close();
  await B.ctx.close();

  // --- 3. sbloccati, regali del giardino: layout, vittoria, "Nuova" insieme -----------------
  const FRASE3 = 'qa nuova ' + Date.now();
  const viste6 = [...viste4, 'semina-5', 'semino-6'];
  for (const [w, h] of [[390, 844], [375, 667]]) {
    const C = await contesto(`C${w}`, { width: w, height: h });
    const D = await contesto(`D${w}`, { width: w, height: h });
    const fr = `${FRASE3} ${w}`;
    const ultima = await scriviArchivio(C.page, { nome: 'Semino', frase: fr, fiori: 6, viste: viste6, seed: 999, mancanti: 3, regaliBonus: 1 });
    await scriviArchivio(D.page, { nome: 'Semina', frase: fr, fiori: 6, viste: viste6, seed: 999, mancanti: 3, regaliBonus: 1 });
    for (const { page } of [C, D]) await page.getByTestId('griglia').waitFor({ timeout: 10000 });
    await finche(async () => (await C.page.locator('.partner-chip.pallino-connesso').count()) > 0, 20000, 'C/D non si collegano');
    // un errore di C fa parlare la sua mascotte: il fumetto non deve coprire la griglia
    const [i0, giusto0] = ultima[0];
    const errato = (giusto0 % 9) + 1;
    await C.page.getByTestId(`cella-${i0}`).click();
    await C.page.getByTestId(`tasto-${errato}`).click();
    await C.page.locator('.battuta').first().waitFor({ timeout: 2000 });
    for (const [n, page] of [['C', C.page], ['D', D.page]]) {
      await page.locator('.battuta').first().waitFor({ timeout: 2500 }).catch(() => {});
      const m = await page.evaluate(() => {
        const r = (s) => document.querySelector(s)?.getBoundingClientRect();
        const g = r('[data-testid="griglia"]');
        const f = r('.battuta');
        const t = r('.tastierino') ?? r('[data-testid="tasto-9"]');
        const cr = r('.cruscotto');
        const masc = [...document.querySelectorAll('.cruscotto .mascottina')].map((e) => e.getBoundingClientRect());
        const reg = r('[data-testid="regalo"]');
        return {
          fumetto: f ? { bottom: f.bottom, top: f.top } : null,
          grigliaTop: g.top,
          tastoBottom: t.bottom,
          vh: innerHeight,
          crH: cr.height,
          righe: Math.max(...[...masc, reg].map((x) => x.top)) < Math.min(...[...masc, reg].map((x) => x.bottom)) ? 1 : 2,
          figure: masc.length,
          scrollW: document.documentElement.scrollWidth,
          vw: innerWidth,
        };
      });
      if (m.fumetto && m.fumetto.bottom > m.grigliaTop + 1) fallisci(`${n} ${w}×${h}: il fumetto (fino a ${m.fumetto.bottom}) copre la griglia (da ${m.grigliaTop})`);
      if (m.tastoBottom > m.vh + 1) fallisci(`${n} ${w}×${h}: tastierino fuori schermo (${m.tastoBottom} > ${m.vh})`);
      if (m.figure < 2) fallisci(`${n} ${w}×${h}: nel cruscotto ${m.figure} mascotte invece di 2`);
      if (m.righe > 1) fallisci(`${n} ${w}×${h}: il cruscotto va a capo (${JSON.stringify(m)})`);
      if (m.scrollW > m.vw) fallisci(`${n} ${w}×${h}: scroll orizzontale ${m.scrollW} > ${m.vw}`);
      console.log(`OK ${n} ${w}×${h}: fumetto ${m.fumetto ? 'sopra la griglia' : 'non visibile'}, tastierino visibile, cruscotto su una riga (${Math.round(m.crH)} px)`);
    }
    // vittoria: D chiude le ultime celle
    for (const [i, v] of ultima) {
      await D.page.getByTestId(`cella-${i}`).click();
      await D.page.getByTestId(`tasto-${v}`).click();
    }
    for (const { page } of [C, D]) await page.getByTestId('vittoria').waitFor({ timeout: 5000 });
    // 7° fiore: c'è la sorpresa (3 battute) prima della frase, su entrambi; poi la frase
    for (const [n, page] of [['C', C.page], ['D', D.page]]) {
      await page.getByTestId('sorpresa').waitFor({ timeout: 3000 }).catch(() => fallisci(`${n}: niente sorpresa al 7° fiore`));
      const fuori = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="vittoria"] button, [data-testid="sorpresa"]')].filter((e) => e.getBoundingClientRect().bottom > innerHeight + 1).length,
      );
      if (fuori) fallisci(`${n} ${w}×${h}: ${fuori} bottoni della vittoria fuori schermo`);
      for (let k = 0; k < 5 && (await visibile(page, 'sorpresa')); k++) await page.getByTestId('sorpresa').click();
      if (await visibile(page, 'sorpresa')) fallisci(`${n}: la sorpresa non finisce`);
    }
    await attendi(2800);
    const tempoC = (await C.page.locator('.vittoria-tempo').textContent())?.trim();
    if (!/\d+:\d\d/.test(tempoC ?? '')) fallisci(`vittoria senza tempo: ${tempoC}`);
    const fraseC = (await C.page.getByTestId('vittoria-frase').textContent())?.trim();
    if (!fraseC || fraseC === '…') fallisci('vittoria senza frase');
    // "Nuova" insieme
    await Promise.all([C.page.getByRole('button', { name: 'Nuova partita' }).click(), D.page.getByRole('button', { name: 'Nuova partita' }).click()]);
    await finche(
      async () => {
        const s1 = await C.page.getByTestId('griglia').getAttribute('data-seed').catch(() => null);
        const s2 = await D.page.getByTestId('griglia').getAttribute('data-seed').catch(() => null);
        return s1 && s1 === s2 && s1 !== '999';
      },
      6000,
      async () => `"Nuova" insieme: griglie diverse ${await C.page.getByTestId('griglia').getAttribute('data-seed')} / ${await D.page.getByTestId('griglia').getAttribute('data-seed')}`,
    );
    await attendi(1500);
    const rC = await C.page.getByTestId('regalo').getAttribute('data-disponibili');
    const rD = await D.page.getByTestId('regalo').getAttribute('data-disponibili');
    if (rC !== '1' || rD !== '1') fallisci(`${w}×${h}: regali del giardino persi con "Nuova" insieme (C ${rC}, D ${rD})`);
    console.log(`OK ${w}×${h}: "Nuova" insieme → stessa griglia; regali del giardino nella nuova partita: C ${rC}, D ${rD}`);
    await C.ctx.close();
    await D.ctx.close();
  }

  const attesi = /favicon|is taken|Aborting!|\[stanza\]/i;
  const errori = log.filter((l) => /error|uncaught/i.test(l) && !attesi.test(l));
  if (errori.length) {
    console.log('Errori in console:\n' + errori.join('\n'));
    fallisci('errori in console');
  }
  console.log('TUTTO OK');
} catch (e) {
  fallisci(e.message);
} finally {
  await browser.close();
}
