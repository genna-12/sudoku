import { useState } from 'react';
import type { ChiParla } from '../config/frasi';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { VoceStorico } from '../stato';
import type { Chiacchiera } from './Home';
import { aCasoDiverso, numeriFiori, quotaBluFiore, statistiche } from './regole';
import { ACCESSORI_DI, Semino, SeminoPianta, stadioDaCrescita } from './Semino';
import type { Mascotte } from './useMascotte';
import { IconaIndietro } from './Icone';
import { tempo } from './util';

const NOMI_MODALITA = { sudoku: 'Sudoku', killer: 'Killer' } as const;
const DATA = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const ORA = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

interface Props {
  storico: VoceStorico[];
  /** id della partita aperta adesso (non si "riprende" quella in corso) */
  inCorso: string | null;
  sbloccata: boolean;
  mascotte: Mascotte;
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
  onRiprendi: (v: VoceStorico) => void;
  onEsci: () => void;
}

/** Il giardino: una pianta per partita, dalla più recente; fiori = finite, germogli = da riprendere. */
export function Giardino(p: Props) {
  const st = statistiche(p.storico);
  const numeri = numeriFiori(p.storico);
  // le mascotte in testa al giardino, ciascuna con un accessorio a caso (fisso per questa visita)
  const [accessori] = useState(() => ({
    semino: aCasoDiverso(ACCESSORI_DI.semino, undefined),
    semina: aCasoDiverso(ACCESSORI_DI.semina, undefined),
  }));
  const chi: ChiParla[] = p.sbloccata ? ['semino', 'semina'] : ['semino'];
  const stadio = Math.min(4, st.fiori);
  return (
    <main className="schermata giardino-schermata">
      <header className="barra">
        <button className="icona-bottone" data-testid="indietro" onClick={p.onEsci} aria-label="Torna alla home">
          <IconaIndietro />
        </button>
        <div className="barra-titolo">
          <span className="barra-livello">Giardino</span>
          <span className="barra-modalita">
            {st.fiori === 1 ? '1 fiore' : `${st.fiori} fiori`}, {st.germogli === 1 ? '1 germoglio' : `${st.germogli} germogli`}
          </span>
        </div>
        <span className="giardino-mascotte" data-testid="giardino-mascotte" hidden={p.storico.length === 0}>
          {chi.map((c) => (
            <Semino
              key={c}
              chi={c}
              stadio={stadio}
              umore={p.mascotte[c].umore}
              impulso={p.mascotte[c].impulso}
              accessorio={accessori[c]}
              onSolletico={() => p.onSolletico(c)}
              taglia={52}
            />
          ))}
          {p.solletico && (
            <span
              key={p.solletico.id}
              className={`fumetto fumetto-giu fumetto-solletico giardino-fumetto${p.solletico.chi === 'semina' ? ' fumetto--semina' : ''}`}
              role="status"
              data-testid="fumetto-solletico"
            >
              {p.solletico.testo}
            </span>
          )}
        </span>
      </header>

      {p.storico.length > 0 && (
        <section className="giardino-totali" aria-label="Il vostro giardino in numeri">
          <div className="giardino-totale">
            <b>{st.fiori}</b>
            <span>fiori</span>
          </div>
          <div className="giardino-totale">
            <b>{st.punti}</b>
            <span>punti di coppia</span>
          </div>
          <div className="giardino-totale">
            <b>{st.errori}</b>
            <span>errori in tutto</span>
          </div>
          {st.migliori.length > 0 && (
            <div className="giardino-totale giardino-record">
              <span>miglior tempo</span>
              <ul>
                {st.migliori.map((m) => (
                  <li key={`${m.modalita}-${m.livello}`}>
                    <span>
                      {m.modalita === 'killer' ? 'Killer ' : ''}
                      {LIVELLI_PARAMETRI[m.livello].etichetta}
                    </span>
                    <b className="tabellare">{tempo(m.secondi)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="giardino" data-testid="giardino-lista" data-voci={p.storico.length}>
        {p.storico.length === 0 && (
          <div className="giardino-vuoto">
            <Semino
              stadio={0}
              umore={p.mascotte.semino.umore === 'dorme' ? 'dorme' : 'saluta'}
              impulso={p.mascotte.semino.impulso}
              onSolletico={() => p.onSolletico('semino')}
              taglia={112}
            />
            <p className="fumetto fumetto-giu giardino-invito">
              {p.solletico?.testo ?? 'Qui non c’è ancora niente. Ogni partita pianta un seme: finitela insieme e fiorisce.'}
            </p>
            <button className="bottone primario" onClick={p.onEsci}>
              Scegli la prima partita
            </button>
          </div>
        )}
        {p.storico.map((v) => (
          <Pianta
            key={v.id}
            voce={v}
            inCorso={p.inCorso === v.id}
            sbloccata={p.sbloccata}
            quotaBlu={quotaBluFiore(v, numeri.get(v.id) ?? 0, p.sbloccata)}
            onRiprendi={p.onRiprendi}
          />
        ))}
      </div>
    </main>
  );
}

function Pianta({
  voce,
  inCorso,
  sbloccata,
  quotaBlu,
  onRiprendi,
}: {
  voce: VoceStorico;
  inCorso: boolean;
  sbloccata: boolean;
  /** frazione di petali blu (null per i germogli, che restano neutri) */
  quotaBlu: number | null;
  onRiprendi: (v: VoceStorico) => void;
}) {
  const finita = !!voce.finita;
  const quando = new Date(voce.iniziata);
  // killer = tulipano di Semina (dopo che è arrivata), sudoku = margherita di Semino
  const chi = sbloccata && voce.modalita === 'killer' ? 'semina' : 'semino';
  const livello = LIVELLI_PARAMETRI[voce.livello]?.etichetta ?? voce.livello;
  return (
    <article
      className={`pianta ${finita ? 'pianta-fiorita' : 'pianta-germoglio'}`}
      data-testid={`pianta-${voce.id}`}
      data-finita={finita ? 'true' : 'false'}
      data-quota-blu={quotaBlu ?? undefined}
    >
      <SeminoPianta
        fiorita={finita}
        stadio={Math.max(1, stadioDaCrescita(voce.progresso))}
        chi={chi}
        quotaBlu={quotaBlu ?? undefined}
        taglia={68}
      />
      <span className="pianta-titolo">
        {NOMI_MODALITA[voce.modalita] ?? voce.modalita}, {livello}
      </span>
      <span className="pianta-info">
        {DATA.format(quando)}, {ORA.format(quando)}
      </span>
      <span className="pianta-dati">
        <span className="tabellare">{tempo(voce.secondi)}</span>
        <span>{voce.punti} punti</span>
        <span>{voce.errori === 1 ? '1 errore' : `${voce.errori} errori`}</span>
        {!finita && <span>{Math.round(voce.progresso * 100)}%</span>}
      </span>
      {!finita && voce.stato && !inCorso && (
        <button className="pianta-riprendi" data-testid={`riprendi-${voce.id}`} onClick={() => onRiprendi(voce)}>
          Riprendi
        </button>
      )}
      {!finita && inCorso && <span className="pianta-in-corso">in corso</span>}
    </article>
  );
}
