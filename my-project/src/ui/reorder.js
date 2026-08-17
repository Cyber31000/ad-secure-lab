/**
 * Album reordering: pointer drag and keyboard, one shared commit path.
 *
 * Purpose: FR-004 – FR-008. Built on Pointer Events rather than HTML5
 * drag-and-drop so mouse, touch and pen share one code path and the keyboard
 * route is a peer rather than an afterthought (research.md R-004).
 * Preconditions: album cards carry data-album-id and sit in a list with
 * data-group-date.
 */

import { storage } from '../storage/client.js';

const DRAG_THRESHOLD = 4; // px before a press becomes a drag, so clicks still work

export function attachReorder(root, app) {
  root.addEventListener('pointerdown', (event) => onPointerDown(event, root, app));
  root.addEventListener('keydown', (event) => onKeyDown(event, app));
}

function cardsIn(list) {
  return [...list.querySelectorAll('.album-card')];
}

function indexOfCard(card) {
  return cardsIn(card.parentElement).indexOf(card);
}

function onPointerDown(event, root, app) {
  const card = event.target.closest('.album-card');
  if (!card || event.button !== 0) return;

  const list = card.parentElement;
  const startX = event.clientX;
  const startY = event.clientY;
  const originalIndex = indexOfCard(card);

  let dragging = false;
  let targetIndex = originalIndex;

  // The indicator is drawn on a card as an inset edge rather than inserted as a
  // grid item. An inserted element would reflow the very cards the hit-test
  // measures, and the drop position would chase its own indicator.
  const clearIndicator = () => {
    for (const el of list.querySelectorAll('.drop-indicator')) {
      el.classList.remove('drop-indicator', 'drop-after');
    }
  };

  const showIndicator = (target, after) => {
    clearIndicator();
    if (!target) return;
    target.classList.add('drop-indicator');
    if (after) target.classList.add('drop-after');
  };

  const cleanup = () => {
    card.classList.remove('dragging');
    clearIndicator();
    card.releasePointerCapture?.(event.pointerId);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerup', onUp);
    root.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('keydown', onEscape);
  };

  // FR-007: a cancelled drag restores the original position and writes nothing.
  const cancel = () => {
    cleanup();
    app.announce('Move cancelled.');
  };

  const onEscape = (keyEvent) => {
    if (keyEvent.key === 'Escape') {
      keyEvent.preventDefault();
      cancel();
    }
  };

  function onMove(moveEvent) {
    if (!dragging) {
      const moved =
        Math.abs(moveEvent.clientX - startX) > DRAG_THRESHOLD ||
        Math.abs(moveEvent.clientY - startY) > DRAG_THRESHOLD;
      if (!moved) return;
      dragging = true;
      card.classList.add('dragging');
      card.setPointerCapture?.(event.pointerId);
    }

    const overList = document
      .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      ?.closest('.album-grid');

    // U-001: cross-group drops are refused, and the indicator never suggests one.
    if (!overList || overList !== list) {
      clearIndicator();
      targetIndex = null;
      return;
    }

    const siblings = cardsIn(list).filter((c) => c !== card);
    let insertBefore = null;
    for (const sibling of siblings) {
      const box = sibling.getBoundingClientRect();
      const onThisRow = moveEvent.clientY >= box.top && moveEvent.clientY <= box.bottom;
      if (moveEvent.clientY < box.top) {
        insertBefore = sibling;
        break;
      }
      if (onThisRow && moveEvent.clientX < box.left + box.width / 2) {
        insertBefore = sibling;
        break;
      }
    }
    // FR-006: the indicator makes the landing slot unambiguous before release.
    targetIndex = insertBefore ? siblings.indexOf(insertBefore) : siblings.length;
    showIndicator(insertBefore ?? siblings.at(-1) ?? null, insertBefore === null);
  }

  async function onUp(upEvent) {
    if (!dragging) return cleanup();
    const dropped = document
      .elementFromPoint(upEvent.clientX, upEvent.clientY)
      ?.closest('.album-grid');
    const index = targetIndex;
    cleanup();

    if (dropped !== list || index === null) {
      // Released outside a valid drop area — restore, no write (FR-007).
      app.announce('Move cancelled.');
      return;
    }
    if (index === originalIndex) return;
    await commitMove(app, card, index);
  }

  const onCancel = () => cancel();

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onCancel);
  document.addEventListener('keydown', onEscape);
}

/**
 * FR-008 / SC-007: the same move by keyboard alone.
 * Space or Enter+Shift grabs; arrows move; Escape releases.
 */
function onKeyDown(event, app) {
  const card = event.target.closest?.('.album-card');
  if (!card) return;

  const grabbed = card.classList.contains('keyboard-grabbed');

  if (event.key === ' ' || (event.key === 'Enter' && event.shiftKey)) {
    event.preventDefault();
    card.classList.toggle('keyboard-grabbed');
    card.setAttribute('aria-grabbed', String(!grabbed));
    app.announce(
      grabbed
        ? `Dropped ${card.dataset.albumName}.`
        : `Grabbed ${card.dataset.albumName}. Use the arrow keys to move it, Escape to cancel.`,
    );
    return;
  }

  if (!grabbed) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    card.classList.remove('keyboard-grabbed');
    card.setAttribute('aria-grabbed', 'false');
    app.announce('Move cancelled.');
    return;
  }

  const delta =
    { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key] ?? null;
  if (delta === null) return;

  event.preventDefault();
  const current = indexOfCard(card);
  const total = cardsIn(card.parentElement).length;
  const next = current + delta;
  if (next < 0 || next >= total) {
    app.announce('Already at the edge of this date group.');
    return;
  }
  commitMove(app, card, next, { keepGrab: true });
}

/** The single write path shared by pointer and keyboard. */
async function commitMove(app, card, targetPosition, { keepGrab = false } = {}) {
  const albumId = Number(card.dataset.albumId);
  const groupDate = card.parentElement.dataset.groupDate;
  try {
    await storage.reorderAlbum(albumId, targetPosition, groupDate);
    await app.showMainPage();
    app.announce(`Moved ${card.dataset.albumName} to position ${targetPosition + 1}.`);
    if (keepGrab) {
      const moved = document.querySelector(`.album-card[data-album-id="${albumId}"]`);
      if (moved) {
        moved.classList.add('keyboard-grabbed');
        moved.setAttribute('aria-grabbed', 'true');
        moved.focus();
      }
    }
  } catch (error) {
    // Cross-group and out-of-range moves surface their reason (guarantee 2).
    app.showError(error.message);
  }
}
