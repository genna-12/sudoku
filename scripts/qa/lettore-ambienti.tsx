// Banco di prova del lettore dei capitoli per gli screenshot degli ambienti (T9 C): lo importa
// scripts/qa/ambienti-foto.mjs dentro una pagina del dev server, così Vite lo trasforma con gli stessi
// moduli dell'app. Monta CapitoloScena come App (stadio, vestiti, Scena dietro aiuola e giardino).
import { createRoot, type Root } from 'react-dom/client';
import { CAPITOLI, type Capitolo } from '../../src/config/capitoli';
import { CapitoloScena } from '../../src/ui/CapitoloScena';
import { giardinoDelCapitolo } from '../../src/ui/capitoli';
import { Scena } from '../../src/ui/Scena';
import { accessorioValido } from '../../src/ui/useMascotte';
import '../../src/ui/tema.css';

const FIORI = 100;
let root: Root | null = null;

function sfondoDi(c: Capitolo) {
  const v = c.fondale ?? c.luogo;
  if (v !== 'aiuola' && v !== 'giardino') return undefined;
  const g = giardinoDelCapitolo(c.fiore, FIORI);
  return (
    <div className="capitolo-sfondo" aria-hidden="true">
      <Scena elementi={g.elementi.filter((e) => e !== 'stelle')} fiori={Math.min(FIORI, c.fiore)} bluPresenza={g.bluPresenza} altezza={240} intera senzaEntrate />
    </div>
  );
}

/** apre il capitolo `fiore` come dopo una vittoria (rileggi: come dal diario) */
export function monta(fiore: number, rileggi = false) {
  if (!root) {
    document.body.innerHTML = '<div id="root"></div>';
    document.body.style.margin = '0';
    root = createRoot(document.getElementById('root')!);
  }
  const c = CAPITOLI[fiore];
  root.render(
    <CapitoloScena
      key={fiore}
      capitolo={c}
      stadio={Math.min(4, c.fiore)}
      onContinua={() => {}}
      rilettura={rileggi}
      accessoriDisegnati={(id) => !!accessorioValido(id)}
      sfondo={sfondoDi(c)}
    />,
  );
}
