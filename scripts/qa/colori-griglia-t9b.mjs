// T9 B realizzata (fasce personali, ADR 007): misura dei colori della griglia sul CSS vero e scatti di una
// partita vera a due client (Genna = Semino, ruolo a, verde; Mati = Semina, ruolo b, blu).
// Uso: node scripts/qa/colori-griglia-t9b.mjs [urlBase] [cartellaOut] [--rapido] [--senza-foto]
//   --rapido      un client per profilo, da solo (niente partita in coppia): solo misure, per provare le tinte
//   --senza-foto  partita in coppia ma niente scatti
// Richiede peerjs locale e vite con VITE_PEER_* (vedi README). Scrive <out>/misure-t9b.json e, con le foto,
// docs/design/img/t9-b-*.png (poi `python3 -I scripts/qa/colori-griglia-immagini.py t9b` le alleggerisce).
// Esce con 1 se una soglia della spec (docs/specs/T9-B-colori.md) non è rispettata.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deltaE, wcag } from './colori-griglia-analisi.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();

const arg = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = arg[0] ?? 'http://127.0.0.1:5173/sudoku/';
const OUT = arg[1] ?? '/tmp/colori-t9b';
const RAPIDO = process.argv.includes('--rapido');
const FOTO = !RAPIDO && !process.argv.includes('--senza-foto');
const IMG = new URL('../../docs/design/img/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fondi di una casella (dal più semplice): vuota, mia fascia, mia selezione, numero uguale, faro e loro somme. */
const FONDI = ['', 'vicina', 'selezionata', 'stessa', 'faro', 'faro vicina', 'faro selezionata', 'faro stessa'];
/** Chi ha scritto il numero (l'errore cambia fondo e numero). */
const NUMERI = ['data', 'mia', 'sua', 'mia errore', 'sua errore'];
const NOME_FONDO = { '': 'vuota', vicina: 'fascia', selezionata: 'selezione', stessa: 'uguale', faro: 'faro', 'faro vicina': 'faro+fascia', 'faro selezionata': 'faro+selezione', 'faro stessa': 'faro+uguale' };

/** Dentro la pagina: colori risolti (sRGB 8 bit, già composti sul fondo della casella) per ogni combinazione. */
function misuraNellaPagina([fondi, numeri]) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d', { willReadFrequently: true });
  /** colore `s` (anche trasparente) composto sopra `sotto` (rgb), come lo vede lo schermo */
  const rgb = (s, sotto = [0, 0, 0], quota = 1) => {
    g.globalAlpha = 1;
    g.fillStyle = `rgb(${sotto.join(',')})`;
    g.fillRect(0, 0, 1, 1);
    g.globalAlpha = quota;
    g.fillStyle = '#000';
    g.fillStyle = s;
    g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const griglia = document.querySelector('.griglia');
  const sonda = document.createElement('i');
  griglia.appendChild(sonda);
  const variabile = (v) => {
    sonda.style.color = '#000';
    sonda.style.color = `var(${v})`;
    return rgb(getComputedStyle(sonda).color);
  };
  const vars = {};
  for (const v of ['--mio', '--suo', '--carta', '--g-mio', '--g-suo', '--g-velo-mio', '--g-sel', '--g-uguale', '--g-faro', '--g-testo-mio', '--g-testo-suo', '--g-testo-errore'])
    vars[v] = variabile(v);
  griglia.removeChild(sonda);
  const cella = document.querySelectorAll('.cella')[80];
  const orig = cella.className;
  const valore = cella.querySelector('.valore');
  // somma del killer e note: elementi di prova dentro la casella, tolti alla fine
  const somma = document.createElement('span');
  somma.className = 'somma';
  somma.textContent = '17';
  const note = document.createElement('span');
  note.className = 'note';
  note.innerHTML = '<i>1</i><i class="acc">2</i>';
  cella.append(somma, note);
  const linea = document.querySelector('.linea-gabbia') ?? document.querySelector('.linea-sottile');
  const lineaColore = getComputedStyle(linea).stroke;
  const stati = {};
  const prova = (cls) => {
    cella.className = ('cella ' + cls).trim();
    const cs = getComputedStyle(cella);
    const bg = rgb(cs.backgroundColor);
    const b = getComputedStyle(cella, '::before');
    const a = getComputedStyle(cella, '::after');
    const ombre = cs.boxShadow === 'none' ? [] : cs.boxShadow.split(/,(?![^(]*\))/).map((x) => x.trim());
    const alone = a.content !== 'none' && a.boxShadow !== 'none' ? a.boxShadow.match(/^(\w+\([^)]*\))/)?.[1] : null;
    stati[cls || 'vuota'] = {
      bg,
      testo: rgb(getComputedStyle(valore).color, bg),
      somma: rgb(getComputedStyle(somma).color, rgb(getComputedStyle(somma).backgroundColor, bg)),
      nota: rgb(getComputedStyle(note.children[0]).color, bg),
      linea: rgb(lineaColore, bg),
      ombre: ombre.map((o) => {
        const m = o.match(/^(\w+\([^)]*\))\s.*?(-?[\d.]+)px(\s+inset)?$/);
        return m ? { colore: rgb(m[1], bg), spessore: +m[2] } : { grezzo: o };
      }),
      tratteggio:
        b.content !== 'none' && b.borderTopStyle !== 'none'
          ? { colore: rgb(b.borderTopColor, bg), stile: b.borderTopStyle, spessore: parseFloat(b.borderTopWidth) }
          : null,
      // l'alone al suo massimo, appena dentro il tratteggio: metà della sua opacità (bordo di un'ombra sfocata)
      aloneBordo: alone ? rgb(alone, bg, 0.5) : null,
      triangolo: cs.backgroundImage !== 'none',
    };
  };
  for (const f of fondi) {
    prova(f);
    prova(('partner ' + f).trim());
    for (const n of numeri) prova((n + ' ' + f).trim());
    prova(('partner errore mia ' + f).trim());
  }
  cella.className = orig;
  somma.remove();
  note.remove();
  return { vars, stati };
}

/** Soglie della spec e confronti in più, per un lato (chi guarda) e un tema. */
function analizza(m) {
  const s = m.stati;
  const soglie = [];
  const altro = [];
  const metti = (dove, soglia, tipo, et, val) => dove.push({ soglia, tipo, et, val, ok: soglia == null || val >= soglia });
  for (const f of FONDI) {
    const nf = NOME_FONDO[f];
    for (const n of NUMERI) {
      const k = (n + ' ' + f).trim();
      const nome = n.includes('errore') ? `errore (${n.split(' ')[0]})` : n;
      metti(soglie, 4.5, 'numero', `${nome} su ${nf}${n.includes('errore') ? '+errore' : ''}`, wcag(s[k].testo, s[k].bg));
    }
    const mio = s[('mia ' + f).trim()];
    const suo = s[('sua ' + f).trim()];
    metti(soglie, 20, 'mio-suo', `numero mio vs suo su ${nf} (ΔE)`, deltaE(mio.testo, suo.testo));
    metti(altro, null, 'mio-suo-lum', `numero mio vs suo su ${nf} (luminosità, x:1)`, wcag(mio.testo, suo.testo));
    const p = s[('partner ' + f).trim()];
    const obbligo = f === '' || f === 'vicina';
    metti(obbligo ? soglie : altro, obbligo ? 3 : null, 'tratteggio', `tratteggio del partner su ${nf}`, wcag(p.tratteggio.colore, p.bg));
    if (p.aloneBordo) metti(altro, null, 'tratteggio', `tratteggio del partner su ${nf}, alone al massimo`, wcag(p.tratteggio.colore, p.aloneBordo));
    const pe = s[('partner errore mia ' + f).trim()];
    metti(altro, null, 'tratteggio', `tratteggio del partner su ${nf}+errore`, wcag(pe.tratteggio.colore, pe.bg));
    const e = s[('mia errore ' + f).trim()];
    metti(altro, null, 'errore', `errore vs senza errore, su ${nf} (ΔE fondo)`, deltaE(e.bg, s[f || 'vuota'].bg));
    metti(altro, null, 'killer', `somma della gabbia su ${nf}`, wcag(s[f || 'vuota'].somma, s[f || 'vuota'].bg));
    metti(altro, null, 'killer', `somma della gabbia su ${nf}+errore`, wcag(e.somma, e.bg));
    metti(altro, null, 'killer', `linea della gabbia su ${nf}`, wcag(s[f || 'vuota'].linea, s[f || 'vuota'].bg));
    metti(altro, null, 'note', `note su ${nf}`, wcag(s[f || 'vuota'].nota, s[f || 'vuota'].bg));
  }
  metti(soglie, 10, 'fascia', 'fascia vs casella vuota (ΔE)', deltaE(s.vicina.bg, s.vuota.bg));
  for (const [a, b] of [
    ['stessa', 'vicina'],
    ['faro', 'vicina'],
    ['faro', 'stessa'],
    ['selezionata', 'vicina'],
    ['stessa', 'vuota'],
    ['faro', 'vuota'],
    ['mia errore vicina', 'vicina'],
    ['mia errore', 'mia errore vicina'],
  ])
    metti(altro, null, 'fondi', `${a} vs ${b} (ΔE)`, deltaE(s[a].bg, s[b].bg));
  const sel = s.selezionata;
  metti(altro, null, 'anello', 'mio anello vs fondo della selezione', wcag(sel.ombre[0].colore, sel.bg));
  metti(altro, null, 'anello', 'mio anello vs fascia accanto', wcag(sel.ombre[0].colore, s.vicina.bg));
  const ps = s['partner selezionata'];
  metti(altro, null, 'anello', 'stessa casella: mio anello (dentro) vs fondo', wcag(ps.ombre.at(-1).colore, ps.bg));
  metti(altro, null, 'anello', 'stessa casella: suo tratteggio (fuori) vs fondo', wcag(ps.tratteggio.colore, ps.bg));
  metti(altro, null, 'anello', 'mio anello vs suo tratteggio (luminosità)', wcag(sel.ombre[0].colore, ps.tratteggio.colore));
  const strutt = [];
  if (!s['partner'].tratteggio || s['partner'].tratteggio.stile !== 'dashed') strutt.push('il partner non ha il tratteggio');
  if (ps.ombre.length < 2) strutt.push('stessa casella: manca il mio anello rientrato');
  if (s.mia.bg.join() !== s.vuota.bg.join() || s.sua.bg.join() !== s.vuota.bg.join()) strutt.push('mia/sua hanno ancora un fondo');
  for (const f of FONDI) if (!s[('mia errore ' + f).trim()].triangolo) strutt.push(`errore su ${NOME_FONDO[f]} senza triangolo`);
  return { soglie, altro, strutt, vars: m.vars };
}

async function entra(page, profilo, frase) {
  await page.goto(base);
  await page.getByTestId(`scegli-${profilo}`).click();
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 15000 });
}
async function nuova(page, modalita) {
  await page.getByTestId(`modalita-${modalita}`).click();
  await page.getByTestId('livello-facile').click();
  await page.getByTestId('nuova').click();
  await page.getByTestId('griglia').waitFor({ timeout: 15000 });
}
// presenza del blu a 1 (coppia sbloccata, come nel collaudo); QA_PRESENZA=0 per la griglia prima di Semina
const FERMO = `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}:root{--blu-presenza:${process.env.QA_PRESENZA ?? 1}!important}`;

async function contesto(browser, schema) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: schema === 'chiaro' ? 'light' : 'dark',
    reducedMotion: 'reduce',
  });
  return { ctx, page: await ctx.newPage() };
}

/** Partita in coppia: Genna (a) e Mati (b) con la stessa frase, nuova partita da Genna. */
async function coppia(browser, schema, modalita) {
  const frase = `t9b ${schema} ${modalita} ${Date.now()}`;
  const A = await contesto(browser, schema);
  const B = await contesto(browser, schema);
  await entra(A.page, 'semino', frase);
  await entra(B.page, 'semina', frase);
  await A.page.getByTestId('connesso').waitFor({ timeout: 25000 });
  await B.page.getByTestId('connesso').waitFor({ timeout: 25000 });
  await nuova(A.page, modalita);
  await B.page.getByTestId('griglia').waitFor({ timeout: 15000 });
  return { A, B };
}

/** Mosse vere: numeri di entrambi, un errore nella fascia di Genna, selezioni in punti diversi. */
async function scenario(a, b, modalita) {
  const seed = Number(await a.getByTestId('griglia').getAttribute('data-seed'));
  const { dati, sol } = await a.evaluate(
    async ([seed, mod]) => {
      const root = location.pathname.replace(/\/[^/]*$/, '/');
      const eng = await import(`${root}src/engine/index.ts`);
      const p = eng.generaPuzzle(mod, 'facile', seed);
      return { dati: p.dati, sol: p.soluzione };
    },
    [seed, modalita],
  );
  const vuote = dati.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  const riga = (i) => Math.floor(i / 9);
  const col = (i) => i % 9;
  const box = (i) => Math.floor(riga(i) / 3) * 3 + Math.floor(col(i) / 3);
  const vicine = (x, y) => riga(x) === riga(y) || col(x) === col(y) || box(x) === box(y);
  const conta = Array(10).fill(0);
  dati.forEach((d) => d && conta[d]++);
  let v = 1;
  for (let d = 1; d <= 9; d++) if (conta[d] > conta[v]) v = d;
  let piano = null;
  for (const S of vuote.filter((i) => sol[i] === v)) {
    const usate = new Set([S]);
    const prendi = (f) => {
      const i = vuote.find((x) => !usate.has(x) && f(x));
      if (i === undefined) throw new Error('niente');
      usate.add(i);
      return i;
    };
    try {
      // P: dove sta Mati, lontano dalla fascia di Genna; Q: dove sta Genna sullo schermo di Mati
      const P = prendi((i) => !vicine(i, S) && sol[i] !== v);
      piano = {
        S,
        P,
        E1: prendi((i) => riga(i) === riga(S) && box(i) !== box(S)),
        M1: prendi((i) => col(i) === col(S) && box(i) !== box(S) && !vicine(i, P)),
        M2: prendi((i) => !vicine(i, S) && !vicine(i, P) && sol[i] !== v),
        M3: prendi((i) => box(i) === box(S) && sol[i] !== v),
        H1: prendi((i) => riga(i) === riga(S) && box(i) !== box(S) && sol[i] !== v),
        H2: prendi((i) => vicine(i, P) && !vicine(i, S) && sol[i] !== v),
        H3: prendi((i) => !vicine(i, S) && !vicine(i, P) && sol[i] !== v),
        H4: prendi((i) => !vicine(i, S) && sol[i] === v),
        N: prendi((i) => !vicine(i, S) && !vicine(i, P) && sol[i] !== v),
      };
      break;
    } catch {
      /* prossima */
    }
  }
  if (!piano) throw new Error('scenario: nessuna casella adatta');
  const { S, P, E1, M1, M2, M3, H1, H2, H3, H4, N } = piano;
  const sbagliato = (i) => {
    for (let d = 1; d <= 9; d++) if (d !== sol[i] && d !== v) return d;
    return 1;
  };
  const scrivi = async (p, i, val) => {
    await p.getByTestId(`cella-${i}`).click();
    await attendi(60);
    await p.getByTestId(`tasto-${val}`).click();
    await attendi(140);
  };
  await scrivi(a, S, v);
  await scrivi(a, M1, sol[M1]);
  await scrivi(a, M2, sol[M2]);
  await scrivi(a, M3, sol[M3]);
  await scrivi(b, H1, sol[H1]);
  await scrivi(b, H2, sol[H2]);
  await scrivi(b, H3, sol[H3]);
  await scrivi(b, H4, v); // un numero uguale scritto da lei
  await scrivi(a, E1, sbagliato(E1)); // errore nella fascia di Genna
  await a.getByTestId(`cella-${N}`).click();
  await a.getByTestId('matita').click();
  for (const d of [v, (v % 9) + 1, ((v + 3) % 9) + 1]) await a.getByTestId(`tasto-${d}`).click();
  await a.getByTestId('matita').click();
  await attendi(200);
  await a.getByTestId(`cella-${S}`).click();
  await b.getByTestId(`cella-${P}`).click();
  await attendi(1500);
  return piano;
}

const GRIGLIA_CLIP = async (page) => {
  const r = await page.getByTestId('griglia').boundingBox();
  return { x: 0, y: Math.max(0, r.y - 16), width: 390, height: r.height + 32 };
};

const browser = await chromium.launch();
const misure = {};
const piani = {};
const lati = [
  ['genna', 'semino'],
  ['mati', 'semina'],
];
for (const modalita of RAPIDO ? ['sudoku'] : ['sudoku', 'killer']) {
  for (const schema of ['scuro', 'chiaro']) {
    let pagine;
    let chiudi;
    if (RAPIDO) {
      const cs = [];
      pagine = {};
      for (const [chi, profilo] of lati) {
        const C = await contesto(browser, schema);
        cs.push(C);
        await entra(C.page, profilo, `t9b solo ${chi} ${Date.now()}`);
        await nuova(C.page, modalita);
        pagine[chi] = C.page;
      }
      chiudi = () => Promise.all(cs.map((c) => c.ctx.close()));
    } else {
      const { A, B } = await coppia(browser, schema, modalita);
      pagine = { genna: A.page, mati: B.page };
      piani[`${modalita}-${schema}`] = await scenario(A.page, B.page, modalita);
      chiudi = () => Promise.all([A.ctx.close(), B.ctx.close()]);
    }
    for (const [chi] of lati) {
      const p = pagine[chi];
      const tag = await p.addStyleTag({ content: FERMO });
      await attendi(200);
      if (FOTO) {
        await p.screenshot({ path: `${IMG}t9-b-${modalita}-${chi}-${schema}.png` });
      }
      misure[`${modalita}-${schema}-${chi}`] = await p.evaluate(misuraNellaPagina, [FONDI, NUMERI]);
      await tag.evaluate((n) => n.remove());
    }
    if (FOTO && modalita === 'sudoku') {
      // stessa casella: Mati va dove sta Genna
      const piano = piani[`${modalita}-${schema}`];
      await pagine.mati.getByTestId(`cella-${piano.S}`).click();
      await attendi(1200);
      for (const [chi] of lati) {
        const p = pagine[chi];
        const tag = await p.addStyleTag({ content: FERMO });
        await attendi(150);
        await p.screenshot({ path: `${IMG}t9-b-insieme-${chi}-${schema}.png`, clip: await GRIGLIA_CLIP(p) });
        await tag.evaluate((n) => n.remove());
      }
    }
    await chiudi();
  }
}
await browser.close();

let fallite = 0;
const rapporto = {};
for (const [k, m] of Object.entries(misure)) {
  const a = analizza(m);
  rapporto[k] = a;
  const ko = a.soglie.filter((x) => !x.ok);
  fallite += ko.length + a.strutt.length;
  console.log(`\n===== ${k} =====`);
  const perTipo = {};
  for (const x of a.soglie) (perTipo[x.tipo] ??= []).push(x);
  for (const [t, xs] of Object.entries(perTipo)) {
    const min = xs.reduce((p, q) => (q.val < p.val ? q : p));
    console.log(`  ${t.padEnd(10)} min ${min.val.toFixed(2)} (soglia ${min.soglia}) ${min.et}${xs.some((x) => !x.ok) ? '  <-- SOTTO' : ''}`);
  }
  for (const x of ko) console.log(`    SOTTO: ${x.et} = ${x.val.toFixed(2)} (soglia ${x.soglia})`);
  for (const x of a.strutt) console.log(`    STRUTTURA: ${x}`);
  if (process.env.QA_TUTTO) for (const x of a.altro) console.log(`    · ${x.val.toFixed(2).padStart(6)} ${x.et}`);
}
writeFileSync(`${OUT}/misure-t9b.json`, JSON.stringify({ piani, misure, rapporto }, null, 1));
console.log(`\n${fallite ? 'SOGLIE NON RISPETTATE: ' + fallite : 'tutte le soglie rispettate'} — ${OUT}/misure-t9b.json`);
process.exit(fallite ? 1 : 0);
