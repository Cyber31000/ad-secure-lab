import { defineConfig } from 'vite';

// Cross-origin isolation is mandatory, not optional: SQLite's OPFS synchronous
// access handle path refuses to initialize without it. See specs/001-photo-album-organizer/plan.md.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  // sqlite-wasm ships its own worker and .wasm; excluding it from pre-bundling
  // keeps those asset paths intact.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
