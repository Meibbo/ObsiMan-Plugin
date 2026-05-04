import { describe, it, expect } from 'vitest';
import { sortNodes } from '../../../src/services/serviceSorting';

describe('serviceSorting', () => {
  it('sorts by label asc', () => {
    const nodes = [{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }];
    const sorted = sortNodes(nodes, { field: 'label', direction: 'asc' });
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('sorts by date desc', () => {
    const nodes = [
      { id: '1', stat: { mtime: 100 } },
      { id: '2', stat: { mtime: 200 } },
    ];
    const sorted = sortNodes(nodes, { field: 'stat.mtime', direction: 'desc' });
    expect(sorted.map((n) => n.id)).toEqual(['2', '1']);
  });

  it('does NOT mutate the input array', () => {
    const nodes = [{ id: 'b' }, { id: 'a' }];
    const before = nodes.map((n) => n.id).join(',');
    sortNodes(nodes, { field: 'id', direction: 'asc' });
    expect(nodes.map((n) => n.id).join(',')).toBe(before);
  });

  it('sort by date does NOT freeze the app on 1000 nodes', () => {
    const nodes = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), stat: { mtime: Math.random() * 1e9 } }));
    const t0 = performance.now();
    sortNodes(nodes, { field: 'stat.mtime', direction: 'desc' });
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(150);
  });
});
