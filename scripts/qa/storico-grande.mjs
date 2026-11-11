// E2E T9 A (ricerca N1, §8.5): storico grande con molti germogli.
// Archivi costruiti nella pagina con i moduli veri: 20 fiori e 5 germogli killer (partita intera
// dentro, circa 6 KB l'uno) per lato, con seed diversi. Prima della T9 lo storico completo partiva in
// un solo messaggio oltre i 16 300 byte di PeerJS: "message-too-big" e connessione che cade in ciclo.
// Atteso: connessi e stabili per 30 s (nessuna perdita), nessun messaggio troppo grande, storico unito
// uguale sui due lati (50 voci).
// Uso: node scripts/qa/storico-grande.mjs [urlBase]
import {
  apriBrowser,
  aspettaConnessi,
  attendi,
  avviaSegnale,
  base,
  connesso,
  contestoQa,
  controllaConsole,
  fallisci,
  finche,
  log,
  stampaLog,
} from './rete-comune.mjs';

async function scriviArchivioGrande(page, o) {
  await page.goto(new URL('src/engine/index.ts', base).href);
  await page.evaluate(async (o) => {
    const root = location.pathname.replace(/src\/engine\/index\.ts$/, '');
    const eng = await import(`${root}src/engine/index.ts`);
    const st = await import(`${root}src/stato/index.ts`);
    const T0 = Date.now() - 3_600_000;
    const storico = [];
    for (let k = 1; k <= 20; k++) {
      const p = st.nuovaPartita(eng.generaPuzzle('sudoku', 'semini', o.seme + k), T0 + o.seme + k * 10000);
      storico.push(st.voceStorico(st.applica(p, { tipo: 'finita', ts: p.iniziata + 5000 })));
    }
    for (let k = 1; k <= 5; k++) {
      const puzzle = eng.generaPuzzle('killer', 'medio', o.seme + 500 + k);
      let p = st.nuovaPartita(puzzle, T0 + o.seme + 400000 + k * 10000);
      const vuote = puzzle.dati.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
      vuote.slice(0, 30).forEach((i, n) => {
        p = st.applica(p, { tipo: 'cella', idx: i, v: puzzle.soluzione[i], note: [], da: n % 2 ? 'b' : 'a', ts: p.iniziata + 1 + n });
      });
      storico.push(st.voceStorico(p));
    }
    const a = {
      versione: 1,
      io: { nome: o.nome, frase: o.frase },
      partner: o.nome === 'Semino' ? 'Semina' : 'Semino',
      partita: null,
      storico,
      azzerato: 0,
      tappeViste: [],
      impostazioni: { mostraErrori: true, vibrazione: true },
    };
    localStorage.clear();
    localStorage.setItem('sudoku-coppia-archivio', JSON.stringify(a));
    return JSON.stringify(storico).length;
  }, o);
}

const storicoDi = (page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('sudoku-coppia-archivio') ?? 'null')?.storico ?? []).map((v) => v.id).sort().join(','));

const segnale = await avviaSegnale({ log: (m) => log.push(`[proxy] ${Date.now()} ${m}`) });
const browser = await apriBrowser();
try {
  const frase = `storico grande ${Date.now()}`;
  const A = await contestoQa(browser, 'A');
  const B = await contestoQa(browser, 'B');
  await scriviArchivioGrande(A.page, { nome: 'Semino', frase, seme: 1000 });
  await scriviArchivioGrande(B.page, { nome: 'Semina', frase, seme: 7000 });
  const t0 = Date.now();
  await A.page.goto(base);
  await B.page.goto(base);
  await A.page.getByTestId('home').waitFor({ timeout: 10000 });
  await B.page.getByTestId('home').waitFor({ timeout: 10000 });
  const ms = await aspettaConnessi(A.page, B.page, t0, 20000, 'primo collegamento con storico grande');
  console.log(`OK connessi in ${(ms / 1000).toFixed(1)} s`);
  // stabili per 30 s
  const fine = Date.now() + 30000;
  while (Date.now() < fine) {
    if (!(await connesso(A.page)) || !(await connesso(B.page))) fallisci('la connessione cade con lo storico grande');
    await attendi(500);
  }
  const perse = log.filter((l) => /connessione persa|errore connessione dati/.test(l));
  if (perse.length) fallisci('perdite durante i 30 s:\n' + perse.join('\n'));
  console.log('OK connessi e stabili per 30 s');
  let sa = '';
  let sb = '';
  await finche(
    async () => {
      sa = await storicoDi(A.page);
      sb = await storicoDi(B.page);
      return sa === sb && sa.split(',').length === 50;
    },
    5000,
    () => `storico non unito: A ${sa.split(',').length} voci, B ${sb.split(',').length} voci`,
  );
  const lotti = log.filter((l) => /\[rete\] coppia storico/.test(l)).length;
  console.log(`OK storico unito uguale sui due lati: 50 voci (${lotti} messaggi storico ricevuti in tutto)`);
  controllaConsole();
  stampaLog();
  console.log('TUTTO OK');
} catch (e) {
  console.log(log.slice(-40).join('\n'));
  fallisci(e.stack ?? String(e));
} finally {
  await browser.close();
  await segnale.ferma();
}
process.exit(0);
