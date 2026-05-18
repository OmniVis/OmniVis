import type { Session } from "@/lib/sessions";

const DB_NAME = "slidi-db";
const DB_VERSION = 2;
const ASSETS_STORE = "assets";
const SESSIONS_STORE = "sessions";
const QUEUE_STORE = "offline-queue";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE);
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => {
      dbPromise = null; // allow retry on next call
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
}

/** Reset the singleton — for use in tests only. */
export function _resetDbForTests(): void {
  dbPromise = null;
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(store: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function getAsset(id: string): Promise<string | undefined> {
  try {
    return await idbGet<string>(ASSETS_STORE, id);
  } catch {
    return undefined;
  }
}

export async function putAsset(id: string, data: string): Promise<void> {
  try {
    await idbPut(ASSETS_STORE, id, data);
  } catch {
    // fail silently
  }
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    await idbDelete(ASSETS_STORE, id);
  } catch {
    // fail silently
  }
}

export async function getSessionContent(id: string): Promise<Session | undefined> {
  try {
    return await idbGet<Session>(SESSIONS_STORE, id);
  } catch {
    return undefined;
  }
}

export async function putSessionContent(session: Session): Promise<void> {
  try {
    await idbPut(SESSIONS_STORE, session.id, session);
  } catch {
    // fail silently
  }
}

export async function deleteSessionContent(id: string): Promise<void> {
  try {
    await idbDelete(SESSIONS_STORE, id);
  } catch {
    // fail silently
  }
}

export async function getAllSessionContents(): Promise<Session[]> {
  try {
    const all = await idbGetAll<Session>(SESSIONS_STORE);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}
