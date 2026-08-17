# Phase 1 Data Model: Photo Album Organizer

**Date**: 2026-08-17 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Storage is a single local SQLite database held in OPFS (see [R-001](./research.md)). It
holds metadata only — no image bytes. Image bytes stay on the person's disk and are
reached through a persisted directory handle ([R-002](./research.md)).

## Entities

### Album

A named, flat container for photos. Never contains another album (FR-003).

| Field | Type | Rules |
|---|---|---|
| `id` | INTEGER PK | Assigned by storage |
| `name` | TEXT NOT NULL | 1–200 chars; duplicates permitted — name is not identity |
| `group_date` | TEXT NOT NULL | `YYYY-MM-DD`; the date bucket this album belongs to (FR-014) |
| `position` | INTEGER NOT NULL | Manual order within its date group; unique per `group_date` |
| `cover_photo_id` | INTEGER NULL | FK → Photo; NULL renders a placeholder cover (FR-002) |
| `created_at` | TEXT NOT NULL | ISO 8601 UTC |

There is deliberately no `parent_album_id`. Nesting is prevented by the absence of the
column, not by a validation rule — the schema makes SC-008 unfalsifiable rather than
merely tested.

**`group_date` derivation rule (FR-014)**: the earliest `taken_at` among the album's
photos. If no photo carries a date, it falls back to the album's `created_at` date. It is
recomputed when photos are added or removed. An album whose photos span several dates
therefore lands in one group by a single stated rule, satisfying the spec edge case.

### Photo

An image belonging to exactly one album.

| Field | Type | Rules |
|---|---|---|
| `id` | INTEGER PK | Assigned by storage |
| `album_id` | INTEGER NOT NULL | FK → Album, `ON DELETE CASCADE` |
| `relative_path` | TEXT NOT NULL | Path within the granted directory; unique per album |
| `filename` | TEXT NOT NULL | Display name |
| `taken_at` | TEXT NULL | ISO 8601 from image metadata; NULL when absent |
| `width`, `height` | INTEGER NULL | Source dimensions, for tile aspect handling |
| `position` | INTEGER NOT NULL | Order within the album |
| `thumbnail_key` | TEXT NULL | OPFS key for the cached thumbnail ([R-003](./research.md)) |
| `added_at` | TEXT NOT NULL | ISO 8601 UTC |

`UNIQUE(album_id, relative_path)` resolves the spec edge case about adding the same photo
twice: the second add is a no-op on that album, and it is reported rather than silently
swallowed. The same file may appear in two different albums.

### Date Group

Derived, never stored. It is the result of grouping albums by `group_date`, ordered newest
first. It has no table and no identity of its own — it exists only as a query result and a
heading on the main page.

## Relationships

```text
Album 1 ──< Photo          (album_id, ON DELETE CASCADE)
Album 0..1 ── Photo        (cover_photo_id, nullable)
DateGroup ──< Album        (derived by grouping on group_date)
```

## Invariants

- **I-1**: No album references another album. Enforced structurally (FR-003, SC-008).
- **I-2**: `(group_date, position)` is unique across albums. Reordering rewrites the
  affected positions inside one transaction, so an interrupted drag cannot leave two
  albums claiming one slot.
- **I-3**: `(album_id, position)` is unique across photos.
- **I-4**: Every photo belongs to exactly one album; moving a photo is a single
  `album_id` update, not a copy and delete (FR-012).
- **I-5**: `cover_photo_id`, when set, references a photo in the same album.
- **I-6**: Deleting an album cascades to its photo rows. It never deletes image files on
  the person's disk — the confirmation required by FR-013 must say so plainly.

## State transitions

**Album position (FR-004 – FR-007)**: `settled → dragging → (dropped | cancelled) → settled`.
A cancelled or out-of-bounds drop restores the prior position with no write. Only a valid
drop writes, and it writes in one transaction.

**Photo membership (FR-012)**: `in album A → in album B`. Both albums recompute
`group_date` and may consequently move to a different date group on the main page.

**Per [U-001](./research.md)**, `position` is scoped within a date group and cross-group
drags are refused. If FR-019 resolves the other way, `position` becomes collection-global
and `group_date` stops constraining it — a change to I-2 and to the drop-target rules, not
to the table shape.
