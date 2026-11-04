import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChiParla } from '../config/frasi';
import { elementiSbloccati } from '../config/storia';
import type { Chiacchiera } from './Home';
import { Scena } from './Scena';
import { Semino, SeminoCoppia } from './Semino';
import { umoreValido } from './useMascotte';
import type { Mascotte } from './useMascotte';
import { tempo } from './util';

const COLORI = ['var(--a)', 'var(--b)', 'var(--evid)', 'var(--inchiostro)'];

export function Vittoria({
  secondi,
  frase,
  sbloccata,
  mascotte,
  solletico,
  onSolletico,
  puntiMiei,
  puntiSuoi,
  bonus,
  fiori,
  bluPresenza,
  vai = false,
  onNuova,
  onChiudi,
}: {
  secondi: number;
  /** scelta da chi ha messo l'ultima cella (arriva con l'evento `vittoria`) */
  frase: string;
  sbloccata: boolean;
  mascotte: Mascotte;
  /** solletico in corso: quella mascotte cambia umore e parla nel fumetto */
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
  puntiMiei: number;
  puntiSuoi: number;
  bonus: number;
  /** fiori con questa vittoria: la scena piccola in testa (fuochi e arcobaleno se sbloccati) */
  fiori: number;
  bluPresenza: number;
  /** il partner ha già aperto una partita nuova (mentre leggevo il capitolo): "Vai" al posto di "Nuova partita" */
  vai?: boolean;
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
  const umoreLui = solletico?.chi === 'semino' ? mascotte.semino.umore : 'festa';
  const umoreLei = solletico?.chi === 'semina' ? mascotte.semina.umore : umoreValido('euforico');
  const elementi = elementiSbloccati(fiori);
  // chi parla adesso (solletico): la sua bocca si muove
  const chiParla: ChiParla | null = solletico ? solletico.chi : null;
  return (
    <div className="vittoria" role="dialog" aria-modal="true" aria-label="Partita vinta">
      <div className="coriandoli" aria-hidden="true">
        {coriandoli.map((s, i) => (
          <i key={i} style={s} className={i % 3 === 0 ? 'tondo' : ''} />
        ))}
      </div>
      <div className="vittoria-carta" data-testid="vittoria">
        <div className="vittoria-cielo">
          <Scena elementi={elementi} fiori={fiori} bluPresenza={bluPresenza} altezza={118} festa={elementi.includes('fuochi')} />
        </div>
        <span className="vittoria-mascotte">
          {sbloccata ? (
            <SeminoCoppia
              stadio={4}
              umore={umoreLui}
              umoreSemina={umoreLei}
              taglia={92}
              impulso={solletico ? `s${solletico.id}` : 'vittoria'}
              onSolletico={onSolletico}
              parla={chiParla}
              frase={solletico?.testo}
              seguiPuntatore
            />
          ) : (
            <Semino
              stadio={4}
              umore={solletico ? mascotte.semino.umore : 'festa'}
              impulso={solletico ? `s${solletico.id}` : 'vittoria'}
              onSolletico={() => onSolletico('semino')}
              taglia={112}
              parla={chiParla === 'semino'}
              frase={solletico?.testo}
              seguiPuntatore
            />
          )}
          {solletico && (
            <span
              key={solletico.id}
              className={`fumetto fumetto-solletico vittoria-fumetto${solletico.chi === 'semina' ? ' fumetto--semina' : ''}`}
              role="status"
              data-testid="fumetto-solletico"
            >
              {solletico.testo}
            </span>
          )}
        </span>
        <h2 className="vittoria-titolo">{sbloccata ? 'Fiorita insieme!' : 'Fiorita!'}</h2>
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
        {vai && <p className="vittoria-vai">È già iniziata una nuova partita</p>}
        <button className="bottone primario" data-testid={vai ? 'vittoria-vai' : 'vittoria-nuova'} onClick={onNuova}>
          {vai ? 'Vai' : 'Nuova partita'}
        </button>
        {!vai && (
          <button className="link" onClick={onChiudi}>
            guarda la griglia
          </button>
        )}
      </div>
    </div>
  );
}
