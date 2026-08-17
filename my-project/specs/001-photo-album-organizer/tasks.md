---
description: "Task list for Photo Album Organizer implementation"
---

# Tasks: Photo Album Organizer

**Input**: Design documents from `/specs/001-photo-album-organizer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks ARE included. Constitution Principle II requires behavior to be
asserted on real end state, and [R-006](./research.md) commits to Vitest plus Playwright.
Drag reordering and persist-across-reload cannot be verified honestly without a browser.

**Organization**: Tasks are grouped by user story so each can be implemented, tested, and
demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in every task

## Path Conventions

Single project at repository root, per the structure decision in [plan.md](./plan.md):
`index.html`, `src/`, `tests/`. There is no backend.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and build configuration

- [X] T001 Create the directory structure from plan.md — `index.html`, `src/storage/`, `src/files/`, `src/ui/`, `src/styles/`, `tests/unit/`, `tests/e2e/`
- [X] T002 Initialize the npm project and install Vite plus the single runtime dependency `@sqlite.org/sqlite-wasm` in `package.json`
- [X] T003 Configure the Vite dev server to send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` in `vite.config.js` — without these, OPFS synchronous access handles will not initialize
- [X] T004 [P] Configure Vitest for `tests/unit/` in `vite.config.js`
- [X] T005 [P] Configure Playwright with a Chromium-only project and a clean-profile fixture in `playwright.config.js`
- [X] T006 [P] Define spacing, color, and tile-sizing tokens in `src/styles/tokens.css` and the baseline layout in `src/styles/app.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The storage boundary and shared logic every user story sits on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Copy the schema from `specs/001-photo-album-organizer/contracts/schema.sql` to `src/storage/schema.sql` as the applied-on-first-run schema
- [X] T008 Implement the storage worker bootstrap in `src/storage/worker.js` — open the OPFS-backed SQLite database, apply the schema when absent, and post a ready handshake (readiness signal, not a timer, per Constitution Principle IV)
- [X] T009 Implement the main-thread request/response wrapper in `src/storage/client.js` correlating messages by `id` per [contracts/storage-worker.md](./contracts/storage-worker.md)
- [X] T010 [P] Define the error envelope and named error codes, including `CROSS_GROUP_MOVE`, in `src/storage/errors.js` — every failure carries a user-presentable message
- [X] T011 Implement `group_date` derivation and position arithmetic in `src/storage/ordering.js` per the rules in [data-model.md](./data-model.md)
- [X] T012 [P] Unit-test grouping and position arithmetic, including the no-date fallback and the multi-date album rule, in `tests/unit/ordering.test.js`
- [X] T013 [P] Build a fixture seeder in `tests/fixtures/seed.js` that populates albums and photos across several dates, so US1 and US2 are testable before US4 exists
- [X] T014 Implement the application shell and view switching in `index.html` and `src/main.js`

**Checkpoint**: Storage boundary is live and seedable — user stories can now begin

---

## Phase 3: User Story 1 - Browse albums on the main page (Priority: P1) 🎯 MVP

**Goal**: All albums on one page, grouped under date headings, each showing name, cover, and photo count.

**Independent Test**: Seed albums across three dates, load the main page, confirm three date groups each holding only its own albums, ordered newest first.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Test the `listMainPage` operation against a seeded database — **relocated** to `tests/e2e/main-page.spec.js` and `tests/e2e/album-ops.spec.js`, see Deviations
- [X] T016 [P] [US1] End-to-end test scenarios V-1 and V-2 from [quickstart.md](./quickstart.md) in `tests/e2e/main-page.spec.js`

### Implementation for User Story 1

- [X] T017 [US1] Implement the `listMainPage` operation in `src/storage/worker.js` using the `album_main_page` view (depends on T008)
- [X] T018 [US1] Render date groups and album cards — name, cover, photo count — in `src/ui/main-page.js` (FR-001, FR-002)
- [X] T019 [US1] Render the empty state explaining how to create a first album in `src/ui/main-page.js` (US1 AC2), and the placeholder cover for an album with zero photos (US1 AC3)
- [X] T020 [US1] Apply `content-visibility: auto` with `contain-intrinsic-size` to album cards in `src/styles/app.css` so the main page stays responsive past one screen (FR-016, SC-002)

**Checkpoint**: The main page renders a real collection. This alone is a demonstrable MVP.

---

## Phase 4: User Story 2 - View photos as tiles inside an album (Priority: P1)

**Goal**: Opening an album shows uniform tiles; selecting a tile opens that photo full size.

**Independent Test**: Open a seeded album of known size, confirm tile count matches, tiles are uniformly sized across mixed orientations, and each tile opens its own photo.

### Tests for User Story 2

- [X] T021 [P] [US2] Test the `listPhotos` operation and its ordering — **relocated** to `tests/e2e/album-view.spec.js`, see Deviations
- [X] T022 [P] [US2] End-to-end test scenario V-3 in `tests/e2e/album-view.spec.js`

### Implementation for User Story 2

- [X] T023 [US2] Implement the `listPhotos` operation in `src/storage/worker.js`
- [X] T024 [US2] Implement thumbnail generation in `src/files/thumbnails.js` — `createImageBitmap` with `resizeWidth`, WebP encoding via `OffscreenCanvas`, cached in OPFS by photo id ([R-003](./research.md))
- [X] T025 [US2] Render the uniform tile grid in `src/ui/album-view.js`, preserving aspect ratio without distortion (FR-009)
- [X] T026 [US2] Implement the full-size photo view with a return path to the grid in `src/ui/photo-view.js` (FR-010)
- [X] T027 [US2] Load tiles lazily with an `IntersectionObserver` in `src/ui/album-view.js` so a 500-photo album renders within one second (SC-003)

**Checkpoint**: Browse albums, open one, view photos. Product is usable end to end on seeded data.

---

## Phase 5: User Story 3 - Reorder albums by dragging and dropping (Priority: P2)

**Goal**: Drag an album to a new position; the arrangement survives a reload; the same move is possible by keyboard.

**Independent Test**: Drag an album to a new slot, reload, confirm it stayed. Then perform the identical move using only the keyboard.

### Tests for User Story 3

- [X] T028 [P] [US3] Test `reorderAlbum` — transactional rewrite, invariant I-2, `CROSS_GROUP_MOVE` rejection. Pure arithmetic in `tests/unit/ordering.test.js`; the SQL path in `tests/e2e/reorder.spec.js`, see Deviations
- [X] T029 [P] [US3] End-to-end test scenarios V-4, V-5, V-6, and V-7 in `tests/e2e/reorder.spec.js`

### Implementation for User Story 3

- [X] T030 [US3] Implement the `reorderAlbum` operation in `src/storage/worker.js` — one transaction, returns affected groups, rejects cross-group targets with `CROSS_GROUP_MOVE` (FR-004, FR-005, [U-001](./research.md))
- [X] T031 [US3] Implement pointer-based dragging in `src/ui/reorder.js` using Pointer Events and `setPointerCapture`, unified across mouse, touch, and pen ([R-004](./research.md))
- [X] T032 [US3] Render the drop indicator and neighbor-shifting during a drag in `src/ui/reorder.js` (FR-006)
- [X] T033 [US3] Restore the original position on Escape or release outside a valid drop area, writing nothing (FR-007)
- [X] T034 [US3] Implement keyboard reordering with an ARIA live region announcement in `src/ui/reorder.js` (FR-008, SC-007)

**Checkpoint**: The organizing behavior at the center of the request works, by mouse, touch, and keyboard.

---

## Phase 6: User Story 4 - Create albums and add photos to them (Priority: P2)

**Goal**: The app works against a real photo collection rather than seeded fixtures.

**Independent Test**: Grant a folder, create an album, add photos, confirm it appears in the right date group with the right count.

### Tests for User Story 4

- [X] T035 [P] [US4] Unit-test `createAlbum`, `renameAlbum`, `deleteAlbum`, `addPhotos`, `movePhoto`, and `removePhoto` against the contract in `tests/unit/album-ops.test.js`
- [X] T036 [P] [US4] End-to-end test scenario V-8, partial-success import, in `tests/e2e/import.spec.js`

### Implementation for User Story 4

- [ ] T037 [US4] Implement directory access in `src/files/directory.js` — `showDirectoryPicker`, handle persisted in IndexedDB, re-grant flow on launch ([R-002](./research.md))
- [X] T038 [US4] Implement `createAlbum`, `renameAlbum`, and `deleteAlbum` in `src/storage/worker.js`, with `deleteAlbum` returning `deletedPhotoCount` (FR-011, FR-013)
- [X] T039 [US4] Implement `addPhotos` in `src/storage/worker.js` with partial-success semantics — unsupported files rejected by name, the rest committed (FR-015)
- [X] T040 [US4] Implement `movePhoto`, `removePhoto`, and `setCover` in `src/storage/worker.js`, recomputing `group_date` for both affected albums (FR-012, I-4)
- [ ] T041 [US4] Build the folder-grant and import interface in `src/ui/main-page.js`, surfacing every rejected file by name
- [X] T042 [US4] Build the album deletion confirmation stating the photo count and that files on disk are never deleted in `src/ui/main-page.js` (FR-013, I-6)

**Checkpoint**: All four stories independently functional against a real collection.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T043 [P] End-to-end test scenario V-9 asserting no interaction produces a nested album in `tests/e2e/no-nesting.spec.js` (SC-008)
- [X] T044 [P] Validate the performance budgets V-10 — 100 albums / 10,000 photos in 2s, 500 tiles in 1s — in `tests/e2e/performance.spec.js` (SC-002, SC-003)
- [X] T045 [P] Write `README.md` documenting the single entry point, the Chromium-only limitation, and the cross-origin isolation requirement (Constitution Principle III)
- [X] T046 Accessibility pass across `src/ui/` — focus order, visible focus, live region announcements, keyboard reachability of every drag capability
- [X] T047 Review every error path in `src/storage/` and `src/ui/` so no failure is silent and each message names what failed (Constitution Principle I)
- [X] T048 Run the full [quickstart.md](./quickstart.md) validation against a clean profile

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–6)**: all depend on Foundational; then parallel or in priority order
- **Polish (Phase 7)**: depends on the desired stories being complete

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories — T013's seeder is what keeps it independent of US4.
- **US2 (P1)**: after Foundational. Independent of US1; shares only the storage client.
- **US3 (P2)**: after Foundational. Operates on the main page from US1, but its storage operation and reorder module are testable on seeded data alone.
- **US4 (P2)**: after Foundational. Independent, and the only story requiring the File System Access grant.

### Within Each User Story

- Tests are written and failing before implementation
- Worker operations before the interface that calls them
- Core behavior before performance and accessibility refinement

### Parallel Opportunities

- T004, T005, T006 in Setup
- T010, T012, T013 in Foundational
- Both test tasks in every story phase
- T043, T044, T045 in Polish
- With multiple people: US1, US2, US3, US4 can proceed simultaneously once Phase 2 lands

---

## Parallel Example: User Story 1

```bash
# Both US1 tests together, before any implementation:
Task: "Unit-test listMainPage in tests/unit/list-main-page.test.js"
Task: "End-to-end V-1 and V-2 in tests/e2e/main-page.spec.js"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup
2. Phase 2 Foundational — blocks everything
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: main page renders seeded albums grouped by date
5. Demo

US1 plus US2 is the more satisfying first demo — browse, open, view — and both are P1.

### Incremental Delivery

1. Setup + Foundational → storage boundary live
2. US1 → main page (MVP)
3. US2 → the product is browsable end to end
4. US3 → the organizing behavior the request centers on
5. US4 → works against a real collection instead of fixtures

---

## Notes

- Commit after each task or logical group
- Verify tests fail before implementing
- **Before starting Phase 5**, resolve FR-019 / [U-001](./research.md). T030 and T033 encode
  the assumption that manual order is scoped within a date group and cross-group drags are
  refused. Resolving it the other way changes those two tasks and invariant I-2, though not
  the schema.
- The constitution governing these tasks was ratified for a different project. Its testing
  and error-handling gates were applied by analogy; see the Constitution Check in
  [plan.md](./plan.md).

---

## Deviations from the plan

Recorded rather than silently absorbed.

1. **Worker-operation tests are end-to-end, not unit tests** (T015, T021, T028). The
   storage operations need SQLite over OPFS, which exists only in a browser. Testing them
   in Node would have meant mocking the database — asserting against a fake instead of the
   real end state, which Constitution Principle II rules out. The pure logic they sit on
   (grouping, position arithmetic) *is* unit-tested in `tests/unit/ordering.test.js`.

2. **T037 and T041 are implemented but not automatically verified.** `showDirectoryPicker`
   requires a real user gesture on a real OS file chooser and cannot be driven headlessly.
   Every operation behind the picker is covered in `tests/e2e/album-ops.spec.js`; the grant
   flow itself needs manual verification per quickstart V-8.

3. **Playwright needs an explicit browser path in this environment.** `playwright.config.js`
   honours `CHROMIUM_PATH` when set. On a machine where `npx playwright install` has run,
   the override is unnecessary.

## Defects found and fixed during implementation

1. **Schema re-applied on every load.** `CREATE TABLE` without `IF NOT EXISTS` threw
   `table album already exists` on the second visit, breaking persistence (FR-005). Fixed
   in `contracts/schema.sql` and `src/storage/schema.sql`.

2. **Tiles collapsed to zero size.** `.tile` is a `button`, which is inline-block and had no
   content before its thumbnail loaded, so `aspect-ratio` had no width to work from. Fixed
   with `display: block; width: 100%`. The first version of the uniformity test passed
   vacuously against two 0x0 tiles; it now asserts a non-zero footprint first.

3. **The drop indicator chased itself.** Inserting the indicator as a grid item reflowed the
   cards whose geometry the hit-test measured, so the computed drop position fed back into
   itself and drags resolved to their starting slot. The indicator is now drawn as an inset
   edge on a card, which changes no layout.
