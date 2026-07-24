/**
 * Voice recording history stored in IndexedDB.
 * Saves audio blobs, transcripts, timestamps, and duration.
 */

const DB_NAME = "orun-voice-history";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

export interface VoiceRecording {
  id: string;
  audioBlob: Blob;
  audioUrl: string;
  transcript: string;
  duration: number; // ms
  language?: string;
  timestamp: number;
  size: number;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    req.onsuccess = () => { dbInstance = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

/** Save a voice recording */
export async function saveRecording(
  audioBlob: Blob,
  transcript: string,
  duration: number,
  language?: string
): Promise<VoiceRecording> {
  const db = await openDB();
  const id = `vr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const audioUrl = URL.createObjectURL(audioBlob);

  const recording: VoiceRecording = {
    id,
    audioBlob,
    audioUrl,
    transcript,
    duration,
    language,
    timestamp: Date.now(),
    size: audioBlob.size,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(recording);
    tx.oncomplete = () => resolve(recording);
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all recordings, newest first */
export async function getRecordings(limit = 50): Promise<VoiceRecording[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("timestamp");
    const req = index.openCursor(null, "prev");
    const results: VoiceRecording[] = [];

    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && results.length < limit) {
        // Don't include the full audioBlob in listing (too large)
        const { audioBlob, ...rest } = cursor.value as VoiceRecording;
        results.push(rest as VoiceRecording);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Get a single recording's audio blob */
export async function getRecordingAudio(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result?.audioBlob ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a recording */
export async function deleteRecording(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get total storage used (approximate) */
export async function getStorageUsed(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
