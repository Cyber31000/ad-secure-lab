# Implementation Plan: Photo Album Organizer

**Branch**: `claude/uv-tool-install-specify-cli-iqbj2k` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-photo-album-organizer/spec.md`

## Summary

A local-first photo organizer: albums grouped by date on a main page, reorderable by
dragging, with photos shown as uniform tiles inside each album. Nothing leaves the
person's machine. The application is a static Vite site written in vanilla HTML, CSS, and
JavaScript. It carries exactly one runtime dependency — the official SQLite WASM build —
which runs in a Web Worker over OPFS and stores metadata only. Photo bytes stay where
they already are on disk, reached through a persisted File System Access directory handle
and never copied. Drag reordering, tile rendering, and thumbnail generation are all built
on platform APIs rather than libraries.

## Technical Context

**Language/Version**: JavaScript (ES2022 modules), no transpiler beyond Vite's default esbuild

**Primary Dependencies**: `@sqlite.org/sqlite-wasm` (sole runtime dependency); Vite, Vitest, Playwright as dev dependencies

**Storage**: SQLite in OPFS for metadata ([schema](./contracts/schema.sql)); OPFS for the thumbnail cache; IndexedDB for the persisted directory handle; original images remain on the user's disk, untouched

**Testing**: Vitest for ordering, grouping, and storage logic; Playwright for drag, keyboard reorder, and persistence journeys ([R-006](./research.md))

**Target Platform**: Chromium-based desktop browsers — see the constraint below

**Project Type**: Single-page static web application, no backend

**Performance Goals**: Main page usable in 2s at 100 albums / 10,000 photos (SC-002); album tiles in 1s at 500 photos (SC-003); drag tracks the pointer with no perceptible lag (SC-004)

**Constraints**: Fully offline after first load; no network calls of any kind; cross-origin isolation headers required for the OPFS synchronous access handle path; every drag capability reachable by keyboard (SC-007)

**Scale/Scope**: Low thousands of photos, single person, roughly 4 screens (main page, album view, photo view, import)

**Known limitation**: The File System Access API is Chromium-only. Firefox and Safari
cannot grant a persistent directory handle, so the "reference photos in place, never
copy" property cannot hold there. Supporting them means copying image bytes into OPFS,
which is a different product decision — flagged in [R-002](./research.md), not silently
absorbed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**A caveat that matters.** The constitution at `.specify/memory/constitution.md` was
ratified for `ad-secure-lab` — a Vagrant/PowerShell Active Directory lab. Its
domain-specific clauses (45-minute provisioning budget, idempotent provisioning scripts,
French user-facing output, GPO documentation) have no referent in a browser photo app.
Gates below are evaluated against each principle's **general** rule and the
domain-specific clauses are recorded as not applicable. This is a gap in the
constitution, not a passing grade — see Complexity Tracking.

| Principle | Gate | Status |
|---|---|---|
| I. Code Quality | Config in one place, not duplicated | PASS — schema and constants live in one module each |
| I. Code Quality | Fail loudly, never silently | PASS — storage contract returns a named error per failure; `addPhotos` reports every rejected file |
| I. Code Quality | Header comment stating purpose and preconditions | PASS — applies as written |
| II. Testing | Assert end state, not exit code | PASS — Playwright asserts rendered order and post-reload persistence |
| II. Testing | Reproduce a bug with a failing check before fixing | PASS — applies as written |
| II. Testing | Clean-state full run before merge | ADAPTED — "clean provision" reads as a clean-profile Playwright run with empty OPFS |
| III. UX | Single documented entry point | PASS — `npm install && npm run dev` |
| III. UX | Stable terminology across code, docs, diagrams | PASS — spec, data model, and contract use one vocabulary (album, photo, date group) |
| III. UX | French user-facing output | N/A — inherited from the wrong project; this app has no stated language requirement |
| IV. Performance | Stated budget, defended in review | PASS — SC-002/003/004 are the budget |
| IV. Performance | Readiness conditions, not fixed sleeps | PASS — worker-ready handshake and `IntersectionObserver`, no timers |

**Post-Phase 1 re-check**: still passing. The design added one runtime dependency, which
is justified in [R-001](./research.md) and recorded below. No new violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-photo-album-organizer/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── schema.sql       # SQLite schema
│   └── storage-worker.md # Worker message contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
index.html                   # Single entry point

src/
├── main.js                  # Bootstrap: opens storage, renders main page
├── storage/
│   ├── worker.js            # Owns SQLite; implements the storage-worker contract
│   ├── client.js            # Main-thread request/response wrapper over the worker
│   └── schema.sql           # Copy of contracts/schema.sql, applied on first run
├── files/
│   ├── directory.js         # Directory handle: pick, persist, re-grant
│   └── thumbnails.js        # createImageBitmap → WebP → OPFS cache
├── ui/
│   ├── main-page.js         # Date groups, album cards, empty state
│   ├── reorder.js           # Pointer Events drag + keyboard reorder + live region
│   ├── album-view.js        # Tile grid
│   └── photo-view.js        # Full-size photo
└── styles/
    ├── tokens.css           # Spacing, color, tile sizing
    └── app.css

tests/
├── unit/                    # Vitest: grouping, position arithmetic, worker ops
└── e2e/                     # Playwright: drag, keyboard reorder, persistence
```

**Structure Decision**: Single project, no frontend/backend split — there is no backend.
Modules are grouped by responsibility rather than by technical layer, and the only
architectural boundary is the storage worker, which is why it is the one thing given a
written contract.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| One runtime dependency (`@sqlite.org/sqlite-wasm`) against "minimal libraries" | The directive names SQLite specifically; there is no built-in SQLite in the browser | IndexedDB needs zero dependencies but is not SQLite; `sql.js` requires whole-database serialization on every write and does not scale to 10,000 rows |
| Constitution evaluated by analogy rather than directly | The ratified constitution governs a different project (`ad-secure-lab`) | No simpler alternative exists — the honest fix is to rewrite the constitution for this project before `/speckit.implement`, not to claim a clean pass here |
| Chromium-only target | Persistent in-place file references exist nowhere else | Copying bytes into OPFS is cross-browser but abandons the "never copied" property the directive implies |

## Open items

- **FR-019 / [U-001](./research.md)** is unresolved from `/speckit.specify`. This plan
  assumes manual order applies within a date group and cross-group drags are refused.
  Resolving it the other way changes `reorderAlbum`'s contract and invariant I-2; it does
  not change the table shape.
