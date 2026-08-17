/**
 * Album view: uniform tile grid.
 *
 * Purpose: FR-009, FR-010, SC-003. Tiles are square and load lazily as they
 * approach the viewport (research.md R-005).
 * Preconditions: storage worker ready; album exists.
 */

import { storage } from '../storage/client.js';
import { thumbnailUrl } from '../files/thumbnails.js';
import { confirmDeleteAlbum, importFolderInto } from './main-page.js';

let observer = null;

function ensureObserver() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        hydrateTile(entry.target);
      }
    },
    { rootMargin: '400px' },
  );
  return observer;
}

async function hydrateTile(tile) {
  const photo = JSON.parse(tile.dataset.photo);
  const url = await thumbnailUrl(photo);
  if (!url || !tile.isConnected) return;
  const img = document.createElement('img');
  img.alt = photo.filename;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.src = url;
  tile.replaceChildren(img);
}

export async function renderAlbumView(app, albumId) {
  const { album, photos } = await storage.listPhotos(albumId);
  const view = app.view;
  view.replaceChildren();
  app.setTitle(album.name);
  app.setHeaderActions(headerActions(app, album, photos.length));

  if (photos.length === 0) {
    const empty = document.createElement('section');
    empty.className = 'empty-state';
    empty.innerHTML = `<h2>This album is empty</h2><p>Add photos from your folder to see them here.</p>`;
    view.append(empty);
    return;
  }

  const grid = document.createElement('ul');
  grid.className = 'tile-grid';
  grid.setAttribute('role', 'list');
  const io = ensureObserver();

  for (const photo of photos) {
    const li = document.createElement('li');
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.dataset.photoId = String(photo.id);
    tile.dataset.photo = JSON.stringify({
      id: photo.id,
      relative_path: photo.relative_path,
      filename: photo.filename,
    });
    tile.setAttribute('aria-label', photo.filename);
    tile.addEventListener('click', () => app.openPhoto(albumId, photo.id));
    li.append(tile);
    grid.append(li);
    io.observe(tile);
  }
  view.append(grid);
}

function headerActions(app, album, photoCount) {
  const fragment = document.createDocumentFragment();

  const back = document.createElement('button');
  back.textContent = 'All albums';
  back.addEventListener('click', () => app.showMainPage());

  const add = document.createElement('button');
  add.className = 'primary';
  add.textContent = 'Add photos';
  add.addEventListener('click', async () => {
    try {
      await importFolderInto(app, album.id);
      await app.openAlbum(album.id);
    } catch (error) {
      app.showError(error.message);
    }
  });

  const remove = document.createElement('button');
  remove.className = 'danger';
  remove.textContent = 'Delete album';
  remove.addEventListener('click', () =>
    confirmDeleteAlbum(app, album.id, album.name, photoCount),
  );

  fragment.append(back, ' ', add, ' ', remove);
  return fragment;
}
