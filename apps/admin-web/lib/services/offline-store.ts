/**
 * IndexedDB offline form store for Nepal Republic services super-app.
 * Database: 'nepal-republic-offline', store: 'form_drafts'
 */

const DB_NAME = 'nepal-republic-offline';
const DB_VERSION = 1;
const STORE_NAME = 'form_drafts';

export interface OfflineDraft {
  id: string; // same as serviceSlug
  serviceSlug: string;
  formKey: string;
  data: Record<string, any>;
  updatedAt: number;
  synced: boolean;
  submitted?: boolean;
}

function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIDBAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('service_slug', 'serviceSlug', { unique: false });
        store.createIndex('updated_at', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txPromise<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save or update an offline draft by serviceSlug.
 */
export async function saveOfflineDraft(
  serviceSlug: string,
  formKey: string,
  data: Record<string, any>,
  submitted = false,
): Promise<void> {
  try {
    const db = await openDB();
    const draft: OfflineDraft = {
      id: serviceSlug,
      serviceSlug,
      formKey,
      data,
      updatedAt: Date.now(),
      synced: false,
      submitted,
    };
    await txPromise(db, 'readwrite', (store) => store.put(draft));
    db.close();
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — silently fail
    console.warn('[offline-store] Could not save draft to IndexedDB');
  }
}

/**
 * Get a single offline draft by serviceSlug.
 */
export async function getOfflineDraft(
  serviceSlug: string,
): Promise<Record<string, any> | null> {
  try {
    const db = await openDB();
    const result = await txPromise<OfflineDraft | undefined>(
      db,
      'readonly',
      (store) => store.get(serviceSlug),
    );
    db.close();
    return result?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Get full draft record (including metadata) by serviceSlug.
 */
export async function getOfflineDraftRecord(
  serviceSlug: string,
): Promise<OfflineDraft | null> {
  try {
    const db = await openDB();
    const result = await txPromise<OfflineDraft | undefined>(
      db,
      'readonly',
      (store) => store.get(serviceSlug),
    );
    db.close();
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * List all offline drafts.
 */
export async function getAllOfflineDrafts(): Promise<
  Array<{ serviceSlug: string; formKey: string; data: any; updatedAt: number }>
> {
  try {
    const db = await openDB();
    const result = await txPromise<OfflineDraft[]>(
      db,
      'readonly',
      (store) => store.getAll(),
    );
    db.close();
    return result.map((d) => ({
      serviceSlug: d.serviceSlug,
      formKey: d.formKey,
      data: d.data,
      updatedAt: d.updatedAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete a draft by serviceSlug.
 */
export async function deleteOfflineDraft(
  serviceSlug: string,
): Promise<void> {
  try {
    const db = await openDB();
    await txPromise(db, 'readwrite', (store) => store.delete(serviceSlug));
    db.close();
  } catch {
    // noop
  }
}

/**
 * Get all drafts that haven't been synced yet.
 */
export async function getPendingSyncs(): Promise<OfflineDraft[]> {
  try {
    const db = await openDB();
    const all = await txPromise<OfflineDraft[]>(
      db,
      'readonly',
      (store) => store.getAll(),
    );
    db.close();
    return all.filter((d) => !d.synced);
  } catch {
    return [];
  }
}

/**
 * Mark a draft as synced.
 */
export async function markSynced(serviceSlug: string): Promise<void> {
  try {
    const db = await openDB();
    const existing = await txPromise<OfflineDraft | undefined>(
      db,
      'readonly',
      (store) => store.get(serviceSlug),
    );
    if (existing) {
      existing.synced = true;
      await txPromise(db, 'readwrite', (store) => store.put(existing));
    }
    db.close();
  } catch {
    // noop
  }
}
