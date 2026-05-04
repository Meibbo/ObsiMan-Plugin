import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';
import { createTagsIndex } from '../../../src/index/indexTags';

describe('serviceTagsIndex', () => {
  it('aggregates #tag counts across files via metadataCache', async () => {
    const f1 = mockTFile('a.md');
    const f2 = mockTFile('b.md');
    const metadata = new Map<string, CachedMetadata>([
      [
        f1.path,
        {
          tags: [
            {
              tag: '#x',
              position: {
                start: { line: 0, col: 0, offset: 0 },
                end: { line: 0, col: 2, offset: 2 },
              },
            },
          ],
        },
      ],
      [
        f2.path,
        {
          tags: [
            {
              tag: '#x',
              position: {
                start: { line: 0, col: 0, offset: 0 },
                end: { line: 0, col: 2, offset: 2 },
              },
            },
            {
              tag: '#y',
              position: {
                start: { line: 0, col: 3, offset: 3 },
                end: { line: 0, col: 5, offset: 5 },
              },
            },
          ],
        },
      ],
    ]);
    const app = mockApp({ files: [f1, f2], metadata });
    const idx = createTagsIndex(app);
    await idx.refresh();
    const x = idx.nodes.find((n) => n.tag === '#x');
    const y = idx.nodes.find((n) => n.tag === '#y');
    expect(x?.count).toBe(2);
    expect(y?.count).toBe(1);
  });
});
