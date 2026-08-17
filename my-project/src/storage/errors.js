/**
 * Named error codes and the error envelope used across the storage boundary.
 *
 * Purpose: every failure carries a code the interface can branch on and a
 * message a person can read. Nothing fails silently (Constitution Principle I).
 * Preconditions: none — this module is pure and dependency-free.
 */

export const ErrorCode = {
  ALBUM_NOT_FOUND: 'ALBUM_NOT_FOUND',
  PHOTO_NOT_FOUND: 'PHOTO_NOT_FOUND',
  CROSS_GROUP_MOVE: 'CROSS_GROUP_MOVE',
  INVALID_NAME: 'INVALID_NAME',
  INVALID_POSITION: 'INVALID_POSITION',
  DUPLICATE_PHOTO: 'DUPLICATE_PHOTO',
  UNSUPPORTED_FILE: 'UNSUPPORTED_FILE',
  COVER_NOT_IN_ALBUM: 'COVER_NOT_IN_ALBUM',
  UNKNOWN_OP: 'UNKNOWN_OP',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
};

export class StorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
  }
}

/** Throw a coded, user-presentable failure. */
export function fail(code, message) {
  throw new StorageError(code, message);
}

/** Shape any thrown value into the contract's error response. */
export function toErrorResponse(id, error) {
  const code = error instanceof StorageError ? error.code : 'INTERNAL_ERROR';
  const message = error?.message ?? String(error);
  return { id, ok: false, error: { code, message } };
}
