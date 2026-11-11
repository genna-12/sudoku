// Studio T9-B: cattura e misura dei colori della griglia in una partita vera a due client.
// Uso: node scripts/qa/colori-griglia.mjs [urlBase] [cartellaOut] [modalita: sudoku|killer]
// Richiede peerjs locale (es. porta 9100) e vite con VITE_PEER_* (es. porta 5273). NON modifica l'app:
// le proposte (scripts/qa/colori-griglia-proposte.mjs) sono CSS iniettato con page.addStyleTag.
// Scrive: <out>/misure-<modalita>-<chiaro|scuro>.json e docs/design/img/t9-colori-<modalita>-<variante>-<schema>.png
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require('playwright');
  } catch {
    return require('/opt/npm-tools/node_modules/playwright');
  }
})();
const { PROPOSTE } = await import('./colori-griglia-proposte.mjs');

const base = process.argv[2] ?? 'http://127.0.0.1:5273/sudoku/';
const OUT = process.argv[3] ?? '/tmp/colori-out';
const MODALITA = process.argv[4] ?? 'sudoku';
const IMG = new URL('../../docs/design/img/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
/** Stati del banco di prova, nove per riga. "vuota" e "nota" non hanno classi; la quarta riga serve solo alla proposta B. */
const BANCO = (nome) => {
  const r = [
    ['vuota', 'data', 'mia', 'sua', 'vicina', 'stessa', 'selezionata', 'partner', 'errore'],
    ['mia vicina', 'sua vicina', 'mia stessa', 'sua stessa', 'data stessa', 'mia selezionata', 'sua selezionata', 'errore vicina', 'errore stessa'],
    ['errore selezionata', 'partner vicina', 'partner stessa', 'partner selezionata', 'partner mia', 'partner errore', 'faro', 'nota', 'data vicina'],
  ];
  if (nome.startsWith('b-')) r.push(['vicina-suo', 'vicina vicina-suo', 'partner vicina-suo', 'errore vicina-suo', 'mia vicina-suo', 'sua vicina-suo', 'stessa vicina-suo', 'data vicina-suo', 'vuota']);
  return r;
};
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

const STATI = [
  '', 'data', 'mia', 'sua', 'vicina', 'mia vicina', 'sua vicina', 'data vicina',
  'stessa', 'mia stessa', 'sua stessa', 'data stessa', 'selezionata', 'mia selezionata', 'sua selezionata',
  'data selezionata', 'errore', 'errore vicina', 'errore stessa', 'errore selezionata', 'faro', 'faro stessa',
  'partner', 'partner vicina', 'partner stessa', 'partner selezionata', 'partner mia', 'partner sua', 'partner errore',
  'vicina-suo', 'vicina vicina-suo', 'mia vicina-suo', 'sua vicina-suo', 'partner vicina-suo', 'errore vicina-suo', 'stessa vicina-suo',
];

async function entra(page, profilo, frase) {
  await page.goto(base);
  await page.getByTestId(`scegli-${profilo}`).click();
  await page.getByTestId('frase').fill(frase);
  await page.getByTestId('entra').click();
  await page.getByTestId('home').waitFor({ timeout: 15000 });
}

/** Misura dentro la pagina: colori risolti (sRGB 8 bit) di sfondo, numero e anello per ogni combinazione di classi. */
function misuraNellaPagina(stati) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const g = c.getContext('2d', { willReadFrequently: true });
  const rgb = (s) => {
    g.clearRect(0, 0, 1, 1);
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
  for (const v of ['--mio', '--suo', '--evid', '--errore', '--carta', '--carta-2', '--oro', '--inchiostro', '--mio-testo', '--suo-testo', '--linea', '--linea-forte'])
    vars[v] = variabile(v);
  griglia.removeChild(sonda);
  const prima = (sh) => {
    if (!sh || sh === 'none') return null;
    const m = sh.match(/^(\w+\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(\s+inset)?/);
    if (!m) return { grezzo: sh };
    return { colore: rgb(m[1]), sfocatura: +m[4], diffusione: +(m[5] ?? 0), inset: !!m[6] };
  };
  const cella = document.querySelectorAll('.cella')[80];
  const orig = cella.className;
  const risultato = {};
  for (const s of stati) {
    cella.className = ('cella ' + s).trim();
    const cs = getComputedStyle(cella);
    const v = getComputedStyle(cella.querySelector('.valore'));
    const after = getComputedStyle(cella, '::after');
    risultato[s || 'vuota'] = {
      bg: rgb(cs.backgroundColor),
      testo: rgb(v.color),
      anello: prima(cs.boxShadow),
      alone: s.includes('partner') ? prima(after.boxShadow) : null,
      bordo:
        s.includes('partner') && after.borderTopStyle !== 'none' && parseFloat(after.borderTopWidth) > 0
          ? { colore: rgb(after.borderTopColor), spessore: parseFloat(after.borderTopWidth), stile: after.borderTopStyle }
          : null,
    };
  }
  cella.className = orig;
  return { vars, stati: risultato };
}

/** La partita a due: stessa frase, A = Semino (verde, ruolo a), B = Semina (blu, ruolo b). */
async function prepara(browser, schema) {
  const frase = 'colori ' + schema + ' ' + Date.now();
  const mk = async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: schema === 'chiaro' ? 'light' : 'dark',
      reducedMotion: 'reduce',
    });
    return { ctx, page: await ctx.newPage() };
  };
  const A = await mk();
  const B = await mk();
  const a = A.page;
  const b = B.page;
  await entra(a, 'semino', frase);
  await entra(b, 'semina', frase);
  await a.getByTestId('connesso').waitFor({ timeout: 25000 });
  await b.getByTestId('connesso').waitFor({ timeout: 25000 });
  await a.getByTestId(`modalita-${MODALITA}`).click();
  await a.getByTestId('livello-facile').click();
  await a.getByTestId('nuova').click();
  await a.getByTestId('griglia').waitFor({ timeout: 15000 });
  await b.getByTestId('griglia').waitFor({ timeout: 15000 });
  return { a, b, A, B };
}

async function scenario(a, b) {
  const seed = Number(await a.getByTestId('griglia').getAttribute('data-seed'));
  const { dati, sol } = await a.evaluate(
    async ([seed, mod]) => {
      const root = location.pathname.replace(/\/[^/]*$/, '/');
      const eng = await import(`${root}src/engine/index.ts`);
      const p = eng.generaPuzzle(mod, 'facile', seed);
      return { dati: p.dati, sol: p.soluzione };
    },
    [seed, MODALITA],
  );
  const vuote = dati.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
  const riga = (i) => Math.floor(i / 9);
  const col = (i) => i % 9;
  const box = (i) => Math.floor(riga(i) / 3) * 3 + Math.floor(col(i) / 3);
  const conta = Array(10).fill(0);
  dati.forEach((d) => d && conta[d]++);
  // la cifra con più dati in griglia: le celle "stessa" saranno parecchie
  let v = 1;
  for (let d = 1; d <= 9; d++) if (conta[d] > conta[v]) v = d;
  let piano = null;
  for (const S0 of vuote.filter((i) => sol[i] === v)) {
    const usate = new Set([S0]);
    const prendi = (f) => {
      const i = vuote.find((x) => !usate.has(x) && f(x));
      if (i === undefined) throw new Error('niente');
      usate.add(i);
      return i;
    };
    const S = S0;
    const vicina = (i) => riga(i) === riga(S) || col(i) === col(S) || box(i) === box(S);
    try {
      piano = {
        S,
        E1: prendi((i) => riga(i) === riga(S) && box(i) !== box(S)),
        H1: prendi((i) => riga(i) === riga(S) && box(i) !== box(S)),
        H2: prendi((i) => box(i) === box(S) && riga(i) !== riga(S) && col(i) !== col(S)),
        H3: prendi((i) => !vicina(i) && sol[i] !== v),
        M1: prendi((i) => col(i) === col(S) && box(i) !== box(S)),
        P: prendi((i) => col(i) === col(S) && box(i) !== box(S)),
        M2: prendi((i) => !vicina(i) && sol[i] !== v),
        M3: prendi((i) => !vicina(i) && sol[i] !== v),
        E2: prendi((i) => !vicina(i) && sol[i] !== v),
        N: prendi((i) => !vicina(i) && sol[i] !== v),
      };
      break;
    } catch {
      /* prossima candidata */
    }
  }
  if (!piano) throw new Error('scenario: nessuna cella adatta');
  const { S, E1, H1, H2, H3, M1, P, M2, M3, E2, N } = piano;
  const sbagliato = (i, evita) => {
    for (let d = 1; d <= 9; d++) if (d !== sol[i] && d !== evita) return d;
    return 1;
  };
  const scrivi = async (p, i, val) => {
    await p.getByTestId(`cella-${i}`).click();
    await attendi(60);
    await p.getByTestId(`tasto-${val}`).click();
    await attendi(120);
  };
  await scrivi(a, S, v);
  await scrivi(a, M1, sol[M1]);
  await scrivi(a, M2, sol[M2]);
  await scrivi(a, M3, sol[M3]);
  await scrivi(b, H1, sol[H1]);
  await scrivi(b, H2, sol[H2]);
  await scrivi(b, H3, sol[H3]);
  await scrivi(a, E1, sbagliato(E1, v));
  await scrivi(a, E2, v); // sbagliato, ma con la stessa cifra della selezione
  // note in una cella lontana
  await a.getByTestId(`cella-${N}`).click();
  await a.getByTestId('matita').click();
  for (const d of [v, (v % 9) + 1, ((v + 3) % 9) + 1]) await a.getByTestId(`tasto-${d}`).click();
  await a.getByTestId('matita').click();
  await attendi(300);
  // selezione finale: io su S (cifra v), lei su P (stessa colonna)
  await a.getByTestId(`cella-${S}`).click();
  await b.getByTestId(`cella-${P}`).click();
  await attendi(1600);
  return { S, P, E1, E2, H1, H2, H3, M1, M2, M3, N, v };
}

const browser = await chromium.launch();
const riepilogo = {};
for (const schema of ['scuro', 'chiaro']) {
  const { a, b, A, B } = await prepara(browser, schema);
  const celle = await scenario(a, b);
  riepilogo[schema] = celle;
  // presenza del blu a 1 (coppia sbloccata, come nel collaudo) e niente transizioni/animazioni: misure ripetibili
  const fermo =
    '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}:root{--blu-presenza:1!important}';
  await a.addStyleTag({ content: fermo });
  await attendi(200);
  const varianti = { attuale: '', ...PROPOSTE };
  const misure = {};
  for (const [nome, css] of Object.entries(varianti)) {
    const tag = css ? await a.addStyleTag({ content: css }) : null;
    await attendi(150);
    misure[nome] = await a.evaluate(misuraNellaPagina, STATI);
    // alcune proposte usano riga/colonna/box del partner: nell'app servirebbe una classe in Griglia.tsx,
    // qui la mettiamo a mano solo per lo scatto
    await a.evaluate(
      ([P]) => {
        const r = Math.floor(P / 9);
        const c = P % 9;
        const bx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        document.querySelectorAll('.cella').forEach((el, i) => {
          const ri = Math.floor(i / 9);
          const ci = i % 9;
          const bi = Math.floor(ri / 3) * 3 + Math.floor(ci / 3);
          if (ri === r || ci === c || bi === bx) el.classList.add('vicina-suo');
        });
      },
      [celle.P],
    );
    await attendi(120);
    await a.screenshot({ path: `${IMG}t9-colori-${MODALITA}-${nome}-${schema}.png` });
    // lei e io sulla stessa cella (la mia selezione e il suo cursore coincidono)
    await b.getByTestId(`cella-${celle.S}`).click();
    await attendi(1200);
    await a.screenshot({ path: `${IMG}t9-colori-${MODALITA}-${nome}-${schema}-insieme.png`, clip: { x: 0, y: 232, width: 390, height: 390 } });
    await b.getByTestId(`cella-${celle.P}`).click();
    await attendi(1200);
    await a.evaluate(() => document.querySelectorAll('.vicina-suo').forEach((el) => el.classList.remove('vicina-suo')));
    // banco di prova: ogni stato in una cella sola, sulla stessa griglia (legenda nel documento)
    if (MODALITA === 'sudoku') {
      await a.evaluate(
        ([righe]) => {
          const g = document.querySelector('.griglia');
          const box = document.createElement('div');
          box.id = 'banco';
          box.style.cssText = 'position:fixed;top:96px;left:16px;width:358px;z-index:9999;background:var(--fondo-2)';
          const gr = document.createElement('div');
          gr.className = 'griglia';
          gr.style.cssText = 'aspect-ratio:auto;grid-template-rows:repeat(' + righe.length + ',1fr);height:' + righe.length * 39.7 + 'px';
          const nota = '<span class="note" aria-hidden="true">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => '<i>' + ([2, 5, 7].includes(n) ? n : '') + '</i>').join('') + '</span>';
          righe.flat().forEach((st, i) => {
            const d = document.createElement('div');
            d.className = ('cella ' + st).trim();
            const vuota = st === 'vuota' || st === 'nota';
            d.innerHTML = '<span class="valore">' + (vuota || st === 'partner' ? '' : String(1 + (i % 9))) + '</span>' + (st === 'nota' ? nota : '');
            if (st === 'vuota' || st === 'nota') d.className = 'cella';
            gr.appendChild(d);
          });
          const linee = g.querySelector('.griglia-linee').cloneNode(true);
          linee.setAttribute('viewBox', '0 0 900 ' + righe.length * 100);
          linee.innerHTML = '<path class="linea-sottile" d="' + [1, 2, 3, 4, 5, 6, 7, 8].map((k) => 'M' + k * 100 + ' 0V' + righe.length * 100).join('') + [...Array(righe.length - 1).keys()].map((k) => 'M0 ' + (k + 1) * 100 + 'H900').join('') + '"/>';
          gr.appendChild(linee);
          box.appendChild(gr);
          document.querySelector('.app').appendChild(box);
        },
        [BANCO(nome)],
      );
      await attendi(150);
      const el = await a.$('#banco');
      await el.screenshot({ path: `${IMG}t9-colori-banco-${nome}-${schema}.png` });
      await a.evaluate(() => document.getElementById('banco')?.remove());
    }
    if (tag) await tag.evaluate((n) => n.remove());
  }
  writeFileSync(`${OUT}/misure-${MODALITA}-${schema}.json`, JSON.stringify({ celle, misure }, null, 1));
  await A.ctx.close();
  await B.ctx.close();
}
writeFileSync(`${OUT}/scenari-${MODALITA}.json`, JSON.stringify(riepilogo, null, 1));
await browser.close();
console.log('fatto', OUT, JSON.stringify(riepilogo));
