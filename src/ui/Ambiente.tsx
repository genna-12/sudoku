// Comparse e oggetti in scena nel lettore dei capitoli (T9 C, solo dal capitolo 9).
// <Ambiente comparse={['granchi']} oggetti={['tavola']} />  → niente se le due liste sono vuote
//   - comparse: creature senza nome e senza voce; oggetti: cose del capitolo o rimaste da uno vicino
//   - piccole, nella striscia davanti al suolo (fra il suolo del palco e il piede): mai sopra le mascotte
//     o il fumetto (z 0 nel lettore, sotto secondari 1, mascotte 2, fumetto 4: vedi la scala in tema.css)
//   - id fuori dal vocabolario (src/config/ambienti.json) si ignorano; al massimo 3 per lista
//   - FASE 1: ogni id si disegna con un segnaposto (data-segnaposto); i disegni veri arrivano in fase 2
// Decorativo: aria-hidden (le comparse non hanno nome sullo schermo). Animazioni ferme con reduced-motion.
import type { CSSProperties } from 'react';
import { MAX_PER_CAPITOLO, comparsaValida, oggettoValido } from '../config/ambienti';
import './ambiente.css';

/** posti nella striscia, da sinistra (frazione della colonna): le comparse e gli oggetti si alternano */
const POSTI_COMPARSE = [0.25, 0.75, 0.585] as const;
const POSTI_OGGETTI = [0.085, 0.915, 0.415] as const;

function SegnapostoComparsa() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" focusable="false">
      <ellipse cx="16" cy="29" rx="10" ry="2" className="amb-ombra" />
      <path d="M5 26C5 16 10 10 16 10S27 16 27 26Z" className="amb-corpo" />
      <circle cx="12.5" cy="18" r="1.6" className="amb-occhio" />
      <circle cx="19.5" cy="18" r="1.6" className="amb-occhio" />
    </svg>
  );
}

function SegnapostoOggetto() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" focusable="false">
      <ellipse cx="16" cy="29" rx="11" ry="2" className="amb-ombra" />
      <rect x="7" y="15" width="18" height="13" rx="3" className="amb-oggetto" />
      <path d="M7 19H25" className="amb-filo" />
    </svg>
  );
}

export function Ambiente({ comparse, oggetti }: { comparse?: readonly string[]; oggetti?: readonly string[] }) {
  const c = (comparse ?? []).filter(comparsaValida).slice(0, MAX_PER_CAPITOLO);
  const o = (oggetti ?? []).filter(oggettoValido).slice(0, MAX_PER_CAPITOLO);
  if (c.length === 0 && o.length === 0) return null;
  return (
    <div className="capitolo-ambiente" data-testid="capitolo-ambiente" aria-hidden="true">
      {o.map((id, i) => (
        <span key={`o-${id}`} className="amb-pezzo amb-pezzo--oggetto" data-oggetto={id} data-segnaposto="" style={{ '--amb-x': POSTI_OGGETTI[i] } as CSSProperties}>
          <SegnapostoOggetto />
        </span>
      ))}
      {c.map((id, i) => (
        <span
          key={`c-${id}`}
          className="amb-pezzo amb-pezzo--comparsa"
          data-comparsa={id}
          data-segnaposto=""
          style={{ '--amb-x': POSTI_COMPARSE[i], '--amb-k': i } as CSSProperties}
        >
          <SegnapostoComparsa />
        </span>
      ))}
    </div>
  );
}
