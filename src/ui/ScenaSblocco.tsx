import { useState } from 'react';
import type { CSSProperties } from 'react';
import { SCENA_SBLOCCO } from '../config/frasi';
import { Semino, SeminoCoppia } from './Semino';
import { umoreValido } from './useMascotte';

/**
 * L'arrivo di Semina, a schermo intero: una battuta per tocco; alla prima battuta di Semina lei
 * sbuca accanto a Semino; alla fine i due insieme e "andiamo".
 */
export function ScenaSblocco({ onFine }: { onFine: () => void }) {
  const [passo, setPasso] = useState(0);
  const fine = passo >= SCENA_SBLOCCO.length;
  const battuta = fine ? null : SCENA_SBLOCCO[passo];
  const primaDiLei = SCENA_SBLOCCO.findIndex((b) => b.chi === 'semina');
  const leiC = primaDiLei >= 0 && passo >= primaDiLei;
  // la battuta del narratore dopo l'arrivo di Semina ("Il verde è Semino…"): si accendono i colori
  const svela = SCENA_SBLOCCO.findIndex((b, i) => b.chi === 'nessuno' && i > primaDiLei);
  const colori = svela >= 0 && passo >= svela;
  // umore di ciascuno: quello della sua ultima battuta fin qui
  let umoreLui = 'neutro';
  let umoreLei = 'euforico';
  for (let i = 0; i <= Math.min(passo, SCENA_SBLOCCO.length - 1); i++) {
    const b = SCENA_SBLOCCO[i];
    if (b.chi === 'semino' && b.umore) umoreLui = b.umore;
    if (b.chi === 'semina' && b.umore) umoreLei = b.umore;
  }

  function avanti() {
    if (!fine) setPasso((n) => n + 1);
  }

  return (
    <div
      className={`scena${fine ? ' scena-fine' : ''}${colori ? ' scena-colori' : ''}`}
      data-testid="scena-sblocco"
      data-passo={passo}
      role="dialog"
      aria-modal="true"
      aria-label="Arriva Semina"
      onClick={avanti}
    >
      <div className="scena-foglie" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} style={{ '--k': i } as CSSProperties} />
        ))}
      </div>
      <div className="scena-palco">
        {fine ? (
          <SeminoCoppia stadio={3} umore="felice" umoreSemina={umoreValido('euforico')} taglia={120} impulso="fine" />
        ) : (
          <>
            <span className={`scena-attore${battuta?.chi === 'semino' ? ' parla' : ''}`}>
              <Semino chi="semino" stadio={3} umore={umoreValido(umoreLui)} impulso={passo} taglia={132} />
            </span>
            {leiC && (
              <span className={`scena-attore scena-lei${battuta?.chi === 'semina' ? ' parla' : ''}`}>
                <Semino chi="semina" stadio={3} umore={umoreValido(umoreLei)} impulso={passo} taglia={132} />
              </span>
            )}
          </>
        )}
      </div>
      <div className="scena-battuta" aria-live="polite">
        {battuta ? (
          <p
            key={passo}
            className={`fumetto fumetto-giu scena-fumetto${battuta.chi === 'semina' ? ' fumetto--semina' : ''}${battuta.chi === 'nessuno' ? ' scena-fruscio' : ''}`}
          >
            {battuta.testo}
          </p>
        ) : (
          <p key="fine" className="fumetto fumetto-giu fumetto--entrambi scena-fumetto">
            Semino e Semina. Da adesso il giardino lo curano in due.
          </p>
        )}
        {fine ? (
          <button
            className="bottone primario scena-andiamo"
            data-testid="scena-andiamo"
            onClick={(e) => {
              e.stopPropagation();
              onFine();
            }}
          >
            Andiamo
          </button>
        ) : (
          <span className="scena-aiuto">tocca per continuare</span>
        )}
      </div>
    </div>
  );
}
