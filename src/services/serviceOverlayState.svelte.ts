import type { IOverlayState, OverlayEntry } from '../types/contracts';

export class OverlayStateService implements IOverlayState {
  stack = $state<OverlayEntry[]>([]);

  push(entry: OverlayEntry): void {
    this.stack = [...this.stack, entry];
  }

  pop(): void {
    if (this.stack.length === 0) return;
    this.stack = this.stack.slice(0, -1);
  }

  popById(id: string): void {
    if (!this.stack.some((e) => e.id === id)) return;
    this.stack = this.stack.filter((e) => e.id !== id);
  }

  clear(): void {
    if (this.stack.length === 0) return;
    this.stack = [];
  }

  isOpen(id: string): boolean {
    return this.stack.some((e) => e.id === id);
  }
}
