import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { IconaMenu } from './Icone';

export type Tema = 'auto' | 'scuro' | 'chiaro';
const TEMI: Array<{ id: Tema; nome: string }> = [
  { id: 'auto', nome: 'auto' },
  { id: 'scuro', nome: 'notte' },
  { id: 'chiaro', nome: 'mattina' },
];
const PAROLA = 'ricomincia';

interface Props {
  mostraErrori: boolean;
  vibrazione: boolean;
  tema: Tema;
  inCorso: boolean;
  onImpostazione: (chiave: 'mostraErrori' | 'vibrazione', v: boolean) => void;
  onTema: (t: Tema) => void;
  onEsporta: () => void;
  onImporta: (testo: string) => void;
  onCancellaPartita: () => void;
  onRicomincia: () => void;
}

type Conferma = null | 'cancella' | 'ricomincia-1' | 'ricomincia-2';

/** Menù ⋯ della Home: impostazioni, memoria (esporta/importa) e, in fondo, le cancellazioni. */
export function MenuHome(p: Props) {
  const [aperto, setAperto] = useState(false);
  const [conferma, setConferma] = useState<Conferma>(null);
  const [parola, setParola] = useState('');
  const file = useRef<HTMLInputElement>(null);

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
      p.onImporta(await f.text());
    } catch {
      p.onImporta('');
    }
    chiudiTutto();
  }

  return (
    <div className="menu-ancora">
      <button
        className="icona-bottone"
        data-testid="menu"
        onClick={() => setAperto((a) => !a)}
        aria-label="Altre opzioni"
        aria-expanded={aperto}
      >
        <IconaMenu />
      </button>
      {aperto && (
        <>
          <div className="menu-velo" onPointerDown={() => setAperto(false)} />
          <div className="menu menu-home" role="menu">
            <label className="menu-voce">
              <span>Mostra errori</span>
              <input
                type="checkbox"
                className="interruttore"
                checked={p.mostraErrori}
                onChange={(e) => p.onImpostazione('mostraErrori', e.target.checked)}
              />
            </label>
            <label className="menu-voce">
              <span>Vibrazione</span>
              <input
                type="checkbox"
                className="interruttore"
                checked={p.vibrazione}
                onChange={(e) => p.onImpostazione('vibrazione', e.target.checked)}
              />
            </label>
            <div className="menu-voce menu-tema">
              <span>Tema</span>
              <span className="tema-scelta" role="radiogroup" aria-label="Tema">
                {TEMI.map((t) => (
                  <button
                    key={t.id}
                    role="radio"
                    aria-checked={p.tema === t.id}
                    className={p.tema === t.id ? 'attivo' : ''}
                    onClick={() => p.onTema(t.id)}
                  >
                    {t.nome}
                  </button>
                ))}
              </span>
            </div>
            <hr className="menu-riga" />
            <button className="menu-voce" data-testid="esporta" onClick={p.onEsporta}>
              Esporta memoria
            </button>
            <label className="menu-voce">
              <span>Importa memoria</span>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                data-testid="importa"
                className="nascosto"
                onChange={scegliFile}
              />
            </label>
            <hr className="menu-riga" />
            {p.inCorso && (
              <button className="menu-voce" onClick={() => {
                  setAperto(false);
                  setConferma('cancella');
                }}>
                Cancella la partita in corso
              </button>
            )}
            <button className="menu-voce menu-pericolo" data-testid="ricomincia" onClick={() => {
                setAperto(false);
                setConferma('ricomincia-1');
              }}>
              Ricomincia da zero
            </button>
          </div>
        </>
      )}

      {conferma && (
        <div className="foglio-velo" onPointerDown={(e) => e.target === e.currentTarget && chiudiTutto()}>
          <div className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="foglio-titolo">
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
                  Si cancellano il giardino, i punti, la storia sbloccata e Semina, per tutti e due: anche dal telefono
                  dell'altra persona, al prossimo collegamento. Nome e frase restano.
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
                      p.onRicomincia();
                      chiudiTutto();
                    }}
                  >
                    Cancella tutto
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
