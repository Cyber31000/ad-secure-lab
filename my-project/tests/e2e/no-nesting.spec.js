import { expect, test } from '@playwright/test';
import { seedAndLoad } from './helpers.js';

// Quickstart V-9 / SC-008: no sequence of actions produces a nested album.

test('V-9: dropping one album onto another reorders, never nests', async ({ page }) => {
  await seedAndLoad(page);

  const source = page.locator('.album-card', { hasText: 'Coast walk' });
  const target = page.locator('.album-card', { hasText: 'Studio portraits' });
  const from = await source.boundingBox();
  const to = await target.boundingBox();

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y + 20, { steps: 3 });
  // Straight into the middle of the other card — the most plausible "nest" gesture.
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();

  // Both albums remain top-level siblings.
  await expect(page.locator('.album-card')).toHaveCount(5);
  const nested = await page.locator('.album-card .album-card').count();
  expect(nested).toBe(0);
});

test('V-9: the schema has no column that could express nesting', async ({ page }) => {
  await seedAndLoad(page);
  const columns = await page.evaluate(async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const album = groups[0].albums[0];
    return Object.keys(album);
  });
  expect(columns.some((c) => /parent|nested|child/i.test(c))).toBe(false);
});

test('V-9: every album belongs to exactly one date group', async ({ page }) => {
  await seedAndLoad(page);
  const { total, unique } = await page.evaluate(async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const ids = groups.flatMap((g) => g.albums.map((a) => a.id));
    return { total: ids.length, unique: new Set(ids).size };
  });
  expect(total).toBe(5);
  expect(unique).toBe(total);
});
