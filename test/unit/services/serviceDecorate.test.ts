import { describe, it, expect } from 'vitest';
import { mockApp } from '../../helpers/obsidian-mocks';
import { DecorationManager } from '../../../src/services/serviceDecorate';

describe('DecorationManager', () => {
  it('returns empty highlights when query is empty', () => {
    const dm = new DecorationManager(mockApp());
    const out = dm.decorate({ id: 'a', label: 'hello world' } as never);
    expect(out.highlights).toEqual([]);
  });

  it('highlights all occurrences of the query in the label', () => {
    const dm = new DecorationManager(mockApp());
    dm.setHighlightQuery('foo');
    const out = dm.decorate({ id: 'a', label: 'foo bar foo' } as never);
    expect(out.highlights).toEqual([{ start: 0, end: 3 }, { start: 8, end: 11 }]);
  });

  it('notifies subscribers when query changes', () => {
    const dm = new DecorationManager(mockApp());
    let count = 0;
    dm.subscribe(() => count++);
    dm.setHighlightQuery('x');
    expect(count).toBe(1);
  });

  it('falls back through tag/property/basename when label absent', () => {
    const dm = new DecorationManager(mockApp());
    dm.setHighlightQuery('pro');
    const out = dm.decorate({ id: 'x', property: 'project' } as never);
    expect(out.highlights.length).toBeGreaterThan(0);
    expect(out.highlights[0].start).toBe(0);
  });
});
