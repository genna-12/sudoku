// Stanza di revisione (solo per Genna, si apre con la sua frase dall'Ingresso): tutti i capitoli 0-100 nel
// lettore vero, com'è dopo ogni vittoria, più un'anteprima di Home e diario "dopo il capitolo N".
// Isolamento: nessun archivio, nessuna rete, nessuna scrittura in localStorage/IndexedDB; App non è
// montata (Radice.tsx). Ricaricando la pagina si riparte dall'app normale.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { COLORI_RUOLO } from '../config/giocatori';
import { CAPITOLI, capitolo as capitoloDi } from '../config/capitoli';
import type { Capitolo } from '../config/capitoli';
import { ATTI } from '../config/luoghi';
import { giardinoDelCapitolo } from './capitoli';
import { CapitoloScena, LUOGHI } from './CapitoloScena';
import { Diario } from './Giardino';
import { useChiudiConIndietro, useGestoIndietro } from './indietro';
import { ULTIMO_CAPITOLO, bluMentreLeggi, dopoCapitolo } from './revisione';
import { Scena } from './Scena';
import { Semino, SeminoCoppia } from './Semino';
import { accessorioValido } from './useMascotte';
import './revisione.css';

/** come in App: i vestiti dei capitoli si disegnano solo se esistono */
const vestitoDisegnato = (id: string) => !!accessorioValido(id);

/** Il fondale di aiuola e giardino com'è in App subito dopo la vittoria che porta il capitolo (fiori = N). */
function sfondoDi(c: Capitolo) {
  const v = c.fondale ?? c.luogo;
  if (v !== 'aiuola' && v !== 'giardino') return undefined;
  const g = giardinoDelCapitolo(c.fiore, c.fiore);
  return (
    <div className="capitolo-sfondo" aria-hidden="true">
      <Scena elementi={g.elementi.filter((e) => e !== 'stelle')} fiori={c.fiore} bluPresenza={g.bluPresenza} altezza={240} intera senzaEntrate senzaMemoria />
    </div>
  );
}

const nulla = () => {};
/** come in App con il profilo Verde: --mio e --suo per i fumetti dell'anteprima */
const STILE = { '--mio': COLORI_RUOLO.a, '--suo': COLORI_RUOLO.b } as CSSProperties;

export function Revisione({ onEsci }: { onEsci: () => void }) {
  const [aperto, setAperto] = useState<number | null>(null);
  const [dopo, setDopo] = useState<number | null>(null);
  const ultimoAperto = useRef<number | null>(null);

  // il blu degli accenti (sul root, come fa App): quello del momento che si guarda; all'uscita torna com'era
  useLayoutEffect(() => {
    const r = document.documentElement;
    const prima = r.style.getPropertyValue('--blu-presenza');
    return () => {
      if (prima) r.style.setProperty('--blu-presenza', prima);
      else r.style.removeProperty('--blu-presenza');
    };
  }, []);
  const dati = dopo !== null ? dopoCapitolo(dopo) : null;
  const blu = aperto !== null ? bluMentreLeggi(aperto) : dati ? dati.giardino.bluPresenza : 1;
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--blu-presenza', String(blu));
  }, [blu]);

  // indietro (Android) ed Esc chiudono l'anteprima e poi il lettore; dall'elenco non si esce per sbaglio
  useGestoIndietro(() => ({ schermata: 'revisione', entrato: false, bloccato: false }), nulla);
  useChiudiConIndietro(aperto !== null, () => setAperto(null));
  useChiudiConIndietro(dopo !== null, () => setDopo(null));

  // tornati all'elenco: il focus sulla riga dell'ultimo capitolo aperto
  useEffect(() => {
    if (aperto !== null) {
      ultimoAperto.current = aperto;
      return;
    }
    const n = ultimoAperto.current;
    if (n !== null) document.querySelector<HTMLElement>(`[data-testid="revisione-${n}"]`)?.focus({ preventScroll: false });
  }, [aperto]);

  const c = aperto !== null ? capitoloDi(aperto) : undefined;

  return (
    <div className="app revisione-app" style={STILE}>
      <main className="schermata revisione" inert={aperto !== null || dopo !== null} data-testid="revisione">
        <header className="revisione-testa">
          <div className="revisione-titoli">
            <p className="revisione-etichetta">Revisione</p>
            <h1 className="revisione-titolo">Tutti i capitoli</h1>
            <p className="revisione-nota">Come li vede chi gioca, dalla prima battuta. Niente si salva, niente si collega.</p>
          </div>
          <button type="button" className="bottone revisione-esci" data-testid="revisione-esci" onClick={onEsci}>
            Esci
          </button>
        </header>
        {ATTI.map((atto) => (
          <section className="revisione-atto" key={atto.nome} aria-labelledby={`revisione-atto-${atto.da}`}>
            <h2 className="revisione-atto-nome" id={`revisione-atto-${atto.da}`}>
              {atto.nome}
              <span className="revisione-intervallo">
                {atto.da}-{atto.a}
              </span>
            </h2>
            <ol className="revisione-lista">
              {CAPITOLI.filter((x) => x.fiore >= atto.da && x.fiore <= atto.a).map((x) => (
                <li key={x.fiore}>
                  <button type="button" className="revisione-riga" data-testid={`revisione-${x.fiore}`} onClick={() => setAperto(x.fiore)}>
                    <span className="revisione-numero">{x.fiore}</span>
                    <span className="revisione-riga-testo">
                      <span className="revisione-riga-titolo">{x.titolo}</span>
                      <span className="revisione-luogo">{LUOGHI[x.luogo]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>

      {c && (
        <div className="revisione-lettore" inert={dopo !== null}>
          <CapitoloScena
            capitolo={c}
            stadio={Math.min(4, c.fiore)}
            onContinua={() => setAperto(c.fiore < ULTIMO_CAPITOLO ? c.fiore + 1 : null)}
            accessoriDisegnati={vestitoDisegnato}
            sfondo={sfondoDi(c)}
          />
          <nav className="revisione-barra" aria-label="Capitoli">
            <button type="button" data-testid="revisione-prec" disabled={c.fiore === 0} onClick={() => setAperto(c.fiore - 1)}>
              ‹ {c.fiore > 0 ? c.fiore - 1 : ''}
            </button>
            <button type="button" data-testid="revisione-elenco" onClick={() => setAperto(null)}>
              Elenco
            </button>
            <button type="button" data-testid="revisione-anteprima" onClick={() => setDopo(c.fiore)}>
              Dopo il {c.fiore}
            </button>
            <button type="button" data-testid="revisione-succ" disabled={c.fiore === ULTIMO_CAPITOLO} onClick={() => setAperto(c.fiore + 1)}>
              {c.fiore < ULTIMO_CAPITOLO ? c.fiore + 1 : ''} ›
            </button>
          </nav>
        </div>
      )}

      {dati && (
        <AnteprimaDopo
          dati={dati}
          onChiudi={() => setDopo(null)}
          onApri={(n) => {
            setDopo(null);
            setAperto(n);
          }}
        />
      )}
    </div>
  );
}

/** Home e diario dopo il capitolo N: scena del giardino, i due coi vestiti d'entrata, l'eco, il diario. */
function AnteprimaDopo({ dati, onChiudi, onApri }: { dati: NonNullable<ReturnType<typeof dopoCapitolo>>; onChiudi: () => void; onApri: (n: number) => void }) {
  const chiudi = useRef<HTMLButtonElement>(null);
  useEffect(() => chiudi.current?.focus({ preventScroll: true }), [dati.fiori]);
  const lui = accessorioValido(dati.vestiti.semino);
  const lei = accessorioValido(dati.vestiti.semina);
  const nome = (chi: 'semino' | 'semina') => (chi === 'semina' ? 'Semina' : 'Semino');
  const frase = dati.eco?.testo ?? '';
  return (
    <div className="revisione-anteprima" role="dialog" aria-modal="true" aria-labelledby="revisione-anteprima-titolo" data-testid="revisione-dopo">
      <div className="revisione-anteprima-dentro">
        <header className="revisione-testa">
          <div className="revisione-titoli">
            <p className="revisione-etichetta">Anteprima</p>
            <h2 className="revisione-titolo" id="revisione-anteprima-titolo">
              Dopo il capitolo {dati.fiori}
            </h2>
            <p className="revisione-nota">
              {dati.fiori === 1 ? '1 fiore' : `${dati.fiori} fiori`}, capitoli 0-{dati.fiori} letti. Entrando in Home.
            </p>
          </div>
          <button ref={chiudi} type="button" className="bottone revisione-esci" data-testid="revisione-dopo-chiudi" onClick={onChiudi}>
            Chiudi
          </button>
        </header>
        <Scena
          className="revisione-scena"
          elementi={dati.giardino.elementi}
          fiori={dati.fiori}
          bluPresenza={dati.giardino.bluPresenza}
          altezza={220}
          sfuma
          senzaEntrate
          senzaMemoria
        />
        <section className={`home-eroe parla-${dati.eco?.chi ?? 'semino'}${dati.sbloccata ? ' home-eroe--coppia' : ''}`}>
          <span className="home-mascotte">
            {dati.sbloccata ? (
              <SeminoCoppia
                stadio={dati.stadio}
                umore="felice"
                umoreSemina="felice"
                accessorioSemino={lui}
                accessorioSemina={lei}
                taglia={72}
                parla={dati.eco?.chi ?? null}
                frase={frase}
              />
            ) : (
              <Semino stadio={dati.stadio} umore="neutro" accessorio={lui} taglia={92} parla={!!dati.eco} frase={frase} />
            )}
          </span>
          {dati.eco ? (
            <p className={`fumetto${dati.eco.chi === 'semina' ? ' fumetto--semina' : ''}`} data-testid="revisione-eco">
              {dati.eco.testo}
              <span className="fumetto-firma">
                {nome(dati.eco.chi)} · dal capitolo {dati.fiori}
              </span>
            </p>
          ) : (
            <p className="fumetto fumetto-quieto">Nessuna eco qui: è di Semina, che su questo telefono non c’è ancora.</p>
          )}
        </section>
        <p className="revisione-vestiti" data-testid="revisione-vestiti">
          Vestiti d’entrata: Semino {lui ?? 'niente'}
          {dati.sbloccata ? ` · Semina ${lei ?? 'niente'}` : ''}. Poi in Home cambiano ogni tanto fra quelli dei luoghi visitati.
        </p>
        <Diario atti={dati.diario} onRileggi={onApri} />
      </div>
    </div>
  );
}
