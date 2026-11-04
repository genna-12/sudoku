// Operazioni sull'archivio fatte dal menù della Home: profilo, esporta/importa, azzeramenti.
// Pure (nessun DOM): le usa App, le provano i test.
import { PROFILI, profiloDiNome } from '../config/giocatori';
import type { Profilo } from '../config/giocatori';
import { aggiornaStorico, applicaAzzeramento, migra, normalizzaVisti, unisciStoricoRemoto, unisciVisti } from '../stato/archivio';
import type { Archivio } from '../stato/archivio';
import { partitaToccata } from './regole';

/** `io` con il nome ricondotto a un profilo (i nomi liberi di T1 diventano Semino o Semina). */
export function ioDaArchivio(a: Archivio): { nome: string; frase: string } | null {
  if (!a.io || !a.io.frase) return null;
  return { nome: profiloDiNome(a.io.nome).nome, frase: a.io.frase };
}

/** Il nome salvato è già un profilo (scelto all'Ingresso di T2), non un nome libero di T1 da confermare. */
export function profiloConfermato(a: Archivio): boolean {
  return !!a.io && PROFILI.some((p) => p.nome === a.io!.nome);
}

export function altroProfilo(p: Profilo): string {
  return p.id === 'semino' ? 'Semina' : 'Semino';
}

/** Testo JSON dell'intero archivio, senza la frase segreta e senza le tappe viste di T2-T4 (inerti). */
export function esporta(a: Archivio): string {
  const { io, tappeViste: _inerti, ...resto } = a;
  return JSON.stringify({ ...resto, io: io ? { nome: io.nome, frase: '' } : null }, null, 1);
}

export function nomeFileEsportazione(ora: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `sudoku-coppia-${ora.getFullYear()}-${p(ora.getMonth() + 1)}-${p(ora.getDate())}.json`;
}

/**
 * Unisce un archivio importato: storico con `unisciStoricoRemoto` (azzeramento max), capitoli visti
 * uniti per ruolo e solo se della stessa era (letti dal file così come sono: un file v1 non ne porta).
 * Mai sovrascrive nome, frase, partita, impostazioni, tappe o eco. `importate` = partite nuove o aggiornate.
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
  // niente PASSI qui: un file v1 con `semina-5` darebbe i visti al ruolo di chi l'ha esportato
  const visti = normalizzaVisti((dati as Record<string, unknown>).capitoliVisti);
  const capitoliVisti = imp.azzerato >= unito.azzerato ? unisciVisti(unito.capitoliVisti, visti) : unito.capitoliVisti;
  return { archivio: { ...unito, capitoliVisti }, importate };
}

/** Chiude la partita in corso lasciandola come germoglio (se toccata). */
export function cancellaPartita(a: Archivio): Archivio {
  if (!a.partita) return a;
  const conVoce = partitaToccata(a.partita) ? aggiornaStorico(a, a.partita) : a;
  return { ...conVoce, partita: null };
}

/** Ricomincia da zero: giardino, tappe e capitoli visti (di entrambi), eco e partita via; nome e frase restano. */
export function ricomincia(a: Archivio, ora: number): Archivio {
  const azzerato = Math.max(ora, a.azzerato + 1);
  return { ...applicaAzzeramento(a, azzerato), storico: [], tappeViste: [], capitoliVisti: { a: [], b: [] }, ecoViste: [], partita: null };
}
