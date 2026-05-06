import type { App } from 'obsidian';
import type { ContentMatch, IContentIndex } from '../types/typeContracts';
import { createNodeIndex } from './indexNodeCreate';

export function createContentIndex(app: App): IContentIndex {
  let query = '';
  let buildVersion = 0;
  const base = createNodeIndex<ContentMatch>({
    build: async () => {
      const currentQuery = query;
      const currentVersion = ++buildVersion;
      if (!currentQuery.trim()) return [];
      const out: ContentMatch[] = [];
      for (const file of app.vault.getMarkdownFiles()) {
        if (buildVersion !== currentVersion) break;
        const content = await app.vault.read(file);
        if (buildVersion !== currentVersion) break;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let start = 0;
          while (true) {
            const idx = line.indexOf(currentQuery, start);
            if (idx === -1) break;
            out.push({
              id: `${file.path}:${i}:${idx}`,
              filePath: file.path,
              line: i,
              before: line.slice(Math.max(0, idx - 30), idx),
              match: currentQuery,
              after: line.slice(idx + currentQuery.length, idx + currentQuery.length + 30),
            });
            start = idx + currentQuery.length;
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
