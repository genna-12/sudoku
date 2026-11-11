// Ambienti dei capitoli 9-100 (T9 C): momento del giorno, meteo, comparse e oggetti in scena.
// Vocabolario unico in ambienti.json, letto anche da scripts/storia/controlla.py: qui solo tipi e accesso.
// I capitoli 0-8 non hanno ambiente (segreto per Matilde): lo garantisce lo script.
import dati from './ambienti.json';

export type MomentoAmbiente = 'alba' | 'mattina' | 'giorno' | 'tramonto' | 'sera' | 'notte';
export type Meteo = 'sereno' | 'nuvole' | 'vento' | 'pioggia' | 'temporale' | 'nebbia' | 'neve';

export interface Ambiente {
  momento: MomentoAmbiente;
  meteo: Meteo;
}

export const MOMENTI_AMBIENTE = dati.momenti as readonly MomentoAmbiente[];
export const METEO = dati.meteo as readonly Meteo[];
/** id → etichetta (per l'accessibilità e i test, mai sullo schermo come nome) */
export const COMPARSE: Readonly<Record<string, string>> = dati.comparse;
export const OGGETTI: Readonly<Record<string, string>> = dati.oggetti;
/** al massimo per capitolo (lo controlla anche lo script) */
export const MAX_PER_CAPITOLO = 3;

export function comparsaValida(id: string): boolean {
  return Object.hasOwn(COMPARSE, id);
}
export function oggettoValido(id: string): boolean {
  return Object.hasOwn(OGGETTI, id);
}
