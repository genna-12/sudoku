import { useEffect, useRef } from 'react';
import type { VocePosta } from '../stato/archivio';
import type { Giocatore } from '../stato';
import { useChiudiConIndietro } from './indietro';
import { nominaSemina } from './regole';

/** quante frasi mostra il foglio (l'archivio ne tiene di più) */
export const POSTA_MOSTRATE = 20;

const ORA = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const GIORNO = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });

/** "oggi 23:10", "ieri 23:10", "3 nov, 23:10" (ora locale). */
export function quandoPosta(ts: number, ora: number = Date.now()): string {
  const d = new Date(ts);
  const inizio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const giorni = Math.round((inizio(new Date(ora)) - inizio(d)) / 86_400_000);
  const h = ORA.format(d);
  if (giorni <= 0) return `oggi ${h}`;
  if (giorni === 1) return `ieri ${h}`;
  return `${GIORNO.format(d)}, ${h}`;
}

/** Le frasi da mostrare: le più recenti, senza nominare Semina prima che arrivi qui. */
export function postaDaMostrare(posta: readonly VocePosta[], sbloccata: boolean): VocePosta[] {
  return posta.filter((v) => sbloccata || !nominaSemina(v.testo)).slice(0, POSTA_MOSTRATE);
}

/** La cassetta della posta aperta: le ultime frasi mandate e ricevute, nuove in cima. */
export function FoglioPosta(p: {
  posta: readonly VocePosta[];
  mioRuolo: Giocatore;
  nomePartner: string;
  sbloccata: boolean;
  onChiudi: () => void;
}) {
  useChiudiConIndietro(true, p.onChiudi);
  const chiudi = useRef<HTMLButtonElement>(null);
  useEffect(() => chiudi.current?.focus(), []);
  const voci = postaDaMostrare(p.posta, p.sbloccata);
  const ora = Date.now();
  return (
    <div className="foglio-velo foglio-velo-leggero" onPointerDown={(e) => e.target === e.currentTarget && p.onChiudi()}>
      <div
        className="foglio foglio-posta"
        role="dialog"
        aria-modal="true"
        aria-labelledby="posta-titolo"
        data-testid="foglio-posta"
        onKeyDown={(e) => e.key === 'Escape' && p.onChiudi()}
      >
        <h2 id="posta-titolo">La cassetta della posta</h2>
        {voci.length === 0 ? (
          <p className="posta-vuota">Ancora niente. Le frasi che vi mandate in partita finiscono qui.</p>
        ) : (
          <ol className="posta-lista">
            {voci.map((v) => {
              const mia = v.da === p.mioRuolo;
              return (
                <li key={`${v.ts}-${v.da}`} className={`posta-voce ${mia ? 'posta-mia' : 'posta-sua'}`}>
                  <span className="posta-chi">
                    {mia ? `tu → ${p.nomePartner}` : `${p.nomePartner} → te`} · {quandoPosta(v.ts, ora)}
                  </span>
                  <span className="posta-testo">{v.testo}</span>
                </li>
              );
            })}
          </ol>
        )}
        <div className="foglio-azioni">
          <button ref={chiudi} className="bottone" data-testid="posta-chiudi" onClick={p.onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
