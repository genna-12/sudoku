import { useState } from 'react';
import type { CSSProperties } from 'react';
import { tempo } from './util';

const COLORI = ['var(--a)', 'var(--b)', 'var(--evid)', 'var(--inchiostro)'];

export function Vittoria({
  secondi,
  frase,
  onNuova,
  onChiudi,
}: {
  secondi: number;
  frase: string;
  onNuova: () => void;
  onChiudi: () => void;
}) {
  const [coriandoli] = useState(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        '--x': `${Math.random() * 100}vw`,
        '--deriva': `${(Math.random() - 0.5) * 30}vw`,
        '--giri': `${360 + Math.random() * 720}deg`,
        '--ritardo': `${Math.random() * 0.9}s`,
        '--durata': `${2.4 + Math.random() * 1.8}s`,
        '--c': COLORI[i % COLORI.length],
        '--w': `${6 + Math.random() * 6}px`,
      })) as CSSProperties[],
  );
  return (
    <div className="vittoria" role="dialog" aria-modal="true" aria-label="Partita vinta">
      <div className="coriandoli" aria-hidden="true">
        {coriandoli.map((s, i) => (
          <i key={i} style={s} className={i % 3 === 0 ? 'tondo' : ''} />
        ))}
      </div>
      <div className="vittoria-carta">
        <p className="vittoria-frase">{frase}</p>
        <p className="vittoria-tempo">
          Finita in <span className="tabellare">{tempo(secondi)}</span>
        </p>
        <button className="bottone primario" onClick={onNuova}>
          Nuova partita
        </button>
        <button className="link" onClick={onChiudi}>
          guarda la griglia
        </button>
      </div>
    </div>
  );
}
