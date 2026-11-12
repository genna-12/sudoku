// La radice: l'app di sempre, oppure la stanza di revisione (aperta dall'Ingresso con la sua frase).
// Con la revisione aperta App è smontata: niente archivio, niente stanze P2P, niente sync col Worker.
// Lo stato vive solo qui, in memoria: ricaricando si torna all'app normale.
import { useState } from 'react';
import { App } from './App';
import { Revisione } from './Revisione';

export function Radice() {
  const [revisione, setRevisione] = useState(false);
  // dopo un giro in revisione App rinasce (chiave nuova) e riparte dall'Ingresso
  const [ritorni, setRitorni] = useState(0);
  if (revisione)
    return (
      <Revisione
        onEsci={() => {
          setRitorni((n) => n + 1);
          setRevisione(false);
        }}
      />
    );
  return <App key={ritorni} onRevisione={() => setRevisione(true)} inizio={ritorni > 0 ? 'ingresso' : undefined} />;
}
