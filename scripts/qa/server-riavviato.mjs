// E2E T9 A (ricerca §8.3): il server PeerJS locale muore (SIGKILL) a metà partita e riparte.
// 1) Le mosse continuano sul canale dati (non dipende dal server).
// 2) Il server riparte dopo 6 s; poi il canale si rompe (muto su B): la perdita la scopre il battito
//    (9 s) e i due si ricollegano da soli attraverso il server nuovo entro SOGLIA_MS dalla scoperta.
// 3) Variante: il server riparte mentre B è "in background" (nascosta, JS fermo, canali muti);
//    al ritorno di B connessi entro SOGLIA_MS.
// Uso: node scripts/qa/server-riavviato.mjs [urlBase]
import {
  SOGLIA_MS,
  apriBrowser,
  aspettaConnessi,
  attendi,
  avviaSegnale,
  connesso,
  contestoQa,
  controllaConsole,
  controllaNienteOccupata,
  entra,
  fallisci,
  finche,
  log,
  mossaVista,
  nuovaPartita,
  riprendi,
  sospendi,
  stessaPartita,
  stampaLog,
} from './rete-comune.mjs';

const segnale = await avviaSegnale({ log: (m) => log.push(`[proxy] ${Date.now()} ${m}`) });
const browser = await apriBrowser();
const tempi = [];
try {
  const frase = `server riavviato ${Date.now()}`;
  const A = await contestoQa(browser, 'A');
  const B = await contestoQa(browser, 'B');
  await entra(A.page, 'semino', frase);
  await entra(B.page, 'semina', frase);
  await aspettaConnessi(A.page, B.page, Date.now(), 20000, 'primo collegamento');
  await nuovaPartita(A.page, B.page);
  await mossaVista(A.page, B.page, 5000, 'prima');

  // 1) server ucciso: il canale dati regge
  segnale.uccidiServer();
  await attendi(1500);
  await mossaVista(A.page, B.page, 5000, 'a server morto (A→B)');
  await mossaVista(B.page, A.page, 5000, 'a server morto (B→A)');
  if (!(await connesso(A.page)) || !(await connesso(B.page))) fallisci('a server morto il pallino non dice più connesso');
  console.log('OK server ucciso: le mosse passano sul canale dati');
  await attendi(4500);
  await segnale.avviaServer();

  // 2) canale rotto: perdita scoperta dal battito, poi ricollegamento dal server nuovo
  await attendi(1000);
  await B.page.evaluate(() => window.__qa.mutaCanali());
  const tm = Date.now();
  log.push(`[qa] ${tm} canali di B muti`);
  await finche(async () => !(await connesso(A.page)) || !(await connesso(B.page)), 13000, 'la perdita del canale non viene scoperta');
  const scoperta = Date.now() - tm;
  const ms = await aspettaConnessi(A.page, B.page, Date.now(), SOGLIA_MS, 'dopo il riavvio del server');
  tempi.push(`riavvio: perdita scoperta in ${(scoperta / 1000).toFixed(1)} s, rivisti in ${(ms / 1000).toFixed(1)} s`);
  await mossaVista(A.page, B.page, 5000, 'dopo il riavvio (A→B)');
  await mossaVista(B.page, A.page, 5000, 'dopo il riavvio (B→A)');
  await stessaPartita(A.page, B.page, 5000, 'dopo il riavvio');
  console.log(`OK ${tempi.at(-1)}`);

  // 3) server riavviato mentre B è in background
  await sospendi(B);
  await attendi(2000);
  segnale.uccidiServer();
  await attendi(6000);
  await segnale.avviaServer();
  await attendi(15000);
  await riprendi(B);
  const t0 = Date.now();
  const ms2 = await aspettaConnessi(A.page, B.page, t0, SOGLIA_MS, 'ritorno di B dopo il riavvio');
  tempi.push(`riavvio con B in background: rivisti in ${(ms2 / 1000).toFixed(1)} s dal ritorno`);
  await mossaVista(B.page, A.page, 5000, 'dopo il ritorno di B');
  await stessaPartita(A.page, B.page, 5000, 'dopo il ritorno di B');
  console.log(`OK ${tempi.at(-1)}`);

  controllaNienteOccupata('A');
  controllaNienteOccupata('B');
  controllaConsole();
  console.log('tempi:', tempi.join(' · '));
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
