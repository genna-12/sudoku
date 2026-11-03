// Operazioni sull'archivio fatte dal menù della Home: profilo, esporta/importa, azzeramenti.
// Pure (nessun DOM): le usa App, le provano i test.
import { profiloDiNome } from '../config/giocatori';
import type { Profilo } from '../config/giocatori';
import { aggiornaStorico, applicaAzzeramento, migra, unisciStoricoRemoto } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { partitaToccata } from './regole';

/** `io` con il nome ricondotto a un profilo (i nomi liberi di T1 diventano Semino o Semina). */
export function ioDaArchivio(a: Archivio): { nome: string; frase: string } | null {
  if (!a.io || !a.io.frase) return null;
  return { nome: profiloDiNome(a.io.nome).nome, frase: a.io.frase };
}

export function altroProfilo(p: Profilo): string {
  return p.id === 'semino' ? 'Semina' : 'Semino';
}

/** Testo JSON dell'intero archivio, senza la frase segreta. */
export function esporta(a: Archivio): string {
  const { io, ...resto } = a;
  return JSON.stringify({ ...resto, io: io ? { nome: io.nome, frase: '' } : null }, null, 1);
}

export function nomeFileEsportazione(ora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `sudoku-coppia-${ora.getFullYear()}-${p(ora.getMonth() + 1)}-${p(ora.getDate())}.json`;
}

/**
 * Unisce un archivio importato: storico con `unisciStoricoRemoto` (azzeramento max), tappe viste
 * unite. Mai sovrascrive nome, frase, partita o impostazioni. `importate` = partite nuove o aggiornate.
 */
export function importa(a: Archivio, testo: string): { archivio: Archivio; importate: number } | null {
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    return null;
  }
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) return null;
  const imp = migra(dati);
  const unito = unisciStoricoRemoto(a, imp.storico, imp.azzerato);
  const prima = new Map(a.storico.map((v) => [v.id, v.aggiornata]));
  const importate = unito.storico.filter((v) => prima.get(v.id) !== v.aggiornata).length;
  const tappe = new Set([...unito.tappeViste, ...(imp.azzerato >= unito.azzerato ? imp.tappeViste : [])]);
  return { archivio: { ...unito, tappeViste: [...tappe] }, importate };
}

/** Chiude la partita in corso lasciandola come germoglio (se toccata). */
export function cancellaPartita(a: Archivio): Archivio {
  if (!a.partita) return a;
  const conVoce = partitaToccata(a.partita) ? aggiornaStorico(a, a.partita) : a;
  return { ...conVoce, partita: null };
}

/** Ricomincia da zero: giardino, tappe viste e partita via; nome e frase restano. */
export function ricomincia(a: Archivio, ora: number): Archivio {
  const azzerato = Math.max(ora, a.azzerato + 1);
  return { ...applicaAzzeramento(a, azzerato), storico: [], tappeViste: [], partita: null };
}
