// Semino (e Semina): la mascotte. Tutto SVG inline, colori e movimento in semino.css.
// <Semino stadio={0..4} umore="felice" taglia={96} chi="semino" impulso={n} />
//   - stadio: 0 seme, 1 germoglio, 2 fogliolina, 3 pianta, 4 fiore
//   - umore: vedi SEMINO_UMORI; ogni cambio fa partire una reazione di ~600 ms
//   - impulso: cambialo (es. un contatore) per ripetere la reazione con lo stesso umore
//   - chi: 'semino' (accento verde, fiore a margherita) | 'semina' (accento blu, tulipano, ciglia, fiocco)
// <SeminoPianta stadio fiorita colore /> pianta statica per il giardino.
// <SeminoCoppia stadio umore /> i due vicini, inclinati l'uno verso l'altra.
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
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

/** margherita di Semino: 6 petali tondi attorno a un cuore d'oro */
function margherita(cx: number, cy: number, colore: string) {
  return (
    <g className="s-fiore">
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        const x = cx + Math.sin(r) * 5.6;
        const y = cy - Math.cos(r) * 5.6;
        return (
          <ellipse
            key={a}
            cx={x}
            cy={y}
            rx={3.7}
            ry={5.3}
            transform={`rotate(${a} ${x} ${y})`}
            className="s-petalo"
            style={{ fill: colore }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={4.1} className="s-cuore" />
      <circle cx={cx - 1.2} cy={cy - 1.3} r={1.1} className="s-luce" />
    </g>
  );
}

/** tulipano di Semina: coppa a tre punte */
function tulipano(cx: number, cy: number, colore: string) {
  const d = `M${cx} ${cy + 9.5} C${cx - 8} ${cy + 9} ${cx - 9} ${cy - 1} ${cx - 6.5} ${cy - 8.5} C${cx - 4} ${cy - 5} ${cx - 2.4} ${cy - 4.2} ${cx} ${cy - 9} C${cx + 2.4} ${cy - 4.2} ${cx + 4} ${cy - 5} ${cx + 6.5} ${cy - 8.5} C${cx + 9} ${cy - 1} ${cx + 8} ${cy + 9} ${cx} ${cy + 9.5}Z`;
  return (
    <g className="s-fiore">
      <path d={d} className="s-petalo" style={{ fill: colore }} />
      <path
        d={`M${cx - 3.6} ${cy - 3} C${cx - 3} ${cy + 3} ${cx - 1.5} ${cy + 6} ${cx} ${cy + 8} M${cx + 3.6} ${cy - 3} C${cx + 3} ${cy + 3} ${cx + 1.5} ${cy + 6} ${cx} ${cy + 8}`}
        className="s-piega"
      />
      <ellipse cx={cx - 3.4} cy={cy - 1.5} rx={1.2} ry={2.6} className="s-luce" opacity={0.55} />
    </g>
  );
}

/** la pianta che esce dalla punta del seme (punta in 53,40; Semina la specchia) */
function Pianta({ stadio, colore, chi }: { stadio: SeminoStadio; colore: string; chi: SeminoChi }) {
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
};

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

interface Props {
  stadio?: number;
  umore?: SeminoUmore;
  /** lato in px (default 96) */
  taglia?: number;
  chi?: SeminoChi;
  /** cambialo per ripetere la reazione anche con lo stesso umore */
  impulso?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Semino({ stadio = 0, umore = 'neutro', taglia = 96, chi = 'semino', impulso, className, style }: Props) {
  const s = limita(stadio);
  const id = useId().replace(/:/g, '');
  const reazione = useRef<SVGGElement>(null);
  const lei = chi === 'semina';
  const accento = lei ? 'var(--semino-blu)' : 'var(--semino-verde)';

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
  return (
    <svg
      className={`semino semino-${chi} semino-u-${umore}${className ? ` ${className}` : ''}`}
      width={taglia}
      height={taglia}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${nome}, ${NOMI_STADIO[s]}, ${NOMI_UMORE[umore] ?? umore}`}
      style={style}
    >
      <defs>
        <clipPath id={`corpo-${id}`}>
          <path d={CORPO[chi]} />
        </clipPath>
      </defs>
      <ellipse cx={50} cy={96.5} rx={24} ry={2.6} className="s-terra" />
      <g className="semino-idle">
        <g ref={reazione} className={`semino-reazione semino-r-${umore}`}>
          <g transform={lei ? 'translate(100 0) scale(-1 1)' : undefined}>
            <g key={s} className="semino-crescita">
              <Pianta stadio={s} colore={accento} chi={chi} />
            </g>
          </g>
          <path d={CORPO[chi]} className="s-corpo" />
          <g clipPath={`url(#corpo-${id})`}>
            <ellipse cx={62} cy={92} rx={34} ry={15} className="s-ombra" />
            <ellipse cx={33} cy={60} rx={4} ry={7.5} transform="rotate(30 33 60)" className="s-riflesso" />
          </g>
          <path d={CUCITURA[chi]} className="s-cucitura" />
          <path d={CORPO[chi]} className="s-contorno" />
          {lei && <Fiocco />}
          <g key={umore} className="semino-faccia">
            <Faccia umore={umore} chi={chi} />
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
  /** colore dei petali (default: verde di Semino) */
  colore?: string;
  chi?: SeminoChi;
  taglia?: number;
  className?: string;
}

/** piantina statica per il giardino: zolla, seme sepolto, pianta; fiorita = fiore */
export function SeminoPianta({ stadio = 1, fiorita = false, colore, chi = 'semino', taglia = 64, className }: PiantaProps) {
  const s: SeminoStadio = fiorita ? 4 : limita(Math.min(stadio, 3));
  const lei = chi === 'semina';
  const c = colore ?? (lei ? 'var(--semino-blu)' : 'var(--semino-verde)');
  return (
    <svg
      className={`semino semino-pianta${fiorita ? ' fiorita' : ''}${className ? ` ${className}` : ''}`}
      width={taglia}
      height={taglia}
      viewBox="20 -2 66 66"
      role="img"
      aria-label={fiorita ? 'pianta fiorita' : NOMI_STADIO[s]}
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
  taglia = 96,
  impulso,
  className,
}: {
  stadio?: number;
  umore?: SeminoUmore;
  /** se diverso da quello di Semino */
  umoreSemina?: SeminoUmore;
  taglia?: number;
  impulso?: number | string;
  className?: string;
}) {
  return (
    <span className={`semino-coppia${className ? ` ${className}` : ''}`} style={{ '--taglia': `${taglia}px` } as CSSProperties}>
      <Semino chi="semino" stadio={stadio} umore={umore} taglia={taglia} impulso={impulso} className="semino-coppia-lui" />
      <Semino
        chi="semina"
        stadio={stadio}
        umore={umoreSemina ?? umore}
        taglia={taglia}
        impulso={impulso}
        className="semino-coppia-lei"
      />
    </span>
  );
}
