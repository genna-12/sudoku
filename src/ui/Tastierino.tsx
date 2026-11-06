import { useEffect, useRef, useState } from 'react';

const CIFRE = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PRESSIONE_LUNGA_MS = 380;

interface Props {
  /** quante ne restano per cifra (indice 1..9) */
  restano: number[];
  matita: boolean;
  /** `nota` = scrivere come nota a matita invece che come valore */
  onCifra: (n: number, nota: boolean) => void;
  /** partita finita: i tasti restano al loro posto ma spenti */
  spento?: boolean;
}

/**
 * Tastierino 1–9. Tenere premuto un numero = note momentanee: quel numero (e gli altri toccati
 * mentre lo si tiene) va nelle note; al rilascio si torna a scrivere valori.
 */
export function Tastierino({ restano, matita, onCifra, spento = false }: Props) {
  const [tenuto, setTenuto] = useState<number | null>(null);
  const timer = useRef(0);
  const lungo = useRef<number | null>(null);
  const salta = useRef(new Set<number>());

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function giu(n: number) {
    if (tenuto !== null && n !== tenuto) {
      // secondo dito mentre si tiene un numero: nota anche questo
      salta.current.add(n);
      onCifra(n, true);
      return;
    }
    lungo.current = null;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      lungo.current = n;
      setTenuto(n);
      onCifra(n, true);
      navigator.vibrate?.(8);
    }, PRESSIONE_LUNGA_MS);
  }

  function su(n: number) {
    window.clearTimeout(timer.current);
    if (tenuto === n) setTenuto(null);
  }

  function click(n: number) {
    if (salta.current.delete(n)) return;
    if (lungo.current === n) {
      lungo.current = null;
      return;
    }
    onCifra(n, matita);
  }

  return (
    <div className={`tastierino${matita ? ' in-matita' : ''}${tenuto !== null ? ' note-momentanee' : ''}${spento ? ' spento' : ''}`} inert={spento}>
      {CIFRE.map((n) => (
        <button
          key={n}
          data-testid={`tasto-${n}`}
          className={`tasto${restano[n] <= 0 ? ' finito' : ''}${tenuto === n ? ' tenuto' : ''}`}
          onPointerDown={() => giu(n)}
          onPointerUp={() => su(n)}
          onPointerCancel={() => su(n)}
          onPointerLeave={() => su(n)}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => click(n)}
          aria-label={`${n}, ne restano ${Math.max(0, restano[n])}`}
        >
          <span className="tasto-cifra">{n}</span>
          <span className="tasto-resto">{Math.max(0, restano[n])}</span>
        </button>
      ))}
    </div>
  );
}
