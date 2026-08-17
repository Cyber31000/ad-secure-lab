/**
 * Access to the person's photo folder.
 *
 * Purpose: photos are read in place from disk and never copied or uploaded
 * (research.md R-002). The granted directory handle is persisted in IndexedDB so
 * the folder is chosen once, not on every launch.
 * Preconditions: File System Access API (Chromium). Every entry point degrades
 * explicitly rather than throwing an opaque error.
 * Leaves behind: one IndexedDB record holding the directory handle.
 */

const DB_NAME = 'photo-album-organizer';
const STORE = 'handles';
const KEY = 'photo-directory';

let cachedHandle = null;

export const isSupported = () => typeof globalThis.showDirectoryPicker === 'function';

function openIdb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(mode, fn) {
  const db = await openIdb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Prompt for a folder and remember it. */
export async function grantDirectory() {
  if (!isSupported()) {
    throw new Error(
      'This browser cannot open a folder without copying files. ' +
        'Photo Album Organizer needs a Chromium-based browser.',
    );
  }
  const handle = await globalThis.showDirectoryPicker({ id: KEY, mode: 'read' });
  await idb('readwrite', (store) => store.put(handle, KEY));
  cachedHandle = handle;
  return handle;
}

/** The remembered folder, if permission still holds. Null otherwise. */
export async function getDirectory({ prompt = false } = {}) {
  if (cachedHandle) return cachedHandle;
  if (!isSupported()) return null;

  const handle = await idb('readonly', (store) => store.get(KEY));
  if (!handle) return null;

  const options = { mode: 'read' };
  let permission = await handle.queryPermission(options);
  if (permission !== 'granted' && prompt) {
    permission = await handle.requestPermission(options);
  }
  if (permission !== 'granted') return null;

  cachedHandle = handle;
  return handle;
}

export async function forgetDirectory() {
  cachedHandle = null;
  await idb('readwrite', (store) => store.delete(KEY));
}

/** Resolve a stored relative path to its File on disk. */
export async function readFile(relativePath) {
  const root = await getDirectory();
  if (!root) return null;
  const segments = relativePath.split('/').filter(Boolean);
  const filename = segments.pop();
  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment);
  }
  const fileHandle = await dir.getFileHandle(filename);
  return fileHandle.getFile();
}

/** Walk the granted folder, yielding supported image files. */
export async function* walkImages(dirHandle, prefix = '') {
  for await (const [name, handle] of dirHandle.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      yield* walkImages(handle, path);
    } else {
      yield { relativePath: path, filename: name, handle };
    }
  }
}
