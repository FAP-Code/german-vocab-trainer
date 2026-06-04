import { openDB, type IDBPDatabase } from 'idb';
import type { Recording } from '../types';

const DB_NAME = 'humscore-db';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
  return _db;
}

export async function saveRecording(recording: Recording): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, recording);
}

export async function getRecording(id: string): Promise<Recording | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllRecordings(): Promise<Recording[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function updateRecordingNotes(
  id: string,
  notes: Recording['notes'],
): Promise<void> {
  const db = await getDB();
  const rec = await db.get(STORE_NAME, id);
  if (rec) {
    rec.notes = notes;
    await db.put(STORE_NAME, rec);
  }
}

/** Serialize an audio Blob to base64 for storage */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Deserialize a base64 string back to a Blob */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}
