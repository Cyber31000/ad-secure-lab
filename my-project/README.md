# Photo Album Organizer

Organize photos into albums grouped by date, reorder them by dragging, and browse
each album as a grid of tiles. Everything stays on your machine: photos are read
from a folder you choose and are never copied or uploaded.

## Requirements

- Node 20 or later
- **A Chromium-based browser** (Chrome, Edge, Brave). See the limitation below.

## Running it

```bash
npm install
npm run dev
```

Then open the address Vite prints.

## Testing

```bash
npm run test:unit    # Vitest — date grouping and position arithmetic
npm run test:e2e     # Playwright — the real browser journeys
npm run test         # both
```

If Playwright has no browser installed, either run `npx playwright install
chromium` or point at an existing binary:

```bash
CHROMIUM_PATH=/path/to/chrome npm run test:e2e
```

## How it works

- **Metadata** lives in a SQLite database (`@sqlite.org/sqlite-wasm`) running in a
  Web Worker, persisted through OPFS. It stores album names, dates, ordering, and
  photo paths — never image bytes.
- **Photos** stay on your disk. The app remembers the folder you grant through the
  File System Access API and reads files in place.
- **Thumbnails** are generated once on import and cached in OPFS, so a large album
  renders from small images rather than full-resolution originals.
- **Reordering** is built on Pointer Events, so mouse, touch, and pen share one
  path, and the same move is available from the keyboard.

Only one runtime dependency ships: the SQLite WASM build. Everything else is
vanilla HTML, CSS, and JavaScript.

## Keyboard

| Key | Action |
|---|---|
| `Tab` | Move between albums |
| `Space` | Grab or drop the focused album |
| Arrow keys | Move a grabbed album within its date group |
| `Escape` | Cancel the move |
| `Enter` | Open the focused album |

Moves are announced through a live region.

## Known limitations

- **Chromium only.** The File System Access API, which is what lets photos be
  referenced in place rather than copied, does not exist in Firefox or Safari.
  Supporting them would mean copying image bytes into browser storage — a
  different product decision, not a small patch.
- **Cross-origin isolation is required.** The dev server sets
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`; any host you deploy to must send
  the same headers, or SQLite's OPFS backend will not start.
- **Albums stay in their date group.** Dragging an album into a different date
  group is refused rather than silently ignored. An album's group comes from the
  earliest capture date among its photos, so change its photos to move it.

## Documentation

The specification, plan, data model, and interface contracts live in
[`specs/001-photo-album-organizer/`](./specs/001-photo-album-organizer/).
