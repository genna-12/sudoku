import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { LIVELLI } from '../engine';
import type { Livello, Modalita } from '../engine';
import { SEMINA_SBLOCCATA_A } from '../config/frasi';
import type { ChiParla } from '../config/frasi';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import { GIORNI_SPECIALI, elementiSbloccati } from '../config/storia';
import type { GiornoSpeciale } from '../config/storia';
import type { StatoConnessione } from '../net';
import type { Giocatore, StatoPartita } from '../stato';
import { MenuHome } from './MenuHome';
import { SemiTitolo } from './Icone';
import type { Tema } from './MenuHome';
import { aCasoDiverso, accessoriSbloccati, accessorioPermesso, presenzaBlu } from './regole';
import type { Tappa } from './regole';
import { ELEMENTI_SCENA, Scena } from './Scena';
import { ACCESSORI_DI, Semino, SeminoCoppia, SeminoPianta } from './Semino';
import type { Accessorio } from './Semino';
import { accessorioValido } from './useMascotte';
import type { Indossati, Mascotte } from './useMascotte';
import { CHIAVI, leggi, scrivi, tempo, testoConnessione } from './util';

export interface Chiacchiera {
  id: number;
  chi: ChiParla;
  testo: string;
  /** accessorio da indossare mentre il fumetto è aperto */
  accessorio?: string;
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
  /** giorno del mare / della montagna (solo dopo l'arrivo di Semina), o null */
  giorno: GiornoSpeciale | null;
  tappa: Tappa | null;
  onChiudiTappa: () => void;
  chiacchiera: Chiacchiera | null;
  /** reazione al solletico in corso (fumetto breve, sopra a tutto) */
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
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
    <main className="schermata home" data-testid="home" data-giorno={p.giorno ?? undefined}>
      <Scena
        className="home-scena"
        elementi={elementiSbloccati(p.fiori)}
        fiori={p.fiori}
        bluPresenza={presenzaBlu(p.fiori, p.sbloccata)}
        altezza={220}
        sfuma
        nuovi={inEvidenza(p)}
      />
      <header className="home-testa">
        <Pallino connessione={p.connessione} partner={p.partnerNome} occupata={p.occupata} femminile={p.mioRuolo === 'b'} />
        {p.personaleConnesso && (
          <span className="altro-dispositivo-chip" data-testid="personale-connesso" title="Anche il tuo altro dispositivo è qui">
            <b className="altro-dispositivo" aria-hidden="true" />
            <span className="nascosto-visivo">anche il tuo altro dispositivo è qui</span>
          </span>
        )}
        <span className="home-testa-spazio" />
        <button className="giardino-bottone" data-testid="giardino" onClick={p.onGiardino} aria-label={`Giardino: ${p.fiori} fiori`}>
          <SeminoPianta
            fiorita={p.fiori > 0}
            stadio={2}
            taglia={30}
            quotaBlu={p.fiori > 0 ? presenzaBlu(p.fiori, p.sbloccata) * 0.5 : undefined}
          />
          <span className="tabellare">{p.fiori}</span>
        </button>
        <MenuHome
          mostraErrori={p.mostraErrori}
          vibrazione={p.vibrazione}
          tema={p.tema}
          inCorso={!!inCorso}
          sbloccata={p.sbloccata}
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
        <SemiTitolo />
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
                  <i key={k} className={k <= i ? 'pieno' : ''} style={{ height: 4 + k * 2, '--k': k } as CSSProperties} />
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

const RIPOSO_MS = 60000;

/** Elementi della scena da far entrare di nuovo: quello della tappa aperta, o quello del giorno speciale. */
function inEvidenza(p: Pick<Props, 'tappa' | 'giorno' | 'fiori'>): string[] | undefined {
  const scena = (x: string) => (ELEMENTI_SCENA as readonly string[]).includes(x);
  const visibili = elementiSbloccati(p.fiori);
  if (p.tappa) {
    const k = [p.tappa.scena, p.tappa.sblocca?.tipo === 'elemento' ? p.tappa.sblocca.id : undefined].filter(
      (x): x is string => !!x && scena(x) && visibili.includes(x),
    );
    return k.length ? k : undefined;
  }
  const g = p.giorno ? GIORNI_SPECIALI[p.giorno].scena : '';
  return g && visibili.includes(g) ? [g] : undefined;
}

/** Gli accessori che ciascuno può mettersi a riposo: i suoi, già sbloccati; Semina al mare in coppia anche la tavola. */
function poolRiposo(chi: ChiParla, fiori: number, coppia: boolean, giorno: GiornoSpeciale | null): Accessorio[] {
  const suoi = accessoriSbloccati(ACCESSORI_DI[chi], fiori);
  if (chi === 'semina' && accessorioPermesso('semina', 'surf', fiori, { inCoppia: coppia, giorno })) return [...suoi, 'surf'];
  return suoi;
}

/**
 * A riposo (nessun fumetto aperto) ogni 60 s circa una mascotte cambia accessorio a caso fra i
 * suoi (solo quelli sbloccati); prima dello sblocco solo Semino. Si alternano. Nei giorni speciali
 * si parte con gli accessori a tema.
 */
function useAccessoriRiposo(attivo: boolean, sbloccata: boolean, fiori: number, giorno: GiornoSpeciale | null): Indossati {
  const [{ indossati }, setStato] = useState<{ indossati: Indossati; giri: number }>(() => {
    if (!giorno) return { indossati: {}, giri: 0 };
    const tema = GIORNI_SPECIALI[giorno].accessori;
    const o = { inCoppia: sbloccata, giorno };
    return {
      indossati: {
        semino: accessorioValido(accessorioPermesso('semino', tema.semino, fiori, o)),
        semina: accessorioValido(accessorioPermesso('semina', tema.semina, fiori, o)),
      },
      giri: 0,
    };
  });
  // il ritmo non riparte a ogni fumetto (le chiacchiere arrivano più spesso di 60 s): se allo
  // scadere c'è un fumetto aperto, si riprova poco dopo
  const vivo = useRef({ attivo, sbloccata, fiori, giorno });
  useEffect(() => {
    vivo.current = { attivo, sbloccata, fiori, giorno };
  });
  useEffect(() => {
    let t = 0;
    const prossimo = (ms: number) => {
      t = window.setTimeout(() => {
        const v = vivo.current;
        if (!v.attivo) return prossimo(5000);
        const scelta = Math.random();
        setStato(({ indossati: x, giri }) => {
          const chi: ChiParla = v.sbloccata && giri % 2 ? 'semina' : 'semino';
          const pool = poolRiposo(chi, v.fiori, v.sbloccata, v.giorno);
          return { indossati: { ...x, [chi]: aCasoDiverso(pool, x[chi], () => scelta) }, giri: giri + 1 };
        });
        prossimo(RIPOSO_MS * (0.9 + Math.random() * 0.2));
      }, ms);
    };
    prossimo(RIPOSO_MS * (0.9 + Math.random() * 0.2));
    return () => window.clearTimeout(t);
  }, []);
  return sbloccata ? indossati : { semino: indossati.semino };
}

/** Accessori della tappa aperta: `accessorio` a chi parla (con 'entrambi': a Semino), `accessorioSemina` a lei. */
function accessoriTappa(t: Tappa, fiori: number, coppia: boolean): Indossati {
  const o = { inCoppia: coppia };
  const out: Indossati = {};
  const lui = t.chi === 'semina' ? undefined : t.accessorio;
  const lei = t.chi === 'semina' ? t.accessorio : t.chi === 'entrambi' ? t.accessorioSemina : undefined;
  if (t.chi !== 'nessuno') {
    const a = accessorioValido(accessorioPermesso('semino', lui, fiori, o));
    if (a) out.semino = a;
    const b = accessorioValido(accessorioPermesso('semina', lei, fiori, o));
    if (b) out.semina = b;
  }
  return out;
}

/** Le mascotte con il loro fumetto: solletico, storia (se c'è una tappa nuova), chiacchiere o un saluto. */
function Eroe(p: Props) {
  const stadio = Math.min(4, p.fiori);
  const tappa = p.tappa;
  const sol = p.solletico;
  const parla: ChiParla | 'entrambi' | 'nessuno' = sol ? sol.chi : tappa ? tappa.chi : p.chiacchiera ? p.chiacchiera.chi : 'semino';
  const coppia = p.sbloccata;
  const riposo = useAccessoriRiposo(!sol && !tappa && !p.chiacchiera, coppia, p.fiori, p.giorno);
  // l'accessorio della frase aperta (storia o chiacchiera) lo indossa chi parla; il solletico non lo toglie
  const indossati: Indossati = { ...riposo };
  if (tappa) Object.assign(indossati, accessoriTappa(tappa, p.fiori, coppia));
  else if (!sol && p.chiacchiera) {
    const a = accessorioValido(p.chiacchiera.accessorio);
    if (a) indossati[p.chiacchiera.chi] = a;
  }
  const variante =
    parla === 'semina' ? ' fumetto--semina' : parla === 'entrambi' ? ' fumetto--entrambi' : parla === 'nessuno' ? ' fumetto--narra' : '';
  const giorno = p.giorno ? GIORNI_SPECIALI[p.giorno] : null;
  const saluto =
    p.fiori === 0
      ? `Ciao ${p.nome}. Il giardino aspetta il primo fiore.`
      : giorno
        ? `${giorno.nome}. ${giorno.descrizione}`
        : `Ciao ${p.nome}. Nel giardino ${p.fiori === 1 ? 'c’è 1 fiore' : `ci sono ${p.fiori} fiori`}.`;
  const m = p.mascotte;
  // chi ha il fumetto aperto muove la bocca per il tempo della frase
  const frase = sol?.testo ?? tappa?.testo ?? p.chiacchiera?.testo ?? saluto;
  return (
    <section className={`home-eroe parla-${parla}`} aria-live="polite">
      <span className="home-mascotte">
        {coppia ? (
          <SeminoCoppia
            stadio={stadio}
            umore={m.semino.umore}
            umoreSemina={m.semina.umore}
            impulso={m.semino.impulso + m.semina.impulso}
            accessorioSemino={indossati.semino}
            accessorioSemina={indossati.semina}
            onSolletico={p.onSolletico}
            taglia={72}
            parla={parla === 'nessuno' ? null : parla}
            frase={frase}
            entrata="salto"
            seguiPuntatore
          />
        ) : (
          <Semino
            stadio={stadio}
            umore={solo(p) && m.semino.umore === 'neutro' ? 'preoccupato' : m.semino.umore}
            impulso={m.semino.impulso}
            accessorio={indossati.semino}
            onSolletico={() => p.onSolletico('semino')}
            taglia={92}
            parla={parla === 'semino' || parla === 'entrambi'}
            frase={frase}
            entrata="salto"
            seguiPuntatore
          />
        )}
      </span>
      {sol ? (
        <p key={sol.id} className={`fumetto fumetto-solletico${variante}`} data-testid="fumetto-solletico">
          {sol.testo}
        </p>
      ) : tappa ? (
        <button key={tappa.chiave} className={`fumetto fumetto-storia${variante}`} onClick={p.onChiudiTappa}>
          {tappa.testo}
          <span className="fumetto-firma">{firma(tappa.chi) ? `${firma(tappa.chi)}, tocca per chiudere` : 'tocca per chiudere'}</span>
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

function firma(chi: ChiParla | 'entrambi' | 'nessuno'): string {
  return chi === 'nessuno' ? '' : chi === 'entrambi' ? 'Semino e Semina' : chi === 'semina' ? 'Semina' : 'Semino';
}

export function Pallino({
  connessione,
  partner,
  occupata = false,
  femminile = false,
}: {
  connessione: StatoConnessione;
  partner: string;
  occupata?: boolean;
  /** per il testo "sei già collegato/a" (Mati → collegata) */
  femminile?: boolean;
}) {
  return (
    <span className={`pallino pallino-${occupata ? 'occupata' : connessione}`}>
      <i data-testid={connessione === 'connesso' ? 'connesso' : undefined} aria-hidden="true" />
      <span className="pallino-testo">
        {occupata ? `sei già ${femminile ? 'collegata' : 'collegato'} da un altro dispositivo` : testoConnessione(connessione, partner)}
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
