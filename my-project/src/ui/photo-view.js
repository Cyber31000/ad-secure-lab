/**
 * Single photo at full size, with a way back to the tile grid.
 *
 * Purpose: FR-010.
 * Preconditions: the photo belongs to the album being viewed.
 */

import { storage } from '../storage/client.js';
import { fullSizeUrl, releaseUrl, thumbnailUrl } from '../files/thumbnails.js';

let activeUrl = null;

export async function renderPhotoView(app, albumId, photoId) {
  const { album, photos } = await storage.listPhotos(albumId);
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) {
    app.showError('That photo is no longer in this album.');
    return app.openAlbum(albumId);
  }

  const view = app.view;
  view.replaceChildren();
  app.setTitle(photo.filename);
  app.setHeaderActions(headerActions(app, albumId, photos, photo));

  const section = document.createElement('section');
  section.className = 'photo-view';

  const img = document.createElement('img');
  img.alt = photo.filename;
  section.append(img);

  const caption = document.createElement('p');
  caption.className = 'album-count';
  const index = photos.indexOf(photo) + 1;
  caption.textContent = `${index} of ${photos.length} in ${album.name}`;
  section.append(caption);
  view.append(section);

  releaseUrl(activeUrl);
  activeUrl = (await fullSizeUrl(photo)) ?? (await thumbnailUrl(photo));
  if (activeUrl) img.src = activeUrl;
}

function headerActions(app, albumId, photos, photo) {
  const fragment = document.createDocumentFragment();

  const back = document.createElement('button');
  back.textContent = 'Back to album';
  back.addEventListener('click', () => app.openAlbum(albumId));
  fragment.append(back);

  const index = photos.indexOf(photo);
  const step = (delta) => {
    const next = photos[index + delta];
    if (next) app.openPhoto(albumId, next.id);
  };

  const prev = document.createElement('button');
  prev.textContent = 'Previous';
  prev.disabled = index === 0;
  prev.addEventListener('click', () => step(-1));

  const next = document.createElement('button');
  next.textContent = 'Next';
  next.disabled = index === photos.length - 1;
  next.addEventListener('click', () => step(1));

  fragment.append(' ', prev, ' ', next);
  return fragment;
}
