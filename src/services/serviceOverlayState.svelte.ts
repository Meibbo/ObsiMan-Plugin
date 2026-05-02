import type { IOverlayState, OverlayEntry } from '../types/contracts';

export class OverlayStateService implements IOverlayState {
  stack = $state<OverlayEntry[]>([]);

  push(entry: OverlayEntry): void {
    this.stack = [...this.stack, entry];
  }

  pop(): void {
    this.stack = this.stack.slice(0, -1);
  }

  popById(id: string): void {
    this.stack = this.stack.filter((e) => e.id !== id);
  }

  clear(): void {
    this.stack = [];
  }

  isOpen(id: string): boolean {
    return this.stack.some((e) => e.id === id);
  }
}
