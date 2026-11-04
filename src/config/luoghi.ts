// I luoghi della storia (atti, docs/storia/bibbia.md §5): vestiti e ricordi del giardino. Dati puri.
// Tutto deriva dai capitoli visti da chi tiene il telefono (prefisso `capitolo-0..k`): un luogo è
// visitato quando si è letto il primo capitolo del suo atto; un ricordo si vede col suo capitolo letto.
import { chiaveCapitolo } from './capitoli';
import type { Luogo } from './capitoli';
import type { ChiParla } from './frasi';

export interface Atto {
  luogo: Luogo;
  /** primo e ultimo capitolo (fiore) dell'atto */
  da: number;
  a: number;
  /** nome per il diario */
  nome: string;
  /** vestiti del luogo per personaggio (Semina `surf`: solo in coppia, lo decide `accessorioPermesso`) */
  vestiti: Record<ChiParla, string[]>;
  /** ricordi lasciati nel giardino: l'elemento della scena compare col capitolo `fiore` letto */
  ricordi: Array<{ fiore: number; elemento: string }>;
  /** il ritorno al giardino: tutti i vestiti, nessun luogo suo nella rotazione della Home */
  ritorno?: true;
}

const VIAGGIO: Atto[] = [
  { luogo: 'aiuola', da: 0, a: 5, nome: "L'aiuola", vestiti: { semino: [], semina: [] }, ricordi: [{ fiore: 1, elemento: 'fiore' }, { fiore: 3, elemento: 'sentiero' }, { fiore: 5, elemento: 'semina' }] },
  { luogo: 'giardino', da: 6, a: 14, nome: 'Il giardino', vestiti: { semino: ['occhiali'], semina: ['corona', 'animale'] }, ricordi: [{ fiore: 8, elemento: 'stagno' }, { fiore: 10, elemento: 'merlo' }, { fiore: 12, elemento: 'cassetta' }] },
  { luogo: 'mare', da: 15, a: 27, nome: 'Il mare', vestiti: { semino: ['surf', 'palla'], semina: ['paglia', 'surf'] }, ricordi: [{ fiore: 15, elemento: 'mare' }, { fiore: 20, elemento: 'stelle' }, { fiore: 26, elemento: 'surf' }] },
  { luogo: 'montagna', da: 28, a: 42, nome: 'La montagna', vestiti: { semino: ['zaino-storto'], semina: ['montagna', 'cavallo'] }, ricordi: [{ fiore: 29, elemento: 'montagna' }, { fiore: 30, elemento: 'cavallino' }, { fiore: 37, elemento: 'sasso' }] },
  { luogo: 'bosco', da: 43, a: 54, nome: 'Il bosco', vestiti: { semino: ['lanterna'], semina: ['lucciola'] }, ricordi: [{ fiore: 50, elemento: 'fuochi' }, { fiore: 54, elemento: 'lanterna' }] },
  { luogo: 'citta', da: 55, a: 66, nome: 'La città', vestiti: { semino: ['chitarra'], semina: ['giacca'] }, ricordi: [{ fiore: 63, elemento: 'chitarra' }, { fiore: 65, elemento: 'locandina' }] },
  { luogo: 'cucina', da: 67, a: 76, nome: 'La cucina', vestiti: { semino: ['cuoco'], semina: ['grembiule'] }, ricordi: [{ fiore: 67, elemento: 'casetta' }] },
  { luogo: 'lontano', da: 77, a: 90, nome: 'Oltre la montagna', vestiti: { semino: ['cuffie'], semina: ['camice'] }, ricordi: [{ fiore: 88, elemento: 'cartina' }] },
];

/** Gli atti in ordine, da 0 a 100; l'ultimo (il ritorno) ha tutti i vestiti dei luoghi prima. */
export const ATTI: readonly Atto[] = [
  ...VIAGGIO,
  {
    luogo: 'giardino',
    da: 91,
    a: 100,
    nome: 'Il ritorno',
    vestiti: {
      semino: [...new Set(VIAGGIO.flatMap((x) => x.vestiti.semino))],
      semina: [...new Set(VIAGGIO.flatMap((x) => x.vestiti.semina))],
    },
    ricordi: [{ fiore: 98, elemento: 'arcobaleno' }],
    ritorno: true,
  },
];

/** Vestiti che dentro il loro luogo arrivano più tardi (col capitolo indicato letto). */
export const VESTITI_DAL_CAPITOLO: Readonly<Record<string, number>> = { animale: 10, cavallo: 30 };

/** L'atto a cui appartiene il capitolo `fiore` (undefined fuori da 0-100). */
export function attoDi(fiore: number): Atto | undefined {
  return ATTI.find((x) => fiore >= x.da && fiore <= x.a);
}

/** Gli atti arrivati: il loro primo capitolo è tra i visti. */
export function attiVisitati(visti: readonly string[]): Atto[] {
  const v = new Set(visti);
  return ATTI.filter((x) => v.has(chiaveCapitolo(x.da)));
}

/** I luoghi visitati (senza doppioni), nell'ordine del viaggio. */
export function luoghiVisitati(visti: readonly string[]): Luogo[] {
  return [...new Set(attiVisitati(visti).map((x) => x.luogo))];
}

/** Il vestito è arrivato (luogo visitato e, se ne ha uno, il suo capitolo letto)? */
export function vestitoArrivato(id: string, visti: readonly string[]): boolean {
  const dal = VESTITI_DAL_CAPITOLO[id];
  if (dal !== undefined && !visti.includes(chiaveCapitolo(dal))) return false;
  return attiVisitati(visti).some((x) => x.vestiti.semino.includes(id) || x.vestiti.semina.includes(id));
}

/** I vestiti di `chi` nei luoghi visitati (senza doppioni; il surf di Semina va poi filtrato da `accessorioPermesso`). */
export function vestitiDisponibili(chi: ChiParla, visti: readonly string[]): string[] {
  const tutti = attiVisitati(visti).flatMap((x) => x.vestiti[chi]);
  return [...new Set(tutti)].filter((id) => vestitoArrivato(id, visti));
}

/** Il luogo (del viaggio, non il ritorno) da cui viene un vestito. */
export function luogoDelVestito(id: string): Luogo | undefined {
  return VIAGGIO.find((x) => x.vestiti.semino.includes(id) || x.vestiti.semina.includes(id))?.luogo;
}

/** Elementi del giardino con il capitolo più alto letto `maxVisto` (id di ELEMENTI_SCENA, in ordine di comparsa). */
export function elementiSbloccati(maxVisto: number): string[] {
  return ATTI.flatMap((x) => x.ricordi)
    .filter((r) => r.fiore <= maxVisto)
    .map((r) => r.elemento);
}
