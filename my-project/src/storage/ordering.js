/**
 * Date-group derivation and position arithmetic.
 *
 * Purpose: the two rules that decide where an album appears. Kept pure and free
 * of SQLite so they can be unit-tested directly (data-model.md, R-006).
 * Preconditions: dates are ISO 8601 strings or null.
 */

import { ErrorCode, fail } from './errors.js';

/** Extract the YYYY-MM-DD portion of an ISO timestamp. */
export function toDateKey(isoString) {
  if (!isoString) return null;
  const key = String(isoString).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

/**
 * FR-014: an album belongs to exactly one date group.
 * The rule is the earliest `taken_at` among its photos; when no photo carries a
 * date, it falls back to the album's creation date. An album whose photos span
 * several dates therefore lands in one group by a single stated rule.
 */
export function deriveGroupDate(photoTakenAts, albumCreatedAt) {
  const keys = photoTakenAts.map(toDateKey).filter(Boolean);
  if (keys.length === 0) {
    const fallback = toDateKey(albumCreatedAt);
    if (!fallback) fail(ErrorCode.INVALID_POSITION, 'Album has no usable date for grouping.');
    return fallback;
  }
  return keys.reduce((earliest, key) => (key < earliest ? key : earliest));
}

/**
 * FR-001: date groups newest first, albums in manual order within each group.
 * Input rows are `{ id, name, group_date, position, ... }`.
 */
export function groupByDate(albumRows) {
  const byDate = new Map();
  for (const row of albumRows) {
    if (!byDate.has(row.group_date)) byDate.set(row.group_date, []);
    byDate.get(row.group_date).push(row);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, albums]) => ({
      date,
      albums: albums.sort((a, b) => a.position - b.position),
    }));
}

/**
 * Compute the full set of positions after moving one item to a new index.
 * Returns `[{ id, position }]` covering every member of the group, so the caller
 * can rewrite them in one transaction and never leave invariant I-2 broken.
 */
export function computeReorder(orderedIds, movingId, targetPosition) {
  const from = orderedIds.indexOf(movingId);
  if (from === -1) {
    fail(ErrorCode.ALBUM_NOT_FOUND, `Album ${movingId} is not in this date group.`);
  }
  if (!Number.isInteger(targetPosition) || targetPosition < 0 || targetPosition >= orderedIds.length) {
    fail(
      ErrorCode.INVALID_POSITION,
      `Position ${targetPosition} is outside this group (0–${orderedIds.length - 1}).`,
    );
  }
  const next = [...orderedIds];
  next.splice(from, 1);
  next.splice(targetPosition, 0, movingId);
  return next.map((id, position) => ({ id, position }));
}

/** The position a newly created item takes: the end of its group. */
export function nextPosition(existingPositions) {
  return existingPositions.length === 0 ? 0 : Math.max(...existingPositions) + 1;
}

/**
 * Close the gap left by a removed item so positions stay contiguous (I-2, I-3).
 */
export function compactPositions(orderedIds) {
  return orderedIds.map((id, position) => ({ id, position }));
}
