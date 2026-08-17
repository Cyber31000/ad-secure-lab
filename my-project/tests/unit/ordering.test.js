import { describe, expect, it } from 'vitest';
import {
  compactPositions,
  computeReorder,
  deriveGroupDate,
  groupByDate,
  nextPosition,
  toDateKey,
} from '../../src/storage/ordering.js';

describe('toDateKey', () => {
  it('extracts the date portion of an ISO timestamp', () => {
    expect(toDateKey('2026-03-14T09:30:00.000Z')).toBe('2026-03-14');
  });

  it('returns null for missing or malformed input', () => {
    expect(toDateKey(null)).toBeNull();
    expect(toDateKey('')).toBeNull();
    expect(toDateKey('not a date')).toBeNull();
  });
});

describe('deriveGroupDate (FR-014)', () => {
  it('uses the earliest capture date when photos span several dates', () => {
    const groupDate = deriveGroupDate(
      ['2026-03-14T10:00:00Z', '2026-01-02T10:00:00Z', '2026-07-30T10:00:00Z'],
      '2026-08-01T00:00:00Z',
    );
    expect(groupDate).toBe('2026-01-02');
  });

  it('falls back to the album creation date when no photo carries one', () => {
    expect(deriveGroupDate([], '2026-08-17T12:00:00Z')).toBe('2026-08-17');
    expect(deriveGroupDate([null, null], '2026-08-17T12:00:00Z')).toBe('2026-08-17');
  });

  it('ignores undated photos when others have dates', () => {
    expect(deriveGroupDate([null, '2026-05-05T00:00:00Z'], '2026-08-17T00:00:00Z')).toBe(
      '2026-05-05',
    );
  });

  it('fails loudly when there is no usable date at all', () => {
    expect(() => deriveGroupDate([], null)).toThrow(/no usable date/i);
  });
});

describe('groupByDate (FR-001)', () => {
  const albums = [
    { id: 1, group_date: '2026-01-02', position: 1 },
    { id: 2, group_date: '2026-07-30', position: 0 },
    { id: 3, group_date: '2026-01-02', position: 0 },
    { id: 4, group_date: '2026-03-14', position: 0 },
  ];

  it('orders date groups newest first', () => {
    expect(groupByDate(albums).map((g) => g.date)).toEqual([
      '2026-07-30',
      '2026-03-14',
      '2026-01-02',
    ]);
  });

  it('orders albums by manual position within a group', () => {
    const january = groupByDate(albums).find((g) => g.date === '2026-01-02');
    expect(january.albums.map((a) => a.id)).toEqual([3, 1]);
  });

  it('places every album in exactly one group', () => {
    const ids = groupByDate(albums).flatMap((g) => g.albums.map((a) => a.id));
    expect(ids.sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('computeReorder (FR-004)', () => {
  const ids = [10, 20, 30, 40];

  it('moves an album forward and renumbers contiguously', () => {
    expect(computeReorder(ids, 10, 2)).toEqual([
      { id: 20, position: 0 },
      { id: 30, position: 1 },
      { id: 10, position: 2 },
      { id: 40, position: 3 },
    ]);
  });

  it('moves an album backward', () => {
    expect(computeReorder(ids, 40, 0).map((r) => r.id)).toEqual([40, 10, 20, 30]);
  });

  it('is a no-op when the target equals the current position', () => {
    expect(computeReorder(ids, 20, 1).map((r) => r.id)).toEqual(ids);
  });

  it('rejects a position outside the group', () => {
    expect(() => computeReorder(ids, 10, 4)).toThrow(/outside this group/i);
    expect(() => computeReorder(ids, 10, -1)).toThrow(/outside this group/i);
  });

  it('rejects an album that is not in the group', () => {
    expect(() => computeReorder(ids, 99, 0)).toThrow(/not in this date group/i);
  });

  it('always returns contiguous positions with no duplicates (I-2)', () => {
    for (let target = 0; target < ids.length; target += 1) {
      const positions = computeReorder(ids, 30, target).map((r) => r.position);
      expect(positions).toEqual([0, 1, 2, 3]);
    }
  });
});

describe('nextPosition and compactPositions', () => {
  it('appends after the highest existing position', () => {
    expect(nextPosition([])).toBe(0);
    expect(nextPosition([0, 1, 2])).toBe(3);
    expect(nextPosition([5])).toBe(6);
  });

  it('closes gaps left by a removal', () => {
    expect(compactPositions([7, 9])).toEqual([
      { id: 7, position: 0 },
      { id: 9, position: 1 },
    ]);
  });
});
