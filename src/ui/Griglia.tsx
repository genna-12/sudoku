import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Gabbia, Puzzle } from '../engine';
import type { Cella, Giocatore } from '../stato';
import { cellaConFocus, etichettaCella } from './cella';

export interface Lampo {
  id: number;
  centro: number;
  celle: number[];
}
export interface Arrivo {
  id: number;
  idx: number;
  /** mossa del partner (alone del suo colore) o sua reazione importante (lampo d'oro) */
  tipo?: 'mossa' | 'evento';
}

const DOPPIO_TOCCO_MS = 320;
const RIGHE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

interface Props {
  puzzle: Puzzle;
  valori: number[];
  celle: Record<number, Cella>;
  selezionata: number | null;
  onSeleziona: (idx: number) => void;
  mostraErrori: boolean;
  mioRuolo: Giocatore;
  partnerCursore: number | null;
  lampo: Lampo | null;
  arrivo: Arrivo | null;
  /** cifra evidenziata col doppio tocco (0 = nessuna) */
  evidenziato: number;
  onDoppio: (idx: number) => void;
  /** regalo attivo: si sceglie la cella da far riempire a Semino */
  sceltaRegalo: boolean;
  /** nome del partner nell'etichetta delle celle che ha scritto lui/lei ("Blu" prima di Semina) */
  nomePartner?: string;
  /** il focus della tastiera (Tab) è entrato in una cella: diventa la selezionata */
  onFocalizza?: (idx: number) => void;
}

const D = 9; // rientro del contorno della gabbia, in centesimi di cella

/** Contorno tratteggiato interno di ogni gabbia, come un unico path SVG (unità: 100 per cella). */
function tracciaGabbie(gabbie: Gabbia[]): string {
  const id = new Array<number>(81).fill(-1);
  gabbie.forEach((g, k) => g.celle.forEach((i) => (id[i] = k)));
  const s = (r: number, c: number) => (r < 0 || r > 8 || c < 0 || c > 8 ? -2 : id[r * 9 + c]);
  const parti: string[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const g = s(r, c);
      const su = s(r - 1, c) !== g;
      const giu = s(r + 1, c) !== g;
      const sx = s(r, c - 1) !== g;
      const dx = s(r, c + 1) !== g;
      const X = c * 100;
      const Y = r * 100;
      // estremo di un lato: rientra se l'angolo è convesso, sporge se è concavo, altrimenti a filo
      const capo = (bordoPerp: boolean, diag: boolean) => (bordoPerp ? D : diag ? -D : 0);
      if (su) {
        const x0 = X + capo(sx, s(r - 1, c - 1) === g);
        const x1 = X + 100 - capo(dx, s(r - 1, c + 1) === g);
        parti.push(`M${x0} ${Y + D}H${x1}`);
      }
      if (giu) {
        const x0 = X + capo(sx, s(r + 1, c - 1) === g);
        const x1 = X + 100 - capo(dx, s(r + 1, c + 1) === g);
        parti.push(`M${x0} ${Y + 100 - D}H${x1}`);
      }
      if (sx) {
        const y0 = Y + capo(su, s(r - 1, c - 1) === g);
        const y1 = Y + 100 - capo(giu, s(r + 1, c - 1) === g);
        parti.push(`M${X + D} ${y0}V${y1}`);
      }
      if (dx) {
        const y0 = Y + capo(su, s(r - 1, c + 1) === g);
        const y1 = Y + 100 - capo(giu, s(r + 1, c + 1) === g);
        parti.push(`M${X + 100 - D} ${y0}V${y1}`);
      }
    }
  }
  return parti.join('');
}

/** il lampo comprende tutto il box 3×3 della cella appena scritta (il box si è chiuso) */
function chiudeBox(centro: number, celle: number[]): boolean {
  const r = Math.floor(centro / 9);
  const c = centro % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  const tutte = new Set(celle);
  for (let k = 0; k < 9; k++) if (!tutte.has((br + Math.floor(k / 3)) * 9 + bc + (k % 3))) return false;
  return true;
}

const LINEE_SOTTILI = [1, 2, 4, 5, 7, 8]
  .map((k) => `M${k * 100} 0V900M0 ${k * 100}H900`)
  .join('');
const LINEE_SPESSE = [3, 6].map((k) => `M${k * 100} 0V900M0 ${k * 100}H900`).join('');

export function Griglia(p: Props) {
  const { puzzle, valori } = p;
  const gabbie = puzzle.gabbie;

  const killer = useMemo(() => {
    if (!gabbie) return null;
    const somme = new Map<number, { somma: number; k: number }>();
    gabbie.forEach((g, k) => somme.set(Math.min(...g.celle), { somma: g.somma, k }));
    return { somme, path: tracciaGabbie(gabbie) };
  }, [gabbie]);

  const vuote = useMemo(() => {
    const v: number[] = [];
    puzzle.dati.forEach((d, i) => d === 0 && v.length < 2 && v.push(i));
    return v;
  }, [puzzle]);

  // un box chiuso: la griglia "respira" (1.01 e ritorno), una volta per lampo
  const el = useRef<HTMLDivElement>(null);
  const lampoId = p.lampo?.id;
  const lampoBox = !!p.lampo && chiudeBox(p.lampo.centro, p.lampo.celle);
  useEffect(() => {
    const e = el.current;
    if (!lampoId || !lampoBox || !e || typeof e.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    e.animate([{ scale: '1' }, { scale: '1.01', offset: 0.4 }, { scale: '1' }], {
      duration: 380,
      delay: 120,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, [lampoId, lampoBox]);

  // il focus del DOM segue la selezione (frecce, Esc) se la tastiera è già sulla griglia o da nessuna parte
  const celleEl = useRef<Array<HTMLDivElement | null>>([]);
  const attiva = cellaConFocus(p.selezionata);
  useEffect(() => {
    const g = el.current;
    const c = celleEl.current[attiva];
    if (!g || !c || p.selezionata === null) return;
    const att = document.activeElement;
    if (att === c) return;
    if (att && att !== document.body && !g.contains(att)) return;
    c.focus({ preventScroll: true });
  }, [attiva, p.selezionata]);

  // un tocco dà anche il focus alla cella: lì la selezione l'ha già fatta il tocco
  const ultimoPuntatore = useRef(0);
  function focalizzata(i: number) {
    if (performance.now() - ultimoPuntatore.current < 600) return;
    if (i !== p.selezionata) p.onFocalizza?.(i);
  }

  const ultimoTocco = useRef({ idx: -1, t: 0 });
  function tocca(i: number) {
    const ora = performance.now();
    ultimoPuntatore.current = ora;
    const u = ultimoTocco.current;
    if (u.idx === i && ora - u.t < DOPPIO_TOCCO_MS) {
      ultimoTocco.current = { idx: -1, t: 0 };
      p.onDoppio(i);
    } else ultimoTocco.current = { idx: i, t: ora };
    p.onSeleziona(i);
  }

  const sel = p.selezionata;
  const selV = sel !== null ? valori[sel] : 0;
  const sr = sel !== null ? Math.floor(sel / 9) : -1;
  const sc = sel !== null ? sel % 9 : -1;
  const sb = sel !== null ? Math.floor(sr / 3) * 3 + Math.floor(sc / 3) : -1;
  const lampo = new Map<number, number>();
  if (p.lampo) {
    const cr = Math.floor(p.lampo.centro / 9);
    const cc = p.lampo.centro % 9;
    for (const i of p.lampo.celle) {
      lampo.set(i, Math.abs(Math.floor(i / 9) - cr) + Math.abs((i % 9) - cc));
    }
  }

  return (
    <div
      ref={el}
      className={`griglia${killer ? ' griglia-killer' : ''}${p.sceltaRegalo ? ' scelta-regalo' : ''}`}
      data-testid="griglia"
      data-seed={puzzle.seed}
      data-prima-vuota={vuote[0]}
      data-prima-vuota-valore={vuote[0] !== undefined ? puzzle.soluzione[vuote[0]] : undefined}
      data-seconda-vuota={vuote[1]}
      role="grid"
      aria-label="Griglia"
      aria-rowcount={9}
      aria-colcount={9}
    >
      {RIGHE.map((riga) => (
        // righe solo per l'accessibilità: `display: contents`, le celle restano figlie della griglia CSS
        <div key={riga} role="row" className="griglia-riga" aria-rowindex={riga + 1}>
      {valori.slice(riga * 9, riga * 9 + 9).map((v, k) => {
        const i = riga * 9 + k;
        const r = Math.floor(i / 9);
        const c = i % 9;
        const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const data = puzzle.dati[i] !== 0;
        const cella = p.celle[i];
        const note = !data && v === 0 && cella ? cella.note : [];
        const errore = p.mostraErrori && !data && v !== 0 && v !== puzzle.soluzione[i];
        const cls = ['cella'];
        if (data) cls.push('data');
        else if (v && cella) cls.push(cella.da === p.mioRuolo ? 'mia' : 'sua');
        if (p.evidenziato && v === p.evidenziato) cls.push('faro');
        if (i === sel) cls.push('selezionata');
        else if (selV && v === selV) cls.push('stessa');
        else if (r === sr || c === sc || b === sb) cls.push('vicina');
        if (errore) cls.push('errore');
        if (i === p.partnerCursore) cls.push('partner');
        const somma = killer?.somme.get(i);
        const ritardo = lampo.get(i);
        const descr = etichettaCella({
          r,
          c,
          v,
          data,
          errore,
          note,
          mia: !data && v && cella ? cella.da === p.mioRuolo : null,
          nomePartner: p.nomePartner,
          somma: somma?.somma,
        });
        return (
          <div
            key={i}
            className={cls.join(' ')}
            ref={(e) => {
              celleEl.current[i] = e;
            }}
            onPointerDown={() => tocca(i)}
            onFocus={() => focalizzata(i)}
            tabIndex={i === attiva ? 0 : -1}
            role="gridcell"
            aria-colindex={c + 1}
            aria-label={descr}
            aria-selected={i === sel}
            aria-readonly={data || undefined}
          >
            <span key={v} className="valore" data-testid={`cella-${i}`} data-note={note.join(',')}>
              {v || ''}
            </span>
            {note.length > 0 && (
              <span className="note" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <i key={n} className={selV === n && note.includes(n) ? 'acc' : ''}>
                    {note.includes(n) ? n : ''}
                  </i>
                ))}
              </span>
            )}
            {somma && (
              <span className="somma" data-testid={`somma-${somma.k}`} aria-hidden="true">
                {somma.somma}
              </span>
            )}
            {ritardo !== undefined && p.lampo && (
              <span
                key={`l${p.lampo.id}`}
                className="fx-lampo"
                style={{ '--ritardo': `${ritardo * 30}ms` } as CSSProperties}
                aria-hidden="true"
              />
            )}
            {p.arrivo?.idx === i && (
              <span
                key={`a${p.arrivo.id}`}
                className={p.arrivo.tipo === 'evento' ? 'fx-arrivo fx-evento' : 'fx-arrivo'}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
        </div>
      ))}
      <svg className="griglia-linee" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true">
        <path className="linea-sottile" d={LINEE_SOTTILI} />
        <path className="linea-spessa" d={LINEE_SPESSE} />
        {killer && <path className="linea-gabbia" d={killer.path} />}
      </svg>
    </div>
  );
}
