import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'graphi-handles';
const STORE_NAME = 'roots';
const SITE_STORE_NAME = 'site-files';

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(SITE_STORE_NAME)) {
        db.createObjectStore(SITE_STORE_NAME);
      }
    }
  });
}

export async function saveHandle(name: string, handle: FileSystemHandle) {
  const db = await getDB();
  await db.put(STORE_NAME, handle, name);
}

export async function getHandles(): Promise<Record<string, FileSystemHandle>> {
  const db = await getDB();
  const keys = await db.getAllKeys(STORE_NAME);
  const result: Record<string, FileSystemHandle> = {};
  for (const key of keys) {
    result[key as string] = await db.get(STORE_NAME, key);
  }
  return result;
}

export async function removeHandle(name: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, name);
}

export async function clearHandles() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

// Site Files (Virtual)
export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  parentPath: string; // "root" or a folder path
  isFolder: boolean;
  order: number;
}

export async function saveSiteFile(file: VirtualFile) {
  const db = await getDB();
  await db.put(SITE_STORE_NAME, file, file.id);
}

export async function getSiteFiles(): Promise<VirtualFile[]> {
  const db = await getDB();
  const files = await db.getAll(SITE_STORE_NAME);
  return files as VirtualFile[];
}

export async function removeSiteFile(id: string) {
  const db = await getDB();
  await db.delete(SITE_STORE_NAME, id);
}
