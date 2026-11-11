// E2E T9 A (ricerca §8.1-8.2): la app va "in background come su iOS" e torna.
// Sul lato X: pagina nascosta, canali dati muti (open ma morti), pagina congelata (timer fermi),
// WebSocket di segnalazione secondo la variante (pulito/fantasma/zombie), rete offline; dopo la durata
// rete online, scongelata, visibile. Intanto l'altro lato fa 2 mosse.
// Atteso: connessi entro SOGLIA_MS dal ritorno, senza toccare nulla; le 2 mosse arrivate su X; una
// mossa di X arriva all'altro; partita uguale; mai "occupato/altrove".
// Variante "rete": cambio Wi-Fi → dati a pagina visibile (zombie + canali muti, nessun evento):
// la perdita la scopre il battito (9 s), poi connessi entro SOGLIA_MS.
// Uso: node scripts/qa/background-ios.mjs [urlBase] [scenari]   es. scenari = "A:30:fantasma,B:75:zombie,B:0:rete"
// Richiede vite su 5173 con VITE_PEER_PORT=9000 e la porta 9000 libera (il proxy la prende).
import {
  SOGLIA_MS,
  aspettaConnessi,
  attendi,
  avviaSegnale,
  connesso,
  finche,
  apriBrowser,
  baseStanza,
  contestoQa,
  controllaConsole,
  controllaNienteOccupata,
  entra,
  fallisci,
  log,
  mossa,
  mossaVista,
  nuovaPartita,
  riprendi,
  sospendi,
  stessaPartita,
  valoreCella,
  stampaLog,
} from './rete-comune.mjs';

const SCENARI = (process.argv[3] ?? 'A:30:fantasma,B:30:fantasma,A:75:zombie,B:75:pulito,A:0:rete')
  .split(',')
  .map((s) => {
    const [lato, durata, socket] = s.split(':');
    return { lato, durata: Number(durata), socket };
  });

const segnale = await avviaSegnale({ log: (m) => log.push(`[proxy] ${Date.now()} ${m}`) });
const browser = await apriBrowser();
const tempi = [];
try {
  for (const sc of SCENARI) {
    const nome = `${sc.lato} ${sc.durata} s ${sc.socket}`;
    const frase = `background ${sc.lato} ${sc.socket} ${Date.now()}`;
    const idBase = baseStanza(frase);
    const A = await contestoQa(browser, 'A');
    const B = await contestoQa(browser, 'B');
    await entra(A.page, 'semino', frase);
    await entra(B.page, 'semina', frase);
    await aspettaConnessi(A.page, B.page, Date.now(), 20000, `${nome}: primo collegamento`);
    await nuovaPartita(A.page, B.page);
    await mossaVista(A.page, B.page, 5000, `${nome}: prima`);
    await mossaVista(B.page, A.page, 5000, `${nome}: prima`);

    const [X, Y] = sc.lato === 'A' ? [A, B] : [B, A];
    const idX = `${idBase}-${sc.lato === 'A' ? 'a' : 'b'}`;
    let t0;
    if (sc.socket === 'rete') {
      // cambio di rete a pagina visibile: nessun evento, WebSocket zombie, canale muto
      await X.page.evaluate(() => window.__qa.mutaCanali());
      segnale.zombie(idX);
      t0 = Date.now();
      // prima il battito si accorge della perdita (silenzio 9 s), poi ci si ricollega da soli
      await finche(async () => !(await connesso(A.page)) || !(await connesso(B.page)), 13000, `${nome}: la perdita non viene scoperta`);
      const scoperta = Date.now() - t0;
      const ms = await aspettaConnessi(A.page, B.page, Date.now(), SOGLIA_MS, `${nome}: dopo la scoperta della perdita`);
      tempi.push({ nome, ms, nota: `perdita scoperta in ${(scoperta / 1000).toFixed(1)} s` });
    } else {
      await sospendi(X);
      if (sc.socket === 'pulito') segnale.chiudi(idX);
      else if (sc.socket === 'fantasma') segnale.fantasma(idX);
      else segnale.zombie(idX);
      await X.ctx.setOffline(true);
      // l'altro lato gioca da solo: 2 mosse
      await attendi(2000);
      const fatte = [await mossa(Y.page)];
      await attendi(1500);
      fatte.push(await mossa(Y.page));
      await attendi(Math.max(0, sc.durata * 1000 - 3500));
      await X.ctx.setOffline(false);
      const congelata = X.congelata;
      await riprendi(X);
      t0 = Date.now();
      const ms = await aspettaConnessi(A.page, B.page, t0, SOGLIA_MS, `${nome}: al ritorno`);
      tempi.push({ nome, ms, nota: congelata ? 'JS fermo durante l’assenza' : 'JS attivo' });
      for (const [idx, v] of fatte) {
        await finche(async () => (await valoreCella(X.page, idx)) === String(v), 5000, `${nome}: la mossa ${idx}=${v} fatta durante l'assenza non è arrivata su ${sc.lato}`);
      }
    }
    await mossaVista(X.page, Y.page, 5000, `${nome}: dopo il ritorno`);
    await stessaPartita(A.page, B.page, 5000, nome);
    controllaNienteOccupata('A');
    controllaNienteOccupata('B');
    const t = tempi.at(-1);
    console.log(`OK ${nome}: rivisti in ${(t.ms / 1000).toFixed(1)} s (${t.nota})`);
    await A.ctx.close();
    await B.ctx.close();
  }
  controllaConsole();
  console.log('tempi:', tempi.map((t) => `${t.nome}=${(t.ms / 1000).toFixed(1)}s`).join(' '));
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
