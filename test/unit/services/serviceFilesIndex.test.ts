import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, TFile } from 'obsidian';
import { createFilesIndex } from '../../../src/services/serviceFilesIndex';

describe('serviceFilesIndex', () => {
  it('builds FileNode[] from vault.getMarkdownFiles', async () => {
    const files = [mockTFile('notes/a.md'), mockTFile('notes/b.md')];
    const app = mockApp({ files });
    const idx = createFilesIndex(app);
    await idx.refresh();
    expect(idx.nodes.length).toBe(2);
    expect(idx.nodes[0].path).toBe('notes/a.md');
    expect(idx.nodes[0].file).toBe(files[0]);
  });

  it('byId is the file path', async () => {
    const f = mockTFile('x.md');
    const app = mockApp({ files: [f] });
    const idx = createFilesIndex(app);
    await idx.refresh();
    expect(idx.byId('x.md')?.basename).toBe('x');
  });
});
