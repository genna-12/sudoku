import { useEffect, useRef, useState } from 'react';
import type { ChiParla } from '../config/frasi';
import { LIVELLI_PARAMETRI } from '../config/livelli';
import type { Giocatore, VoceStorico } from '../stato';
import type { DettaglioFiore } from '../stato/archivio';
import { useChiudiConIndietro } from './indietro';
import type { AttoDiario } from './capitoli';
import type { Chiacchiera } from './Home';
import { aCasoDiverso, accessoriSbloccati, numeriFiori, quotaBluFiore, statistiche } from './regole';
import { Scena } from './Scena';
import { ACCESSORI_DI, Semino, SeminoPianta, stadioDaCrescita } from './Semino';
import type { SeminoAzione } from './Semino';
import type { Mascotte } from './useMascotte';
import { IconaIndietro } from './Icone';
import { tempo } from './util';

const NOMI_MODALITA = { sudoku: 'Sudoku', killer: 'Killer' } as const;
const DATA = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const ORA = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

interface Props {
  storico: VoceStorico[];
  /** id della partita aperta adesso (non si "riprende" quella in corso) */
  inCorso: string | null;
  sbloccata: boolean;
  /** capitoli letti da chi tiene il telefono (i vestiti vengono dai luoghi visitati) */
  visti: readonly string[];
  /** elementi visibili della scena (senza il tulipano di Semina prima del capitolo 5) */
  elementi: readonly string[];
  /** presenza del blu (0..1) per il chiarore della scena */
  bluPresenza: number;
  mascotte: Mascotte;
  solletico: Chiacchiera | null;
  onSolletico: (chi: ChiParla) => void;
  onRiprendi: (v: VoceStorico) => void;
  onEsci: () => void;
  /** capitoli letti da chi tiene il telefono, per atto */
  diario: AttoDiario[];
  /** rilettura di un capitolo (non segna niente) */
  onRileggi: (fiore: number) => void;
  /** tocco sulla cassetta della posta della scena */
  onPosta?: () => void;
  /** punti di ciascuno e ultima cella delle partite finite viste qui */
  dettagli?: Record<string, DettaglioFiore>;
  /** nomi visibili per ruolo (prima dell'arrivo di Semina: Verde/Blu) */
  nomi?: Record<Giocatore, string>;
}

/** Il giardino: una pianta per partita, dalla più recente; fiori = finite, germogli = da riprendere. */
export function Giardino(p: Props) {
  const st = statistiche(p.storico);
  const numeri = numeriFiori(p.storico);
  // le mascotte in testa al giardino, ciascuna con un vestito a caso dei luoghi visitati (fisso per questa visita)
  const [accessori] = useState(() => ({
    semino: aCasoDiverso(accessoriSbloccati(ACCESSORI_DI.semino, p.visti), undefined),
    semina: aCasoDiverso(accessoriSbloccati(ACCESSORI_DI.semina, p.visti), undefined),
  }));
  const vuoto = p.storico.length === 0;
  const chi: ChiParla[] = p.sbloccata ? ['semino', 'semina'] : ['semino'];
  const stadio = Math.min(4, st.fiori);
  const gesto = useGestiGiardino(!vuoto, chi);
  const [aperto, setAperto] = useState<VoceStorico | null>(null);
  return (
    <main className="schermata giardino-schermata">
      <header className="barra">
        <button className="icona-bottone" data-testid="indietro" onClick={p.onEsci} aria-label="Torna alla home">
          <IconaIndietro />
        </button>
        <div className="barra-titolo">
          <span className="barra-livello">Giardino</span>
          <span className="barra-modalita">
            {st.fiori === 1 ? '1 fiore' : `${st.fiori} fiori`}, {st.germogli === 1 ? '1 germoglio' : `${st.germogli} germogli`}
          </span>
        </div>
      </header>

      {/* le mascotte stanno in piedi sul prato della scena; il fumetto del solletico nel cielo */}
      <div className={`giardino-scena${vuoto ? ' giardino-scena-vuota' : ''}`} style={{ position: 'relative' }}>
        <Scena
          elementi={p.elementi}
          fiori={st.fiori}
          bluPresenza={p.bluPresenza}
          altezza={180}
          sfuma={vuoto}
          onCassetta={p.onPosta}
          figli={
            vuoto ? null : (
              <g data-testid="giardino-mascotte">
                {chi.map((c) => {
                  const x = chi.length > 1 ? (c === 'semino' ? -40 : 14) : -6;
                  return (
                    <g key={c} transform={`translate(${x - TAGLIA_PRATO / 2} ${-TAGLIA_PRATO})`}>
                      <Semino
                        chi={c}
                        stadio={stadio}
                        umore={p.mascotte[c].umore}
                        impulso={p.mascotte[c].impulso}
                        accessorio={accessori[c]}
                        onSolletico={() => p.onSolletico(c)}
                        taglia={TAGLIA_PRATO}
                        entrata="salto"
                        seguiPuntatore
                        parla={p.solletico?.chi === c}
                        frase={p.solletico?.chi === c ? p.solletico.testo : undefined}
                        azione={gesto?.chi === c ? gesto : undefined}
                      />
                    </g>
                  );
                })}
              </g>
            )
          }
        />
        {p.solletico && !vuoto && (
          <span
            key={p.solletico.id}
            className={`fumetto fumetto-giu fumetto-solletico${p.solletico.chi === 'semina' ? ' fumetto--semina' : ''}`}
            role="status"
            data-testid="fumetto-solletico"
            style={{
              position: 'absolute',
              zIndex: 20,
              top: 10,
              left: 16,
              right: 16,
              marginInline: 'auto',
              width: 'max-content',
              maxWidth: 'min(80%, 300px)',
              fontSize: 14,
            }}
          >
            {p.solletico.testo}
          </span>
        )}
      </div>

      {p.storico.length > 0 && (
        <section className="giardino-totali" aria-label="Il vostro giardino in numeri">
          <div className="giardino-totale">
            <b>{st.fiori}</b>
            <span>fiori</span>
          </div>
          <div className="giardino-totale">
            <b>{st.punti}</b>
            <span>punti di coppia</span>
          </div>
          <div className="giardino-totale">
            <b>{st.errori}</b>
            <span>errori in tutto</span>
          </div>
          {st.migliori.length > 0 && (
            <div className="giardino-totale giardino-record">
              <span>miglior tempo</span>
              <ul>
                {st.migliori.map((m) => (
                  <li key={`${m.modalita}-${m.livello}`}>
                    <span>
                      {m.modalita === 'killer' ? 'Killer ' : ''}
                      {LIVELLI_PARAMETRI[m.livello].etichetta}
                    </span>
                    <b className="tabellare">{tempo(m.secondi)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <Diario atti={p.diario} onRileggi={p.onRileggi} />

      <div className="giardino" data-testid="giardino-lista" data-voci={p.storico.length}>
        {p.storico.length === 0 && (
          <div className="giardino-vuoto">
            <Semino
              stadio={0}
              umore={p.mascotte.semino.umore === 'dorme' ? 'dorme' : 'saluta'}
              impulso={p.mascotte.semino.impulso}
              onSolletico={() => p.onSolletico('semino')}
              taglia={112}
              parla
              frase={p.solletico?.testo ?? INVITO}
              seguiPuntatore
            />
            <p className="fumetto fumetto-giu giardino-invito">
              {p.solletico?.testo ?? INVITO}
            </p>
            <button className="bottone primario" onClick={p.onEsci}>
              Scegli la prima partita
            </button>
          </div>
        )}
        {p.storico.map((v) => (
          <Pianta
            key={v.id}
            voce={v}
            inCorso={p.inCorso === v.id}
            sbloccata={p.sbloccata}
            quotaBlu={quotaBluFiore(v, numeri.get(v.id) ?? 0, p.sbloccata)}
            onRiprendi={p.onRiprendi}
            onApri={setAperto}
          />
        ))}
      </div>
      {aperto && (
        <FoglioFiore
          voce={aperto}
          numero={numeri.get(aperto.id) ?? 0}
          dettaglio={p.dettagli?.[aperto.id]}
          nomi={p.nomi}
          sbloccata={p.sbloccata}
          onChiudi={() => setAperto(null)}
        />
      )}
    </main>
  );
}

/** Il diario: i capitoli già letti, per atto; un tocco li rilegge. */
function Diario({ atti, onRileggi }: { atti: AttoDiario[]; onRileggi: (fiore: number) => void }) {
  return (
    <section className="diario" data-testid="diario" aria-labelledby="diario-titolo">
      <h2 className="diario-titolo" id="diario-titolo">
        Diario
      </h2>
      {atti.length === 0 && <p className="diario-vuoto">Ancora nessun capitolo letto.</p>}
      {atti.map((atto) => (
        <div className="diario-atto" key={atto.nome}>
          <h3>{atto.nome}</h3>
          <ol>
            {atto.capitoli.map((c) => (
              <li key={c.fiore}>
                <button className="diario-riga" data-testid={`diario-${c.fiore}`} onClick={() => onRileggi(c.fiore)}>
                  <span className="diario-numero">{c.fiore}</span>
                  <span>{c.titolo}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

const INVITO = 'Qui non c’è ancora niente. Ogni partita pianta un seme: finitela insieme e fiorisce.';

/** lato delle mascotte sul prato, in unità della scena (220 = altezza) */
const TAGLIA_PRATO = 64;

/**
 * Ogni 20–40 s una delle due mascotte sul prato fa un saltello verso l'altra o saluta (da sola:
 * saltello o saluto). Fermo a pagina nascosta.
 */
function useGestiGiardino(attivo: boolean, chi: ChiParla[]) {
  const [gesto, setGesto] = useState<{ chi: ChiParla; tipo: SeminoAzione; id: number; verso: 1 | -1 } | null>(null);
  const due = chi.length > 1;
  useEffect(() => {
    if (!attivo) return;
    let t = 0;
    const prossimo = () => {
      window.clearTimeout(t);
      if (document.hidden) return;
      t = window.setTimeout(
        () => {
          const c = chi[Math.floor(Math.random() * chi.length)];
          const r = Math.random();
          const tipo: SeminoAzione = due ? (r < 0.55 ? 'salta-verso' : 'saluta') : r < 0.5 ? 'saltello' : 'saluta';
          setGesto((g) => ({ chi: c, tipo, id: (g?.id ?? 0) + 1, verso: c === 'semino' ? 1 : -1 }));
          prossimo();
        },
        20000 + Math.random() * 20000,
      );
    };
    const vista = () => (document.hidden ? window.clearTimeout(t) : prossimo());
    document.addEventListener('visibilitychange', vista);
    prossimo();
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', vista);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attivo, due]);
  return gesto;
}

function Pianta({
  voce,
  inCorso,
  sbloccata,
  quotaBlu,
  onRiprendi,
  onApri,
}: {
  voce: VoceStorico;
  inCorso: boolean;
  sbloccata: boolean;
  /** frazione di petali blu (null per i germogli, che restano neutri) */
  quotaBlu: number | null;
  onRiprendi: (v: VoceStorico) => void;
  onApri?: (v: VoceStorico) => void;
}) {
  const finita = !!voce.finita;
  const quando = new Date(voce.iniziata);
  // killer = tulipano di Semina (dopo che è arrivata), sudoku = margherita di Semino
  const chi = sbloccata && voce.modalita === 'killer' ? 'semina' : 'semino';
  const livello = LIVELLI_PARAMETRI[voce.livello]?.etichetta ?? voce.livello;
  return (
    <article
      className={`pianta ${finita ? 'pianta-fiorita' : 'pianta-germoglio'}`}
      data-testid={`pianta-${voce.id}`}
      data-finita={finita ? 'true' : 'false'}
      data-quota-blu={quotaBlu ?? undefined}
    >
      <SeminoPianta
        fiorita={finita}
        stadio={Math.max(1, stadioDaCrescita(voce.progresso))}
        chi={chi}
        quotaBlu={quotaBlu ?? undefined}
        taglia={68}
      />
      <span className="pianta-titolo">
        {NOMI_MODALITA[voce.modalita] ?? voce.modalita}, {livello}
      </span>
      <span className="pianta-info">
        {DATA.format(quando)}, {ORA.format(quando)}
      </span>
      <span className="pianta-dati">
        <span className="tabellare">{tempo(voce.secondi)}</span>
        <span>{voce.punti} punti</span>
        <span>{voce.errori === 1 ? '1 errore' : `${voce.errori} errori`}</span>
        {!finita && <span>{Math.round(voce.progresso * 100)}%</span>}
      </span>
      {!finita && voce.stato && !inCorso && (
        <button className="pianta-riprendi" data-testid={`riprendi-${voce.id}`} onClick={() => onRiprendi(voce)}>
          Riprendi
        </button>
      )}
      {!finita && inCorso && <span className="pianta-in-corso">in corso</span>}
      {finita && onApri && (
        <button
          type="button"
          className="pianta-apri"
          data-testid={`apri-${voce.id}`}
          aria-label={`${NOMI_MODALITA[voce.modalita] ?? voce.modalita}, ${livello}, ${DATA.format(quando)}: dettagli`}
          onClick={() => onApri(voce)}
        />
      )}
    </article>
  );
}

const DATA_LUNGA = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

/** Il dettaglio di un fiore: com'è andata quella partita. */
function FoglioFiore({
  voce,
  numero,
  dettaglio,
  nomi,
  sbloccata,
  onChiudi,
}: {
  voce: VoceStorico;
  numero: number;
  dettaglio?: DettaglioFiore;
  nomi?: Record<Giocatore, string>;
  sbloccata: boolean;
  onChiudi: () => void;
}) {
  useChiudiConIndietro(true, onChiudi);
  const chiudi = useRef<HTMLButtonElement>(null);
  useEffect(() => chiudi.current?.focus(), []);
  const quando = new Date(voce.finita ?? voce.iniziata);
  const livello = LIVELLI_PARAMETRI[voce.livello]?.etichetta ?? voce.livello;
  const chi = sbloccata && voce.modalita === 'killer' ? 'semina' : 'semino';
  return (
    <div className="foglio-velo foglio-velo-leggero" onPointerDown={(e) => e.target === e.currentTarget && onChiudi()}>
      <div
        className="foglio foglio-fiore"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiore-titolo"
        data-testid="foglio-fiore"
        onKeyDown={(e) => e.key === 'Escape' && onChiudi()}
      >
        <div className="fiore-testa">
          <SeminoPianta fiorita stadio={4} chi={chi} taglia={56} />
          <div>
            <h2 id="fiore-titolo">
              {NOMI_MODALITA[voce.modalita] ?? voce.modalita}, {livello}
            </h2>
            <p className="fiore-data">
              {numero > 0 ? `Fiore ${numero} · ` : ''}
              {DATA_LUNGA.format(quando)}, {ORA.format(quando)}
            </p>
          </div>
        </div>
        <dl className="fiore-dati">
          <div>
            <dt>tempo</dt>
            <dd className="tabellare">{tempo(voce.secondi)}</dd>
          </div>
          {dettaglio && nomi ? (
            <>
              <div className="fiore-punti">
                <dt>punti di {nomi.a}</dt>
                <dd className="tabellare">{dettaglio.a}</dd>
              </div>
              <div className="fiore-punti">
                <dt>punti di {nomi.b}</dt>
                <dd className="tabellare">{dettaglio.b}</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>punti di coppia</dt>
              <dd className="tabellare">{voce.punti}</dd>
            </div>
          )}
          <div>
            <dt>errori</dt>
            <dd className="tabellare">{voce.errori}</dd>
          </div>
          {dettaglio?.ultima && nomi && (
            <div className="fiore-ultima">
              <dt>ultima cella</dt>
              <dd>{nomi[dettaglio.ultima]}</dd>
            </div>
          )}
        </dl>
        <div className="foglio-azioni">
          <button ref={chiudi} className="bottone" data-testid="fiore-chiudi" onClick={onChiudi}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
