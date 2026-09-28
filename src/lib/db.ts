import type { RecentItem } from './qr';

const DB_NAME = 'QRStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'recent_generations';
const MAX_ITEMS = 20;
const FALLBACK_KEY = 'qr_studio_recents_v1';

let dbInstance: IDBDatabase | null = null;
let isDbSupported: boolean = typeof indexedDB !== 'undefined';

/**
 * Initializes and upgrades the IndexedDB schema.
 */
export function openDatabase(): Promise<IDBDatabase | null> {
  if (!isDbSupported) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = () => {
        isDbSupported = false;
        resolve(null);
      };
    } catch {
      isDbSupported = false;
      resolve(null);
    }
  });
}

let memoryFallback: RecentItem[] = [];

function getFallbackRecents(): RecentItem[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(FALLBACK_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [...memoryFallback];
  } catch {
    return [...memoryFallback];
  }
}

function saveFallbackRecents(items: RecentItem[]): void {
  try {
    memoryFallback = [...items];
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves all recent generations ordered by latest first.
 */
export async function dbGetRecents(): Promise<RecentItem[]> {
  const db = await openDatabase();
  if (!db) {
    return getFallbackRecents().slice(0, MAX_ITEMS);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const result = (request.result as RecentItem[]) || [];
        // Sort descending by timestamp
        result.sort((a, b) => b.createdAt - a.createdAt);
        resolve(result.slice(0, MAX_ITEMS));
      };

      request.onerror = () => {
        resolve(getFallbackRecents().slice(0, MAX_ITEMS));
      };
    } catch {
      resolve(getFallbackRecents().slice(0, MAX_ITEMS));
    }
  });
}

/**
 * Saves a new generation record into the database. Deduplicates against latest entry.
 */
export async function dbSaveRecent(
  item: Omit<RecentItem, 'id' | 'createdAt'>
): Promise<RecentItem[]> {
  const existing = await dbGetRecents();
  const latest = existing[0];

  // Prevent exact consecutive duplicate spam
  if (latest && latest.payload === item.payload && latest.type === item.type) {
    return existing;
  }

  const record: RecentItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };

  const db = await openDatabase();
  if (!db) {
    const next = [record, ...existing].slice(0, MAX_ITEMS);
    saveFallbackRecents(next);
    return next;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);

      tx.oncomplete = async () => {
        // Enforce max capacity by pruning oldest entries if over limit
        if (existing.length >= MAX_ITEMS) {
          const toDelete = existing.slice(MAX_ITEMS - 1);
          const pruneTx = db.transaction(STORE_NAME, 'readwrite');
          const pruneStore = pruneTx.objectStore(STORE_NAME);
          toDelete.forEach((del) => pruneStore.delete(del.id));
        }
        const updated = await dbGetRecents();
        resolve(updated);
      };

      tx.onerror = () => {
        const next = [record, ...existing].slice(0, MAX_ITEMS);
        saveFallbackRecents(next);
        resolve(next);
      };
    } catch {
      const next = [record, ...existing].slice(0, MAX_ITEMS);
      saveFallbackRecents(next);
      resolve(next);
    }
  });
}

/**
 * Deletes a single record by its unique database primary key ID.
 */
export async function dbDeleteRecent(id: string): Promise<RecentItem[]> {
  const db = await openDatabase();
  if (!db) {
    const next = getFallbackRecents().filter((r) => r.id !== id);
    saveFallbackRecents(next);
    return next;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      tx.oncomplete = async () => {
        const updated = await dbGetRecents();
        resolve(updated);
      };

      tx.onerror = async () => {
        const updated = await dbGetRecents();
        resolve(updated);
      };
    } catch {
      resolve(getFallbackRecents().filter((r) => r.id !== id));
    }
  });
}

/**
 * Clears all records from the recent generations store.
 */
export async function dbClearRecents(): Promise<void> {
  saveFallbackRecents([]);
  const db = await openDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Exports all database records as a formatted JSON document.
 */
export async function dbExportJSON(): Promise<string> {
  const items = await dbGetRecents();
  return JSON.stringify(
    {
      database: DB_NAME,
      exportedAt: new Date().toISOString(),
      recordCount: items.length,
      records: items,
    },
    null,
    2
  );
}
