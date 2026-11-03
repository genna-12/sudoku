import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChiParla } from '../config/frasi';
import type { Battuta } from '../config/storia';
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
  sorpresa,
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
  /** scena breve di questa vittoria (SORPRESE), una battuta per tocco prima della frase */
  sorpresa: Battuta[] | null;
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
  const [passo, setPasso] = useState(0);
  const battuta = sorpresa && passo < sorpresa.length ? sorpresa[passo] : null;
  // durante la sorpresa: chi parla prende l'umore della sua battuta, l'altro resta in festa
  const umoreLui = solletico?.chi === 'semino' ? mascotte.semino.umore : battuta?.chi === 'semino' ? umoreValido(battuta.umore) : 'festa';
  const umoreLei =
    solletico?.chi === 'semina' ? mascotte.semina.umore : battuta?.chi === 'semina' ? umoreValido(battuta.umore) : umoreValido('euforico');
  const elementi = elementiSbloccati(fiori);
  const parla = battuta ? ` parla-${battuta.chi}` : '';
  return (
    <div className="vittoria" role="dialog" aria-modal="true" aria-label="Partita vinta">
      <div className="coriandoli" aria-hidden="true">
        {coriandoli.map((s, i) => (
          <i key={i} style={s} className={i % 3 === 0 ? 'tondo' : ''} />
        ))}
      </div>
      <div className={`vittoria-carta${parla}`} data-testid="vittoria">
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
              impulso={solletico ? `s${solletico.id}` : battuta ? `b${passo}` : 'vittoria'}
              onSolletico={onSolletico}
            />
          ) : (
            <Semino
              stadio={4}
              umore={solletico ? mascotte.semino.umore : 'festa'}
              impulso={solletico ? `s${solletico.id}` : 'vittoria'}
              onSolletico={() => onSolletico('semino')}
              taglia={112}
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
        {battuta && sorpresa ? (
          <button
            key={passo}
            className={`sorpresa sorpresa-${battuta.chi}`}
            data-testid="sorpresa"
            data-passo={passo}
            onClick={() => setPasso((n) => n + 1)}
          >
            {battuta.chi !== 'nessuno' && <span className="sorpresa-chi">{battuta.chi === 'semina' ? 'Semina' : 'Semino'}</span>}
            <span className="sorpresa-testo">{battuta.testo}</span>
            <span className="sorpresa-avanti">
              <span className="sorpresa-passi" aria-hidden="true">
                {sorpresa.map((_, i) => (
                  <i key={i} className={i <= passo ? 'fatto' : ''} />
                ))}
              </span>
              {passo < sorpresa.length - 1 ? 'tocca per continuare' : 'tocca per chiudere'}
            </span>
          </button>
        ) : (
          <>
            <h2 className="vittoria-titolo">{sbloccata ? 'Fiorita insieme!' : 'Fiorita!'}</h2>
            <p className={`vittoria-frase${frase ? '' : ' in-arrivo'}`} data-testid="vittoria-frase">
              {frase || '…'}
            </p>
          </>
        )}
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
