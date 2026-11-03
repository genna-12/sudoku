// "Nuovo nel giardino": annuncio di uno sblocco (elemento della scena + i suoi regali), una volta
// per dispositivo. La Scena fa entrare l'elemento nuovo; sotto, cosa porta con sé.
import { useEffect, useId, useRef } from 'react';
import type { Sblocco } from '../config/storia';
import { elementiSbloccati } from '../config/storia';
import { Scena } from './Scena';
import { ACCESSORI_DI } from './Semino';

/** Di chi è uno sblocco (per il colore del suo seme): accessori e pacchetti di frasi hanno un padrone. */
function chiDi(s: Sblocco): string | undefined {
  if (s.tipo === 'accessorio') return (ACCESSORI_DI.semina as readonly string[]).includes(s.id) ? 'semina' : 'semino';
  if (s.tipo === 'frasi') return s.id.split('-')[0];
  return undefined;
}

/** "Lo stagno" → "lo stagno"; i nomi propri (Semina) restano. */
function minuscolo(nome: string): string {
  return /^(Il|Lo|La|I|Gli|Le) /.test(nome) || nome.startsWith("L'") ? nome[0].toLowerCase() + nome.slice(1) : nome;
}

function testoRegalo(s: Sblocco): { titolo: string; dettaglio: string } {
  switch (s.tipo) {
    case 'regalo':
      // una riga sola: se la descrizione dice già "prossima partita" basta lei
      return /prossima partita/i.test(s.descrizione)
        ? { titolo: s.descrizione, dettaglio: '' }
        : { titolo: 'Un suggerimento in più nella prossima partita', dettaglio: s.descrizione };
    case 'frasi':
      return { titolo: `Frasi nuove: ${minuscolo(s.nome)}`, dettaglio: s.descrizione };
    case 'accessorio':
      return { titolo: s.descrizione, dettaglio: '' };
    default:
      return { titolo: s.nome, dettaglio: s.descrizione };
  }
}

export function AnnuncioSblocco({
  sblocchi,
  fiori,
  bluPresenza,
  onChiudi,
}: {
  sblocchi: Sblocco[];
  fiori: number;
  bluPresenza: number;
  onChiudi: () => void;
}) {
  const id = useId();
  // il fuoco entra nel dialogo (per i lettori di schermo e la tastiera) senza accendere l'anello sul bottone
  const carta = useRef<HTMLDivElement>(null);
  useEffect(() => carta.current?.focus(), []);
  const elemento = sblocchi.find((s) => s.tipo === 'elemento');
  const altri = sblocchi.filter((s) => s !== elemento);
  const nome = elemento ? minuscolo(elemento.nome) : minuscolo(sblocchi[0]?.nome ?? '');
  return (
    <div className="annuncio" role="dialog" aria-modal="true" aria-labelledby={`${id}-titolo`}>
      <div ref={carta} tabIndex={-1} className="annuncio-carta" data-testid="annuncio-sblocco" data-sblocco={elemento?.id ?? sblocchi[0]?.id}>
        <div className="annuncio-cielo">
          <Scena
            elementi={elementiSbloccati(fiori)}
            fiori={fiori}
            bluPresenza={bluPresenza}
            altezza={168}
            nuovi={elemento ? [elemento.id] : []}
          />
        </div>
        <div className="annuncio-corpo">
          <h2 className="annuncio-titolo" id={`${id}-titolo`}>
            Nuovo nel giardino: {nome}
          </h2>
          {elemento && <p className="annuncio-descrizione">{elemento.descrizione}</p>}
          {altri.length > 0 && (
            <ul className="annuncio-regali">
              {altri.map((s) => {
                const t = testoRegalo(s);
                return (
                  <li key={`${s.tipo}:${s.id}`} data-tipo={s.tipo} data-chi={chiDi(s)}>
                    <b>{t.titolo}</b>
                    {t.dettaglio && <span>{t.dettaglio}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          <button className="bottone primario" data-testid="annuncio-chiudi" onClick={onChiudi}>
            Continua
          </button>
        </div>
      </div>
    </div>
  );
}
