import { useCallback, useEffect, useRef, useState } from 'react';

export interface Toast {
  id: number;
  testo: string;
  /** piccolo: sale dalla cella; banner: in alto; grande: frase del partner al centro */
  tipo: 'piccolo' | 'banner' | 'grande';
  /** coordinate in px (solo piccolo) */
  x?: number;
  y?: number;
  /** colore dell'inchiostro (variabile CSS o colore) */
  colore?: string;
  firma?: string;
}

const DURATA = { piccolo: 1400, banner: 2400, grande: 3600 } as const;
let prossimoId = 1;

/**
 * Coda unica dei messaggi fluttuanti. I "piccoli" partono subito (sono effimeri e legati
 * a una cella); banner e grandi passano uno alla volta.
 */
export function useToasts() {
  const [attivi, setAttivi] = useState<Toast[]>([]);
  const coda = useRef<Toast[]>([]);
  const occupato = useRef(false);
  const timer = useRef<number[]>([]);

  useEffect(() => () => timer.current.forEach((t) => window.clearTimeout(t)), []);

  const togliDopo = useCallback((t: Toast, poi?: () => void) => {
    timer.current.push(
      window.setTimeout(() => {
        setAttivi((a) => a.filter((x) => x.id !== t.id));
        poi?.();
      }, DURATA[t.tipo]),
    );
  }, []);

  const prossimo = useCallback(
    function avanza() {
      const t = coda.current.shift();
      if (!t) {
        occupato.current = false;
        return;
      }
      occupato.current = true;
      setAttivi((a) => [...a, t]);
      togliDopo(t, avanza);
    },
    [togliDopo],
  );

  const mostra = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const toast = { ...t, id: prossimoId++ };
      if (toast.tipo === 'piccolo') {
        setAttivi((a) => [...a, toast]);
        togliDopo(toast);
        return;
      }
      if (coda.current.length > 3) return; // niente valanghe
      coda.current.push(toast);
      if (!occupato.current) prossimo();
    },
    [prossimo, togliDopo],
  );

  return { attivi, mostra };
}

export function Toasts({ attivi }: { attivi: Toast[] }) {
  return (
    <div className="toasts" aria-live="polite">
      {attivi.map((t) =>
        t.tipo === 'piccolo' ? (
          <div
            key={t.id}
            className="toast toast-piccolo"
            style={{ left: t.x, top: t.y, color: t.colore }}
          >
            {t.testo}
          </div>
        ) : t.tipo === 'banner' ? (
          <div key={t.id} className="toast toast-banner">
            {t.testo}
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
