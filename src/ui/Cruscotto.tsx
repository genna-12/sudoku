import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ChiParla } from '../config/frasi';
import type { Giocatore, StatoPartita } from '../stato';
import { crescita, mascotteDi } from './regole';
import { Semino, stadioDaCrescita } from './Semino';
import type { Indossati, Mascotte } from './useMascotte';
import { altro, sguardo } from './util';

const NOMI_STADIO = ['seme', 'germoglio', 'fogliolina', 'pianta', 'fiore'];

interface Props {
  partita: StatoPartita;
  mioRuolo: Giocatore;
  sbloccata: boolean;
  mascotte: Mascotte;
  /** accessori indossati adesso (quello della chiacchiera aperta) */
  indossati: Indossati;
  onSolletico: (chi: ChiParla) => void;
  mostraErrori: boolean;
  regaloAttivo: boolean;
  onRegalo: () => void;
  /** cella selezionata: le mascotte la guardano */
  guarda: { r: number; c: number } | null;
  /** fumetto di chi parla: copre per un attimo la barra, accanto alla sua mascotte */
  fumetto: ReactNode;
}

/**
 * Sopra la griglia: la crescita di Semino (punti di coppia), i punti e gli errori di ciascuno
 * nel proprio colore e il seme d'oro dei regali. Dopo lo sblocco le due mascotte stanno ai lati
 * della barra, ognuna dalla parte della quota del suo giocatore.
 */
export function Cruscotto(p: Props) {
  const { partita, mioRuolo } = p;
  const cr = crescita(partita, mioRuolo);
  const stadio = stadioDaCrescita(cr.frazione);
  const miei = partita.contatori?.[mioRuolo];
  const suoi = partita.contatori?.[altro(mioRuolo)];
  const disponibili = miei?.regaliDisponibili ?? 0;
  const sinistra: ChiParla = p.sbloccata ? mascotteDi(mioRuolo) : 'semino';
  const destra: ChiParla | null = p.sbloccata ? mascotteDi(altro(mioRuolo)) : null;

  return (
    <div
      className={`crescita cruscotto${cr.frazione >= 1 ? ' piena' : ''}${destra ? ' in-due' : ''}`}
      data-testid="crescita"
      data-frazione={cr.frazione.toFixed(3)}
    >
      <Mascottina chi={sinistra} stadio={stadio} {...p} sguardo={sguardo(p.guarda, -0.06, -0.12)} />
      <div className="crescita-corpo">
        {p.fumetto}
        <div
          className="crescita-barra"
          role="progressbar"
          aria-label={`Crescita di Semino: ${NOMI_STADIO[stadio]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(cr.frazione * 100)}
        >
          <i className="crescita-mia" style={{ '--q': cr.mia } as CSSProperties} />
          <i className="crescita-sua" style={{ '--q': cr.sua } as CSSProperties} />
        </div>
        <div className="crescita-testo">
          <Contatore lato="mio" punti={miei?.punti ?? 0} errori={miei?.errori ?? 0} mostraErrori={p.mostraErrori} />
          <span className="crescita-stadio">{NOMI_STADIO[stadio]}</span>
          <Contatore lato="suo" punti={suoi?.punti ?? 0} errori={suoi?.errori ?? 0} mostraErrori={p.mostraErrori} />
        </div>
      </div>
      {destra && <Mascottina chi={destra} stadio={stadio} {...p} sguardo={sguardo(p.guarda, 0.8, -0.12)} />}
      <button
        type="button"
        data-testid="regalo"
        data-disponibili={disponibili}
        className={`regalo${disponibili > 0 ? ' disponibile' : ''}${p.regaloAttivo ? ' attivo' : ''}`}
        disabled={disponibili <= 0 || !!partita.finita}
        aria-pressed={p.regaloAttivo}
        aria-label={
          p.regaloAttivo
            ? 'Tocca la cella che Semino deve riempire'
            : `Regali di Semino: ${disponibili}. Tocca e poi scegli una cella`
        }
        onClick={p.onRegalo}
      >
        <SemeOro />
        {disponibili > 0 && <span className="regalo-n">{disponibili}</span>}
      </button>
    </div>
  );
}

function Mascottina({
  chi,
  stadio,
  mascotte,
  indossati,
  onSolletico,
  sguardo,
}: {
  sguardo?: CSSProperties;
  chi: ChiParla;
  stadio: number;
  mascotte: Mascotte;
  indossati: Indossati;
  onSolletico: (chi: ChiParla) => void;
}) {
  const m = mascotte[chi];
  const el = useRef<HTMLSpanElement>(null);
  // a ogni reazione la mascottina si ingrandisce un attimo (fuori dal flusso: la griglia non si muove)
  useEffect(() => {
    const e = el.current;
    if (!m.impulso || !e || typeof e.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    e.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.5) translateY(5px)', offset: 0.35 }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  }, [m.impulso]);
  return (
    <span ref={el} className={`mascottina mascottina-${chi} guarda`} style={sguardo}>
      <Semino
        chi={chi}
        stadio={stadio}
        umore={m.umore}
        impulso={m.impulso}
        accessorio={indossati[chi]}
        onSolletico={() => onSolletico(chi)}
        taglia={44}
      />
    </span>
  );
}

function Contatore({
  lato,
  punti,
  errori,
  mostraErrori,
}: {
  lato: 'mio' | 'suo';
  punti: number;
  errori: number;
  mostraErrori: boolean;
}) {
  return (
    <span
      key={errori}
      className={`contatore contatore-${lato}${errori > 0 && mostraErrori ? ' scatta' : ''}`}
      aria-label={`${lato === 'mio' ? 'Tu' : 'Partner'}: ${punti} punti${mostraErrori ? `, ${errori} errori` : ''}`}
    >
      <b data-testid={`punti-${lato}`}>{punti}</b>
      <span className="contatore-errori" data-testid={`errori-${lato}`} hidden={!mostraErrori}>
        {errori}
      </span>
    </span>
  );
}

/** Seme d'oro (il regalo). */
function SemeOro() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.6 3.2c3.6 2.6 7 6.3 7 10.6 0 4.3-3.3 6.9-7.5 6.9s-7.6-2.6-7.6-6.8c0-4.4 4.3-7.6 8.1-10.7z"
        fill="currentColor"
      />
      <path d="M9.2 12.6c.5-1.9 1.6-3.4 3-4.6" stroke="var(--carta)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".55" />
    </svg>
  );
}
