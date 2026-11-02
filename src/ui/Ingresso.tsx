import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Io } from './useStanza';

export function Ingresso({ iniziale, onEntra }: { iniziale: Io | null; onEntra: (io: Io) => void }) {
  const [nome, setNome] = useState(iniziale?.nome ?? '');
  const [frase, setFrase] = useState(iniziale?.frase ?? '');
  const pronto = nome.trim().length > 0 && frase.trim().length >= 4;

  function invia(e: FormEvent) {
    e.preventDefault();
    if (pronto) onEntra({ nome: nome.trim(), frase: frase.trim() });
  }

  return (
    <main className="schermata ingresso">
      <div className="ingresso-testa">
        <Marchio />
        <h1 className="titolo">
          Sudoku
          <br />
          di coppia
        </h1>
        <p className="sottotitolo">Una griglia, due penne.</p>
      </div>

      <form className="ingresso-form" onSubmit={invia}>
        <label className="campo">
          <span className="campo-etichetta">Come ti chiami</span>
          <input
            data-testid="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            maxLength={24}
            placeholder="il tuo nome"
          />
        </label>
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
          Entra
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
