import { expect, test } from '@playwright/test';
import { bigAlbum } from '../fixtures/seed.js';

// Quickstart V-10 / SC-002, SC-003.
// These measure the application's own work: query, layout, paint. They do not
// measure thumbnail decoding from disk, which needs a granted folder.

test.describe.configure({ timeout: 180_000 });

/** 100 albums totalling 10,000 photos, spread across 28 date groups. */
function largeCollection() {
  return Array.from({ length: 100 }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, '0');
    return {
      name: `Album ${i}`,
      groupDate: `2026-05-${day}`,
      position: Math.floor(i / 28),
      createdAt: `2026-05-${day}T00:00:00Z`,
      photos: Array.from({ length: 100 }, (_, j) => ({
        relativePath: `a${i}/p${j}.jpg`,
        filename: `p${j}.jpg`,
        takenAt: `2026-05-${day}T00:00:00Z`,
      })),
    };
  });
}

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__storage !== undefined);
}

test('SC-002: main page is usable within 2s at 100 albums / 10,000 photos', async ({ page }) => {
  await boot(page);
  await page.evaluate((data) => globalThis.__storage.seed(data), largeCollection());

  const elapsed = await page.evaluate(async () => {
    const started = performance.now();
    await globalThis.__app.showMainPage();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - started;
  });

  expect(await page.locator('.album-card').count()).toBe(100);
  console.log(`main page: ${Math.round(elapsed)}ms for 100 albums / 10,000 photos`);
  expect(elapsed).toBeLessThan(2000);
});

test('SC-003: a 500-photo album shows tiles within 1s', async ({ page }) => {
  await boot(page);
  await page.evaluate((data) => globalThis.__storage.seed(data), bigAlbum(500));

  const elapsed = await page.evaluate(async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const albumId = groups[0].albums[0].id;
    const started = performance.now();
    await globalThis.__app.openAlbum(albumId);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - started;
  });

  expect(await page.locator('.tile').count()).toBe(500);
  console.log(`album view: ${Math.round(elapsed)}ms for 500 tiles`);
  expect(elapsed).toBeLessThan(1000);
});
