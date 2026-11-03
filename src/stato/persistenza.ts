// Memoria più robusta senza backend: oltre a localStorage, una copia dell'archivio in IndexedDB
// (più capiente e meno soggetta a pulizie) e la richiesta al browser di non cancellare i dati del
// sito ("storage persistente"). All'avvio, se localStorage è vuoto ma IndexedDB ha una copia,
// la si ripristina prima di montare l'app.
import { CHIAVE_ARCHIVIO } from './archivio';

const DB = 'sudoku-coppia';
const STORE = 'archivio';

function apriDb(): Promise<IDBDatabase | null> {
  return new Promise((risolvi) => {
    try {
      if (typeof indexedDB === 'undefined') return risolvi(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => risolvi(r.result);
      r.onerror = () => risolvi(null);
    } catch {
      risolvi(null);
    }
  });
}

/** Copia il testo dell'archivio in IndexedDB (fire and forget). */
export async function specchiaInIndexedDB(testo: string): Promise<void> {
  const db = await apriDb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(testo, CHIAVE_ARCHIVIO);
  } catch {
    /* ignora */
  }
}

/** Se localStorage non ha l'archivio ma IndexedDB sì, lo ripristina. Non lancia mai. */
export async function ripristinaDaIndexedDB(): Promise<boolean> {
  try {
    if (typeof localStorage === 'undefined' || localStorage.getItem(CHIAVE_ARCHIVIO)) return false;
    const db = await apriDb();
    if (!db) return false;
    const testo = await new Promise<string | null>((risolvi) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(CHIAVE_ARCHIVIO);
      r.onsuccess = () => risolvi(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => risolvi(null);
    });
    if (!testo) return false;
    localStorage.setItem(CHIAVE_ARCHIVIO, testo);
    return true;
  } catch {
    return false;
  }
}

/** Chiede al browser di trattare i dati del sito come persistenti (niente pulizie automatiche). */
export async function chiediPersistenza(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
