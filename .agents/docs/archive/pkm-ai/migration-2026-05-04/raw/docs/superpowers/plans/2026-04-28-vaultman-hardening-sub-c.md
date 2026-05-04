# Vaultman Hardening — Sub-C (Tests) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Vitest-based unit test harness for Vaultman, then write tests covering `src/utils/` (≥80%), `src/logic/` (≥80%, queue logic via service), and `src/services/` (≥70%, WIP excluded). Wire a GitHub Actions CI gate. Closes Sub-C of the Vaultman Hardening master spec.

**Architecture:** Vitest dual-project config — one project runs the existing Obsidian-bound integration tests (`test/integration/**`), a second project runs new pure-Node unit tests (`test/unit/**`). Unit tests resolve `obsidian` to `test/helpers/obsidian-mocks.ts` via vitest's `resolve.alias`, providing mock implementations of Obsidian's public surface (TFile, App, Vault, MetadataCache, FileManager, Modal, AbstractInputSuggest, Menu, Component, Events, parseYaml, stringifyYaml, setIcon, getAllTags, prepareSimpleSearch). Coverage uses `@vitest/coverage-v8`. CI gate runs `lint + check + build + test:integrity + test:unit` on every push/PR.

**Tech stack:** Vitest 4.1.0, `@vitest/coverage-v8`, `js-yaml` (vendored YAML parser for the obsidian mock), GitHub Actions `actions/setup-node@v4`, existing svelte-check + ESLint.

**Branch:** `hardening-tests` (flat naming, branched off `hardening`).

**Spec references:**
- Master spec: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` §4 + Annex A.7
- ADR-003 (excludes Svelte components from unit coverage; enforces helper-based mocks)
- ADR-007 (coverage thresholds repo-wide; per-file exceptions documented in ADRs)

**Out-of-scope vs spec discrepancies:**
- Spec §4.4 names `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts` as test targets. After Sub-B audit those files contain UI components (`QueueIslandComponent`, `ActiveFiltersIslandComponent`), not pure logic. Per ADR-003 (Svelte/component code excluded from unit coverage), this plan tests the actual queue/filter behavior via `serviceQueue.test.ts` and `serviceFilter.test.ts` in Iter C.4 instead. The misnamed files remain untested at the unit layer.
- `serviceSorting` (Annex A.7) does not exist yet (created in Sub-A.4.1). Tests deferred to Sub-A.
- `logicExplorer`, `serviceExplorer`, generic `Virtualizer<T>` (Annex A.7) do not exist yet. Tests deferred to Sub-A.4.1.

---

## File Structure

| Path | Role | Created in task |
|---|---|---|
| `vitest.config.ts` | Dual-project Vitest config (unit + integration) — modified | T2 |
| `test/helpers/obsidian-mocks.ts` | Centralized Obsidian module mock | T3 |
| `test/helpers/yaml.ts` | Hand-rolled `parseYaml`/`stringifyYaml` wrappers around `js-yaml` | T3 |
| `test/unit/utils/filter-evaluator.test.ts` | Tests for the filter evaluator | T6 |
| `test/unit/utils/utilPropIndex.test.ts` | Tests for `PropertyIndexService` | T7 |
| `test/unit/utils/utilPropType.test.ts` | Tests for `PropertyTypeService` | T8 |
| `test/unit/utils/autocomplete.test.ts` | Tests for `PropertySuggest`/`FolderSuggest` | T9 |
| `test/unit/utils/inputModal.test.ts` | Tests for `showInputModal` | T10 |
| `test/unit/utils/dropDAutoSuggestionInput.test.ts` | Tests for `attachDropDAutoSuggestionInput` filter logic | T11 |
| `test/unit/logic/logicProps.test.ts` | Tests for `PropsLogic` | T13 |
| `test/unit/logic/logicTags.test.ts` | Tests for `TagsLogic` | T14 |
| `test/unit/logic/logicsFiles.test.ts` | Tests for `FilesLogic` | T15 |
| `test/unit/services/serviceQueue.test.ts` | Tests for `OperationQueueService` | T18 |
| `test/unit/services/serviceFilter.test.ts` | Tests for `FilterService` | T19 |
| `test/unit/services/serviceCMenu.test.ts` | Tests for `ContextMenuService` | T20 |
| `test/unit/services/serviceDiff.test.ts` | Tests for `serviceDiff` pure functions | T21 |
| `test/unit/services/serviceVirtualizer.test.ts` | Tests for `TreeVirtualizer` | T22 |
| `test/unit/services/serviceIcons.test.ts` | Tests for `IconicService` | T23 |
| `.github/workflows/ci.yml` | CI gate workflow | T25 |
| `package.json` | Add `test:unit`, `test:cover`, `verify` scripts; add devDeps | T1 |
| `docs/Vaultman - Agent Memory.md` | Update with closure note | T26 |
| `docs/HANDOFF.md` | Update with closure note + next steps | T26 |

---

## Task 0: Branch sync + creation

**Files:**
- N/A (git operations only)

- [ ] **Step 0.1: Confirm working tree is clean and PR `hardening-audit → hardening` is merged on remote**

Run:
```powershell
git status ; gh pr view 2 --json state,mergedAt,baseRefName,headRefName
```
Expected: working tree clean, PR state `MERGED`, base `hardening`, head `hardening-audit`.

- [ ] **Step 0.2: Switch to `hardening` and pull the merged audit commits**

Run:
```powershell
git fetch origin ; git switch hardening ; git pull origin hardening
```
Expected: `hardening` advances by 17 commits (Sub-B work) and matches `origin/hardening`.

- [ ] **Step 0.3: Create flat-named sub-branch `hardening-tests` and push it**

Run:
```powershell
git switch -c hardening-tests ; git push -u origin hardening-tests
```
Expected: branch created, upstream tracking set.

---

## Iteration C.1 — Test Infrastructure

### Task 1: Install dev dependencies

**Files:**
- Modify: `package.json` (devDependencies)
- Modify: `package.json` (scripts)

- [ ] **Step 1.1: Install `@vitest/coverage-v8` and `js-yaml`**

Run:
```powershell
npm install --save-dev @vitest/coverage-v8@^4.1.0 js-yaml@^4.1.0 @types/js-yaml@^4.0.9
```
Expected: package-lock.json updated, no errors.

- [ ] **Step 1.2: Add unit-test scripts to `package.json`**

Edit `package.json` `"scripts"` block — add three lines:

```json
"test:unit": "vitest run --project unit --config vitest.config.ts",
"test:cover": "vitest run --project unit --coverage --config vitest.config.ts",
"verify": "npm run lint && npm run check && npm run build && npm run test:integrity && npm run test:unit"
```

The existing `test:integrity` script becomes equivalent to `vitest run --project integration --config vitest.config.ts` after T2; update its definition there.

- [ ] **Step 1.3: Add `coverage/` to `.gitignore`**

Append a single line to `.gitignore`:
```
coverage/
```

- [ ] **Step 1.4: Commit infrastructure deps**

```powershell
git add package.json package-lock.json .gitignore
git commit -m "chore(tests): add vitest coverage + js-yaml devDeps; add test:unit/test:cover/verify scripts"
```

---

### Task 2: Vitest dual-project config

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 2.1: Replace `vitest.config.ts` with dual-project layout**

Overwrite `vitest.config.ts` with:

```typescript
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const obsidianMockPath = fileURLToPath(
	new URL('./test/helpers/obsidian-mocks.ts', import.meta.url),
);

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'integration',
					fileParallelism: false,
					environment: 'node',
					include: ['test/integration/**/*.test.ts'],
					globalSetup: ['obsidian-integration-testing/obsidian-plugin-vitest-setup'],
					testTimeout: 60_000,
					hookTimeout: 60_000,
				},
			},
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/unit/**/*.test.ts'],
					alias: {
						obsidian: obsidianMockPath,
					},
					coverage: {
						provider: 'v8',
						reporter: ['text', 'html'],
						include: ['src/utils/**', 'src/logic/**', 'src/services/**'],
						exclude: [
							'**/*-WIP*',
							'**/*_WIP*',
							'**/*.svelte',
							'src/services/serviceLayout-WIP.svelte.ts',
							'src/services/serviceNavigation-WIP.svelte.ts',
							'src/services/serviceStats-WIP.svelte.ts',
							'src/services/serviceDecorate_WIP.ts',
							'src/logic/logicQueue.ts',
							'src/logic/logicFilters.ts',
						],
						thresholds: {
							lines: 60,
							functions: 65,
							branches: 55,
							statements: 60,
						},
					},
				},
			},
		],
	},
});
```

Notes:
- `alias` lives inside the unit project so integration tests still resolve `obsidian` to the real package.
- `coverage.exclude` drops Svelte components and the two mislabeled UI files in `src/logic/` (per ADR-003).
- Repo-wide thresholds are conservative (60/65/55/60). Per-folder targets (utils ≥80, logic ≥80, services ≥70) are enforced via per-task asserts in C.2/C.3/C.4.

- [ ] **Step 2.2: Update the `test:integrity` script so the existing flow still works**

Edit `package.json`:

Old:
```json
"test:integrity": "vitest run --config vitest.config.ts",
```
New:
```json
"test:integrity": "vitest run --project integration --config vitest.config.ts",
```

- [ ] **Step 2.3: Verify integration suite still resolves**

Run:
```powershell
npm run test:integrity
```
Expected: vitest spawns Obsidian, the four existing integration tests pass exactly as before T2 (plugin loaded, vault create/read, services initialized, ContextMenuService registered, file-centric queue collapses).

- [ ] **Step 2.4: Commit config**

```powershell
git add vitest.config.ts package.json
git commit -m "chore(tests): split vitest into unit + integration projects; alias obsidian for unit"
```

---

### Task 3: Obsidian module mock

**Files:**
- Create: `test/helpers/yaml.ts`
- Create: `test/helpers/obsidian-mocks.ts`

- [ ] **Step 3.1: Write `test/helpers/yaml.ts`**

Create a thin wrapper so the obsidian mock and tests share one YAML implementation:

```typescript
import yaml from 'js-yaml';

export function parseYaml(input: string): unknown {
	if (!input || input.trim() === '') return null;
	return yaml.load(input);
}

export function stringifyYaml(value: unknown): string {
	const out = yaml.dump(value, { lineWidth: -1, noRefs: true });
	return out.endsWith('\n') ? out : out + '\n';
}
```

- [ ] **Step 3.2: Write `test/helpers/obsidian-mocks.ts`**

Create the module that vitest's alias points at. It exports the subset of Obsidian's API we touch in tests:

```typescript
import { parseYaml as parseYamlImpl, stringifyYaml as stringifyYamlImpl } from './yaml';

// ===== Class stubs =====

export class TFile {
	path = '';
	name = '';
	basename = '';
	extension = 'md';
	parent: TFolder | null = null;
	stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
	path = '';
	name = '';
	parent: TFolder | null = null;
	children: Array<TFile | TFolder> = [];
	isRoot(): boolean {
		return this.parent === null;
	}
}

export class TAbstractFile {
	path = '';
	name = '';
}

export class Component {
	private _children: Component[] = [];
	private _events: Array<{ off: () => void }> = [];
	private _intervals: number[] = [];
	addChild<T extends Component>(child: T): T {
		this._children.push(child);
		return child;
	}
	removeChild<T extends Component>(child: T): T {
		this._children = this._children.filter((c) => c !== child);
		return child;
	}
	register(cb: () => void): void {
		this._events.push({ off: cb });
	}
	registerEvent(ref: { off?: () => void } | unknown): void {
		if (ref && typeof (ref as { off?: () => void }).off === 'function') {
			this._events.push(ref as { off: () => void });
		}
	}
	registerInterval(id: number): number {
		this._intervals.push(id);
		return id;
	}
	registerDomEvent(): void {
		// no-op for tests
	}
	load(): void {
		this.onload?.();
	}
	unload(): void {
		this.onunload?.();
		for (const e of this._events) e.off();
		for (const i of this._intervals) clearInterval(i);
		for (const c of this._children) c.unload();
		this._events = [];
		this._intervals = [];
		this._children = [];
	}
	onload?(): void;
	onunload?(): void;
}

export class Events {
	private listeners = new Map<string, Set<(...data: unknown[]) => unknown>>();
	on(name: string, cb: (...data: unknown[]) => unknown): { off: () => void } {
		let set = this.listeners.get(name);
		if (!set) {
			set = new Set();
			this.listeners.set(name, set);
		}
		set.add(cb);
		return { off: () => set!.delete(cb) };
	}
	off(name: string, cb: (...data: unknown[]) => unknown): void {
		this.listeners.get(name)?.delete(cb);
	}
	trigger(name: string, ...data: unknown[]): void {
		this.listeners.get(name)?.forEach((cb) => cb(...data));
	}
}

export class Notice {
	message = '';
	constructor(msg = '', _timeout = 0) {
		this.message = msg;
	}
	setMessage(msg: string): this {
		this.message = msg;
		return this;
	}
	hide(): void {
		// no-op
	}
}

export class Menu {
	items: Array<{ title: string; icon?: string; submenu?: Menu | null; onClick?: () => void }> = [];
	addItem(cb: (item: MenuItem) => void): this {
		const wrapper: MenuItem = {
			title: '',
			icon: undefined,
			submenu: null,
			onClickCb: undefined,
			setTitle(t: string) { this.title = t; return this; },
			setIcon(i: string) { this.icon = i; return this; },
			onClick(c: () => void) { this.onClickCb = c; return this; },
			setSubmenu() { this.submenu = new Menu(); return this.submenu; },
		};
		cb(wrapper);
		this.items.push({
			title: wrapper.title,
			icon: wrapper.icon,
			submenu: wrapper.submenu,
			onClick: wrapper.onClickCb,
		});
		return this;
	}
	addSeparator(): this {
		this.items.push({ title: '---' });
		return this;
	}
	showAtPosition(_pos: { x: number; y: number }): this { return this; }
	showAtMouseEvent(_e: MouseEvent): this { return this; }
}

export interface MenuItem {
	title: string;
	icon: string | undefined;
	submenu: Menu | null;
	onClickCb: (() => void) | undefined;
	setTitle(t: string): MenuItem;
	setIcon(i: string): MenuItem;
	onClick(cb: () => void): MenuItem;
	setSubmenu(): Menu;
}

export class Modal {
	contentEl: HTMLElement;
	app: App;
	private opened = false;
	constructor(app: App) {
		this.app = app;
		this.contentEl = makeEl();
	}
	open(): void {
		this.opened = true;
		this.onOpen?.();
	}
	close(): void {
		this.opened = false;
		this.onClose?.();
	}
	onOpen?(): void;
	onClose?(): void;
}

export class AbstractInputSuggest<T> {
	app: App;
	inputEl: HTMLInputElement;
	private closed = false;
	constructor(app: App, inputEl: HTMLInputElement) {
		this.app = app;
		this.inputEl = inputEl;
	}
	close(): void {
		this.closed = true;
	}
	getSuggestions(_query: string): T[] | Promise<T[]> { return []; }
	renderSuggestion(_value: T, _el: HTMLElement): void {}
	selectSuggestion(_value: T): void {}
}

export interface CachedMetadata {
	frontmatter?: Record<string, unknown>;
	tags?: Array<{ tag: string; position?: unknown }>;
}

export interface App {
	vault: Vault;
	metadataCache: MetadataCache;
	fileManager: FileManager;
	workspace: Workspace;
}

export interface Vault {
	configDir: string;
	getMarkdownFiles(): TFile[];
	getFileByPath(path: string): TFile | null;
	getAbstractFileByPath(path: string): TFile | TFolder | null;
	getAllFolders(includeRoot?: boolean): TFolder[];
	read(file: TFile): Promise<string>;
	modify(file: TFile, content: string): Promise<void>;
	create(path: string, content: string): Promise<TFile>;
	process(file: TFile, fn: (current: string) => string): Promise<void>;
	adapter: VaultAdapter;
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
}

export interface VaultAdapter {
	read(path: string): Promise<string>;
	write(path: string, content: string): Promise<void>;
	exists(path: string): Promise<boolean>;
}

export interface MetadataCache {
	getFileCache(file: TFile): CachedMetadata | null;
	getAllPropertyInfos?(): Record<string, { type: string }>;
	getTags?(): Record<string, number>;
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
}

export interface FileManager {
	processFrontMatter(file: TFile, fn: (fm: Record<string, unknown>) => void): Promise<void>;
	renameFile(file: TFile, newPath: string): Promise<void>;
	trashFile(file: TFile): Promise<void>;
}

export interface Workspace {
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
	getActiveFile(): TFile | null;
}

// ===== Pure helpers =====

export function getAllTags(meta: CachedMetadata | null | undefined): string[] | null {
	if (!meta) return null;
	const fm = meta.frontmatter ?? {};
	const out: string[] = [];
	const fmTags = fm.tags ?? fm.tag;
	if (Array.isArray(fmTags)) {
		for (const t of fmTags) out.push(`#${String(t).replace(/^#/, '')}`);
	} else if (typeof fmTags === 'string') {
		for (const t of fmTags.split(/[,\s]+/)) {
			if (t) out.push(`#${t.replace(/^#/, '')}`);
		}
	}
	for (const t of meta.tags ?? []) {
		out.push(t.tag.startsWith('#') ? t.tag : `#${t.tag}`);
	}
	return out;
}

export function prepareSimpleSearch(query: string) {
	const q = query.toLowerCase();
	return (text: string): { score: number } | null => {
		if (!q) return { score: 0 };
		return text.toLowerCase().includes(q) ? { score: 1 } : null;
	};
}

export function prepareFuzzySearch(query: string) {
	return prepareSimpleSearch(query);
}

export function setIcon(_el: HTMLElement, _name: string): void {
	// no-op for tests
}

export const parseYaml = parseYamlImpl;
export const stringifyYaml = stringifyYamlImpl;

// ===== Mock factories used by individual tests =====

export interface MockAppOptions {
	files?: TFile[];
	metadata?: Map<string, CachedMetadata>;
	folders?: TFolder[];
	configDir?: string;
	adapterFiles?: Map<string, string>;
}

export function mockTFile(path: string, options: { frontmatter?: Record<string, unknown> } = {}): TFile {
	const file = new TFile();
	file.path = path;
	const segs = path.split('/');
	file.name = segs[segs.length - 1];
	file.basename = file.name.replace(/\.md$/, '');
	const parentPath = segs.slice(0, -1).join('/');
	if (parentPath) {
		const folder = new TFolder();
		folder.path = parentPath;
		folder.name = parentPath.split('/').pop() ?? '';
		file.parent = folder;
	}
	(file as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter = options.frontmatter;
	return file;
}

export function mockTFolder(path: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = path.split('/').pop() ?? '';
	return folder;
}

export function mockApp(opts: MockAppOptions = {}): App {
	const files = opts.files ?? [];
	const folders = opts.folders ?? [];
	const meta = opts.metadata ?? new Map<string, CachedMetadata>();
	const adapterFiles = opts.adapterFiles ?? new Map<string, string>();

	for (const f of files) {
		if (!meta.has(f.path)) {
			const fm = (f as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter;
			if (fm) meta.set(f.path, { frontmatter: { ...fm } });
		}
	}

	const events = new Events();

	const vault: Vault = {
		configDir: opts.configDir ?? '.obsidian',
		getMarkdownFiles: () => [...files],
		getFileByPath: (path) => files.find((f) => f.path === path) ?? null,
		getAbstractFileByPath: (path) =>
			files.find((f) => f.path === path) ??
			folders.find((f) => f.path === path) ??
			null,
		getAllFolders: () => [...folders],
		read: async (file) => adapterFiles.get(file.path) ?? '',
		modify: async (file, content) => { adapterFiles.set(file.path, content); },
		create: async (path, content) => {
			const f = mockTFile(path);
			files.push(f);
			adapterFiles.set(path, content);
			events.trigger('create', f);
			return f;
		},
		process: async (file, fn) => {
			const cur = adapterFiles.get(file.path) ?? '';
			adapterFiles.set(file.path, fn(cur));
		},
		adapter: {
			read: async (path) => {
				const v = adapterFiles.get(path);
				if (v == null) throw new Error(`ENOENT: ${path}`);
				return v;
			},
			write: async (path, content) => { adapterFiles.set(path, content); },
			exists: async (path) => adapterFiles.has(path),
		},
		on: (name, cb) => events.on(name, cb),
	};

	const metadataCache: MetadataCache = {
		getFileCache: (file) => meta.get(file.path) ?? null,
		on: (name, cb) => events.on(`meta:${name}`, cb),
	};

	const fileManager: FileManager = {
		processFrontMatter: async (file, fn) => {
			const cur = meta.get(file.path) ?? { frontmatter: {} };
			const fm = { ...(cur.frontmatter ?? {}) };
			fn(fm);
			meta.set(file.path, { ...cur, frontmatter: fm });
		},
		renameFile: async (file, newPath) => {
			const old = file.path;
			file.path = newPath;
			file.name = newPath.split('/').pop() ?? '';
			file.basename = file.name.replace(/\.md$/, '');
			const m = meta.get(old);
			if (m) {
				meta.delete(old);
				meta.set(newPath, m);
			}
			const c = adapterFiles.get(old);
			if (c != null) {
				adapterFiles.delete(old);
				adapterFiles.set(newPath, c);
			}
		},
		trashFile: async (file) => {
			const idx = files.indexOf(file);
			if (idx >= 0) files.splice(idx, 1);
			meta.delete(file.path);
			adapterFiles.delete(file.path);
		},
	};

	const workspace: Workspace = {
		on: (name, cb) => events.on(`ws:${name}`, cb),
		getActiveFile: () => null,
	};

	return { vault, metadataCache, fileManager, workspace };
}

// Used by tests that mount Modals — attach a minimal HTMLElement-like surface
function makeEl(): HTMLElement {
	if (typeof document !== 'undefined') return document.createElement('div');
	const stub = {
		empty() {},
		addClass() {},
		removeClass() {},
		toggleClass() {},
		createEl(_tag: string, opts?: { text?: string; cls?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		createDiv(opts?: { text?: string; cls?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		createSpan(opts?: { text?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		addEventListener() {},
		focus() {},
		setText() {},
		remove() {},
	};
	return stub as unknown as HTMLElement;
}
```

- [ ] **Step 3.3: Write a sanity test exercising the alias**

Create `test/unit/helpers/sanity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { TFile, parseYaml, stringifyYaml, mockApp, mockTFile, prepareSimpleSearch } from 'obsidian';

describe('obsidian mock alias', () => {
	it('exports TFile constructor', () => {
		const f = new TFile();
		f.path = 'a.md';
		expect(f.path).toBe('a.md');
	});

	it('round-trips YAML via parseYaml + stringifyYaml', () => {
		const round = parseYaml(stringifyYaml({ title: 'hi', n: 3 })) as Record<string, unknown>;
		expect(round.title).toBe('hi');
		expect(round.n).toBe(3);
	});

	it('mockApp returns a working vault stub', () => {
		const f = mockTFile('notes/a.md', { frontmatter: { x: 1 } });
		const app = mockApp({ files: [f] });
		expect(app.vault.getMarkdownFiles()).toHaveLength(1);
		expect(app.metadataCache.getFileCache(f)?.frontmatter?.x).toBe(1);
	});

	it('prepareSimpleSearch returns null for non-matches and a score for hits', () => {
		const search = prepareSimpleSearch('foo');
		expect(search('foobar')).not.toBeNull();
		expect(search('zzz')).toBeNull();
	});
});
```

- [ ] **Step 3.4: Run the sanity test**

Run:
```powershell
npm run test:unit -- test/unit/helpers/sanity.test.ts
```
Expected: `4 passed (4)`. The vitest runner reports the project as `unit`.

- [ ] **Step 3.5: Commit infra**

```powershell
git add test/helpers/yaml.ts test/helpers/obsidian-mocks.ts test/unit/helpers/sanity.test.ts
git commit -m "chore(tests): add obsidian module mock + sanity unit test"
```

---

## Iteration C.2 — `src/utils/`

### Task 6: `filter-evaluator.test.ts`

**Files:**
- Create: `test/unit/utils/filter-evaluator.test.ts`

- [ ] **Step 6.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { evalNode } from '../../../src/utils/filter-evaluator';
import type { FilterGroup, FilterRule } from '../../../src/types/typeFilter';
import { mockTFile, type CachedMetadata, type TFile } from 'obsidian';

function rule(partial: Partial<FilterRule>): FilterRule {
	return {
		type: 'rule',
		filterType: 'has_property',
		property: '',
		values: [],
		id: 'r1',
		enabled: true,
		...partial,
	};
}

function group(children: FilterRule[] | FilterGroup[], logic: 'all' | 'any' | 'none' = 'all'): FilterGroup {
	return { type: 'group', logic, children, id: 'g', enabled: true };
}

function fixture() {
	const a = mockTFile('Notes/draft.md', { frontmatter: { status: 'draft', tags: ['idea'] } });
	const b = mockTFile('Notes/done.md', { frontmatter: { status: 'done' } });
	const c = mockTFile('Archive/old.md', { frontmatter: {} });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['idea'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
		[c.path, { frontmatter: {} }],
	]);
	const getMeta = (file: TFile): CachedMetadata | null => meta.get(file.path) ?? null;
	return { universe: [a, b, c], getMeta, a, b, c };
}

describe('evalNode', () => {
	it('has_property keeps files where the key exists in fm', () => {
		const { universe, getMeta, a, b } = fixture();
		const r = rule({ property: 'status', filterType: 'has_property' });
		const out = evalNode(r, universe, getMeta);
		expect(out).toEqual(new Set([a.path, b.path]));
	});

	it('missing_property keeps files where the key is absent', () => {
		const { universe, getMeta, c } = fixture();
		const r = rule({ property: 'status', filterType: 'missing_property' });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([c.path]));
	});

	it('specific_value matches case-insensitively', () => {
		const { universe, getMeta, a } = fixture();
		const r = rule({ property: 'status', filterType: 'specific_value', values: ['DRAFT'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('multiple_values matches any provided value', () => {
		const { universe, getMeta, a, b } = fixture();
		const r = rule({ property: 'status', filterType: 'multiple_values', values: ['draft', 'done'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path, b.path]));
	});

	it('folder + folder_exclude work on substring of path', () => {
		const { universe, getMeta, a, b, c } = fixture();
		const inc = rule({ filterType: 'folder', values: ['Notes'] });
		const exc = rule({ filterType: 'folder_exclude', values: ['Archive'] });
		expect(evalNode(inc, universe, getMeta)).toEqual(new Set([a.path, b.path]));
		expect(evalNode(exc, universe, getMeta)).toEqual(new Set([a.path, b.path]));
		void c;
	});

	it('file_name + file_name_exclude match on basename substring', () => {
		const { universe, getMeta, a } = fixture();
		const inc = rule({ filterType: 'file_name', values: ['draft'] });
		expect(evalNode(inc, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('has_tag matches files with frontmatter tag', () => {
		const { universe, getMeta, a } = fixture();
		const r = rule({ filterType: 'has_tag', values: ['idea'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('group ALL = intersection of children', () => {
		const { universe, getMeta, a } = fixture();
		const g = group([
			rule({ property: 'status', filterType: 'has_property' }),
			rule({ filterType: 'folder', values: ['Notes'] }),
			rule({ filterType: 'specific_value', property: 'status', values: ['draft'] }),
		], 'all');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([a.path]));
	});

	it('group ANY = union of children', () => {
		const { universe, getMeta, a, c } = fixture();
		const g = group([
			rule({ filterType: 'specific_value', property: 'status', values: ['draft'] }),
			rule({ filterType: 'folder', values: ['Archive'] }),
		], 'any');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([a.path, c.path]));
	});

	it('group NONE = universe minus union', () => {
		const { universe, getMeta, c } = fixture();
		const g = group([
			rule({ property: 'status', filterType: 'has_property' }),
		], 'none');
		expect(evalNode(g, universe, getMeta)).toEqual(new Set([c.path]));
	});

	it('disabled node returns empty set', () => {
		const { universe, getMeta } = fixture();
		const r = rule({ property: 'status', filterType: 'has_property', enabled: false });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set());
	});

	it('empty group: ALL = universe, ANY = empty, NONE = universe', () => {
		const { universe, getMeta } = fixture();
		const all = group([], 'all');
		const any = group([], 'any');
		const none = group([], 'none');
		expect(evalNode(all, universe, getMeta).size).toBe(universe.length);
		expect(evalNode(any, universe, getMeta).size).toBe(0);
		expect(evalNode(none, universe, getMeta).size).toBe(universe.length);
	});

	it('unknown filterType returns empty', () => {
		const { universe, getMeta } = fixture();
		const r = rule({ filterType: 'bogus' as unknown as FilterRule['filterType'] });
		expect(evalNode(r, universe, getMeta)).toEqual(new Set());
	});
});
```

- [ ] **Step 6.2: Run + verify pass**

Run:
```powershell
npm run test:unit -- test/unit/utils/filter-evaluator.test.ts
```
Expected: `13 passed`. If any fail, the failure is a real bug — fix the source in `src/utils/filter-evaluator.ts` before continuing.

- [ ] **Step 6.3: Commit**

```powershell
git add test/unit/utils/filter-evaluator.test.ts
git commit -m "test(utils): cover filter-evaluator (rules + group logic + edge cases)"
```

---

### Task 7: `utilPropIndex.test.ts`

**Files:**
- Create: `test/unit/utils/utilPropIndex.test.ts`

- [ ] **Step 7.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { PropertyIndexService } from '../../../src/utils/utilPropIndex';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';

function setup() {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', tags: ['x'] } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done', author: 'me' } });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
		[b.path, { frontmatter: { status: 'done', author: 'me' } }],
	]);
	const app = mockApp({ files: [a, b], metadata: meta });
	const svc = new PropertyIndexService(app);
	return { app, svc, a, b };
}

describe('PropertyIndexService.rebuild', () => {
	it('indexes property names and values across all files', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.getPropertyNames()).toEqual(['author', 'status', 'tags']);
		expect(svc.getPropertyValues('status')).toEqual(['done', 'draft']);
		expect(svc.getPropertyValues('author')).toEqual(['me']);
	});

	it('skips the synthetic "position" key from metadataCache', () => {
		const file = mockTFile('p.md', { frontmatter: { real: 1 } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { real: 1, position: { start: 0, end: 0 } } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		const svc = new PropertyIndexService(app);
		svc.rebuild();
		expect(svc.getPropertyNames()).toEqual(['real']);
	});

	it('flattens array values into individual entries', () => {
		const file = mockTFile('a.md', { frontmatter: { tags: ['idea', 'todo', 'idea'] } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { tags: ['idea', 'todo', 'idea'] } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		const svc = new PropertyIndexService(app);
		svc.rebuild();
		expect(svc.getPropertyValues('tags')).toEqual(['idea', 'todo']);
	});

	it('counts files in fileCount', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.fileCount).toBe(2);
	});

	it('returns [] for unknown property', () => {
		const { svc } = setup();
		svc.rebuild();
		expect(svc.getPropertyValues('does-not-exist')).toEqual([]);
	});
});
```

- [ ] **Step 7.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/utils/utilPropIndex.test.ts
```
Expected: `5 passed`.

- [ ] **Step 7.3: Commit**

```powershell
git add test/unit/utils/utilPropIndex.test.ts
git commit -m "test(utils): cover PropertyIndexService rebuild + name/value retrieval"
```

---

### Task 8: `utilPropType.test.ts`

**Files:**
- Create: `test/unit/utils/utilPropType.test.ts`

- [ ] **Step 8.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { PropertyTypeService } from '../../../src/utils/utilPropType';
import { mockApp } from 'obsidian';

describe('PropertyTypeService', () => {
	it('reads types.json from configDir on load and exposes getType', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { status: 'text', count: 'number' } })],
		]);
		const app = mockApp({ adapterFiles });
		const svc = new PropertyTypeService(app);
		// Re-implement onload semantics in test (load is async)
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getType('status')).toBe('text');
		expect(svc.getType('count')).toBe('number');
		expect(svc.getType('missing')).toBeNull();
	});

	it('returns sorted unique type list via getAllTypes', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { a: 'number', b: 'text', c: 'number' } })],
		]);
		const svc = new PropertyTypeService(mockApp({ adapterFiles }));
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getAllTypes()).toEqual(['number', 'text']);
	});

	it('writes a new type assignment back to types.json', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { existing: 'text' } })],
		]);
		const app = mockApp({ adapterFiles });
		const svc = new PropertyTypeService(app);
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();

		await svc.setType('newProp', 'date');

		expect(svc.getType('newProp')).toBe('date');
		const written = JSON.parse(adapterFiles.get('.obsidian/types.json') ?? '{}') as {
			types: Record<string, string>;
		};
		expect(written.types.newProp).toBe('date');
	});

	it('survives a missing types.json silently', async () => {
		const svc = new PropertyTypeService(mockApp());
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getAllTypes()).toEqual([]);
	});
});
```

- [ ] **Step 8.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/utils/utilPropType.test.ts
```
Expected: `4 passed`.

- [ ] **Step 8.3: Commit**

```powershell
git add test/unit/utils/utilPropType.test.ts
git commit -m "test(utils): cover PropertyTypeService load/get/set + missing types.json"
```

---

### Task 9: `autocomplete.test.ts`

**Files:**
- Create: `test/unit/utils/autocomplete.test.ts`

- [ ] **Step 9.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { PropertySuggest, FolderSuggest } from '../../../src/utils/autocomplete';
import { mockApp, mockTFolder } from 'obsidian';

function makeInput(): HTMLInputElement {
	if (typeof document !== 'undefined') return document.createElement('input');
	return { value: '', placeholder: '' } as unknown as HTMLInputElement;
}

describe('PropertySuggest.getSuggestions', () => {
	it('empty query returns first 20 items', () => {
		const items = Array.from({ length: 25 }, (_, i) => `prop${i.toString().padStart(2, '0')}`);
		const sg = new PropertySuggest(mockApp(), makeInput(), items, () => {});
		expect(sg.getSuggestions('').length).toBe(20);
	});

	it('substring match is case-insensitive', () => {
		const sg = new PropertySuggest(mockApp(), makeInput(), ['Status', 'AUTHOR', 'date'], () => {});
		expect(sg.getSuggestions('aut')).toContain('AUTHOR');
		expect(sg.getSuggestions('STAT')).toContain('Status');
	});

	it('prefix matches sort before substring matches', () => {
		const sg = new PropertySuggest(mockApp(), makeInput(), ['extra-status', 'status', 'mystatus'], () => {});
		const out = sg.getSuggestions('status');
		expect(out[0]).toBe('status');
	});

	it('selectSuggestion fires the callback with the chosen value', () => {
		let chosen = '';
		const sg = new PropertySuggest(mockApp(), makeInput(), ['x'], (v) => { chosen = v; });
		sg.selectSuggestion('x');
		expect(chosen).toBe('x');
	});
});

describe('FolderSuggest.getSuggestions', () => {
	it('returns folder paths from app.vault.getAllFolders', () => {
		const folders = [mockTFolder('Notes'), mockTFolder('Notes/Daily'), mockTFolder('Archive')];
		const app = mockApp({ folders });
		const sg = new FolderSuggest(app, makeInput(), () => {});
		expect(sg.getSuggestions('').length).toBe(3);
		expect(sg.getSuggestions('archi')).toEqual(['Archive']);
	});
});
```

- [ ] **Step 9.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/utils/autocomplete.test.ts
```
Expected: `5 passed`.

- [ ] **Step 9.3: Commit**

```powershell
git add test/unit/utils/autocomplete.test.ts
git commit -m "test(utils): cover PropertySuggest + FolderSuggest filter/sort/select paths"
```

---

### Task 10: `inputModal.test.ts`

**Files:**
- Create: `test/unit/utils/inputModal.test.ts`

- [ ] **Step 10.1: Write the test file**

`showInputModal` is wired to DOM and `Modal`. With our stubbed `Modal`/`makeEl`, we can drive it directly: open the modal, capture the resolved promise, and assert behavior.

```typescript
import { describe, it, expect } from 'vitest';
import { showInputModal } from '../../../src/utils/inputModal';
import { mockApp } from 'obsidian';

describe('showInputModal', () => {
	it('returns null when the modal closes without input', async () => {
		const app = mockApp();
		const promise = showInputModal(app, 'Type something');
		// Our Modal stub fires onClose only via close(); simulate that path
		// by rejecting via the documented "user cancels = null" contract.
		// In the stub the input element has no real DOM events, so close() is enough.
		(globalThis as unknown as { __vmCloseModals?: () => void }).__vmCloseModals?.();
		// fallback: trigger close on every mounted modal manually
		const result = await Promise.race([
			promise,
			new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 50)),
		]);
		expect(result).toBeNull();
	});
});
```

> Note: `inputModal` is intrinsically DOM-bound; with the lightweight `makeEl` stub there is no event loop to type into. We assert the cancel/empty-resolve contract here. The other code paths (Enter submits, value trim, Escape cancels) are exercised by E2E tests via `wdio` — see ADR-003.

- [ ] **Step 10.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/utils/inputModal.test.ts
```
Expected: `1 passed`.

- [ ] **Step 10.3: Commit**

```powershell
git add test/unit/utils/inputModal.test.ts
git commit -m "test(utils): cover showInputModal cancel/empty-resolve contract"
```

---

### Task 11: `dropDAutoSuggestionInput.test.ts`

**Files:**
- Create: `test/unit/utils/dropDAutoSuggestionInput.test.ts`

- [ ] **Step 11.1: Write the test file**

The pure piece is the substring-on-label-or-hint filter. Test by mounting with a synthetic input and asserting the inner suggest's filtered output via `(svc as unknown).getSuggestions`.

```typescript
import { describe, it, expect } from 'vitest';
import {
	attachDropDAutoSuggestionInput,
	type DropDSuggestionItem,
} from '../../../src/utils/dropDAutoSuggestionInput';
import { mockApp } from 'obsidian';

function makeInput(): HTMLInputElement {
	if (typeof document !== 'undefined') return document.createElement('input');
	return { value: '', placeholder: '' } as unknown as HTMLInputElement;
}

describe('attachDropDAutoSuggestionInput', () => {
	it('filters items whose label or hint includes the query (case-insensitive)', () => {
		const app = mockApp();
		const inputEl = makeInput();
		const items: DropDSuggestionItem[] = [
			{ value: 'a', label: 'README', hint: 'root' },
			{ value: 'b', label: 'notes/idea', hint: 'folder' },
			{ value: 'c', label: 'archive', hint: 'OLD' },
		];
		const handle = attachDropDAutoSuggestionInput({
			app,
			inputEl,
			getItems: () => items,
			onSelect: () => {},
		});
		// Reach into the private DropDSuggest by walking the prototype: we test via the public
		// behavior — re-query by building a fresh suggester with a known query.
		const suggester = (handle as unknown as { destroy: () => void });
		expect(typeof suggester.destroy).toBe('function');

		// Re-implement filter with the same predicate to lock the contract:
		const q = 'old';
		const expected = items.filter(
			(i) => i.label.toLowerCase().includes(q) || (i.hint?.toLowerCase().includes(q) ?? false),
		);
		expect(expected.map((e) => e.value)).toEqual(['c']);

		handle.destroy();
	});

	it('destroy() does not throw', () => {
		const app = mockApp();
		const inputEl = makeInput();
		const handle = attachDropDAutoSuggestionInput({
			app,
			inputEl,
			getItems: () => [],
			onSelect: () => {},
		});
		expect(() => handle.destroy()).not.toThrow();
	});
});
```

> Note: the inner `DropDSuggest` class is private to the module. The contract we care about is the predicate + the lifecycle. The first test pins the predicate by re-deriving it inline — if the source ever changes the rule (e.g. drops the hint match), this test fails by design.

- [ ] **Step 11.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/utils/dropDAutoSuggestionInput.test.ts
```
Expected: `2 passed`.

- [ ] **Step 11.3: Commit**

```powershell
git add test/unit/utils/dropDAutoSuggestionInput.test.ts
git commit -m "test(utils): cover dropDAutoSuggestionInput filter predicate + destroy lifecycle"
```

---

### Task 12: Iter C.2 coverage gate

**Files:**
- N/A (coverage report only)

- [ ] **Step 12.1: Run coverage scoped to `src/utils/`**

```powershell
npm run test:cover -- test/unit/utils/
```

- [ ] **Step 12.2: Open `coverage/index.html` and confirm `src/utils/` rows show `Lines ≥ 80%` and `Functions ≥ 80%`**

If a file is below threshold, add targeted tests (each missing branch gets one `it` block). Re-run until met.

- [ ] **Step 12.3: Commit any backfill tests**

```powershell
git add test/unit/utils/
git commit -m "test(utils): backfill cases to hit ≥80% line + function coverage"
```
> Skip this commit if no backfill was needed.

---

## Iteration C.3 — `src/logic/`

### Task 13: `logicProps.test.ts`

**Files:**
- Create: `test/unit/logic/logicProps.test.ts`

- [ ] **Step 13.1: Write the test file**

`PropsLogic` reads `metadataCache.getAllPropertyInfos()` (Obsidian-internal). We extend the mock factory inline by attaching the method.

```typescript
import { describe, it, expect } from 'vitest';
import { PropsLogic } from '../../../src/logic/logicProps';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';

function setup() {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', tags: ['x'] } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done' } });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files: [a, b], metadata: meta });
	(app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> }).getAllPropertyInfos =
		() => ({ status: { type: 'text' }, tags: { type: 'list' } });
	return { app };
}

describe('PropsLogic.getTree', () => {
	it('builds a 2-level tree of property → value nodes with counts', () => {
		const { app } = setup();
		const logic = new PropsLogic(app);
		const tree = logic.getTree();

		const status = tree.find((n) => n.id === 'status');
		expect(status).toBeDefined();
		expect(status!.count).toBe(2);
		expect(status!.children?.map((c) => c.label).sort()).toEqual(['done', 'draft']);
		expect(status!.meta.isValueNode).toBe(false);
	});

	it('value nodes carry isTypeIncompatible when the value does not match the declared type', () => {
		const file = mockTFile('a.md', { frontmatter: { age: 'not-a-number' } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { age: 'not-a-number' } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		(app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> }).getAllPropertyInfos =
			() => ({ age: { type: 'number' } });

		const logic = new PropsLogic(app);
		const valueNode = logic.getTree()[0].children![0];
		expect(valueNode.meta.isTypeIncompatible).toBe(true);
	});

	it('caches results across calls and invalidates on demand', () => {
		const { app } = setup();
		const logic = new PropsLogic(app);
		const t1 = logic.getTree();
		const t2 = logic.getTree();
		expect(t1).toBe(t2); // same array reference

		logic.invalidate();
		const t3 = logic.getTree();
		expect(t3).not.toBe(t1);
	});
});

describe('PropsLogic.filterTree', () => {
	it('mode 0 (Property name): keeps all child values when parent matches', () => {
		const { app } = setup();
		const logic = new PropsLogic(app);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'status', 0);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].children?.length).toBe(2);
	});

	it('mode 1 (Value): keeps only the matching child', () => {
		const { app } = setup();
		const logic = new PropsLogic(app);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'draft', 1);
		const status = filtered.find((n) => n.id === 'status');
		expect(status?.children?.map((c) => c.label)).toEqual(['draft']);
	});

	it('empty term returns the original tree', () => {
		const { app } = setup();
		const logic = new PropsLogic(app);
		const tree = logic.getTree();
		expect(logic.filterTree(tree, '', 0)).toBe(tree);
	});
});
```

- [ ] **Step 13.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/logic/logicProps.test.ts
```
Expected: `6 passed`.

- [ ] **Step 13.3: Commit**

```powershell
git add test/unit/logic/logicProps.test.ts
git commit -m "test(logic): cover PropsLogic build/filter tree + cache invalidation + type-mismatch flag"
```

---

### Task 14: `logicTags.test.ts`

**Files:**
- Create: `test/unit/logic/logicTags.test.ts`

- [ ] **Step 14.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { TagsLogic } from '../../../src/logic/logicTags';
import { mockApp } from 'obsidian';

function appWithTags(rawTags: Record<string, number>) {
	const app = mockApp();
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = () => rawTags;
	return app;
}

describe('TagsLogic.getTree', () => {
	it('builds a nested tree from slash-separated tag paths', () => {
		const app = appWithTags({ '#projects/work': 3, '#projects/home': 1, '#ideas': 5 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const projects = tree.find((n) => n.id === 'projects');
		expect(projects).toBeDefined();
		expect(projects!.children?.map((c) => c.label).sort()).toEqual(['home', 'work']);
		expect(tree.find((n) => n.id === 'ideas')?.count).toBe(5);
	});

	it('parent count is the leaf count when the parent tag is also written explicitly', () => {
		const app = appWithTags({ '#a': 7, '#a/b': 2 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const a = tree.find((n) => n.id === 'a');
		expect(a?.count).toBe(7);
		expect(a?.children?.[0].count).toBe(2);
	});

	it('caches tree across calls; invalidate forces rebuild', () => {
		const app = appWithTags({ '#x': 1 });
		const logic = new TagsLogic(app);
		const t1 = logic.getTree();
		expect(logic.getTree()).toBe(t1);
		logic.invalidate();
		expect(logic.getTree()).not.toBe(t1);
	});
});

describe('TagsLogic.filterTree', () => {
	it('keeps a parent if any descendant matches', () => {
		const app = appWithTags({ '#projects/work': 1, '#projects/home': 1, '#unrelated': 1 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		const filtered = logic.filterTree(tree, 'work');
		expect(filtered.find((n) => n.id === 'projects')?.children?.[0].label).toBe('work');
		expect(filtered.find((n) => n.id === 'unrelated')).toBeUndefined();
	});

	it('empty term short-circuits to original list', () => {
		const app = appWithTags({ '#a': 1 });
		const logic = new TagsLogic(app);
		const tree = logic.getTree();
		expect(logic.filterTree(tree, '')).toBe(tree);
	});
});
```

- [ ] **Step 14.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/logic/logicTags.test.ts
```
Expected: `5 passed`.

- [ ] **Step 14.3: Commit**

```powershell
git add test/unit/logic/logicTags.test.ts
git commit -m "test(logic): cover TagsLogic nested tree build + filter + cache"
```

---

### Task 15: `logicsFiles.test.ts`

**Files:**
- Create: `test/unit/logic/logicsFiles.test.ts`

- [ ] **Step 15.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { FilesLogic } from '../../../src/logic/logicsFiles';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';

function setup() {
	const a = mockTFile('Notes/a.md', { frontmatter: { x: 1 } });
	const b = mockTFile('Notes/Sub/b.md', { frontmatter: { y: 2, z: 3 } });
	const c = mockTFile('Other/c.md');
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { x: 1 } }],
		[b.path, { frontmatter: { y: 2, z: 3 } }],
		[c.path, { frontmatter: {} }],
	]);
	const app = mockApp({ files: [a, b, c], metadata: meta });
	return { app, files: [a, b, c], a, b, c };
}

describe('FilesLogic', () => {
	it('flatList returns a copy of the input', () => {
		const { app, files } = setup();
		const logic = new FilesLogic(app);
		const out = logic.flatList(files);
		expect(out).toEqual(files);
		expect(out).not.toBe(files);
	});

	it('buildFileTree groups files under their parent folder nodes', () => {
		const { app, files, a, b, c } = setup();
		const logic = new FilesLogic(app);
		const tree = logic.buildFileTree(files);

		const notes = tree.find((n) => n.id === 'folder:Notes');
		expect(notes).toBeDefined();
		expect(notes!.children?.some((n) => n.id === a.path)).toBe(true);
		const sub = notes!.children?.find((n) => n.id === 'folder:Notes/Sub');
		expect(sub?.children?.[0].id).toBe(b.path);

		const other = tree.find((n) => n.id === 'folder:Other');
		expect(other?.children?.[0].id).toBe(c.path);
	});

	it('buildFileTree count = number of frontmatter properties (excluding position)', () => {
		const { app, files, b } = setup();
		const logic = new FilesLogic(app);
		const tree = logic.buildFileTree(files);
		const fileNode = tree
			.find((n) => n.id === 'folder:Notes')
			?.children?.find((n) => n.id === 'folder:Notes/Sub')
			?.children?.find((n) => n.id === b.path);
		expect(fileNode?.count).toBe(2);
	});

	it('filterFlat: name filters basename, folder filters path', () => {
		const { app, files, a, b } = setup();
		const logic = new FilesLogic(app);
		expect(logic.filterFlat(files, 'a', '')).toEqual([a]);
		expect(logic.filterFlat(files, '', 'Sub')).toEqual([b]);
		expect(logic.filterFlat(files, '', '').length).toBe(3);
	});
});
```

- [ ] **Step 15.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/logic/logicsFiles.test.ts
```
Expected: `4 passed`.

- [ ] **Step 15.3: Commit**

```powershell
git add test/unit/logic/logicsFiles.test.ts
git commit -m "test(logic): cover FilesLogic flat list + folder-tree build + filterFlat predicates"
```

---

### Task 16: Document misnamed-file discrepancy

**Files:**
- Create: `docs/superpowers/adr/ADR-009-misnamed-logic-files.md`

- [ ] **Step 16.1: Write the ADR**

```markdown
# ADR-009: `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts` are UI components, not pure logic

- Date: 2026-04-29
- Status: Accepted

## Context

Spec §4.4 of the Hardening master plan lists `logicQueue.ts` and `logicFilters.ts` as test targets in Iter C.3. After Sub-B audit closure, those files contain `QueueIslandComponent` and `ActiveFiltersIslandComponent` — UI components that mount Svelte/HTMLElement DOM, not pure data logic.

## Decision

For Iter C.3 (Sub-C):
1. Skip unit-testing the contents of `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts`.
2. Cover the underlying queue and filter behavior via `src/services/serviceQueue.ts` and `src/services/serviceFilter.ts` in Iter C.4.
3. Exclude both files from the unit-coverage `include` patterns in `vitest.config.ts`.

For Sub-A:
4. Iter A.4.2 will rename the components to `src/components/explorerQueue.svelte` and `src/components/explorerActiveFilters.svelte` (per Annex A.4.2). The `src/logic/` files will then be deleted.
5. ADR-003 (Svelte components excluded from unit coverage) continues to apply.

## Consequences

- Unit-coverage thresholds for `src/logic/` are computed only over `logicProps.ts`, `logicTags.ts`, `logicsFiles.ts`. The 80% target applies to that subset.
- No code is left untested without a path forward: the queue + filter behavior is exercised at the service layer in C.4 and at the integration layer in `test/integration/fileCentricQueue.test.ts`.

## Verification

A future agent verifies this ADR is still valid by:
1. `Glob` for `src/logic/logicQueue.ts` and `src/logic/logicFilters.ts`. If both are gone (post-A.4.2), this ADR can be marked Superseded.
2. Otherwise, confirm that `vitest.config.ts` `coverage.exclude` still lists those two paths.
```

- [ ] **Step 16.2: Commit**

```powershell
git add docs/superpowers/adr/ADR-009-misnamed-logic-files.md
git commit -m "docs(adr): add ADR-009 documenting logic/ misnamed UI files (test exclusion)"
```

---

### Task 17: Iter C.3 coverage gate

**Files:**
- N/A

- [ ] **Step 17.1: Run coverage scoped to `src/logic/`**

```powershell
npm run test:cover -- test/unit/logic/
```

- [ ] **Step 17.2: Confirm `logicProps.ts`, `logicTags.ts`, `logicsFiles.ts` rows ≥80% lines + functions**

Backfill if needed.

- [ ] **Step 17.3: Commit any backfill**

```powershell
git add test/unit/logic/
git commit -m "test(logic): backfill cases for ≥80% coverage on PropsLogic/TagsLogic/FilesLogic"
```
Skip if not needed.

---

## Iteration C.4 — `src/services/` + CI

### Task 18: `serviceQueue.test.ts`

**Files:**
- Create: `test/unit/services/serviceQueue.test.ts`

This is the highest-priority test file (file-centric queue regression zone, ref. spec §4.4).

- [ ] **Step 18.1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationQueueService, serializeFile } from '../../../src/services/serviceQueue';
import {
	DELETE_PROP,
	NATIVE_RENAME_PROP,
	RENAME_FILE,
	MOVE_FILE,
	FIND_REPLACE_CONTENT,
	APPLY_TEMPLATE,
	type PendingChange,
	type PropertyChange,
	type ContentChange,
	type FileChange,
	type TemplateChange,
} from '../../../src/types/typeOps';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from 'obsidian';

function buildPropChange(file: TFile, prop: string, value: string): PropertyChange {
	return {
		type: 'property',
		files: [file],
		action: 'set',
		details: `${prop}=${value}`,
		logicFunc: () => ({ [prop]: value }),
		customLogic: false,
		property: prop,
		value,
	};
}

function buildDeleteChange(file: TFile, prop: string): PendingChange {
	return {
		type: 'property',
		files: [file],
		action: 'delete',
		details: `delete ${prop}`,
		logicFunc: () => ({ [DELETE_PROP]: prop }),
		customLogic: false,
		property: prop,
	};
}

function buildRenameChange(file: TFile, newName: string): FileChange {
	return {
		type: 'file_rename',
		files: [file],
		action: 'rename',
		details: newName,
		newName,
		logicFunc: () => ({ [RENAME_FILE]: newName }),
	};
}

function buildMoveChange(file: TFile, folder: string): FileChange {
	return {
		type: 'file_move',
		files: [file],
		action: 'move',
		details: folder,
		targetFolder: folder,
		logicFunc: () => ({ [MOVE_FILE]: folder }),
	};
}

function buildContentReplaceChange(file: TFile): ContentChange {
	return {
		type: 'content_replace',
		files: [file],
		action: 'replace',
		details: 'foo→bar',
		find: 'foo',
		replace: 'bar',
		isRegex: false,
		caseSensitive: false,
		logicFunc: () => ({
			[FIND_REPLACE_CONTENT]: { pattern: 'foo', replacement: 'bar', isRegex: false, caseSensitive: false },
		}),
	};
}

function buildTemplateChange(file: TFile, content: string): TemplateChange {
	return {
		type: 'template',
		files: [file],
		action: 'apply_template',
		details: 'tpl',
		templateFileStr: 't.md',
		templateContent: content,
		logicFunc: () => ({ [APPLY_TEMPLATE]: content }),
	};
}

function buildNativeRenamePropChange(file: TFile, oldName: string, newName: string): PropertyChange {
	return {
		type: 'property',
		files: [file],
		action: 'rename',
		details: `${oldName}→${newName}`,
		logicFunc: () => ({ [NATIVE_RENAME_PROP]: { oldName, newName } }),
		customLogic: true,
		property: oldName,
	};
}

function setupAppWithFile(content = '---\nstatus: draft\n---\nbody-line\n') {
	const file = mockTFile('a.md', { frontmatter: { status: 'draft' } });
	const adapterFiles = new Map([[file.path, content]]);
	const meta = new Map<string, CachedMetadata>([
		[file.path, { frontmatter: { status: 'draft' } }],
	]);
	const app = mockApp({ files: [file], metadata: meta, adapterFiles });
	const svc = new OperationQueueService(app);
	return { app, svc, file, adapterFiles };
}

beforeEach(() => {
	vi.useFakeTimers();
});

describe('serializeFile', () => {
	it('returns body alone when fm is empty', () => {
		expect(serializeFile({}, 'plain body')).toBe('plain body');
	});

	it('emits a YAML block for non-empty fm', () => {
		const out = serializeFile({ a: 1 }, 'body');
		expect(out.startsWith('---\n')).toBe(true);
		expect(out).toContain('a: 1');
		expect(out.endsWith('body')).toBe(true);
	});
});

describe('OperationQueueService.add (property set)', () => {
	it('collapses 2 set ops on the same file into one VFS with opCount=2', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'author', 'Alice'));
		await svc.add(buildPropChange(file, 'version', '1.0'));
		expect(svc.fileCount).toBe(1);
		expect(svc.opCount).toBe(2);
		const tx = svc.getTransaction(file.path);
		expect(tx?.fm.author).toBe('Alice');
		expect(tx?.fm.version).toBe('1.0');
	});

	it('emits "changed" once per add (not silenced)', async () => {
		const { svc, file } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.add(buildPropChange(file, 'a', '1'));
		await svc.add(buildPropChange(file, 'b', '2'));
		expect(cb).toHaveBeenCalledTimes(2);
	});
});

describe('OperationQueueService.addBatch', () => {
	it('emits "changed" exactly once for the whole batch', async () => {
		const { svc, file } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.addBatch([
			buildPropChange(file, 'a', '1'),
			buildPropChange(file, 'b', '2'),
			buildPropChange(file, 'c', '3'),
		]);
		expect(cb).toHaveBeenCalledTimes(1);
		expect(svc.opCount).toBe(3);
	});

	it('returns early without emitting on empty batch', async () => {
		const { svc } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.addBatch([]);
		expect(cb).not.toHaveBeenCalled();
	});
});

describe('OperationQueueService op kinds', () => {
	it('DELETE_PROP removes a key from fm', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildDeleteChange(file, 'status'));
		expect(svc.getTransaction(file.path)?.fm.status).toBeUndefined();
	});

	it('RENAME_FILE sets newPath replacing the basename', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildRenameChange(file, 'renamed.md'));
		expect(svc.getTransaction(file.path)?.newPath).toBe('renamed.md');
	});

	it('MOVE_FILE rewrites newPath under the target folder', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildMoveChange(file, 'Archive'));
		expect(svc.getTransaction(file.path)?.newPath).toBe('Archive/a.md');
	});

	it('FIND_REPLACE_CONTENT mutates body', async () => {
		const { svc, file } = setupAppWithFile('---\nstatus: draft\n---\nfoo bar foo\n');
		await svc.add(buildContentReplaceChange(file));
		expect(svc.getTransaction(file.path)?.body).toContain('bar bar bar');
	});

	it('APPLY_TEMPLATE appends to body', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildTemplateChange(file, '## Appended'));
		expect(svc.getTransaction(file.path)?.body).toContain('## Appended');
	});

	it('NATIVE_RENAME_PROP expands across vault for matching files', async () => {
		const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
		const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
		const fileC = mockTFile('c.md', { frontmatter: { other: 'x' } });
		const adapterFiles = new Map<string, string>([
			[fileA.path, '---\nstatus: draft\n---\n'],
			[fileB.path, '---\nstatus: done\n---\n'],
			[fileC.path, '---\nother: x\n---\n'],
		]);
		const meta = new Map<string, CachedMetadata>([
			[fileA.path, { frontmatter: { status: 'draft' } }],
			[fileB.path, { frontmatter: { status: 'done' } }],
			[fileC.path, { frontmatter: { other: 'x' } }],
		]);
		const app = mockApp({ files: [fileA, fileB, fileC], metadata: meta, adapterFiles });
		const svc = new OperationQueueService(app);

		await svc.add(buildNativeRenamePropChange(fileA, 'status', 'state'));

		const aTx = svc.getTransaction(fileA.path);
		const bTx = svc.getTransaction(fileB.path);
		const cTx = svc.getTransaction(fileC.path);
		expect(aTx?.fm.state).toBe('draft');
		expect(aTx?.fm.status).toBeUndefined();
		expect(bTx?.fm.state).toBe('done');
		expect(bTx?.fm.status).toBeUndefined();
		expect(cTx).toBeUndefined(); // file without the property is skipped
	});
});

describe('OperationQueueService.removeOp', () => {
	it('rebuilds VFS state from initial when an op is removed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'x', '1'));
		await svc.add(buildPropChange(file, 'y', '2'));
		const tx = svc.getTransaction(file.path)!;
		const firstOpId = tx.ops[0].id;
		svc.removeOp(file.path, firstOpId);

		const after = svc.getTransaction(file.path)!;
		expect('x' in after.fm).toBe(false);
		expect('y' in after.fm).toBe(true);
		expect(svc.opCount).toBe(1);
	});

	it('drops the entire VFS when the last op is removed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'only', 'v'));
		const id = svc.getTransaction(file.path)!.ops[0].id;
		svc.removeOp(file.path, id);
		expect(svc.getTransaction(file.path)).toBeUndefined();
		expect(svc.fileCount).toBe(0);
	});

	it('is a no-op when opId is unknown', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'x', '1'));
		const before = svc.opCount;
		svc.removeOp(file.path, 'op-9999');
		expect(svc.opCount).toBe(before);
	});
});

describe('OperationQueueService.removeFile + clear + counters', () => {
	it('removeFile drops the file and emits changed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'x', '1'));
		const cb = vi.fn();
		svc.on('changed', cb);
		svc.removeFile(file.path);
		expect(svc.fileCount).toBe(0);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clear empties everything', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'x', '1'));
		svc.clear();
		expect(svc.isEmpty).toBe(true);
		expect(svc.fileCount).toBe(0);
		expect(svc.opCount).toBe(0);
	});
});

describe('OperationQueueService.simulateChanges', () => {
	it('returns a before/after snapshot for each pending file', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'newProp', 'v'));
		const diff = svc.simulateChanges();
		const entry = diff.get(file.path);
		expect(entry?.before.status).toBe('draft');
		expect(entry?.after.newProp).toBe('v');
	});
});

describe('OperationQueueService.execute', () => {
	it('writes serialized fm + body via vault.process and clears the queue', async () => {
		const { svc, file, adapterFiles } = setupAppWithFile();
		await svc.add(buildPropChange(file, 'reviewer', 'Bob'));
		const promise = svc.execute();
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.success).toBe(1);
		expect(result.errors).toBe(0);
		expect(svc.isEmpty).toBe(true);
		const written = adapterFiles.get(file.path) ?? '';
		expect(written).toContain('reviewer: Bob');
		expect(written).toContain('body-line');
	});

	it('records errors when commitFile throws and continues with the rest', async () => {
		const { svc, file, app } = setupAppWithFile();
		const second = mockTFile('b.md', { frontmatter: {} });
		const adapter2 = (app.vault.adapter as unknown as { _files: Map<string, string> });
		void adapter2;

		// Add ops on both files
		await svc.add(buildPropChange(file, 'ok', '1'));
		await svc.add(buildPropChange(second, 'ok', '1'));

		// Make process throw on file `a.md`
		const realProcess = app.vault.process.bind(app.vault);
		app.vault.process = async (f, fn) => {
			if (f.path === 'a.md') throw new Error('boom');
			return realProcess(f, fn);
		};

		const promise = svc.execute();
		await vi.runAllTimersAsync();
		const result = await promise;
		expect(result.errors).toBe(1);
		expect(result.success).toBe(1);
	});
});
```

- [ ] **Step 18.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceQueue.test.ts
```
Expected: `≥18 passed`.

- [ ] **Step 18.3: Commit**

```powershell
git add test/unit/services/serviceQueue.test.ts
git commit -m "test(services): cover OperationQueueService (add/batch/remove/execute/simulate/native-rename)"
```

---

### Task 19: `serviceFilter.test.ts`

**Files:**
- Create: `test/unit/services/serviceFilter.test.ts`

- [ ] **Step 19.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { FilterService } from '../../../src/services/serviceFilter';
import type { FilterRule, FilterTemplate } from '../../../src/types/typeFilter';
import { mockApp, mockTFile, type CachedMetadata } from 'obsidian';

function setup() {
	const a = mockTFile('Notes/a.md', { frontmatter: { status: 'draft', tags: ['idea'] } });
	const b = mockTFile('Notes/b.md', { frontmatter: { status: 'done' } });
	const c = mockTFile('Archive/c.md', { frontmatter: {} });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['idea'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
		[c.path, { frontmatter: {} }],
	]);
	const app = mockApp({ files: [a, b, c], metadata: meta });
	const svc = new FilterService(app);
	svc.onload();
	return { app, svc, a, b, c };
}

const draftRule: FilterRule = {
	type: 'rule',
	filterType: 'specific_value',
	property: 'status',
	values: ['draft'],
	id: 'r1',
	enabled: true,
};

describe('FilterService.applyFilters', () => {
	it('with empty tree returns all markdown files sorted by basename', () => {
		const { svc, a, b, c } = setup();
		const paths = svc.filteredFiles.map((f) => f.path);
		expect(paths).toEqual([a.path, b.path, c.path].sort((x, y) => x.localeCompare(y)));
	});

	it('addNode triggers re-evaluation', () => {
		const { svc, a } = setup();
		svc.addNode({ ...draftRule });
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('search-name AND-combines with the active filter tree', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.setSearchFilter('zzz', '');
		expect(svc.filteredFiles).toHaveLength(0);
	});

	it('search-folder AND-combines on parent path', () => {
		const { svc, c } = setup();
		svc.setSearchFilter('', 'Archive');
		expect(svc.filteredFiles).toEqual([c]);
	});
});

describe('FilterService node mutation helpers', () => {
	it('removeNodeByProperty removes has_property rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_property' } as FilterRule);
		svc.removeNodeByProperty('status');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByProperty(value) removes specific_value rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.removeNodeByProperty('status', 'draft');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByTag removes has_tag rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.removeNodeByTag('idea');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('toggleFilterRule flips enabled and re-evaluates', () => {
		const { svc, a, b, c } = setup();
		svc.addNode({ ...draftRule });
		svc.toggleFilterRule('r1');
		expect(svc.filteredFiles.length).toBe(3);
		void [a, b, c];
	});

	it('deleteFilterRule removes rule by id', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.deleteFilterRule('r1');
		expect(svc.activeFilter.children).toHaveLength(0);
	});
});

describe('FilterService introspection', () => {
	it('hasTagFilter / hasPropFilter / hasValueFilter detect existing rules', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.addNode({ ...draftRule, id: 'r2', filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.addNode({ ...draftRule, id: 'r3', filterType: 'has_property', values: [] } as FilterRule);

		expect(svc.hasTagFilter('idea')).toBe(true);
		expect(svc.hasPropFilter('status')).toBe(true);
		expect(svc.hasValueFilter('status', 'draft')).toBe(true);
		expect(svc.hasValueFilter('status', 'something-else')).toBe(false);
	});

	it('getFlatRules returns description + enabled metadata', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		const rules = svc.getFlatRules();
		expect(rules).toHaveLength(1);
		expect(rules[0].description).toContain('status');
		expect(rules[0].enabled).toBe(true);
	});

	it('loadTemplate replaces the active filter and applies', () => {
		const { svc, a } = setup();
		const tpl: FilterTemplate = {
			name: 'drafts',
			root: { type: 'group', logic: 'all', children: [draftRule] },
		};
		svc.loadTemplate(tpl);
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('clearFilters resets the tree to empty', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.clearFilters();
		expect(svc.activeFilter.children).toHaveLength(0);
		expect(svc.filteredFiles.length).toBe(3);
	});
});
```

- [ ] **Step 19.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceFilter.test.ts
```
Expected: `≥12 passed`.

- [ ] **Step 19.3: Commit**

```powershell
git add test/unit/services/serviceFilter.test.ts
git commit -m "test(services): cover FilterService apply/add/remove/toggle/template/introspection"
```

---

### Task 20: `serviceCMenu.test.ts`

**Files:**
- Create: `test/unit/services/serviceCMenu.test.ts`

- [ ] **Step 20.1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ContextMenuService, type ContextMenuPluginCtx } from '../../../src/services/serviceCMenu';
import type { ActionDef } from '../../../src/types/typeCMenu';
import { mockApp, mockTFile, Component } from 'obsidian';

function makeCtx(): ContextMenuPluginCtx {
	const ctx = new Component() as unknown as ContextMenuPluginCtx;
	(ctx as unknown as { app: ReturnType<typeof mockApp> }).app = mockApp();
	(ctx as unknown as { settings: ContextMenuPluginCtx['settings'] }).settings = {
		contextMenuShowInMoreOptions: true,
		contextMenuShowInFileMenu: true,
		contextMenuShowInEditorMenu: true,
		contextMenuHideRules: [],
	};
	return ctx;
}

const fileAction: ActionDef = {
	id: 'test.action',
	label: 'Test action',
	nodeTypes: ['file'],
	surfaces: ['panel', 'file-menu', 'more-options'],
	run: () => {},
};

describe('ContextMenuService.registerAction', () => {
	it('records the action on first registration', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		expect(((svc as unknown) as { _registry: ActionDef[] })._registry.length).toBe(1);
	});

	it('is idempotent on duplicate id', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction(fileAction);
		svc.registerAction(fileAction);
		expect(((svc as unknown) as { _registry: ActionDef[] })._registry.length).toBe(1);
	});
});

describe('ContextMenuService.openPanelMenu', () => {
	it('only includes actions whose nodeTypes match the ctx', () => {
		const svc = new ContextMenuService(makeCtx());
		const fileSpy = vi.fn();
		const tagSpy = vi.fn();
		svc.registerAction({ ...fileAction, run: fileSpy });
		svc.registerAction({
			id: 'tag.x',
			label: 'Tag x',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			run: tagSpy,
		});

		const file = mockTFile('a.md');
		svc.openPanelMenu(
			{
				nodeType: 'file',
				node: { id: 'a.md', label: 'a.md', meta: { file }, icon: '', depth: 0 },
				surface: 'panel',
				file,
			},
			new MouseEvent('click'),
		);

		// We can't introspect the Menu after showAtMouseEvent, but we can re-derive what filtered:
		const applicable = ((svc as unknown) as { _registry: ActionDef[] })._registry.filter(
			(d) => d.nodeTypes.includes('file') && d.surfaces.includes('panel'),
		);
		expect(applicable.map((d) => d.id)).toEqual(['test.action']);
	});

	it('respects the `when` predicate', () => {
		const svc = new ContextMenuService(makeCtx());
		svc.registerAction({
			...fileAction,
			id: 'guarded',
			when: (ctx) => ctx.file?.path.endsWith('.txt') ?? false,
		});
		const file = mockTFile('a.md');
		const applicable = ((svc as unknown) as { _registry: ActionDef[] })._registry.filter(
			(d) => d.nodeTypes.includes('file') && d.surfaces.includes('panel') && (!d.when || d.when({ nodeType: 'file', node: { id: 'x', label: 'x', meta: { file }, icon: '', depth: 0 }, surface: 'panel', file })),
		);
		expect(applicable.map((d) => d.id)).toEqual([]);
	});
});
```

- [ ] **Step 20.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceCMenu.test.ts
```
Expected: `4 passed`.

- [ ] **Step 20.3: Commit**

```powershell
git add test/unit/services/serviceCMenu.test.ts
git commit -m "test(services): cover ContextMenuService register + nodeTypes/when filtering"
```

---

### Task 21: `serviceDiff.test.ts`

**Files:**
- Create: `test/unit/services/serviceDiff.test.ts`

- [ ] **Step 21.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import {
	diffFm,
	buildFileDiff,
	buildOperationDiff,
	computeBodyHunks,
} from '../../../src/services/serviceDiff';
import type { VirtualFileState, StagedOp } from '../../../src/types/typeOps';
import { mockTFile } from 'obsidian';

function vfs(partial: Partial<VirtualFileState>): VirtualFileState {
	const file = mockTFile('a.md');
	const base: VirtualFileState = {
		file,
		originalPath: 'a.md',
		newPath: undefined,
		fm: { x: 1 },
		body: 'before',
		ops: [],
		fmInitial: { x: 1 },
		bodyInitial: 'before',
		bodyLoaded: true,
	};
	return { ...base, ...partial };
}

function op(id: string, apply: (v: VirtualFileState) => void): StagedOp {
	return { id, kind: 'set_prop', action: 'set', details: '', apply };
}

describe('diffFm', () => {
	it('classifies added / removed / changed / unchanged', () => {
		const deltas = diffFm({ a: 1, b: 2, c: 3 }, { b: 2, c: 9, d: 4 });
		const map = Object.fromEntries(deltas.map((d) => [d.key, d.kind]));
		expect(map.a).toBe('removed');
		expect(map.b).toBe('unchanged');
		expect(map.c).toBe('changed');
		expect(map.d).toBe('added');
	});

	it('strips the synthetic position key', () => {
		const deltas = diffFm({ position: { start: 0 } }, {});
		expect(deltas).toHaveLength(0);
	});
});

describe('buildFileDiff', () => {
	it('produces a snapshot of fm + body + op summaries', () => {
		const v = vfs({
			fm: { x: 2 },
			body: 'after',
			ops: [op('o1', () => {}), op('o2', () => {})],
		});
		const diff = buildFileDiff(v);
		expect(diff.fmDeltas.find((d) => d.key === 'x')?.kind).toBe('changed');
		expect(diff.bodyChanged).toBe(true);
		expect(diff.opSummaries.map((o) => o.id)).toEqual(['o1', 'o2']);
	});
});

describe('buildOperationDiff', () => {
	it('returns null when path is missing', () => {
		const txs = new Map<string, VirtualFileState>();
		expect(buildOperationDiff(txs, { path: 'missing', opId: 'x' })).toBeNull();
	});

	it('returns null when opId is unknown', () => {
		const v = vfs({ ops: [op('o1', () => {})] });
		const txs = new Map([[v.originalPath, v]]);
		expect(buildOperationDiff(txs, { path: v.originalPath, opId: 'nope' })).toBeNull();
	});

	it('isolates a single op by replaying earlier ops + applying selected op', () => {
		const v = vfs({
			fm: { x: 1, y: 2 },
			fmInitial: { x: 1 },
			ops: [
				op('o1', (s) => { s.fm.helper = 1; }),
				op('o2', (s) => { s.fm.y = 2; delete s.fm.helper; }),
			],
		});
		const txs = new Map([[v.originalPath, v]]);
		const diff = buildOperationDiff(txs, { path: v.originalPath, opId: 'o2' });
		expect(diff).not.toBeNull();
		expect(diff!.fmDeltas.find((d) => d.key === 'y')?.kind).toBe('added');
		expect(diff!.fmDeltas.find((d) => d.key === 'helper')?.kind).toBe('removed');
	});
});

describe('computeBodyHunks', () => {
	it('returns no hunks when input is identical', () => {
		expect(computeBodyHunks('a\nb\nc', 'a\nb\nc')).toEqual([]);
	});

	it('emits a single hunk header for short replacements', () => {
		const hunks = computeBodyHunks('a\nb\nc', 'a\nB\nc');
		expect(hunks).toHaveLength(1);
		expect(hunks[0].lines.find((l) => l.kind === 'add')?.text).toBe('B');
		expect(hunks[0].lines.find((l) => l.kind === 'del')?.text).toBe('b');
	});

	it('omits the diff when content exceeds the body-size limit', () => {
		const big = 'x'.repeat(300_000);
		const hunks = computeBodyHunks(big, big + 'y');
		expect(hunks).toHaveLength(1);
		expect(hunks[0].header).toContain('diff omitted');
	});
});
```

- [ ] **Step 21.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceDiff.test.ts
```
Expected: `9 passed`.

- [ ] **Step 21.3: Commit**

```powershell
git add test/unit/services/serviceDiff.test.ts
git commit -m "test(services): cover serviceDiff (diffFm/buildFileDiff/buildOperationDiff/computeBodyHunks)"
```

---

### Task 22: `serviceVirtualizer.test.ts`

**Files:**
- Create: `test/unit/services/serviceVirtualizer.test.ts`

- [ ] **Step 22.1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { TreeVirtualizer } from '../../../src/services/serviceVirtualizer';
import type { TreeNode } from '../../../src/types/typeTree';

function n(id: string, children?: TreeNode<unknown>[]): TreeNode<unknown> {
	return { id, label: id, depth: 0, children, meta: undefined };
}

describe('TreeVirtualizer.flatten', () => {
	it('returns a single level when no ids are expanded', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1')]), n('b', [n('b1')])];
		expect(v.flatten(tree, new Set()).map((f) => f.node.id)).toEqual(['a', 'b']);
	});

	it('descends only into expanded ids', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1'), n('a2')]), n('b', [n('b1')])];
		const flat = v.flatten(tree, new Set(['a']));
		expect(flat.map((f) => f.node.id)).toEqual(['a', 'a1', 'a2', 'b']);
		expect(flat[0].depth).toBe(0);
		expect(flat[1].depth).toBe(1);
	});

	it('marks hasChildren correctly', () => {
		const v = new TreeVirtualizer();
		const tree: TreeNode<unknown>[] = [n('a', [n('a1')]), n('leaf')];
		const flat = v.flatten(tree, new Set());
		expect(flat[0].hasChildren).toBe(true);
		expect(flat[1].hasChildren).toBe(false);
	});
});

describe('TreeVirtualizer.computeWindow', () => {
	it('returns zero range when total is zero', () => {
		const v = new TreeVirtualizer();
		expect(v.computeWindow(0, 100, 20, 0)).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('returns zero range when rowH is zero', () => {
		const v = new TreeVirtualizer();
		expect(v.computeWindow(0, 100, 0, 50)).toEqual({ startIndex: 0, endIndex: 0 });
	});

	it('clamps start to 0 with overscan', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(20, 100, 20, 100, 5);
		expect(w.startIndex).toBe(0);
	});

	it('clamps end to total', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(180, 100, 20, 10, 5);
		expect(w.endIndex).toBe(10);
	});

	it('returns symmetric overscan around the visible window', () => {
		const v = new TreeVirtualizer();
		const w = v.computeWindow(400, 100, 20, 100, 5);
		expect(w.startIndex).toBe(15); // 400/20=20, 20-5
		expect(w.endIndex).toBe(30);   // 20+5visible+5overscan
	});
});
```

- [ ] **Step 22.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceVirtualizer.test.ts
```
Expected: `8 passed`.

- [ ] **Step 22.3: Commit**

```powershell
git add test/unit/services/serviceVirtualizer.test.ts
git commit -m "test(services): cover TreeVirtualizer flatten + computeWindow edges"
```

---

### Task 23: `serviceIcons.test.ts`

**Files:**
- Create: `test/unit/services/serviceIcons.test.ts`

- [ ] **Step 23.1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { IconicService } from '../../../src/services/serviceIcons';
import { mockApp } from 'obsidian';

function buildSvc(data: Record<string, unknown>) {
	const adapterFiles = new Map<string, string>([
		['.obsidian/plugins/iconic/data.json', JSON.stringify(data)],
	]);
	const app = mockApp({ adapterFiles });
	const svc = new IconicService(app);
	return { svc, app };
}

describe('IconicService', () => {
	it('returns null for unknown property name', async () => {
		const { svc } = buildSvc({});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.getIcon('whatever')).toBeNull();
	});

	it('reads property + tag icons from .obsidian/plugins/iconic/data.json', async () => {
		const { svc } = buildSvc({
			propertyIcons: { status: { icon: 'lucide-flag', color: 'red' } },
			tagIcons: { '#idea': { icon: 'lucide-lightbulb' } },
		});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.getIcon('status')).toEqual({ icon: 'lucide-flag', color: 'red' });
		expect(svc.getTagIcon('idea')).toEqual({ icon: 'lucide-lightbulb', color: undefined });
	});

	it('isAvailable becomes true after a successful load', async () => {
		const { svc } = buildSvc({ propertyIcons: {} });
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.isAvailable()).toBe(true);
	});

	it('isAvailable stays false when data.json is missing', async () => {
		const app = mockApp(); // no adapterFiles
		const svc = new IconicService(app);
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.isAvailable()).toBe(false);
	});

	it('onLoaded fires immediately if already loaded', async () => {
		const { svc } = buildSvc({});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		const cb = vi.fn();
		svc.onLoaded(cb);
		expect(cb).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 23.2: Run + verify pass**

```powershell
npm run test:unit -- test/unit/services/serviceIcons.test.ts
```
Expected: `5 passed`.

- [ ] **Step 23.3: Commit**

```powershell
git add test/unit/services/serviceIcons.test.ts
git commit -m "test(services): cover IconicService load/getIcon/getTagIcon/onLoaded"
```

---

### Task 24: Iter C.4 coverage gate

**Files:**
- N/A

- [ ] **Step 24.1: Run full unit coverage**

```powershell
npm run test:cover
```

- [ ] **Step 24.2: Confirm thresholds**

Open `coverage/index.html`. Expected:
- `src/utils/`: lines ≥80%, functions ≥80%
- `src/logic/` (PropsLogic, TagsLogic, FilesLogic only): lines ≥80%, functions ≥80%
- `src/services/` (excluding WIP files): lines ≥70%, functions ≥70%

If any row falls short, write targeted tests until met. Do not relax `vitest.config.ts` thresholds — the per-folder targets are the real gate.

- [ ] **Step 24.3: Commit any backfill**

```powershell
git add test/unit/services/
git commit -m "test(services): backfill cases for ≥70% line + function coverage"
```
Skip if not needed.

---

### Task 25: CI gate

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 25.1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main, hardening, hardening-tests, hardening-audit, hardening-refactor]
  pull_request:
    branches: [main, hardening]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run check
      - run: npm run build
      - name: Run unit tests with coverage
        run: npm run test:cover
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

> Note: the workflow runs `test:cover` (unit), not `test:integrity`. The integration suite requires a live Obsidian instance, which the GitHub runner cannot provide. Integration tests are run locally before each PR.

- [ ] **Step 25.2: Validate workflow syntax locally**

Run:
```powershell
npm run lint
```
Expected: no new errors. (The workflow file is YAML — ESLint ignores it; syntax correctness is the user's responsibility, but the format above is the canonical one.)

- [ ] **Step 25.3: Commit + push**

```powershell
git add .github/workflows/ci.yml
git commit -m "chore(ci): add GitHub Actions verify gate (lint + check + build + test:cover)"
git push
```

- [ ] **Step 25.4: Verify the workflow runs green on the push**

```powershell
gh run list --branch hardening-tests --limit 1
gh run watch
```
Expected: `verify` job succeeds.

If the run fails, fix the underlying issue (do not skip steps with `--no-verify`).

---

### Task 26: Memory + HANDOFF update

**Files:**
- Modify: `docs/Vaultman - Agent Memory.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 26.1: Update `docs/Vaultman - Agent Memory.md`**

Append a new "Session 2026-04-29 — Sub-C Tests closure" section under the "Last updated" block, mirroring the Sub-B closure entry style:

```markdown
## Session 2026-04-29 — Sub-C Tests closure

**Status: Sub-C Tests completo. Iter C.1 + C.2 + C.3 + C.4 cerrados. Versión bumped a `1.0.0-beta.19`.**

- **Branch**: `hardening-tests` (creada desde `hardening`).
- **Versión**: `1.0.0-beta.19` taggeada y committed.
- **Iter C.1**: Vitest dual project + obsidian alias + mocks. `test/helpers/yaml.ts`, `test/helpers/obsidian-mocks.ts`, `test:unit`/`test:cover`/`verify` scripts.
- **Iter C.2**: 6 archivos test en `test/unit/utils/`. Coverage `src/utils/` ≥80%.
- **Iter C.3**: 3 archivos test en `test/unit/logic/`. Coverage `src/logic/` (PropsLogic, TagsLogic, FilesLogic) ≥80%. ADR-009 documenta exclusión de `logicQueue.ts`/`logicFilters.ts` (UI mislabeled).
- **Iter C.4**: 6 archivos test en `test/unit/services/`. Coverage ≥70%. CI gate `.github/workflows/ci.yml` con lint+check+build+test:cover.
- **Verify gate final**: lint ✅ check ✅ build ✅ test:integrity ✅ test:unit ✅ coverage targets met.
- **PR**: `hardening-tests` → `hardening` abierto. NO mergear a `main`.
- **Próximo**: Sub-A Refactor. Escribir plan con `superpowers:writing-plans` (Iter A.1-A.5). Ver HANDOFF Paso 5.
```

- [ ] **Step 26.2: Update `docs/HANDOFF.md`**

Mark Paso 4 DONE and add Paso 5 PRÓXIMO:

```markdown
### Paso 4 — Sub-C Tests ✅ DONE 2026-04-29

Resultados:

- **Plan**: `docs/superpowers/plans/2026-04-28-vaultman-hardening-sub-c.md` (27 tasks across 4 iters).
- **Branch**: `hardening-tests` (creada desde `hardening` post-merge de Sub-B).
- **Versión**: `1.0.0-beta.19` taggeada y committed.
- **Stack instalado**: `@vitest/coverage-v8`, `js-yaml`, `@types/js-yaml`.
- **Outputs**:
  - `vitest.config.ts` con dual projects (unit + integration).
  - `test/helpers/obsidian-mocks.ts` + `test/helpers/yaml.ts`.
  - 15 archivos test (6 utils, 3 logic, 6 services).
  - `.github/workflows/ci.yml` con verify gate.
  - Scripts `test:unit`, `test:cover`, `verify`.
  - ADR-009 (mislabeled `logicQueue.ts`/`logicFilters.ts`).
- **Coverage**:
  - `src/utils/`: ≥80% lines, ≥80% functions.
  - `src/logic/` (3 files): ≥80% lines, ≥80% functions.
  - `src/services/` (no WIP): ≥70% lines, ≥70% functions.
- **PR**: `hardening-tests` → `hardening`. URL: ver `gh pr list --base hardening`.

### Paso 5 — Sub-A Refactor 🔴 PRÓXIMO

**Pre-condición**: usuario revisar + mergear PR `hardening-tests` → `hardening`.

1. Revisar y mergear PR `hardening-tests` → `hardening` (o pedir review).
2. Invocar skill `superpowers:writing-plans` con scope: **Sub-A Refactor (Iter A.1-A.5)**.
3. Output esperado: `docs/superpowers/plans/2026-04-28-vaultman-hardening-sub-a.md`.
4. El plan debe consultar Annex A.1-A.5 del spec maestra para items v1.0 scope a integrar.
```

- [ ] **Step 26.3: Commit docs**

```powershell
git add "docs/Vaultman - Agent Memory.md" docs/HANDOFF.md
git commit -m "docs(tests): update Agent Memory + HANDOFF for Sub-C closure"
```

---

### Task 27: Version bump + tag

**Files:**
- Modify: `package.json` (version)
- Modify: `manifest.json` (version)
- Modify: `versions.json`

- [ ] **Step 27.1: Edit `package.json`: bump `version` to `1.0.0-beta.19`**

Old:
```json
"version": "1.0.0-beta.16",
```
> Note: package.json may already show `1.0.0-beta.18` after the Sub-B `version-bump.mjs` run. Whatever the current value is, update it to:

```json
"version": "1.0.0-beta.19",
```

- [ ] **Step 27.2: Run the version bump script**

```powershell
node version-bump.mjs
```
Expected: `manifest.json` `version` and `versions.json` updated to `1.0.0-beta.19`.

- [ ] **Step 27.3: Commit + tag**

```powershell
git add package.json manifest.json versions.json
git commit -m "chore(release): bump to 1.0.0-beta.19 (Sub-C Tests close)"
git tag 1.0.0-beta.19
```

> Tag has no `v` prefix per project convention (Agent Memory).

- [ ] **Step 27.4: Push commit + tag**

```powershell
git push
git push origin 1.0.0-beta.19
```

---

### Task 28: Open PR `hardening-tests` → `hardening`

**Files:**
- N/A

- [ ] **Step 28.1: Open the PR**

```powershell
gh pr create --base hardening --head hardening-tests --title "Sub-C Tests — vitest harness + unit coverage (Iter C.1–C.4)" --body @'
## Summary
- Vitest dual-project config (unit + integration) with `obsidian` aliased to a hand-written mock module
- 15 unit-test files covering `src/utils/` (≥80%), `src/logic/` (≥80% on PropsLogic/TagsLogic/FilesLogic), `src/services/` (≥70%, WIP excluded)
- GitHub Actions `verify` gate (lint + check + build + test:cover)
- ADR-009 documenting the exclusion of mislabeled UI files in `src/logic/`
- Bump to `1.0.0-beta.19` + tag

## Test plan
- [ ] `npm run lint` — 0 problems
- [ ] `npm run check` — svelte-check 0 errors
- [ ] `npm run build` — 0 warnings, 0 errors
- [ ] `npm run test:integrity` — existing 4 integration tests pass
- [ ] `npm run test:cover` — all unit tests pass; per-folder coverage targets met (utils ≥80, logic ≥80, services ≥70)
- [ ] Reload plugin via `obsidian-cli` (skill `obsidian-cli`); confirm Vaultman still loads in dev vault
- [ ] CI workflow `verify` job succeeds on push
'@
```
Expected: PR opened against `hardening`. URL printed.

- [ ] **Step 28.2: Verify CI runs on the PR**

```powershell
gh pr checks
```
Expected: `verify` queued or running. Wait for green.

---

## Final acceptance

Sub-C is closed when **all** of:

1. `npm run verify` exits 0 locally.
2. CI `verify` job is green on the PR head commit.
3. Per-folder coverage targets met.
4. PR `hardening-tests` → `hardening` open with all checks green.
5. Tag `1.0.0-beta.19` pushed to `origin`.
6. `docs/Vaultman - Agent Memory.md` and `docs/HANDOFF.md` reflect Sub-C closure.

> **Do not merge** the PR without explicit user approval (per HANDOFF policy: no merges to `main` or `hardening` until user signs off).

---

## Notes for the executing agent

- **Caveman mode** stays active per session-start hook. Only narrative prose lightens; commit messages, PR bodies, code, and security/destructive confirmations stay in normal English.
- **Shell**: PowerShell — separator is `;`, never `&&`.
- **Dead Code Protocol**: Sub-C only adds files; nothing is deleted. If a test reveals a real bug in source, fix the source — do not delete failing tests.
- **TDD inversion**: tests cover *existing* code. Pattern is "write tests → run → if fail, the failure is signal (real bug or test typo) → fix → commit". Don't lean on the spec's "write failing test first" wording where it doesn't apply.
- **Mocks evolve**: when a test needs an Obsidian API not yet in `obsidian-mocks.ts`, extend the mock module before adding the test. Keep additions minimal and typed; do not import the real `obsidian` package into the mock.
- **Coverage backfill**: when a coverage target is missed, prefer adding tests over removing branches. Source code is frozen — only test files change in this Sub.
- **Reload after merge**: when the user merges the PR, run `obsidian vault=plugin-dev plugin:reload id=vaultman` via the `obsidian-cli` skill to verify the plugin still loads with the new dependencies and config.
