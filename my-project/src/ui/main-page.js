/**
 * Main page: date groups, album cards, empty state, import and delete flows.
 *
 * Purpose: FR-001, FR-002, FR-011, FR-013, FR-015.
 * Preconditions: storage worker is ready.
 */

import { storage } from '../storage/client.js';
import { thumbnailUrl } from '../files/thumbnails.js';
import { grantDirectory, getDirectory, isSupported, walkImages } from '../files/directory.js';
import { attachReorder } from './reorder.js';

const SUPPORTED = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dateFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

function albumCard(album, onOpen) {
  const li = document.createElement('li');
  li.className = 'album-card';
  li.dataset.albumId = String(album.id);
  li.dataset.albumName = album.name;
  li.tabIndex = 0;
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `${album.name}, ${album.photoCount} photos`);

  const cover = document.createElement('div');
  cover.className = 'album-cover placeholder';
  cover.textContent = album.photoCount === 0 ? 'No photos yet' : '';
  li.append(cover);

  const meta = document.createElement('div');
  meta.className = 'album-meta';
  const name = document.createElement('span');
  name.className = 'album-name';
  name.textContent = album.name;
  const count = document.createElement('span');
  count.className = 'album-count';
  count.textContent = `${album.photoCount} ${album.photoCount === 1 ? 'photo' : 'photos'}`;
  meta.append(name, count);
  li.append(meta);

  li.addEventListener('dblclick', () => onOpen(album.id));
  li.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) onOpen(album.id);
  });

  if (album.coverPhotoId) loadCover(li, cover, album.coverPhotoId, album.id);
  return li;
}

async function loadCover(card, coverEl, coverPhotoId, albumId) {
  try {
    const { photos } = await storage.listPhotos(albumId);
    const photo = photos.find((p) => p.id === coverPhotoId) ?? photos[0];
    if (!photo) return;
    const url = await thumbnailUrl(photo);
    if (!url || !card.isConnected) return;
    const img = document.createElement('img');
    img.className = 'album-cover';
    img.alt = '';
    img.src = url;
    coverEl.replaceWith(img);
  } catch {
    // A missing cover degrades to the placeholder; it is not worth an error banner.
  }
}

function emptyState(onCreate, onGrant) {
  const section = document.createElement('section');
  section.className = 'empty-state';
  section.innerHTML = `
    <h2>No albums yet</h2>
    <p>Albums group your photos by the date they were taken. Create your first one,
       then add photos from a folder on this computer — nothing is uploaded anywhere.</p>
  `;
  const create = document.createElement('button');
  create.className = 'primary';
  create.textContent = 'Create your first album';
  create.addEventListener('click', onCreate);
  section.append(create);

  if (isSupported()) {
    const grant = document.createElement('button');
    grant.textContent = 'Choose your photo folder';
    grant.addEventListener('click', onGrant);
    section.append(' ', grant);
  }
  return section;
}

export async function renderMainPage(app) {
  const { groups } = await storage.listMainPage();
  const view = app.view;
  view.replaceChildren();
  app.setTitle('Albums');
  app.setHeaderActions(headerActions(app));

  if (groups.length === 0) {
    view.append(emptyState(() => createAlbum(app), () => chooseFolder(app)));
    return;
  }

  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'date-group';
    section.dataset.groupDate = group.date;

    const heading = document.createElement('h2');
    heading.textContent = formatDate(group.date);
    section.append(heading);

    const list = document.createElement('ul');
    list.className = 'album-grid';
    list.setAttribute('role', 'list');
    list.dataset.groupDate = group.date;
    for (const album of group.albums) {
      list.append(albumCard(album, (id) => app.openAlbum(id)));
    }
    section.append(list);
    view.append(section);
  }

  attachReorder(view, app);
}

function headerActions(app) {
  const fragment = document.createDocumentFragment();

  const create = document.createElement('button');
  create.className = 'primary';
  create.textContent = 'New album';
  create.addEventListener('click', () => createAlbum(app));
  fragment.append(create);

  if (isSupported()) {
    const folder = document.createElement('button');
    folder.textContent = 'Photo folder';
    folder.addEventListener('click', () => chooseFolder(app));
    fragment.append(' ', folder);
  }
  return fragment;
}

async function createAlbum(app) {
  const name = prompt('Name for the new album:');
  if (name === null) return;
  try {
    await storage.createAlbum(name);
    await app.showMainPage();
  } catch (error) {
    app.showError(error.message);
  }
}

async function chooseFolder(app) {
  try {
    await grantDirectory();
    app.announce('Photo folder connected.');
    await app.showMainPage();
  } catch (error) {
    app.showError(error.message);
  }
}

/**
 * Import every supported image under the granted folder into an album.
 * FR-015: unsupported files are reported by name and the rest still commit.
 */
export async function importFolderInto(app, albumId) {
  const root = (await getDirectory({ prompt: true })) ?? (await grantDirectory());
  const files = [];
  const rejectedLocally = [];
  for await (const entry of walkImages(root)) {
    if (!SUPPORTED.test(entry.filename)) {
      rejectedLocally.push({ filename: entry.filename, reason: 'Not a supported image format.' });
      continue;
    }
    const file = await entry.handle.getFile();
    files.push({
      relativePath: entry.relativePath,
      filename: entry.filename,
      takenAt: new Date(file.lastModified).toISOString(),
    });
  }

  const { added, rejected } = await storage.addPhotos(albumId, files);
  const allRejected = [...rejectedLocally, ...rejected];
  if (allRejected.length > 0) {
    app.showError(
      `Added ${added.length} photos. Skipped: ` +
        allRejected.map((r) => `${r.filename} (${r.reason})`).join(', '),
    );
  } else {
    app.announce(`Added ${added.length} photos.`);
  }
  return added.length;
}

/** FR-013: state the consequence before deleting, and that files are untouched. */
export async function confirmDeleteAlbum(app, albumId, albumName, photoCount) {
  const message =
    `Delete the album "${albumName}"?\n\n` +
    `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} will be removed from this album.\n` +
    `The image files on your computer are not deleted.`;
  if (!confirm(message)) return false;
  try {
    await storage.deleteAlbum(albumId);
    app.announce(`Deleted "${albumName}".`);
    await app.showMainPage();
    return true;
  } catch (error) {
    app.showError(error.message);
    return false;
  }
}
