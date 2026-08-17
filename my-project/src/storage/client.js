/**
 * Main-thread wrapper over the storage worker.
 *
 * Purpose: turn the worker's message protocol into promises, correlated by id.
 * Preconditions: module workers are supported (all Chromium targets).
 * Leaves behind: one long-lived Worker.
 */

import { StorageError } from './errors.js';

let worker = null;
let ready = null;
let sequence = 0;
const pending = new Map();

function ensureWorker() {
  if (worker) return ready;

  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

  ready = new Promise((resolve, reject) => {
    const onReady = (event) => {
      if (event.data?.type !== 'ready') return;
      worker.removeEventListener('message', onReady);
      // Wait for the worker to say it is ready — never a fixed delay.
      event.data.error ? reject(new Error(event.data.error)) : resolve();
    };
    worker.addEventListener('message', onReady);
  });

  worker.addEventListener('message', (event) => {
    const { id, ok, data, error } = event.data ?? {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    ok ? entry.resolve(data) : entry.reject(new StorageError(error.code, error.message));
  });

  worker.addEventListener('error', (event) => {
    for (const { reject } of pending.values()) reject(new Error(event.message));
    pending.clear();
  });

  return ready;
}

/** Send one operation and await its response. Rejects with a StorageError. */
export async function call(op, payload = {}) {
  await ensureWorker();
  const id = `req-${++sequence}`;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, payload });
  });
}

export const storage = {
  listMainPage: () => call('listMainPage'),
  createAlbum: (name) => call('createAlbum', { name }),
  renameAlbum: (albumId, name) => call('renameAlbum', { albumId, name }),
  deleteAlbum: (albumId) => call('deleteAlbum', { albumId }),
  reorderAlbum: (albumId, targetPosition, targetGroupDate) =>
    call('reorderAlbum', { albumId, targetPosition, targetGroupDate }),
  listPhotos: (albumId) => call('listPhotos', { albumId }),
  addPhotos: (albumId, files) => call('addPhotos', { albumId, files }),
  movePhoto: (photoId, targetAlbumId) => call('movePhoto', { photoId, targetAlbumId }),
  removePhoto: (photoId) => call('removePhoto', { photoId }),
  setCover: (albumId, photoId) => call('setCover', { albumId, photoId }),
  seed: (albums) => call('__seed', { albums }),
};
