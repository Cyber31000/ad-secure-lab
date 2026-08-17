/**
 * Thumbnail generation and cache.
 *
 * Purpose: tiles render from small WebP thumbnails, never from full-resolution
 * originals — that is what makes SC-003 (500 tiles in one second) reachable
 * (research.md R-003).
 * Preconditions: OPFS available for the cache; createImageBitmap and
 * OffscreenCanvas (both platform built-ins, no library).
 * Leaves behind: one OPFS directory of cached WebP thumbnails.
 */

import { readFile } from './directory.js';

const CACHE_DIR = 'thumbnails';
const THUMB_WIDTH = 320;

const objectUrls = new Map();

async function cacheDir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(CACHE_DIR, { create: true });
}

const cacheName = (photoId) => `photo-${photoId}.webp`;

async function readCached(photoId) {
  try {
    const dir = await cacheDir();
    const handle = await dir.getFileHandle(cacheName(photoId));
    return await handle.getFile();
  } catch {
    return null; // Not cached yet — an expected path, not a failure.
  }
}

async function writeCached(photoId, blob) {
  const dir = await cacheDir();
  const handle = await dir.getFileHandle(cacheName(photoId), { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** Downscale a source file to a WebP thumbnail. */
async function render(file) {
  const bitmap = await createImageBitmap(file, {
    resizeWidth: THUMB_WIDTH,
    resizeQuality: 'medium',
  });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
}

/**
 * A displayable URL for a photo's thumbnail, generating and caching on first
 * request. Returns null when the source file cannot be reached, so callers can
 * show a placeholder instead of a broken image.
 */
export async function thumbnailUrl(photo) {
  if (objectUrls.has(photo.id)) return objectUrls.get(photo.id);

  let blob = await readCached(photo.id);
  if (!blob) {
    const source = await readFile(photo.relative_path);
    if (!source) return null;
    blob = await render(source);
    await writeCached(photo.id, blob);
  }
  const url = URL.createObjectURL(blob);
  objectUrls.set(photo.id, url);
  return url;
}

/** The full-resolution photo, for the single-photo view. */
export async function fullSizeUrl(photo) {
  const source = await readFile(photo.relative_path);
  return source ? URL.createObjectURL(source) : null;
}

export function releaseUrl(url) {
  if (url) URL.revokeObjectURL(url);
}

/** Drop cached thumbnails for photos that no longer exist. */
export async function evict(photoIds) {
  const dir = await cacheDir();
  for (const id of photoIds) {
    objectUrls.delete(id);
    try {
      await dir.removeEntry(cacheName(id));
    } catch {
      // Nothing cached for this photo; nothing to evict.
    }
  }
}
