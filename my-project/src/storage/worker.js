/**
 * Storage worker: owns the SQLite database. The only component that touches SQL.
 *
 * Purpose: implement contracts/storage-worker.md over an OPFS-backed SQLite
 * database, off the main thread.
 * Preconditions: the page is cross-origin isolated (COOP/COEP), or the OPFS
 * synchronous access handle path is unavailable.
 * Leaves behind: one SQLite database file in OPFS.
 */

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import schemaSql from './schema.sql?raw';
import { ErrorCode, fail, toErrorResponse } from './errors.js';
import {
  compactPositions,
  computeReorder,
  deriveGroupDate,
  groupByDate,
  nextPosition,
  toDateKey,
} from './ordering.js';

const DB_PATH = '/photo-albums.sqlite3';
const SUPPORTED = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;

let db = null;

/** Open the database and apply the schema on first run. */
async function open() {
  const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: console.error });
  if (sqlite3.oo1.OpfsDb) {
    db = new sqlite3.oo1.OpfsDb(DB_PATH, 'c');
  } else {
    // No OPFS (some test contexts): fall back to memory so the app still runs,
    // but say so rather than pretending persistence works.
    console.warn('OPFS unavailable — using an in-memory database; data will not persist.');
    db = new sqlite3.oo1.DB(':memory:', 'c');
  }
  db.exec(schemaSql);
}

const nowIso = () => new Date().toISOString();

function rows(sql, bind = []) {
  return db.selectObjects(sql, bind);
}

function one(sql, bind = []) {
  return rows(sql, bind)[0] ?? null;
}

/** Run `fn` inside a transaction; any throw rolls the whole thing back. */
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function requireAlbum(albumId) {
  const album = one('SELECT * FROM album WHERE id = ?', [albumId]);
  if (!album) fail(ErrorCode.ALBUM_NOT_FOUND, `No album with id ${albumId}.`);
  return album;
}

/**
 * Recompute an album's date group from its photos. Called after any change to
 * its contents — the caller never supplies group_date (contract guarantee 5).
 */
function recomputeGroupDate(albumId) {
  const album = requireAlbum(albumId);
  const takenAts = rows('SELECT taken_at FROM photo WHERE album_id = ?', [albumId]).map(
    (r) => r.taken_at,
  );
  const groupDate = deriveGroupDate(takenAts, album.created_at);
  if (groupDate === album.group_date) return album.group_date;

  const positions = rows('SELECT position FROM album WHERE group_date = ?', [groupDate]).map(
    (r) => r.position,
  );
  // Park it out of the way first: moving between groups can otherwise collide
  // with an occupied (group_date, position) slot mid-update.
  db.exec({ sql: 'UPDATE album SET position = -id WHERE id = ?', bind: [albumId] });
  db.exec({
    sql: 'UPDATE album SET group_date = ?, position = ? WHERE id = ?',
    bind: [groupDate, nextPosition(positions), albumId],
  });
  compactGroup(album.group_date);
  return groupDate;
}

/** Close gaps left in a group so positions stay contiguous (I-2). */
function compactGroup(groupDate) {
  const ids = rows('SELECT id FROM album WHERE group_date = ? ORDER BY position', [groupDate]).map(
    (r) => r.id,
  );
  // Offset first, then write final values: a direct rewrite would transiently
  // collide with the unique index.
  for (const id of ids) {
    db.exec({ sql: 'UPDATE album SET position = -id - 1000000 WHERE id = ?', bind: [id] });
  }
  for (const { id, position } of compactPositions(ids)) {
    db.exec({ sql: 'UPDATE album SET position = ? WHERE id = ?', bind: [position, id] });
  }
}

function mainPageGroups() {
  return groupByDate(rows('SELECT * FROM album_main_page')).map((group) => ({
    date: group.date,
    albums: group.albums.map((a) => ({
      id: a.id,
      name: a.name,
      position: a.position,
      coverPhotoId: a.cover_photo_id,
      photoCount: a.photo_count,
    })),
  }));
}

const ops = {
  listMainPage() {
    return { groups: mainPageGroups() };
  },

  createAlbum({ name }) {
    const trimmed = String(name ?? '').trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      fail(ErrorCode.INVALID_NAME, 'An album name must be between 1 and 200 characters.');
    }
    const createdAt = nowIso();
    const groupDate = toDateKey(createdAt);
    return transaction(() => {
      const positions = rows('SELECT position FROM album WHERE group_date = ?', [groupDate]).map(
        (r) => r.position,
      );
      db.exec({
        sql: 'INSERT INTO album (name, group_date, position, created_at) VALUES (?, ?, ?, ?)',
        bind: [trimmed, groupDate, nextPosition(positions), createdAt],
      });
      const album = one('SELECT * FROM album WHERE id = last_insert_rowid()');
      return { album };
    });
  },

  renameAlbum({ albumId, name }) {
    const trimmed = String(name ?? '').trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      fail(ErrorCode.INVALID_NAME, 'An album name must be between 1 and 200 characters.');
    }
    requireAlbum(albumId);
    db.exec({ sql: 'UPDATE album SET name = ? WHERE id = ?', bind: [trimmed, albumId] });
    return { album: one('SELECT * FROM album WHERE id = ?', [albumId]) };
  },

  deleteAlbum({ albumId }) {
    const album = requireAlbum(albumId);
    return transaction(() => {
      const { n } = one('SELECT count(*) AS n FROM photo WHERE album_id = ?', [albumId]);
      db.exec({ sql: 'DELETE FROM album WHERE id = ?', bind: [albumId] });
      compactGroup(album.group_date);
      // Photo rows cascade. Files on the person's disk are never touched (I-6).
      return { deletedPhotoCount: n, groups: mainPageGroups() };
    });
  },

  /**
   * FR-004/FR-005. Atomic (guarantee 1) and refuses cross-group targets
   * (guarantee 2) per the assumption recorded in research.md U-001.
   */
  reorderAlbum({ albumId, targetPosition, targetGroupDate }) {
    const album = requireAlbum(albumId);
    if (targetGroupDate && targetGroupDate !== album.group_date) {
      fail(
        ErrorCode.CROSS_GROUP_MOVE,
        `Albums stay in their date group. "${album.name}" belongs to ${album.group_date}; ` +
          `move it by changing its photos, not by dragging it to ${targetGroupDate}.`,
      );
    }
    return transaction(() => {
      const ids = rows('SELECT id FROM album WHERE group_date = ? ORDER BY position', [
        album.group_date,
      ]).map((r) => r.id);
      const next = computeReorder(ids, albumId, targetPosition);
      for (const { id } of next) {
        db.exec({ sql: 'UPDATE album SET position = -id - 1000000 WHERE id = ?', bind: [id] });
      }
      for (const { id, position } of next) {
        db.exec({ sql: 'UPDATE album SET position = ? WHERE id = ?', bind: [position, id] });
      }
      return { groups: mainPageGroups() };
    });
  },

  listPhotos({ albumId }) {
    requireAlbum(albumId);
    const photos = rows('SELECT * FROM photo WHERE album_id = ? ORDER BY position', [albumId]);
    return { album: requireAlbum(albumId), photos };
  },

  /** FR-015: partial success by design (guarantee 3). */
  addPhotos({ albumId, files }) {
    requireAlbum(albumId);
    const added = [];
    const rejected = [];
    const addedAt = nowIso();

    transaction(() => {
      let position = nextPosition(
        rows('SELECT position FROM photo WHERE album_id = ?', [albumId]).map((r) => r.position),
      );
      for (const file of files ?? []) {
        if (!SUPPORTED.test(file.filename ?? '')) {
          rejected.push({ filename: file.filename, reason: 'Not a supported image format.' });
          continue;
        }
        const clash = one('SELECT id FROM photo WHERE album_id = ? AND relative_path = ?', [
          albumId,
          file.relativePath,
        ]);
        if (clash) {
          rejected.push({ filename: file.filename, reason: 'Already in this album.' });
          continue;
        }
        db.exec({
          sql: `INSERT INTO photo (album_id, relative_path, filename, taken_at, width, height, position, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          bind: [
            albumId,
            file.relativePath,
            file.filename,
            file.takenAt ?? null,
            file.width ?? null,
            file.height ?? null,
            position++,
            addedAt,
          ],
        });
        added.push(one('SELECT * FROM photo WHERE id = last_insert_rowid()'));
      }
      // First photo added becomes the cover unless one is already set.
      const album = requireAlbum(albumId);
      if (!album.cover_photo_id && added.length > 0) {
        db.exec({
          sql: 'UPDATE album SET cover_photo_id = ? WHERE id = ?',
          bind: [added[0].id, albumId],
        });
      }
      recomputeGroupDate(albumId);
    });

    return { added, rejected, groups: mainPageGroups() };
  },

  /** FR-012 / I-4: a move is one album_id update, never a copy and delete. */
  movePhoto({ photoId, targetAlbumId }) {
    const photo = one('SELECT * FROM photo WHERE id = ?', [photoId]);
    if (!photo) fail(ErrorCode.PHOTO_NOT_FOUND, `No photo with id ${photoId}.`);
    requireAlbum(targetAlbumId);
    if (photo.album_id === targetAlbumId) {
      return { sourceAlbumId: photo.album_id, targetAlbumId, groups: mainPageGroups() };
    }
    const clash = one('SELECT id FROM photo WHERE album_id = ? AND relative_path = ?', [
      targetAlbumId,
      photo.relative_path,
    ]);
    if (clash) {
      fail(ErrorCode.DUPLICATE_PHOTO, `"${photo.filename}" is already in the destination album.`);
    }
    const sourceAlbumId = photo.album_id;
    transaction(() => {
      const position = nextPosition(
        rows('SELECT position FROM photo WHERE album_id = ?', [targetAlbumId]).map(
          (r) => r.position,
        ),
      );
      db.exec({
        sql: 'UPDATE photo SET album_id = ?, position = ? WHERE id = ?',
        bind: [targetAlbumId, position, photoId],
      });
      clearCoverIfGone(sourceAlbumId, photoId);
      recomputeGroupDate(sourceAlbumId);
      recomputeGroupDate(targetAlbumId);
    });
    return { sourceAlbumId, targetAlbumId, groups: mainPageGroups() };
  },

  removePhoto({ photoId }) {
    const photo = one('SELECT * FROM photo WHERE id = ?', [photoId]);
    if (!photo) fail(ErrorCode.PHOTO_NOT_FOUND, `No photo with id ${photoId}.`);
    transaction(() => {
      db.exec({ sql: 'DELETE FROM photo WHERE id = ?', bind: [photoId] });
      clearCoverIfGone(photo.album_id, photoId);
      recomputeGroupDate(photo.album_id);
    });
    return { albumId: photo.album_id, groups: mainPageGroups() };
  },

  setCover({ albumId, photoId }) {
    requireAlbum(albumId);
    const photo = one('SELECT * FROM photo WHERE id = ? AND album_id = ?', [photoId, albumId]);
    if (!photo) {
      fail(ErrorCode.COVER_NOT_IN_ALBUM, 'A cover photo must belong to the album it covers.');
    }
    db.exec({ sql: 'UPDATE album SET cover_photo_id = ? WHERE id = ?', bind: [photoId, albumId] });
    return { album: requireAlbum(albumId) };
  },

  /** Test-only seeding, used by tests/fixtures/seed.js (task T013). */
  __seed({ albums }) {
    transaction(() => {
      db.exec('DELETE FROM photo');
      db.exec('DELETE FROM album');
      for (const album of albums) {
        db.exec({
          sql: 'INSERT INTO album (name, group_date, position, created_at) VALUES (?, ?, ?, ?)',
          bind: [album.name, album.groupDate, album.position, album.createdAt ?? nowIso()],
        });
        const { id } = one('SELECT last_insert_rowid() AS id');
        let position = 0;
        for (const photo of album.photos ?? []) {
          db.exec({
            sql: `INSERT INTO photo (album_id, relative_path, filename, taken_at, width, height, position, added_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            bind: [
              id,
              photo.relativePath,
              photo.filename,
              photo.takenAt ?? null,
              photo.width ?? null,
              photo.height ?? null,
              position++,
              nowIso(),
            ],
          });
          if (position === 1) {
            db.exec({
              sql: 'UPDATE album SET cover_photo_id = last_insert_rowid() WHERE id = ?',
              bind: [id],
            });
          }
        }
      }
    });
    return { groups: mainPageGroups() };
  },
};

function clearCoverIfGone(albumId, photoId) {
  const album = one('SELECT * FROM album WHERE id = ?', [albumId]);
  if (!album || album.cover_photo_id !== photoId) return;
  const replacement = one('SELECT id FROM photo WHERE album_id = ? ORDER BY position LIMIT 1', [
    albumId,
  ]);
  db.exec({
    sql: 'UPDATE album SET cover_photo_id = ? WHERE id = ?',
    bind: [replacement?.id ?? null, albumId],
  });
}

self.addEventListener('message', async (event) => {
  const { id, op, payload } = event.data ?? {};
  try {
    if (!db) await open();
    const handler = ops[op];
    if (!handler) fail(ErrorCode.UNKNOWN_OP, `Unknown storage operation "${op}".`);
    self.postMessage({ id, ok: true, data: handler(payload ?? {}) });
  } catch (error) {
    self.postMessage(toErrorResponse(id, error));
  }
});

// Readiness handshake, not a timer (Constitution Principle IV).
open().then(
  () => self.postMessage({ type: 'ready' }),
  (error) => self.postMessage({ type: 'ready', error: String(error?.message ?? error) }),
);
