import { useEffect, useMemo, useRef, useState } from 'react';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { StatoConnessione } from '../net';
import { griglia } from '../stato';
import type { Giocatore, StatoPartita } from '../stato';
import { Griglia } from './Griglia';
import type { Arrivo, Lampo } from './Griglia';
import { IconaAnnulla, IconaCancella, IconaCuore, IconaIndietro, IconaMatita, IconaMenu } from './Icone';
import { tempo, testoConnessione } from './util';

interface Props {
  partita: StatoPartita;
  mioRuolo: Giocatore;
  partnerNome: string;
  connessione: StatoConnessione;
  partnerCursore: number | null;
  mostraErrori: boolean;
  onErrori: (v: boolean) => void;
  onMossa: (idx: number, v: number, note: number[]) => void;
  onAnnulla: () => void;
  puoAnnullare: boolean;
  onCursore: (idx: number | null) => void;
  onFrase: () => void;
  onEsci: () => void;
  lampo: Lampo | null;
  arrivo: Arrivo | null;
}

const CIFRE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
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
  }

  const onCursore = p.onCursore;
  useEffect(() => {
    onCursore(sel);
  }, [sel, onCursore]);
  useEffect(() => () => onCursore(null), [onCursore]);

  const modificabile = sel !== null && partita.puzzle.dati[sel] === 0 && !partita.finita;

  function premi(n: number) {
    if (!modificabile || sel === null) return;
    const v = valori[sel];
    if (matita) {
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
                    onChange={(e) => p.onErrori(e.target.checked)}
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
          <Griglia
            puzzle={partita.puzzle}
            valori={valori}
            celle={partita.celle}
            selezionata={sel}
            onSeleziona={setSel}
            mostraErrori={p.mostraErrori}
            mioRuolo={p.mioRuolo}
            partnerCursore={p.partnerCursore}
            lampo={p.lampo}
            arrivo={p.arrivo}
          />
        </div>

        <div className="comandi">
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

          <div className={`tastierino${matita ? ' in-matita' : ''}`}>
            {CIFRE.map((n) => (
              <button
                key={n}
                data-testid={`tasto-${n}`}
                className={`tasto${restano[n] <= 0 ? ' finito' : ''}`}
                onClick={() => premi(n)}
                aria-label={`${n}, ne restano ${Math.max(0, restano[n])}`}
              >
                <span className="tasto-cifra">{n}</span>
                <span className="tasto-resto">{Math.max(0, restano[n])}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
