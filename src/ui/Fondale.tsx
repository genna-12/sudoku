// I fondali ("quinte") dei luoghi della storia, dietro la schermata del capitolo.
// <Fondale luogo="mare" />  ·  <Fondale luogo="oltre" fondale="treno" notte={false} />
//   - variante: `fondale` se c'è, altrimenti `luogo`; 'aiuola' → giardino; sconosciuto → giardino
//   - viewBox 360×640 (telefono verticale). Il disegno scala sull'altezza (mai meno largo di 360 px) e il
//     suolo (y 448) cade sempre su --cap-suolo (70%, come il palco): sui telefoni stretti i bordi si
//     tagliano, sugli schermi larghi e in orizzontale i lati si riempiono di cielo e terra (fondale.css);
//     tutto ciò che conta sta fra x 40 e 320
//   - il palco: suolo a y 448 (70%); sotto y 416 niente sagome alte, solo terra e cose basse a contrasto debole
//   - giardino: cielo, prato, ciuffi e lucciole (sopra si monta la Scena della Home, intera)
//   - notte (default true) cambia il cielo; cucina e laboratorio sono interni e la ignorano
// Tinte in fondale.css (--fd-*, ricavate dal tema con color-mix); verde e blu solo in fili e punti.
import { useId } from 'react';
import './fondale.css';

export type Fondale =
  | 'giardino'
  | 'mare'
  | 'montagna'
  | 'bosco'
  | 'citta'
  | 'cucina'
  | 'lontano'
  | 'treno'
  | 'piazza'
  | 'laboratorio'
  | 'stazione';

const FONDALI: readonly Fondale[] = ['giardino', 'mare', 'montagna', 'bosco', 'citta', 'cucina', 'lontano', 'treno', 'piazza', 'laboratorio', 'stazione'];
const INTERNI: readonly Fondale[] = ['cucina', 'laboratorio'];

/** la variante da disegnare: `fondale` vince su `luogo`; 'aiuola' è il giardino; sconosciuto → giardino */
export function scegliFondale(luogo: string, fondale?: string): Fondale {
  const v = (fondale || luogo || '').trim().toLowerCase();
  if (v === 'aiuola') return 'giardino';
  return (FONDALI as readonly string[]).includes(v) ? (v as Fondale) : 'giardino';
}

/* ------------------------------------------------------------ pezzi comuni */

/** stelle in posizioni fisse (le ultime tre blu: un dettaglio, non un blocco) */
const STELLE: Array<[number, number, number]> = [
  [28, 46, 1.3], [74, 92, 1], [118, 38, 1.5], [162, 120, 0.9], [204, 64, 1.2], [246, 30, 1], [298, 84, 1.4],
  [336, 52, 1], [52, 160, 0.9], [140, 196, 1], [226, 168, 0.8], [318, 150, 1.1], [94, 236, 0.8], [270, 222, 0.9],
  [186, 22, 1.6], [12, 118, 1.1], [346, 196, 1.3],
];
function Stelle({ fino = 640 }: { fino?: number }) {
  return (
    <g className="fd-stelle">
      {STELLE.filter(([, y]) => y < fino).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} className={i >= STELLE.length - 3 ? 'fd-stella-blu' : 'fd-stella'} />
      ))}
    </g>
  );
}

/** falce di luna (cerchio meno un cerchio spostato) */
function Luna({ x, y, r, id }: { x: number; y: number; r: number; id: string }) {
  return (
    <g>
      <mask id={`fd-luna-${id}`}>
        <rect x={x - r - 2} y={y - r - 2} width={2 * r + 4} height={2 * r + 4} fill="#fff" />
        <circle cx={x + r * 0.45} cy={y - r * 0.25} r={r} fill="#000" />
      </mask>
      <circle cx={x} cy={y} r={r} mask={`url(#fd-luna-${id})`} className="fd-luna" />
    </g>
  );
}

/** cielo a gradiente (alto → orizzonte a `o`), con stelle e luna di notte */
function Cielo({ id, o, notte, luna }: { id: string; o: number; notte: boolean; luna?: [number, number] }) {
  return (
    <>
      <linearGradient id={`fd-cielo-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fd-cielo-0" />
        <stop offset={o} className="fd-cielo-1" />
        <stop offset="1" className="fd-cielo-1" />
      </linearGradient>
      <rect width="360" height="640" fill={`url(#fd-cielo-${id})`} />
      {notte && <Stelle fino={o * 640 - 30} />}
      {notte && luna && <Luna x={luna[0]} y={luna[1]} r={13} id={id} />}
    </>
  );
}

type P = { id: string; notte: boolean };

/* ------------------------------------------------------------ i luoghi */

/** lucciole del prato (giardino): poche, basse, sfasate */
const LUCCIOLE_PRATO: Array<[number, number, number]> = [
  [62, 492, 0], [118, 556, 1.4], [206, 600, 2.6], [262, 520, 0.8], [312, 578, 2], [150, 470, 3.1],
];
/** ciuffi d'erba in primo piano (giardino): [x, y, scala] */
const CIUFFI_PRATO: Array<[number, number, number]> = [
  [34, 560, 1], [88, 618, 1.3], [172, 540, 0.8], [228, 632, 1.2], [296, 552, 1], [338, 610, 1.3], [128, 590, 0.9], [262, 590, 0.8],
];

/**
 * giardino: niente panorama (sopra va la Scena, intera, col prato al 70%): cielo di notte con stelle e
 * luna, chiarore all'orizzonte, prato con le tinte della Scena, ciuffi e lucciole in primo piano
 */
function Giardino({ id, notte }: P) {
  return (
    <>
      <Cielo id={id} o={0.66} notte={notte} luna={[268, 176]} />
      <linearGradient id={`fd-chiarore-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fd-chiarore-0" />
        <stop offset="1" className="fd-chiarore-1" />
      </linearGradient>
      <rect y="250" width="360" height="190" fill={`url(#fd-chiarore-${id})`} className={notte ? undefined : 'fd-giorno-piano'} />
      <path d="M0 436C80 424 150 428 200 432S310 438 360 428V640H0Z" className="fd-prato" />
      <path d="M0 436C80 424 150 428 200 432S310 438 360 428" className="fd-filo-verde" />
      <g className="fd-ciuffi">
        {CIUFFI_PRATO.map(([x, y, k], i) => (
          <path
            key={i}
            d={`M${x} ${y}q${-2 * k} ${-6 * k} ${-6 * k} ${-9 * k}M${x} ${y}q${0.5 * k} ${-8 * k} ${-0.5 * k} ${-12 * k}M${x} ${y}q${2 * k} ${-5 * k} ${6 * k} ${-8 * k}`}
          />
        ))}
      </g>
      {notte && (
        <g className="fd-lucciole">
          {LUCCIOLE_PRATO.map(([x, y, d], i) => (
            <g key={i} className="fd-lucciola" style={{ animationDelay: `-${d}s` }}>
              <circle cx={x} cy={y} r="5" className="fd-lucciola-alone" />
              <circle cx={x} cy={y} r="1.6" className="fd-lucciola-punto" />
            </g>
          ))}
        </g>
      )}
    </>
  );
}

function Mare({ id, notte }: P) {
  const onde = (y: number, a: number) =>
    `M-40 ${y}` + `q10 ${-a} 20 0t20 0`.repeat(11);
  return (
    <>
      <Cielo id={id} o={0.47} notte={notte} luna={[262, 150]} />
      <linearGradient id={`fd-mare-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fd-mare-0" />
        <stop offset="1" className="fd-mare-1" />
      </linearGradient>
      <rect y="300" width="360" height="140" fill={`url(#fd-mare-${id})`} />
      <path d="M0 300.5H360" className="fd-orizzonte" />
      {notte && (
        <g className="fd-riflesso">
          {[312, 326, 342, 360, 382].map((y, i) => (
            <rect key={y} x={252 - i * 1.5} y={y} width={20 + i * 3} height="1.6" rx="0.8" />
          ))}
        </g>
      )}
      <path d={onde(334, 2.5)} className="fd-onda fd-onda-lontana" />
      <path d={onde(372, 4)} className="fd-onda fd-onda-vicina" />
      <path d={onde(372, 4)} className="fd-onda fd-onda-vicina fd-filo-verde-onda" />
      {/* riva: sabbia dal basso, un po' in diagonale */}
      <path d="M0 448C90 432 200 420 360 404V640H0Z" className="fd-sabbia" />
      <path d="M0 448C90 432 200 420 360 404" className="fd-schiuma-riva" />
      {/* muretto a destra, basso, sulla sabbia */}
      <g className="fd-muretto">
        <path d="M244 420L360 404V432L244 440Z" className="fd-muretto-faccia" />
        <path d="M244 420L360 404" className="fd-muretto-cima" />
        <path d="M272 416V437M302 412V434M332 408V431M258 428L360 416" className="fd-muretto-giunti" />
      </g>
    </>
  );
}

function Montagna({ id, notte }: P) {
  return (
    <>
      <Cielo id={id} o={0.5} notte={notte} luna={[86, 118]} />
      {/* cima lontana (sinistra) e cima vicina (destra), con neve */}
      <path d="M-20 360L70 250L118 196L150 220L196 168L262 262L320 330L380 372V440H-20Z" className="fd-lontano" />
      <path d="M118 196L150 220L196 168L222 205L206 200L194 214L176 206L156 230L136 214L104 214Z" className="fd-neve" />
      <path d="M120 440L218 330L264 268L292 238L322 270L352 300L390 340V440Z" className="fd-medio" />
      <path d="M264 268L292 238L322 270L312 268L300 282L286 270L272 284Z" className="fd-neve" />
      <path d="M218 330L264 268L292 238L322 270L352 300" className="fd-alone-blu" />
      {/* la baita piccola sul pendio, con la finestra accesa */}
      <g className="fd-baita">
        <path d="M256 330H286V352H256Z" className="fd-baita-muro" />
        <path d="M251 332L271 316L291 332Z" className="fd-baita-tetto" />
        <rect x="267" y="337" width="7" height="7" className="fd-finestra-accesa" />
      </g>
      {/* prato d'alta quota */}
      <path d="M-20 446C60 420 140 424 220 432S330 430 380 420V640H-20Z" className="fd-suolo" />
      <path d="M-20 446C60 420 140 424 220 432S330 430 380 420" className="fd-filo-verde" />
      {/* ometto di sassi a sinistra */}
      <g className="fd-sassi">
        <ellipse cx="62" cy="430" rx="15" ry="6" />
        <ellipse cx="63" cy="420" rx="11" ry="5" />
        <ellipse cx="61" cy="411.5" rx="8" ry="4.2" />
        <ellipse cx="62.5" cy="404.5" rx="5" ry="3.2" />
      </g>
    </>
  );
}

function Bosco({ id, notte }: P) {
  const lucciole: Array<[number, number, number]> = [
    [70, 330, 0], [128, 268, 1.3], [176, 372, 2.4], [236, 300, 0.7], [292, 360, 1.9], [104, 400, 3], [258, 232, 2.8], [196, 210, 1.6],
  ];
  return (
    <>
      <Cielo id={id} o={0.6} notte={notte} />
      <linearGradient id={`fd-banda-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fd-banda-0" />
        <stop offset="0.6" className="fd-banda-1" />
        <stop offset="1" className="fd-banda-0" />
      </linearGradient>
      <rect y="250" width="360" height="190" fill={`url(#fd-banda-${id})`} />
      {/* tronchi lontani (chiari) e vicini (scuri) */}
      <g className="fd-lontano">
        <rect x="112" y="0" width="9" height="440" />
        <rect x="236" y="0" width="7" height="440" />
        <rect x="170" y="0" width="5" height="440" />
      </g>
      <g className="fd-tronco">
        <path d="M26 -10H50L54 444H22Z" />
        <path d="M80 -10H92L94 442H78Z" />
        <path d="M282 -10H304L308 440H278Z" />
        <path d="M326 -10H352L356 446H322Z" />
        {/* il ramo alto (per Gufo e Fischio) */}
        <path d="M284 232C250 226 214 230 182 238L184 243C214 236 250 233 284 240Z" />
      </g>
      {/* sottobosco ondulato */}
      <path d="M-10 440C20 424 40 432 64 426S110 420 140 432S200 420 236 430S300 418 330 428S360 426 370 430V640H-10Z" className="fd-suolo" />
      {/* tronco caduto in primo piano, basso */}
      <g className="fd-tronco-caduto">
        <path d="M-10 590C60 580 150 576 226 582L230 612C150 608 60 612 -10 618Z" />
        <ellipse cx="228" cy="597" rx="9" ry="15" className="fd-tronco-taglio" />
      </g>
      <g className="fd-lucciole">
        {lucciole.map(([x, y, d], i) => (
          <g key={i} className="fd-lucciola" style={{ animationDelay: `-${d}s` }}>
            <circle cx={x} cy={y} r="5" className="fd-lucciola-alone" />
            <circle cx={x} cy={y} r="1.6" className="fd-lucciola-punto" />
          </g>
        ))}
      </g>
    </>
  );
}

function Citta({ id, notte }: P) {
  // palazzi: [x, cima, larghezza]
  const palazzi: Array<[number, number, number]> = [
    [-10, 250, 58], [44, 300, 46], [86, 214, 52], [134, 280, 40], [170, 236, 56], [222, 296, 38], [256, 222, 54], [306, 268, 64],
  ];
  const finestre: Array<[number, number, string?]> = [
    [10, 272], [26, 300, 'fd-accende'], [100, 236], [116, 264], [100, 292], [186, 258], [204, 286, 'fd-accende fd-ritardo'], [186, 314],
    [148, 302], [270, 244], [286, 272], [322, 290], [338, 318], [58, 320],
  ];
  return (
    <>
      <Cielo id={id} o={0.62} notte={notte} luna={[300, 70]} />
      {/* i fili del tram */}
      <path d="M-10 108C100 136 240 136 370 104M-10 120C100 148 240 148 370 116" className="fd-filo" />
      <g className="fd-palazzi">
        {palazzi.map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height={440 - y} />
        ))}
      </g>
      {finestre.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="8" height="11" className={`fd-finestra-accesa ${c ?? ''}`} />
      ))}
      <rect x="270" y="300" width="8" height="11" className="fd-finestra-blu" />
      {/* piccola insegna col filo verde */}
      <rect x="176" y="356" width="34" height="12" rx="2" className="fd-insegna" />
      {/* marciapiede */}
      <path d="M-10 440H370V640H-10Z" className="fd-strada" />
      <path d="M-10 440.5H370" className="fd-bordo-strada" />
      {/* lampione a sinistra con il cono di luce */}
      <path d="M58 300L22 448H112Z" className="fd-cono" />
      <path d="M56 446V306C56 296 62 292 70 292" className="fd-palo" />
      <path d="M62 300H78L74 292H66Z" className="fd-lampada" />
    </>
  );
}

/** cucina (sera, interno): parete, una finestra sul mare e una sulla montagna, frigo col 9, tavolo davanti */
function Cucina({ id }: { id: string }) {
  return (
    <>
      <linearGradient id={`fd-muro-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" className="fd-muro-0" />
        <stop offset="1" className="fd-muro-1" />
      </linearGradient>
      <rect width="360" height="640" fill={`url(#fd-muro-${id})`} />
      <clipPath id={`fd-vetri-${id}`}>
        <rect x="56" y="150" width="88" height="104" rx="4" />
        <rect x="164" y="150" width="88" height="104" rx="4" />
      </clipPath>
      <g clipPath={`url(#fd-vetri-${id})`}>
        <rect x="50" y="146" width="210" height="112" className="fd-vetro-cielo" />
        <circle cx="72" cy="168" r="1.2" className="fd-stella" />
        <circle cx="236" cy="172" r="1.2" className="fd-stella-blu" />
        {/* mare a sinistra, montagna a destra */}
        <rect x="56" y="214" width="88" height="40" className="fd-vetro-mare" />
        <path d="M60 228q7 -2.5 14 0t14 0t14 0t14 0t14 0t14 0" className="fd-onda fd-onda-ferma" />
        <path d="M164 254L196 206L214 222L232 196L252 220V254Z" className="fd-lontano" />
        <path d="M226 205L232 196L240 206L235 204L231 208Z" className="fd-neve" />
      </g>
      <path d="M56 150h88v104h-88zM100 150v104M164 150h88v104h-88zM208 150v104" className="fd-telaio" />
      <rect x="50" y="254" width="208" height="7" rx="2" className="fd-davanzale" />
      {/* frigo a destra con la calamita del 9 */}
      <rect x="262" y="236" width="66" height="208" rx="8" className="fd-frigo" />
      <path d="M262 312H328M270 260V292M270 322V372" className="fd-frigo-segni" />
      <circle cx="302" cy="282" r="9" className="fd-calamita" />
      <text x="302" y="286.5" textAnchor="middle" className="fd-nove">9</text>
      {/* pavimento */}
      <path d="M0 440H360V640H0Z" className="fd-pavimento" />
      <path d="M0 440.5H360" className="fd-zoccolo" />
      {/* tavolo in primo piano, con le due tazze */}
      <path d="M-10 548H370V640H-10Z" className="fd-tavolo" />
      <path d="M-10 548.5H370" className="fd-tavolo-luce" />
      <g className="fd-tazza">
        <path d="M232 524h18v18q0 6 -6 6h-6q-6 0 -6 -6z" />
        <path d="M250 529q7 0 7 6t-7 6" className="fd-manico" />
        <path d="M232 524h18" className="fd-filo-verde" />
      </g>
      <g className="fd-tazza">
        <path d="M268 524h18v18q0 6 -6 6h-6q-6 0 -6 -6z" />
        <path d="M286 529q7 0 7 6t-7 6" className="fd-manico" />
        <path d="M268 524h18" className="fd-filo-blu" />
      </g>
    </>
  );
}

/** oltre la montagna: una città lontana dietro una collina e un binario che ci porta */
function Lontano({ id, notte }: P) {
  const case_: Array<[number, number, number]> = [[192, 318, 10], [204, 306, 8], [214, 322, 12], [228, 300, 7], [237, 314, 11], [250, 324, 9], [261, 310, 8]];
  return (
    <>
      <Cielo id={id} o={0.56} notte={notte} luna={[70, 96]} />
      <path d="M-20 330L60 286L120 316L170 296L220 330H-20Z" className="fd-lontano" />
      <g className="fd-medio">
        {case_.map(([x, y, w]) => (
          <rect key={x} x={x} y={y} width={w} height={360 - y} />
        ))}
      </g>
      <rect x="230" y="306" width="2.5" height="3" className="fd-finestra-accesa" />
      <rect x="207" y="312" width="2.5" height="3" className="fd-finestra-accesa" />
      <rect x="253" y="330" width="2.5" height="3" className="fd-finestra-blu-piena" />
      {/* la collina davanti */}
      <path d="M-20 446C40 400 120 352 206 344S330 370 380 392V640H-20Z" className="fd-suolo" />
      <path d="M-20 446C40 400 120 352 206 344S330 370 380 392" className="fd-filo-verde" />
      {/* il binario: dalla città fino al bordo basso, in prospettiva */}
      <g className="fd-binario">
        <path d="M196 346L120 646M212 346L250 646" className="fd-rotaia" />
        {[360, 384, 414, 452, 500, 562, 630].map((y, i) => {
          const t = (y - 346) / 300;
          return <path key={y} d={`M${196 - 76 * t - 3 - i} ${y}H${212 + 38 * t + 3 + i}`} className="fd-traversina" />;
        })}
      </g>
    </>
  );
}

/** treno: un finestrino grande; dentro il paesaggio scorre piano (due strati) */
function Treno({ id, notte }: P) {
  const colline = 'M0 300C40 262 80 268 120 286S200 250 240 270S300 290 320 280V330H0Z';
  const monti = 'M0 250L60 200L100 226L160 182L220 232L270 206L320 250V330H0Z';
  const pali = [20, 100, 180, 260];
  return (
    <>
      <rect width="360" height="640" className="fd-vagone" />
      <clipPath id={`fd-finestrino-${id}`}>
        <rect x="34" y="120" width="292" height="214" rx="26" />
      </clipPath>
      <g clipPath={`url(#fd-finestrino-${id})`}>
        <Cielo id={id} o={0.42} notte={notte} luna={[268, 160]} />
        <g className="fd-scorre fd-scorre-lento">
          {[0, 320, 640].map((x) => (
            <path key={x} d={monti} transform={`translate(${x})`} className="fd-lontano" />
          ))}
        </g>
        <g className="fd-scorre">
          {[0, 320, 640].map((x) => (
            <g key={x} transform={`translate(${x})`}>
              <path d={colline} className="fd-suolo" />
              {pali.map((p) => (
                <path key={p} d={`M${p} 334V272M${p - 6} 278H${p + 6}`} className="fd-palo-linea" />
              ))}
              <path d="M0 278C20 284 60 284 80 278S140 284 160 278S220 284 240 278S300 284 320 278" className="fd-filo" />
            </g>
          ))}
        </g>
      </g>
      <rect x="34" y="120" width="292" height="214" rx="26" className="fd-cornice" />
      <path d="M48 128H312" className="fd-riflesso-vetro" />
      {/* mensolina sotto il finestrino e il sedile */}
      <rect x="22" y="342" width="316" height="10" rx="3" className="fd-mensola" />
      <path d="M-10 440H370V640H-10Z" className="fd-pavimento" />
      <path d="M-10 440.5H370" className="fd-zoccolo" />
      <path d="M26 342.5H334" className="fd-filo-verde" />
    </>
  );
}

/** piazza: portici sul fondo e una fontana storta */
function Piazza({ id, notte }: P) {
  const archi = [12, 72, 132, 192, 252, 312];
  return (
    <>
      <Cielo id={id} o={0.5} notte={notte} luna={[290, 86]} />
      {/* la facciata coi portici */}
      <path d="M-10 236H370V440H-10Z" className="fd-facciata" />
      <path d="M-10 222H370V236H-10Z" className="fd-cornicione" />
      {archi.map((x) => (
        <g key={x}>
          <path d={`M${x} 440V376A22 22 0 0 1 ${x + 44} 376V440Z`} className="fd-arco" />
          <rect x={x + 16} y="268" width="12" height="22" rx="6" className="fd-finestra-piazza" />
        </g>
      ))}
      <rect x="148" y="268" width="12" height="22" rx="6" className="fd-finestra-accesa" />
      <rect x="268" y="268" width="12" height="22" rx="6" className="fd-finestra-blu" />
      <path d="M-10 440H370V640H-10Z" className="fd-selciato" />
      <path d="M-10 440.5H370M-10 470H370M-10 520H370" className="fd-selciato-righe" />
      {/* la fontana, un po' storta */}
      <g transform="rotate(-5 180 432)" className="fd-fontana">
        <ellipse cx="180" cy="430" rx="48" ry="9" className="fd-vasca" />
        <rect x="132" y="414" width="96" height="16" className="fd-vasca" />
        <ellipse cx="180" cy="414" rx="48" ry="8" className="fd-vasca-bordo" />
        <rect x="176" y="372" width="8" height="42" className="fd-vasca" />
        <path d="M160 372H200Q196 382 180 382T160 372Z" className="fd-vasca" />
        <path d="M180 368C176 356 170 352 164 354M180 368C184 356 190 352 196 354" className="fd-acqua" />
      </g>
    </>
  );
}

/** laboratorio (interno): finestra, banco con le provette, il microscopio e la beuta col filo blu */
function Laboratorio({ id }: { id: string }) {
  return (
    <>
      <rect width="360" height="640" className="fd-muro-lab" />
      <path d="M0 196H360" className="fd-mensola-lab" />
      <rect x="36" y="180" width="18" height="16" rx="2" className="fd-barattolo" />
      <rect x="60" y="184" width="14" height="12" rx="2" className="fd-barattolo" />
      <rect x="292" y="176" width="24" height="20" rx="2" className="fd-barattolo" />
      <clipPath id={`fd-vetro-lab-${id}`}>
        <rect x="128" y="132" width="104" height="132" rx="4" />
      </clipPath>
      <g clipPath={`url(#fd-vetro-lab-${id})`}>
        <rect x="120" y="128" width="120" height="140" className="fd-vetro-cielo" />
        <path d="M120 268L156 226L182 244L206 214L240 252V268Z" className="fd-lontano" />
      </g>
      <path d="M128 132h104v132h-104zM180 132v132M128 198h104" className="fd-telaio" />
      {/* il banco: piano all'altezza dei fianchi, si sta davanti */}
      <rect x="-10" y="404" width="380" height="10" className="fd-banco-piano" />
      <path d="M-10 414H370V448H-10Z" className="fd-banco" />
      <path d="M-10 404.5H370" className="fd-tavolo-luce" />
      {/* provette nel portaprovette, a sinistra */}
      <g className="fd-provette">
        {[44, 56, 68, 80].map((x, i) => (
          <g key={x}>
            <rect x={x} y={366 + (i % 2) * 4} width="6" height={36 - (i % 2) * 4} rx="3" className="fd-vetro" />
            <rect x={x + 1} y={388} width="4" height="12" rx="2" className={i === 2 ? 'fd-liquido-verde' : 'fd-liquido'} />
          </g>
        ))}
        <rect x="38" y="384" width="56" height="5" rx="1.5" className="fd-supporto" />
        <rect x="38" y="398" width="56" height="6" rx="1.5" className="fd-supporto" />
      </g>
      {/* beuta col filo blu */}
      <path d="M126 370h8v12l12 20h-32l12-20z" className="fd-vetro" />
      <path d="M118 396h24l3 6h-30z" className="fd-liquido" />
      <path d="M126 370h8" className="fd-filo-blu" />
      {/* microscopio, a destra */}
      <g className="fd-microscopio">
        <rect x="262" y="398" width="44" height="6" rx="2" />
        <path d="M296 398V360Q296 346 284 342L278 352Q286 356 286 364V398Z" />
        <rect x="268" y="330" width="10" height="34" rx="3" transform="rotate(-24 273 347)" />
        <rect x="266" y="378" width="30" height="4" rx="1.5" />
      </g>
      <path d="M-10 448H370V640H-10Z" className="fd-pavimento" />
    </>
  );
}

/** stazione: la pensilina, l'orologio appeso e il binario dietro al marciapiede */
function Stazione({ id, notte }: P) {
  return (
    <>
      <Cielo id={id} o={0.6} notte={notte} luna={[236, 300]} />
      <path d="M-10 404L40 370L90 384L150 360L220 380L280 362L370 390V404Z" className="fd-lontano" />
      {/* il binario oltre il marciapiede */}
      <path d="M-10 404H370V432H-10Z" className="fd-massicciata" />
      <path d="M-10 412H370M-10 424H370" className="fd-rotaia" />
      {/* il marciapiede: la linea gialla è l'unico tocco caldo */}
      <path d="M-10 432H370V640H-10Z" className="fd-marciapiede" />
      <path d="M-10 432.5H370" className="fd-bordo-strada" />
      <path d="M-10 442H370" className="fd-linea-gialla" />
      {/* pensilina: tetto in alto e due pilastri */}
      <path d="M-10 -10H370V84L340 96H20L-10 84Z" className="fd-pensilina" />
      <path d="M20 96.5H340" className="fd-tavolo-luce" />
      <rect x="40" y="96" width="10" height="352" className="fd-pilastro" />
      <rect x="310" y="96" width="10" height="352" className="fd-pilastro" />
      {/* orologio appeso */}
      <path d="M180 96V112" className="fd-palo-linea" />
      <circle cx="180" cy="134" r="22" className="fd-orologio-cassa" />
      <circle cx="180" cy="134" r="18" className="fd-orologio" />
      <path d="M180 134V121M180 134L190 139" className="fd-lancette" />
      <circle cx="180" cy="134" r="1.6" className="fd-filo-verde-pieno" />
      {/* cartello del binario */}
      <rect x="62" y="116" width="34" height="18" rx="3" className="fd-cartello" />
      <path d="M69 122H89M69 128H82" className="fd-cartello-righe" />
    </>
  );
}

const DISEGNI: Record<Exclude<Fondale, 'cucina' | 'laboratorio'>, (p: P) => React.JSX.Element> = {
  giardino: Giardino,
  mare: Mare,
  montagna: Montagna,
  bosco: Bosco,
  citta: Citta,
  lontano: Lontano,
  treno: Treno,
  piazza: Piazza,
  stazione: Stazione,
};

export function Fondale({ luogo, fondale, notte = true }: { luogo: string; fondale?: string; notte?: boolean }) {
  const v = scegliFondale(luogo, fondale);
  const id = useId();
  const interno = INTERNI.includes(v);
  let disegno: React.JSX.Element;
  if (v === 'cucina') disegno = <Cucina id={id} />;
  else if (v === 'laboratorio') disegno = <Laboratorio id={id} />;
  else {
    const D = DISEGNI[v];
    disegno = <D id={id} notte={notte} />;
  }
  return (
    <div className={`fd fd-${v}`} data-notte={interno ? undefined : notte ? '1' : '0'} data-fondale={v} aria-hidden="true">
      <svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMax meet" focusable="false">
        {disegno}
      </svg>
    </div>
  );
}
