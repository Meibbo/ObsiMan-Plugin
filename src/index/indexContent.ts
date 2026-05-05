import type { App } from 'obsidian';
import type { ContentMatch, IContentIndex } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createContentIndex(app: App): IContentIndex {
  let query = '';
  const base = createNodeIndex<ContentMatch>({
    build: async () => {
      if (!query.trim()) return [];
      const out: ContentMatch[] = [];
      for (const file of app.vault.getMarkdownFiles()) {
        const content = await app.vault.read(file);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let start = 0;
          while (true) {
            const idx = line.indexOf(query, start);
            if (idx === -1) break;
            out.push({
              id: `${file.path}:${i}:${idx}`,
              filePath: file.path,
              line: i,
              before: line.slice(Math.max(0, idx - 30), idx),
              match: query,
              after: line.slice(idx + query.length, idx + query.length + 30),
            });
            start = idx + query.length;
            if (start >= line.length) break;
          }
        }
      }
      return out;
    },
  });
  return Object.assign(base, {
    setQuery(q: string): void {
      if (query === q) return;
      query = q;
      void base.refresh();
    },
  });
}
