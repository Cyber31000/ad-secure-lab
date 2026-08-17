-- Photo Album Organizer — SQLite schema (local, OPFS-backed)
-- Metadata only. Image bytes never enter this database.
-- See ../data-model.md for field rules and invariants.

PRAGMA foreign_keys = ON;

CREATE TABLE album (
    id              INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    group_date      TEXT    NOT NULL CHECK (group_date LIKE '____-__-__'),
    position        INTEGER NOT NULL,
    cover_photo_id  INTEGER NULL REFERENCES photo(id) ON DELETE SET NULL,
    created_at      TEXT    NOT NULL
    -- Deliberately no parent_album_id: albums are never nested (FR-003, SC-008).
);

-- I-2: one album per slot within a date group.
CREATE UNIQUE INDEX idx_album_group_position ON album (group_date, position);
CREATE INDEX idx_album_group_date ON album (group_date DESC);

CREATE TABLE photo (
    id             INTEGER PRIMARY KEY,
    album_id       INTEGER NOT NULL REFERENCES album(id) ON DELETE CASCADE,
    relative_path  TEXT    NOT NULL,
    filename       TEXT    NOT NULL,
    taken_at       TEXT    NULL,
    width          INTEGER NULL,
    height         INTEGER NULL,
    position       INTEGER NOT NULL,
    thumbnail_key  TEXT    NULL,
    added_at       TEXT    NOT NULL
);

-- Same file may live in two albums, but not twice in one (spec edge case).
CREATE UNIQUE INDEX idx_photo_album_path ON photo (album_id, relative_path);
-- I-3: one photo per slot within an album.
CREATE UNIQUE INDEX idx_photo_album_position ON photo (album_id, position);
CREATE INDEX idx_photo_taken_at ON photo (taken_at);

-- Main page query (FR-001, FR-002): albums grouped by date, newest group first,
-- manual order preserved within each group.
CREATE VIEW album_main_page AS
SELECT
    a.id,
    a.name,
    a.group_date,
    a.position,
    a.cover_photo_id,
    (SELECT count(*) FROM photo p WHERE p.album_id = a.id) AS photo_count
FROM album a
ORDER BY a.group_date DESC, a.position ASC;
