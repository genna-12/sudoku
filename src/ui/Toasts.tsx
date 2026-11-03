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

/** Coda dei messaggi fuori dalla partita (Home, Giardino): passano uno alla volta. */
export function useToasts() {
  const [attivi, setAttivi] = useState<Toast[]>([]);
  const coda = useRef<Toast[]>([]);
  const occupato = useRef(false);
  const timer = useRef<number[]>([]);

  useEffect(() => () => timer.current.forEach((t) => window.clearTimeout(t)), []);

  const prossimo = useCallback(function avanza() {
    const t = coda.current.shift();
    if (!t) {
      occupato.current = false;
      return;
    }
    occupato.current = true;
    setAttivi((a) => [...a, t]);
    timer.current.push(
      window.setTimeout(() => {
        setAttivi((a) => a.filter((x) => x.id !== t.id));
        avanza();
      }, DURATA[t.tipo]),
    );
  }, []);

  const mostra = useCallback(
    (t: Omit<Toast, 'id'>) => {
      if (!t.testo) return;
      if (coda.current.length > 3) return; // niente valanghe
      coda.current.push({ ...t, id: prossimoId++ });
      if (!occupato.current) prossimo();
    },
    [prossimo],
  );

  return { attivi, mostra };
}

export function Toasts({ attivi }: { attivi: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {attivi.map((t) =>
        t.tipo === 'banner' ? (
          <div key={t.id} className="toast toast-banner" data-categoria={t.categoria}>
            {t.prefisso && <span className="toast-prefisso">{t.prefisso}</span>}
            <span data-testid="toast-testo">{t.testo}</span>
          </div>
        ) : (
          <div key={t.id} className="toast toast-grande" style={{ color: t.colore }}>
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

const DURATA_BATTUTA_MS = 3200;
/** una battuta resta almeno così prima che la successiva la sostituisca */
const MINIMO_BATTUTA_MS = 1200;
let ultimoIdBattuta = 0;

export function useBattute() {
  const [ora, setOra] = useState<Battuta | null>(null);
  const s = useRef<{ inizio: number; visibile: boolean; attesa: { b: Battuta; ms: number } | null }>({
    inizio: 0,
    visibile: false,
    attesa: null,
  });
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const apri = useCallback(function apri(b: Battuta, ms: number) {
    s.current.inizio = Date.now();
    s.current.visibile = true;
    setOra(b);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(function chiudi() {
      const a = s.current.attesa;
      s.current.attesa = null;
      if (a) apri(a.b, a.ms);
      else {
        s.current.visibile = false;
        setOra(null);
      }
    }, ms);
  }, []);

  const dici = useCallback(
    (x: Omit<Battuta, 'id'>, ms = DURATA_BATTUTA_MS) => {
      if (!x.testo) return;
      ultimoIdBattuta = Math.max(Date.now(), ultimoIdBattuta + 1);
      const b = { ...x, id: ultimoIdBattuta };
      const passato = Date.now() - s.current.inizio;
      if (s.current.visibile && passato < MINIMO_BATTUTA_MS) {
        // la precedente ha appena iniziato: questa aspetta il suo turno (e scavalca altre in attesa)
        s.current.attesa = { b, ms };
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          const a = s.current.attesa;
          s.current.attesa = null;
          if (a) apri(a.b, a.ms);
        }, MINIMO_BATTUTA_MS - passato);
      } else apri(b, ms);
    },
    [apri],
  );

  return { battuta: ora, dici };
}
