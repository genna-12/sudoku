// CSS delle proposte T9-B, iniettato solo dallo script di cattura (mai nell'app).
// Ogni proposta: variabili --g-* su .app (scuro di base, chiaro nei due selettori come in tema.css) + regole sulle celle.
// Le classi usate sono quelle già in Griglia.tsx; `vicina-suo` (riga/colonna/box del partner) NON esiste ancora:
// la proposta B ne avrebbe bisogno (una riga in Griglia.tsx) e lo script di cattura la aggiunge a mano.

const chiaro = (css) => `
@media (prefers-color-scheme: light) { :root:not([data-tema='scuro']) .app { ${css} } }
:root[data-tema='chiaro'] .app { ${css} }`;

/** Pezzi comuni: testo dei numeri e rete di sicurezza dell'errore (resta rosso anche sotto selezione, numero uguale, riga). */
const comune = `
.cella.mia .valore { color: var(--g-testo-mio); }
.cella.sua .valore { color: var(--g-testo-suo); }
.cella.errore .valore { color: var(--g-errore-testo); }
.cella.stessa { box-shadow: inset 0 0 0 1.5px var(--g-filo-uguale); }
.cella.errore::before { content: ''; position: absolute; right: 0; bottom: 0; z-index: 1; border-style: solid; border-width: 0 0 10px 10px; border-color: transparent transparent var(--errore) transparent; pointer-events: none; }
`;

// ---------------------------------------------------------------------------------------------
// A. Anelli vivi: nessun blocco di colore. Verde e blu solo in anelli e numeri (la regola resta com'è).
//    Mia selezione = anello pieno, spesso, del mio colore. Partner = anello tratteggiato del suo.
// ---------------------------------------------------------------------------------------------
const A = `
.app {
  --g-mio: var(--mio);
  --g-suo: color-mix(in srgb, var(--suo) 74%, #fff);
  --g-vicina: color-mix(in srgb, var(--inchiostro) 10%, var(--carta));
  --g-uguale: color-mix(in srgb, var(--evid) 16%, var(--carta-2));
  --g-filo-uguale: color-mix(in srgb, var(--evid) 55%, transparent);
  --g-sel: color-mix(in srgb, var(--g-mio) 16%, var(--carta));
  --g-errore: color-mix(in srgb, var(--errore) 22%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 55%, #fff);
  --g-testo-mio: color-mix(in srgb, var(--mio) 66%, #fff);
  --g-testo-suo: color-mix(in srgb, var(--suo) 50%, #fff);
}
${chiaro(`
  --g-mio: color-mix(in srgb, var(--mio) 50%, #0c1a12);
  --g-suo: color-mix(in srgb, var(--suo) 90%, #0c1a12);
  --g-errore: color-mix(in srgb, var(--errore) 16%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 82%, #000);
  --g-vicina: color-mix(in srgb, var(--inchiostro) 12%, var(--carta));
  --g-uguale: color-mix(in srgb, var(--evid) 17%, var(--carta-2));
  --g-testo-mio: color-mix(in srgb, var(--mio) 28%, #0c1a12);
  --g-testo-suo: color-mix(in srgb, var(--suo) 68%, #0c1a12);
`)}
${comune}
.cella.vicina { --bg: var(--g-vicina); }
.cella.mia.vicina { --bg: color-mix(in srgb, var(--g-mio) 14%, var(--g-vicina)); }
.cella.sua.vicina { --bg: color-mix(in srgb, var(--g-suo) 14%, var(--g-vicina)); }
.cella.stessa { --bg: var(--g-uguale); }
.cella.selezionata { --bg: var(--g-sel); box-shadow: inset 0 0 0 3.5px var(--g-mio); }
.cella.errore { --bg: var(--g-errore); }
.cella.errore.vicina { --bg: color-mix(in srgb, var(--errore) 22%, var(--g-vicina)); }
.cella.errore.stessa { --bg: color-mix(in srgb, var(--errore) 22%, var(--g-uguale)); }
.cella.errore.selezionata { --bg: color-mix(in srgb, var(--errore) 22%, var(--g-sel)); }
.cella.partner { --bg: color-mix(in srgb, var(--g-suo) 14%, var(--carta)); box-shadow: none; }
.cella.partner::after { box-shadow: none; border: 3px dashed var(--g-suo); animation: none; }
.cella.partner.selezionata { box-shadow: inset 0 0 0 6.5px var(--g-mio); }
`;

// ---------------------------------------------------------------------------------------------
// B. Due fasce di colore: riga/colonna/box di chi gioca prendono un velo del SUO colore (verde mio, blu suo);
//    dove si incrociano il velo diventa verde-azzurro. Cella selezionata e cella del partner: velo più forte + anello pieno.
//    Rivede la regola "mai a blocchi" per la griglia. Per il velo del partner serve la classe `vicina-suo` in Griglia.tsx.
// ---------------------------------------------------------------------------------------------
const B = `
.app {
  --g-mio: var(--mio);
  --g-suo: color-mix(in srgb, var(--suo) 78%, #fff);
  --g-velo-mio: color-mix(in srgb, var(--mio) 13%, var(--carta));
  --g-velo-suo: color-mix(in srgb, var(--suo) 24%, var(--carta));
  --g-velo-due: color-mix(in srgb, var(--mio) 11%, color-mix(in srgb, var(--suo) 24%, var(--carta)));
  --g-uguale: color-mix(in srgb, var(--evid) 22%, var(--carta-2));
  --g-filo-uguale: color-mix(in srgb, var(--evid) 60%, transparent);
  --g-sel: color-mix(in srgb, var(--mio) 22%, var(--carta));
  --g-part: color-mix(in srgb, var(--suo) 52%, var(--carta));
  --g-errore: color-mix(in srgb, var(--errore) 24%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 55%, #fff);
  --g-testo-mio: color-mix(in srgb, var(--mio) 66%, #fff);
  --g-testo-suo: color-mix(in srgb, var(--suo) 50%, #fff);
}
${chiaro(`
  --g-mio: color-mix(in srgb, var(--mio) 50%, #0c1a12);
  --g-suo: color-mix(in srgb, var(--suo) 92%, #0c1a12);
  --g-velo-mio: color-mix(in srgb, var(--mio) 30%, var(--carta));
  --g-velo-suo: color-mix(in srgb, var(--suo) 16%, var(--carta));
  --g-velo-due: color-mix(in srgb, var(--mio) 26%, color-mix(in srgb, var(--suo) 16%, var(--carta)));
  --g-uguale: color-mix(in srgb, var(--evid) 17%, var(--carta-2));
  --g-sel: color-mix(in srgb, var(--mio) 50%, var(--carta));
  --g-part: color-mix(in srgb, var(--suo) 40%, var(--carta));
  --g-errore: color-mix(in srgb, var(--errore) 18%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 82%, #000);
  --g-testo-mio: color-mix(in srgb, var(--mio) 28%, #0c1a12);
  --g-testo-suo: color-mix(in srgb, var(--suo) 68%, #0c1a12);
`)}
${comune}
.cella.vicina { --bg: var(--g-velo-mio); }
.cella.vicina-suo { --bg: var(--g-velo-suo); }
.cella.vicina.vicina-suo { --bg: var(--g-velo-due); }
.cella.stessa { --bg: var(--g-uguale); }
.cella.selezionata { --bg: var(--g-sel); box-shadow: inset 0 0 0 3.5px var(--g-mio); }
.cella.errore, .cella.errore.vicina, .cella.errore.vicina-suo { --bg: var(--g-errore); }
.cella.errore.stessa { --bg: color-mix(in srgb, var(--errore) 24%, var(--g-uguale)); }
.cella.errore.selezionata { --bg: color-mix(in srgb, var(--errore) 24%, var(--g-sel)); }
.cella.partner { --bg: var(--g-part); box-shadow: inset 0 0 0 3.5px var(--g-suo); }
.cella.partner::after { box-shadow: none; animation: none; }
.cella.partner.selezionata { box-shadow: inset 0 0 0 6.5px var(--g-mio); }
.cella.partner.selezionata::after { border: 3px solid var(--g-suo); }
`;

// ---------------------------------------------------------------------------------------------
// C. Pieni: le DUE celle di chi gioca sono piene del colore vivo (verde fluo mio, blu elettrico suo), numero in
//    contrasto; riga/colonna/box restano neutri ma più marcati. Se coincidono, la cella è divisa in diagonale.
//    Rivede la regola "mai a blocchi" solo per queste due celle.
// ---------------------------------------------------------------------------------------------
const C = `
.app {
  --g-mio: var(--mio);
  --g-suo: var(--suo);
  --g-vicina: color-mix(in srgb, var(--inchiostro) 11%, var(--carta));
  --g-uguale: color-mix(in srgb, var(--evid) 17%, var(--carta-2));
  --g-filo-uguale: color-mix(in srgb, var(--evid) 60%, transparent);
  --g-sel: var(--mio);
  --g-part: var(--suo);
  --g-sel-testo: #06140c;
  --g-part-testo: #ffffff;
  --g-errore: color-mix(in srgb, var(--errore) 22%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 55%, #fff);
  --g-testo-mio: color-mix(in srgb, var(--mio) 66%, #fff);
  --g-testo-suo: color-mix(in srgb, var(--suo) 50%, #fff);
}
${chiaro(`
  --g-vicina: color-mix(in srgb, var(--inchiostro) 10%, var(--carta));
  --g-uguale: color-mix(in srgb, var(--evid) 17%, var(--carta-2));
  --g-errore: color-mix(in srgb, var(--errore) 16%, var(--carta));
  --g-errore-testo: color-mix(in srgb, var(--errore) 82%, #000);
  --g-testo-mio: color-mix(in srgb, var(--mio) 28%, #0c1a12);
  --g-testo-suo: color-mix(in srgb, var(--suo) 68%, #0c1a12);
`)}
${comune}
.cella.vicina { --bg: var(--g-vicina); }
.cella.mia.vicina { --bg: color-mix(in srgb, var(--g-mio) 16%, var(--g-vicina)); }
.cella.sua.vicina { --bg: color-mix(in srgb, var(--g-suo) 22%, var(--g-vicina)); }
.cella.stessa { --bg: var(--g-uguale); }
.cella.selezionata { --bg: var(--g-sel); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--g-sel) 55%, #000); }
.cella.selezionata .valore { color: var(--g-sel-testo); font-weight: 850; }
.cella.errore { --bg: var(--g-errore); }
.cella.errore.vicina { --bg: color-mix(in srgb, var(--errore) 22%, var(--g-vicina)); }
.cella.errore.stessa { --bg: color-mix(in srgb, var(--errore) 24%, var(--g-uguale)); }
.cella.errore.selezionata .valore { color: var(--errore); background: #fff; border-radius: 6px; width: 62%; height: 62%; margin: auto; inset: 0; }
.cella.partner { --bg: var(--g-part); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--g-part) 55%, #000); }
.cella.partner::after { box-shadow: none; animation: none; }
.cella.partner .valore { color: var(--g-part-testo); font-weight: 850; }
.cella.partner.selezionata { background-image: linear-gradient(135deg, var(--g-sel) 50%, var(--g-part) 50%); }
.cella.partner.selezionata .valore { color: #fff; text-shadow: 0 0 2px #000, 0 0 2px #000, 0 0 3px #000; }
`;

export const PROPOSTE = { 'a-anelli': A, 'b-fasce': B, 'c-pieni': C };
