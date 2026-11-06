// La schermata di un capitolo della storia (spec T5 "Schermata del capitolo", studio-ux §1).
// <CapitoloScena capitolo={c} indice={2} totale={3} stadio={3} onContinua={…} />
//   - una battuta per tocco (bottone trasparente a tutto schermo); 300 ms di guardia dopo ogni cambio
//   - all'ultima battuta il tocco non fa niente: dopo 400 ms compare il bottone vero "Continua"
//   - "‹" in alto a sinistra = indietro; tastiera: Invio/Spazio/→ avanti, Backspace/← indietro, Esc chiude (solo in rilettura)
//   - narra = didascalia nel cielo; mulo = una lettera che si riempie una riga per tocco
//   - Semina solo dal capitolo 5 (nel 5 sbuca alla sua prima battuta); un secondario alla volta: l'ultimo che ha
//     parlato o, finché non parla nessuno, quello che il capitolo fa entrare (`entra`, es. Briciola nel 68);
//     nel 99 ci sono tutti dalla prima battuta (in fila a terra, Fischio e il Gufo sullo stesso ramo)
//   - Fischio e il Gufo stanno "in alto": su un ramo (fuori), su una mensola (cucina), su un filo (città)
//   - fra due capitoli della coda il fondale e il palco ripartono con una dissolvenza (360 ms)
//   - rilettura: "Dal diario" e "Chiudi"; esce: la classe dell'uscita (150 ms), la gestisce il genitore
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BattutaCapitolo, Capitolo, Luogo, Voce } from '../config/capitoli';
import { Fondale, scegliFondale } from './Fondale';
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
/** nel 99, in ordine da sinistra: a terra (Briciola dorme in groppa a Nuvola) e sul ramo */
const FILA_TERRA: readonly Secondario[] = ['nonnacapra', 'nuvola', 'grillo', 'pinza'];
const FILA_RAMO: readonly Secondario[] = ['fischio', 'gufo'];
/** lato dei secondari in px: uno solo, nella fila a terra del 99, sul ramo del 99; spazio fra due vicini */
const TAGLIA_SECONDARIO = 72;
const TAGLIA_FILA = 48;
const TAGLIA_RAMO = 44;
const SPAZIO_FILA = 2;

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

  // si riparte dalla prima battuta se cambia capitolo (coda di arretrati); da lì in poi fondale e palco
  // entrano con una dissolvenza (al primo capitolo la fa già tutta la schermata)
  const [fioreVisto, setFioreVisto] = useState(c.fiore);
  const [cambiato, setCambiato] = useState(false);
  if (fioreVisto !== c.fiore) {
    setFioreVisto(c.fiore);
    setPasso(0);
    setCambiato(true);
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

  // secondari: l'ultimo che ha parlato; finché non parla nessuno, quello che il capitolo fa entrare
  // (fermo, senza fumetto: Briciola nel 68, Nuvola nel 30); nel 99 tutti dalla prima battuta
  const tutti = c.fiore === CAPITOLO_DI_TUTTI;
  const entra = c.entra && disegnato(c.entra) ? c.entra : null;
  const primaVolta = new Map<Secondario, number>();
  if (entra) primaVolta.set(entra, 0);
  battute.forEach((x, i) => {
    if (disegnato(x.chi) && !primaVolta.has(x.chi)) primaVolta.set(x.chi, i);
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
  const secondari: Secondario[] = tutti ? [...FILA_TERRA, 'briciola', ...FILA_RAMO] : parlati.length ? parlati.slice(-1) : entra ? [entra] : [];
  const inAlto = (s: Secondario) => IN_ALTO.includes(s);
  const aTerra = tutti ? FILA_TERRA : secondari.filter((s) => !inAlto(s));
  const sulRamo = tutti ? FILA_RAMO : secondari.filter(inAlto);
  // uno solo dei due e nessun secondario (capitoli 0-4, 85, 91): va verso il centro, vicino all'aiuola
  const solo = !rivelazione && conLui !== presente(c, 'semina') && secondari.length === 0;

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
    sulRamo.length > 0 && 'capitolo--ramo',
    solo && 'capitolo--solo',
    cambiato && 'capitolo--cambio',
    fine && 'capitolo--fine',
    esce && 'capitolo--esce',
  ]
    .filter(Boolean)
    .join(' ');

  // fumetto: sopra chi parla (Semino a sinistra, Semina a destra, il secondario al centro)
  const parlaSecondario = chi && disegnato(chi) && secondari.includes(chi) ? chi : null;
  const lato = chi === 'semino' ? 'sinistra' : chi === 'semina' ? 'destra' : 'centro';
  const alto = parlaSecondario !== null && inAlto(parlaSecondario);
  // nel 99 la coda del fumetto punta a chi parla, nella sua fila (x dal centro, prima della scala)
  let codaDx = 0;
  if (tutti && parlaSecondario) {
    const fila = alto ? FILA_RAMO : FILA_TERRA;
    const t = alto ? TAGLIA_RAMO : TAGLIA_FILA;
    codaDx = (fila.indexOf(parlaSecondario) - (fila.length - 1) / 2) * (t + SPAZIO_FILA);
  }
  const tagliaSec = (posto: 'terra' | 'ramo') => (tutti ? (posto === 'ramo' ? TAGLIA_RAMO : TAGLIA_FILA) : TAGLIA_SECONDARIO);
  const gruppo = (lista: readonly Secondario[], posto: 'terra' | 'ramo') =>
    lista.length > 0 && (
      <span className={`capitolo-secondari capitolo-secondari--${posto}${tutti ? ' capitolo-secondari--fila' : ''}`}>
        {lista.map((s) => (
          <span key={s} className={`capitolo-secondario${s === parlaSecondario ? ' parla' : ''}`} data-chi={s} data-posto={posto === 'ramo' ? 'alto' : 'terra'}>
            <PersonaggioSecondario id={s} taglia={tagliaSec(posto)} parla={s === chi} entrata={primaVolta.get(s) === passo} />
            {tutti && s === 'nuvola' && (
              <span className="capitolo-secondario capitolo-groppa" data-chi="briciola" data-posto="terra">
                <PersonaggioSecondario id="briciola" taglia={Math.round(TAGLIA_FILA * 0.55)} />
              </span>
            )}
          </span>
        ))}
      </span>
    );

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
      data-fondale={scegliFondale(c.luogo, c.fondale)}
      data-battuta={passo}
      role="dialog"
      aria-modal="true"
      aria-label={`Capitolo ${c.fiore}: ${c.titolo}`}
    >
      <div className="capitolo-fondale" key={`fondale-${c.fiore}`}>
        <Fondale luogo={c.luogo} fondale={c.fondale} />
        {sfondo}
        <div className="capitolo-velo" aria-hidden="true" />
      </div>

      <div className="capitolo-palco" key={`palco-${c.fiore}`} data-testid={rivelazione ? 'scena-sblocco' : undefined}>
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
          {gruppo(aTerra, 'terra')}
          {gruppo(sulRamo, 'ramo')}
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
            style={codaDx ? ({ '--cap-coda-dx': `${codaDx}px` } as CSSProperties) : undefined}
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
        <ol className="capitolo-punti" key={c.fiore} aria-hidden="true">
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
