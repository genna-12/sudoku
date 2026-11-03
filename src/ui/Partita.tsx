import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { StatoConnessione } from '../net';
import { griglia } from '../stato';
import type { Giocatore, StatoPartita } from '../stato';
import { Cruscotto } from './Cruscotto';
import { Griglia } from './Griglia';
import type { Arrivo, Lampo } from './Griglia';
import { IconaAnnulla, IconaCancella, IconaCuore, IconaIndietro, IconaMatita, IconaMenu } from './Icone';
import type { Chiacchiera } from './Home';
import { Tastierino } from './Tastierino';
import { Semino, stadioDaCrescita } from './Semino';
import { crescita, mascotteDi } from './regole';
import { accessorioValido } from './useMascotte';
import type { Indossati, Mascotte } from './useMascotte';
import type { ChiParla } from '../config/frasi';
import { altro, sguardo, tempo, testoConnessione } from './util';
import type { Battuta, Tono } from './Toasts';

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
  sbloccata: boolean;
  mascotte: Mascotte;
  chiacchiera: Chiacchiera | null;
  /** reazioni, frasi del partner e avvisi della partita (escono dal fumetto, mai sopra la griglia) */
  battuta: Battuta | null;
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
  /** regalo: Semino riempie la cella; false se non si può */
  onSuggerisci: (idx: number) => boolean;
  onMossa: (idx: number, v: number, note: number[]) => void;
  onAnnulla: () => void;
  puoAnnullare: boolean;
  onCursore: (idx: number | null) => void;
  onFrase: () => void;
  onEsci: () => void;
  lampo: Lampo | null;
  arrivo: Arrivo | null;
}

const CHIP: Partial<Record<StatoConnessione, string>> = {
  connessione: 'mi collego',
  'in-attesa': 'in attesa',
  errore: 'offline',
};

export function Partita(p: Props) {
  const { partita } = p;
  const [sel, setSel] = useState<number | null>(null);
  const [matita, setMatita] = useState(false);
  const [menu, setMenu] = useState(false);
  const [regaloAttivo, setRegaloAttivo] = useState(false);
  const [evidenziato, setEvidenziato] = useState(0);
  const valori = useMemo(() => griglia(partita), [partita]);
  const restano = useMemo(() => {
    const r = Array<number>(10).fill(9);
    valori.forEach((v) => v && r[v]--);
    return r;
  }, [valori]);

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

  const modificabile = sel !== null && partita.puzzle.dati[sel] === 0 && !partita.finita;

  function seleziona(i: number) {
    setSel(i);
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
  const annulla = p.onAnnulla;
  useEffect(() => {
    function suTasto(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
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
            <b className="altro-dispositivo" data-testid="personale-connesso" title="Un altro tuo dispositivo è collegato" />
          )}
        </span>
        <div className="menu-ancora">
          <button
            className="icona-bottone"
            onClick={() => setMenu((m) => !m)}
            aria-label="Opzioni"
            aria-expanded={menu}
          >
            <IconaMenu />
          </button>
          {menu && (
            <>
              <div className="menu-velo" onPointerDown={() => setMenu(false)} />
              <div className="menu" role="menu">
                <label className="menu-voce">
                  <span>Mostra errori</span>
                  <input
                    type="checkbox"
                    className="interruttore"
                    checked={p.mostraErrori}
                    onChange={(e) => p.onImpostazione('mostraErrori', e.target.checked)}
                  />
                </label>
                <label className="menu-voce">
                  <span>Vibrazione</span>
                  <input
                    type="checkbox"
                    className="interruttore"
                    checked={p.vibrazione}
                    onChange={(e) => p.onImpostazione('vibrazione', e.target.checked)}
                  />
                </label>
                <button className="menu-voce" onClick={p.onEsci}>
                  Torna alla home
                </button>
              </div>
            </>
          )}
        </div>
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
              fumetto={!desktop && detto ? <FumettoPartita detto={detto} destra={!!destra && detto.chi === destra} /> : null}
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
            detto={desktop ? detto : null}
            guarda={guarda}
            onSolletico={p.onSolletico}
          />
          <div className="strumenti">
            <button className="strumento" onClick={p.onAnnulla} disabled={!p.puoAnnullare}>
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
            <button className="strumento strumento-cuore" onClick={p.onFrase}>
              <IconaCuore />
              <span>Manda frase</span>
            </button>
          </div>

          <Tastierino restano={restano} matita={matita} onCifra={premi} />
        </div>
      </div>
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

const MEDIA_DESKTOP = '(min-width: 860px) and (min-aspect-ratio: 1/1)';
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
 * mascotte che parla (coda verso di lei), al massimo due righe. Classe `toast` e
 * `data-categoria` restano per i test a due client.
 */
function FumettoPartita({ detto, destra, pannello = false }: { detto: Detto; destra: boolean; pannello?: boolean }) {
  const tono = detto.voce ? `voce-${detto.chi}` : `tono-${detto.tono ?? 'mio'}`;
  return (
    <div
      key={detto.id}
      className={`battuta toast ${tono}${destra ? ' a-destra' : ''}${pannello ? ' battuta-pannello' : ''}${detto.solletico ? ' battuta-solletico' : ''}`}
      data-categoria={detto.categoria ?? (detto.solletico ? 'solletico' : detto.voce ? 'chiacchiera' : undefined)}
      data-testid={detto.solletico ? 'fumetto-solletico' : undefined}
      role="status"
      title={pannello ? undefined : detto.testo}
    >
      <p className="battuta-righe">
        {detto.firma && <b className="battuta-firma">{detto.firma}</b>}
        <span data-testid="toast-testo">{detto.testo}</span>
      </p>
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
            />
          </span>
        ))}
      </div>
      {d ? (
        <FumettoPartita detto={d} destra={chi.length > 1 && d.chi === chi[1]} pannello />
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
