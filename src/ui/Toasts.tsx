import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChiParla } from '../config/frasi';

export interface Toast {
  id: number;
  testo: string;
  /** banner: in alto (fuori dalla partita); grande: frase del partner al centro (mai in partita) */
  tipo: 'banner' | 'grande';
  /** colore dell'inchiostro (variabile CSS o colore) */
  colore?: string;
  firma?: string;
  /** chi parla (nome della mascotte del partner), mostrato prima del testo */
  prefisso?: string;
  /** categoria della frase (per i test e lo stile) */
  categoria?: string;
}

const DURATA = { banner: 2400, grande: 3600 } as const;
let prossimoId = 1;

/** Durata di una battuta (o di un testo da leggere): 3,2 s, +60 ms per carattere oltre i 40, al massimo 7 s. */
export function durataBattuta(testo: string): number {
  const extra = Math.max(0, [...(testo ?? '')].length - 40) * 60;
  return Math.min(7000, 3200 + extra);
}

/**
 * Durata di un toast: base del tipo (la frase grande dura almeno quanto serve a leggerla); con altri
 * in coda si accorcia (−20% per ognuno, mai sotto il 40% né sotto 1,2 s) invece di scartarli.
 */
export function durataToast(tipo: Toast['tipo'], testo: string, inCoda: number): number {
  // il banner lungo resta di più: +60 ms per carattere oltre i 40 (come le battute, H6)
  const base = tipo === 'grande' ? Math.max(DURATA.grande, durataBattuta(testo)) : DURATA.banner + durataBattuta(testo) - durataBattuta('');
  const fattore = Math.max(0.4, 1 - 0.2 * Math.max(0, inCoda));
  return Math.round(Math.max(1200, base * fattore));
}

/** Coda dei messaggi fuori dalla partita (Home, Giardino): passano uno alla volta. */
export function useToasts() {
  const [attivi, setAttivi] = useState<Toast[]>([]);
  const coda = useRef<Toast[]>([]);
  const occupato = useRef(false);
  const timer = useRef<number[]>([]);

  useEffect(() => () => timer.current.forEach((t) => window.clearTimeout(t)), []);

  /** il toast a schermo adesso e come toglierlo (a tempo o al tocco) */
  const corrente = useRef<{ id: number; fine: () => void } | null>(null);

  const prossimo = useCallback(function avanza() {
    const t = coda.current.shift();
    if (!t) {
      occupato.current = false;
      corrente.current = null;
      return;
    }
    occupato.current = true;
    const ms = durataToast(t.tipo, t.prefisso ? `${t.prefisso} ${t.testo}` : t.testo, coda.current.length);
    setAttivi((a) => [...a, { ...t, ms }]);
    let fatto = false;
    const fine = () => {
      if (fatto) return;
      fatto = true;
      window.clearTimeout(h);
      setAttivi((a) => a.filter((x) => x.id !== t.id));
      avanza();
    };
    const h = window.setTimeout(fine, ms);
    timer.current.push(h);
    corrente.current = { id: t.id, fine };
  }, []);

  const mostra = useCallback(
    (t: Omit<Toast, 'id'>) => {
      if (!t.testo) return;
      // niente scarti: con la coda piena i prossimi durano meno (durataToast)
      coda.current.push({ ...t, id: prossimoId++ });
      if (!occupato.current) prossimo();
    },
    [prossimo],
  );

  /** tocco sul toast: se ne va subito e passa il prossimo */
  const chiudi = useCallback((id: number) => {
    if (corrente.current?.id === id) corrente.current.fine();
  }, []);

  return { attivi, mostra, chiudi };
}

export function Toasts({ attivi, onChiudi }: { attivi: Array<Toast & { ms?: number }>; onChiudi?: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {attivi.map((t) =>
        t.tipo === 'banner' ? (
          <div key={t.id} className="toast toast-banner" data-categoria={t.categoria} style={{ animationDuration: t.ms ? `${t.ms}ms` : undefined }}>
            {t.prefisso && <span className="toast-prefisso">{t.prefisso}</span>}
            <span data-testid="toast-testo">{t.testo}</span>
          </div>
        ) : (
          <div
            key={t.id}
            className="toast toast-grande"
            data-testid="toast-grande"
            style={{ color: t.colore, animationDuration: t.ms ? `${t.ms}ms` : undefined }}
            role="button"
            tabIndex={-1}
            aria-label={`${t.testo}${t.firma ? `, da ${t.firma}` : ''}. Tocca per chiudere`}
            onPointerDown={() => onChiudi?.(t.id)}
          >
            <span className="toast-grande-testo">{t.testo}</span>
            {t.firma && <span className="toast-firma">{t.firma}</span>}
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------
   Battute della partita: tutto ciò che si dice mentre si gioca (reazioni alle mosse, frasi del
   partner, avvisi) esce dal fumetto della mascotte che parla, nel cruscotto (telefono) o nel
   pannello accanto alla griglia (desktop). Mai sopra le celle.
   ------------------------------------------------------------------------------------------ */

/** di chi è il colore del fumetto: mio, del partner, errore, riga/box completati, regalo */
export type Tono = 'mio' | 'suo' | 'errore' | 'completato' | 'regalo';

export interface Battuta {
  id: number;
  chi: ChiParla;
  testo: string;
  tono: Tono;
  categoria?: string;
  /** nome di chi l'ha mandata (frasi del partner, reazioni sue dopo lo sblocco) */
  firma?: string;
}

/** un commento automatico resta almeno così prima che il successivo lo sostituisca */
const MINIMO_BATTUTA_MS = 1200;
/** commenti automatici tenuti da parte mentre il fumetto è fermato (gli altri si scartano) */
const MAX_IN_ATTESA_FERMO = 3;
let ultimoIdBattuta = 0;

/** la frase mandata dal partner: non si scarta mai e ha la precedenza sui commenti automatici */
export const delPartner = (b: { categoria?: string }) => b.categoria === 'frase';

interface Voce {
  b: Battuta;
  ms: number;
}

/**
 * Coda delle battute in partita (studio-ux §5.1). Le frasi del partner non si scartano mai: in attesa
 * passano davanti a tutto e, a schermo, restano per il loro tempo pieno; i commenti automatici che
 * arrivano intanto si saltano. Un commento automatico a schermo lascia subito il posto a una frase del
 * partner; un altro commento lo sostituisce solo dopo 1,2 s (di quelli in attesa vale l'ultimo). `ferma`: il fumetto toccato
 * resta aperto (timer fermo) e i commenti si accodano (al massimo tre); una frase del partner lo
 * sostituisce subito. `riprendi(chiusa)`: si riparte, chiudendo subito la battuta `chiusa` se è a schermo.
 */
export function useBattute() {
  const [ora, setOra] = useState<Battuta | null>(null);
  const s = useRef<{ cur: Voce | null; inizio: number; partner: Voce[]; auto: Voce[]; fermo: boolean }>({
    cur: null,
    inizio: 0,
    partner: [],
    auto: [],
    fermo: false,
  });
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // avanza (passa alla prossima in coda) e programma (quando cambiare): funzioni stabili sui ref
  const [motore] = useState(() => {
    function avanza() {
      const x = s.current;
      const v = x.partner.shift() ?? x.auto.shift() ?? null;
      if (!v) {
        x.cur = null;
        setOra(null);
        return;
      }
      x.cur = v;
      x.inizio = Date.now();
      setOra(v.b);
      programma();
    }
    /** quando cambia la battuta a schermo: a fine durata, o prima se un commento ha qualcuno in attesa */
    function programma() {
      window.clearTimeout(timer.current);
      const x = s.current;
      if (!x.cur || x.fermo) return;
      const limite = !delPartner(x.cur.b) && x.auto.length > 0 ? MINIMO_BATTUTA_MS : x.cur.ms;
      const resta = x.inizio + limite - Date.now();
      if (resta <= 0) avanza();
      else timer.current = window.setTimeout(avanza, resta);
    }
    return { avanza, programma };
  });
  const { avanza, programma } = motore;

  const dici = useCallback(
    (y: Omit<Battuta, 'id'>, minimo = 0) => {
      if (!y.testo) return;
      // quanto serve a leggerla (chi chiama può chiedere di più, mai di meno)
      const ms = Math.max(minimo, durataBattuta(y.testo));
      ultimoIdBattuta = Math.max(Date.now(), ultimoIdBattuta + 1);
      const v: Voce = { b: { ...y, id: ultimoIdBattuta }, ms };
      const x = s.current;
      if (delPartner(v.b)) {
        x.auto = [];
        if (x.fermo) {
          // il fumetto fermato lascia il posto alla frase del partner
          x.fermo = false;
          x.partner.unshift(v);
          avanza();
          return;
        }
        x.partner.push(v);
        // ha la precedenza: un commento automatico a schermo lascia subito il posto
        if (x.cur && !delPartner(x.cur.b)) {
          avanza();
          return;
        }
      } else if (x.fermo) {
        x.auto.push(v);
        if (x.auto.length > MAX_IN_ATTESA_FERMO) x.auto.shift();
        return;
      } else if (x.cur && (delPartner(x.cur.b) || x.partner.length)) {
        // c'è (o aspetta) una frase del partner: il commento automatico si salta
        return;
      } else x.auto = [v];
      if (!x.cur) avanza();
      else programma();
    },
    [avanza, programma],
  );

  const ferma = useCallback(() => {
    s.current.fermo = true;
    window.clearTimeout(timer.current);
  }, []);

  const riprendi = useCallback(
    (chiusa?: number) => {
      const x = s.current;
      if (!x.fermo) return;
      x.fermo = false;
      if (!x.cur || x.cur.b.id === chiusa) avanza();
      else {
        x.inizio = Date.now();
        programma();
      }
    },
    [avanza, programma],
  );

  return { battuta: ora, dici, ferma, riprendi };
}
