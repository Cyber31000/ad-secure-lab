# Phase 0 Research: Photo Album Organizer

**Date**: 2026-08-17 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

The user directive is: Vite, minimal libraries, vanilla HTML/CSS/JS as far as possible,
photos never uploaded anywhere, metadata in a local SQLite database. Every decision below
is measured against that directive first and the feature spec second.

---

## R-001: How does a browser application talk to a local SQLite database?

**Decision**: `@sqlite.org/sqlite-wasm` (the official SQLite WASM build) running in a
dedicated Web Worker, persisting through the OPFS VFS.

**Rationale**: This is the only option that keeps the SQLite requirement literal — a real
SQLite database file, real SQL — while adding exactly one runtime dependency and no
server process. The OPFS VFS gives durable storage that survives reload. Running it in a
Worker keeps query time off the main thread, which matters directly for SC-002 (100
albums / 10,000 photos usable in 2 seconds).

**Alternatives considered**:

- **`sql.js`**: mature and widely used, but it holds the database in memory and requires
  explicit export/import to persist. Every write turns into "serialize the whole database
  and save it," which does not scale to 10,000 photo rows and risks data loss on an
  unexpected close.
- **A small Node backend with `better-sqlite3`**: gives a genuine `.db` file on disk and
  the simplest possible data access code, but introduces a server process, a second
  runtime, and an HTTP layer. That is a large step away from "minimal libraries" and from
  the plain static-site shape the directive implies.
- **IndexedDB instead of SQLite**: zero dependencies, but it is not SQLite. The directive
  named SQLite specifically, and album ordering plus date grouping are relational queries
  that read far better as SQL.

**Cost**: one dependency, plus cross-origin isolation headers in the Vite dev server and
in production hosting for the OPFS synchronous access handle path.

---

## R-002: How do photos stay "not uploaded anywhere" while remaining browsable?

**Decision**: The person grants access to a photo folder through the File System Access
API. The directory handle is persisted in IndexedDB, and SQLite stores only the relative
path plus metadata. Image bytes are read from the person's own disk on demand and never
copied into application storage.

**Rationale**: This is the strongest possible reading of "not uploaded anywhere" — the
photos are not uploaded, not copied, and not duplicated. It also matches spec Assumption
that the app organizes photos rather than owning them. Persisted handles mean the folder
is chosen once, not on every launch.

**Alternatives considered**:

- **Copy image bytes into OPFS**: works in every browser and survives the folder being
  moved, but doubles disk usage for a collection in the low thousands and makes the app
  the owner of the person's photos, which the spec explicitly avoids.
- **`<input type="file">` per session**: universally supported and needs no permissions
  model, but the person must re-select files on every launch. That fails SC-001's
  two-minute first-run target and makes persisted albums nearly meaningless.

**Cost and limitation — flagged for decision**: the File System Access API is Chromium
only. Firefox and Safari do not support `showDirectoryPicker`. This plan therefore
targets Chromium-based browsers. If cross-browser support is required, the fallback is
copying bytes into OPFS, which changes the "never copied" property.

---

## R-003: Thumbnails at 10,000 photos

**Decision**: Generate thumbnails once on import using `createImageBitmap` with
`resizeWidth`, encode to WebP through `OffscreenCanvas`, and cache them in OPFS keyed by
photo id. Serve tiles from the thumbnail cache, never from full-resolution originals.

**Rationale**: SC-003 asks for a 500-photo album to render tiles in one second. Decoding
500 full-resolution originals cannot meet that; decoding 500 small WebP thumbnails
comfortably can. Generation happens in a Worker so the interface stays responsive during
import. Zero added dependencies — all four APIs are platform built-ins.

**Alternatives considered**: rendering originals scaled by CSS (simplest, but fails the
performance criteria outright at this scale); a third-party image processing library
(unnecessary, the platform already does this).

---

## R-004: Drag-and-drop reordering, keyboard-reachable

**Decision**: Implement reordering on Pointer Events, not the HTML5 drag-and-drop API. A
parallel keyboard path moves a focused album with the arrow keys while a modifier is
held, announced through an ARIA live region.

**Rationale**: FR-008 and SC-007 require every drag capability to be reachable by
keyboard and on touch. HTML5 drag-and-drop has no touch support on mobile browsers and a
drag image that is awkward to style, so meeting the spec with it would mean building a
second mechanism anyway. Pointer Events unify mouse, touch, and pen in one code path, and
`setPointerCapture` handles the drag-outside-the-window case that FR-007 requires.
Vanilla, no library.

**Alternatives considered**: `SortableJS` or `dnd-kit` — both solve this well and quickly,
but each is a dependency the directive asks us to avoid, and neither is needed once
Pointer Events are handled directly.

---

## R-005: Keeping the main page responsive at scale

**Decision**: CSS `content-visibility: auto` with `contain-intrinsic-size` on tiles and
album cards, plus an `IntersectionObserver` that loads thumbnails only as they approach
the viewport.

**Rationale**: FR-016 and SC-002 require the main page to stay responsive when the
collection exceeds one screen. `content-visibility` lets the browser skip layout and
paint for offscreen content with no virtualization code at all — the cheapest possible
answer, and pure CSS. A hand-written virtual scroller would be more code and more bugs
for the stated scale of low thousands.

**Alternatives considered**: a virtual scrolling library (dependency, and overkill below
roughly 100,000 items); rendering everything eagerly (fails at 10,000 photos).

---

## R-006: Testing approach

**Decision**: Vitest for unit tests over the ordering, grouping, and data-access logic;
Playwright for end-to-end coverage of the drag, keyboard reorder, and persistence
journeys.

**Rationale**: Constitution Principle II requires that behavior be asserted on the real
end state rather than on a process exiting cleanly. Drag-and-drop and
persist-across-reload cannot be verified honestly in a unit test — they need a real
browser driving real pointer events. Vitest shares Vite's config and transform pipeline,
so it adds no second build system. Both are development dependencies and do not ship.

**Alternatives considered**: unit tests only (cannot cover the feature's two riskiest
behaviors); no tests (violates Principle II outright).

---

## Unresolved

**U-001 — spec FR-019, manual order versus date grouping.** Still open from
`/speckit.specify`; the planning directive did not address it. This plan proceeds on the
most conservative reading: **manual order applies within a date group, and dragging an
album across date groups is refused with a visible reason**. This preserves "albums are
grouped by date" as an invariant. If the intended behavior is instead that manual order
overrides date grouping, the `position` semantics in the data model and the drop-target
logic both change, though the storage shape does not.

Spec FR-017 and FR-018 are treated as resolved by the planning directive: photos are
referenced in place and never uploaded (R-002), and the application is single-person with
no accounts, since there is no server and no identity to attach a collection to.
