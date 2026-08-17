# Quickstart & Validation: Photo Album Organizer

**Plan**: [plan.md](./plan.md) | **Contracts**: [storage-worker.md](./contracts/storage-worker.md)

## Prerequisites

- Node 20 or later
- A Chromium-based browser (see the known limitation in [plan.md](./plan.md))
- A folder of test images on disk, spanning at least three different capture dates

## Setup

```bash
npm install
npm run dev
```

The dev server must send cross-origin isolation headers, or SQLite's OPFS synchronous
access handle path will not initialize:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

If the console reports that OPFS is unavailable, this is the first thing to check.

## Validation scenarios

Each scenario maps to acceptance criteria in [spec.md](./spec.md). Run them against a
clean profile — empty OPFS, no prior grant — so first-run behavior is covered too.

### V-1 — Main page groups albums by date (US1, FR-001)

Create three albums whose photos fall on three different dates. Load the main page.

**Expected**: three date headings, newest first; every album appears exactly once under
its correct heading; each card shows name, cover, and photo count.

### V-2 — Empty state (US1, AC2)

Load with no albums.

**Expected**: an empty state explaining how to create the first album. Not a blank page.

### V-3 — Tiles are uniform (US2, FR-009)

Open an album holding both portrait and landscape photos.

**Expected**: tile count matches the photo count; every tile occupies the same footprint;
no image is stretched or squashed. Selecting a tile opens that specific photo with a way
back.

### V-4 — Drag reorder persists (US3, FR-004, FR-005)

Drag an album to a new position within its date group. Reload the page.

**Expected**: neighbors shift during the drag, a drop indicator shows the landing slot,
and the new order survives the reload.

### V-5 — Cancelled drag writes nothing (FR-007)

Begin a drag, then release outside any valid drop area, or press Escape.

**Expected**: the album returns to its original position. No database write occurred —
verify by confirming the order is unchanged after a reload.

### V-6 — Cross-group drag is refused (U-001)

Drag an album onto a different date group.

**Expected**: the move is refused with a visible reason, not a silent snap-back. This is
the scenario to revisit first if FR-019 resolves differently.

### V-7 — Keyboard reorder (FR-008, SC-007)

Using only the keyboard, focus an album and move it one position.

**Expected**: the move succeeds, is announced through the live region, and persists
identically to V-4.

### V-8 — Partial-success import (FR-015)

Add a batch mixing supported images with one unsupported file.

**Expected**: supported images are added; the unsupported file is reported by name; the
batch is not aborted.

### V-9 — Nesting is impossible (FR-003, SC-008)

Attempt to drop one album onto another.

**Expected**: no nesting occurs under any interaction. The schema has no column that could
express it.

### V-10 — Performance budgets (SC-002, SC-003)

With 100 albums totalling 10,000 photos: time to a usable main page.
With one album of 500 photos: time to rendered tiles.

**Expected**: under 2 seconds and under 1 second respectively.

## Test commands

```bash
npm run test:unit    # Vitest — grouping, position arithmetic, worker operations
npm run test:e2e     # Playwright — V-4 through V-9
npm run test         # both
```

Per Constitution Principle II, a change to reordering or storage is validated by a full
clean-profile end-to-end run, not by unit tests alone.
