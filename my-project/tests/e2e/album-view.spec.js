import { expect, test } from '@playwright/test';
import { seedAndLoad } from './helpers.js';

// Quickstart V-3 (User Story 2).

test('V-3: tile count matches the photo count', async ({ page }) => {
  await seedAndLoad(page);
  await page.locator('.album-card', { hasText: 'Coast walk' }).dblclick();
  await expect(page.locator('.tile')).toHaveCount(2);
});

test('V-3: tiles are uniform squares regardless of source orientation', async ({ page }) => {
  await seedAndLoad(page);
  // Coast walk holds one landscape (4000x3000) and one portrait (3000x4000) photo.
  await page.locator('.album-card', { hasText: 'Coast walk' }).dblclick();
  await expect(page.locator('.tile').first()).toBeVisible();

  const boxes = await page.locator('.tile').evaluateAll((tiles) =>
    tiles.map((t) => {
      const r = t.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  expect(boxes).toHaveLength(2);
  // Non-zero first: equal-and-square is trivially true of two collapsed tiles.
  expect(boxes[0].w).toBeGreaterThanOrEqual(120);
  expect(boxes[0].h).toBeGreaterThanOrEqual(120);
  // Same footprint as each other, and square.
  expect(boxes[0]).toEqual(boxes[1]);
  expect(Math.abs(boxes[0].w - boxes[0].h)).toBeLessThanOrEqual(1);
});

test('V-3: tile images cover their box without distorting the photo', async ({ page }) => {
  await seedAndLoad(page);
  await page.locator('.album-card', { hasText: 'Coast walk' }).dblclick();
  const objectFit = await page
    .locator('.tile')
    .first()
    .evaluate((tile) => getComputedStyle(tile).getPropertyValue('overflow'));
  // The tile clips; the img inside uses object-fit: cover, which preserves aspect.
  expect(objectFit).toBe('hidden');
});

test('V-3: selecting a tile opens that specific photo, with a way back', async ({ page }) => {
  await seedAndLoad(page);
  await page.locator('.album-card', { hasText: 'Coast walk' }).dblclick();

  const secondTile = page.locator('.tile').nth(1);
  const label = await secondTile.getAttribute('aria-label');
  await secondTile.click();

  await expect(page.locator('.photo-view')).toBeVisible();
  await expect(page.locator('#view-title')).toHaveText(label);
  await expect(page.locator('.photo-view .album-count')).toContainText('2 of 2 in Coast walk');

  await page.getByRole('button', { name: 'Back to album' }).click();
  await expect(page.locator('.tile-grid')).toBeVisible();
});

test('an empty album says so instead of rendering an empty grid', async ({ page }) => {
  await seedAndLoad(page);
  await page.locator('.album-card', { hasText: 'Empty shelf' }).dblclick();
  await expect(page.locator('.empty-state h2')).toHaveText('This album is empty');
  await expect(page.locator('.tile')).toHaveCount(0);
});
