import { useState } from 'react';
import type { FormEvent } from 'react';
import { PROFILI, nomeVisibile, profiloDiNome } from '../config/giocatori';
import type { ProfiloId } from '../config/giocatori';
import { Semino } from './Semino';
import type { Io } from './useStanza';

/**
 * Ingresso: si sceglie il proprio colore (verde o blu) e si scrive la frase della stanza.
 * Prima dello sblocco di Semina le card sono solo colore: i personaggi sono una sorpresa.
 */
export function Ingresso({
  iniziale,
  sbloccata,
  onEntra,
}: {
  iniziale: Io | null;
  sbloccata: boolean;
  onEntra: (io: Io) => void;
}) {
  const [scelto, setScelto] = useState<ProfiloId | null>(() => (iniziale ? profiloDiNome(iniziale.nome).id : null));
  const [frase, setFrase] = useState(iniziale?.frase ?? '');
  const profilo = PROFILI.find((p) => p.id === scelto) ?? null;
  const pronto = !!profilo && frase.trim().length >= 4;

  function invia(e: FormEvent) {
    e.preventDefault();
    if (pronto && profilo) onEntra({ nome: profilo.nome, frase: frase.trim() });
  }

  return (
    <main className="schermata ingresso">
      <div className="ingresso-testa">
        <h1 className="titolo">
          Sudoku
          <br />
          di coppia
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
                <Semino chi={p.id} stadio={2} umore="felice" impulso={scelto === p.id ? 1 : 0} taglia={72} />
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
            onChange={(e) => setFrase(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="la stessa per tutti e due"
          />
          <span className="campo-aiuto">Apre la vostra stanza: chi non la conosce non vi trova.</span>
        </label>
        <button data-testid="entra" className="bottone primario" type="submit" disabled={!pronto}>
          {profilo ? `Entra: ${nomeVisibile(profilo, sbloccata)}` : 'Scegli il tuo colore'}
        </button>
      </form>
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
