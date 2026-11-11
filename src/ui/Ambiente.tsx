// Comparse e oggetti in scena nel lettore dei capitoli (T9 C, solo dal capitolo 9; vocabolario e
// descrizioni in docs/storia/ambienti.md, id in src/config/ambienti.json).
// <Ambiente comparse={['granchi']} oggetti={['tavola']} fondale="mare" fiore={21} />  → niente se le liste sono vuote
//   - due modi di stare in scena, entrambi sotto mascotte, secondari e fumetto (z 0 nel lettore, tema.css):
//     · "fondale": legati a un punto del fondale (gabbiani in cielo, falene al lampione, tram in strada, la
//       carrucola alla baita, le cose sul tavolo della cucina…), in unità del Fondale (360×640, suolo a 448)
//       e scalati come il Fondale, così cadono sul disegno a ogni misura di schermo
//     · "striscia": a terra davanti al suolo, fra il palco e il piede, in px come le mascotte (--cap-scala),
//       sei colonne fisse (oggetti e comparse alternati, le comparse un filo più in basso): mai una sopra l'altra
//   - lucciole nel bosco: le disegna il Fondale (CapitoloScena gliele accende solo se il capitolo le chiama)
//   - tazze in cucina: le tazze sono già del fondale, qui solo il vapore
//   - poche varianti dette in ambienti.md: due mele al 86, una tazza al 39 e al 69, il fiore di cima secco
//     dal 75, il plettro sotto il vetrino in laboratorio, la lettera che spunta da sotto il piatto
//   - id fuori vocabolario ignorati, al massimo 3 per lista; aria-hidden (le comparse non hanno nome)
// Stile di Secondari e Fondale: tratto caldo morbido, palette petrolio, niente verde fluo né blu elettrico
// a blocchi. Animazioni piccole e lente (ambiente.css), ferme con prefers-reduced-motion.
import type { CSSProperties, ReactNode } from 'react';
import { MAX_PER_CAPITOLO, comparsaValida, oggettoValido } from '../config/ambienti';
import type { Fondale } from './Fondale';
import './ambiente.css';

/* ------------------------------------------------------------ colori (fissi: il lettore è sempre notte) */
const K = {
  crema: '#efe6d0',
  carta: '#f6f1e6',
  petrolio: '#2f6a6c',
  petrolioScuro: '#2a5658',
  ocra: '#c8963e',
  ocraScuro: '#9c6d2c',
  legno: '#9a7450',
  legnoScuro: '#6b5640',
  canapa: '#cdb68a',
  salvia: '#8ea67e',
  salviaChiara: '#c9d4b0',
  corallo: '#c4705a',
  rosso: '#c63b30',
  oro: '#f2c84b',
  sabbia: '#c6a676',
  pietra: '#bfc2ba',
  ardesia: '#6f7884',
  latta: '#9fb0b8',
  matita: '#6e6658',
  vetro: '#bfe0ea',
} as const;

/** perno di una trasformazione CSS, in unità del viewBox */
const perno = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });
const ritardo = (s: number): CSSProperties => ({ animationDelay: `-${s}s` });

interface Disegno {
  /** misure naturali: px nella striscia, unità del Fondale nel fondale */
  w: number;
  h: number;
  el: ReactNode;
}

/* ------------------------------------------------------------ comparse */

function granchio(x: number, y: number, k: number, cls?: string) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <g className={cls}>
        <path d="M-4.6 1 L-8 4.4 M-3.6 2.2 L-6 6.4 M4.6 1 L8 4.4 M3.6 2.2 L6 6.4" className="amb-t amb-t-fine" />
        <path d="M-4.4 -1.4 Q-8.6 -2.6 -8 -6 M4.4 -1.4 Q8.6 -2.6 8 -6" className="amb-t amb-t-fine" />
        <circle cx={-8} cy={-6.6} r={2} fill={K.corallo} className="amb-t amb-t-fine" />
        <circle cx={8} cy={-6.6} r={2} fill={K.corallo} className="amb-t amb-t-fine" />
        <ellipse cx={0} cy={0} rx={5.6} ry={3.8} fill={K.corallo} className="amb-t amb-t-fine" />
        <circle cx={-1.6} cy={-3.6} r={0.8} className="amb-pieno" />
        <circle cx={1.6} cy={-3.6} r={0.8} className="amb-pieno" />
      </g>
    </g>
  );
}

function rana(x: number, y: number, k: number, d: number) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <ellipse cx={0} cy={-2.6} rx={3.8} ry={2.2} fill={K.salviaChiara} className="amb-gola" style={{ ...perno(0, -2.6), ...ritardo(d) }} />
      <path d="M-10 0 C-10 -7 -6 -10 0 -10 C6 -10 10 -7 10 0 Z" fill={K.salvia} className="amb-t amb-t-fine" />
      <path d="M-10 0 C-12 0 -13 -2 -11 -3 M10 0 C12 0 13 -2 11 -3" className="amb-t amb-t-fine" />
      <circle cx={-4.6} cy={-10} r={2.8} fill={K.salvia} className="amb-t amb-t-fine" />
      <circle cx={4.6} cy={-10} r={2.8} fill={K.salvia} className="amb-t amb-t-fine" />
      <circle cx={-4.4} cy={-10.2} r={1.1} className="amb-pieno" />
      <circle cx={4.8} cy={-10.2} r={1.1} className="amb-pieno" />
      <path d="M-3 -5.4 Q0 -4 3 -5.4" className="amb-t amb-t-fine" />
    </g>
  );
}

function farfalla(x: number, y: number, colore: string, d: number) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="amb-farfalla" style={ritardo(d)}>
        <g className="amb-ali" style={{ ...perno(0, 0), ...ritardo(d) }}>
          <ellipse cx={-3.6} cy={-1.6} rx={3.8} ry={2.8} transform="rotate(-28 -3.6 -1.6)" fill={colore} className="amb-t amb-t-fine" />
          <ellipse cx={3.6} cy={-1.6} rx={3.8} ry={2.8} transform="rotate(28 3.6 -1.6)" fill={colore} className="amb-t amb-t-fine" />
          <ellipse cx={-2.4} cy={2.4} rx={2.2} ry={1.8} fill={colore} className="amb-t amb-t-fine" />
          <ellipse cx={2.4} cy={2.4} rx={2.2} ry={1.8} fill={colore} className="amb-t amb-t-fine" />
        </g>
        <path d="M0 -3 V3.6" className="amb-t" />
      </g>
    </g>
  );
}

const COMPARSE_DISEGNI: Record<string, Disegno> = {
  lucciole: {
    w: 60,
    h: 40,
    el: (
      <>
        {[
          [8, 30, 0],
          [22, 10, 1.2],
          [38, 24, 2.3],
          [52, 8, 0.6],
        ].map(([x, y, d], i) => (
          <g key={i} className="amb-lucciola" style={ritardo(d)}>
            <circle cx={x} cy={y} r={5} fill="#ffd56a" opacity={0.25} />
            <circle cx={x} cy={y} r={1.8} fill="#fff1b0" />
          </g>
        ))}
      </>
    ),
  },
  granchi: {
    w: 58,
    h: 20,
    el: (
      <>
        {granchio(10, 13, 1)}
        {granchio(29, 14, 0.85, 'amb-granchio')}
        {granchio(48, 12, 1)}
      </>
    ),
  },
  gabbiani: {
    w: 80,
    h: 36,
    el: (
      <g className="amb-plana">
        <path d="M4 22 Q12 13 20 20.5 Q28 13 36 22" className="amb-gabbiano" />
        <path d="M46 10 Q52 4.6 58 9.6 Q64 4.6 70 10" className="amb-gabbiano amb-gabbiano-lontano" />
      </g>
    ),
  },
  rane: {
    w: 46,
    h: 24,
    el: (
      <>
        {rana(13, 22, 1, 0)}
        {rana(34, 22, 0.8, 1.8)}
      </>
    ),
  },
  farfalle: {
    w: 52,
    h: 32,
    el: (
      <>
        {farfalla(13, 12, '#f2e6c8', 0)}
        {farfalla(38, 20, '#f1b58e', 1.7)}
      </>
    ),
  },
  marmotta: {
    w: 16,
    h: 18,
    el: (
      <>
        <ellipse cx={8} cy={17} rx={7} ry={1.6} fill="#3a2c1e" />
        <g className="amb-marmotta" style={perno(8, 17)}>
          <path d="M4 17 C4 10.6 5.4 6.4 8 6.4 C10.6 6.4 12 10.6 12 17Z" fill={K.sabbia} className="amb-t amb-t-fine" />
          <path d="M6.4 16.6 C6.4 12.6 7 10.4 8 10.4 C9 10.4 9.6 12.6 9.6 16.6Z" fill="#e2cda4" />
          <circle cx={8} cy={5.4} r={2.8} fill={K.sabbia} className="amb-t amb-t-fine" />
          <circle cx={6} cy={3.2} r={0.8} fill={K.sabbia} className="amb-t amb-t-fine" />
          <circle cx={10} cy={3.2} r={0.8} fill={K.sabbia} className="amb-t amb-t-fine" />
          <circle cx={7} cy={5} r={0.45} className="amb-pieno" />
          <circle cx={9} cy={5} r={0.45} className="amb-pieno" />
        </g>
      </>
    ),
  },
  scoiattolo: {
    w: 26,
    h: 28,
    el: (
      <>
        <g className="amb-coda" style={perno(15, 24)}>
          <path d="M14 24 C24 22 26 10 20 6 C16 3 12 7 15 10 C18 13 20 16 16 20" fill="#b5643a" className="amb-t amb-t-fine" />
        </g>
        <path d="M6 26 C4 20 6 14 11 14 C15 14 16 20 15 26Z" fill="#a85a34" className="amb-t amb-t-fine" />
        <path d="M8.6 25 C8 21 9 18 11 18 C12.6 18 13 21 12.6 25Z" fill="#e2b58a" />
        <circle cx={9} cy={11.6} r={3.8} fill="#a85a34" className="amb-t amb-t-fine" />
        <path d="M7.4 8.6 L7 5.6 L9.4 7.8" fill="#a85a34" className="amb-t amb-t-fine" />
        <circle cx={7.8} cy={11.2} r={0.8} className="amb-pieno" />
        <path d="M5.4 12.6 L5.2 12.8" className="amb-t" />
      </>
    ),
  },
  tram: {
    w: 64,
    h: 36,
    el: (
      <g className="amb-tram">
        <path d="M28 9 L34 1.4 H44" className="amb-t amb-t-fine" />
        <rect x={2} y={9} width={60} height={22} rx={9} fill="#e7dcc2" className="amb-t" />
        <path d="M2.4 22 H61.6 V24 Q61.6 31 53 31 H11 Q2.4 31 2.4 24Z" fill={K.petrolio} />
        <rect x={2} y={9} width={60} height={22} rx={9} fill="none" className="amb-t" />
        <rect x={11} y={13} width={11} height={7} rx={1.6} fill="#ffd77a" className="amb-t amb-t-fine" />
        <rect x={26} y={13} width={11} height={7} rx={1.6} fill="#ffd77a" className="amb-t amb-t-fine" />
        <rect x={41} y={13} width={11} height={7} rx={1.6} fill="#44585a" className="amb-t amb-t-fine" />
        <circle cx={57} cy={18} r={1.4} fill="#fff4d8" />
        <circle cx={15} cy={32.6} r={2.6} fill="#2b2b2b" />
        <circle cx={49} cy={32.6} r={2.6} fill="#2b2b2b" />
      </g>
    ),
  },
  falene: {
    w: 40,
    h: 40,
    el: (
      <>
        {[
          [6, 3.2, 0],
          [10, 4.6, 1.4],
          [14, 6.2, 3],
        ].map(([r, t, d], i) => (
          <g key={i} className="amb-falena" style={{ ...perno(20, 20), animationDuration: `${t}s`, ...ritardo(d) }}>
            <ellipse cx={20 + r} cy={20} rx={1.6} ry={1.1} fill="#e6dfcf" />
          </g>
        ))}
      </>
    ),
  },
  piccione: {
    w: 34,
    h: 28,
    el: (
      <>
        <path d="M14.4 22 L13.4 27 M20.4 22 L21.4 27" className="amb-zampa" />
        <path d="M14.4 22 L13.4 27" className="amb-zampa amb-zampa-rosa" />
        <path d="M27 17 L33 14 L32 20.4Z" fill="#5d6570" className="amb-t amb-t-fine" />
        <path d="M6.4 19.6 C6 13 12 10 18 10.6 C24.6 11.2 29 15.6 29.6 19.6 C24 23 12 23.6 6.4 19.6Z" fill={K.ardesia} className="amb-t" />
        <path d="M14 15 C18 13.6 23 14.4 26 17.6" className="amb-t amb-t-fine" />
        <g className="amb-becca" style={perno(10, 15)}>
          <path d="M5.6 12.4 C6.4 9.4 10.6 9.4 12.4 12.6 C11.4 15.4 7.4 15.6 5.6 12.4Z" fill="#3c7a78" />
          <circle cx={7.6} cy={7.6} r={3.8} fill="#757e8a" className="amb-t" />
          <path d="M4.2 7.4 L1 8.6 L4.2 9.4Z" fill="#d8b48c" className="amb-t amb-t-fine" />
          <circle cx={6.8} cy={6.8} r={0.8} className="amb-pieno" />
        </g>
      </>
    ),
  },
};

/* ------------------------------------------------------------ oggetti */

function tazza(x: number, vapore: boolean) {
  return (
    <g>
      <path d={`M${x} 8h10v8q0 4 -4 4h-2q-4 0 -4 -4z`} fill={K.crema} className="amb-t" />
      <path d={`M${x + 10} 10.4q4 0 4 3.4t-4 3.4`} className="amb-t" />
      {vapore && <path d={`M${x + 5} 6.4C${x + 3} 3.6 ${x + 7} 2.4 ${x + 5} -1.6`} className="amb-vapore" />}
    </g>
  );
}

function mela(x: number) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M8 6 C4 3 1 6 1.4 10 C2 15 5 17.4 8 16.4 C11 17.4 14 15 14.6 10 C15 6 12 3 8 6Z" fill={K.rosso} className="amb-t" />
      <path d="M8 6 Q8.4 3 9.6 1.4" className="amb-t" />
      <path d="M9.2 3 C11 1 14 1.2 14.2 2.2 C12.8 4 10.8 4 9.2 3Z" fill={K.salvia} className="amb-t amb-t-fine" />
      <ellipse cx={4.6} cy={9} rx={1} ry={1.8} fill="#fff" opacity={0.35} />
    </g>
  );
}

function fioreCima(secco: boolean) {
  const petalo = secco ? '#cbc3ad' : '#ecebe3';
  return (
    <g transform={`rotate(${secco ? 24 : 10} 8 19)`}>
      <path d="M8 19 Q8 12 9.4 8" stroke={secco ? '#9a8c70' : '#7f8f76'} className="amb-stelo" />
      <g transform="translate(9.6 7)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx={0} cy={-3.2} rx={1.5} ry={3} transform={`rotate(${a})`} fill={petalo} className="amb-t amb-t-fine" />
        ))}
        <circle r={1.6} fill={secco ? '#b8a46a' : '#d8c27a'} />
      </g>
    </g>
  );
}

const OGGETTI_DISEGNI: Record<string, Disegno> = {
  zaino: {
    w: 26,
    h: 30,
    el: (
      <>
        <path d="M10 3.4 C10 0.4 16 0.4 16 3.4" className="amb-t" />
        <path d="M4 28.6 V10 C4 5 8 3 13 3 C18 3 22 5 22 10 V28.6Z" fill={K.ocra} className="amb-t" />
        <path d="M4 10 C4 6 8 4 13 4 C18 4 22 6 22 10 V15 C18 17 8 17 4 15Z" fill={K.ocraScuro} className="amb-t" />
        <rect x={8} y={19} width={10} height={6.4} rx={2} fill="#b3842f" className="amb-t amb-t-fine" />
        <circle cx={13} cy={15.6} r={1} fill="#e8d7a8" />
      </>
    ),
  },
  tavola: {
    w: 20,
    h: 112,
    el: (
      <g transform="rotate(5 10 110)">
        <path d="M10 2 C15 2 17 20 17 56 C17 90 14 106 10 110 C6 106 3 90 3 56 C3 20 5 2 10 2Z" fill={K.crema} className="amb-t" />
        <path d="M10 4.6 V107.4" stroke={K.petrolio} className="amb-riga" />
        <path d="M5.6 40 L8.4 34 L10.4 37 L12.6 32.6 L15 40" className="amb-graffio" />
        <path d="M6 48 q2 -2.4 4 0 t4 0" className="amb-graffio" />
      </g>
    ),
  },
  ombrellone: {
    w: 84,
    h: 84,
    el: (
      <>
        <path d="M40 80 C52 76 70 74 84 77 C72 82 52 84 40 80Z" fill="#000" opacity={0.18} />
        <path d="M39 14 L41 80" stroke={K.legnoScuro} className="amb-palo" />
        <g transform="rotate(-6 40 26)">
          {[6, 23, 40, 57].map((x, i) => (
            <path key={x} d={`M40 4 L${x} 26 Q${x + 8.5} 30 ${x + 17} 26 Z`} fill={i % 2 ? K.petrolio : K.crema} className="amb-t amb-t-fine" />
          ))}
          <circle cx={40} cy={3.4} r={1.6} fill={K.crema} className="amb-t amb-t-fine" />
        </g>
      </>
    ),
  },
  conchiglia: {
    w: 20,
    h: 16,
    el: (
      <>
        <path d="M10 15 L2 7 C3 3 7 1 10 1 C13 1 17 3 18 7 Z" fill="#f0c6bc" className="amb-t" />
        <path d="M10 15 L5 3 M10 15 L10 1.6 M10 15 L15 3 M10 15 L3 6 M10 15 L17 6" stroke="#c9978d" className="amb-segno" />
        <circle cx={12.4} cy={6} r={1} fill="#3a2a22" />
      </>
    ),
  },
  palla: {
    w: 20,
    h: 20,
    el: (
      <g className="amb-rotola" style={perno(10, 19)}>
        <circle cx={10} cy={10} r={8.6} fill={K.oro} className="amb-t" />
        <path d="M1.6 10 Q10 6 18.4 10 M10 1.4 Q6 10 10 18.6" stroke="#3d63b0" className="amb-segno amb-segno-forte" />
        <path d="M11 4 L15.6 8.6 M15.6 4 L11 8.6" stroke="#fff" className="amb-toppa" />
      </g>
    ),
  },
  pc: {
    w: 38,
    h: 28,
    el: (
      <>
        <rect x={6} y={2} width={26} height={19} rx={1.6} fill="#3a4046" className="amb-t" />
        <rect x={8.4} y={4.4} width={21.2} height={14} rx={0.8} fill="#8fc6dc" opacity={0.5} />
        <path d="M11 8 H22 M11 11.4 H18" stroke="#e9f6ff" className="amb-segno" opacity={0.7} />
        <rect x={19.4} y={10.2} width={1.4} height={3} fill="#e9f6ff" className="amb-cursore" />
        <path d="M2 21.4 H36 L33 26.4 H5Z" fill="#555c63" className="amb-t" />
      </>
    ),
  },
  'sasso-misura': {
    w: 30,
    h: 26,
    el: (
      <>
        <path d="M3 24.6 C2 14 7 4 15 4 C23 4 28 14 27 24.6 Z" fill={K.pietra} className="amb-t" />
        <path d="M10.6 12.6 L11.6 18.6 M14.6 12 Q18.4 12.6 16 18.6" stroke="#4a4440" className="amb-segno amb-segno-forte" />
        <path d="M1 24.8 H29" className="amb-t amb-t-fine" />
      </>
    ),
  },
  bastoncino: {
    w: 46,
    h: 14,
    el: (
      <>
        <path d="M2 12 L44 3" className="amb-bastone-bordo" />
        <path d="M2 12 L44 3" stroke="#b08a5c" className="amb-bastone" />
        <path d="M14.4 9.4 l-0.8 -2.6 M21.6 7.9 l-0.8 -2.6 M28.8 6.4 l-0.8 -2.6" className="amb-t amb-t-fine" />
      </>
    ),
  },
  'sasso-quota': {
    w: 24,
    h: 18,
    el: (
      <>
        <path d="M2 16.6 C1 9 6 3 12 3 C19 3 23 9 22 16.6Z" fill="#a9a49a" className="amb-t" />
        <path d="M7.6 13 L12 7 L16.4 13" stroke="#f1ead7" className="amb-segno amb-segno-forte" />
      </>
    ),
  },
  cartina: {
    w: 40,
    h: 22,
    el: (
      <>
        <path d="M4 20.6 L10 2 L38 4 L34 21Z" fill="#e8d8b4" className="amb-t" />
        <path d="M21.4 3 L19.4 20.8" stroke="#c7b48c" className="amb-segno" />
        <path d="M10 15 Q18 8 26 12 T34 8 M12 7 Q20 11 30 17" stroke={K.matita} className="amb-segno" />
        <circle cx={27} cy={15.6} r={1.8} fill="#b4553c" opacity={0.7} />
      </>
    ),
  },
  matita: {
    w: 26,
    h: 8,
    el: (
      <g className="amb-rotola" style={perno(13, 7)}>
        <rect x={2} y={2} width={18} height={4} rx={0.8} fill="#c8483a" className="amb-t amb-t-fine" />
        <path d="M20 2 L25 4 L20 6Z" fill="#e8cfa4" className="amb-t amb-t-fine" />
        <path d="M23.6 3.4 L25 4 L23.6 4.6Z" className="amb-pieno" />
      </g>
    ),
  },
  carrucola: {
    w: 36,
    h: 62,
    el: (
      <>
        <path d="M11.4 10 L-34 74" stroke={K.canapa} className="amb-corda" />
        <path d="M18 61 V8 M10 8 H26" className="amb-palo-bordo" />
        <path d="M18 61 V8 M10 8 H26" stroke={K.legnoScuro} className="amb-palo" />
        <g className="amb-ruota" style={perno(18, 11)}>
          <circle cx={18} cy={11} r={7} fill={K.legno} className="amb-t" />
          <path d="M11.4 11 H24.6 M18 4.4 V17.6 M13.4 6.4 L22.6 15.6 M22.6 6.4 L13.4 15.6" className="amb-t amb-t-fine" />
          <circle cx={18} cy={11} r={1.6} fill={K.legnoScuro} />
        </g>
      </>
    ),
  },
  secchio: {
    w: 20,
    h: 20,
    el: (
      <>
        <path d="M3.4 8 Q10 -0.6 16.6 8" className="amb-t" />
        <path d="M3 8 H17 L15 19 H5Z" fill={K.latta} className="amb-t" />
        <path d="M3.8 12.6 H16.2" className="amb-t amb-t-fine" />
        <ellipse cx={10} cy={8} rx={7} ry={1.6} fill="#c3d0d6" className="amb-t amb-t-fine" />
      </>
    ),
  },
  nodo: {
    w: 34,
    h: 12,
    el: (
      <>
        <path d="M1 8 C6 4 10 10 14 7 M20 7 C24 4 28 10 33 6" className="amb-corda-bordo" />
        <path d="M1 8 C6 4 10 10 14 7 M20 7 C24 4 28 10 33 6" stroke={K.canapa} className="amb-corda-spessa" />
        <path d="M12.6 7 C12.6 2.6 21.4 2.6 21.4 7 C21.4 11.4 12.6 11.4 12.6 7Z" fill={K.canapa} className="amb-t" />
        <path d="M14.4 4.6 L19.6 9.4" className="amb-t amb-t-fine" />
      </>
    ),
  },
  cappello: {
    w: 32,
    h: 16,
    el: (
      <>
        <path d="M7 4.6 C7 13 11 15.4 16 15.4 C21 15.4 25 13 25 4.6Z" fill="#cdb58a" className="amb-t" />
        <path d="M7.6 8 C12 10 20 10 24.4 8" stroke="#3d63b0" className="amb-segno amb-segno-forte" />
        <ellipse cx={16} cy={4.4} rx={15} ry={3.4} fill="#e2cfa6" className="amb-t" />
        <ellipse cx={16} cy={4.4} rx={8.6} ry={1.8} fill="#8f7a58" />
      </>
    ),
  },
  tazze: { w: 34, h: 22, el: <>{tazza(4, true)}{tazza(19, false)}</> },
  pianta: {
    w: 20,
    h: 30,
    el: (
      <>
        <g className="amb-foglie" style={perno(10, 16)}>
          <path d="M10 17 V8" className="amb-t amb-t-fine" />
          <path d="M10 16 C6 12 4 8 6 4.6 C9 6.6 10.4 11 10 16Z" fill={K.salvia} className="amb-t amb-t-fine" />
          <path d="M10 16 C14 12 16.4 8.4 14.6 5 C11.4 6.8 9.8 11 10 16Z" fill={K.salvia} className="amb-t amb-t-fine" />
          <path d="M10 10 C8 7 8.4 3.4 10.6 1.4 C12 4 11.6 7 10 10Z" fill="#a3b892" className="amb-t amb-t-fine" />
          <path d="M10 15 C12.6 14 15 14.4 16.4 15.6 C14.6 17 12 16.8 10 15Z" fill="#a3b892" className="amb-t amb-t-fine" />
        </g>
        <path d="M5 16 H15 L14 29 H6Z" fill="#cfe3e4" opacity={0.45} />
        <path d="M6.2 21 H13.8 L13.2 28.6 H6.8Z" fill="#8fc0c8" opacity={0.4} />
        <path d="M5 16 H15 L14 29 H6Z" fill="none" className="amb-t amb-t-fine" />
      </>
    ),
  },
  piatto: {
    w: 36,
    h: 12,
    el: (
      <>
        <ellipse cx={18} cy={8} rx={16} ry={3.6} fill={K.carta} className="amb-t" />
        <ellipse cx={18} cy={7.8} rx={10} ry={2.2} fill="none" stroke="#d8d0c0" className="amb-segno" />
        <path d="M12 7.4 C12 3 16 1.4 18 3 C20 1.4 25 3 24 7.4 Z" fill="#d9893f" className="amb-t amb-t-fine" />
        <circle cx={17.4} cy={4.6} r={1.7} fill="#c0412e" />
      </>
    ),
  },
  lettera: {
    w: 28,
    h: 20,
    el: (
      <>
        <path d="M6 2.6 L25 1 L26.4 13 L8 14.6Z" fill="#e9e2d4" className="amb-t amb-t-fine" />
        <path d="M2 5 L22 3 L24 16.4 L4 18.4Z" fill={K.carta} className="amb-t" />
        <path d="M3 6 L13 11 L23 4" stroke="#c9c0ae" className="amb-segno" />
      </>
    ),
  },
  foglio: {
    w: 26,
    h: 30,
    el: (
      <>
        <path d="M3 4 L21 2 L24 27 L6 28.6Z" fill={K.carta} className="amb-t" />
        <path d="M7 9 q4 -2 8 0 t5 -1 M7.6 14 q5 -2 9 0 M8.4 19 q3 -1.6 6 0" stroke="#8a8478" className="amb-segno" />
      </>
    ),
  },
  piuma: {
    w: 10,
    h: 28,
    el: (
      <g className="amb-piuma" style={perno(5, 1)}>
        <path d="M5 27 C3 20 1 12 4 2.6 C7.6 8 9 16 5 27Z" fill="#b8bcbc" className="amb-t amb-t-fine" />
        <path d="M5 27 Q5 15 4.4 3.6" stroke="#7c8282" className="amb-segno" />
      </g>
    ),
  },
  bacca: {
    w: 12,
    h: 12,
    el: (
      <>
        <path d="M7 5.4 C9 1 12 1.2 11.6 2.4 C10.4 5 8.4 5.6 7 5.4Z" fill={K.salvia} className="amb-t amb-t-fine" />
        <circle cx={5.4} cy={8} r={3.4} fill="#c0392e" className="amb-t amb-t-fine" />
        <circle cx={4.4} cy={7} r={0.8} fill="#fff" opacity={0.5} />
      </>
    ),
  },
  fuochi: {
    w: 300,
    h: 140,
    el: (
      <>
        {[
          [50, 44, 30, '#ffcf6a', 0],
          [232, 34, 34, '#f3a3b4', 1.6],
          [142, 102, 22, '#f4efe6', 3.1],
        ].map(([x, y, r, c, d]) => (
          <g key={String(x)} transform={`translate(${x} ${y})`}>
            <g className="amb-fuoco" style={ritardo(d as number)}>
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * Math.PI) / 6;
                const r0 = (r as number) * 0.32;
                const r1 = r as number;
                const p = (v: number) => Math.round(v * 10) / 10;
                return (
                  <g key={i}>
                    <path d={`M${p(Math.cos(a) * r0)} ${p(Math.sin(a) * r0)}L${p(Math.cos(a) * r1)} ${p(Math.sin(a) * r1)}`} stroke={c as string} className="amb-raggio" />
                    <circle cx={p(Math.cos(a) * (r1 + 2.4))} cy={p(Math.sin(a) * (r1 + 2.4))} r={1.3} fill={c as string} />
                  </g>
                );
              })}
            </g>
          </g>
        ))}
      </>
    ),
  },
  custodia: {
    w: 56,
    h: 22,
    el: (
      <>
        <path d="M6 12.4 C6 5 14 3 22 4 C26 1 34 1 38 4 C46 3 50 6 50 12.4" fill="#4a2f1f" className="amb-t" />
        <path d="M2 12 H54 C54 18 50 21 44 21 H12 C6 21 2 18 2 12Z" fill="#5a3a26" className="amb-t" />
        <path d="M6 13 H50 C50 16 47 18 43 18 H13 C9 18 6 16 6 13Z" fill={K.petrolioScuro} />
        <circle cx={20} cy={15.4} r={1.7} fill="#e8b84a" className="amb-t amb-t-fine" />
        <circle cx={26.4} cy={16.2} r={1.7} fill="#e8b84a" className="amb-t amb-t-fine" />
        <circle cx={33} cy={15.2} r={1.7} fill="#e8b84a" className="amb-t amb-t-fine" />
      </>
    ),
  },
  plettro: {
    w: 10,
    h: 11,
    el: (
      <>
        <path d="M5 10 C2 7 1 4 1.6 2 C3 0.6 7 0.6 8.4 2 C8.8 3 7.6 3.4 8 4.6 C8 6.6 7 8 5 10Z" fill={K.oro} className="amb-t amb-t-fine" />
      </>
    ),
  },
  locandina: {
    w: 24,
    h: 30,
    el: (
      <>
        <path d="M2 3 H22 V28 H2Z" fill="#efe4c8" className="amb-t" />
        <path d="M5 9 L19 8 M5 13 L17 14 M6 18 L15.4 17" stroke="#6b4a3a" className="amb-segno amb-segno-forte" />
        <rect x={8} y={0.6} width={8} height={4.4} fill="#d8cfb8" opacity={0.9} />
        <g className="amb-angolo" style={perno(22, 22)}>
          <path d="M16 28 L22 22 L22 28Z" fill="#d6c9a8" className="amb-t amb-t-fine" />
        </g>
      </>
    ),
  },
  vetrino: {
    w: 28,
    h: 16,
    el: (
      <>
        <path d="M1 8 L8 1 L27 4 L22 15 L3 14Z" fill={K.carta} className="amb-t amb-t-fine" />
        <path d="M6 6 H14 L13 11 H6Z" fill={K.vetro} opacity={0.75} stroke="#7fb2c2" className="amb-segno" />
        <path d="M15.4 5.4 H22.4 V10.4 H14.6Z" fill={K.vetro} opacity={0.75} stroke="#7fb2c2" className="amb-segno" transform="rotate(6 18 8)" />
      </>
    ),
  },
  mela: { w: 16, h: 18, el: mela(0) },
  'fiore-cima': { w: 16, h: 20, el: fioreCima(false) },
  biscotti: {
    w: 28,
    h: 12,
    el: (
      <>
        <ellipse cx={8} cy={7} rx={6.6} ry={4.2} fill="#d9a656" className="amb-t" />
        <ellipse cx={20.4} cy={7.6} rx={6.6} ry={4.2} fill="#d9a656" className="amb-t" />
        <path d="M6 6 h0.1 M10 7.6 h0.1 M18.4 6.6 h0.1 M22.6 8.4 h0.1" className="amb-briciole" />
      </>
    ),
  },
};

/** varianti dette in ambienti.md (poche, per capitolo) */
function disegnoDi(id: string, tipo: 'comparsa' | 'oggetto', fondale: Fondale, fiore: number): Disegno | undefined {
  if (tipo === 'comparsa') return COMPARSE_DISEGNI[id];
  if (id === 'mela' && fiore === 86) return { w: 30, h: 18, el: <>{mela(0)}{mela(13)}</> };
  if (id === 'tazze' && (fiore === 39 || fiore === 69)) return { w: 20, h: 22, el: tazza(4, true) };
  if (id === 'fiore-cima' && fiore >= 75) return { w: 16, h: 20, el: fioreCima(true) };
  if (id === 'plettro' && fondale === 'laboratorio') {
    return {
      w: 18,
      h: 14,
      el: (
        <>
          <g transform="translate(4 2)">{OGGETTI_DISEGNI.plettro.el}</g>
          <rect x={1} y={0.6} width={16} height={12.6} rx={1} fill={K.vetro} opacity={0.35} stroke="#9fc4d0" className="amb-segno" />
        </>
      ),
    };
  }
  return OGGETTI_DISEGNI[id];
}

/* ------------------------------------------------------------ dove stanno */

/** punto del Fondale (unità 360×640, suolo a 448): centro in basso del disegno */
type PuntoFondale = { modo: 'fondale'; cx: number; by: number; k?: number };

/** legati a un punto del disegno, per fondale ('*' = ovunque): [x, y, ingrandimento] */
const PUNTI: Record<string, Partial<Record<Fondale | '*', [number, number, number?]>>> = {
  gabbiani: { '*': [232, 132] },
  falene: { '*': [70, 316] },
  tram: { '*': [180, 440] },
  marmotta: { montagna: [48, 292, 1.5] },
  scoiattolo: { bosco: [88, 300, 1.5] },
  lucciole: { '*': [180, 420] },
  tavola: { mare: [206, 440] },
  ombrellone: { mare: [160, 436] },
  carrucola: { montagna: [248, 352, 1.25] },
  fuochi: { '*': [180, 200] },
  locandina: { citta: [152, 360] },
  piuma: { bosco: [236, 268] },
  bacca: { bosco: [254, 236] },
};
/** piani d'appoggio: [y del piano, x dei posti, ingrandimento] (il tavolo della cucina in primo piano, il banco del laboratorio) */
const PIANI: Partial<Record<Fondale, [number, number[], number]>> = {
  cucina: [548, [64, 118, 172, 318], 1.3],
  laboratorio: [404, [168, 200, 232], 1.2],
};
/** nel treno la lettera sta sulla mensola sotto il finestrino */
const MENSOLA_TRENO: [number, number] = [180, 342];
/** il vapore sopra le tazze già disegnate dal fondale della cucina */
const VAPORE_CUCINA: Disegno = {
  w: 16,
  h: 26,
  el: (
    <>
      <path d="M5 25 C2 20 8 16 5 10 C3 6 7 3 6 0.6" className="amb-vapore" />
      <path d="M11 25 C8.6 21 13 18 11 13" className="amb-vapore" style={ritardo(1.6)} />
    </>
  ),
};

/** colonne della striscia (frazione della colonna): oggetti e comparse alternati, da sinistra */
const COLONNE_OGGETTI = [0.1, 0.9, 0.42] as const;
const COLONNE_COMPARSE = [0.26, 0.74, 0.58] as const;

interface Pezzo {
  chiave: string;
  id: string;
  tipo: 'comparsa' | 'oggetto';
  disegno: Disegno;
  posto: PuntoFondale | { modo: 'striscia'; f: number };
}

/** dove va ogni pezzo: i punti legati al fondale, poi i piani d'appoggio, poi la striscia */
function disponi(comparse: readonly string[], oggetti: readonly string[], fondale: Fondale, fiore: number): Pezzo[] {
  const out: Pezzo[] = [];
  const piano = PIANI[fondale];
  let suPiano = 0;
  let inStrisciaO = 0;
  let inStrisciaC = 0;
  const liste: Array<['comparsa' | 'oggetto', readonly string[]]> = [
    ['oggetto', oggetti],
    ['comparsa', comparse],
  ];
  for (const [tipo, ids] of liste) {
    for (const id of ids) {
      // le lucciole del bosco sono quelle del Fondale
      if (tipo === 'comparsa' && id === 'lucciole' && fondale === 'bosco') continue;
      const punti = PUNTI[id];
      const punto = punti?.[fondale] ?? punti?.['*'];
      let posto: PuntoFondale | undefined;
      let disegno = disegnoDi(id, tipo, fondale, fiore);
      if (!disegno) continue;
      if (tipo === 'oggetto' && id === 'tazze' && fondale === 'cucina') {
        disegno = VAPORE_CUCINA;
        posto = { modo: 'fondale', cx: 241, by: 524 };
      } else if (punto) posto = { modo: 'fondale', cx: punto[0], by: punto[1], k: punto[2] };
      else if (tipo === 'oggetto' && piano && suPiano < piano[1].length) {
        posto = { modo: 'fondale', cx: piano[1][suPiano++], by: piano[0], k: piano[2] };
      } else if (tipo === 'oggetto' && fondale === 'treno' && id === 'lettera') {
        posto = { modo: 'fondale', cx: MENSOLA_TRENO[0], by: MENSOLA_TRENO[1] };
      }
      if (posto) out.push({ chiave: `${tipo}-${id}`, id, tipo, disegno, posto });
      else {
        const f = tipo === 'oggetto' ? COLONNE_OGGETTI[inStrisciaO++] : COLONNE_COMPARSE[inStrisciaC++];
        if (f !== undefined) out.push({ chiave: `${tipo}-${id}`, id, tipo, disegno, posto: { modo: 'striscia', f } });
      }
    }
  }
  // la lettera spunta da sotto il piatto (77-87): stesso posto, un po' più a sinistra, disegnata prima
  const piatto = out.find((p) => p.id === 'piatto' && p.tipo === 'oggetto');
  const lettera = out.find((p) => p.id === 'lettera' && p.tipo === 'oggetto');
  if (piatto && lettera && piatto.posto.modo === 'fondale' && lettera.posto.modo === 'fondale') {
    lettera.posto = { modo: 'fondale', cx: piatto.posto.cx - 10, by: piatto.posto.by - 1, k: piatto.posto.k };
    out.splice(out.indexOf(lettera), 1);
    out.splice(out.indexOf(piatto), 0, lettera);
  }
  return out;
}

export interface AmbienteProps {
  comparse?: readonly string[];
  oggetti?: readonly string[];
  /** la variante del fondale (scegliFondale): decide i punti e i piani d'appoggio */
  fondale: Fondale;
  /** il capitolo: per le poche varianti per capitolo */
  fiore: number;
}

export function Ambiente({ comparse, oggetti, fondale, fiore }: AmbienteProps) {
  const c = [...new Set(comparse ?? [])].filter(comparsaValida).slice(0, MAX_PER_CAPITOLO);
  const o = [...new Set(oggetti ?? [])].filter(oggettoValido).slice(0, MAX_PER_CAPITOLO);
  if (c.length === 0 && o.length === 0) return null;
  const pezzi = disponi(c, o, fondale, fiore);
  if (pezzi.length === 0) return null;
  return (
    <div className="capitolo-ambiente" data-testid="capitolo-ambiente" aria-hidden="true">
      {pezzi.map((p) => {
        // qualche comparsa lontana va ingrandita perché si legga (marmotta, scoiattolo, carrucola)
        const k = p.posto.modo === 'fondale' ? (p.posto.k ?? 1) : 1;
        const stile: Record<string, number | string> = { '--w': p.disegno.w * k, '--h': p.disegno.h * k };
        if (p.posto.modo === 'fondale') {
          stile['--cx'] = p.posto.cx;
          stile['--by'] = p.posto.by;
        } else stile['--f'] = p.posto.f;
        return (
          <span
            key={p.chiave}
            className={`amb-pezzo amb-pezzo--${p.tipo} amb-pezzo--${p.posto.modo} amb-${p.id}`}
            {...{ [p.tipo === 'comparsa' ? 'data-comparsa' : 'data-oggetto']: p.id }}
            data-posto={p.posto.modo}
            style={stile as CSSProperties}
          >
            <svg viewBox={`0 0 ${p.disegno.w} ${p.disegno.h}`} focusable="false">
              {p.disegno.el}
            </svg>
          </span>
        );
      })}
    </div>
  );
}
