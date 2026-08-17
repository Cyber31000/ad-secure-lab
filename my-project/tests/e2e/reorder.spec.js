import { expect, test } from '@playwright/test';
import { namesInGroup, seedAndLoad } from './helpers.js';

// Quickstart V-4 to V-7 (User Story 3).

const JULY = '2026-07-30';

/**
 * Press-move-release with intermediate moves, so the drag threshold is crossed.
 * `side` picks which half of the target to hover: 'before' inserts ahead of it,
 * 'after' inserts past it.
 */
async function dragCardOnto(page, sourceText, targetText, side = 'before') {
  const source = page.locator('.album-card', { hasText: sourceText });
  const target = page.locator('.album-card', { hasText: targetText });
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  const x = side === 'after' ? to.x + to.width - 6 : to.x + 6;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 3 });
  await page.mouse.move(x, to.y + to.height / 2, { steps: 8 });
  return { to };
}

test('V-4: dragging reorders within a date group and survives a reload', async ({ page }) => {
  await seedAndLoad(page);
  expect(await namesInGroup(page, JULY)).toEqual(['Coast walk', 'Studio portraits']);

  await dragCardOnto(page, 'Coast walk', 'Studio portraits', 'after');
  await page.mouse.up();

  await expect
    .poll(() => namesInGroup(page, JULY))
    .toEqual(['Studio portraits', 'Coast walk']);

  // The arrangement is in the database, not just the DOM.
  await page.reload();
  await page.waitForSelector('.date-group');
  expect(await namesInGroup(page, JULY)).toEqual(['Studio portraits', 'Coast walk']);
});

test('V-4: a drop indicator shows where the album will land', async ({ page }) => {
  await seedAndLoad(page);
  await dragCardOnto(page, 'Coast walk', 'Studio portraits');
  await expect(page.locator('.drop-indicator')).toHaveCount(1);
  await page.mouse.up();
});

test('V-5: Escape cancels the drag and writes nothing', async ({ page }) => {
  await seedAndLoad(page);
  const before = await namesInGroup(page, JULY);

  await dragCardOnto(page, 'Coast walk', 'Studio portraits');
  await page.keyboard.press('Escape');
  await page.mouse.up();

  expect(await namesInGroup(page, JULY)).toEqual(before);
  await page.reload();
  await page.waitForSelector('.date-group');
  expect(await namesInGroup(page, JULY)).toEqual(before);
});

test('V-6: dragging across date groups is refused with a visible reason', async ({ page }) => {
  await seedAndLoad(page);
  const julyBefore = await namesInGroup(page, JULY);
  const marchBefore = await namesInGroup(page, '2026-03-14');

  // Drag a July album onto the March group.
  await dragCardOnto(page, 'Coast walk', 'Spring garden');
  // No indicator is offered outside the source group.
  await expect(page.locator('.drop-indicator')).toHaveCount(0);
  await page.mouse.up();

  // Nothing moved, in either group.
  expect(await namesInGroup(page, JULY)).toEqual(julyBefore);
  expect(await namesInGroup(page, '2026-03-14')).toEqual(marchBefore);
  // And the refusal was announced rather than silently snapping back.
  await expect(page.locator('#live-region')).toHaveText('Move cancelled.');
});

test('V-6: the storage layer refuses a cross-group move by contract', async ({ page }) => {
  await seedAndLoad(page);
  const result = await page.evaluate(async () => {
    const { groups } = await globalThis.__storage.listMainPage();
    const july = groups.find((g) => g.date === '2026-07-30');
    try {
      await globalThis.__storage.reorderAlbum(july.albums[0].id, 0, '2026-03-14');
      return { threw: false };
    } catch (error) {
      return { threw: true, code: error.code, message: error.message };
    }
  });
  expect(result.threw).toBe(true);
  expect(result.code).toBe('CROSS_GROUP_MOVE');
  expect(result.message).toContain('date group');
});

test('V-7: an album can be moved by keyboard alone, and it persists', async ({ page }) => {
  await seedAndLoad(page);
  expect(await namesInGroup(page, JULY)).toEqual(['Coast walk', 'Studio portraits']);

  await page.locator('.album-card', { hasText: 'Coast walk' }).focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#live-region')).toContainText('Grabbed Coast walk');

  await page.keyboard.press('ArrowRight');
  await expect.poll(() => namesInGroup(page, JULY)).toEqual(['Studio portraits', 'Coast walk']);
  await expect(page.locator('#live-region')).toContainText('Moved Coast walk to position 2');

  await page.reload();
  await page.waitForSelector('.date-group');
  expect(await namesInGroup(page, JULY)).toEqual(['Studio portraits', 'Coast walk']);
});

test('V-7: keyboard movement stops at the edge of the date group', async ({ page }) => {
  await seedAndLoad(page);
  await page.locator('.album-card', { hasText: 'Coast walk' }).focus();
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#live-region')).toHaveText('Already at the edge of this date group.');
  expect(await namesInGroup(page, JULY)).toEqual(['Coast walk', 'Studio portraits']);
});
