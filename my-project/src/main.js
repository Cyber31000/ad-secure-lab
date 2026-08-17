/**
 * Application shell: view switching, error surface, live-region announcements.
 *
 * Purpose: the single entry point. Owns nothing but navigation and the three
 * shared surfaces every view uses.
 * Preconditions: the DOM from index.html is present.
 */

import { storage } from './storage/client.js';
import { renderMainPage } from './ui/main-page.js';
import { renderAlbumView } from './ui/album-view.js';
import { renderPhotoView } from './ui/photo-view.js';

const view = document.getElementById('view');
const title = document.getElementById('view-title');
const headerActions = document.getElementById('header-actions');
const errorBanner = document.getElementById('error-banner');
const liveRegion = document.getElementById('live-region');

let errorTimer = null;

export const app = {
  view,

  setTitle(text) {
    title.textContent = text;
    document.title = `${text} — Photo Album Organizer`;
  },

  setHeaderActions(node) {
    headerActions.replaceChildren(node ?? document.createDocumentFragment());
  },

  /** Failures are shown, never swallowed (Constitution Principle I). */
  showError(message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => {
      errorBanner.hidden = true;
    }, 8000);
  },

  clearError() {
    errorBanner.hidden = true;
  },

  announce(message) {
    liveRegion.textContent = message;
  },

  async showMainPage() {
    this.clearError();
    await renderMainPage(this);
  },

  async openAlbum(albumId) {
    this.clearError();
    await renderAlbumView(this, albumId);
  },

  async openPhoto(albumId, photoId) {
    this.clearError();
    await renderPhotoView(this, albumId, photoId);
  },
};

// Exposed for end-to-end tests to seed a known collection (tasks.md T013).
globalThis.__app = app;
globalThis.__storage = storage;

app.showMainPage().catch((error) => {
  app.showError(
    `Storage could not start: ${error.message}. ` +
      'This application needs a Chromium-based browser with cross-origin isolation enabled.',
  );
});
