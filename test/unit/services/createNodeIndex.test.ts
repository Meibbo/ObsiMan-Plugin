import { describe, it, expect, vi } from 'vitest';
import { createNodeIndex } from '../../../src/services/createNodeIndex';
import type { NodeBase } from '../../../src/types/contracts';

interface TestNode extends NodeBase {
  label: string;
}

describe('createNodeIndex', () => {
  it('rebuilds nodes via the supplied build fn', async () => {
    const build = vi.fn<() => TestNode[]>().mockReturnValue([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
    const idx = createNodeIndex<TestNode>({ build });
    await idx.refresh();
    expect(idx.nodes.length).toBe(2);
    expect(idx.byId('a')?.label).toBe('A');
  });

  it('notifies subscribers on refresh', async () => {
    const build = vi.fn<() => TestNode[]>().mockReturnValue([{ id: 'a', label: 'A' }]);
    const idx = createNodeIndex<TestNode>({ build });
    const cb = vi.fn();
    const unsub = idx.subscribe(cb);
    await idx.refresh();
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    await idx.refresh();
    expect(cb).toHaveBeenCalledTimes(1); // unsubscribed
  });

  it('byId returns undefined for missing ids', async () => {
    const build = vi.fn<() => TestNode[]>().mockReturnValue([]);
    const idx = createNodeIndex<TestNode>({ build });
    await idx.refresh();
    expect(idx.byId('nope')).toBeUndefined();
  });
});
