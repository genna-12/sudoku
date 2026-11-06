import { REGISTRO } from '../net';
import { useRef, useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useChiudiConIndietro } from './indietro';
import { useDialogo } from './dialogo';
import { IconaMenu } from './Icone';
import type { InfoSync } from './useSync';
import { muoviNelMenu, vociMenu } from './vociMenu';
import type { ContestoMenu } from './vociMenu';

export type Tema = 'auto' | 'scuro' | 'chiaro';
const TEMI: Array<{ id: Tema; nome: string }> = [
  { id: 'auto', nome: 'auto' },
  { id: 'scuro', nome: 'notte' },
  { id: 'chiaro', nome: 'mattina' },
];
const PAROLA = 'ricomincia';

interface Props {
  contesto: ContestoMenu;
  mostraErrori: boolean;
  vibrazione: boolean;
  tema: Tema;
  inCorso: boolean;
  /** Semina già arrivata: prima non si nomina nemmeno qui */
  sbloccata: boolean;
  onImpostazione: (chiave: 'mostraErrori' | 'vibrazione', v: boolean) => void;
  onTema: (t: Tema) => void;
  onCancellaPartita: () => void;
  /** solo in Home: memoria e ricomincia */
  onEsporta?: () => void;
  onImporta?: (testo: string) => void;
  onRicomincia?: () => void;
  sync?: InfoSync;
  onSincronizza?: () => void;
  /** solo in partita: torna alla Home */
  onEsci?: () => void;
}

function testoSync(s: InfoSync | undefined): string {
  if (!s || s.stato === 'spenta') return 'non configurata';
  if (s.stato === 'errore') return 'errore (riprovo)';
  if (s.stato === 'in-corso') return 'sincronizzo…';
  if (!s.ultimo) return 'in attesa';
  const d = new Date(s.ultimo);
  return `sincronizzata alle ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Conferma = null | 'cancella' | 'ricomincia-1' | 'ricomincia-2';

/** Registro della rete (stanze, ICE), per capire dal telefono perché non ci si collega. */
function Diagnostica() {
  const [aperta, setAperta] = useState(false);
  const [, ridisegna] = useState(0);
  useEffect(() => {
    if (!aperta) return;
    const t = window.setInterval(() => ridisegna((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [aperta]);
  const testo = REGISTRO.join('\n');
  return (
    <div className="menu-sezione" role="none">
      <button className="menu-voce" type="button" role="menuitem" onClick={() => setAperta((v) => !v)} aria-expanded={aperta}>
        Diagnostica rete {aperta ? '▴' : '▾'}
      </button>
      {aperta && (
        <>
          <pre className="diagnostica" data-testid="diagnostica" role="none">
            {testo || 'nessun evento ancora'}
          </pre>
          <button
            className="menu-voce"
            type="button"
            role="menuitem"
            onClick={() => navigator.clipboard?.writeText(testo).catch(() => {})}
          >
            Copia il registro
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Il menù ⋯, lo stesso in Home e in Partita (voci contestuali): in partita in cima "Torna alla Home",
 * poi le impostazioni (anche il tema) e "Cancella la partita in corso"; in Home anche la memoria e
 * "Ricomincia da zero". Esc e indietro chiudono prima la conferma, poi il menù; il focus torna al ⋯.
 */
export function Menu(p: Props) {
  const [aperto, setAperto] = useState(false);
  const [conferma, setConferma] = useState<Conferma>(null);
  const [parola, setParola] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const bottone = useRef<HTMLButtonElement>(null);
  const pannello = useRef<HTMLDivElement>(null);
  const foglio = useRef<HTMLDivElement>(null);
  // gesto indietro (ed Esc): chiude prima la conferma, poi il menù
  useChiudiConIndietro(aperto, () => setAperto(false));
  useChiudiConIndietro(conferma !== null, () => {
    setConferma(null);
    setParola('');
  });
  useDialogo(pannello, aperto, { riserva: bottone });
  useDialogo(foglio, conferma !== null, { riserva: bottone });

  function chiudiTutto() {
    setAperto(false);
    setConferma(null);
    setParola('');
  }

  async function scegliFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      p.onImporta?.(await f.text());
    } catch {
      p.onImporta?.('');
    }
    chiudiTutto();
  }

  const voci = vociMenu(p.contesto, { inCorso: p.inCorso });
  const c = (v: (typeof voci)[number]) => voci.includes(v);

  return (
    <div className="menu-ancora">
      <button
        ref={bottone}
        className="icona-bottone"
        data-testid="menu"
        onClick={() => setAperto((a) => !a)}
        aria-label="Altre opzioni"
        aria-haspopup="menu"
        aria-expanded={aperto}
      >
        <IconaMenu />
      </button>
      {aperto && (
        <>
          <div className="menu-velo" onPointerDown={() => setAperto(false)} />
          <div
            ref={pannello}
            className={`menu menu-pannello menu-${p.contesto}`}
            role="menu"
            aria-label="Altre opzioni"
            data-testid="menu-pannello"
            data-contesto={p.contesto}
            onKeyDown={muoviNelMenu}
          >
            {c('torna') && (
              <button
                className="menu-voce menu-torna"
                role="menuitem"
                data-testid="menu-torna"
                onClick={() => {
                  setAperto(false);
                  p.onEsci?.();
                }}
              >
                Torna alla Home
              </button>
            )}
            {c('impostazioni') && (
              <div className="menu-gruppo" role="group" aria-labelledby="menu-impostazioni">
                <p className="menu-sezione" id="menu-impostazioni">
                  Impostazioni
                </p>
                <label className="menu-voce">
                  <span>Mostra errori</span>
                  <input
                    type="checkbox"
                    role="menuitemcheckbox"
                    className="interruttore"
                    data-testid="menu-errori"
                    checked={p.mostraErrori}
                    onChange={(e) => p.onImpostazione('mostraErrori', e.target.checked)}
                  />
                </label>
                <label className="menu-voce">
                  <span>Vibrazione</span>
                  <input
                    type="checkbox"
                    role="menuitemcheckbox"
                    className="interruttore"
                    checked={p.vibrazione}
                    onChange={(e) => p.onImpostazione('vibrazione', e.target.checked)}
                  />
                </label>
                <div className="menu-voce menu-tema" role="none">
                  <span id="menu-tema">Tema</span>
                  <span className="tema-scelta" role="group" aria-labelledby="menu-tema">
                    {TEMI.map((t) => (
                      <button
                        key={t.id}
                        role="menuitemradio"
                        aria-checked={p.tema === t.id}
                        data-testid={`menu-tema-${t.id}`}
                        className={p.tema === t.id ? 'attivo' : ''}
                        onClick={() => p.onTema(t.id)}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </span>
                </div>
              </div>
            )}
            {c('memoria') && (
              <div className="menu-gruppo" role="group" aria-labelledby="menu-memoria">
                <p className="menu-sezione" id="menu-memoria">
                  Memoria del giardino
                </p>
                <button className="menu-voce" role="menuitem" data-testid="esporta" onClick={p.onEsporta}>
                  Esporta memoria
                </button>
                <button className="menu-voce" role="menuitem" data-testid="importa-voce" onClick={() => file.current?.click()}>
                  Importa memoria
                </button>
                <input
                  ref={file}
                  type="file"
                  accept="application/json,.json"
                  data-testid="importa"
                  className="nascosto"
                  tabIndex={-1}
                  aria-hidden="true"
                  onChange={scegliFile}
                />
                <p className="menu-voce menu-sync" data-testid="sync-stato" role="none">
                  <span>Memoria condivisa: {testoSync(p.sync)}</span>
                </p>
                {p.sync && p.sync.stato !== 'spenta' && p.onSincronizza && (
                  <button
                    className="menu-voce"
                    role="menuitem"
                    data-testid="sync-ora"
                    onClick={p.onSincronizza}
                    disabled={p.sync.stato === 'in-corso'}
                  >
                    Sincronizza ora
                  </button>
                )}
              </div>
            )}
            {(c('cancella') || c('ricomincia')) && (
              <div className="menu-gruppo" role="group" aria-labelledby="menu-ripartire">
                <p className="menu-sezione" id="menu-ripartire">
                  Per ripartire
                </p>
                {c('cancella') && (
                  <button
                    className="menu-voce"
                    role="menuitem"
                    data-testid="menu-cancella"
                    onClick={() => {
                      setAperto(false);
                      setConferma('cancella');
                    }}
                  >
                    Cancella la partita in corso
                  </button>
                )}
                {c('ricomincia') && (
                  <button
                    className="menu-voce menu-pericolo"
                    role="menuitem"
                    data-testid="ricomincia"
                    onClick={() => {
                      setAperto(false);
                      setConferma('ricomincia-1');
                    }}
                  >
                    Ricomincia da zero
                  </button>
                )}
              </div>
            )}
            {c('diagnostica') && <Diagnostica />}
            <p className="menu-versione" data-testid="versione" role="none">
              versione {__APP_VERSIONE__}
            </p>
          </div>
        </>
      )}

      {conferma && (
        <div className="foglio-velo" onPointerDown={(e) => e.target === e.currentTarget && chiudiTutto()}>
          <div ref={foglio} className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="foglio-titolo" data-testid="menu-conferma">
            <div key={conferma} className={`foglio-passo${conferma === 'ricomincia-2' ? ' avanti' : ''}`}>
              {conferma === 'cancella' && (
                <>
                  <h2 id="foglio-titolo">Cancellare la partita in corso?</h2>
                  <p>Resta nel giardino come germoglio: potete riprenderla quando volete.</p>
                  <div className="foglio-azioni">
                    <button className="bottone" onClick={chiudiTutto}>
                      Lascia stare
                    </button>
                    <button
                      className="bottone primario"
                      data-testid="cancella-conferma"
                      onClick={() => {
                        p.onCancellaPartita();
                        chiudiTutto();
                      }}
                    >
                      Cancella
                    </button>
                  </div>
                </>
              )}
              {conferma === 'ricomincia-1' && (
                <>
                  <h2 id="foglio-titolo">Ricominciare da zero?</h2>
                  <p>
                    {p.sbloccata
                      ? 'Si cancellano il giardino, i punti, la storia sbloccata e Semina, per tutti e due'
                      : 'Si cancellano il giardino, i punti e la storia sbloccata, per tutti e due'}
                    : anche dal telefono dell'altra persona, al prossimo collegamento. Nome e frase restano.
                  </p>
                  <div className="foglio-azioni">
                    <button className="bottone" onClick={chiudiTutto}>
                      Lascia stare
                    </button>
                    <button
                      className="bottone pericolo"
                      data-testid="ricomincia-conferma-1"
                      onClick={() => setConferma('ricomincia-2')}
                    >
                      Continua
                    </button>
                  </div>
                </>
              )}
              {conferma === 'ricomincia-2' && (
                <>
                  <h2 id="foglio-titolo">Ultima conferma</h2>
                  <p>
                    Scrivi <b>{PAROLA}</b> per cancellare tutto.
                  </p>
                  <input
                    className="foglio-campo"
                    data-testid="ricomincia-parola"
                    value={parola}
                    onChange={(e) => setParola(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    aria-label={`Scrivi ${PAROLA}`}
                  />
                  <div className="foglio-azioni">
                    <button className="bottone" onClick={chiudiTutto}>
                      Lascia stare
                    </button>
                    <button
                      className="bottone pericolo"
                      data-testid="ricomincia-conferma-2"
                      disabled={parola.trim().toLowerCase() !== PAROLA}
                      onClick={() => {
                        p.onRicomincia?.();
                        chiudiTutto();
                      }}
                    >
                      Sì, cancella tutto
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
