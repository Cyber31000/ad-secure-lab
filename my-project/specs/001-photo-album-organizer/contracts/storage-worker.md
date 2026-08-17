# Contract: Storage Worker Interface

The only boundary in this application. The main thread never touches SQLite directly; it
posts messages to a Web Worker that owns the database ([R-001](../research.md)). Every
message is a request/response pair correlated by `id`.

**Request**: `{ id: string, op: string, payload: object }`
**Response**: `{ id: string, ok: true, data: object } | { id: string, ok: false, error: { code: string, message: string } }`

Error `message` is user-presentable. Every failure names the specific thing that failed —
per Constitution Principle I, nothing fails silently.

## Operations

| `op` | Payload | Returns | Serves |
|---|---|---|---|
| `listMainPage` | `{}` | `{ groups: [{ date, albums: [{ id, name, position, coverPhotoId, photoCount }] }] }` | FR-001, FR-002 |
| `createAlbum` | `{ name }` | `{ album }` | FR-011 |
| `renameAlbum` | `{ albumId, name }` | `{ album }` | FR-013 |
| `deleteAlbum` | `{ albumId }` | `{ deletedPhotoCount }` | FR-013 |
| `reorderAlbum` | `{ albumId, targetPosition }` | `{ groups }` | FR-004, FR-005 |
| `listPhotos` | `{ albumId }` | `{ photos: [...] }` | FR-009 |
| `addPhotos` | `{ albumId, files: [{ relativePath, filename, takenAt, width, height }] }` | `{ added: [...], rejected: [{ filename, reason }] }` | FR-012, FR-015 |
| `movePhoto` | `{ photoId, targetAlbumId }` | `{ sourceAlbum, targetAlbum }` | FR-012 |
| `removePhoto` | `{ photoId }` | `{ albumId }` | FR-012 |
| `setCover` | `{ albumId, photoId }` | `{ album }` | FR-002 |

## Guarantees

1. **`reorderAlbum` is atomic.** Position rewrites happen in one transaction. A failure
   mid-write leaves the prior order intact, so FR-007's cancelled-drag restore is a
   no-write path, not a compensating write.
2. **`reorderAlbum` rejects cross-group targets** with `error.code = "CROSS_GROUP_MOVE"`
   and a message the interface shows to the person, per [U-001](../research.md). This is
   the one operation whose contract changes if FR-019 resolves the other way.
3. **`addPhotos` is partial-success by design.** Unsupported files land in `rejected` with
   a reason naming the file; the rest still commit. This is FR-015 stated as a contract
   rather than left to the caller.
4. **`deleteAlbum` returns `deletedPhotoCount`** so the confirmation dialog can state the
   consequence before the call, per FR-013. It never touches files on disk (I-6).
5. **`group_date` is recomputed by the worker**, never supplied by the caller. Any
   operation changing an album's photos may move that album to a different date group, and
   the response carries the affected groups so the main page can re-render from truth.
6. **Every write returns the affected state**, so the interface renders from the response
   rather than from an optimistic guess that could drift from the database.
