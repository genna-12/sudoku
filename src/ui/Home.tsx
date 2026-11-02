import { useState } from 'react';
import { LIVELLI } from '../engine';
import type { Livello, Modalita } from '../engine';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { StatoConnessione } from '../net';
import type { Giocatore, StatoPartita } from '../stato';
import { Marchio } from './Ingresso';
import { CHIAVI, leggi, scrivi, tempo, testoConnessione } from './util';

interface Props {
  nome: string;
  partnerNome: string;
  connessione: StatoConnessione;
  partita: StatoPartita | null;
  mioRuolo: Giocatore;
  generando: boolean;
  onContinua: () => void;
  onNuova: (m: Modalita, l: Livello) => void;
  onCambia: () => void;
}

const NOMI_MODALITA: Record<Modalita, string> = { sudoku: 'Sudoku', killer: 'Killer' };

export function Home(p: Props) {
  const scelta = leggi<{ modalita: Modalita; livello: Livello }>(CHIAVI.scelta);
  const [modalita, setModalita] = useState<Modalita>(scelta?.modalita ?? 'sudoku');
  const [livello, setLivello] = useState<Livello>(scelta?.livello ?? 'facile');
  const inCorso = p.partita && !p.partita.finita ? p.partita : null;

  function scegli(m: Modalita, l: Livello) {
    setModalita(m);
    setLivello(l);
    scrivi(CHIAVI.scelta, { modalita: m, livello: l });
  }

  return (
    <main className="schermata home" data-testid="home">
      <header className="home-testa">
        <Pallino connessione={p.connessione} partner={p.partnerNome} />
      </header>

      <div className="home-titolo">
        <Marchio />
        <h1 className="titolo">
          Sudoku
          <br />
          di coppia
        </h1>
        <p className="sottotitolo">Ciao {p.nome}.</p>
      </div>

      {inCorso && (
        <button data-testid="continua" className="continua" onClick={p.onContinua}>
          <MiniGriglia partita={inCorso} mioRuolo={p.mioRuolo} />
          <span className="continua-testo">
            <span className="continua-titolo">Continua</span>
            <span className="continua-info">
              {NOMI_MODALITA[inCorso.puzzle.modalita]}, {LIVELLI_PARAMETRI[inCorso.puzzle.livello].etichetta}
            </span>
            <span className="continua-info tabellare">{tempo(inCorso.secondi)}</span>
          </span>
        </button>
      )}

      <section className="scelta" aria-label="Nuova partita">
        <div className="segmentato" role="radiogroup" aria-label="Modalità">
          {(['sudoku', 'killer'] as const).map((m) => (
            <button
              key={m}
              data-testid={`modalita-${m}`}
              role="radio"
              aria-checked={modalita === m}
              className={modalita === m ? 'attivo' : ''}
              onClick={() => scegli(m, livello)}
            >
              {NOMI_MODALITA[m]}
            </button>
          ))}
          <span className="segmentato-cursore" data-pos={modalita === 'sudoku' ? 0 : 1} aria-hidden="true" />
        </div>

        <div className="livelli" role="radiogroup" aria-label="Livello">
          {LIVELLI.map((l, i) => (
            <button
              key={l}
              data-testid={`livello-${l}`}
              role="radio"
              aria-checked={livello === l}
              className={`livello${livello === l ? ' attivo' : ''}`}
              onClick={() => scegli(modalita, l)}
            >
              <span className="livello-nome">{LIVELLI_PARAMETRI[l].etichetta}</span>
              <span className="livello-scala" aria-hidden="true">
                {LIVELLI.map((_, k) => (
                  <i key={k} className={k <= i ? 'pieno' : ''} style={{ height: 4 + k * 2 }} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="home-piede">
        <button
          data-testid="nuova"
          className="bottone primario"
          onClick={() => p.onNuova(modalita, livello)}
          disabled={p.generando}
        >
          {p.generando ? 'Preparo la griglia…' : 'Nuova partita'}
        </button>
        <button className="link" onClick={p.onCambia}>
          cambia nome o frase
        </button>
      </div>
    </main>
  );
}

export function Pallino({ connessione, partner }: { connessione: StatoConnessione; partner: string }) {
  return (
    <span className={`pallino pallino-${connessione}`}>
      <i data-testid={connessione === 'connesso' ? 'connesso' : undefined} aria-hidden="true" />
      <span className="pallino-testo">{testoConnessione(connessione, partner)}</span>
    </span>
  );
}

function MiniGriglia({ partita, mioRuolo }: { partita: StatoPartita; mioRuolo: Giocatore }) {
  return (
    <span className="mini" aria-hidden="true">
      {partita.puzzle.dati.map((d, i) => {
        const c = partita.celle[i];
        const cls = d ? 'data' : c && c.v ? (c.da === mioRuolo ? 'mia' : 'sua') : '';
        return <i key={i} className={cls} />;
      })}
    </span>
  );
}
