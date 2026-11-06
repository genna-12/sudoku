import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { LIVELLI } from '../engine';
import type { Livello, Modalita } from '../engine';
import { SEMINA_ARRIVA_A } from '../config/capitoli';
import type { ChiParla } from '../config/frasi';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import { GIORNI_SPECIALI } from '../config/storia';
import type { GiornoSpeciale } from '../config/storia';
import type { Momento } from '../config/sonno';
import type { StatoConnessione } from '../net';
import type { Giocatore, StatoPartita } from '../stato';
import { MenuHome } from './MenuHome';
import { SemiTitolo } from './Icone';
import type { Tema } from './MenuHome';
import type { InfoSync } from './useSync';
import type { GiardinoVisibile } from './capitoli';
import { aCasoDiverso, primaInHome, vestitiIniziali, vestitiRiposo } from './regole';
import type { VestitiRiposo } from './regole';
import { ELEMENTI_SCENA, Scena } from './Scena';
import { Semino, SeminoCoppia, SeminoPianta } from './Semino';
import { accessorioValido } from './useMascotte';
import type { Indossati, Mascotte } from './useMascotte';
import { CHIAVI, leggi, scrivi, tempo, testoConnessione } from './util';

export interface Chiacchiera {
  id: number;
  chi: ChiParla;
  testo: string;
  /** accessorio da indossare mentre il fumetto è aperto */
  accessorio?: string;
  /** firma sotto il fumetto (l'eco di un capitolo: "Semino · dal capitolo 12") */
  firma?: string;
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
  /** il giardino visibile su questo dispositivo (senza tracce di Semina prima del capitolo 5) */
  giardino: GiardinoVisibile;
  /** giorno del mare / della montagna (solo dopo l'arrivo di Semina e col luogo visitato), o null */
  giorno: GiornoSpeciale | null;
  /** capitoli letti da chi tiene il telefono: i vestiti vengono dai luoghi visitati */
  visti: readonly string[];
  /** il momento del giorno per il cielo della scena (assente col tema forzato) */
  momento?: Momento;
  /** la prima volta che un vestito compare in Home (per giocatore): chiacchiera del suo luogo */
  onVestitoNuovo?: (chi: ChiParla, id: string) => void;
  /** l'eco di un capitolo sta per essere detta: il vestito nuovo aspetta (studio-ux §4) */
  ecoInArrivo?: boolean;
  /** capitoli in coda da leggere (0 = niente bottone) */
  daLeggere: number;
  onLeggi: () => void;
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
  /** memoria condivisa (Worker): stato per il menù */
  sync?: InfoSync;
  onSincronizza?: () => void;
  onContinua: () => void;
  onNuova: (m: Modalita, l: Livello) => void;
  onGiardino: () => void;
  onCambia: () => void;
  /** tocco sulla cassetta della posta della scena */
  onPosta?: () => void;
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
        elementi={p.giardino.elementi}
        fiori={p.fiori}
        bluPresenza={p.giardino.bluPresenza}
        altezza={220}
        sfuma
        titolo
        momento={p.momento}
        nuovi={inEvidenza(p)}
      />
      {/* la cassetta della scena si tocca: un bottone trasparente sopra di lei (la scena sta sotto
          titolo e mascotte, che altrimenti prenderebbero il tocco) */}
      {p.onPosta && p.giardino.elementi.includes('cassetta') && (
        <button
          type="button"
          className="cassetta-bottone"
          data-testid="cassetta"
          aria-label="La cassetta della posta: le frasi che vi siete mandati"
          onClick={p.onPosta}
        />
      )}
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
            quotaBlu={p.fiori > 0 ? p.giardino.bluPresenza * 0.5 : undefined}
          />
          <span className="giardino-etichetta">
            Giardino · <span className="tabellare">{p.fiori}</span>
          </span>
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
          sync={p.sync}
          onSincronizza={p.onSincronizza}
        />
      </header>

      <h1 className="titolo home-titolo">
        Sudoku
        <br />
        di coppia
        <SemiTitolo />
      </h1>

      <Eroe {...p} />

      {p.daLeggere > 0 && (
        <button data-testid="capitoli-da-leggere" className="da-leggere" onClick={p.onLeggi}>
          <span className="da-leggere-punto" aria-hidden="true" />
          {p.daLeggere === 1 ? '1 capitolo da leggere' : `${p.daLeggere} capitoli da leggere`}
        </button>
      )}

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

/** ogni quanto (±10%) cambiano i vestiti a riposo */
const RIPOSO_MS = 90000;
/** vestiti già comparsi in Home su questo dispositivo, per giocatore (`chi:id`) */
const CHIAVE_VESTITI_VISTI = 'sudoku-vestiti-visti';
/** pausa fra il fumetto che si chiude (o l'entrata) e la battuta del vestito nuovo */
const PAUSA_VESTITO_MS = 1200;

/** Elemento della scena da far entrare di nuovo: quello del giorno speciale. */
function inEvidenza(p: Pick<Props, 'giorno' | 'giardino'>): string[] | undefined {
  const visibili = p.giardino.elementi;
  const g = p.giorno ? GIORNI_SPECIALI[p.giorno].scena : '';
  return g && visibili.includes(g) && (ELEMENTI_SCENA as readonly string[]).includes(g) ? [g] : undefined;
}

const stessi = (a: VestitiRiposo, b: VestitiRiposo) => a.semino === b.semino && a.semina === b.semina;

/**
 * I vestiti a riposo in Home (docs/design/studio-ux.md §4): si entra con quelli dell'ultimo capitolo letto
 * (o del giorno speciale); ogni ~90 s, mai con un fumetto aperto, cambiano tutti e due insieme fra quelli
 * dei luoghi visitati (`vestitiRiposo`: 3 volte su 4 dello stesso luogo). Prima dell'arrivo di Semina
 * solo Semino. La prima volta che un vestito compare qui (per giocatore) lo si dice a `onNuovo`.
 */
function useAccessoriRiposo(
  attivo: boolean,
  sbloccata: boolean,
  visti: readonly string[],
  giorno: GiornoSpeciale | null,
  ruolo: Giocatore,
  onNuovo?: (chi: ChiParla, id: string) => void,
  ecoInArrivo = false,
): Indossati {
  const [indossati, setIndossati] = useState<VestitiRiposo>(() => vestitiIniziali({ visti, sbloccata, giorno }));
  // il ritmo non riparte a ogni fumetto (le chiacchiere arrivano più spesso di 90 s): se allo
  // scadere c'è un fumetto aperto, si riprova poco dopo
  const vivo = useRef({ attivo, sbloccata, visti, giorno, indossati, onNuovo });
  useEffect(() => {
    vivo.current = { attivo, sbloccata, visti, giorno, indossati, onNuovo };
  });
  // un capitolo letto con la Home aperta (i visti sono un prefisso: basta la lunghezza): i suoi vestiti
  useEffect(() => {
    const v = vivo.current;
    const dopo = vestitiIniziali({ visti: v.visti, sbloccata: v.sbloccata, giorno: v.giorno });
    setIndossati((x) => (stessi(x, dopo) ? x : dopo));
  }, [visti.length, sbloccata, giorno]);
  useEffect(() => {
    let t = 0;
    const prossimo = (ms: number) => {
      t = window.setTimeout(() => {
        const v = vivo.current;
        if (!v.attivo) return prossimo(5000);
        setIndossati(vestitiRiposo({ visti: v.visti, sbloccata: v.sbloccata, giorno: v.giorno, prima: v.indossati }));
        prossimo(RIPOSO_MS * (0.9 + Math.random() * 0.2));
      }, ms);
    };
    prossimo(RIPOSO_MS * (0.9 + Math.random() * 0.2));
    return () => window.clearTimeout(t);
  }, []);
  // vestito mai comparso in Home per questo giocatore: prima l'eco, poi (a fumetti chiusi) la sua
  // chiacchiera; si segna "visto" solo quando la battuta esce
  useEffect(() => {
    const chiave = `${CHIAVE_VESTITI_VISTI}-${ruolo}`;
    const salvati = leggi<unknown>(chiave);
    const giaVisti = new Set(Array.isArray(salvati) ? salvati.filter((x): x is string => typeof x === 'string') : []);
    const chi: ChiParla[] = sbloccata ? ['semino', 'semina'] : ['semino'];
    const nuovi = chi.filter((c) => indossati[c] && !giaVisti.has(`${c}:${indossati[c]}`));
    if (primaInHome({ eco: ecoInArrivo, vestitoNuovo: nuovi.length > 0, fumettoAperto: !attivo }) !== 'vestito') return;
    const t = window.setTimeout(() => {
      const c = aCasoDiverso(nuovi, undefined)!;
      vivo.current.onNuovo?.(c, indossati[c]!);
      for (const x of nuovi) giaVisti.add(`${x}:${indossati[x]}`);
      scrivi(chiave, [...giaVisti]);
    }, PAUSA_VESTITO_MS);
    return () => window.clearTimeout(t);
  }, [indossati, sbloccata, ruolo, attivo, ecoInArrivo]);
  const out: Indossati = { semino: accessorioValido(indossati.semino) };
  if (sbloccata) out.semina = accessorioValido(indossati.semina);
  return out;
}

/** Le mascotte con il loro fumetto: solletico, chiacchiere (anche l'eco di un capitolo) o un saluto. */
function Eroe(p: Props) {
  const stadio = Math.min(4, p.fiori);
  const sol = p.solletico;
  const parla: ChiParla = sol ? sol.chi : p.chiacchiera ? p.chiacchiera.chi : 'semino';
  const coppia = p.sbloccata;
  const riposo = useAccessoriRiposo(!sol && !p.chiacchiera, coppia, p.visti, p.giorno, p.mioRuolo, p.onVestitoNuovo, !!p.ecoInArrivo);
  // l'accessorio della chiacchiera aperta lo indossa chi parla; il solletico non lo toglie
  const indossati: Indossati = { ...riposo };
  if (!sol && p.chiacchiera) {
    const a = accessorioValido(p.chiacchiera.accessorio);
    if (a) indossati[p.chiacchiera.chi] = a;
  }
  const variante = parla === 'semina' ? ' fumetto--semina' : '';
  const giorno = p.giorno ? GIORNI_SPECIALI[p.giorno] : null;
  const saluto =
    p.fiori === 0
      ? `Ciao ${p.nome}. Il giardino aspetta il primo fiore.`
      : giorno
        ? `${giorno.nome}. ${giorno.descrizione}`
        : `Ciao ${p.nome}. Nel giardino ${p.fiori === 1 ? 'c’è 1 fiore' : `ci sono ${p.fiori} fiori`}.`;
  const m = p.mascotte;
  // chi ha il fumetto aperto muove la bocca per il tempo della frase
  const frase = sol?.testo ?? p.chiacchiera?.testo ?? saluto;
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
            parla={parla}
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
            parla={parla === 'semino'}
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
      ) : p.chiacchiera ? (
        <p key={p.chiacchiera.id} className={`fumetto${variante}`} data-testid={p.chiacchiera.firma ? 'fumetto-eco' : undefined}>
          {p.chiacchiera.testo}
          {p.chiacchiera.firma && <span className="fumetto-firma">{p.chiacchiera.firma}</span>}
        </p>
      ) : (
        <p className="fumetto fumetto-quieto">{saluto}</p>
      )}
    </section>
  );
}

/** Un fiore prima dello sblocco: Semino si sente solo e la Home invita a giocare insieme. */
function solo(p: Pick<Props, 'fiori' | 'sbloccata'>): boolean {
  return !p.sbloccata && p.fiori === SEMINA_ARRIVA_A - 1;
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
