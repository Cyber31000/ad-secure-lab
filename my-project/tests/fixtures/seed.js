/**
 * Fixture data for tests.
 *
 * Purpose: US1, US2 and US3 are testable before US4's import UI exists. This is
 * what keeps the P1 stories independent of the P2 import story (tasks.md T013).
 */

/** A 1x1 transparent PNG, enough to prove a tile renders. */
export const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** Three albums across three capture dates, plus one empty and one undated. */
export function threeDateCollection() {
  return [
    {
      name: 'Coast walk',
      groupDate: '2026-07-30',
      position: 0,
      createdAt: '2026-08-01T09:00:00Z',
      photos: [
        { relativePath: 'coast/a.jpg', filename: 'a.jpg', takenAt: '2026-07-30T08:00:00Z', width: 4000, height: 3000 },
        { relativePath: 'coast/b.jpg', filename: 'b.jpg', takenAt: '2026-07-30T09:00:00Z', width: 3000, height: 4000 },
      ],
    },
    {
      name: 'Studio portraits',
      groupDate: '2026-07-30',
      position: 1,
      createdAt: '2026-08-01T10:00:00Z',
      photos: [
        { relativePath: 'studio/p1.jpg', filename: 'p1.jpg', takenAt: '2026-07-30T14:00:00Z', width: 2000, height: 3000 },
      ],
    },
    {
      name: 'Spring garden',
      groupDate: '2026-03-14',
      position: 0,
      createdAt: '2026-03-20T10:00:00Z',
      photos: [
        { relativePath: 'garden/g1.jpg', filename: 'g1.jpg', takenAt: '2026-03-14T11:00:00Z', width: 3000, height: 2000 },
      ],
    },
    {
      name: 'New year',
      groupDate: '2026-01-02',
      position: 0,
      createdAt: '2026-01-05T10:00:00Z',
      photos: [
        { relativePath: 'ny/n1.jpg', filename: 'n1.jpg', takenAt: '2026-01-02T00:30:00Z', width: 1600, height: 1200 },
      ],
    },
    {
      // Empty album: must still appear, with a placeholder cover and count 0 (US1 AC3).
      name: 'Empty shelf',
      groupDate: '2026-01-02',
      position: 1,
      createdAt: '2026-01-02T12:00:00Z',
      photos: [],
    },
  ];
}

/** A larger album for tile and performance checks. */
export function bigAlbum(photoCount = 500) {
  return [
    {
      name: `Big album (${photoCount})`,
      groupDate: '2026-06-01',
      position: 0,
      createdAt: '2026-06-01T00:00:00Z',
      photos: Array.from({ length: photoCount }, (_, i) => ({
        relativePath: `big/${i}.jpg`,
        filename: `${i}.jpg`,
        takenAt: '2026-06-01T00:00:00Z',
        width: i % 2 ? 3000 : 2000,
        height: i % 2 ? 2000 : 3000,
      })),
    },
  ];
}
