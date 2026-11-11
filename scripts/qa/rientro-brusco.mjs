// E2E T9 A (ricerca H3/§6.4): rientro con lo stesso profilo subito dopo una chiusura brusca.
// La pagina di X si chiude senza che il server se ne accorga (proxy "fantasma" su tutti i socket di X:
// il server tiene i suoi ID fino ad alive_timeout, 60 s), e X riapre subito la app nello stesso
// browser (stesso localStorage, quindi stesso token del dispositivo).
// Atteso: connessi entro SOGLIA_MS dall'apertura, senza attese da ID fantasma (prima: 60-90 s di
// "sei già collegato da un altro dispositivo"); pallino mai "altrove"; partita uguale.
// Uso: node scripts/qa/rientro-brusco.mjs [urlBase]
import {
  SOGLIA_MS,
  agganciaLog,
  apriBrowser,
  aspettaConnessi,
  attendi,
  avviaSegnale,
  base,
  baseStanza,
  contestoQa,
  controllaConsole,
  controllaNienteOccupata,
  entra,
  fallisci,
  log,
  mossaVista,
  nuovaPartita,
  stessaPartita,
  stampaLog,
} from './rete-comune.mjs';

const segnale = await avviaSegnale({ log: (m) => log.push(`[proxy] ${Date.now()} ${m}`) });
const browser = await apriBrowser();
const tempi = [];
try {
  const frase = `rientro brusco ${Date.now()}`;
  const coppia = baseStanza(frase);
  const A = await contestoQa(browser, 'A');
  const B = await contestoQa(browser, 'B');
  await entra(A.page, 'semino', frase);
  await entra(B.page, 'semina', frase);
  await aspettaConnessi(A.page, B.page, Date.now(), 20000, 'primo collegamento');
  await nuovaPartita(A.page, B.page);
  await mossaVista(A.page, B.page, 5000, 'prima');

  for (const [X, Y, posto, profilo] of [
    [A, B, 'a', 'Semino'],
    [B, A, 'b', 'Semina'],
    [A, B, 'a', 'Semino'],
    [B, A, 'b', 'Semina'],
  ]) {
    const cosa = `${X.nome} chiude di colpo e rientra`;
    // tutti i socket di X (stanza di coppia e personale) diventano fantasmi sul server
    const io = await X.page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-coppia-archivio')).io);
    const personale = baseStanza(`${io.frase}#${io.nome.trim().toLowerCase().replace(/\s+/g, '')}`);
    void profilo;
    for (const id of [`${coppia}-${posto}`, `${personale}-a`, `${personale}-b`]) segnale.fantasma(id);
    await X.page.close({ runBeforeUnload: false });
    await attendi(300);
    X.page = await X.ctx.newPage();
    agganciaLog(X.page, X.nome);
    const t0 = Date.now();
    await X.page.goto(base);
    await X.page.getByTestId('home').waitFor({ timeout: 10000 });
    // durante il rientro il pallino non deve mai dire "già collegato altrove"
    let altrove = false;
    const fine = t0 + SOGLIA_MS;
    while (Date.now() < fine && !altrove) {
      altrove = (await X.page.locator('.pallino-occupata').count()) > 0;
      if ((await X.page.locator('[data-testid="connesso"]').count()) > 0) break;
      await attendi(100);
    }
    if (altrove) fallisci(`${cosa}: il pallino dice "già collegato altrove"`);
    const ms = await aspettaConnessi(X.page, Y.page, t0, SOGLIA_MS, cosa);
    tempi.push(ms);
    await X.page.getByTestId('continua').click();
    await X.page.getByTestId('griglia').waitFor({ timeout: 5000 });
    await mossaVista(X.page, Y.page, 5000, `${cosa} (mossa)`);
    await stessaPartita(X.page, Y.page, 5000, cosa);
    console.log(`OK ${cosa}: connessi in ${(ms / 1000).toFixed(1)} s dall'apertura (fantasmi sul server)`);
  }
  controllaNienteOccupata('A');
  controllaNienteOccupata('B');
  controllaConsole();
  console.log('tempi:', tempi.map((t) => `${(t / 1000).toFixed(1)}s`).join(' '));
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
