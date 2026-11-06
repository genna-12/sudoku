import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { StatoConnessione } from '../net';
import { griglia } from '../stato';
import type { Giocatore, StatoPartita } from '../stato';
import { Cruscotto } from './Cruscotto';
import { Griglia } from './Griglia';
import type { Arrivo, Lampo } from './Griglia';
import { IconaAnnulla, IconaCancella, IconaCuore, IconaIndietro, IconaMatita, IconaNuova } from './Icone';
import { Menu } from './Menu';
import type { Tema } from './Menu';
import { useDialogo } from './dialogo';
import type { Chiacchiera } from './Home';
import { Tastierino } from './Tastierino';
import { useChiudiConIndietro } from './indietro';
import { Semino, stadioDaCrescita } from './Semino';
import { crescita, mascotteDi } from './regole';
import { accessorioValido } from './useMascotte';
import type { Indossati, Mascotte } from './useMascotte';
import type { ChiParla } from '../config/frasi';
import { altro, sguardo, tempo, testoConnessione } from './util';
import { delPartner } from './Toasts';
import type { Battuta, Tono } from './Toasts';
import { chiudiToccandoFuori } from './velo';

interface Props {
  partita: StatoPartita;
  mioRuolo: Giocatore;
  partnerNome: string;
  connessione: StatoConnessione;
  personaleConnesso: boolean;
  partnerCursore: number | null;
  mostraErrori: boolean;
  vibrazione: boolean;
  onImpostazione: (chiave: 'mostraErrori' | 'vibrazione', v: boolean) => void;
  tema: Tema;
  onTema: (t: Tema) => void;
  /** dal menù: la partita resta nel giardino come germoglio e si torna alla Home */
  onCancellaPartita: () => void;
  sbloccata: boolean;
  mascotte: Mascotte;
  chiacchiera: Chiacchiera | null;
  /** reazioni, frasi del partner e avvisi della partita (escono dal fumetto, mai sopra la griglia) */
  battuta: Battuta | null;
  /** fumetto fermato dal tocco: le battute si accodano; `onRiprendi(chiusa)` riparte chiudendo quella toccata */
  onFerma?: () => void;
  onRiprendi?: (chiusa?: number) => void;
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
  /** regalo: Semino riempie la cella; false se non si può */
  onSuggerisci: (idx: number) => boolean;
  onMossa: (idx: number, v: number, note: number[]) => void;
  /** annulla la mia ultima mossa; restituisce la cella interessata (si seleziona, così si vede cosa è cambiato) */
  onAnnulla: () => number | null | void;
  puoAnnullare: boolean;
  onCursore: (idx: number | null) => void;
  /** manda una frase al partner: quella scelta, o una a caso */
  onFrase: (testo?: string) => void;
  /** gesti nascosti: tocco sul tastierino, selezione di una cella con un numero (suggerimento una tantum) */
  onSuggerimento?: (evento: 'tastierino' | 'cella-piena') => void;
  /** le frasi da proporre nel foglio (sei) */
  frasiDaScegliere: () => string[];
  onEsci: () => void;
  /** partita finita (dopo "guarda la griglia"): una nuova dello stesso tipo */
  onNuova?: () => void;
  lampo: Lampo | null;
  arrivo: Arrivo | null;
}

/** quanto resta a schermo il suggerimento una tantum dei gesti (se non lo si tocca prima) */
const GESTO_MS = 4500;

/** menù e fogli aperti (anche il lettore dei capitoli e la Vittoria): finché ce n'è uno, la griglia non sente i tasti */
const DIALOGHI_APERTI = '[role="menu"], [role="dialog"], [role="alertdialog"]';

const CHIP: Partial<Record<StatoConnessione, string>> = {
  connessione: 'mi collego',
  'in-attesa': 'in attesa',
  errore: 'offline',
};

export function Partita(p: Props) {
  const { partita } = p;
  const [sel, setSel] = useState<number | null>(null);
  const [matita, setMatita] = useState(false);
  const [regaloAttivo, setRegaloAttivo] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const [proposte, setProposte] = useState<string[] | null>(null);
  // gesto indietro (ed Esc): chiude il foglio delle frasi (il menù lo fa da sé) prima di uscire dalla partita
  useChiudiConIndietro(proposte !== null, () => setProposte(null));
  const foglioFrasi = useRef<HTMLDivElement>(null);
  useDialogo(foglioFrasi, proposte !== null);
  const valori = useMemo(() => griglia(partita), [partita]);
  // "ne restano": con gli errori visibili contano solo i valori giusti, così un numero sbagliato non
  // esaurisce la cifra (senza errori visibili contano tutti: non si rivela cosa è sbagliato)
  const soluzione = partita.puzzle.soluzione;
  const mostraErrori = p.mostraErrori;
  const restano = useMemo(() => {
    const r = Array<number>(10).fill(9);
    valori.forEach((v, i) => {
      if (v && (!mostraErrori || v === soluzione[i])) r[v]--;
    });
    return r;
  }, [valori, soluzione, mostraErrori]);

  // nuova partita: si riparte senza selezione
  const seme = partita.puzzle.seed;
  const [semeVisto, setSemeVisto] = useState(seme);
  if (seme !== semeVisto) {
    setSemeVisto(seme);
    setSel(null);
    setEvidenziato(0);
    setRegaloAttivo(false);
  }
  const disponibili = partita.contatori?.[p.mioRuolo]?.regaliDisponibili ?? 0;
  if (regaloAttivo && (disponibili <= 0 || partita.finita)) setRegaloAttivo(false);

  const onCursore = p.onCursore;
  useEffect(() => {
    onCursore(sel);
  }, [sel, onCursore]);
  useEffect(() => () => onCursore(null), [onCursore]);

  // con gli errori visibili una cella giusta è definitiva, come le date
  const modificabile =
    sel !== null && partita.puzzle.dati[sel] === 0 && !partita.finita && !(p.mostraErrori && valori[sel] === soluzione[sel]);

  function seleziona(i: number) {
    setSel(i);
    // il faro del doppio tocco si spegne su una cella con un altro numero o vuota
    const v = valori[i];
    setEvidenziato((e) => (e && v !== e ? 0 : e));
    if (v) p.onSuggerimento?.('cella-piena');
    if (regaloAttivo && p.onSuggerisci(i)) setRegaloAttivo(false);
  }

  function doppio(i: number) {
    const v = valori[i];
    setEvidenziato((e) => (!v || e === v ? 0 : v));
  }

  function premi(n: number, nota = matita) {
    if (!modificabile || sel === null) return;
    const v = valori[sel];
    if (nota) {
      if (v !== 0) return;
      const note = partita.celle[sel]?.note ?? [];
      const nuove = note.includes(n) ? note.filter((x) => x !== n) : [...note, n].sort();
      p.onMossa(sel, 0, nuove);
    } else {
      p.onMossa(sel, v === n ? 0 : n, []);
    }
  }

  function cancella() {
    if (!modificabile || sel === null) return;
    const c = partita.celle[sel];
    if (c && (c.v || c.note.length)) p.onMossa(sel, 0, []);
  }

  // tastiera fisica (desktop)
  const tastiera = useRef({ premi, cancella, sel });
  useEffect(() => {
    tastiera.current = { premi, cancella, sel };
  });
  const onAnnulla = p.onAnnulla;
  const annulla = useCallback(() => {
    const i = onAnnulla();
    if (typeof i === 'number') setSel(i);
  }, [onAnnulla]);
  useEffect(() => {
    function suTasto(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      // con un menù o un foglio aperto i tasti sono loro (frecce tra le voci, cifre nei campi), anche se
      // il focus è finito sul body (un clic su una parte non focalizzabile del menù, il lettore dei capitoli)
      if (document.querySelector(DIALOGHI_APERTI)) return;
      const t = tastiera.current;
      if (/^[1-9]$/.test(e.key)) t.premi(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') t.cancella();
      else if (e.key === 'n' || e.key === 'p') setMatita((m) => !m);
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) annulla();
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const s = t.sel ?? 40;
        const r = Math.floor(s / 9);
        const c = s % 9;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[
          e.key as 'ArrowUp'
        ] ?? [0, 0];
        setSel(((r + dr + 9) % 9) * 9 + ((c + dc + 9) % 9));
      } else if (e.key === 'Escape') setSel(null);
    }
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [annulla]);

  // la chiacchiera aperta fa indossare il suo accessorio a chi parla
  const indossati: Indossati = {};
  const acc = accessorioValido(p.chiacchiera?.accessorio);
  if (acc && p.chiacchiera) indossati[p.chiacchiera.chi] = acc;

  // cosa si dice adesso: il regalo attivo dà l'istruzione; altrimenti la frase più recente
  const sinistra: ChiParla = p.sbloccata ? mascotteDi(p.mioRuolo) : 'semino';
  const destra: ChiParla | null = p.sbloccata ? mascotteDi(altro(p.mioRuolo)) : null;
  const detto: Detto | null = regaloAttivo
    ? { id: -1, chi: sinistra, testo: 'Tocca la cella che devo riempire', tono: 'regalo', categoria: 'regalo-aiuto' }
    : ultimo([
        p.solletico && { ...p.solletico, voce: true, solletico: true },
        p.battuta,
        p.chiacchiera && { ...p.chiacchiera, voce: true },
      ]);
  // tocco sul fumetto: la prima volta resta aperto (e si può scorrere) finché non lo si tocca di nuovo;
  // intanto le battute si accodano (useBattute.ferma), solo una frase del partner lo sostituisce
  const [fermo, setFermo] = useState<Detto | null>(null);
  const [chiuso, setChiuso] = useState<number | null>(null);
  if (fermo && detto && detto.id > fermo.id && delPartner(detto)) setFermo(null);
  // il suggerimento una tantum dei gesti si ferma da sé: resta GESTO_MS (o fino al tocco), le reazioni aspettano
  const [gestoVisto, setGestoVisto] = useState<number | null>(null);
  const gesto = p.battuta?.categoria === 'gesto' ? p.battuta : null;
  if (gesto && gesto.id !== gestoVisto) {
    setGestoVisto(gesto.id);
    if (!regaloAttivo) setFermo(gesto);
  }
  const mostrato: Detto | null = regaloAttivo ? detto : fermo ? fermo : detto && detto.id !== chiuso ? detto : null;
  const { onFerma, onRiprendi } = p;
  // uscendo dalla partita col fumetto fermato, le battute ripartono
  useEffect(() => () => onRiprendi?.(), [onRiprendi]);
  const fermoOra = useRef(fermo);
  useEffect(() => {
    fermoOra.current = fermo;
  });
  const gestoFermo = fermo?.categoria === 'gesto' ? fermo.id : null;
  useEffect(() => {
    if (gestoFermo === null) return;
    onFerma?.();
    const t = window.setTimeout(() => {
      if (fermoOra.current?.id !== gestoFermo) return;
      setFermo(null);
      setChiuso(gestoFermo);
      onRiprendi?.(gestoFermo);
    }, GESTO_MS);
    return () => window.clearTimeout(t);
  }, [gestoFermo, onFerma, onRiprendi]);
  function toccaFumetto(d: Detto) {
    if (d.id < 0) return;
    if (fermo?.id === d.id) {
      setFermo(null);
      setChiuso(d.id);
      onRiprendi?.(d.id);
    } else {
      setFermo(d);
      onFerma?.();
    }
  }
  const desktop = useDesktop();
  const guarda = sel === null ? null : { r: Math.floor(sel / 9), c: sel % 9 };

  const livello = LIVELLI_PARAMETRI[partita.puzzle.livello].etichetta;
  const nomeModalita = partita.puzzle.modalita === 'killer' ? 'Killer' : 'Sudoku';

  return (
    <main className="schermata partita">
      <header className="barra">
        <button className="icona-bottone" data-testid="indietro" onClick={p.onEsci} aria-label="Torna alla home">
          <IconaIndietro />
        </button>
        <div className="barra-titolo">
          <span className="barra-livello">{livello}</span>
          <span className="barra-modalita">{nomeModalita}</span>
        </div>
        <span className="timer tabellare" aria-label="Tempo">
          {tempo(partita.secondi)}
        </span>
        <span
          className={`partner-chip pallino-${p.connessione}`}
          title={testoConnessione(p.connessione, p.partnerNome)}
        >
          <i aria-hidden="true" />
          <span>{CHIP[p.connessione] ?? (p.partnerNome || 'in due')}</span>
          {p.personaleConnesso && (
            <b className="altro-dispositivo" data-testid="personale-connesso" title="Anche il tuo altro dispositivo è qui" aria-label="Anche il tuo altro dispositivo è qui" />
          )}
        </span>
        <Menu
          contesto="partita"
          mostraErrori={p.mostraErrori}
          vibrazione={p.vibrazione}
          tema={p.tema}
          inCorso={!partita.finita}
          sbloccata={p.sbloccata}
          onImpostazione={p.onImpostazione}
          onTema={p.onTema}
          onCancellaPartita={p.onCancellaPartita}
          onEsci={p.onEsci}
        />
      </header>

      <div className="tavolo">
        <div className="griglia-box">
          <div className="cruscotto-box">
            <Cruscotto
              partita={partita}
              mioRuolo={p.mioRuolo}
              sbloccata={p.sbloccata}
              mascotte={p.mascotte}
              indossati={indossati}
              onSolletico={p.onSolletico}
              mostraErrori={p.mostraErrori}
              regaloAttivo={regaloAttivo}
              onRegalo={() => setRegaloAttivo((a) => !a)}
              guarda={guarda}
              fumetto={
                !desktop && mostrato ? (
                  <FumettoPartita
                    detto={mostrato}
                    destra={!!destra && mostrato.chi === destra}
                    fermo={fermo?.id === mostrato.id}
                    onTocca={toccaFumetto}
                  />
                ) : null
              }
              parla={!desktop && mostrato ? { chi: mostrato.chi, testo: mostrato.testo } : null}
            />
          </div>
          <Griglia
            puzzle={partita.puzzle}
            valori={valori}
            celle={partita.celle}
            selezionata={sel}
            onSeleziona={seleziona}
            evidenziato={evidenziato}
            onDoppio={doppio}
            sceltaRegalo={regaloAttivo}
            mostraErrori={p.mostraErrori}
            mioRuolo={p.mioRuolo}
            nomePartner={p.partnerNome}
            onFocalizza={setSel}
            partnerCursore={p.partnerCursore}
            lampo={p.lampo}
            arrivo={p.arrivo}
          />
        </div>

        <div className="comandi">
          <PannelloMascotte
            partita={partita}
            mioRuolo={p.mioRuolo}
            sbloccata={p.sbloccata}
            mascotte={p.mascotte}
            indossati={indossati}
            detto={desktop ? mostrato : null}
            fermo={fermo?.id ?? null}
            onTocca={toccaFumetto}
            guarda={guarda}
            onSolletico={p.onSolletico}
          />
          <div className={`strumenti${partita.finita ? ' strumenti-fine' : ''}`}>
            {partita.finita ? (
              <>
                <p className="strumenti-fiorita" data-testid="partita-fiorita">
                  {p.sbloccata ? 'Fiorita insieme!' : 'Fiorita!'}
                </p>
                {p.onNuova && (
                  <button className="strumento strumento-nuova" data-testid="partita-nuova" onClick={p.onNuova}>
                    <IconaNuova />
                    <span>Nuova partita</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button className="strumento" data-testid="annulla" onClick={annulla} disabled={!p.puoAnnullare}>
                  <IconaAnnulla />
                  <span>Annulla</span>
                </button>
                <button className="strumento" data-testid="cancella" onClick={cancella}>
                  <IconaCancella />
                  <span>Cancella</span>
                </button>
                <button
                  className={`strumento${matita ? ' acceso' : ''}`}
                  data-testid="matita"
                  aria-pressed={matita}
                  onClick={() => setMatita((m) => !m)}
                >
                  <IconaMatita />
                  <span>Note</span>
                </button>
              </>
            )}
            <button
              className="strumento strumento-cuore"
              data-testid="manda-frase"
              aria-label="Manda una frase"
              aria-haspopup="dialog"
              onClick={() => setProposte(p.frasiDaScegliere())}
            >
              <IconaCuore />
              <span>Frase</span>
            </button>
          </div>

          <Tastierino
            restano={restano}
            matita={matita}
            spento={!!partita.finita}
            onCifra={(n, nota) => {
              p.onSuggerimento?.('tastierino');
              premi(n, nota);
            }}
          />
        </div>
      </div>
      {proposte && (
        <div className="foglio-velo foglio-velo-leggero" {...chiudiToccandoFuori(() => setProposte(null))}>
          <div ref={foglioFrasi} className="foglio foglio-frasi" role="dialog" aria-modal="true" aria-label="Scegli una frase da mandare" data-testid="foglio-frasi">
            <p className="foglio-frasi-titolo">Manda una frase</p>
            <div className="foglio-frasi-lista">
              {proposte.map((t, i) => (
                <button
                  key={t}
                  className="frase-proposta"
                  data-testid={`frase-proposta-${i}`}
                  onClick={() => {
                    setProposte(null);
                    p.onFrase(t);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="foglio-azioni">
              <button className="bottone" onClick={() => setProposte(null)}>
                Chiudi
              </button>
              <button
                className="bottone primario"
                data-testid="frase-a-caso"
                onClick={() => {
                  setProposte(null);
                  p.onFrase();
                }}
              >
                A caso
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Una cosa detta in partita: battuta, chiacchiera o solletico (`voce` = parla a nome suo, col suo colore). */
interface Detto {
  id: number;
  chi: ChiParla;
  testo: string;
  tono?: Tono;
  categoria?: string;
  firma?: string;
  voce?: boolean;
  solletico?: boolean;
}

function ultimo(c: Array<Detto | null | false | undefined>): Detto | null {
  let u: Detto | null = null;
  for (const d of c) if (d && (!u || d.id > u.id)) u = d;
  return u;
}

const MEDIA_DESKTOP = '(min-width: 860px) and (min-aspect-ratio: 1/1) and (min-height: 501px)';
function iscrivi(cb: () => void) {
  const m = window.matchMedia?.(MEDIA_DESKTOP);
  m?.addEventListener('change', cb);
  return () => m?.removeEventListener('change', cb);
}
/** stesso confine del CSS: su desktop il fumetto sta nel pannello, su telefono nel cruscotto */
function useDesktop() {
  return useSyncExternalStore(
    iscrivi,
    () => !!window.matchMedia?.(MEDIA_DESKTOP).matches,
    () => false,
  );
}

/**
 * Il fumetto della partita su telefono: copre per un attimo la barra di crescita, accanto alla
 * mascotte che parla (coda verso di lei), tre righe e poi scorre. Un tocco lo ferma (resta aperto),
 * un secondo tocco lo chiude. Classe `toast` e `data-categoria` restano per i test a due client.
 */
function FumettoPartita({
  detto,
  destra,
  pannello = false,
  fermo = false,
  onTocca,
}: {
  detto: Detto;
  destra: boolean;
  pannello?: boolean;
  fermo?: boolean;
  onTocca?: (d: Detto) => void;
}) {
  const tono = detto.voce ? `voce-${detto.chi}` : `tono-${detto.tono ?? 'mio'}`;
  return (
    <div
      key={detto.id}
      className={`battuta toast ${tono}${destra ? ' a-destra' : ''}${pannello ? ' battuta-pannello' : ''}${detto.solletico ? ' battuta-solletico' : ''}${fermo ? ' fermo' : ''}`}
      data-categoria={detto.categoria ?? (detto.solletico ? 'solletico' : detto.voce ? 'chiacchiera' : undefined)}
      data-testid={detto.solletico ? 'fumetto-solletico' : undefined}
      data-fermo={fermo ? 'true' : undefined}
      role="status"
      onClick={() => onTocca?.(detto)}
    >
      <p className="battuta-righe">
        {detto.firma && <b className="battuta-firma">{detto.firma}</b>}
        <span data-testid="toast-testo">{detto.testo}</span>
      </p>
      {fermo && <span className="nascosto-visivo">resta aperto, tocca di nuovo per chiudere</span>}
    </div>
  );
}

/**
 * Su desktop le mascotte stanno qui, accanto alla griglia e sopra i comandi, più grandi e col
 * fumetto sotto (su telefono restano nel cruscotto: questo pannello è nascosto dal CSS).
 */
function PannelloMascotte(p: {
  partita: StatoPartita;
  mioRuolo: Giocatore;
  sbloccata: boolean;
  mascotte: Mascotte;
  indossati: Indossati;
  detto: Detto | null;
  fermo: number | null;
  onTocca: (d: Detto) => void;
  guarda: { r: number; c: number } | null;
  onSolletico: (chi: ChiParla) => void;
}) {
  const stadio = stadioDaCrescita(crescita(p.partita, p.mioRuolo).frazione);
  const chi: ChiParla[] = p.sbloccata ? [mascotteDi(p.mioRuolo), mascotteDi(altro(p.mioRuolo))] : ['semino'];
  const d = p.detto;
  // niente da dire: se qualcuno dorme si sente il suo "zzz", altrimenti il posto resta vuoto
  const dormiente = chi.find((c) => p.mascotte[c].umore === 'dorme');
  return (
    <section className={`pannello-mascotte${chi.length > 1 ? ' in-due' : ''}`} aria-label="Le mascotte">
      <div className="pannello-mascotte-figure">
        {chi.map((c, i) => (
          <span
            key={c}
            className={`pannello-mascotte-figura figura-${c} guarda${d?.chi === c ? ' parla' : ''}`}
            style={sguardo(p.guarda, chi.length > 1 ? (i ? 1.42 : 1.18) : 1.3, 0.1)}
          >
            <Semino
              chi={c}
              stadio={stadio}
              umore={p.mascotte[c].umore}
              impulso={p.mascotte[c].impulso}
              accessorio={p.indossati[c]}
              onSolletico={() => p.onSolletico(c)}
              taglia={96}
              parla={d?.chi === c}
              frase={d?.chi === c ? d.testo : undefined}
            />
          </span>
        ))}
      </div>
      {d ? (
        <FumettoPartita detto={d} destra={chi.length > 1 && d.chi === chi[1]} pannello fermo={p.fermo === d.id} onTocca={p.onTocca} />
      ) : (
        <div
          className={`battuta battuta-pannello battuta-quieta${dormiente ? '' : ' vuota'}${dormiente && chi.length > 1 && dormiente === chi[1] ? ' a-destra' : ''}`}
          aria-hidden={!dormiente}
        >
          <p className="battuta-righe">{dormiente ? 'zzz…' : '\u00a0'}</p>
        </div>
      )}
    </section>
  );
}
