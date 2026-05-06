# Spec: Service Registry & Lifecycle Refactor (A.1) - EXHAUSTIVE TECHNICAL SPEC

## Objective
Transform functional index factories into native Obsidian `Component` classes. This ensures indices are managed by Obsidian's lifecycle (`addChild`, `onload`, `onunload`) and eliminates the "God Orchestrator" pattern in `main.ts` where manual event registration causes memory leaks.

---

## 1. Base Class: `src/index/indexNodeCreate.ts`

**Action:** Rewrite the functional factory into an abstract class inheriting from Obsidian's `Component`.

**Exact Implementation:**
```typescript
import { Component } from 'obsidian';
import type { INodeIndex, NodeBase } from '../types/typeContracts';

export abstract class IndexComponent<TNode extends NodeBase> extends Component implements INodeIndex<TNode> {
  protected _nodes: TNode[] = [];
  protected _byId = new Map<string, TNode>();
  protected subs = new Set<() => void>();
  protected refreshVersion = 0;

  get nodes(): readonly TNode[] {
    return this._nodes;
  }

  // Subclasses must implement the actual data fetching logic
  protected abstract build(): TNode[] | Promise<TNode[]>;

  async refresh(): Promise<void> {
    const currentVersion = ++this.refreshVersion;
    const built = await this.build();
    if (this.refreshVersion !== currentVersion) return;
    this._nodes = built;
    this._byId = new Map(built.map((n) => [n.id, n]));
    this.fire();
  }

  subscribe(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }

  byId(id: string): TNode | undefined {
    return this._byId.get(id);
  }

  protected fire(): void {
    for (const cb of this.subs) cb();
  }
}
```

---

## 2. Refactor FilesIndex: `src/index/indexFiles.ts`

**Action:** Refactor to class extending `IndexComponent` and register its own vault events.

**Exact Implementation:**
```typescript
import type { App } from 'obsidian';
import type { FileNode, IFilesIndex } from '../types/typeContracts';
import { IndexComponent } from './indexNodeCreate';

export class FilesIndex extends IndexComponent<FileNode> implements IFilesIndex {
  constructor(private app: App) {
    super();
  }

  onload() {
    this.registerEvent(this.app.vault.on('create', () => void this.refresh()));
    this.registerEvent(this.app.vault.on('delete', () => void this.refresh()));
    this.registerEvent(this.app.vault.on('rename', () => void this.refresh()));
    this.registerEvent(this.app.metadataCache.on('resolved', () => void this.refresh()));
  }

  protected build(): FileNode[] {
    return this.app.vault.getMarkdownFiles().map((file) => ({
      id: file.path,
      path: file.path,
      basename: file.basename,
      file,
    }));
  }
}
```

---

## 3. Refactor TagsIndex: `src/index/indexTags.ts`

**Action:** Refactor to class extending `IndexComponent`.

**Exact Implementation:**
```typescript
import type { App } from 'obsidian';
import type { TagNode, ITagsIndex } from '../types/typeContracts';
import { IndexComponent } from './indexNodeCreate';

export class TagsIndex extends IndexComponent<TagNode> implements ITagsIndex {
  constructor(private app: App) {
    super();
  }

  onload() {
    this.registerEvent(this.app.metadataCache.on('changed', () => void this.refresh()));
  }

  protected build(): TagNode[] {
    const counts = new Map<string, number>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) continue;
      const tags = (cache.tags ?? []).map((t) => t.tag);
      for (const t of tags) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([tag, count]) => ({
      id: tag,
      tag,
      count,
      parent: tag.includes('/') ? '#' + tag.slice(1).split('/').slice(0, -1).join('/') : undefined,
    }));
  }
}
```

---

## 4. Refactor PropsIndex: `src/index/indexProps.ts`

**Action:** Refactor to class extending `IndexComponent`.

**Exact Implementation:**
```typescript
import type { App } from 'obsidian';
import type { IPropsIndex, PropNode } from '../types/typeContracts';
import { IndexComponent } from './indexNodeCreate';

export class PropsIndex extends IndexComponent<PropNode> implements IPropsIndex {
  constructor(private app: App) {
    super();
  }

  onload() {
    this.registerEvent(this.app.metadataCache.on('changed', () => void this.refresh()));
  }

  protected build(): PropNode[] {
    const acc = new Map<string, { values: Set<string>; files: Set<string> }>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm) continue;
      for (const [key, val] of Object.entries(fm)) {
        if (key === 'position') continue;
        let entry = acc.get(key);
        if (!entry) {
          entry = { values: new Set(), files: new Set() };
          acc.set(key, entry);
        }
        entry.files.add(file.path);
        if (Array.isArray(val)) {
          for (const v of val) entry.values.add(String(v));
        } else if (val !== null && val !== undefined) {
          entry.values.add(String(val));
        }
      }
    }
    return Array.from(acc.entries()).map(([property, e]) => ({
      id: property,
      property,
      values: Array.from(e.values),
      fileCount: e.files.size,
    }));
  }
}
```

---

## 5. Refactor ContentIndex: `src/index/indexContent.ts`

**Action:** Extend `IndexComponent` and add custom `setQuery`.

**Exact Implementation:**
```typescript
import type { App } from 'obsidian';
import type { ContentMatch, IContentIndex } from '../types/typeContracts';
import { IndexComponent } from './indexNodeCreate';

export class ContentIndex extends IndexComponent<ContentMatch> implements IContentIndex {
  private query = '';
  private buildVersion = 0;

  constructor(private app: App) {
    super();
  }

  setQuery(q: string): void {
    if (this.query === q) return;
    this.query = q;
    void this.refresh();
  }

  protected async build(): Promise<ContentMatch[]> {
    const currentQuery = this.query;
    const searchQuery = currentQuery.toLowerCase();
    const currentVersion = ++this.buildVersion;
    if (!currentQuery.trim()) return [];
    
    const out: ContentMatch[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (this.buildVersion !== currentVersion) break;
      const content = await this.app.vault.read(file);
      if (this.buildVersion !== currentVersion) break;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const searchLine = line.toLowerCase();
        let start = 0;
        while (true) {
          const idx = searchLine.indexOf(searchQuery, start);
          if (idx === -1) break;
          const match = line.slice(idx, idx + currentQuery.length);
          out.push({
            id: `${file.path}:${i}:${idx}`,
            filePath: file.path,
            line: i,
            before: line.slice(Math.max(0, idx - 30), idx),
            match,
            after: line.slice(idx + currentQuery.length, idx + currentQuery.length + 30),
          });
          start = idx + currentQuery.length;
          if (start >= line.length) break;
        }
      }
    }
    return out;
  }
}
```

---

## 6. Clean up `main.ts`

**Action:** Remove explicit global event registrations and use `addChild` for the new classes.

**Targets in `src/main.ts`:**
1. Import the new classes `FilesIndex`, `TagsIndex`, `PropsIndex`, `ContentIndex`.
2. Locate `onload()` and replace `this.filesIndex = createFilesIndex(this.app);` block.

**Exact `onload` block Replacement:**
```typescript
		this.filesIndex = this.addChild(new FilesIndex(this.app));
		this.tagsIndex = this.addChild(new TagsIndex(this.app));
		this.propsIndex = this.addChild(new PropsIndex(this.app));
		
		await Promise.all([
			this.filesIndex.refresh(),
			this.tagsIndex.refresh(),
			this.propsIndex.refresh(),
		]);

		// DELETE the following lines from original:
		// this.registerEvent(this.app.metadataCache.on('changed', () => { ... }));
		// this.registerEvent(this.app.vault.on('create', () => ...));
		// this.registerEvent(this.app.vault.on('delete', () => ...));
		// this.registerEvent(this.app.vault.on('rename', () => ...));
		// this.registerEvent(this.app.metadataCache.on('resolved', () => { ... }));

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app, this.filesIndex);
		this.queueService = new OperationQueueService(this.app);

		this.contentIndex = this.addChild(new ContentIndex(this.app));
```
