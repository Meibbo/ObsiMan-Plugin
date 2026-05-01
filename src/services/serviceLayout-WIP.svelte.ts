/* global $state */
/**
 * Generic controller for pointer-based reordering logic.
 * Encapsulates long-press detection and drag tracking.
 */
export class ReorderController {
  // State
  isReordering = $state(false);
  reorderTargetIdx = $state<number | null>(null);

  #reorderSourceIdx = -1;
  #longPressTimer: number | null = null;
  #onCommit: (from: number, to: number) => void;
  #delay: number;
  #pendingPointerId = -1;

  constructor(onCommit: (from: number, to: number) => void, delay = 500) {
    this.#onCommit = onCommit;
    this.#delay = delay;
  }

  handlePointerDown(idx: number, e: PointerEvent, el: HTMLElement) {
    this.#pendingPointerId = e.pointerId;
    this.#longPressTimer = activeWindow.setTimeout(() => {
      this.isReordering = true;
      this.#reorderSourceIdx = idx;
      // Capture pointer so we can track movement even outside the element
      el.setPointerCapture(this.#pendingPointerId);
    }, this.#delay);
  }

  handlePointerMove(e: PointerEvent, containerEl: HTMLElement) {
    if (!this.isReordering || this.#reorderSourceIdx < 0) return;

    // Find which item the pointer is over
    const elUnder = activeDocument.elementFromPoint(e.clientX, e.clientY);
    const itemEl = elUnder?.closest?.(".nav-action-button, .vm-nav-icon") as HTMLElement | null;

    if (itemEl && containerEl.contains(itemEl)) {
      // Logic to find target index... this is a bit crude but works for horizontal layouts
      const items = Array.from(containerEl.querySelectorAll(".nav-action-button, .vm-nav-icon"));
      const idx = items.indexOf(itemEl);
      if (idx >= 0 && idx !== this.#reorderSourceIdx) {
        this.reorderTargetIdx = idx;
      }
    }
  }

  handlePointerUp() {
    this.cancel();
    if (
      this.isReordering &&
      this.#reorderSourceIdx >= 0 &&
      this.reorderTargetIdx !== null &&
      this.#reorderSourceIdx !== this.reorderTargetIdx
    ) {
      this.#onCommit(this.#reorderSourceIdx, this.reorderTargetIdx);
    }
    this.isReordering = false;
    this.#reorderSourceIdx = -1;
    this.reorderTargetIdx = null;
  }

  cancel() {
    if (this.#longPressTimer) {
      activeWindow.clearTimeout(this.#longPressTimer);
      this.#longPressTimer = null;
    }
    this.#pendingPointerId = -1;
  }
}
