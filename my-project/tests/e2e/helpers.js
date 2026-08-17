import { threeDateCollection } from '../fixtures/seed.js';

/** Load the app, wait for storage to be live, and seed a known collection. */
export async function seedAndLoad(page, albums = threeDateCollection()) {
  await page.goto('/');
  await page.waitForFunction(() => globalThis.__storage !== undefined);
  await page.evaluate(async (data) => {
    await globalThis.__storage.seed(data);
    await globalThis.__app.showMainPage();
  }, albums);
  await page.waitForSelector('.date-group, .empty-state');
}

/** Load the app with no albums at all. */
export async function loadEmpty(page) {
  await seedAndLoad(page, []);
}

export const albumNames = (page) =>
  page.locator('.album-card .album-name').allTextContents();

export const groupDates = (page) =>
  page.locator('.date-group').evaluateAll((els) => els.map((e) => e.dataset.groupDate));

/** Names within one date group, in rendered order. */
export const namesInGroup = (page, date) =>
  page.locator(`.album-grid[data-group-date="${date}"] .album-name`).allTextContents();
