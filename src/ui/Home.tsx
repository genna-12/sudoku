import { useState } from 'react';
import { LIVELLI } from '../engine';
import type { Livello, Modalita } from '../engine';
import { SEMINA_SBLOCCATA_A } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { StatoConnessione } from '../net';
import type { Giocatore, StatoPartita } from '../stato';
import { MenuHome } from './MenuHome';
import type { Tema } from './MenuHome';
import type { Tappa } from './regole';
import { Semino, SeminoCoppia, SeminoPianta } from './Semino';
import type { Mascotte } from './useMascotte';
import { CHIAVI, leggi, scrivi, tempo, testoConnessione } from './util';

export interface Chiacchiera {
  id: number;
  chi: ChiParla;
  testo: string;
}

interface Props {
  nome: string;
  partnerNome: string;
  connessione: StatoConnessione;
  personaleConnesso: boolean;
  occupata: boolean;
  partita: StatoPartita | null;
  mioRuolo: Giocatore;
  generando: boolean;
  fiori: number;
  sbloccata: boolean;
  tappa: Tappa | null;
  onChiudiTappa: () => void;
  chiacchiera: Chiacchiera | null;
  mascotte: Mascotte;
  mostraErrori: boolean;
  vibrazione: boolean;
  tema: Tema;
  onImpostazione: (chiave: 'mostraErrori' | 'vibrazione', v: boolean) => void;
  onTema: (t: Tema) => void;
  onEsporta: () => void;
  onImporta: (testo: string) => void;
  onCancellaPartita: () => void;
  onRicomincia: () => void;
  onContinua: () => void;
  onNuova: (m: Modalita, l: Livello) => void;
  onGiardino: () => void;
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
        <Pallino connessione={p.connessione} partner={p.partnerNome} occupata={p.occupata} />
        {p.personaleConnesso && (
          <span className="altro-dispositivo-chip" data-testid="personale-connesso" title="Un altro tuo dispositivo è collegato">
            <b className="altro-dispositivo" aria-hidden="true" />
            <span className="nascosto-visivo">altro mio dispositivo collegato</span>
          </span>
        )}
        <span className="home-testa-spazio" />
        <button className="giardino-bottone" data-testid="giardino" onClick={p.onGiardino} aria-label={`Giardino: ${p.fiori} fiori`}>
          <SeminoPianta fiorita={p.fiori > 0} stadio={2} taglia={30} />
          <span className="tabellare">{p.fiori}</span>
        </button>
        <MenuHome
          mostraErrori={p.mostraErrori}
          vibrazione={p.vibrazione}
          tema={p.tema}
          inCorso={!!inCorso}
          onImpostazione={p.onImpostazione}
          onTema={p.onTema}
          onEsporta={p.onEsporta}
          onImporta={p.onImporta}
          onCancellaPartita={p.onCancellaPartita}
          onRicomincia={p.onRicomincia}
        />
      </header>

      <h1 className="titolo home-titolo">
        Sudoku
        <br />
        di coppia
      </h1>

      <Eroe {...p} />

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
          className={`bottone primario${solo(p) ? ' invito' : ''}`}
          onClick={() => p.onNuova(modalita, livello)}
          disabled={p.generando}
        >
          {p.generando ? 'Preparo la griglia…' : solo(p) ? 'Nuova partita insieme' : 'Nuova partita'}
        </button>
        <button className="link" onClick={p.onCambia}>
          cambia profilo o frase
        </button>
      </div>
    </main>
  );
}

/** Le mascotte con il loro fumetto: storia (se c'è una tappa nuova), chiacchiere o un saluto. */
function Eroe(p: Props) {
  const stadio = Math.min(4, p.fiori);
  const tappa = p.tappa;
  const parla: ChiParla | 'entrambi' = tappa ? tappa.chi : p.chiacchiera ? p.chiacchiera.chi : 'semino';
  const coppia = p.sbloccata;
  const variante = parla === 'semina' ? ' fumetto--semina' : parla === 'entrambi' ? ' fumetto--entrambi' : '';
  const saluto =
    p.fiori === 0
      ? `Ciao ${p.nome}. Il giardino aspetta il primo fiore.`
      : `Ciao ${p.nome}. Nel giardino ${p.fiori === 1 ? 'c’è 1 fiore' : `ci sono ${p.fiori} fiori`}.`;
  const m = p.mascotte;

  return (
    <section className={`home-eroe parla-${parla}`} aria-live="polite">
      <span className="home-mascotte">
        {coppia ? (
          <SeminoCoppia
            stadio={stadio}
            umore={m.semino.umore}
            umoreSemina={m.semina.umore}
            impulso={m.semino.impulso + m.semina.impulso}
            taglia={72}
          />
        ) : (
          <Semino
            stadio={stadio}
            umore={solo(p) && m.semino.umore === 'neutro' ? 'preoccupato' : m.semino.umore}
            impulso={m.semino.impulso}
            taglia={92}
          />
        )}
      </span>
      {tappa ? (
        <button key={tappa.chiave} className={`fumetto fumetto-storia${variante}`} onClick={p.onChiudiTappa}>
          {tappa.testo}
          <span className="fumetto-firma">{firma(tappa.chi)}, tocca per chiudere</span>
        </button>
      ) : p.chiacchiera ? (
        <p key={p.chiacchiera.id} className={`fumetto${variante}`}>
          {p.chiacchiera.testo}
        </p>
      ) : (
        <p className="fumetto fumetto-quieto">{saluto}</p>
      )}
    </section>
  );
}

/** Un fiore prima dello sblocco: Semino si sente solo e la Home invita a giocare insieme. */
function solo(p: Pick<Props, 'fiori' | 'sbloccata'>): boolean {
  return !p.sbloccata && p.fiori === SEMINA_SBLOCCATA_A - 1;
}

function firma(chi: ChiParla | 'entrambi'): string {
  return chi === 'entrambi' ? 'Semino e Semina' : chi === 'semina' ? 'Semina' : 'Semino';
}

export function Pallino({
  connessione,
  partner,
  occupata = false,
}: {
  connessione: StatoConnessione;
  partner: string;
  occupata?: boolean;
}) {
  return (
    <span className={`pallino pallino-${occupata ? 'occupata' : connessione}`}>
      <i data-testid={connessione === 'connesso' ? 'connesso' : undefined} aria-hidden="true" />
      <span className="pallino-testo">
        {occupata ? 'sei già collegato da un altro dispositivo' : testoConnessione(connessione, partner)}
      </span>
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
