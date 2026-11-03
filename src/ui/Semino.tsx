// Semino (e Semina): la mascotte. Tutto SVG inline, colori e movimento in semino.css.
// <Semino stadio={0..4} umore="felice" taglia={96} chi="semino" impulso={n} />
//   - stadio: 0 seme, 1 germoglio, 2 fogliolina, 3 pianta, 4 fiore
//   - umore: vedi SEMINO_UMORI; ogni cambio fa partire una reazione di ~600 ms
//   - impulso: cambialo (es. un contatore) per ripetere la reazione con lo stesso umore
//   - chi: 'semino' (accento verde, fiore a margherita) | 'semina' (accento blu, tulipano, ciglia, fiocco)
//   - accessorio: uno di ACCESSORI (default per personaggio in ACCESSORI_DI); entra con un pop al cambio
//   - onSolletico: la rende toccabile (role=button), tremolio di 250 ms e poi la callback
// <SeminoPianta stadio fiorita colore | quotaBlu chi /> pianta statica per il giardino.
// <SeminoCoppia stadio umore accessorioSemino accessorioSemina onSolletico /> i due vicini.
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import './semino.css';

export const SEMINO_UMORI = [
  'neutro',
  'felice',
  'sorpreso',
  'estasiato',
  'festa',
  'imbarazzato',
  'preoccupato',
  'regalo',
  'saluta',
  'dorme',
  'arrabbiato',
  'euforico',
] as const;
export type SeminoUmore = (typeof SEMINO_UMORI)[number];
export type SeminoStadio = 0 | 1 | 2 | 3 | 4;
export type SeminoChi = 'semino' | 'semina';

const NOMI_UMORE: Record<SeminoUmore, string> = {
  neutro: 'tranquillo',
  felice: 'felice',
  sorpreso: 'a occhi grandi',
  estasiato: 'senza parole',
  festa: 'in festa',
  imbarazzato: 'imbarazzato',
  preoccupato: 'preoccupato',
  regalo: 'con un regalo',
  saluta: 'che saluta',
  dorme: 'che dorme',
  arrabbiato: 'arrabbiato',
  euforico: 'euforico',
};
const NOMI_STADIO = ['seme', 'germoglio', 'fogliolina', 'pianta', 'fiore'] as const;

/** frazione di crescita (0..1) → stadio: il fiore solo a crescita piena */
export function stadioDaCrescita(frazione: number): SeminoStadio {
  const f = Math.max(0, Math.min(1, frazione || 0));
  return (f >= 1 ? 4 : Math.min(3, Math.floor(f * 4))) as SeminoStadio;
}

function limita(s: number): SeminoStadio {
  return Math.max(0, Math.min(4, Math.round(s || 0))) as SeminoStadio;
}

/* ------------------------------------------------------------ geometria */

/** foglia da base a punta, gonfia di w; con nervatura */
function foglia(bx: number, by: number, tx: number, ty: number, w: number, k: string | number) {
  const vx = tx - bx;
  const vy = ty - by;
  const l = Math.hypot(vx, vy) || 1;
  const nx = -vy / l;
  const ny = vx / l;
  const p = (a: number, b: number) => `${(bx + vx * a + nx * b).toFixed(2)} ${(by + vy * a + ny * b).toFixed(2)}`;
  const d = `M${bx} ${by} C${p(0.22, w)} ${p(0.72, w * 0.85)} ${tx} ${ty} C${p(0.78, -w * 0.75)} ${p(0.28, -w * 0.9)} ${bx} ${by}Z`;
  return (
    <g key={k}>
      <path d={d} className="s-foglia" />
      <path d={`M${p(0.08, 0)} Q${p(0.5, w * 0.12)} ${p(0.82, 0)}`} className="s-vena" />
    </g>
  );
}

function stelo(d: string) {
  return (
    <>
      <path d={d} className="s-stelo-bordo" />
      <path d={d} className="s-stelo" />
    </>
  );
}

function stella4(cx: number, cy: number, r: number) {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
}

function stella5(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.48 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** colore dei petali: uno solo, oppure la quota di blu (0..1) di un fiore verde/blu */
type Tinta = string | { quotaBlu: number; id: string };

const VERDE = 'var(--semino-verde)';
const BLU = 'var(--semino-blu)';

/** k petali blu su n, sparsi il più possibile (alternati a metà): deterministico */
function petaliBlu(n: number, q: number) {
  const k = Math.round(Math.max(0, Math.min(1, q)) * n);
  return Array.from({ length: n }, (_, i) => Math.floor(((i + 1) * k) / n) > Math.floor((i * k) / n));
}

/** cuore del fiore a tinta mista: verde e blu in proporzione */
function cuoreMisto(q: number) {
  const p = Math.round(Math.max(0, Math.min(1, q)) * 100);
  return `color-mix(in oklab, ${BLU} ${p}%, ${VERDE})`;
}

/** margherita di Semino: 6 petali tondi attorno a un cuore d'oro (8 se bicolore) */
function margherita(cx: number, cy: number, tinta: Tinta) {
  const mista = typeof tinta !== 'string';
  const n = mista ? 8 : 6;
  const blu = mista ? petaliBlu(n, tinta.quotaBlu) : [];
  return (
    <g className="s-fiore">
      {Array.from({ length: n }, (_, i) => {
        const a = (360 / n) * i;
        const r = (a * Math.PI) / 180;
        const dist = mista ? 5.9 : 5.6;
        const x = cx + Math.sin(r) * dist;
        const y = cy - Math.cos(r) * dist;
        return (
          <ellipse
            key={a}
            cx={x}
            cy={y}
            rx={mista ? 3.1 : 3.7}
            ry={mista ? 5.2 : 5.3}
            transform={`rotate(${a} ${x} ${y})`}
            className="s-petalo"
            style={{ fill: mista ? (blu[i] ? BLU : VERDE) : tinta }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={4.1} className="s-cuore" style={mista ? { fill: cuoreMisto(tinta.quotaBlu) } : undefined} />
      <circle cx={cx - 1.2} cy={cy - 1.3} r={1.1} className="s-luce" />
    </g>
  );
}

/** tulipano di Semina: coppa a tre punte (bicolore: una parte blu per la sua quota, il resto verde) */
function tulipano(cx: number, cy: number, tinta: Tinta) {
  const d = `M${cx} ${cy + 9.5} C${cx - 8} ${cy + 9} ${cx - 9} ${cy - 1} ${cx - 6.5} ${cy - 8.5} C${cx - 4} ${cy - 5} ${cx - 2.4} ${cy - 4.2} ${cx} ${cy - 9} C${cx + 2.4} ${cy - 4.2} ${cx + 4} ${cy - 5} ${cx + 6.5} ${cy - 8.5} C${cx + 9} ${cy - 1} ${cx + 8} ${cy + 9} ${cx} ${cy + 9.5}Z`;
  let fill: string;
  let grad: ReactNode = null;
  if (typeof tinta === 'string') fill = tinta;
  else {
    const q = Math.max(0, Math.min(1, tinta.quotaBlu));
    const id = `tul-${tinta.id}`;
    fill = `url(#${id})`;
    grad = (
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={cx - 9} y1={0} x2={cx + 9} y2={0}>
        <stop offset={q} style={{ stopColor: BLU }} />
        <stop offset={q} style={{ stopColor: VERDE }} />
      </linearGradient>
    );
  }
  return (
    <g className="s-fiore">
      {grad && <defs>{grad}</defs>}
      <path d={d} className="s-petalo" style={{ fill }} />
      <path
        d={`M${cx - 3.6} ${cy - 3} C${cx - 3} ${cy + 3} ${cx - 1.5} ${cy + 6} ${cx} ${cy + 8} M${cx + 3.6} ${cy - 3} C${cx + 3} ${cy + 3} ${cx + 1.5} ${cy + 6} ${cx} ${cy + 8}`}
        className="s-piega"
      />
      <ellipse cx={cx - 3.4} cy={cy - 1.5} rx={1.2} ry={2.6} className="s-luce" opacity={0.55} />
    </g>
  );
}

/** la pianta che esce dalla punta del seme (punta in 53,40; Semina la specchia) */
function Pianta({ stadio, colore, chi }: { stadio: SeminoStadio; colore: Tinta; chi: SeminoChi }) {
  switch (stadio) {
    case 0:
      return <g>{stelo('M53 41 C52 37.5 54.5 34.6 58 35.4')}</g>;
    case 1:
      return (
        <g>
          {stelo('M53 41 C51 35 56 31 55 26.5')}
          {foglia(55, 27, 65.5, 18.5, 4.4, 'a')}
        </g>
      );
    case 2:
      return (
        <g>
          {stelo('M53 41 C51 35 56 30 54 24.5')}
          {foglia(54, 26.5, 35, 22.5, 6, 'a')}
          {foglia(54, 25, 72, 17.5, 6, 'b')}
        </g>
      );
    case 3:
      return (
        <g>
          {stelo('M53 41 C50 32 57 24 53 11.5')}
          {foglia(52.8, 33, 33.5, 29.5, 5.6, 'a')}
          {foglia(54.6, 30, 72.5, 23.5, 5.6, 'b')}
          {foglia(54.4, 20.5, 37.5, 14.5, 5, 'c')}
          {foglia(53.2, 12.5, 61.5, 4.5, 3.6, 'd')}
        </g>
      );
    default:
      return (
        <g>
          {stelo('M53 41 C50 32 57 25 53 16')}
          {foglia(52.8, 33, 33.5, 29.5, 5.6, 'a')}
          {foglia(54.6, 30, 72.5, 23.5, 5.6, 'b')}
          {foglia(54, 25, 39.5, 20.5, 4.2, 'c')}
          {chi === 'semina' ? tulipano(53, 11.5, colore) : margherita(53, 12.5, colore)}
        </g>
      );
  }
}

/* ------------------------------------------------------------ faccia */

const OCCHI_X = [40, 60] as const;
const OCCHI_Y = 71;

function occhiOvali(rx = 3.4, ry = 4.4, dx = 0, dy = 0, luci = 1) {
  return OCCHI_X.map((x) => (
    <g key={x}>
      <ellipse cx={x + dx} cy={OCCHI_Y + dy} rx={rx} ry={ry} className="s-pieno" />
      <circle cx={x + dx + rx * 0.33} cy={OCCHI_Y + dy - ry * 0.36} r={rx * 0.37} className="s-luce" />
      {luci > 1 && <circle cx={x + dx - rx * 0.35} cy={OCCHI_Y + dy + ry * 0.4} r={rx * 0.17} className="s-luce" />}
    </g>
  ));
}

function occhiArchi(su: boolean) {
  return OCCHI_X.map((x) => (
    <path
      key={x}
      d={su ? `M${x - 3.8} 72.6 Q${x} 66.4 ${x + 3.8} 72.6` : `M${x - 3.8} 70.6 Q${x} 75 ${x + 3.8} 70.6`}
      className="s-linea"
    />
  ));
}

/** ciglia di Semina: due trattini verso l'esterno di ciascun occhio */
function ciglia(chiusi: boolean) {
  const y = chiusi ? 71.2 : 68.6;
  return OCCHI_X.map((x, i) => {
    const s = i === 0 ? -1 : 1; // verso l'esterno
    const ox = x + s * (chiusi ? 3.6 : 2.9);
    return (
      <path
        key={x}
        d={`M${ox} ${y} l${s * 2.6} ${-2} M${ox - s * 1.1} ${y - 1.3} l${s * 1.5} ${-2.5}`}
        className="s-ciglia"
      />
    );
  });
}

const BOCCA = {
  sorriso: <path d="M45.5 79 Q50 83 54.5 79" className="s-linea" />,
  aperta: (
    <g>
      <path d="M44 78.2 Q50 79 56 78.2 Q55 85.5 50 85.5 Q45 85.5 44 78.2Z" className="s-pieno" />
      <path d="M46.8 83.4 Q50 81.2 53.2 83.4 Q51.8 85.4 50 85.4 Q48.2 85.4 46.8 83.4Z" className="s-lingua" />
    </g>
  ),
  grande: (
    <g>
      <path d="M42.5 77.4 Q50 79 57.5 77.4 Q56.5 88.2 50 88.2 Q43.5 88.2 42.5 77.4Z" className="s-pieno" />
      <path d="M45.6 85.4 Q50 82 54.4 85.4 Q52.6 88.1 50 88.1 Q47.4 88.1 45.6 85.4Z" className="s-lingua" />
    </g>
  ),
  o: <ellipse cx={50} cy={82} rx={2.6} ry={3.3} className="s-pieno" />,
  piccola: <ellipse cx={50} cy={80.6} rx={1.5} ry={1.1} className="s-pieno" />,
  onda: <path d="M45.6 81.4 q1.1 -1.8 2.2 0 t2.2 0 t2.2 0 t2.2 0" className="s-linea s-sottile" />,
  giu: <path d="M45.2 83 Q50 78.6 54.8 83" className="s-linea" />,
  broncio: <path d="M44.6 83.4 L47.4 81.2 L50 82.6 L52.6 81.2 L55.4 83.4" className="s-linea" />,
};

/** segno di rabbia "a croce" dei fumetti */
function rabbia(x: number, y: number) {
  const r = 4.6;
  return (
    <path
      d={`M${x - 1.2} ${y - r} Q${x - 1.2} ${y - 1.2} ${x - r} ${y - 1.2} M${x + 1.2} ${y - r} Q${x + 1.2} ${y - 1.2} ${x + r} ${y - 1.2} M${x - 1.2} ${y + r} Q${x - 1.2} ${y + 1.2} ${x - r} ${y + 1.2} M${x + 1.2} ${y + r} Q${x + 1.2} ${y + 1.2} ${x + r} ${y + 1.2}`}
      className="s-rabbia-segno"
    />
  );
}

/** sbuffo di fumo */
function nuvoletta(x: number, y: number) {
  return (
    <path
      d={`M${x - 5} ${y + 2} a2.6 2.6 0 0 1 1.4 -4.6 a3.2 3.2 0 0 1 5.6 -1 a2.6 2.6 0 0 1 3.4 3.4 a2.2 2.2 0 0 1 -1 4.2 Z`}
      className="s-nuvola"
    />
  );
}

function goccia(x: number, y: number) {
  return (
    <path
      d={`M${x} ${y} C${x + 2.6} ${y + 3.6} ${x + 3.4} ${y + 5.4} ${x + 3.4} ${y + 6.6} a3.4 3.4 0 0 1 -6.8 0 C${x - 3.4} ${y + 5.4} ${x - 2.6} ${y + 3.6} ${x} ${y}Z`}
      className="s-goccia"
    />
  );
}

function braccio(d: string, cls = '') {
  return (
    <g className={cls}>
      <path d={d} className="s-braccio-bordo" />
      <path d={d} className="s-braccio" />
    </g>
  );
}

function Faccia({ umore, chi }: { umore: SeminoUmore; chi: SeminoChi }) {
  const lei = chi === 'semina';
  let occhi: ReactNode;
  let bocca: ReactNode;
  let extra: ReactNode = null;
  let guance = 's-guance';
  let chiusi = false;

  switch (umore) {
    case 'felice':
      occhi = occhiArchi(true);
      bocca = BOCCA.aperta;
      chiusi = true;
      break;
    case 'sorpreso':
      occhi = occhiOvali(4.3, 5.4, 0, -0.6, 2);
      bocca = BOCCA.o;
      extra = (
        <g>
          <path d="M35.4 61.6 Q40 58.4 44.6 61.2" className="s-linea s-sottile" />
          <path d="M55.4 61.2 Q60 58.4 64.6 61.6" className="s-linea s-sottile" />
        </g>
      );
      break;
    case 'estasiato':
      occhi = OCCHI_X.map((x) => <path key={x} d={stella5(x, OCCHI_Y, 5.8)} className="s-stella" />);
      bocca = BOCCA.grande;
      extra = (
        <g>
          <path d={stella4(13, 52, 5)} className="s-scintilla" style={{ animationDelay: '0ms' }} />
          <path d={stella4(88, 48, 6)} className="s-scintilla" style={{ animationDelay: '120ms' }} />
          <path d={stella4(90, 86, 3.6)} className="s-scintilla" style={{ animationDelay: '240ms' }} />
          <path d={stella4(10, 84, 3.2)} className="s-scintilla" style={{ animationDelay: '180ms' }} />
        </g>
      );
      break;
    case 'festa':
      occhi = occhiArchi(true);
      bocca = BOCCA.grande;
      chiusi = true;
      extra = (
        <g>
          {braccio('M24.5 79 Q16 75 13.5 64', 's-braccio-sx')}
          {braccio('M75.5 79 Q84 75 86.5 64', 's-braccio-dx')}
          {CORIANDOLI.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={3.2}
              height={1.8}
              rx={0.6}
              className="s-coriandolo"
              style={{ fill: c.f, '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--r': `${c.r}deg` } as CSSProperties}
            />
          ))}
        </g>
      );
      break;
    case 'imbarazzato':
      occhi = occhiOvali(2.9, 3.5, -1.6, 1.4);
      bocca = BOCCA.onda;
      guance = 's-guance s-guance-forti';
      extra = (
        <g>
          <path d="M28.4 78.6 l2 -2.4 M31.6 79.2 l2 -2.4 M34.8 79.8 l2 -2.4" className="s-tratteggio" />
          <path d="M63.2 79.8 l2 -2.4 M66.4 79.2 l2 -2.4 M69.6 78.6 l2 -2.4" className="s-tratteggio" />
          <g className="s-sudore">{lei ? goccia(27, 53) : goccia(74, 52)}</g>
        </g>
      );
      break;
    case 'preoccupato':
      occhi = occhiOvali(3.1, 4.1, 0, 1);
      bocca = BOCCA.giu;
      extra = (
        <g>
          <path d="M34.6 64.4 L44.2 61.2" className="s-linea s-sottile" />
          <path d="M55.8 61.2 L65.4 64.4" className="s-linea s-sottile" />
          <g className="s-sudore">{lei ? goccia(84, 59) : goccia(73, 52)}</g>
          <g className="s-sudore" style={{ animationDelay: '200ms' }}>
            {goccia(26, 58)}
          </g>
        </g>
      );
      break;
    case 'regalo':
      occhi = occhiOvali(3.4, 4.4, 0, -0.4, 2);
      bocca = BOCCA.sorriso;
      extra = (
        <g className="s-pacco">
          <g className="s-pacco-scatola">
            <rect x={39.5} y={85} width={21} height={13} rx={2.4} className="s-oro" />
            <rect x={38} y={82.6} width={24} height={5.2} rx={1.8} className="s-oro" />
            <rect x={48.2} y={82.6} width={3.6} height={15.4} className="s-nastro" />
            <path d="M50 82.6 C46 77.4 41.6 79.4 44 82.6Z M50 82.6 C54 77.4 58.4 79.4 56 82.6Z" className="s-nastro" />
          </g>
          {braccio('M25 80 Q31 88 39.4 89.4')}
          {braccio('M75 80 Q69 88 60.6 89.4')}
          <path d={stella4(70, 84, 3.4)} className="s-scintilla" style={{ animationDelay: '250ms' }} />
        </g>
      );
      break;
    case 'saluta':
      occhi = occhiOvali(3.4, 4.4, 0, 0);
      bocca = BOCCA.aperta;
      extra = braccio('M75.5 79 Q84 75 86.5 64', 's-mano');
      break;
    case 'dorme':
      occhi = occhiArchi(false);
      bocca = BOCCA.piccola;
      chiusi = true;
      extra = (
        <g className="s-zzz">
          <text x={70} y={50} className="s-z" style={{ animationDelay: '0s' }}>
            z
          </text>
          <text x={76} y={41} className="s-z s-z2" style={{ animationDelay: '0.8s' }}>
            z
          </text>
          <text x={82} y={31} className="s-z s-z3" style={{ animationDelay: '1.6s' }}>
            Z
          </text>
        </g>
      );
      break;
    case 'arrabbiato':
      occhi = occhiOvali(3, 3.6, 0, 1.4);
      bocca = BOCCA.broncio;
      guance = 's-guance s-guance-rabbia';
      extra = (
        <g>
          <path d="M34.6 62 L45 66" className="s-linea" />
          <path d="M55 66 L65.4 62" className="s-linea" />
          {/* segno di rabbia, dalla parte libera dal fiocco */}
          <g className="s-rabbia">{rabbia(lei ? 29 : 71, 53)}</g>
          <g className="s-fumo">{nuvoletta(17, 50)}</g>
          <g className="s-fumo" style={{ animationDelay: '150ms' }}>
            {nuvoletta(lei ? 86 : 84, lei ? 64 : 46)}
          </g>
        </g>
      );
      break;
    case 'euforico':
      occhi = OCCHI_X.map((x) => <path key={x} d={stella5(x, OCCHI_Y, 4.3)} className="s-stella" />);
      bocca = BOCCA.grande;
      guance = 's-guance s-guance-forti';
      extra = (
        <g>
          <path d={stella4(15, 58, 4)} className="s-scintilla" style={{ animationDelay: '0ms' }} />
          <path d={stella4(86, 62, 4.4)} className="s-scintilla" style={{ animationDelay: '300ms' }} />
          <path d={stella4(22, 40, 2.8)} className="s-scintilla" style={{ animationDelay: '450ms' }} />
        </g>
      );
      break;
    default:
      occhi = occhiOvali();
      bocca = BOCCA.sorriso;
  }

  return (
    <>
      <ellipse cx={31.5} cy={79.2} rx={4.4} ry={2.6} className={guance} />
      <ellipse cx={68.5} cy={79.2} rx={4.4} ry={2.6} className={guance} />
      <g className="semino-occhi">
        {occhi}
        {lei && ciglia(chiusi)}
      </g>
      {bocca}
      {extra}
    </>
  );
}

const CORIANDOLI = [
  { x: 30, y: 40, dx: -14, dy: -22, r: -160, f: 'var(--semino-verde)' },
  { x: 40, y: 34, dx: -6, dy: -30, r: 220, f: 'var(--semino-oro)' },
  { x: 60, y: 34, dx: 8, dy: -30, r: -200, f: 'var(--semino-blu)' },
  { x: 70, y: 40, dx: 16, dy: -22, r: 180, f: 'var(--semino-verde)' },
  { x: 24, y: 56, dx: -20, dy: -8, r: 140, f: 'var(--semino-blu)' },
  { x: 76, y: 56, dx: 20, dy: -10, r: -140, f: 'var(--semino-oro)' },
];

/* ------------------------------------------------------------ corpo */

const CORPO = {
  semino: 'M53 40 C61 46 79 55 79.5 72 C80 87 67 95.5 49 95.5 C32 95.5 20.5 87 20.5 72.5 C20.5 57 41 49 53 40Z',
  // più tonda, punta morbida e piegata dall'altra parte
  semina: 'M47 43 C41 44 19 55 19.5 74 C20 88 34 95.5 50 95.5 C66 95.5 80.5 88 80.5 74 C80.5 57 58 43 47 43Z',
} as const;

const CUCITURA = {
  semino: 'M55.5 44.5 C66 51 73 59 74.5 70',
  semina: 'M44 46.5 C35 51.5 28.5 58 27 67',
} as const;

function Fiocco() {
  // fiocco-foglia di Semina, sul lato della testa
  return (
    <g className="s-fiocco">
      <path d="M68 55 C70 47 77 45 79.5 48.5 C80 53 74 56 68 55Z" className="s-accento" />
      <path d="M68 55 C63 50 62.5 44 66.5 43 C70.5 44 70.5 50.5 68 55Z" className="s-accento" />
      <circle cx={68} cy={55} r={2.1} className="s-oro" />
    </g>
  );
}

/* ------------------------------------------------------------ accessori */

export const ACCESSORI = ['occhiali', 'cuoco', 'palla', 'chitarra', 'corona', 'montagna', 'cavallo', 'animale'] as const;
export type Accessorio = (typeof ACCESSORI)[number];
/** gli stili di default di ciascuno (ma chiunque può indossare tutto) */
export const ACCESSORI_DI: Record<SeminoChi, Accessorio[]> = {
  semino: ['occhiali', 'cuoco', 'palla', 'chitarra'],
  semina: ['corona', 'montagna', 'cavallo', 'animale'],
};
const NOMI_ACCESSORIO: Record<Accessorio, string> = {
  occhiali: 'con gli occhiali',
  cuoco: 'col cappello da cuoco',
  palla: 'con la palla da pallanuoto',
  chitarra: 'con la chitarra',
  corona: 'con la corona di fiori',
  montagna: 'vestito da montagna',
  cavallo: 'col caschetto e il cavallino',
  animale: 'con un uccellino',
};

/** dove si appoggia un cappello: sulla punta della testa (Semina è più larga e più bassa) */
const TESTA: Record<SeminoChi, { x: number; y: number; k: number }> = {
  semino: { x: 53, y: 50.5, k: 1 },
  semina: { x: 48, y: 49.5, k: 1.1 },
};
/** di quanto si alza la pianta per uscire dal cappello */
const ALZATA: Partial<Record<Accessorio, number>> = { cuoco: 11, montagna: 9, cavallo: 9 };

/** braccino corto che spunta dal fianco e tiene qualcosa */
function manina(d: string) {
  return braccio(d, 's-manina');
}

function CappelloCuoco() {
  return (
    <g>
      <path
        d="M-12 -6 C-19 -6.5 -19.5 -17.5 -11.5 -17 C-11 -24 -3 -25.5 0 -20.5 C3 -25.5 11 -24 11.5 -17 C19.5 -17.5 19 -6.5 12 -6Z"
        className="s-bianco"
      />
      <path d="M-6.5 -8 Q-7.5 -13 -5.5 -17 M6.5 -8 Q7.5 -13 5.5 -17" className="s-piega-cappello" />
      <rect x={-13} y={-7.5} width={26} height={8} rx={2} className="s-bianco" />
      <path d="M-8 -6 v5 M-3 -6 v5 M2 -6 v5 M7 -6 v5" className="s-piega-cappello" />
    </g>
  );
}

function CappelloMontagna() {
  return (
    <g>
      <ellipse cx={0} cy={-1.6} rx={17} ry={3.8} className="s-feltro" />
      <path d="M-10.5 -3 L-8.3 -14.6 Q0 -18.4 8.3 -14.6 L10.5 -3 Q0 -0.6 -10.5 -3Z" className="s-feltro" />
      <path d="M-4 -15.6 Q0 -13 4 -15.6" className="s-piega-cappello s-scura" />
      <path d="M-10.2 -6.2 Q0 -4 10.2 -6.2 L10.6 -3.4 Q0 -1.2 -10.6 -3.4Z" className="s-cordino" />
      {/* piuma */}
      <path d="M8 -5.5 C12 -9 15 -16 19.5 -19.5 C19 -13 15 -8 8 -5.5Z" className="s-piuma" />
      <path d="M8.6 -5.8 C12.5 -9.5 15.6 -14.6 18.8 -18.4" className="s-piega-cappello s-scura" />
    </g>
  );
}

function Caschetto() {
  return (
    <g>
      <path d="M-15.5 -1 C-16 -12 -9 -17.6 0 -17.6 C9 -17.6 16 -12 15.5 -1 Q0 1.6 -15.5 -1Z" className="s-velluto" />
      <path d="M-10 -12 C-6.5 -15.2 -2 -16 2 -15.8" className="s-riflesso-casco" />
      <path d="M-13.5 -1.6 Q0 6.4 13.5 -1.6 Q0 2 -13.5 -1.6Z" className="s-visiera" />
    </g>
  );
}

function Corona({ chi }: { chi: SeminoChi }) {
  const semina = chi === 'semina';
  const cx = semina ? 48.5 : 51.5;
  const hw = semina ? 20 : 16.5;
  const cy = semina ? 53.5 : 54.5;
  const sag = 3.6;
  const punto = (u: number) => [cx + u * hw, cy + (1 - u * u) * sag] as const;
  const colori = ['#ff9ec7', '#fff3dc', 'var(--semino-blu)', '#ffd75e', '#ff9ec7', '#fff3dc'];
  const fiori = [-1, -0.62, -0.22, 0.2, 0.6, 0.98];
  const [x0, y0] = punto(-1.08);
  const [x1, y1] = punto(1.08);
  const ramo = `M${x0} ${y0} Q${cx} ${cy + sag * 2} ${x1} ${y1}`;
  const dietro = `M${x0} ${y0} Q${cx} ${cy - sag * 2.4} ${x1} ${y1}`;
  return (
    <g>
      <path d={dietro} className="s-ramo-dietro" />
      <path d={ramo} className="s-stelo-bordo s-ramo-bordo" />
      <path d={ramo} className="s-stelo s-ramo" />
      {fiori.map((u, i) => {
        const [x, y] = punto(u);
        return (
          <g key={i}>
            {i < fiori.length - 1 && foglia(x + 1.5, y + 0.8, x + hw * 0.22, y + 3.6 - (u < 0 ? 0 : 2.4), 1.7, 'f' + i)}
            {[0, 72, 144, 216, 288].map((a) => {
              const r = (a * Math.PI) / 180;
              return (
                <circle
                  key={a}
                  cx={x + Math.sin(r) * 2.7}
                  cy={y - Math.cos(r) * 2.7}
                  r={2.3}
                  className="s-petalo-corona"
                  style={{ fill: colori[i] }}
                />
              );
            })}
            <circle cx={x} cy={y} r={1.5} className="s-cuore s-cuore-piccolo" />
          </g>
        );
      })}
    </g>
  );
}

/** palla da pallanuoto: gialla con i solchi blu */
function Palla() {
  const cx = 14;
  const cy = 83.5;
  return (
    <g>
      {manina('M27 77.6 Q23 77 20.6 79.4')}
      <circle cx={cx} cy={cy} r={9.6} className="s-palla" />
      <path
        d={`M${cx - 9.4} ${cy - 2} Q${cx} ${cy + 3.6} ${cx + 9.4} ${cy - 2} M${cx - 3.6} ${cy - 8.9} Q${cx + 3.6} ${cy - 1} ${cx - 1} ${cy + 9.5} M${cx + 4.6} ${cy - 8.4} Q${cx + 9.6} ${cy - 3} ${cx + 8.4} ${cy + 4.6}`}
        className="s-palla-solco"
      />
      <ellipse cx={cx - 4} cy={cy - 4.6} rx={2.4} ry={1.5} transform={`rotate(-30 ${cx - 4} ${cy - 4.6})`} className="s-luce" opacity={0.7} />
      <circle cx={cx} cy={cy} r={9.6} className="s-palla-bordo" />
    </g>
  );
}

function Chitarra() {
  return (
    <g>
      <g transform="translate(18 84.5) rotate(-38) scale(0.95)">
        <rect x={-1.9} y={-34} width={3.8} height={22} rx={0.8} className="s-manico" />
        <rect x={-3.1} y={-40} width={6.2} height={7.4} rx={1.8} className="s-manico" />
        <circle cx={-3.6} cy={-37.8} r={1} className="s-pieno" />
        <circle cx={3.6} cy={-37.8} r={1} className="s-pieno" />
        <circle cx={-3.6} cy={-35} r={1} className="s-pieno" />
        <circle cx={3.6} cy={-35} r={1} className="s-pieno" />
        <path
          d="M0 8.5 C-10 8.5 -10.6 -1.4 -6.2 -4.4 C-8.4 -8 -7.2 -16 0 -16 C7.2 -16 8.4 -8 6.2 -4.4 C10.6 -1.4 10 8.5 0 8.5Z"
          className="s-cassa"
        />
        <circle cx={0} cy={-4.6} r={2.6} className="s-pieno" />
        <rect x={-3.6} y={2} width={7.2} height={2} rx={0.8} className="s-pieno" />
        <path d="M-0.9 3 V-33 M0.9 3 V-33" className="s-corde" />
      </g>
      {manina('M27.4 79 Q24.4 81.6 21.4 81.8')}
    </g>
  );
}

/** zaino: dietro il corpo, ne spunta un fianco a sinistra */
function ZainoRetro() {
  return (
    <g>
      <rect x={8} y={60} width={24} height={33} rx={6} className="s-zaino" />
      <path d="M8.5 71 Q20 65 31.5 71 L31.5 63 Q20 57 8.5 63Z" className="s-zaino-scuro" />
      <rect x={9.6} y={79} width={8.4} height={9.4} rx={2.4} className="s-zaino-scuro" />
      {/* materassino arrotolato sopra lo zaino */}
      <rect x={5.6} y={53.4} width={27} height={7.6} rx={3.8} className="s-materassino" />
      <path d="M12 53.6 v7.4 M26 53.6 v7.4" className="s-cinghia" />
    </g>
  );
}
/** uno spallaccio solo, dal lato dello zaino, con la fibbia */
function Spallaccio({ chi }: { chi: SeminoChi }) {
  const lei = chi === 'semina';
  const d = lei ? 'M35.6 49.4 Q27.4 57.4 23.4 70' : 'M42.4 48.2 Q31.6 56.6 25.6 69.4';
  const [fx, fy, r] = lei ? [28.6, 57.4, -52] : [32.6, 55.6, -44];
  return (
    <g>
      <path d={d} className="s-spallaccio-bordo" />
      <path d={d} className="s-spallaccio" />
      <rect x={fx - 2.6} y={fy - 1.9} width={5.2} height={3.8} rx={0.8} transform={`rotate(${r} ${fx} ${fy})`} className="s-fibbia" />
    </g>
  );
}

function Cavallino() {
  return (
    <g>
      <g transform="translate(14.4 74.6) scale(1.22)">
        {/* testa di profilo verso sinistra */}
        <path
          d="M7.6 13 C10.4 3 10 -6 4.4 -10.4 C0 -13 -6 -10 -9.4 -3.6 C-12.6 1.6 -11.6 5.6 -8.2 6.4 C-5.4 7 -2.4 5.4 -0.6 4.2 C0.6 7.4 0.2 10.4 -0.6 13Z"
          className="s-peluche"
        />
        <path d="M2.2 -9.4 L3.2 -16.6 L6.8 -10Z" className="s-peluche" />
        <path d="M3.6 -10.8 C10.6 -10.6 13.2 -1 10.8 8 C12 3.4 11.6 -2 9.2 -2.6 C10.4 -6 8.4 -9.6 3.6 -10.8Z" className="s-criniera" />
        <ellipse cx={-8.4} cy={3.2} rx={3.4} ry={2.8} className="s-muso" />
        <circle cx={-9.6} cy={2.6} r={0.8} className="s-pieno" />
        <circle cx={-2.2} cy={-4.4} r={1.5} className="s-pieno" />
        <circle cx={-1.8} cy={-4.9} r={0.5} className="s-luce" />
      </g>
      {manina('M27.2 82 Q24 84.2 21.4 84')}
    </g>
  );
}

/** uccellino appollaiato sul germoglio: si sposta dove c'è un rametto, secondo lo stadio */
const POSATOIO: Record<SeminoStadio, [number, number]> = {
  0: [58.4, 35.6],
  1: [60, 19.8],
  2: [64.2, 17.4],
  3: [65.4, 22.8],
  4: [68.4, 21.6],
};
function Uccellino({ stadio }: { stadio: SeminoStadio }) {
  const [x, y] = POSATOIO[stadio];
  return (
    <g transform={`translate(${x} ${y}) scale(1.15)`}>
      <path d="M-1.4 -0.6 v1.4 M1.4 -0.6 v1.4" className="s-zampette" />
      <path d="M5 -6 L11.4 -9.6 L10.4 -4 Z" className="s-uccello" />
      <path d="M-6.8 -6.6 C-6.8 -12.6 -2.4 -14.6 0.4 -14.6 C4.4 -14.6 7.4 -11 7.4 -6.4 C7.4 -2.4 4 0 0 0 C-4 0 -6.8 -2.6 -6.8 -6.6Z" className="s-uccello" />
      <path d="M-5 -4.4 C-3.6 -1.4 2 -0.8 4 -3.4 C2.6 -5.2 -2.6 -6 -5 -4.4Z" className="s-pancino" />
      <path d="M0.6 -7.4 C3 -8.6 6 -7.6 6.4 -4.6 C4 -3.6 1.4 -4.6 0.6 -7.4Z" className="s-ala" />
      <path d="M-6.6 -9.4 L-10 -8.2 L-6.6 -7Z" className="s-becco" />
      <circle cx={-3.4} cy={-9.8} r={1.15} className="s-pieno" />
    </g>
  );
}

/** pezzi dell'accessorio, per strato: dietro il corpo, sulla testa, davanti alla faccia */
function AccessorioDietro({ a }: { a: Accessorio }) {
  return a === 'montagna' ? <ZainoRetro /> : null;
}
function AccessorioTesta({ a, chi }: { a: Accessorio; chi: SeminoChi }) {
  const t = TESTA[chi];
  const sopra = `translate(${t.x} ${t.y}) scale(${t.k})`;
  switch (a) {
    case 'cuoco':
      return (
        <g transform={sopra}>
          <CappelloCuoco />
        </g>
      );
    case 'montagna':
      return (
        <g transform={sopra}>
          <CappelloMontagna />
        </g>
      );
    case 'cavallo':
      return (
        <g transform={sopra}>
          <Caschetto />
        </g>
      );
    case 'corona':
      return <Corona chi={chi} />;
    default:
      return null;
  }
}
function AccessorioDavanti({ a, chi, stadio }: { a: Accessorio; chi: SeminoChi; stadio: SeminoStadio }) {
  switch (a) {
    case 'occhiali':
      return (
        <g>
          <path d="M33.6 70 L22.6 67.4 M66.4 70 L77.4 67.4" className="s-astina" />
          <circle cx={40} cy={71} r={6.8} className="s-lente" />
          <circle cx={60} cy={71} r={6.8} className="s-lente" />
          <path d="M46.6 70 Q50 67.2 53.4 70" className="s-astina" />
          <rect x={48} y={66.6} width={4} height={3.6} rx={0.6} transform="rotate(8 50 68.4)" className="s-nastro" />
          <path d="M35.4 67.2 Q37 65.6 39 65.4 M55.4 67.2 Q57 65.6 59 65.4" className="s-riflesso-lente" />
        </g>
      );
    case 'palla':
      return <Palla />;
    case 'chitarra':
      return <Chitarra />;
    case 'montagna':
      return <Spallaccio chi={chi} />;
    case 'cavallo':
      return <Cavallino />;
    case 'animale':
      return (
        <g transform={chi === 'semina' ? 'translate(100 0) scale(-1 1)' : undefined}>
          <Uccellino stadio={stadio} />
        </g>
      );
    default:
      return null;
  }
}

/** tocco senza doppioni (touch + click): solo pointerdown primario, e non due volte di fila */
function useSolletico(onSolletico: (() => void) | undefined, bersaglio: RefObject<SVGGElement | null>) {
  const ultimo = useRef(0);
  return (e: PointerEvent | KeyboardEvent) => {
    if (!onSolletico) return;
    if ('pointerType' in e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    } else {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.repeat) return;
      e.preventDefault();
    }
    const ora = performance.now();
    if (ora - ultimo.current < 120) return;
    ultimo.current = ora;
    const g = bersaglio.current;
    const calma = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (g && !calma && typeof g.animate === 'function') {
      g.animate(
        [
          { transform: 'none' },
          { transform: 'rotate(-6deg) scale(1.06, 0.94)' },
          { transform: 'rotate(5deg) scale(0.97, 1.04)' },
          { transform: 'rotate(-3deg)' },
          { transform: 'rotate(1.5deg)' },
          { transform: 'none' },
        ],
        { duration: 250, easing: 'ease-out' },
      );
    }
    onSolletico();
  };
}

interface Props {
  stadio?: number;
  umore?: SeminoUmore;
  accessorio?: Accessorio;
  /** rende la mascotte toccabile: tremolio di 250 ms e poi la callback */
  onSolletico?: () => void;
  /** lato in px (default 96) */
  taglia?: number;
  chi?: SeminoChi;
  /** cambialo per ripetere la reazione anche con lo stesso umore */
  impulso?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Semino({
  stadio = 0,
  umore = 'neutro',
  taglia = 96,
  chi = 'semino',
  accessorio,
  onSolletico,
  impulso,
  className,
  style,
}: Props) {
  const s = limita(stadio);
  const id = useId().replace(/:/g, '');
  const reazione = useRef<SVGGElement>(null);
  const tremolio = useRef<SVGGElement>(null);
  const tocca = useSolletico(onSolletico, tremolio);
  const lei = chi === 'semina';
  const accento = lei ? 'var(--semino-blu)' : 'var(--semino-verde)';
  const alzata = accessorio ? (ALZATA[accessorio] ?? 0) : 0;

  // stesso umore ma nuovo impulso: riavvia solo le animazioni di reazione
  useEffect(() => {
    const g = reazione.current;
    if (!g || impulso === undefined || typeof g.getAnimations !== 'function') return;
    for (const a of g.getAnimations({ subtree: true })) {
      const nome = (a as Animation & { animationName?: string }).animationName ?? '';
      if (nome.startsWith('semino-r-')) {
        a.cancel();
        a.play();
      }
    }
  }, [impulso]);

  const nome = lei ? 'Semina' : 'Semino';
  const descrizione = `${nome}, ${NOMI_STADIO[s]}, ${NOMI_UMORE[umore] ?? umore}${accessorio ? `, ${NOMI_ACCESSORIO[accessorio]}` : ''}`;
  const toccabile = !!onSolletico;
  return (
    <svg
      className={`semino semino-${chi} semino-u-${umore}${toccabile ? ' semino-toccabile' : ''}${className ? ` ${className}` : ''}`}
      width={taglia}
      height={taglia}
      viewBox="0 0 100 100"
      role={toccabile ? 'button' : 'img'}
      tabIndex={toccabile ? 0 : undefined}
      aria-label={toccabile ? `fai il solletico a ${nome}` : descrizione}
      onPointerDown={toccabile ? tocca : undefined}
      onKeyDown={toccabile ? tocca : undefined}
      style={style}
    >
      {toccabile && <title>{descrizione}</title>}
      <defs>
        <clipPath id={`corpo-${id}`}>
          <path d={CORPO[chi]} />
        </clipPath>
      </defs>
      <ellipse cx={50} cy={96.5} rx={24} ry={2.6} className="s-terra" />
      <g className="semino-idle">
        <g ref={tremolio} className="semino-tremolio">
          <g ref={reazione} className={`semino-reazione semino-r-${umore}`}>
            <g transform={lei ? 'translate(100 0) scale(-1 1)' : undefined}>
              <g
                className="semino-alzata"
                style={{ transform: alzata ? `translateY(${-alzata}px) scale(0.9)` : 'none' }}
              >
                <g key={s} className="semino-crescita">
                  <Pianta stadio={s} colore={accento} chi={chi} />
                </g>
              </g>
            </g>
            {accessorio && (
              <g key={`d-${accessorio}`} className="s-accessorio">
                <AccessorioDietro a={accessorio} />
              </g>
            )}
            <path d={CORPO[chi]} className="s-corpo" />
            <g clipPath={`url(#corpo-${id})`}>
              <ellipse cx={62} cy={92} rx={34} ry={15} className="s-ombra" />
              <ellipse cx={33} cy={60} rx={4} ry={7.5} transform="rotate(30 33 60)" className="s-riflesso" />
            </g>
            <path d={CUCITURA[chi]} className="s-cucitura" />
            <path d={CORPO[chi]} className="s-contorno" />
            {accessorio && (
              <g key={`t-${accessorio}`} className="s-accessorio s-accessorio-testa">
                <AccessorioTesta a={accessorio} chi={chi} />
              </g>
            )}
            {lei && <Fiocco />}
            <g key={umore} className="semino-faccia">
              <Faccia umore={umore} chi={chi} />
            </g>
            {accessorio && (
              <g key={`f-${accessorio}`} className="s-accessorio">
                <AccessorioDavanti a={accessorio} chi={chi} stadio={s} />
              </g>
            )}
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------ giardino */

interface PiantaProps {
  stadio?: number;
  fiorita?: boolean;
  /** colore dei petali (default: verde di Semino, blu di Semina); ignorato se c'è quotaBlu */
  colore?: string;
  /** fiore di coppia: frazione dei petali blu (0 tutto verde, 1 tutto blu); il cuore prende la tinta mista */
  quotaBlu?: number;
  chi?: SeminoChi;
  taglia?: number;
  className?: string;
}

/** piantina statica per il giardino: zolla, seme sepolto, pianta; fiorita = fiore (margherita, o tulipano se chi='semina') */
export function SeminoPianta({
  stadio = 1,
  fiorita = false,
  colore,
  quotaBlu,
  chi = 'semino',
  taglia = 64,
  className,
}: PiantaProps) {
  const s: SeminoStadio = fiorita ? 4 : limita(Math.min(stadio, 3));
  const lei = chi === 'semina';
  const id = useId().replace(/:/g, '');
  const c: Tinta =
    quotaBlu !== undefined && Number.isFinite(quotaBlu)
      ? { quotaBlu, id }
      : (colore ?? (lei ? 'var(--semino-blu)' : 'var(--semino-verde)'));
  const etichetta = fiorita
    ? quotaBlu === undefined
      ? 'pianta fiorita'
      : `pianta fiorita, ${Math.round(Math.max(0, Math.min(1, quotaBlu)) * 100)}% blu`
    : NOMI_STADIO[s];
  return (
    <svg
      className={`semino semino-pianta${fiorita ? ' fiorita' : ''}${className ? ` ${className}` : ''}`}
      width={taglia}
      height={taglia}
      viewBox="20 -2 66 66"
      role="img"
      aria-label={etichetta}
    >
      <g transform={lei ? 'translate(106 0) scale(-1 1)' : undefined}>
        <Pianta stadio={s} colore={c} chi={chi} />
        <ellipse cx={53} cy={44} rx={6.2} ry={4.6} className="s-corpo s-contorno-pieno" />
      </g>
      <path d="M26 62 C28 49 40 44.5 53 44.5 C66 44.5 78 49 80 62Z" className="s-zolla" />
      <path d="M36 52 h4 M60 50.5 h3 M47 57 h3.5" className="s-zolla-segni" />
    </svg>
  );
}

/** Semino e Semina vicini, inclinati l'uno verso l'altra */
export function SeminoCoppia({
  stadio = 0,
  umore = 'neutro',
  umoreSemina,
  accessorioSemino,
  accessorioSemina,
  onSolletico,
  taglia = 96,
  impulso,
  className,
}: {
  stadio?: number;
  umore?: SeminoUmore;
  /** se diverso da quello di Semino */
  umoreSemina?: SeminoUmore;
  accessorioSemino?: Accessorio;
  accessorioSemina?: Accessorio;
  /** rende toccabili tutti e due: riceve chi è stato toccato */
  onSolletico?: (chi: SeminoChi) => void;
  taglia?: number;
  impulso?: number | string;
  className?: string;
}) {
  return (
    <span className={`semino-coppia${className ? ` ${className}` : ''}`} style={{ '--taglia': `${taglia}px` } as CSSProperties}>
      <Semino
        chi="semino"
        stadio={stadio}
        umore={umore}
        accessorio={accessorioSemino}
        onSolletico={onSolletico ? () => onSolletico('semino') : undefined}
        taglia={taglia}
        impulso={impulso}
        className="semino-coppia-lui"
      />
      <Semino
        chi="semina"
        stadio={stadio}
        umore={umoreSemina ?? umore}
        accessorio={accessorioSemina}
        onSolletico={onSolletico ? () => onSolletico('semina') : undefined}
        taglia={taglia}
        impulso={impulso}
        className="semino-coppia-lei"
      />
    </span>
  );
}
