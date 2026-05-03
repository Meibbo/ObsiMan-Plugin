import type { App } from 'obsidian';
import type { IDecorationManager, DecorationOutput, NodeBase } from '../types/contracts';

export class DecorationManager implements IDecorationManager {
  private app: App;
  private subs = new Set<() => void>();
  private highlightQuery = '';

  constructor(app: App) {
    this.app = app;
  }

  // reserved for decorator plugins (v1.1+)
  getApp(): App {
    return this.app;
  }

  setHighlightQuery(q: string): void {
    this.highlightQuery = q;
    for (const cb of this.subs) cb();
  }

  decorate<TNode extends NodeBase>(node: TNode, _context?: unknown): DecorationOutput {
    const out: DecorationOutput = { icons: [], badges: [], highlights: [] };
    const label = (node as { label?: string; tag?: string; property?: string; basename?: string }).label
      ?? (node as { tag?: string }).tag
      ?? (node as { property?: string }).property
      ?? (node as { basename?: string }).basename
      ?? '';
    if (this.highlightQuery && label) {
      let i = 0;
      while ((i = label.indexOf(this.highlightQuery, i)) !== -1) {
        out.highlights.push({ start: i, end: i + this.highlightQuery.length });
        i += this.highlightQuery.length;
      }
    }
    return out;
  }

  subscribe(cb: () => void): () => void { this.subs.add(cb); return () => this.subs.delete(cb); }
}
