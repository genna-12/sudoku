// @vitest-environment jsdom
// Segreto per Matilde (T9 C): i capitoli 0-8, letti la prima volta o riletti dal diario, devono restare
// identici a com'erano prima della storia viva dal 9. Snapshot preso PRIMA di ogni modifica di T9 C:
// se cambia, qualcosa di nuovo è arrivato nei primi capitoli. Non aggiornarlo senza la lead.
//   - ogni battuta di ogni capitolo 0-8 (lettura dopo la vittoria, con lo sfondo della Scena come in App)
//   - la rilettura dal diario (prima e ultima battuta) e il diario del Giardino con 0-8 letti
//   - ora e data fisse (timer finti, Date, performance, rAF), Math.random fisso; gli id di useId
//     (contatore globale di React) rinumerati per ordine di comparsa dentro ogni snapshot
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAPITOLI, type Capitolo } from '../config/capitoli';
import { accessorioValido } from './useMascotte';
import { diario, giardinoDelCapitolo } from './capitoli';
import { ATTESA_CONTINUA_MS, CapitoloScena, GUARDIA_MS } from './CapitoloScena';
import { Giardino } from './Giardino';
import { Scena } from './Scena';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PRIMI = CAPITOLI.filter((c) => c.fiore <= 8);
/** i fiori della coppia al momento della lettura: tanti (lo sfondo è comunque com'era al capitolo) */
const FIORI = 100;

let box: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.useFakeTimers({
    now: new Date('2026-11-11T10:00:00'),
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  box = document.createElement('div');
  document.body.appendChild(box);
  root = createRoot(box);
});
afterEach(() => {
  act(() => root.unmount());
  box.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** il render, con gli id di useId (es. «r3», :r3:, _r_3_) rinumerati per ordine di comparsa */
function html(): string {
  const ids = new Map<string, string>();
  return box.innerHTML.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g, (m) => {
    if (!ids.has(m)) ids.set(m, `«id${ids.size}»`);
    return ids.get(m)!;
  });
}

const vestitoDisegnato = (id: string) => !!accessorioValido(id);

/** come App.sfondoDi: la Scena della Home dietro i capitoli di aiuola e giardino */
function sfondoDi(c: Capitolo) {
  const v = c.fondale ?? c.luogo;
  if (v !== 'aiuola' && v !== 'giardino') return undefined;
  const g = giardinoDelCapitolo(c.fiore, FIORI);
  return (
    <div className="capitolo-sfondo" aria-hidden="true">
      <Scena elementi={g.elementi.filter((e) => e !== 'stelle')} fiori={Math.min(FIORI, c.fiore)} bluPresenza={g.bluPresenza} altezza={240} intera senzaEntrate />
    </div>
  );
}

function monta(c: Capitolo, rilettura = false) {
  act(() =>
    root.render(
      <CapitoloScena
        capitolo={c}
        indice={1}
        totale={rilettura ? undefined : 1}
        stadio={Math.min(4, c.fiore)}
        onContinua={() => {}}
        rilettura={rilettura}
        accessoriDisegnati={vestitoDisegnato}
        sfondo={sfondoDi(c)}
      />,
    ),
  );
}

function avanti() {
  act(() => vi.advanceTimersByTime(GUARDIA_MS + 10));
  act(() => box.querySelector<HTMLButtonElement>('.capitolo-avanti')!.click());
}

/** fino all'ultima battuta, con "Continua" comparso */
function finoAllaFine(c: Capitolo) {
  for (let i = 1; i < c.battute.length; i++) avanti();
  act(() => vi.advanceTimersByTime(GUARDIA_MS + ATTESA_CONTINUA_MS + 10));
}

describe('Segreto per Matilde: i capitoli 0-8 non cambiano', () => {
  it.each(PRIMI.map((c) => [c.fiore, c] as const))('capitolo %i, lettura: ogni battuta', (_, c) => {
    monta(c);
    const viste: string[] = [html()];
    for (let i = 1; i < c.battute.length; i++) {
      avanti();
      viste.push(html());
    }
    act(() => vi.advanceTimersByTime(GUARDIA_MS + ATTESA_CONTINUA_MS + 10));
    viste.push(html());
    expect(box.querySelector('[data-testid="capitolo-continua"]')).not.toBeNull();
    viste.forEach((v, i) => expect(v).toMatchSnapshot(i < c.battute.length ? `battuta ${i}` : 'fine con Continua'));
  });

  it.each(PRIMI.map((c) => [c.fiore, c] as const))('capitolo %i, rilettura dal diario: prima e ultima battuta', (_, c) => {
    monta(c, true);
    expect(html()).toMatchSnapshot('prima');
    finoAllaFine(c);
    expect(html()).toMatchSnapshot('ultima con Chiudi');
  });

  it('il diario del Giardino con i capitoli 0-8 letti', () => {
    const visti = PRIMI.map((c) => `capitolo-${c.fiore}`);
    act(() =>
      root.render(
        <Giardino
          storico={[]}
          inCorso={null}
          sbloccata
          visti={visti}
          elementi={[]}
          bluPresenza={0}
          mascotte={{ semino: { umore: 'neutro', impulso: 0 }, semina: { umore: 'neutro', impulso: 0 } }}
          solletico={null}
          onSolletico={() => {}}
          onRiprendi={() => {}}
          onEsci={() => {}}
          diario={diario(visti)}
          onRileggi={() => {}}
        />,
      ),
    );
    expect(box.querySelector('[data-testid="diario"]')!.outerHTML).toMatchSnapshot('diario');
    expect(html()).toMatchSnapshot('giardino intero');
  });
});
