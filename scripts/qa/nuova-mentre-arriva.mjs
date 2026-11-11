// E2E T9 A (ricerca §8.4): "Nuova partita" mentre il partner si sta collegando.
// Chi arriva (R) ricarica la pagina; chi resta (N) preme "Nuova" in tre momenti letti dalla console
// di R: (a) R prova a registrarsi, (b) R è registrato (ruolo), (c) R è connesso, +0-300 ms.
// Ogni momento 3 volte, e a ruoli invertiti.
// Atteso: connessi entro SOGLIA_MS dal tocco; stessa partita (seed) sui due; R sulla griglia nuova
// oppure con il banner "… ha iniziato una nuova partita" (se la `nuova` è arrivata solo col `ciao`).
// Uso: node scripts/qa/nuova-mentre-arriva.mjs [urlBase]
import {
  SOGLIA_MS,
  apriBrowser,
  aspettaConnessi,
  attendi,
  avviaSegnale,
  contestoQa,
  controllaConsole,
  controllaNienteOccupata,
  entra,
  fallisci,
  finche,
  log,
  nuovaPartita,
  partitaDi,
  stampaLog,
} from './rete-comune.mjs';

const segnale = await avviaSegnale({ log: (m) => log.push(`[proxy] ${Date.now()} ${m}`) });
const browser = await apriBrowser();
const tempi = [];

async function aspettaRiga(nome, da, re, ms) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (log.slice(da).some((l) => l.startsWith(`[${nome}]`) && re.test(l))) return;
    await attendi(10);
  }
  fallisci(`${nome}: in console non compare ${re}`);
}

try {
  const frase = `nuova mentre arriva ${Date.now()}`;
  const A = await contestoQa(browser, 'A');
  const B = await contestoQa(browser, 'B');
  await entra(A.page, 'semino', frase);
  await entra(B.page, 'semina', frase);
  await aspettaConnessi(A.page, B.page, Date.now(), 20000, 'primo collegamento');
  await nuovaPartita(A.page, B.page);

  for (const [N, R, posto] of [
    [A, B, 'b'],
    [B, A, 'a'],
  ]) {
    const momenti = [
      ['registrazione', new RegExp(`\\[stanza\\] provo a registrarmi come ${posto}`)],
      ['registrato', new RegExp(`\\[stanza\\] ruolo: ${posto}`)],
      ['connesso', /\[stanza\] connesso \(ruolo/],
    ];
    for (const [momento, re] of momenti) {
      for (let k = 0; k < 3; k++) {
        const cosa = `${N.nome} fa "Nuova" mentre ${R.nome} arriva (${momento} #${k + 1})`;
        // N in Home, pronto a premere "Nuova" (con la conferma: c'è una partita in corso)
        if (await N.page.getByTestId('indietro').isVisible().catch(() => false)) await N.page.getByTestId('indietro').click({ force: true });
        await N.page.getByTestId('home').waitFor({ timeout: 5000 });
        await N.page.getByTestId('modalita-sudoku').click();
        await N.page.getByTestId('livello-semini').click();
        const seedPrima = (await partitaDi(N.page))?.puzzle?.seed;
        const da = log.length;
        await R.page.reload();
        await aspettaRiga(R.nome, da, re, 15000);
        if (momento === 'connesso') await attendi(Math.floor(Math.random() * 300));
        const t0 = Date.now();
        await N.page.getByTestId('nuova').click();
        // con una partita toccata chiede conferma (il foglio compare subito)
        await attendi(50);
        if (await N.page.getByTestId('nuova-conferma').isVisible().catch(() => false)) await N.page.getByTestId('nuova-conferma').click();
        let seed = null;
        await finche(
          async () => {
            seed = await N.page.getByTestId('griglia').getAttribute('data-seed').catch(() => null);
            return !!seed && seed !== String(seedPrima);
          },
          10000,
          `${cosa}: la partita nuova non parte su ${N.nome}`,
        );
        seed = Number(seed);
        const ms = await aspettaConnessi(A.page, B.page, t0, SOGLIA_MS, cosa);
        let come = '';
        await finche(
          async () => {
            const p = await partitaDi(R.page);
            if (p?.puzzle?.seed !== seed) return false;
            // (getAttribute aspetterebbe 30 s un elemento che non c'è)
            const griglia = await R.page.evaluate(() => document.querySelector('[data-testid="griglia"]')?.getAttribute('data-seed') ?? null);
            if (String(griglia) === String(seed)) come = 'griglia';
            else if (/ha iniziato una nuova partita/.test((await R.page.textContent('body').catch(() => '')) ?? '')) come = 'banner';
            return !!come;
          },
          // il banner può aspettare in coda dietro al saluto d'arrivo (un toast alla volta)
          15000,
          async () =>
            `${cosa}: ${R.nome} non ha la partita nuova ${seed} (ha ${(await partitaDi(R.page))?.puzzle?.seed}) o non la mostra; testo: ${((await R.page.textContent('body').catch(() => '')) ?? '').replace(/\s+/g, ' ').slice(0, 300)}`,
        );
        tempi.push(ms);
        console.log(`OK ${cosa}: connessi in ${(ms / 1000).toFixed(1)} s, partita nuova su ${R.nome} (${come})`);
        // R torna in Home per il giro dopo (dalla griglia)
        if (come === 'griglia') await R.page.getByTestId('indietro').click({ force: true });
      }
    }
  }
  controllaNienteOccupata('A');
  controllaNienteOccupata('B');
  controllaConsole();
  console.log(`tempi: max ${(Math.max(...tempi) / 1000).toFixed(1)} s, medio ${(tempi.reduce((x, y) => x + y, 0) / tempi.length / 1000).toFixed(1)} s su ${tempi.length}`);
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
