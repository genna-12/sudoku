// La schermata di un capitolo della storia (spec T5 "Schermata del capitolo", studio-ux §1).
// <CapitoloScena capitolo={c} indice={2} totale={3} stadio={3} onContinua={…} />
//   - una battuta per tocco (bottone trasparente a tutto schermo); 300 ms di guardia dopo ogni cambio
//   - all'ultima battuta il tocco non fa niente: dopo 400 ms compare il bottone vero "Continua"
//   - "‹" in alto a sinistra = indietro; tastiera: Invio/Spazio/→ avanti, Backspace/← indietro, Esc chiude (solo in rilettura)
//   - narra = didascalia nel cielo; mulo = una lettera che si riempie una riga per tocco
//   - Semina solo dal capitolo 5 (nel 5 sbuca alla sua prima battuta); un secondario alla volta (nel 99 tutti)
//   - rilettura: "Dal diario" e "Chiudi"; esce: la classe dell'uscita (150 ms), la gestisce il genitore
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BattutaCapitolo, Capitolo, Luogo, Voce } from '../config/capitoli';
import { Fondale } from './Fondale';
import { NOMI_SECONDARI, PersonaggioSecondario, type Secondario } from './Secondari';
import { Semino, type SeminoChi, type SeminoUmore } from './Semino';
import { accessorioValido, umoreValido } from './useMascotte';
import './capitolo.css';

export const GUARDIA_MS = 300;
export const ATTESA_CONTINUA_MS = 400;
/** il capitolo in cui tutti i secondari restano in scena, in fila */
const CAPITOLO_DI_TUTTI = 99;
/** la nota del capitolo 5 su cui si accendono i colori */
const NOTA_COLORI = 'Il verde è Semino';

const LUOGHI: Record<Luogo, string> = {
  aiuola: "nell'aiuola",
  giardino: 'in giardino',
  mare: 'al mare',
  montagna: 'in montagna',
  bosco: 'nel bosco',
  citta: 'in città',
  cucina: 'in cucina',
  lontano: 'lontano',
};

/** i secondari che hanno un disegno (il Mulo è una lettera) */
function disegnato(v: Voce): v is Secondario {
  return v in NOMI_SECONDARI;
}
/** dove sta un secondario: Fischio e il Gufo in alto (ramo, filo), gli altri a terra */
const IN_ALTO: readonly Secondario[] = ['fischio', 'gufo'];

export interface CapitoloScenaProps {
  capitolo: Capitolo;
  /** posizione nella coda degli arretrati (1 = il primo) */
  indice?: number;
  totale?: number;
  /** stadio di crescita dei due (0..4) */
  stadio: number;
  onContinua: () => void;
  /** dal diario: "Dal diario" e "Chiudi" */
  rilettura?: boolean;
  /** quali vestiti del capitolo hanno un disegno; senza, nessun vestito */
  accessoriDisegnati?: (id: string) => boolean;
  /** al posto del fondale neutro di aiuola/giardino (la Scena della Home), montato sopra il Fondale */
  sfondo?: ReactNode;
  /** uscita in corso (150 ms, gestita dal genitore) */
  esce?: boolean;
}

/** umore dell'ultima battuta di `chi` fino a `passo` compreso */
function umoreFino(battute: readonly BattutaCapitolo[], chi: SeminoChi, passo: number): SeminoUmore {
  let u = 'neutro';
  for (let i = 0; i <= passo && i < battute.length; i++) if (battute[i].chi === chi && battute[i].umore) u = battute[i].umore!;
  return umoreValido(u);
}

/** chi c'è in scena: almeno una battuta o un vestito nel capitolo; Semina mai prima del 5 */
function presente(c: Capitolo, chi: SeminoChi): boolean {
  if (chi === 'semina' && c.fiore < 5) return false;
  return Boolean(c.vestiti[chi]) || c.battute.some((b) => b.chi === chi);
}

export function CapitoloScena({
  capitolo: c,
  indice,
  totale,
  stadio,
  onContinua,
  rilettura = false,
  accessoriDisegnati,
  sfondo,
  esce = false,
}: CapitoloScenaProps) {
  const battute = c.battute;
  const ultimo = Math.max(0, battute.length - 1);
  const [passo, setPasso] = useState(0);
  // "Continua" compare per questa battuta (chiave capitolo:battuta) 400 ms dopo l'arrivo all'ultima
  const [prontoPer, setProntoPer] = useState<string | null>(null);
  const bloccato = useRef(true);
  const avantiRef = useRef<HTMLButtonElement>(null);
  const fine = passo >= ultimo;

  // si riparte dalla prima battuta se cambia capitolo (coda di arretrati)
  const [fioreVisto, setFioreVisto] = useState(c.fiore);
  if (fioreVisto !== c.fiore) {
    setFioreVisto(c.fiore);
    setPasso(0);
  }

  // guardia: per 300 ms dopo ogni cambio (e all'apertura) i tocchi sono ignorati
  useEffect(() => {
    bloccato.current = true;
    const t = setTimeout(() => {
      bloccato.current = false;
    }, GUARDIA_MS);
    return () => clearTimeout(t);
  }, [passo, c.fiore]);

  // all'ultima battuta: "Continua" dopo 400 ms
  const chiave = `${c.fiore}:${passo}`;
  useEffect(() => {
    if (!fine) return;
    const t = setTimeout(() => setProntoPer(chiave), ATTESA_CONTINUA_MS);
    return () => clearTimeout(t);
  }, [fine, chiave]);
  const continua = fine && prontoPer === chiave;

  useEffect(() => {
    avantiRef.current?.focus({ preventScroll: true });
  }, [c.fiore]);

  const avanti = useCallback(() => {
    if (bloccato.current || passo >= ultimo) return;
    setPasso(passo + 1);
  }, [passo, ultimo]);
  const indietro = useCallback(() => {
    if (passo > 0) setPasso(passo - 1);
  }, [passo]);

  // tastiera: → avanti, ← e Backspace indietro; Invio/Spazio li fa già il bottone che ha il focus
  useEffect(() => {
    function tasto(e: KeyboardEvent) {
      const suBottone = e.target instanceof HTMLElement && e.target.closest('button');
      if (e.key === 'Escape' && rilettura) onContinua();
      else if (e.key === 'ArrowRight') avanti();
      else if (e.key === 'ArrowLeft' || e.key === 'Backspace') indietro();
      else if ((e.key === 'Enter' || e.key === ' ') && !suBottone) avanti();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [avanti, indietro, rilettura, onContinua]);

  const b = battute[Math.min(passo, ultimo)] as BattutaCapitolo | undefined;
  const chi = b?.chi;

  // capitolo 5: Semina sbuca alla sua prima battuta, i colori si accendono alla nota
  const rivelazione = c.fiore === 5;
  const primaDiLei = battute.findIndex((x) => x.chi === 'semina');
  const notaColori = battute.findIndex((x) => x.chi === 'narra' && x.testo.startsWith(NOTA_COLORI));
  const colori = rivelazione && notaColori >= 0 && passo >= notaColori;

  const conLui = presente(c, 'semino');
  const conLei = presente(c, 'semina') && (!rivelazione || (primaDiLei >= 0 && passo >= primaDiLei));

  // secondari: l'ultimo che ha parlato (nel 99 tutti quelli che hanno parlato, in fila)
  const primaBattuta = new Map<Secondario, number>();
  battute.forEach((x, i) => {
    if (disegnato(x.chi) && !primaBattuta.has(x.chi)) primaBattuta.set(x.chi, i);
  });
  const parlati: Secondario[] = [];
  for (let i = 0; i <= passo && i < battute.length; i++) {
    const v = battute[i].chi;
    if (disegnato(v)) {
      const k = parlati.indexOf(v);
      if (k >= 0) parlati.splice(k, 1);
      parlati.push(v);
    }
  }
  const tutti = c.fiore === CAPITOLO_DI_TUTTI;
  const secondari = tutti ? [...primaBattuta.keys()].filter((s) => parlati.includes(s)) : parlati.slice(-1);

  // la lettera del Mulo: le righe mulo consecutive fino a qui
  let lettera: string[] = [];
  if (chi === 'mulo') {
    let i = passo;
    while (i > 0 && battute[i - 1].chi === 'mulo') i--;
    lettera = battute.slice(i, passo + 1).map((x) => x.testo);
  }

  const vestito = (p: SeminoChi) => {
    const id = c.vestiti[p];
    return id && accessoriDisegnati?.(id) ? accessorioValido(id) : undefined;
  };

  const nome = (v: Voce) => (v === 'semino' ? 'Semino' : v === 'semina' ? 'Semina' : disegnato(v) ? NOMI_SECONDARI[v] : 'Il Mulo');
  const etichettaFinale = rilettura ? 'Chiudi' : c.fiore === 0 || rivelazione ? 'Andiamo' : 'Continua';
  const aiuto = !rilettura && c.fiore <= 2 && passo < 2;

  const classi = [
    'capitolo',
    `capitolo--${c.luogo}`,
    rivelazione && 'capitolo--rivelazione',
    c.fiore < 5 && 'capitolo--prima-di-lei',
    colori && 'capitolo--colori',
    chi === 'mulo' && 'capitolo--lettera',
    tutti && 'capitolo--tutti',
    fine && 'capitolo--fine',
    esce && 'capitolo--esce',
  ]
    .filter(Boolean)
    .join(' ');

  // fumetto: sopra chi parla (Semino a sinistra, Semina a destra, il secondario al centro)
  const parlaSecondario = chi && disegnato(chi) && secondari.includes(chi) ? chi : null;
  const lato = chi === 'semino' ? 'sinistra' : chi === 'semina' ? 'destra' : 'centro';
  const alto = parlaSecondario && !tutti && IN_ALTO.includes(parlaSecondario);

  const bottoneContinua = (
    <button
      type="button"
      className="bottone primario capitolo-continua"
      data-testid="capitolo-continua"
      autoFocus
      onClick={(e) => {
        e.stopPropagation();
        onContinua();
      }}
    >
      {etichettaFinale}
    </button>
  );

  return (
    <div
      className={classi}
      data-testid="capitolo-scena"
      data-fiore={c.fiore}
      data-battuta={passo}
      role="dialog"
      aria-modal="true"
      aria-label={`Capitolo ${c.fiore}: ${c.titolo}`}
    >
      <div className="capitolo-fondale">
        <Fondale luogo={c.luogo} fondale={c.fondale} />
        {sfondo}
        <div className="capitolo-velo" aria-hidden="true" />
      </div>

      <div className="capitolo-palco" data-testid={rivelazione ? 'scena-sblocco' : undefined}>
        {rivelazione && (
          <div className={`scena-foglie capitolo-foglie${conLei ? ' capitolo-foglie--quiete' : ''}`} aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} style={{ '--k': i } as CSSProperties} />
            ))}
          </div>
        )}
        <div className="capitolo-suolo">
          {conLui && (
            <span className={`capitolo-attore capitolo-lui${chi === 'semino' ? ' parla' : ''}`} data-chi="semino">
              <Semino
                chi="semino"
                stadio={stadio}
                umore={umoreFino(battute, 'semino', passo)}
                accessorio={vestito('semino')}
                taglia={120}
                parla={chi === 'semino'}
                frase={chi === 'semino' ? b?.testo : undefined}
                attenuato={chi !== 'semino'}
                sguardo={{ x: 0.6, y: 0 }}
                className="capitolo-mascotte"
              />
            </span>
          )}
          {secondari.length > 0 && (
            <span className={`capitolo-secondari${tutti ? ' capitolo-secondari--fila' : ''}`}>
              {secondari.map((s) => (
                <span
                  key={s}
                  className={`capitolo-secondario${s === parlaSecondario ? ' parla' : ''}`}
                  data-chi={s}
                  data-posto={!tutti && IN_ALTO.includes(s) ? 'alto' : 'terra'}
                >
                  <PersonaggioSecondario id={s} taglia={tutti ? 48 : 72} parla={s === chi} entrata={primaBattuta.get(s) === passo} />
                </span>
              ))}
            </span>
          )}
          {conLei && (
            <span className={`capitolo-attore capitolo-lei${chi === 'semina' ? ' parla' : ''}`} data-chi="semina">
              <Semino
                chi="semina"
                stadio={stadio}
                umore={umoreFino(battute, 'semina', passo)}
                accessorio={vestito('semina')}
                taglia={120}
                parla={chi === 'semina'}
                frase={chi === 'semina' ? b?.testo : undefined}
                attenuato={chi !== 'semina'}
                sguardo={{ x: -0.6, y: 0 }}
                entrata={rivelazione ? 'sbuca' : 'nessuna'}
                className="capitolo-mascotte"
              />
            </span>
          )}
        </div>
      </div>

      {/* il bottone di avanzamento copre tutto: un tocco ovunque = battuta successiva */}
      <button
        ref={avantiRef}
        type="button"
        className="capitolo-avanti"
        aria-label={fine ? `Fine del capitolo, battuta ${passo + 1} di ${battute.length}` : `Avanti, battuta ${passo + 1} di ${battute.length}`}
        onClick={avanti}
      />

      <header className="capitolo-testa">
        <button type="button" className="capitolo-indietro" aria-label="Battuta precedente" disabled={passo === 0} onClick={indietro}>
          ‹
        </button>
        <div className="capitolo-titoli">
          <p className="capitolo-etichetta">
            {rilettura && <span className="capitolo-diario">Dal diario · </span>}
            Capitolo {c.fiore} · {LUOGHI[c.luogo]}
          </p>
          <h2 className="capitolo-titolo">{c.titolo}</h2>
        </div>
        {!rilettura && totale !== undefined && totale > 1 && indice !== undefined && (
          <p className="capitolo-conta">
            {indice} di {totale}
          </p>
        )}
      </header>

      <div className="capitolo-battuta" aria-live="polite">
        {chi === 'narra' && b && (
          <p key={passo} className="capitolo-nota">
            <span className="nascosto-visivo">Nota: </span>
            {b.testo}
          </p>
        )}
        {chi === 'mulo' && (
          <div className="capitolo-lettera" key={`lettera-${passo - lettera.length + 1}`}>
            <span className="nascosto-visivo">Lettera del Mulo: </span>
            {lettera.map((riga, i) => (
              <p key={i} className="capitolo-lettera-riga">
                {riga}
              </p>
            ))}
            <p className="capitolo-firma">— il Mulo</p>
          </div>
        )}
        {b && chi !== 'narra' && chi !== 'mulo' && (
          <div
            key={passo}
            className={`capitolo-fumetto-posto capitolo-fumetto-posto--${lato}${alto ? ' capitolo-fumetto-posto--alto' : ''}${tutti ? ' capitolo-fumetto-posto--fila' : ''}`}
          >
            {chi !== 'semino' && chi !== 'semina' && <span className="capitolo-nome">{nome(chi!)}</span>}
            <p className={`capitolo-fumetto capitolo-fumetto--${chi === 'semino' || chi === 'semina' ? chi : 'secondario'}`}>
              <span className="nascosto-visivo">{nome(chi!)}: </span>
              {b.testo}
            </p>
          </div>
        )}
      </div>

      <footer className="capitolo-piede">
        <ol className="capitolo-punti" aria-hidden="true">
          {battute.map((_, i) => (
            <li key={i} className={i <= passo ? 'pieno' : undefined} />
          ))}
        </ol>
        {aiuto && <p className="capitolo-aiuto">tocca per continuare</p>}
        {continua &&
          (rivelazione ? (
            <div className="capitolo-continua-guscio" data-testid="scena-andiamo">
              {bottoneContinua}
            </div>
          ) : (
            bottoneContinua
          ))}
      </footer>
    </div>
  );
}
