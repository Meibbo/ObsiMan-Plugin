import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';
import { createPropsIndex } from '../../../src/services/servicePropsIndex';

describe('servicePropsIndex', () => {
  it('aggregates properties + values across files', async () => {
    const f1 = mockTFile('a.md');
    const f2 = mockTFile('b.md');
    const metadata = new Map<string, CachedMetadata>([
      [f1.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
      [f2.path, { frontmatter: { status: 'done' } }],
    ]);
    const app = mockApp({ files: [f1, f2], metadata });
    const idx = createPropsIndex(app);
    await idx.refresh();
    const status = idx.nodes.find((n) => n.property === 'status');
    expect(status?.values.sort()).toEqual(['done', 'draft']);
    expect(status?.fileCount).toBe(2);
  });
});
