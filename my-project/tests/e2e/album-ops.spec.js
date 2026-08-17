import { expect, test } from '@playwright/test';
import { seedAndLoad } from './helpers.js';

// User Story 4 storage operations, driven through the contract.
// The folder-picker half of US4 cannot be automated — showDirectoryPicker
// requires a real user gesture on a real chooser — so these exercise every
// operation behind it.

const ops = (page, fn, arg) => page.evaluate(fn, arg);

test('createAlbum rejects an empty or oversized name', async ({ page }) => {
  await seedAndLoad(page, []);
  const result = await ops(page, async () => {
    const out = {};
    try {
      await globalThis.__storage.createAlbum('   ');
    } catch (e) {
      out.empty = e.code;
    }
    try {
      await globalThis.__storage.createAlbum('x'.repeat(201));
    } catch (e) {
      out.long = e.code;
    }
    return out;
  });
  expect(result.empty).toBe('INVALID_NAME');
  expect(result.long).toBe('INVALID_NAME');
});

test('V-8: an import commits supported files and reports the rest by name', async ({ page }) => {
  await seedAndLoad(page, []);
  const result = await ops(page, async () => {
    const { album } = await globalThis.__storage.createAlbum('Mixed batch');
    return globalThis.__storage.addPhotos(album.id, [
      { relativePath: 'a/one.jpg', filename: 'one.jpg', takenAt: '2026-04-01T00:00:00Z' },
      { relativePath: 'a/notes.txt', filename: 'notes.txt' },
      { relativePath: 'a/two.png', filename: 'two.png', takenAt: '2026-04-02T00:00:00Z' },
      { relativePath: 'a/clip.mov', filename: 'clip.mov' },
    ]);
  });
  expect(result.added.map((p) => p.filename)).toEqual(['one.jpg', 'two.png']);
  expect(result.rejected).toEqual([
    { filename: 'notes.txt', reason: 'Not a supported image format.' },
    { filename: 'clip.mov', reason: 'Not a supported image format.' },
  ]);
});

test('adding the same file twice to one album is reported, not duplicated', async ({ page }) => {
  await seedAndLoad(page, []);
  const result = await ops(page, async () => {
    const { album } = await globalThis.__storage.createAlbum('Dupes');
    const file = { relativePath: 'a/one.jpg', filename: 'one.jpg', takenAt: '2026-04-01T00:00:00Z' };
    await globalThis.__storage.addPhotos(album.id, [file]);
    const second = await globalThis.__storage.addPhotos(album.id, [file]);
    const { photos } = await globalThis.__storage.listPhotos(album.id);
    return { rejected: second.rejected, count: photos.length };
  });
  expect(result.count).toBe(1);
  expect(result.rejected[0].reason).toBe('Already in this album.');
});

test('an album takes the earliest capture date as its group (FR-014)', async ({ page }) => {
  await seedAndLoad(page, []);
  const groupDate = await ops(page, async () => {
    const { album } = await globalThis.__storage.createAlbum('Spanning');
    await globalThis.__storage.addPhotos(album.id, [
      { relativePath: 's/late.jpg', filename: 'late.jpg', takenAt: '2026-09-09T00:00:00Z' },
      { relativePath: 's/early.jpg', filename: 'early.jpg', takenAt: '2026-02-02T00:00:00Z' },
    ]);
    const { groups } = await globalThis.__storage.listMainPage();
    return groups.find((g) => g.albums.some((a) => a.name === 'Spanning')).date;
  });
  expect(groupDate).toBe('2026-02-02');
});

test('moving a photo transfers it rather than copying it (I-4)', async ({ page }) => {
  await seedAndLoad(page);
  const result = await ops(page, async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const all = groups.flatMap((g) => g.albums);
    const source = all.find((a) => a.name === 'Coast walk');
    const target = all.find((a) => a.name === 'Spring garden');
    const { photos } = await globalThis.__storage.listPhotos(source.id);
    await globalThis.__storage.movePhoto(photos[0].id, target.id);
    return {
      source: (await globalThis.__storage.listPhotos(source.id)).photos.length,
      target: (await globalThis.__storage.listPhotos(target.id)).photos.length,
    };
  });
  expect(result.source).toBe(1);
  expect(result.target).toBe(2);
});

test('deleting an album reports the photo count first (FR-013)', async ({ page }) => {
  await seedAndLoad(page);
  const deleted = await ops(page, async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const album = groups.flatMap((g) => g.albums).find((a) => a.name === 'Coast walk');
    const result = await globalThis.__storage.deleteAlbum(album.id);
    return result.deletedPhotoCount;
  });
  expect(deleted).toBe(2);
  await page.reload();
  await page.waitForSelector('.date-group');
  await expect(page.locator('.album-card', { hasText: 'Coast walk' })).toHaveCount(0);
});

test('a cover photo must belong to the album it covers (I-5)', async ({ page }) => {
  await seedAndLoad(page);
  const code = await ops(page, async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const all = groups.flatMap((g) => g.albums);
    const a = all.find((x) => x.name === 'Coast walk');
    const b = all.find((x) => x.name === 'Spring garden');
    const foreign = (await globalThis.__storage.listPhotos(b.id)).photos[0];
    try {
      await globalThis.__storage.setCover(a.id, foreign.id);
      return null;
    } catch (e) {
      return e.code;
    }
  });
  expect(code).toBe('COVER_NOT_IN_ALBUM');
});
