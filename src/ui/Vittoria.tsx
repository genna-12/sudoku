import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Semino, SeminoCoppia } from './Semino';
import { umoreValido } from './useMascotte';
import { tempo } from './util';

const COLORI = ['var(--a)', 'var(--b)', 'var(--evid)', 'var(--inchiostro)'];

export function Vittoria({
  secondi,
  frase,
  sbloccata,
  puntiMiei,
  puntiSuoi,
  bonus,
  onNuova,
  onChiudi,
}: {
  secondi: number;
  /** scelta da chi ha messo l'ultima cella (arriva con l'evento `vittoria`) */
  frase: string;
  sbloccata: boolean;
  puntiMiei: number;
  puntiSuoi: number;
  bonus: number;
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
      <div className="vittoria-carta" data-testid="vittoria">
        <span className="vittoria-mascotte">
          {sbloccata ? (
            <SeminoCoppia stadio={4} umore="festa" umoreSemina={umoreValido('euforico')} taglia={92} impulso="vittoria" />
          ) : (
            <Semino stadio={4} umore="festa" impulso="vittoria" taglia={112} />
          )}
        </span>
        <p className={`vittoria-frase${frase ? '' : ' in-arrivo'}`} data-testid="vittoria-frase">
          {frase || '…'}
        </p>
        <p className="vittoria-tempo">
          Finita in <span className="tabellare">{tempo(secondi)}</span>, un fiore in più nel giardino
        </p>
        <div className="vittoria-punti">
          <span className="vittoria-quota vittoria-mia">
            <b className="tabellare">{puntiMiei}</b> tu
          </span>
          <span className="vittoria-quota vittoria-sua">
            <b className="tabellare">{puntiSuoi}</b> l'altra metà
          </span>
          <span className="vittoria-bonus">+{bonus} di bonus a testa</span>
        </div>
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
