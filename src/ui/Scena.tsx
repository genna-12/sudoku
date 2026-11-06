// Il giardino di sfondo: SVG panoramico con i ricordi dei luoghi (id da elementiSbloccati in config/luoghi.ts).
// <Scena elementi={elementiSbloccati(maxVisto)} fiori={fiori} bluPresenza={0..1} altezza={180} />
//   - la larghezza del viewBox segue quella del contenitore (altezza fissa di 220 unità): il centro del
//     giardino resta uguale, il mare si allarga a sinistra e la montagna a destra sugli schermi larghi
//   - stelle = min(fiori, 60), in posizioni deterministiche (ognuna ha il suo indice: aggiungerne non sposta le altre)
//   - un elemento nuovo (mai visto su questo dispositivo, o comparso mentre la scena è montata) entra con un fade/scale
//   - festa: i fuochi d'artificio partono (se sbloccati) e l'arcobaleno si accende
//   - sfuma: in basso sfuma nel fondo della pagina (per la Home)
//   - momento: alba/giorno/crepuscolo/notte (ui/momento.ts): un cielo tinto dietro le sagome e il sole di giorno
//     (variabili --sc-cielo-* in scena.css); senza, la scena segue solo il tema (il lettore dei capitoli)
//   - figli: slot sul prato (x relativa al centro, y=0 al suolo PRATO_Y) per le mascotte del Giardino
// Colori dal tema (--verde, --blu, --fondo, --testo…) con fallback; tinte della scena in scena.css.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Momento } from '../config/sonno';
import './scena.css';

/** gli id che la scena sa disegnare (devono coprire i ricordi degli ATTI in config/luoghi.ts) */
export const ELEMENTI_SCENA = [
  'fiore',
  'sentiero',
  'semina',
  'stagno',
  'merlo',
  'cassetta',
  'mare',
  'stelle',
  /** la tavola da surf sul muretto */
  'surf',
  'montagna',
  'cavallino',
  'sasso',
  'fuochi',
  'lanterna',
  'chitarra',
  'locandina',
  'casetta',
  'cartina',
  'arcobaleno',
] as const;
export type ElementoScena = (typeof ELEMENTI_SCENA)[number];

const H = 220;
/** il suolo dello slot `figli`: sul prato, davanti alla collina e dietro l'aiuola in primo piano */
export const PRATO_Y = 188;
const ORIZZONTE = 142;
const CHIAVE_VISTI = 'sudoku-scena-visti';

/* ------------------------------------------------------------ utilità */

/** pseudo-caso deterministico in [0,1) per (indice, sale) */
function caso(i: number, sale: number) {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(sale + 7, 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const f1 = (n: number) => Math.round(n * 10) / 10;

/** profilo della collina: interpolazione morbida (coseno) tra punti di controllo */
function profilo(punti: Array<[number, number]>) {
  return (x: number) => {
    if (x <= punti[0][0]) return punti[0][1];
    for (let i = 1; i < punti.length; i++) {
      const [x1, y1] = punti[i];
      if (x <= x1) {
        const [x0, y0] = punti[i - 1];
        const t = (x - x0) / (x1 - x0 || 1);
        const k = (1 - Math.cos(t * Math.PI)) / 2;
        return y0 + (y1 - y0) * k;
      }
    }
    return punti[punti.length - 1][1];
  };
}

function leggiVisti(): Set<string> | null {
  try {
    const v = localStorage.getItem(CHIAVE_VISTI);
    if (v === null) return null;
    const a = JSON.parse(v);
    return Array.isArray(a) ? new Set(a.filter((x) => typeof x === 'string')) : null;
  } catch {
    return null;
  }
}
function salvaVisti(s: Set<string>) {
  try {
    localStorage.setItem(CHIAVE_VISTI, JSON.stringify([...s]));
  } catch {
    /* niente memoria: pazienza, nessuna animazione la prossima volta */
  }
}

/* ------------------------------------------------------------ pezzi */

function Stella4({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <path
      d={`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`}
    />
  );
}

/** margherita verde (il primo fiore) con stelo e due foglie; base in (x, y) */
function Margherita({ x, y }: { x: number; y: number }) {
  const cy = y - 19;
  return (
    <g>
      <path d={`M${x} ${y} C${x - 1.5} ${y - 7} ${x + 1.5} ${y - 12} ${x} ${cy}`} className="sc-stelo" />
      <path d={`M${x} ${y - 6} C${x - 4} ${y - 9} ${x - 8} ${y - 8} ${x - 9} ${y - 5} C${x - 6} ${y - 4} ${x - 3} ${y - 4} ${x} ${y - 6}Z`} className="sc-foglia" />
      <path d={`M${x} ${y - 9} C${x + 4} ${y - 12} ${x + 8} ${y - 11} ${x + 9} ${y - 8} C${x + 6} ${y - 7} ${x + 3} ${y - 7} ${x} ${y - 9}Z`} className="sc-foglia" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        const px = x + Math.sin(r) * 3.6;
        const py = cy - Math.cos(r) * 3.6;
        return <ellipse key={a} cx={f1(px)} cy={f1(py)} rx={2.3} ry={3.4} transform={`rotate(${a} ${f1(px)} ${f1(py)})`} className="sc-petalo-verde" />;
      })}
      <circle cx={x} cy={cy} r={2.4} className="sc-cuore" />
    </g>
  );
}

/** tulipano blu (Semina, piccola, accanto al primo fiore) */
function Tulipano({ x, y }: { x: number; y: number }) {
  const cy = y - 15;
  return (
    <g>
      <path d={`M${x} ${y} C${x + 1.4} ${y - 5} ${x - 1} ${y - 9} ${x} ${cy}`} className="sc-stelo" />
      <path d={`M${x} ${y - 3} C${x + 3} ${y - 9} ${x + 7} ${y - 11} ${x + 8} ${y - 12} C${x + 7} ${y - 7} ${x + 4} ${y - 4} ${x} ${y - 3}Z`} className="sc-foglia" />
      <path
        d={`M${x} ${cy + 5.5} C${x - 5} ${cy + 5} ${x - 5.4} ${cy - 1} ${x - 4} ${cy - 5} C${x - 2.4} ${cy - 3} ${x - 1.4} ${cy - 2.6} ${x} ${cy - 5.4} C${x + 1.4} ${cy - 2.6} ${x + 2.4} ${cy - 3} ${x + 4} ${cy - 5} C${x + 5.4} ${cy - 1} ${x + 5} ${cy + 5} ${x} ${cy + 5.5}Z`}
        className="sc-petalo-blu"
      />
    </g>
  );
}

/** un ciuffo d'erba di tre fili */
function ciuffo(x: number, y: number, k: number, key: string | number) {
  const h = 5 + k * 5;
  return (
    <path
      key={key}
      d={`M${f1(x - 2.4)} ${f1(y)} Q${f1(x - 2.6)} ${f1(y - h * 0.6)} ${f1(x - 4.4)} ${f1(y - h * 0.9)} M${f1(x)} ${f1(y)} Q${f1(x + 0.4)} ${f1(y - h * 0.7)} ${f1(x - 0.4)} ${f1(y - h)} M${f1(x + 2.4)} ${f1(y)} Q${f1(x + 2.8)} ${f1(y - h * 0.5)} ${f1(x + 4.6)} ${f1(y - h * 0.8)}`}
      className="sc-ciuffo"
    />
  );
}

/** il merlo, appollaiato; (x, y) = zampette, guarda a sinistra */
function Merlo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="sc-merlo">
      <path d="M-1.2 -0.4 v1.6 M1.4 -0.4 v1.6" className="sc-zampe" />
      <path d="M4.4 -5 L11.6 -9.4 L10.6 -3.4Z" className="sc-merlo-corpo" />
      <path d="M-6.2 -6.2 C-6.2 -11.8 -2.2 -13.4 0.4 -13.4 C4.2 -13.4 7 -10 7 -5.8 C7 -2.2 3.8 0 0 0 C-3.8 0 -6.2 -2.4 -6.2 -6.2Z" className="sc-merlo-corpo" />
      <path d="M0.8 -7 C3 -8 5.6 -7 6 -4.4 C3.8 -3.6 1.6 -4.4 0.8 -7Z" className="sc-merlo-ala" />
      <path d="M-6 -9.2 L-9.6 -8 L-6 -6.8Z" className="sc-becco" />
      <circle cx={-3.4} cy={-9.4} r={1.5} className="sc-merlo-occhio" />
      <circle cx={-3.4} cy={-9.4} r={0.7} className="sc-merlo-pupilla" />
    </g>
  );
}

/** cavallino che bruca, di profilo verso destra; (x, y) = zoccoli */
function Cavallino({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-13 -13 C-17 -12 -18.6 -6 -17 -1.6 C-16 -5 -14.6 -8 -12.6 -9.4Z" className="sc-criniera" />
      {[-10.4, -6.6, 6, 9.6].map((lx, i) => (
        <path key={lx} d={`M${lx} -9 L${lx + (i % 2 ? 0.6 : -0.4)} 0`} className="sc-gamba" />
      ))}
      <path d="M-13 -14.4 C-13 -19 -7 -20 0 -20 C7 -20 11.6 -18.6 12.6 -14 C13.2 -10.6 10.6 -8.4 7.4 -8.2 L-9 -8.2 C-12 -8.4 -13 -11 -13 -14.4Z" className="sc-cavallo" />
      {/* collo che scende al prato */}
      <path d="M8.4 -18.8 C14 -17.6 17.6 -12 19.2 -5.4 L14.4 -3.8 C13 -8.6 10.4 -11.6 7.4 -12.4Z" className="sc-cavallo" />
      <path d="M14 -6.4 C14.6 -2.6 16.6 0.4 19.6 0.6 C22.2 0.6 22.6 -2.2 21.6 -4.6 C20.6 -7 18 -8 15.4 -7.8Z" className="sc-cavallo" />
      <path d="M8.6 -19.2 C12.4 -20.4 16.6 -16.4 17.8 -11.4 C15.6 -14 13 -15.6 10 -16.2Z" className="sc-criniera" />
      <path d="M15 -9.6 L13.6 -12.8 L16.6 -10.6Z" className="sc-cavallo" />
      <circle cx={17.6} cy={-4.6} r={0.8} className="sc-occhio" />
      <ellipse cx={-4} cy={-15.6} rx={4} ry={1.6} className="sc-luce" />
    </g>
  );
}

/** la casetta: una finestra sul mare (sinistra), una sulla montagna (destra); (x, y) = centro della base */
function Casetta({ x, y, chitarra, cartina }: { x: number; y: number; chitarra: ReactNode; cartina?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.82)`}>
      <rect x={14} y={-52} width={6} height={12} className="sc-camino" />
      <rect x={-26} y={-34} width={52} height={34} rx={1.5} className="sc-muro" />
      <path d="M-31 -32 L0 -54 L31 -32Z" className="sc-tetto" />
      <path d="M-31 -32 L0 -54 L31 -32" className="sc-tetto-bordo" />
      {/* finestra sul mare: onde nel vetro */}
      <rect x={-20} y={-27} width={11} height={10} rx={1.5} className="sc-finestra" />
      <path d="M-19 -20.6 q1.4 -1.4 2.8 0 t2.8 0 t2.8 0" className="sc-finestra-segno" />
      {/* finestra sulla montagna: un picco nel vetro */}
      <rect x={9} y={-27} width={11} height={10} rx={1.5} className="sc-finestra" />
      <path d="M10 -18.4 L13.4 -23.6 L15.4 -21 L16.6 -22.4 L19 -18.4" className="sc-finestra-segno" />
      <path d="M-5.5 0 V-17 Q0 -22 5.5 -17 V0Z" className="sc-porta" />
      <circle cx={3.2} cy={-8.4} r={0.9} className="sc-pomello" />
      {cartina}
      {chitarra}
    </g>
  );
}

/** chitarra appesa a un chiodo sul muro della casetta (coordinate locali alla casetta) */
function ChitarraAppesa() {
  return (
    <g transform="translate(14.6 -12.4) rotate(14)">
      <circle cx={0} cy={-11} r={0.8} className="sc-chiodo" />
      <rect x={-0.9} y={-10.6} width={1.8} height={8} rx={0.4} className="sc-manico" />
      <path d="M0 6 C-5 6 -5.4 1 -3.2 -0.6 C-4.4 -2.6 -3.6 -6 0 -6 C3.6 -6 4.4 -2.6 3.2 -0.6 C5.4 1 5 6 0 6Z" className="sc-cassa" />
      <circle cx={0} cy={-0.8} r={1.2} className="sc-buca" />
    </g>
  );
}

/** cassetta della posta su un paletto, bandierina alzata e una lettera che spunta */
function Cassetta({ x, y, locandina }: { x: number; y: number; locandina?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-1.4} y={-20} width={2.8} height={20} className="sc-paletto" />
      <path d="M-8 -20 V-28 Q-8 -33 -3 -33 H5 Q9 -33 9 -28 V-20Z" className="sc-cassetta" />
      <path d="M-3 -33 Q2 -33 2 -28 V-20" className="sc-cassetta-bordo" />
      <rect x={-6.6} y={-30.4} width={7} height={4.4} rx={0.6} transform="rotate(-8 -3 -28)" className="sc-lettera" />
      <path d="M-4.2 -28.6 l1.2 1 l1.2 -1" className="sc-lettera-segno" />
      <path d="M9 -24 V-36" className="sc-asta" />
      <path d="M9 -36 H14.4 V-32.2 H9Z" className="sc-bandierina" />
      {locandina}
    </g>
  );
}

/** tavola da surf appoggiata al muretto, con una montagna disegnata sopra; (x, y) = base del muretto */
/** la tavola da surf da sola (appoggiata, inclinata di `a` gradi) */
function TavolaSola({ a }: { a: number }) {
  return (
    <g transform={`rotate(${a})`}>
      <path d="M0 -42 C6 -34 6.4 -10 4.8 -2 Q0 1.6 -4.8 -2 C-6.4 -10 -6 -34 0 -42Z" className="sc-tavola" />
      <path d="M0 -42 C3.2 -38 4.6 -34 5.2 -30 Q0 -28.4 -5.2 -30 C-4.6 -34 -3.2 -38 0 -42Z" className="sc-tavola-punta" />
      <path d="M-3.6 -12 L-1 -18 L0.6 -15.4 L1.8 -16.8 L3.8 -12Z" className="sc-tavola-monte" />
      <path d="M0 -27 V-21" className="sc-tavola-anima" />
    </g>
  );
}

/** la tavola appoggiata al muro della casetta (Home sul telefono: il muretto sul mare è sotto il titolo) */
function Tavola({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.82)`}>
      <TavolaSola a={9} />
    </g>
  );
}

function TavolaMuretto({ x, y }: { x: number; y: number }) {
  const sassi = [-20, -11, -2, 7, 16];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform="translate(-3 0)">
        <TavolaSola a={-12} />
      </g>
      <path d="M-25 0 V-9 Q-25 -11 -23 -11 H21 Q23 -11 23 -9 V0Z" className="sc-muretto" />
      {sassi.map((sx, i) => (
        <path key={sx} d={`M${sx} -11 V0 M${sx + 4.5} ${i % 2 ? -5.5 : -6} h${i % 2 ? 9 : -9}`} className="sc-muretto-fuga" />
      ))}
    </g>
  );
}

/** il sasso di quota sul muretto (montagna, 37): segnavia bianco e rosso e un sassolino in cima; (x, y) = appoggio */
function SassoQuota({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0.6} cy={0.2} rx={7.4} ry={1} className="sc-ombra" />
      <path d="M-7 0 C-7.6 -2.2 -6 -4.6 -3.2 -5.4 L0.6 -6.2 C3.8 -6.4 6.6 -4.8 7.2 -2.2 C7.4 -1 7 0 6.2 0Z" className="sc-sasso-quota" />
      <path d="M-5.4 -3.2 C-4.2 -4.6 -2 -5.2 0.6 -5.4" className="sc-sasso-luce" />
      <path d="M2.6 -6 L3.6 -2.8 M-1.8 -0.4 L-0.8 -2.6" className="sc-sasso-crepa" />
      {/* segnavia: bianco, rosso, bianco */}
      <rect x={-3.6} y={-4.2} width={4.6} height={1} rx={0.3} className="sc-segnavia-bianco" />
      <rect x={-3.6} y={-3.2} width={4.6} height={1} className="sc-segnavia-rosso" />
      <rect x={-3.6} y={-2.2} width={4.6} height={1} rx={0.3} className="sc-segnavia-bianco" />
      {/* l'ometto: un sassolino posato sopra, un po' di lato */}
      <path d="M2.2 -6 C2 -7.6 3.4 -8.4 4.8 -8 C6 -7.6 6.2 -6.4 5.8 -5.7Z" className="sc-sasso-quota sc-sasso-piccolo" />
    </g>
  );
}

/** la lanterna appesa al ramo (bosco, 54): cordino, cappello, vetro acceso e un alone che respira; (x, y) = nodo sul ramo */
function LanternaAppesa({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="sc-lanterna-alone">
        <circle cx={0} cy={11.4} r={8.4} />
        <circle cx={0} cy={11.4} r={5.6} />
      </g>
      <path d="M0 0 V4.4" className="sc-cordino-lanterna" />
      <path d="M-1.6 4.4 A1.6 1.6 0 0 1 1.6 4.4" className="sc-lanterna-ferro" fill="none" />
      <path d="M-3.4 6.8 L-1.6 4.8 H1.6 L3.4 6.8Z" className="sc-lanterna-ferro" />
      <rect x={-2.8} y={6.8} width={5.6} height={8} rx={1} className="sc-lanterna-vetro" />
      <ellipse cx={0} cy={11.6} rx={1} ry={1.8} className="sc-lanterna-fiamma" />
      <path d="M-2.8 9.4 H2.8 M0 6.8 V14.8" className="sc-lanterna-griglia" />
      <path d="M-3.4 14.8 H3.4 L2.4 16.4 H-2.4Z" className="sc-lanterna-ferro" />
    </g>
  );
}

/** la locandina legata al paletto della cassetta (città, 65): una chitarrina, due righe, lo scotch; coordinate della cassetta */
function Locandina() {
  return (
    <g transform="translate(0 -11.6) rotate(-6)">
      <rect x={-4.6} y={-5.6} width={9.2} height={11.6} rx={0.6} className="sc-locandina" />
      <rect x={-4.6} y={-5.6} width={9.2} height={2.6} rx={0.6} className="sc-locandina-testa" />
      {/* chitarrina */}
      <path d="M-0.4 3.4 C-2.6 3.4 -2.8 1.2 -1.8 0.4 C-2.4 -0.6 -1.8 -2 -0.4 -2 C1 -2 1.6 -0.6 1 0.4 C2 1.2 1.8 3.4 -0.4 3.4Z" className="sc-locandina-chitarra" />
      <path d="M-0.4 -2 L1.6 -4.6" className="sc-locandina-manico" />
      <path d="M2.2 1.2 H3.6 M2.2 2.8 H3.4" className="sc-locandina-riga" />
      {/* lo scotch in alto */}
      <rect x={-2} y={-6.6} width={4} height={1.6} rx={0.3} transform="rotate(8)" className="sc-scotch" />
    </g>
  );
}

/** la cartina appesa al muro della casetta (oltre la montagna, 88): pieghe, un percorso a puntini fra due spilli; coordinate della casetta */
function Cartina() {
  return (
    <g transform="translate(-15.4 -9.6) rotate(-3)">
      <path d="M-6.6 -4.4 L-2.2 -5 L2.2 -4.4 L6.6 -5 V4.4 L2.2 5 L-2.2 4.4 L-6.6 5Z" className="sc-cartina" />
      <path d="M-2.2 -5 V4.4 M2.2 -4.4 V5" className="sc-cartina-piega" />
      <path d="M-4.2 2.6 C-2.6 0.4 -1 2.4 0.6 0.2 C1.8 -1.4 3 -0.6 4.2 -2.4" className="sc-cartina-percorso" />
      <path d="M-5.6 -2.6 L-3.8 -3.8 L-2.6 -2.6" className="sc-cartina-monte" />
      <circle cx={-4.2} cy={2.6} r={0.95} className="sc-spillo-verde" />
      <circle cx={4.2} cy={-2.4} r={0.95} className="sc-spillo-blu" />
      <circle cx={0} cy={-4.6} r={0.7} className="sc-chiodo" />
    </g>
  );
}

/** tre razzi piantati nel prato, pronti per la prossima vittoria */
function Razzi({ x, y }: { x: number; y: number }) {
  const r = [
    { dx: -4, h: 20, a: -8, c: 'sc-razzo-verde' },
    { dx: 0, h: 24, a: 2, c: 'sc-razzo-oro' },
    { dx: 4, h: 19, a: 10, c: 'sc-razzo-blu' },
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {r.map((q) => (
        <g key={q.dx} transform={`translate(${q.dx} 0) rotate(${q.a})`}>
          <path d={`M0 0 V${-q.h + 6}`} className="sc-bastoncino" />
          <rect x={-1.6} y={-q.h + 1} width={3.2} height={6} rx={0.8} className={q.c} />
          <path d={`M-1.6 ${-q.h + 1} L0 ${-q.h - 2.6} L1.6 ${-q.h + 1}Z`} className={q.c} />
        </g>
      ))}
    </g>
  );
}

/** uno scoppio di fuochi: raggi e puntini, colore per indice */
function Scoppio({ x, y, r, i }: { x: number; y: number; r: number; i: number }) {
  const n = 12;
  const tinte = ['sc-fuoco-verde', 'sc-fuoco-oro', 'sc-fuoco-blu'];
  return (
    <g className={`sc-scoppio ${tinte[i % 3]}`} style={{ animationDelay: `${(i * 0.55) % 2.2}s` } as CSSProperties}>
      {Array.from({ length: n }, (_, k) => {
        const a = (k / n) * Math.PI * 2 + i;
        const c = Math.cos(a);
        const s = Math.sin(a);
        return (
          <g key={k}>
            <path d={`M${f1(x + c * r * 0.35)} ${f1(y + s * r * 0.35)} L${f1(x + c * r * 0.8)} ${f1(y + s * r * 0.8)}`} />
            <circle cx={f1(x + c * r)} cy={f1(y + s * r)} r={1} />
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------ scena */

interface Props {
  /** id dei ricordi visibili (elementiSbloccati(maxVisto) in config/luoghi.ts); quelli sconosciuti si ignorano */
  elementi: readonly string[];
  /** partite finite: decide il numero di stelle (al massimo 60) */
  fiori: number;
  /** presenza del blu 0..1: tinge il chiarore dell'orizzonte dal verde al blu */
  bluPresenza?: number;
  /** altezza in px (default 180) */
  altezza?: number;
  /** fuochi in cielo (se sbloccati) e arcobaleno acceso: per la vittoria */
  festa?: boolean;
  /** sfuma in basso verso il fondo della pagina (dietro la Home) */
  sfuma?: boolean;
  /** intera: sui contenitori stretti si rimpicciolisce invece di tagliare i lati (fondale del lettore) */
  intera?: boolean;
  /** elementi da animare in entrata oltre a quelli mai visti su questo dispositivo (es. quello del giorno speciale) */
  nuovi?: readonly string[];
  /** nessun elemento entra con l'animazione (fondali del lettore) */
  senzaEntrate?: boolean;
  /** in alto a sinistra c'è il titolo (Home): sul telefono la tavola e i razzi stanno alla sua destra */
  titolo?: boolean;
  /** momento del giorno (dall'ora locale, se il tema non è forzato): tinge il cielo; senza, solo il tema */
  momento?: Momento;
  /** cose in piedi sul prato (es. le mascotte): origine al centro del prato, y = 0 al suolo (PRATO_Y), unità del viewBox */
  figli?: ReactNode;
  /** tocco sulla cassetta della posta (se c'è): un bersaglio trasparente sopra di lei */
  onCassetta?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Scena({
  elementi,
  fiori,
  bluPresenza = 0,
  altezza = 180,
  festa = false,
  sfuma = false,
  intera = false,
  nuovi: nuoviForzati,
  senzaEntrate = false,
  titolo = false,
  momento,
  figli,
  onCassetta,
  className,
  style,
}: Props) {
  const rif = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, '');
  const [larghezza, setLarghezza] = useState(() => Math.round(altezza * 2.2));

  // la larghezza del viewBox segue il contenitore: niente ritaglio dei lati sui telefoni
  useLayoutEffect(() => {
    const el = rif.current;
    if (!el) return;
    const misura = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setLarghezza(Math.round(w));
    };
    misura();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(misura);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // elementi nuovi: mai visti su questo dispositivo, o comparsi mentre la scena è montata
  const visti = useRef<Set<string> | null>(null);
  if (visti.current === null) visti.current = leggiVisti() ?? new Set(elementi);
  const nuovi = new Set(senzaEntrate ? [] : [...(nuoviForzati ?? []), ...elementi.filter((e) => !visti.current!.has(e))]);
  const chiave = elementi.join(',');
  useEffect(() => {
    const v = visti.current!;
    let cambiato = false;
    for (const e of elementi) {
      if (!v.has(e)) {
        v.add(e);
        cambiato = true;
      }
    }
    if (cambiato || leggiVisti() === null) salvaVisti(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  const ha = new Set(elementi);
  const W = Math.max(360, Math.min(2600, (larghezza / Math.max(1, altezza)) * H));
  const sx = -W / 2;
  const dx = W / 2;
  const mareL = Math.max(170, W * 0.3);
  const monteL = Math.max(190, W * 0.3);
  const monte0 = dx - monteL;

  // collina: bassa a sinistra (si vede il mare), cresta poco a destra del centro
  const yc = profilo([
    [sx - 20, 166],
    [Math.min(-110, sx + mareL * 0.7), 159],
    [-60, 152],
    [70, 146],
    [Math.max(200, dx - 60), 151],
    [dx + 20, 154],
  ]);
  const passi = Math.ceil((W + 40) / 8);
  let collina = `M${f1(sx - 20)} ${H + 2}`;
  for (let i = 0; i <= passi; i++) {
    const x = sx - 20 + i * 8;
    collina += ` L${f1(x)} ${f1(yc(x))}`;
  }
  collina += ` L${f1(dx + 20)} ${H + 2}Z`;

  // spiaggia: una lingua di sabbia sotto il mare
  let spiaggia = '';
  if (ha.has('mare')) {
    const fine = sx + mareL + 10;
    spiaggia = `M${f1(sx - 20)} ${f1(yc(sx - 20) + 4)}`;
    for (let x = sx - 20; x <= fine; x += 8) spiaggia += ` L${f1(x)} ${f1(yc(x) - 0.5)}`;
    for (let x = fine; x >= sx - 20; x -= 8) {
      const t = (x - (sx - 20)) / (fine - (sx - 20));
      spiaggia += ` L${f1(x)} ${f1(yc(x) + 3.5 * (1 - t * t))}`;
    }
    spiaggia += 'Z';
  }

  // ciuffi d'erba: sul filo della collina e in primo piano (non sull'aiuola né nello stagno)
  const ciuffi: ReactNode[] = [];
  const nC = Math.ceil(W / 30);
  for (let i = 0; i < nC; i++) {
    const x = sx + (i + caso(i, 11)) * (W / nC);
    ciuffi.push(ciuffo(x, yc(x) + 4 + caso(i, 12) * 6, caso(i, 13), `a${i}`));
    const xf = sx + (i + caso(i, 14)) * (W / nC);
    const nellAiuola = xf > -54 && xf < 34;
    if (!nellAiuola) ciuffi.push(ciuffo(xf, 214 + caso(i, 15) * 5, 0.4 + caso(i, 16) * 0.6, `b${i}`));
  }

  // stelle: una per fiore (fino a 60), indice → posizione fissa nella larghezza attuale
  const nStelle = ha.has('stelle') ? Math.max(0, Math.min(60, Math.floor(fiori || 0))) : 0;
  const stelle: ReactNode[] = [];
  for (let i = 0; i < nStelle; i++) {
    const x = sx + 10 + caso(i, 1) * (W - 20);
    const y = 8 + Math.pow(caso(i, 2), 1.25) * 112;
    const grande = i % 9 === 4;
    const brilla = i % 5 === 2;
    const r = grande ? 3.4 : 0.7 + caso(i, 3) * 1.1;
    stelle.push(
      <g
        key={i}
        className={`sc-stella${brilla ? ' sc-brilla' : ''}`}
        style={brilla ? ({ animationDelay: `${f1(caso(i, 4) * 5)}s`, animationDuration: `${f1(3 + caso(i, 5) * 3)}s` } as CSSProperties) : undefined}
      >
        {grande ? <Stella4 x={f1(x)} y={f1(y)} r={r} /> : <circle cx={f1(x)} cy={f1(y)} r={f1(r)} />}
      </g>,
    );
  }

  // la casetta sulla cresta (un po' ridotta: non copre la montagna)
  const xCas = 112;
  // sentiero di sassi: dalla base, verso la cresta (la porta della casetta)
  const sassi: ReactNode[] = [];
  if (ha.has('sentiero')) {
    const p0 = [34, 226];
    const p1 = [92, 196];
    const p2 = [62, 170];
    const p3 = [xCas, yc(xCas) + 2];
    const n = 15;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      const k = 1 - t * 0.72;
      const lato = (i % 2 ? 1 : -1) * 3.2 * k;
      sassi.push(
        <ellipse key={i} cx={f1(x + lato)} cy={f1(y)} rx={f1(4.6 * k + caso(i, 21) * 1.4 * k)} ry={f1(1.9 * k + 0.4)} className="sc-sasso" />,
      );
    }
  }

  // mare: fascia dall'orizzonte, che si spegne verso riva
  const mare = ha.has('mare') ? (
    <g className="sc-el" data-el="mare" data-nuovo={nuovi.has('mare') || undefined}>
      <path
        d={`M${f1(sx - 20)} ${ORIZZONTE} H${f1(sx + mareL)} C${f1(sx + mareL + 30)} ${ORIZZONTE + 2} ${f1(sx + mareL + 20)} 160 ${f1(sx + mareL - 10)} 172 H${f1(sx - 20)}Z`}
        fill={`url(#mare-${id})`}
      />
      <path d={`M${f1(sx - 20)} ${ORIZZONTE} H${f1(sx + mareL + 4)}`} className="sc-orizzonte-mare" />
      {[0, 1, 2].map((riga) => {
        const y = ORIZZONTE + 5 + riga * 6;
        const n = Math.floor((mareL - 10 - riga * 8) / 22);
        let d = '';
        for (let k = 0; k < n; k++) {
          const x = sx + 6 + k * 22 + (riga % 2) * 11 + caso(k, 30 + riga) * 6;
          const l = 5 + riga * 1.6;
          d += `M${f1(x)} ${y} q${f1(l / 2)} ${f1(-1.6 - riga * 0.4)} ${f1(l)} 0 `;
        }
        return <path key={riga} d={d} className={`sc-onda sc-onda-${riga}`} />;
      })}
    </g>
  ) : null;

  // montagna fredda a destra: catena lontana, picco con la neve, crinale vicino
  const mx = (t: number) => f1(monte0 + t * monteL);
  const montagna = ha.has('montagna') ? (
    <g className="sc-el" data-el="montagna" data-nuovo={nuovi.has('montagna') || undefined}>
      <path
        d={`M${mx(-0.04)} 152 L${mx(0.16)} 116 L${mx(0.27)} 124 L${mx(0.46)} 62 L${mx(0.58)} 88 L${mx(0.7)} 76 L${mx(0.86)} 104 L${mx(1)} 96 L${f1(dx + 30)} 108 L${f1(dx + 30)} 160 Z`}
        className="sc-monte-lontano"
      />
      <path
        d={`M${mx(0.46)} 62 L${mx(0.52)} 74.6 L${mx(0.495)} 72.4 L${mx(0.475)} 78 L${mx(0.445)} 72 L${mx(0.42)} 75.6 L${mx(0.405)} 72.2 Z M${mx(0.7)} 76 L${mx(0.735)} 84 L${mx(0.71)} 82.6 L${mx(0.69)} 85.4 L${mx(0.67)} 81.4 Z`}
        className="sc-neve"
      />
      <path d={`M${mx(0.46)} 62 L${mx(0.58)} 88 L${mx(0.6)} 98`} className="sc-monte-luce" />
      <path
        d={`M${mx(0.02)} 156 L${mx(0.3)} 120 L${mx(0.42)} 130 L${mx(0.62)} 108 L${mx(0.8)} 124 L${mx(0.95)} 114 L${f1(dx + 30)} 126 L${f1(dx + 30)} 162 Z`}
        className="sc-monte-vicino"
      />
    </g>
  ) : null;

  // arcobaleno: un capo sul mare, uno sulla montagna
  const rxArco = Math.max(170, Math.min(W * 0.36, 520));
  const arcobaleno = ha.has('arcobaleno') ? (
    <g className={`sc-el sc-arcobaleno${festa ? ' sc-acceso' : ''}`} data-el="arcobaleno" data-nuovo={nuovi.has('arcobaleno') || undefined}>
      {['#ff8b78', 'var(--oro, #ffc94a)', 'var(--verde, #7cff4a)', 'var(--blu, #2f6bff)', '#a98bff'].map((c, i) => {
        const rx = rxArco - i * 3.4;
        const ry = 112 - i * 3.4;
        return <path key={i} d={`M${f1(-rx)} 150 A${f1(rx)} ${f1(ry)} 0 0 1 ${f1(rx)} 150`} style={{ stroke: c }} />;
      })}
    </g>
  ) : null;

  // sugli schermi stretti le cose ai lati rientrano
  // nel lettore (intera) Semino sta al 22% della colonna: lo stagno va più a sinistra e un po' più indietro,
  // così lui ci sta davanti e non dentro
  const xStagno = intera ? Math.max(-204, sx + 30) : Math.max(-146, sx + 52);
  const yStagno = intera ? -16 : 0;
  const xTavola = Math.max(-200, sx + 34);
  const xAlbero = Math.min(196, dx - 28);
  // sul telefono la Home ha il titolo sopra il mare: la tavola si appoggia alla casetta, fuori dal titolo
  const sottoTitolo = titolo && W < 460;
  // i razzi tra la casetta e l'albero; se non c'è spazio, dall'altra parte della casetta (o sotto l'albero)
  const xRazzi = Math.min(164, xAlbero - 30) >= 152 ? Math.min(164, xAlbero - 30) : sottoTitolo ? xAlbero - 14 : 78;
  // il cavallino bruca a destra dell'aiuola, fuori dalle mascotte del Giardino e dal titolo della Home
  const xCavallo = 60;

  // la luna (con le stelle) e il suo riflesso nello stagno
  const luna = ha.has('stelle') && momento !== 'giorno';
  const xLuna = xStagno - 4;
  const yLuna = 36;
  // il sole di giorno: a destra del centro, sotto le barre della Home e lontano dal titolo
  const xSole = Math.min(dx - 60, 40);
  const ySole = 70;

  const el = (k: ElementoScena, contenuto: ReactNode, extra = '') =>
    ha.has(k) ? (
      <g key={k} className={`sc-el sc-pop${extra}`} data-el={k} data-nuovo={nuovi.has(k) || undefined}>
        {contenuto}
      </g>
    ) : null;

  const yAlbero = yc(xAlbero) + 5;
  const p = Math.round(Math.max(0, Math.min(1, bluPresenza || 0)) * 100);

  const scoppi: Array<[number, number, number]> = [
    [-70, 44, 16],
    [64, 30, 20],
    [168, 58, 14],
    [-190, 66, 13],
    [10, 78, 11],
  ];
  if (W > 700) scoppi.push([-W * 0.36, 40, 18], [W * 0.34, 34, 17]);

  return (
    <svg
      ref={rif}
      className={`sc-scena${sfuma ? ' sc-sfuma' : ''}${festa ? ' sc-festa' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`${f1(sx)} 0 ${f1(W)} ${H}`}
      preserveAspectRatio={intera ? 'xMidYMax meet' : 'xMidYMax slice'}
      data-momento={momento}
      role={figli ? 'group' : 'img'}
      aria-label={descrizione(elementi, fiori)}
      style={{ height: altezza, '--sc-p': `${p}%`, ...style } as CSSProperties}
    >
      <defs>
        <linearGradient id={`chiarore-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-chiarore-0" />
          <stop offset="1" className="sc-chiarore-1" />
        </linearGradient>
        <linearGradient id={`mare-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sc-mare-0" />
          <stop offset="0.7" className="sc-mare-1" />
          <stop offset="1" className="sc-mare-2" />
        </linearGradient>
        <radialGradient id={`stagno-${id}`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" className="sc-stagno-0" />
          <stop offset="1" className="sc-stagno-1" />
        </radialGradient>
        {momento && (
          <linearGradient id={`cielo-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="sc-cielo-0" />
            <stop offset="0.3" className="sc-cielo-1" />
            <stop offset="0.82" className="sc-cielo-2" />
          </linearGradient>
        )}
        <mask id={`luna-${id}`}>
          <rect x={xLuna - 20} y={yLuna - 20} width={40} height={40} fill="#fff" />
          <circle cx={xLuna + 5} cy={yLuna - 3} r={10} fill="#000" />
        </mask>
      </defs>

      {/* il cielo del momento (sopra sfuma nella pagina: nessun bordo sotto le barre) e il sole di giorno */}
      {momento && <rect x={f1(sx - 20)} y={0} width={f1(W + 40)} height={ORIZZONTE + 24} fill={`url(#cielo-${id})`} className="sc-cielo" />}
      {momento === 'giorno' && (
        <g className="sc-sole" aria-hidden="true">
          <circle cx={xSole} cy={ySole} r={17} className="sc-sole-alone" />
          <circle cx={xSole} cy={ySole} r={9} className="sc-sole-disco" />
        </g>
      )}

      {/* chiarore all'orizzonte: dal verde al blu con la presenza */}
      <rect x={f1(sx - 20)} y={56} width={f1(W + 40)} height={ORIZZONTE + 20 - 56} fill={`url(#chiarore-${id})`} />

      {nStelle > 0 && (
        <g className="sc-el sc-stelle" data-el="stelle" data-nuovo={nuovi.has('stelle') || undefined}>
          {stelle}
          {luna && <circle cx={xLuna} cy={yLuna} r={11} mask={`url(#luna-${id})`} className="sc-luna" />}
        </g>
      )}

      {arcobaleno}
      {montagna}
      {mare}

      {festa && ha.has('fuochi') && (
        <g className="sc-fuochi" aria-hidden="true">
          {scoppi.map(([x, y, r], i) => (
            <Scoppio key={i} x={x} y={y} r={r} i={i} />
          ))}
        </g>
      )}

      {/* il prato */}
      <path d={collina} className="sc-collina" />
      {spiaggia && <path d={spiaggia} className="sc-spiaggia" />}
      <path d={collina} className="sc-collina-filo" />

      {/* albero sottile (c'è sempre): il merlo ci si posa */}
      <g className="sc-albero">
        <path d={`M${xAlbero} ${f1(yAlbero)} C${xAlbero - 2} ${f1(yAlbero - 24)} ${xAlbero + 3} ${f1(yAlbero - 44)} ${xAlbero} ${f1(yAlbero - 62)}`} className="sc-tronco" />
        <path d={`M${xAlbero} ${f1(yAlbero - 36)} C${xAlbero - 8} ${f1(yAlbero - 40)} ${xAlbero - 14} ${f1(yAlbero - 40)} ${xAlbero - 22} ${f1(yAlbero - 46)}`} className="sc-ramo" />
        <ellipse cx={xAlbero + 2} cy={f1(yAlbero - 70)} rx={15} ry={13} className="sc-chioma" />
        <ellipse cx={xAlbero - 8} cy={f1(yAlbero - 62)} rx={10} ry={8.5} className="sc-chioma sc-chioma-2" />
        <ellipse cx={xAlbero + 11} cy={f1(yAlbero - 61)} rx={9} ry={7.5} className="sc-chioma sc-chioma-2" />
      </g>

      {el('sentiero', <g>{sassi}</g>)}
      {sottoTitolo
        ? el('surf', <Tavola x={xCas - 29} y={f1(yc(xCas - 29) + 4)} />)
        : el('surf', <TavolaMuretto x={f1(xTavola)} y={f1(yc(xTavola) + 6)} />)}
      {sottoTitolo
        ? el('sasso', <SassoQuota x={xCas + 30} y={f1(yc(xCas + 30) + 6)} />)
        : el('sasso', <SassoQuota x={f1(xTavola + 13)} y={f1(yc(xTavola) + 6 - 11)} />)}
      {el(
        'casetta',
        <Casetta
          x={xCas}
          y={f1(yc(xCas) + 3)}
          chitarra={ha.has('chitarra') ? el('chitarra', <ChitarraAppesa />) : null}
          cartina={el('cartina', <Cartina />)}
        />,
      )}
      {!ha.has('casetta') && el('chitarra', <g transform={`translate(${xAlbero - 4} ${f1(yAlbero - 18)})`}><ChitarraAppesa /></g>)}
      {el('fuochi', <Razzi x={f1(xRazzi)} y={f1(yc(xRazzi) + 6)} />)}
      {el('lanterna', <LanternaAppesa x={xAlbero - 9} y={f1(yAlbero - 39.6)} />)}
      {el('merlo', <Merlo x={xAlbero - 18} y={f1(yAlbero - 44.6)} />)}
      {el('cavallino', <Cavallino x={xCavallo} y={f1(yc(xCavallo) + 22)} />)}

      {ciuffi}

      {el(
        'stagno',
        <g transform={`translate(${f1(xStagno + 146)} ${yStagno})`}>
          <ellipse cx={-146} cy={197} rx={44} ry={9.5} className="sc-stagno-riva" />
          <ellipse cx={-146} cy={196} rx={41} ry={8} fill={`url(#stagno-${id})`} />
          <ellipse cx={-136} cy={194.4} rx={16} ry={1.4} className="sc-stagno-luce" />
          {luna && <ellipse cx={-148} cy={197} rx={5} ry={1.5} className="sc-riflesso-luna" />}
          <ellipse cx={-166} cy={198} rx={6} ry={2} className="sc-ninfea" />
          <path d="M-166 198 L-161 197" className="sc-ninfea-taglio" />
          {/* una rana sulla ninfea */}
          <ellipse cx={-167} cy={196.2} rx={2.6} ry={1.8} className="sc-rana" />
          <circle cx={-168.4} cy={194.6} r={0.9} className="sc-rana" />
          <circle cx={-166} cy={194.6} r={0.9} className="sc-rana" />
          <path d="M-112 196 Q-113 186 -110 180 M-108 196 Q-108 188 -106 183 M-104.6 196.6 Q-105.6 191 -103 187" className="sc-canna" />
          <ellipse cx={-110.2} cy={180.6} rx={1.1} ry={3} className="sc-tifa" />
        </g>,
      )}
      {el('cassetta', <Cassetta x={-72} y={203} locandina={el('locandina', <Locandina />)} />)}
      {onCassetta && ha.has('cassetta') && (
        <g
          className="sc-cassetta-tocco"
          role="button"
          tabIndex={0}
          aria-label="La cassetta della posta: le frasi che vi siete mandati"
          data-testid="cassetta"
          onClick={onCassetta}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCassetta();
            }
          }}
        >
          <rect x={-72 - 24} y={203 - 50} width={48} height={54} rx={10} />
        </g>
      )}

      {figli && (
        <g className="sc-figli" transform={`translate(0 ${PRATO_Y})`}>
          {figli}
        </g>
      )}

      {/* l'aiuola in primo piano */}
      <path d="M-58 222 C-56 210 -46 204 -20 203.4 C6 203 26 206 36 222Z" className="sc-aiuola" />
      <path d="M-49 208 h3 M-31 206 h3 M-6 205.6 h2.4 M14 207 h3 M26 212 h2" className="sc-aiuola-segni" />
      {el('fiore', <Margherita x={-22} y={205} />)}
      {el('semina', <Tulipano x={-6} y={205} />)}
    </svg>
  );
}

function descrizione(elementi: readonly string[], fiori: number) {
  const n = Math.max(0, Math.floor(fiori || 0));
  const quanti = elementi.filter((e) => (ELEMENTI_SCENA as readonly string[]).includes(e)).length;
  if (!quanti) return 'Il giardino, ancora vuoto';
  return `Il giardino: ${quanti} ${quanti === 1 ? 'cosa sbocciata' : 'cose sbocciate'} con ${n} ${n === 1 ? 'fiore' : 'fiori'}`;
}
