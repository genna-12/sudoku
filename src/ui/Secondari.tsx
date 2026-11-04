// I personaggi secondari della storia (bibbia §4): SVG inline nello stile di Semino, colori in secondari.css.
// <PersonaggioSecondario id="pinza" parla taglia={58} entrata />
//   - fermo: respiro lento e un dettaglio vivo per ciascuno (coda, antenne, mascella che mastica, ciglia del gufo…)
//   - parla: bocca o becco che si muove e un piccolo cenno
//   - entrata: sbuca dal basso in 250 ms (con reduced-motion solo dissolvenza)
// Verde fluo e blu elettrico sono solo dei due: qui toni caldi, grigi e un solo giallo (gli occhi del Gufo).
// Il Mulo non si disegna: le sue righe sono una lettera.
import type { CSSProperties, ReactNode } from 'react';
import './secondari.css';

export type Secondario = 'fischio' | 'pinza' | 'nuvola' | 'nonnacapra' | 'gufo' | 'grillo' | 'briciola';

export const NOMI_SECONDARI: Record<Secondario, string> = {
  fischio: 'Fischio',
  pinza: 'Pinza',
  nuvola: 'Nuvola',
  nonnacapra: 'Nonna Capra',
  gufo: 'Gufo',
  grillo: 'Grillo',
  briciola: 'Briciola',
};

/** perno di una trasformazione CSS, in unità del viewBox */
const perno = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` });

/** bocca: chiusa (linea) da ferma, ovale che si apre e chiude quando parla */
function bocca(chiusa: string, x: number, y: number, rx: number, ry: number) {
  return (
    <>
      <path d={chiusa} className="sec-linea sec-fine sec-bocca-chiusa" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} className="sec-bocca-aperta" style={perno(x, y - ry)} />
    </>
  );
}

/** occhio tondo con il punto di luce (come quelli di Semino) */
function occhio(x: number, y: number, rx: number, ry = rx) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} className="sec-pieno" />
      <circle cx={x + rx * 0.32} cy={y - ry * 0.36} r={rx * 0.38} className="sec-luce" />
    </>
  );
}

/** chela: cerchio con una tacca a V verso `ang` (gradi, 0 = destra, y verso il basso) */
function chela(cx: number, cy: number, r: number, ang: number) {
  const pt = (a: number, rr: number) => {
    const t = (a * Math.PI) / 180;
    return `${(cx + Math.cos(t) * rr).toFixed(2)} ${(cy + Math.sin(t) * rr).toFixed(2)}`;
  };
  return `M${pt(ang + 24, r)} A${r} ${r} 0 1 1 ${pt(ang - 24, r)} L${pt(ang, r * 0.2)}Z`;
}

/* ------------------------------------------------------------ i sette */

/** Fischio, il merlo: nero, becco e anello dell'occhio arancioni, tre ciuffi spettinati */
function Fischio() {
  return (
    <>
      <g className="sec-coda" style={perno(66, 64)}>
        <path d="M64 58 L93 72 Q96 80 89 83 L61 72Z" className="sec-c2" />
      </g>
      <path d="M48 80 L46 92 l-4 1 M46 92 l3 1.6 M58 80 L58 92 l-4 1 M58 92 l3 1.6" className="sec-linea sec-fine" />
      {/* ciuffi: dietro la testa, ne spunta solo la punta */}
      <path d="M35 26 L28 10 L43 21Z M42 22 L45 6 L51 21Z M50 24 L60 12 L57 28Z" className="sec-c1" />
      <path
        d="M24 46 C22 31 32 21 44 21 C54 21 60 28 62 35 C72 39 79 49 79 61 C79 75 67 84 53 84 C38 84 27 75 25 61 C24 56 24 51 24 46Z"
        className="sec-c1"
      />
      <ellipse cx={42} cy={68} rx={11} ry={9} className="sec-f3" />
      <path d="M50 54 C60 47 76 52 77 66 C70 72 56 70 50 54Z" className="sec-c2" />
      <path d="M58 59 L70 63 M56 64 L68 68" className="sec-linea sec-fine sec-tenue" />
      {/* occhio con l'anello arancione del merlo */}
      <circle cx={38} cy={38} r={6.6} className="sec-c3 sec-sottile" />
      {occhio(37.4, 38.4, 4.2)}
      <g className="sec-cenno-testa" style={perno(40, 44)}>
        <g className="sec-becco" style={perno(27, 47)}>
          <path d="M27 47 C22 47 17 47.4 13 48.4 C18 50.6 23 51.4 27 51.4Z" className="sec-c3 sec-sottile" />
        </g>
        <path d="M27.4 40.6 C22 40.8 16 43 11 46.6 C16 47.6 22 47.6 27.4 47.4Z" className="sec-c3 sec-sottile" />
      </g>
    </>
  );
}

/** Pinza, il granchio: rosso mattone, occhi sui peduncoli, una chela molto più grande dell'altra */
function Pinza() {
  const zampe = 'M30 74 Q18 74 13 86 M32 79 Q23 83 21 92 M70 74 Q82 74 87 86 M68 79 Q77 83 79 92';
  return (
    <>
      <path d={zampe} className="sec-bordo" />
      <path d={zampe} className="sec-arto" />
      {/* chela piccola */}
      <path d="M31 64 Q22 60 20 52" className="sec-bordo" />
      <path d="M31 64 Q22 60 20 52" className="sec-arto" />
      <path d={chela(18, 46, 7.5, -135)} className="sec-c1" />
      {/* chela grande: oscilla, e quando parla schiocca */}
      <g className="sec-chela" style={perno(66, 62)}>
        <path d="M64 63 Q74 60 76 52" className="sec-bordo" />
        <path d="M64 63 Q74 60 76 52" className="sec-arto" />
        <path d={chela(80, 38, 14, -45)} className="sec-c1" />
        <path d="M71 44 Q76 49 82 48" className="sec-linea sec-fine sec-tenue" />
      </g>
      {/* peduncoli e occhi */}
      <path d="M42 53 L40 38 M58 53 L60 38" className="sec-bordo sec-bordo-fine" />
      <path d="M42 53 L40 38 M58 53 L60 38" className="sec-arto sec-arto-fine" />
      <circle cx={40} cy={34} r={6.6} className="sec-bianco" />
      <circle cx={60} cy={34} r={6.6} className="sec-bianco" />
      {occhio(41, 35, 3.4)}
      {occhio(61, 35, 3.4)}
      <path
        d="M24 68 C24 56 36 50 50 50 C64 50 76 56 76 68 C76 78 64 84 50 84 C36 84 24 78 24 68Z"
        className="sec-c1"
      />
      <path d="M27 72 C33 80 67 80 73 72 C70 80 61 84 50 84 C39 84 30 80 27 72Z" className="sec-f2" />
      <circle cx={37} cy={58} r={2.2} className="sec-f3" />
      <circle cx={63} cy={58} r={2.2} className="sec-f3" />
      <circle cx={33} cy={64} r={1.4} className="sec-f3" />
      <circle cx={67} cy={64} r={1.4} className="sec-f3" />
      {bocca('M45 66 Q50 70 55 66', 50, 68.6, 3.4, 3)}
    </>
  );
}

/** Nuvola, la cavalla: grigio chiaro, muso lungo di profilo, criniera morbida più scura */
function Nuvola() {
  return (
    <>
      <path d="M46 96 C44 82 46 66 54 52 L76 34 C84 46 86 64 84 80 C83 86 82 92 82 96Z" className="sec-c1" />
      <g className="sec-cenno-testa" style={perno(70, 44)}>
        <g className="sec-orecchio" style={perno(66, 20)}>
          <path d="M61 23 L58 6 L72 17Z" className="sec-c1" />
          <path d="M62 19 L61 11 L67 16Z" className="sec-f2" />
        </g>
        <path d="M69 23 L75 8 L80 23Z" className="sec-c1" />
        <path
          d="M68 18 C58 16 46 22 36 32 C26 42 16 50 16 60 C16 68 24 72 32 70 C42 68 50 62 58 58 C70 52 80 42 78 30 C77 24 73 20 68 18Z"
          className="sec-c1"
        />
        <path d="M13 58 C13 50 21 46 28 48 C34 50 36 58 34 64 C32 70 26 72 20 70 C15 68 13 64 13 58Z" className="sec-c2" />
        <ellipse cx={20} cy={57} rx={2} ry={3} transform="rotate(-20 20 57)" className="sec-pieno" />
        <g className="sec-labbro" style={perno(27, 66)}>
          <path d="M18 68 Q24 74 31 67" className="sec-linea sec-fine" />
        </g>
        {occhio(52, 34, 3.6, 4.4)}
        <path d="M55 30.4 l2.6 -2 M55.8 32.2 l3 -1" className="sec-linea sec-fine" />
        <path d="M44 46 Q50 50 56 46" className="sec-linea sec-fine sec-tenue" />
        {/* ciuffo sulla fronte */}
        <path d="M64 18 C57 20 55 28 57 33 C59 28 62 26 68 25Z" className="sec-c3" />
      </g>
      {/* criniera morbida lungo il collo */}
      <g className="sec-criniera" style={perno(72, 20)}>
        <path
          d="M70 16 C82 14 92 27 88 41 C93 51 88 61 91 71 C93 80 89 88 86 94 C82 86 81 77 80 69 C79 59 77 49 75 41 C73 33 71 27 66 22Z"
          className="sec-c3"
        />
        <path d="M78 28 C82 34 82 40 80 46 M84 56 C86 62 85 68 84 72" className="sec-linea sec-fine sec-tenue" />
      </g>
    </>
  );
}

/** Nonna Capra: di fronte, corna all'indietro, orecchie di lato, palpebre basse, barbetta che mastica */
function NonnaCapra() {
  return (
    <>
      <path d="M30 96 C30 83 38 72 50 72 C62 72 70 83 70 96Z" className="sec-c2" />
      <path d="M42 24 C38 12 28 5 19 9 C14 12 14 19 19 21 C24 14 32 16 36 29Z" className="sec-c4" />
      <path d="M58 24 C62 12 72 5 81 9 C86 12 86 19 81 21 C76 14 68 16 64 29Z" className="sec-c4" />
      <path d="M24 11 l2 4 M30 9 l0.6 4.4 M76 11 l-2 4 M70 9 l-0.6 4.4" className="sec-linea sec-fine sec-tenue" />
      <path d="M37 38 C28 33 16 35 9 42 C15 47 28 47 38 44Z" className="sec-c1" />
      <path d="M33 40 C27 38 20 39 15 42 C20 44 27 44 33 43Z" className="sec-f4" />
      <path d="M63 38 C72 33 84 35 91 42 C85 47 72 47 62 44Z" className="sec-c1" />
      <path d="M67 40 C73 38 80 39 85 42 C80 44 73 44 67 43Z" className="sec-f4" />
      <path
        d="M50 20 C62 20 68 30 67 42 C66 52 62 60 60 66 C58 70 54 71 50 71 C46 71 42 70 40 66 C38 60 34 52 33 42 C32 30 38 20 50 20Z"
        className="sec-c1"
      />
      {/* ciuffo bianco in testa */}
      <path d="M44 23 C44 17 49 15 50 20 C52 14 58 16 56 23 C53 21 47 21 44 23Z" className="sec-c3 sec-sottile" />
      {/* occhi da nonna: palpebre a metà, una ruga sotto */}
      {occhio(42, 43, 3.8)}
      {occhio(58, 43, 3.8)}
      <path d="M37.4 43.2 A4.6 4.6 0 0 1 46.6 43.2Z M53.4 43.2 A4.6 4.6 0 0 1 62.6 43.2Z" className="sec-f1" />
      <path d="M37.2 43.2 L46.8 43.2 M53.2 43.2 L62.8 43.2" className="sec-linea sec-fine" />
      <path d="M38.6 49 Q42 50.6 45.4 49 M54.6 49 Q58 50.6 61.4 49" className="sec-linea sec-fine sec-tenue" />
      <ellipse cx={50} cy={59} rx={9} ry={7} className="sec-f2" />
      <path d="M46.6 57 q0.8 1.6 -0.4 2.6 M53.4 57 q-0.8 1.6 0.4 2.6" className="sec-linea sec-fine" />
      {/* mascella e barbetta: masticano sempre, di lato */}
      <g className="sec-mascella" style={perno(50, 66)}>
        <path d="M44 71 C42 77 45 84 50 87 C55 84 58 77 56 71 C52 73.6 48 73.6 44 71Z" className="sec-c3" />
        <path d="M48 76 L49 82 M52 76 L51 82" className="sec-linea sec-fine sec-tenue" />
        <path d="M42 65 C42 71 46 74.6 50 74.6 C54 74.6 58 71 58 65 C55 67.4 45 67.4 42 65Z" className="sec-c1" />
      </g>
      <path d="M44 65.6 Q50 68.6 56 65.6" className="sec-linea sec-fine" />
    </>
  );
}

/** Gufo: grigio, ciuffi a orecchie, due occhi gialli enormi che ogni tanto sbattono */
function Gufo() {
  return (
    <>
      <path d="M30 28 L21 7 L43 19Z" className="sec-c2" />
      <path d="M70 28 L79 7 L57 19Z" className="sec-c2" />
      <path d="M50 14 C70 14 81 30 81 52 C81 74 68 88 50 88 C32 88 19 74 19 52 C19 30 30 14 50 14Z" className="sec-c1" />
      <ellipse cx={50} cy={71} rx={18} ry={15} className="sec-f3" />
      <path
        d="M41 64 l3 3 l3 -3 M53 64 l3 3 l3 -3 M47 72 l3 3 l3 -3 M38 73 l3 3 l3 -3 M56 73 l3 3 l3 -3 M44 80 l3 3 l3 -3 M50 80 l3 3 l3 -3"
        className="sec-linea sec-fine sec-tenue"
      />
      <path d="M20 47 C11 60 13 77 26 86 C30 72 30 58 20 47Z" className="sec-c2" />
      <path d="M80 47 C89 60 87 77 74 86 C70 72 70 58 80 47Z" className="sec-c2" />
      <circle cx={37} cy={42} r={15.5} className="sec-f3" />
      <circle cx={63} cy={42} r={15.5} className="sec-f3" />
      <circle cx={37} cy={42} r={11.5} className="sec-giallo" />
      <circle cx={63} cy={42} r={11.5} className="sec-giallo" />
      {occhio(38, 43, 5.6)}
      {occhio(64, 43, 5.6)}
      <circle cx={37} cy={42} r={12.6} className="sec-palpebra sec-c1" style={perno(37, 29.4)} />
      <circle cx={63} cy={42} r={12.6} className="sec-palpebra sec-c1" style={perno(63, 29.4)} />
      {/* becco: la parte di sotto scende quando parla */}
      <path d="M46.6 55 L53.4 55 L50 60.4Z" className="sec-pieno" />
      <g className="sec-giu">
        <path d="M47 57 L53 57 L50 62Z" className="sec-c3 sec-sottile" />
      </g>
      <path d="M44.6 51 Q50 49 55.4 51 L50 60Z" className="sec-c3 sec-sottile" />
      <path d="M38 87 l-2 5 M42 88 l0 5 M46 87 l2 5 M54 87 l-2 5 M58 88 l0 5 M62 87 l2 5" className="sec-unghie" />
    </>
  );
}

/** Grillo: verde scuro, antenne lunghe, zampe da salto con le ginocchia alte, una chitarrina */
function Grillo() {
  const tibie = 'M24 43 L31 89 M76 43 L69 89';
  return (
    <>
      <g className="sec-antenne" style={perno(50, 22)}>
        <path d="M45 21 C40 8 28 2 15 6 M55 21 C60 8 72 2 85 6" className="sec-linea" />
      </g>
      <path d={tibie} className="sec-bordo" />
      <path d={tibie} className="sec-arto sec-arto-2" />
      <path d="M26 91 L37 91 M63 91 L74 91" className="sec-linea" />
      <path d="M42 68 C31 62 21 52 21 43 C21 37 27 36 29 41 C33 50 39 55 46 59Z" className="sec-c2" />
      <path d="M58 68 C69 62 79 52 79 43 C79 37 73 36 71 41 C67 50 61 55 54 59Z" className="sec-c2" />
      <path d="M45 85 L44 92 M55 85 L56 92" className="sec-linea" />
      <path d="M50 40 C60 40 64 52 63 64 C62 78 58 88 50 88 C42 88 38 78 37 64 C36 52 40 40 50 40Z" className="sec-c1" />
      <path d="M42 74 Q50 77 58 74 M43 81 Q50 84 57 81" className="sec-linea sec-fine sec-tenue" />
      <g className="sec-cenno-testa" style={perno(50, 42)}>
        <ellipse cx={50} cy={30} rx={15} ry={13} className="sec-c1" />
        {occhio(44, 28.6, 4.4, 5)}
        {occhio(56, 28.6, 4.4, 5)}
        {bocca('M46 36.6 Q50 39.6 54 36.6', 50, 37.8, 2.6, 2.2)}
      </g>
      {/* chitarrina in diagonale, il manico verso destra */}
      <g transform="rotate(42 50 66)">
        <rect x={48} y={33} width={4} height={20} rx={1} className="sec-c4" />
        <rect x={46.6} y={29} width={6.8} height={6} rx={1.6} className="sec-c4" />
        <path
          d="M50 50 C55 50 57 54 56 57 C62 59 61 79 50 79 C39 79 38 59 44 57 C43 54 45 50 50 50Z"
          className="sec-c3"
        />
        <circle cx={50} cy={64} r={3} className="sec-pieno" />
        <rect x={46.4} y={71} width={7.2} height={2} rx={1} className="sec-pieno" />
        <path d="M49 34 L49 72 M51 34 L51 72" className="sec-corde" />
      </g>
      {/* braccia: una tiene il manico, l'altra pizzica le corde */}
      <path d="M58 52 C64 52 67 50 67 46" className="sec-linea" />
      <g className="sec-pizzica" style={perno(41, 54)}>
        <path d="M41 54 C35 58 36 64 44 66" className="sec-linea" />
      </g>
    </>
  );
}

/** Briciola, il gatto tigrato: seduto, righe sulla fronte e sui fianchi, la coda che va */
function Briciola() {
  return (
    <>
      <g className="sec-coda" style={perno(64, 84)}>
        <path d="M60 86 C78 90 92 78 90 62 C89 54 85 48 80 47 C77 49 79 53 81 58 C84 70 76 79 60 79Z" className="sec-c1" />
        <path d="M83 58 l6 -2 M85 68 l6 1 M79 78 l4 4" className="sec-righe" />
      </g>
      <path d="M33 90 C29 76 32 60 40 52 L60 52 C68 60 71 76 67 90Z" className="sec-c1" />
      <path d="M33 68 Q38 68 40 72 M67 68 Q62 68 60 72 M32 78 Q37 78 39 82 M68 78 Q63 78 61 82" className="sec-righe" />
      <ellipse cx={50} cy={70} rx={8} ry={12} className="sec-f3" />
      <ellipse cx={43} cy={89} rx={5.6} ry={3.6} className="sec-c3" />
      <ellipse cx={57} cy={89} rx={5.6} ry={3.6} className="sec-c3" />
      <g className="sec-cenno-testa" style={perno(50, 60)}>
        <path d="M28 38 L27 12 L46 25Z" className="sec-c1" />
        <path d="M31 32 L31 19 L41 26Z" className="sec-f4" />
        <path d="M72 38 L73 12 L54 25Z" className="sec-c1" />
        <path d="M69 32 L69 19 L59 26Z" className="sec-f4" />
        <path d="M50 22 C66 22 75 31 75 42 C75 54 64 61 50 61 C36 61 25 54 25 42 C25 31 34 22 50 22Z" className="sec-c1" />
        <path d="M44 24 L45.5 31 M50 22.5 L50 30 M56 24 L54.5 31" className="sec-righe" />
        <path d="M25.6 43 L32 44 M26.6 49 L32 48 M74.4 43 L68 44 M73.4 49 L68 48" className="sec-righe" />
        <path d="M40 52 C40 46 46 46 50 49 C54 46 60 46 60 52 C60 57 55 59 50 58 C45 59 40 57 40 52Z" className="sec-f3" />
        {occhio(40, 41, 4.2, 5)}
        {occhio(60, 41, 4.2, 5)}
        <path d="M47.4 48.4 L52.6 48.4 L50 51.4Z" className="sec-c4 sec-sottile" />
        <path d="M50 51.4 L50 53" className="sec-linea sec-fine" />
        {bocca('M45.6 53 Q47.8 55.6 50 53 Q52.2 55.6 54.4 53', 50, 55, 2.4, 2.4)}
        <path d="M38 52 L27 50 M38 55 L28 56.4 M62 52 L73 50 M62 55 L72 56.4" className="sec-linea sec-fine sec-tenue" />
      </g>
    </>
  );
}

const DISEGNI: Record<Secondario, { vb: [number, number]; terra: boolean; disegno: () => ReactNode }> = {
  fischio: { vb: [100, 100], terra: false, disegno: Fischio },
  pinza: { vb: [100, 100], terra: true, disegno: Pinza },
  nuvola: { vb: [100, 100], terra: true, disegno: Nuvola },
  nonnacapra: { vb: [100, 100], terra: true, disegno: NonnaCapra },
  gufo: { vb: [100, 100], terra: false, disegno: Gufo },
  grillo: { vb: [100, 100], terra: true, disegno: Grillo },
  briciola: { vb: [100, 100], terra: true, disegno: Briciola },
};

export function PersonaggioSecondario({
  id,
  parla = false,
  taglia = 96,
  entrata = false,
}: {
  id: Secondario;
  parla?: boolean;
  taglia?: number;
  entrata?: boolean;
}) {
  const { vb, terra, disegno } = DISEGNI[id];
  const [w, h] = vb;
  const classi = ['secondario', `sec-${id}`, parla && 'sec-parla', entrata && 'sec-entra'].filter(Boolean).join(' ');
  return (
    <span className={classi} role="img" aria-label={NOMI_SECONDARI[id]} style={{ width: taglia }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={taglia} height={(taglia * h) / w} aria-hidden="true" focusable="false">
        <g className="sec-entrata" style={perno(w / 2, h - 4)}>
          {terra && <ellipse cx={w / 2} cy={h - 5} rx={w * 0.27} ry={2.6} className="sec-terra" />}
          <g className="sec-cenno" style={perno(w / 2, h - 4)}>
            <g className="sec-idle" style={perno(w / 2, h - 4)}>
              {disegno()}
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}
