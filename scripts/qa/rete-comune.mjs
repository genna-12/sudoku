// Aiuti comuni agli E2E della riconnessione (T9 A): due browser con lo script __qa, proxy di
// segnalazione su 9000 e server PeerJS su 9001 (vite va avviato con VITE_PEER_PORT=9000, come per
// gli altri E2E: vedi README).
//
// Criterio (ricerca §8): dopo il "ritorno" i due si rivedono da soli entro SOGLIA_MS e la partita è
// uguale sui due lati. SOGLIA_MS = 8 s: al ritorno la segnalazione si rinnova (pausa 300 ms + socket;
// con il proprio ID fantasma il posto si riprende con lo stesso token dopo 1 s di socket aperto),
// poi b chiama subito (o dopo lo squillo di a) e il canale si apre in meno di 1 s in locale; resta
// margine per il gradino di backoff in corso (1-2 s) e per la prova del canale vecchio (2,5 s).
import { writeFileSync } from 'node:fs';
import { chromium, attendi, log, fallisci as fallisciComune, finche as finche0, base } from './comune.mjs';

/** Come in comune.mjs; con QA_LOG_FILE il registro intero finisce in quel file. */
export function fallisci(msg) {
  if (process.env.QA_LOG_FILE) writeFileSync(process.env.QA_LOG_FILE, log.join('\n'));
  fallisciComune(msg);
}
export async function finche(f, ms, msg) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (await f()) return;
    await attendi(150);
  }
  fallisci(typeof msg === 'function' ? await msg() : msg);
}
void finche0;
import { avviaSegnale, baseStanza, INIT_QA } from './proxy-segnale.mjs';

export { attendi, base, log };
export const SOGLIA_MS = 8000;

export async function apriBrowser() {
  return chromium.launch();
}

export async function contestoQa(browser, nome) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(INIT_QA);
  const page = await ctx.newPage();
  agganciaLog(page, nome);
  return { ctx, page, nome };
}

export function agganciaLog(page, nome) {
  page.on('console', (m) => log.push(`[${nome}] ${Date.now()} ${m.text()}`));
  page.on('pageerror', (e) => log.push(`[${nome}] uncaught ${e.message}`));
}

export async function entra(page, profilo, frase) {
  await page.goto(base);
  await page.getByTestId(`scegli-${profilo}`).click();
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 10000 });
}

/** Connesso secondo la UI: pallino della Home o chip della partita. */
export async function connesso(page) {
  return page
    .evaluate(() => !!document.querySelector('[data-testid="connesso"], .partner-chip.pallino-connesso'))
    .catch(() => false);
}

/** Aspetta che entrambi siano connessi; restituisce i ms trascorsi da `t0`. */
export async function aspettaConnessi(a, b, t0, ms, cosa) {
  const fine = t0 + ms;
  while (Date.now() < fine) {
    if ((await connesso(a)) && (await connesso(b))) return Date.now() - t0;
    await attendi(100);
  }
  fallisci(`${cosa}: non si rivedono entro ${ms / 1000} s (A ${await connesso(a)}, B ${await connesso(b)})`);
}

export async function partitaDi(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sudoku-coppia-archivio') ?? 'null')?.partita ?? null);
}

function impronta(p) {
  if (!p) return 'nessuna';
  const celle = Object.keys(p.celle ?? {})
    .sort((x, y) => x - y)
    .map((k) => `${k}:${p.celle[k].v}`)
    .join(',');
  return `${p.puzzle?.modalita}-${p.puzzle?.seed}|${celle}`;
}

/** La partita salvata è uguale sui due lati (seed e valori delle celle). */
export async function stessaPartita(a, b, ms, cosa) {
  let ia = '';
  let ib = '';
  await finche(
    async () => {
      ia = impronta(await partitaDi(a));
      ib = impronta(await partitaDi(b));
      return ia === ib && ia !== 'nessuna';
    },
    ms,
    () => `${cosa}: partite diverse\nA ${ia}\nB ${ib}`,
  );
  return ia;
}

/** A apre una partita sudoku semini dalla Home; entrambi sulla griglia. */
export async function nuovaPartita(a, b) {
  await a.getByTestId('modalita-sudoku').click();
  await a.getByTestId('livello-semini').click();
  await a.getByTestId('nuova').click();
  if (await a.getByTestId('nuova-conferma').isVisible().catch(() => false)) await a.getByTestId('nuova-conferma').click();
  await a.getByTestId('griglia').waitFor({ timeout: 10000 });
  if (b) await b.getByTestId('griglia').waitFor({ timeout: 10000 });
}

/** Una mossa giusta nella prima cella vuota; restituisce [idx, valore]. */
export async function mossa(page) {
  const g = page.getByTestId('griglia');
  const idx = Number(await g.getAttribute('data-prima-vuota'));
  const v = Number(await g.getAttribute('data-prima-vuota-valore'));
  await page.getByTestId(`cella-${idx}`).click();
  await page.getByTestId(`tasto-${v}`).click();
  return [idx, v];
}

export async function valoreCella(page, idx) {
  return ((await page.getByTestId(`cella-${idx}`).textContent().catch(() => '')) ?? '').trim();
}

/** Una mossa di `da` si vede su `su` entro `ms`. */
export async function mossaVista(da, su, ms, cosa) {
  const [idx, v] = await mossa(da);
  await finche(async () => (await valoreCella(su, idx)) === String(v), ms, async () => `${cosa}: la mossa ${idx}=${v} non arriva (vede "${await valoreCella(su, idx)}")`);
  return [idx, v];
}

/**
 * Pagina "sospesa come su iOS": nascosta, canali muti e, con `congela`, JavaScript fermo
 * (CDP Debugger.pause: timer ed eventi aspettano, come una PWA sospesa; Page.setWebLifecycleState
 * 'frozen' in headless non ferma una pagina visibile).
 */
export async function sospendi(x, { congela = true } = {}) {
  await x.page.evaluate(() => {
    window.__qa.nascondi();
    window.__qa.mutaCanali();
  });
  if (congela) {
    x.cdp ??= await x.ctx.newCDPSession(x.page);
    await x.cdp.send('Debugger.enable');
    await x.cdp.send('Debugger.pause');
    x.congelata = true;
  }
}

export async function riprendi(x) {
  if (x.congelata) {
    await x.cdp.send('Debugger.resume');
    await x.cdp.send('Debugger.disable');
    x.congelata = false;
  }
  await x.page.evaluate(() => window.__qa.mostra());
}

/** Nessun testo falso "già collegato altrove" né posto creduto di un altro dispositivo. */
export function controllaNienteOccupata(nome) {
  const falsi = log.filter((l) => l.startsWith(`[${nome}]`) && /occupato da un altro dispositivo|altrove/.test(l));
  if (falsi.length) fallisci(`${nome}: segnalato "occupato"/"altrove" senza un altro dispositivo:\n${falsi.join('\n')}`);
}

/** Errori in console non attesi (le righe della stanza sono log, non errori). */
export function controllaConsole() {
  const attesi = /favicon|\[stanza\]|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|Failed to load resource|WebSocket connection/i;
  const errori = log.filter((l) => /error|uncaught/i.test(l) && !attesi.test(l));
  if (errori.length) fallisci('errori in console:\n' + errori.slice(0, 15).join('\n'));
  const grandi = log.filter((l) => /message-too-big|troppo grande/.test(l));
  if (grandi.length) fallisci('messaggi troppo grandi:\n' + grandi.join('\n'));
}

/** Con QA_LOG=1: le righe della stanza e del proxy (per leggere i tempi). */
export function stampaLog() {
  if (process.env.QA_LOG) console.log(log.filter((l) => /\[stanza\]|\[proxy\]|\[qa\]/.test(l) && !/ ice /.test(l)).join('\n'));
}

export { avviaSegnale, baseStanza };
