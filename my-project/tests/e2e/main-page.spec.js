import { expect, test } from '@playwright/test';
import { albumNames, groupDates, loadEmpty, namesInGroup, seedAndLoad } from './helpers.js';

// Quickstart V-1 and V-2 (User Story 1).

test('V-1: albums are grouped by date, newest group first', async ({ page }) => {
  await seedAndLoad(page);

  expect(await groupDates(page)).toEqual(['2026-07-30', '2026-03-14', '2026-01-02']);
  expect(await namesInGroup(page, '2026-07-30')).toEqual(['Coast walk', 'Studio portraits']);
  expect(await namesInGroup(page, '2026-03-14')).toEqual(['Spring garden']);
  expect(await namesInGroup(page, '2026-01-02')).toEqual(['New year', 'Empty shelf']);
});

test('V-1: every album appears exactly once', async ({ page }) => {
  await seedAndLoad(page);
  const names = await albumNames(page);
  expect(names).toHaveLength(5);
  expect(new Set(names).size).toBe(5);
});

test('V-1: cards show name and photo count', async ({ page }) => {
  await seedAndLoad(page);
  const coast = page.locator('.album-card', { hasText: 'Coast walk' });
  await expect(coast.locator('.album-count')).toHaveText('2 photos');
});

test('US1 AC3: an empty album still appears, with a placeholder cover and zero count', async ({
  page,
}) => {
  await seedAndLoad(page);
  const empty = page.locator('.album-card', { hasText: 'Empty shelf' });
  await expect(empty).toBeVisible();
  await expect(empty.locator('.album-count')).toHaveText('0 photos');
  await expect(empty.locator('.album-cover.placeholder')).toBeVisible();
});

test('V-2: an empty collection explains how to start', async ({ page }) => {
  await loadEmpty(page);
  await expect(page.locator('.empty-state')).toBeVisible();
  await expect(page.locator('.empty-state h2')).toHaveText('No albums yet');
  await expect(page.getByRole('button', { name: 'Create your first album' })).toBeVisible();
  await expect(page.locator('.album-card')).toHaveCount(0);
});
