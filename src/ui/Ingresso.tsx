import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { PROFILI, nomeVisibile, profiloDiNome } from '../config/giocatori';
import type { ProfiloId } from '../config/giocatori';
import { Semino } from './Semino';
import { SemiTitolo } from './Icone';
import type { Indossati } from './useMascotte';
import type { Io } from './useStanza';

/**
 * Ingresso: si sceglie il proprio colore (verde o blu) e si scrive la frase della stanza.
 * Prima dello sblocco di Semina le card sono solo colore: i personaggi sono una sorpresa.
 */
export function Ingresso({
  iniziale,
  sbloccata,
  vestiti,
  onEntra,
}: {
  iniziale: Io | null;
  sbloccata: boolean;
  /** i vestiti degli ultimi passati in Home (`vestitiGrandi`), solo dopo l'arrivo di Semina */
  vestiti?: Indossati;
  onEntra: (io: Io) => void;
}) {
  const [scelto, setScelto] = useState<ProfiloId | null>(() => (iniziale ? profiloDiNome(iniziale.nome).id : null));
  const [frase, setFrase] = useState(iniziale?.frase ?? '');
  const profilo = PROFILI.find((p) => p.id === scelto) ?? null;
  const pronto = !!profilo && frase.trim().length >= 4;
  const [manca, setManca] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  // questo browser ricorda già l'altro profilo: prima di sostituirlo, un avviso (mai al primo ingresso)
  const ricordato = iniziale ? profiloDiNome(iniziale.nome) : null;
  const [avviso, setAvviso] = useState(false);

  function invia(e: FormEvent) {
    e.preventDefault();
    if (pronto && profilo && ricordato && ricordato.id !== profilo.id) setAvviso(true);
    else if (pronto && profilo) onEntra({ nome: profilo.nome, frase: frase.trim() });
    else if (profilo) {
      // colore scelto ma frase troppo corta: si va al campo e lo si dice
      setManca(true);
      campo.current?.focus();
    }
  }

  return (
    <main className="schermata ingresso">
      <div className="ingresso-testa">
        <h1 className="titolo">
          Sudoku
          <br />
          di coppia
          <SemiTitolo />
        </h1>
        <p className="sottotitolo">Una griglia, due semi.</p>
      </div>

      <form className="ingresso-form" onSubmit={invia}>
        <fieldset className="profili">
          <legend className="campo-etichetta">Il tuo colore</legend>
          {PROFILI.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`scegli-${p.id}`}
              className={`profilo profilo-${p.id}${scelto === p.id ? ' scelto' : ''}`}
              aria-pressed={scelto === p.id}
              onClick={() => setScelto(p.id)}
            >
              {sbloccata ? (
                <Semino chi={p.id} stadio={2} umore="felice" impulso={scelto === p.id ? 1 : 0} taglia={72} accessorio={vestiti?.[p.id]} />
              ) : (
                <span className="profilo-goccia" aria-hidden="true" />
              )}
              <span className="profilo-nome">{nomeVisibile(p, sbloccata)}</span>
              <span className="profilo-desc">{p.descrizione}</span>
            </button>
          ))}
        </fieldset>
        <label className="campo">
          <span className="campo-etichetta">Frase segreta</span>
          <input
            data-testid="frase"
            value={frase}
            ref={campo}
            onChange={(e) => {
              setFrase(e.target.value);
              setManca(false);
            }}
            aria-invalid={manca || undefined}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="la stessa per tutti e due"
          />
          <span className={`campo-aiuto${manca ? ' campo-manca' : ''}`} role={manca ? 'alert' : undefined}>
            {manca ? 'Scrivi la frase segreta (almeno 4 caratteri).' : 'Apre la vostra stanza: chi non la conosce non vi trova.'}
          </span>
        </label>
        <button data-testid="entra" className="bottone primario" type="submit" disabled={!profilo}>
          {profilo ? `Entra come ${nomeVisibile(profilo, sbloccata)}` : 'Scegli chi sei'}
        </button>
      </form>

      {avviso && profilo && ricordato && (
        <div className="foglio-velo" onPointerDown={(e) => e.target === e.currentTarget && setAvviso(false)}>
          <div className="foglio" role="alertdialog" aria-modal="true" aria-labelledby="avviso-profilo-titolo" data-testid="avviso-profilo">
            <div className="foglio-passo">
              <h2 id="avviso-profilo-titolo">Questo browser ricorda già {nomeVisibile(ricordato, sbloccata)}</h2>
              <p>
                Per provare in due da un solo computer usa una finestra in incognito o un altro browser: così le due
                memorie restano separate.
              </p>
              <div className="foglio-azioni">
                <button className="bottone" data-testid="avviso-profilo-annulla" onClick={() => setAvviso(false)}>
                  Annulla
                </button>
                <button
                  className="bottone primario"
                  data-testid="avviso-profilo-entra"
                  onClick={() => onEntra({ nome: profilo.nome, frase: frase.trim() })}
                >
                  Entra comunque come {nomeVisibile(profilo, sbloccata)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Piccola griglia 3×3 con due celle "scritte" nei due colori. */
export function Marchio() {
  return (
    <svg className="marchio" viewBox="0 0 30 30" aria-hidden="true">
      <rect x="1" y="1" width="28" height="28" rx="6" />
      <path d="M10.3 1.5v27M19.7 1.5v27M1.5 10.3h27M1.5 19.7h27" />
      <rect className="marchio-a" x="1.6" y="1.6" width="8.4" height="8.4" rx="4" />
      <rect className="marchio-b" x="20" y="20" width="8.4" height="8.4" rx="4" />
    </svg>
  );
}
