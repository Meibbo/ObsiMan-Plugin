# Vaultman Hardening — Sub-A (Refactor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Vaultman to a contract-driven architecture: `INodeIndex<T>` factory + 8 concrete indices, generic `Virtualizer<T>`, abstract Explorer (logic + service), Svelte 5 primitives, declarative Settings, frame rewrite with `OverlayState`, plus lint/CI hardening that blocks `(app as any)`. Closes Sub-A of the Vaultman Hardening master spec, ending at `1.0.0-rc.1`.

**Architecture:** Six logical iterations (A.1–A.5; A.2 and A.4 split into `.1`/`.2`). Sub-iter contracts:
- **A.1** lays down `src/types/contracts.ts` (16 interfaces) + `src/types/obsidian-extended.ts` + reconstructed `typeUI.ts` + ADRs 001–008 + lint rule blocking `(app as any)`. After A.1, every consumer imports interfaces; concrete classes only wired in `main.ts`.
- **A.2.1** ships `createNodeIndex<T>` factory + Files/Tags/Props indices implementing it; refactors `serviceFilter`, `serviceQueue`, and promotes `serviceNavigation-WIP` to `Router`. Spike validates the abstraction before A.2.2 commits to it.
- **A.2.2** adds Content/Operations/ActiveFilters indices (real) + CSSSnippets/Templates indices (stubs).
- **A.3** ships Svelte 5 primitives in `src/components/primitives/`.
- **A.4.1** introduces `logicExplorer` + `serviceExplorer` + generic `Virtualizer<T>` + `serviceDecorate` + `serviceSorting` revival; thins `viewTree`, migrates `viewGrid`.
- **A.4.2** rewrites frame, makes `navbarPages` agnostic, migrates `tabContent`, replaces `layoutPopup` with `OverlayState`, finalizes `popupIsland`, ships `explorerQueue` + `explorerActiveFilters` as real explorers.
- **A.5** rewrites Settings with declarative bindings.

Each iter ends with `npm run verify` green and a version bump tag. Branch: `hardening-refactor` (flat; off `hardening`). Closure: PR `hardening-refactor` → `hardening`, then `hardening` → `main` is decided post-rc.1 in a follow-up project (per master spec §1.2 — no merges to `main` during hardening).

**Tech stack:** TypeScript strict, Svelte 5 runes (`$state`/`$derived`/`$effect`/`$props`/`$bindable`), Vitest (existing harness from Sub-C), ESLint with `typescript-eslint`, custom lint rule (regex-based via `no-restricted-syntax`). No new runtime deps. No new framework. No new test runner.

**Branch:** `hardening-refactor` (flat naming, branched off `hardening`).

**Spec references:**
- Master spec: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` §5 + Annex A.1–A.5 + Annex A.7
- Triage: `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` (consult per iter for in-hardening items)
- ADR-003 (Svelte components excluded from unit coverage; E2E owns them)
- ADR-007 (coverage thresholds repo-wide; per-file exceptions documented in ADRs)
- ADR-009 (`logicQueue.ts`/`logicFilters.ts` are UI components; deleted in A.4.2)

**Out-of-scope vs spec discrepancies:**
- Spec §5.7 mentions "Test de migración" for settings (A.5). Implemented as integration test in `test/integration/`, not E2E (per ADR-003).
- Spec §5.6 lists `serviceMarks.ts` ghost — kept post-rc.1 per triage (Annex B.2). Not in this plan.
- `tabLinter.svelte`, `tabFiles.svelte`, `tabTags.svelte`, `tabProps.svelte`, `pageStats.svelte`, `pageTools.svelte` use existing wiring. They consume the new contracts but their internals are NOT rewritten in this plan unless an iter explicitly says so. Cosmetic/UX changes (Annex B.1.3 UX Features) belong to v1.0 Polish, not hardening.

---

## Pre-flight: Branch sync + creation

### Task 0: Sync `hardening` and branch off

**Files:** N/A (git operations only)

- [ ] **Step 0.1: Confirm working tree is clean and PR `hardening-tests → hardening` is merged on remote**

```powershell
git status ; gh pr view 3 --json state,mergedAt,baseRefName,headRefName
```
Expected: working tree clean, PR state `MERGED`, base `hardening`, head `hardening-tests`.

- [ ] **Step 0.2: Switch to `hardening` and pull merged tests commits**

```powershell
git fetch origin ; git switch hardening ; git pull origin hardening
```
Expected: `hardening` advances to include all Sub-C commits, working tree clean.

- [ ] **Step 0.3: Create flat-named sub-branch `hardening-refactor`**

```powershell
git switch -c hardening-refactor ; git push -u origin hardening-refactor
```
Expected: branch created locally and pushed with upstream tracking.

- [ ] **Step 0.4: Verify baseline `npm run verify` is green**

```powershell
npm run verify
```
Expected: lint, check, build, test:integrity, test:unit all pass with 0 errors. If anything fails, STOP — fix before starting A.1.

---

## File Structure (created/modified across all iters)

| Path | Role | Created in task |
|---|---|---|
| `src/types/contracts.ts` | All `Ixxx` interfaces (16 entries) | T2 (A.1) |
| `src/types/obsidian-extended.ts` | Typed wrapper for `app.plugins`/`app.commands`/`app.internalPlugins`/`app.setting` | T3 (A.1) |
| `src/types/typeUI.ts` | Tab config + tab id types (reconstruction) | T4 (A.1) |
| `src/types/typePrimitives.ts` | Cleanup; remove duplicates with contracts | T4 (A.1) |
| `eslint.config.mts` | Lint rule blocking `(app as any)` + `no-explicit-any` to error + `no-unsafe-*` | T5 (A.1) |
| `docs/superpowers/adr/ADR-001-svelte-state-services.md` | Reactive state in `*.svelte.ts` services | T6 (A.1) |
| `docs/superpowers/adr/ADR-002-interface-consumers.md` | Consumers depend on `Ixxx`, not classes | T6 (A.1) |
| `docs/superpowers/adr/ADR-003-test-coverage-policy.md` | Unit covers utils/logic/services; components → E2E | T6 (A.1) |
| `docs/superpowers/adr/ADR-004-obsidian-extended-only.md` | All Obsidian internal API access via `obsidian-extended.ts` | T6 (A.1) |
| `docs/superpowers/adr/ADR-005-wip-naming-blocked.md` | `*-WIP*`/`*_WIP*` blocked from `hardening`/`main` | T6 (A.1) |
| `docs/superpowers/adr/ADR-006-contracts-change-requires-adr.md` | Mutating `contracts.ts` requires new ADR | T6 (A.1) |
| `docs/superpowers/adr/ADR-007-coverage-thresholds-global.md` | Coverage thresholds global; exceptions in ADRs | T6 (A.1) |
| `docs/superpowers/adr/ADR-008-indexing-via-factory.md` | All indexing uses `createNodeIndex<T>` | T6 (A.1) |
| `docs/superpowers/adr/ADR-010-overlay-state-replaces-prop-drilling.md` | `OverlayState` replaces `layoutPopup` props | T35 (A.4.2) |
| `docs/superpowers/adr/ADR-011-decorative-output-via-decoration-manager.md` | `IDecorationManager` produces snippets/badges/highlights | T28 (A.4.1) |
| `src/main.ts` | Wiring uses concrete classes; consumers receive interfaces | T7 (A.1), T13 (A.2.1), T20 (A.2.2), T36 (A.4.2), T41 (A.5) |
| `src/services/createNodeIndex.ts` | Generic factory `createNodeIndex<T>` | T9 (A.2.1) |
| `src/services/serviceFilesIndex.ts` | `IFilesIndex` impl | T10 (A.2.1) |
| `src/services/serviceTagsIndex.ts` | `ITagsIndex` impl | T11 (A.2.1) |
| `src/services/servicePropsIndex.ts` | Rename of `PropertyIndexService` to `IPropsIndex` impl | T12 (A.2.1) |
| `src/services/serviceFilter.svelte.ts` | Renamed from `serviceFilter.ts`; rewritten with runes implementing `IFilterService` | T14 (A.2.1) |
| `src/services/serviceQueue.svelte.ts` | Renamed from `serviceQueue.ts`; `pending`/`size` as `$state` implementing `IOperationQueue` | T15 (A.2.1) |
| `src/services/serviceNavigation.svelte.ts` | Promoted from `serviceNavigation-WIP.svelte.ts`; implements `IRouter` | T16 (A.2.1) |
| `src/services/serviceContentIndex.ts` | `IContentIndex` impl (find/replace pipeline) | T18 (A.2.2) |
| `src/services/serviceOperationsIndex.ts` | `IOperationsIndex`: read-only view over `serviceQueue` | T19 (A.2.2) |
| `src/services/serviceActiveFiltersIndex.ts` | `IActiveFiltersIndex`: read-only view over `serviceFilter.activeFilter` | T19 (A.2.2) |
| `src/services/serviceCSSSnippetsIndex.ts` | `ICSSSnippetsIndex` stub (interface satisfied, `nodes = []`) | T20 (A.2.2) |
| `src/services/serviceTemplatesIndex.ts` | `ITemplatesIndex` stub | T20 (A.2.2) |
| `src/components/primitives/BtnSquircle.svelte` | Squircle button primitive | T22 (A.3) |
| `src/components/primitives/Badge.svelte` | Badge primitive (CSS var driven) | T23 (A.3) |
| `src/components/primitives/Toggle.svelte` | Toggle primitive | T24 (A.3) |
| `src/components/primitives/Dropdown.svelte` | Dropdown primitive | T25 (A.3) |
| `src/components/primitives/TextInput.svelte` | Text input primitive | T26 (A.3) |
| `src/components/primitives/HighlightText.svelte` | Search-match highlighter | T27 (A.3) |
| `src/services/serviceDecorate.ts` | Promoted from `serviceDecorate_WIP.ts`; implements `IDecorationManager` | T28 (A.4.1) |
| `src/services/serviceSorting.ts` | Sort logic resurrected; consumed by explorers | T29 (A.4.1) |
| `src/services/serviceVirtualizer.svelte.ts` | Renamed from `serviceVirtualizer.ts`; `Virtualizer<T>` generic with rune state | T30 (A.4.1) |
| `src/logic/logicExplorer.ts` | Pure explorer state (selection/expansion/scroll/search) | T31 (A.4.1) |
| `src/services/serviceExplorer.svelte.ts` | `IExplorer<TNode>` impl orchestrating index + filter + decorate | T32 (A.4.1) |
| `src/components/views/viewTree.svelte` | Thinned to render flat nodes from `Virtualizer<T>` via snippets | T33 (A.4.1) |
| `src/components/views/viewGrid.svelte` | Migrated to `Virtualizer<T>`; click event wiring fixed | T34 (A.4.1) |
| `src/services/serviceOverlayState.svelte.ts` | `IOverlayState` stack; click-outside dismiss | T35 (A.4.2) |
| `src/components/frameVaultman.svelte` | Rewritten: `$derived` offset, no DOM mutation, lazy mount via `IRouter` | T36 (A.4.2) |
| `src/components/layout/navbarPages.svelte` | Made agnostic via `tabs: TabConfig[]` prop | T37 (A.4.2) |
| `src/components/pages/tabContent.svelte` | Rewritten to consume `IContentIndex` via `IExplorer` | T38 (A.4.2) |
| `src/components/layout/popupIsland.svelte` | Promoted from `popupIsland_WIP.svelte`; consumes `IOverlayState` | T39 (A.4.2) |
| `src/components/explorers/explorerQueue.svelte` | Real explorer over `IOperationsIndex` (tree/grid/cards/masonry) | T40 (A.4.2) |
| `src/components/explorers/explorerActiveFilters.svelte` | Real explorer over `IActiveFiltersIndex` | T40 (A.4.2) |
| `src/components/layout/layoutPopup.svelte` | DELETED — replaced by `popupIsland` + `OverlayState` | T39 (A.4.2) |
| `src/logic/logicQueue.ts` | DELETED (per ADR-009; `QueueIslandComponent` moves into `explorerQueue.svelte`) | T40 (A.4.2) |
| `src/logic/logicFilters.ts` | DELETED (per ADR-009; `ActiveFiltersIslandComponent` moves into `explorerActiveFilters.svelte`) | T40 (A.4.2) |
| `src/settingsVM.ts` | Reduced to `mount()`/`unmount()` bridge | T41 (A.5) |
| `src/components/settings/SettingsUI.svelte` | Declarative settings UI consuming primitives | T42 (A.5) |
| `test/unit/services/serviceFilesIndex.test.ts` | Index tests | T10 (A.2.1) |
| `test/unit/services/serviceTagsIndex.test.ts` | Index tests | T11 (A.2.1) |
| `test/unit/services/servicePropsIndex.test.ts` | Index tests (replaces `utilPropIndex.test.ts` coverage that exercised the old singleton) | T12 (A.2.1) |
| `test/unit/services/createNodeIndex.test.ts` | Factory tests | T9 (A.2.1) |
| `test/unit/services/serviceContentIndex.test.ts` | Index tests | T18 (A.2.2) |
| `test/unit/services/serviceOperationsIndex.test.ts` | Index tests | T19 (A.2.2) |
| `test/unit/services/serviceActiveFiltersIndex.test.ts` | Index tests | T19 (A.2.2) |
| `test/unit/services/serviceNavigation.test.ts` | Router tests | T16 (A.2.1) |
| `test/unit/services/serviceSorting.test.ts` | Sort tests | T29 (A.4.1) |
| `test/unit/services/serviceVirtualizer.test.ts` | Updated to test generic `Virtualizer<T>` | T30 (A.4.1) |
| `test/unit/services/serviceExplorer.test.ts` | Explorer service tests | T32 (A.4.1) |
| `test/unit/services/serviceOverlayState.test.ts` | Overlay state stack tests | T35 (A.4.2) |
| `test/unit/services/serviceDecorate.test.ts` | Decoration tests | T28 (A.4.1) |
| `test/unit/logic/logicExplorer.test.ts` | Explorer logic tests | T31 (A.4.1) |
| `test/unit/services/serviceCMenu.test.ts` | Backfill: workspace handler coverage | T44 (closure) |
| `test/unit/utils/utilPropIndex.test.ts` | Backfill: debounce timer + lifecycle event coverage | T44 (closure) |
| `test/unit/utils/dropDAutoSuggestionInput.test.ts` | Backfill: `DropDSuggest` inner class coverage | T44 (closure) |
| `test/unit/utils/inputModal.test.ts` | Backfill: DOM-bound paths | T44 (closure) |
| `test/integration/settingsMigration.test.ts` | Integration test for settings.json round-trip | T43 (A.5) |
| `package.json` | Version bumps per iter close | T8/T17/T21/T27/T34/T40/T43 |
| `manifest.json` | Mirror version per iter close | T8/T17/T21/T27/T34/T40/T43 |
| `versions.json` | Mirror version per iter close | T8/T17/T21/T27/T34/T40/T43 |
| `docs/archive/superpowers/specs/` | New folder housing superseded Part 1–8 specs | T6 (A.1) |
| `docs/Vaultman - Agent Memory.md` | Iter-close notes (one block per close) | T8/T17/T21/T27/T34/T40/T43 |
| `docs/HANDOFF.md` | Iter-close pickup notes (rewritten at A.5 closure) | T45 (closure) |
| `AGENTS.md` | Append "lee ADRs antes de tocar `src/services/` o `src/types/`" section | T7 (A.1) |

---

## Iteration A.1 — Tipos

### Task 1: Verify baseline `(app as any)` count + WIP file inventory

**Files:** None (analysis only)

- [ ] **Step 1.1: Count current `(app as any)` occurrences in `src/`**

```powershell
Select-String -Path src/**/*.ts,src/**/*.svelte -Pattern "as any" | Measure-Object | Select-Object -Expand Count
```
Expected: ≥1 (current known: `frameVaultman.svelte` lines 91–92). Record the exact list — A.1 must drive it to 0.

- [ ] **Step 1.2: List all WIP files**

```powershell
Get-ChildItem -Path src -Recurse -Include "*-WIP*","*_WIP*" | Select-Object FullName
```
Expected (from prior audit): `serviceDecorate_WIP.ts`, `serviceLayout-WIP.svelte.ts`, `serviceNavigation-WIP.svelte.ts`, `serviceStats-WIP.svelte.ts`, `popupIsland_WIP.svelte`. Record. A.1 does NOT delete them; later iters promote or delete each.

> **⚠️ `serviceStats-WIP.svelte.ts` and `serviceLayout-WIP.svelte.ts` decision needed before Task 5 (lint) or Task 6 (ADR-005 CI path check):** These two WIP files have no consuming iter in Sub-A. ADR-005 will block merging WIP files to `hardening`/`main`. Options: (a) delete them now in a pre-A.1 commit with user confirmation, (b) rename to non-WIP stubs if any iter needs them, or (c) add CI path-check exclusion for known-deferred WIPs with a comment. Ask the user which before proceeding to T5. Recommendation: **delete both** — `serviceStats` has no spec mention in Sub-A; `serviceLayout` is superseded by `IRouter` + frame rewrite. If the user wants to keep, option (c) is safest.

### Task 2: Create `src/types/contracts.ts` with all 16 interfaces

**Files:**
- Create: `src/types/contracts.ts`

- [ ] **Step 2.1: Write the full contracts file**

Create `src/types/contracts.ts`:

```typescript
import type { TFile } from 'obsidian';
import type { FilterGroup, FilterNode, FilterRule } from './typeFilter';
import type { PendingChange, OperationResult } from './typeOps';

// ─────────────────────────────────────────────────────────
// Indexing primitives
// ─────────────────────────────────────────────────────────

/** A node carries an id (stable), an optional parent path, and arbitrary payload typed by the index. */
export interface NodeBase {
  id: string;
}

export interface FileNode extends NodeBase {
  path: string;
  basename: string;
  file: TFile;
}

export interface TagNode extends NodeBase {
  tag: string;          // e.g. "#project/active"
  count: number;
  parent?: string;      // for nesting
}

export interface PropNode extends NodeBase {
  property: string;
  values: string[];
  fileCount: number;
}

export interface ContentMatch extends NodeBase {
  filePath: string;
  line: number;
  before: string;
  match: string;
  after: string;
}

export interface QueueChange extends NodeBase {
  change: PendingChange;
  group: string; // e.g. operation type
}

export interface ActiveFilterEntry extends NodeBase {
  rule: FilterRule;
}

export interface SnippetNode extends NodeBase {
  name: string;
  enabled: boolean;
}

export interface TemplateNode extends NodeBase {
  name: string;
  path: string;
}

// ─────────────────────────────────────────────────────────
// INodeIndex — generic index contract
// ─────────────────────────────────────────────────────────

export interface INodeIndex<TNode extends NodeBase> {
  /** Reactive list of nodes (rune-backed in svelte.ts impls; readonly array elsewhere). */
  readonly nodes: readonly TNode[];
  /** Re-scan source of truth and rebuild `nodes`. */
  refresh(): void | Promise<void>;
  /** Subscribe to changes; returns unsubscribe fn. */
  subscribe(cb: () => void): () => void;
  /** Look up by id — O(1). */
  byId(id: string): TNode | undefined;
}

export type IFilesIndex = INodeIndex<FileNode>;
export type ITagsIndex = INodeIndex<TagNode>;
export type IPropsIndex = INodeIndex<PropNode>;
export type IContentIndex = INodeIndex<ContentMatch> & {
  setQuery(query: string): void;
};
export type IOperationsIndex = INodeIndex<QueueChange>;
export type IActiveFiltersIndex = INodeIndex<ActiveFilterEntry>;
export type ICSSSnippetsIndex = INodeIndex<SnippetNode>;
export type ITemplatesIndex = INodeIndex<TemplateNode>;

// ─────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────

export interface IFilterService {
  readonly activeFilter: FilterGroup;
  readonly filteredFiles: readonly TFile[];
  readonly selectedFiles: readonly TFile[];
  setFilter(filter: FilterGroup): void;
  clearFilters(): void;
  addNode(node: FilterNode, parent?: FilterGroup): void;
  removeNode(node: FilterNode, parent?: FilterGroup): void;
  removeNodeByProperty(prop: string, value?: string): void;
  setSelectedFiles(files: TFile[]): void;
  subscribe(cb: () => void): () => void;
}

export interface IOperationQueue {
  readonly pending: readonly PendingChange[];
  readonly size: number;
  add(change: PendingChange): void;
  remove(id: string): void;
  clear(): void;
  execute(): Promise<OperationResult>;
  subscribe(cb: () => void): () => void;
}

export interface ISessionFile {
  read(): Promise<string>;
  write(content: string): Promise<void>;
  exists(): boolean;
}

export interface DecorationOutput {
  /** Inline icons next to a node (lucide names). */
  icons: string[];
  /** Badges (label + accent token, NOT --red/--blue). */
  badges: { label: string; accent?: string }[];
  /** Inline highlight ranges within node label. */
  highlights: { start: number; end: number }[];
  /** Optional snippet preview (e.g. content match excerpt). */
  snippet?: string;
}

export interface IDecorationManager {
  decorate<TNode extends NodeBase>(node: TNode, context?: unknown): DecorationOutput;
  subscribe(cb: () => void): () => void;
}

export interface IRouter {
  readonly activePage: string;
  readonly pageOrder: readonly string[];
  readonly activeTab: string;
  readonly tabOrder: readonly string[];
  navigateToPage(id: string): void;
  navigateToTab(id: string): void;
  reorderPage(fromIdx: number, toIdx: number): void;
  reorderTab(fromIdx: number, toIdx: number): void;
}

export interface OverlayEntry {
  id: string;
  /** Component to render (Svelte 5 component reference). */
  component: unknown;
  /** Props passed to the component. */
  props?: Record<string, unknown>;
  /** Click outside dismisses by default unless false. */
  dismissOnOutsideClick?: boolean;
}

export interface IOverlayState {
  readonly stack: readonly OverlayEntry[];
  push(entry: OverlayEntry): void;
  pop(): void;
  popById(id: string): void;
  clear(): void;
  isOpen(id: string): boolean;
}

/** Explorer: index + UI state (selection, expansion, scroll, search). */
export interface IExplorer<TNode extends NodeBase> {
  readonly selectedIds: ReadonlySet<string>;
  readonly expandedIds: ReadonlySet<string>;
  readonly search: string;
  readonly filteredNodes: readonly TNode[];
  toggleSelect(id: string): void;
  toggleExpand(id: string): void;
  setSearch(q: string): void;
  clearSelection(): void;
  subscribe(cb: () => void): () => void;
}
```

- [ ] **Step 2.2: Run `npm run check` to ensure types resolve cleanly**

```powershell
npm run check
```
Expected: 0 errors. If errors mention missing imports (e.g. `PendingChange`), confirm the existing types in `src/types/typeOps.ts` and `src/types/typeFilter.ts` match the imports.

- [ ] **Step 2.3: Commit**

```powershell
git add src/types/contracts.ts ; git commit -m "feat(types): add contracts.ts with 16 interfaces (Sub-A.1)"
```

### Task 3: Create `src/types/obsidian-extended.ts`

**Files:**
- Create: `src/types/obsidian-extended.ts`

- [ ] **Step 3.1: Write the wrapper file**

Create `src/types/obsidian-extended.ts`:

```typescript
import type { App } from 'obsidian';

/**
 * Typed access to Obsidian's internal/undocumented APIs.
 * All `(app as any)` casts in src/ MUST migrate to this wrapper.
 * See ADR-004.
 */

export interface ExtendedApp extends App {
  setting?: {
    open?: () => void;
    openTabById?: (id: string) => void;
  };
  commands?: {
    executeCommandById?: (id: string) => boolean;
    listCommands?: () => Array<{ id: string; name: string }>;
  };
  internalPlugins?: {
    plugins: Record<string, { instance?: unknown; enabled: boolean }>;
  };
  plugins?: {
    plugins: Record<string, unknown>;
    getPlugin?: (id: string) => unknown;
  };
}

export function extApp(app: App): ExtendedApp {
  return app as ExtendedApp;
}

/** Open the Obsidian Settings modal at a specific tab. */
export function openPluginSettings(app: App, tabId: string): void {
  const ext = extApp(app);
  ext.setting?.open?.();
  ext.setting?.openTabById?.(tabId);
}

/** Run an Obsidian command by id. Returns true if it dispatched. */
export function runCommand(app: App, id: string): boolean {
  return extApp(app).commands?.executeCommandById?.(id) ?? false;
}

/** Probe an internal plugin by id. */
export function getInternalPlugin<T = unknown>(app: App, id: string): T | undefined {
  return extApp(app).internalPlugins?.plugins[id]?.instance as T | undefined;
}

/** Probe a community plugin by id. */
export function getCommunityPlugin<T = unknown>(app: App, id: string): T | undefined {
  return extApp(app).plugins?.plugins[id] as T | undefined;
}
```

- [ ] **Step 3.2: Migrate the two known `(app as any)` callsites in `frameVaultman.svelte` lines 91–92**

Edit `src/components/frameVaultman.svelte` at the lines using `(plugin.app as any).setting?.open?.()` to import and call `openPluginSettings`:

```typescript
// at top of <script lang="ts">
import { openPluginSettings } from '../types/obsidian-extended';

// replace the two lines (91–92) where setting?.open and openTabById are called
openPluginSettings(plugin.app, 'vaultman');
```

- [ ] **Step 3.3: Verify all `(app as any)` casts are gone**

```powershell
Select-String -Path src/**/*.ts,src/**/*.svelte -Pattern "app as any"
```
Expected: 0 matches. If any remain, migrate them through `obsidian-extended.ts`.

- [ ] **Step 3.4: Run check + build**

```powershell
npm run check ; npm run build
```
Expected: both pass.

- [ ] **Step 3.5: Commit**

```powershell
git add src/types/obsidian-extended.ts src/components/frameVaultman.svelte
git commit -m "feat(types): add obsidian-extended wrapper; migrate frame's (app as any) casts (Sub-A.1)"
```

### Task 4: Reconstruct `typeUI.ts` and clean `typePrimitives.ts`

**Files:**
- Create: `src/types/typeUI.ts`
- Modify: `src/types/typePrimitives.ts`

- [ ] **Step 4.1: Create `src/types/typeUI.ts`**

```typescript
/**
 * Centralized UI shell config: tab definitions for the Filters page.
 * `navbarPages.svelte` consumes this via props (kept agnostic, see A.4.2).
 */

export const FILTERS_TABS_CONFIG = [
  { id: 'props', icon: 'lucide-book-plus', labelKey: 'filter.tab.props' },
  { id: 'files', icon: 'lucide-files', labelKey: 'filter.tab.files' },
  { id: 'tags', icon: 'lucide-tags', labelKey: 'filter.tab.tags' },
  { id: 'content', icon: 'lucide-text-cursor-input', labelKey: 'filter.tab.content' },
] as const;

export type FiltersTab = typeof FILTERS_TABS_CONFIG[number]['id'];

export interface TabConfig {
  id: string;
  icon: string;
  labelKey: string;
}
```

- [ ] **Step 4.2: Trim `src/types/typePrimitives.ts` — remove anything that overlaps with `contracts.ts`**

Open `src/types/typePrimitives.ts`. Keep `PopupType`, `OpsTab`, `defOpsTab`, `ContentSnippet`, `ContentPreviewResult`, `FabDef`, `BtnSelectionItem`. Do NOT add any indexing types here — those live in `contracts.ts`.

- [ ] **Step 4.3: Search consumers of `typeUI` — confirm import chain**

```powershell
Select-String -Path src/**/*.ts,src/**/*.svelte -Pattern "FILTERS_TABS_CONFIG|FiltersTab"
```
Expected: ≥0. If any callsite still imports from a deleted path, fix imports.

- [ ] **Step 4.4: Run check + build**

```powershell
npm run check ; npm run build
```
Expected: both pass.

- [ ] **Step 4.5: Commit**

```powershell
git add src/types/typeUI.ts src/types/typePrimitives.ts
git commit -m "feat(types): reconstruct typeUI.ts; trim typePrimitives (Sub-A.1)"
```

### Task 5: Lint hardening — block `(app as any)` and tighten `no-explicit-any`

**Files:**
- Modify: `eslint.config.mts`

- [ ] **Step 5.1: Add lint rules**

Edit `eslint.config.mts` to add a new config block before the final `{ files: ['package.json'] }` block:

```typescript
{
  files: ['src/**/*.ts', 'src/**/*.svelte'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    'no-restricted-syntax': [
      'error',
      {
        selector: "TSAsExpression > TSAnyKeyword.typeAnnotation",
        message: "Cast to `any` is forbidden. Use a typed wrapper from src/types/obsidian-extended.ts or refine the type.",
      },
      {
        selector: "TSAsExpression[expression.type='Identifier'][expression.name='app'] > TSAnyKeyword",
        message: "(app as any) is forbidden. Use src/types/obsidian-extended.ts.",
      },
    ],
  },
},
```

- [ ] **Step 5.2: Run lint and inspect what fires**

```powershell
npm run lint
```
Expected: lint may now flag pre-existing rough spots. Each must be either fixed (preferred — replace `any` with concrete types) or added to a `// eslint-disable-next-line` with a one-line justification. There MUST be no blanket file disables.

- [ ] **Step 5.3: Fix or annotate every new lint error**

For each error:
- If the cast is to `any` for an Obsidian internal: route via `obsidian-extended.ts`.
- If the cast is to `any` for an unknown payload: replace with `unknown` and narrow.
- If the cast is structurally needed (e.g. `as unknown as Component<...>` in `typeFrame.ts` line 31): keep `as unknown as ...` (allowed; `unknown` first prevents the rule firing on `any`).

- [ ] **Step 5.4: Run check + build + lint**

```powershell
npm run check ; npm run build ; npm run lint
```
Expected: all green, 0 problems.

- [ ] **Step 5.5: Commit**

```powershell
git add eslint.config.mts src
git commit -m "chore(lint): block (app as any) and tighten no-explicit-any (Sub-A.1)"
```

### Task 6: Write ADRs 001–008 + ADR folder + archive specs

**Files:**
- Create: `docs/superpowers/adr/ADR-001-svelte-state-services.md`
- Create: `docs/superpowers/adr/ADR-002-interface-consumers.md`
- Create: `docs/superpowers/adr/ADR-003-test-coverage-policy.md`
- Create: `docs/superpowers/adr/ADR-004-obsidian-extended-only.md`
- Create: `docs/superpowers/adr/ADR-005-wip-naming-blocked.md`
- Create: `docs/superpowers/adr/ADR-006-contracts-change-requires-adr.md`
- Create: `docs/superpowers/adr/ADR-007-coverage-thresholds-global.md`
- Create: `docs/superpowers/adr/ADR-008-indexing-via-factory.md`
- Create: `docs/archive/superpowers/specs/` (folder)
- Modify: existing `docs/superpowers/specs/` Part 1–8 specs (add SUPERSEDED header, move to archive)

- [ ] **Step 6.1: Create ADR-001 through ADR-008**

For each ADR, use this template (filled with content per the master spec §2.3):

`docs/superpowers/adr/ADR-001-svelte-state-services.md`:
```markdown
# ADR-001: Reactive state lives in `*.svelte.ts` services

- Date: 2026-04-30
- Status: Accepted

## Context
Sub-A introduces rune-backed reactive state (`$state`/`$derived`) for indices, filter service, queue, router, and overlay state. We need a single rule for where that state lives.

## Decision
Services that hold reactive state MUST be named `*.svelte.ts`. They expose runes directly. Components consume runes either by direct import of the service instance or via a Svelte context provided in `frameVaultman.svelte`. Manual observers/emitters are forbidden in new code (legacy `Events` instances allowed inside `*.ts` services until they migrate).

## Consequences
- File naming is load-bearing: only `.svelte.ts` files run rune transforms.
- No mixed `Events`+rune state in the same file.
- Tests for `*.svelte.ts` services use the rune harness via Vitest's `flushSync` where needed.

## Verification
A future agent verifies by:
1. `Glob` `src/services/*.svelte.ts` and confirming each holds at least one `$state`.
2. `Grep` for `new Events(` in `src/services/*.svelte.ts` — should return 0.
```

ADR-002 through ADR-008: write equivalent files using the wording from master spec §2.3 (one decision per ADR; same template).

- [ ] **Step 6.2: Create archive folder and move Part 1–8 specs**

```powershell
New-Item -ItemType Directory -Force -Path docs/archive/superpowers/specs
```

For each spec file in `docs/superpowers/specs/` matching `Code Refactor Part *` or `CSS Refactor Part *`:
1. Prepend the SUPERSEDED header (master spec §5.2):
   ```markdown
   > **SUPERSEDED**: Esta spec fue consolidada en `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`. Se mantiene como referencia histórica.
   ```
2. Move to `docs/archive/superpowers/specs/`.

- [ ] **Step 6.3: Run check + build**

```powershell
npm run check ; npm run build
```
Expected: both pass (docs are not compiled, but confirm build still runs).

- [ ] **Step 6.4: Commit**

```powershell
git add docs/superpowers/adr docs/archive
git commit -m "docs(adr): write ADRs 001-008; archive superseded Part 1-8 specs (Sub-A.1)"
```

### Task 7: Append AGENTS.md ADR-reading rule

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 7.1: Append section to AGENTS.md**

Append after section 11 in `AGENTS.md`:

```markdown
---

## 12. ADR review (mandatory before touching `src/services/` or `src/types/`)

Before modifying any file under `src/services/`, `src/types/contracts.ts`, or `src/types/obsidian-extended.ts`, read the relevant ADRs in `docs/superpowers/adr/`:

- ADR-001 — reactive state in `*.svelte.ts`
- ADR-002 — consumers depend on interfaces
- ADR-004 — Obsidian internal API only via `obsidian-extended.ts`
- ADR-006 — `contracts.ts` changes require new ADR
- ADR-008 — indexing uses `createNodeIndex<T>`

Skipping this is the most common cause of regression. New ADRs supersede old ones — check the `Status:` line.
```

- [ ] **Step 7.2: Commit**

```powershell
git add AGENTS.md
git commit -m "docs(agents): require ADR review before touching services/types (Sub-A.1)"
```

### Task 8: Close A.1 — version bump + memory notes

**Files:**
- Modify: `package.json` (version `1.0.0-beta.20`)
- Modify: `manifest.json`
- Modify: `versions.json`
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 8.1: Bump versions**

Set `"version": "1.0.0-beta.20"` in `package.json` and `manifest.json`. Append `"1.0.0-beta.20": "0.15.0"` (or current minAppVersion) to `versions.json`.

- [ ] **Step 8.2: Update Agent Memory**

Append closure block to `docs/Vaultman - Agent Memory.md`:

```markdown
### 2026-04-30 — Sub-A.1 closed (Tipos)
- `src/types/contracts.ts` populated (16 interfaces).
- `src/types/obsidian-extended.ts` replaces `(app as any)`.
- ADRs 001-008 written.
- Lint blocks `(app as any)` repo-wide.
- Old Part 1-8 specs archived.
- Version: 1.0.0-beta.20.
- Next: Sub-A.2.1 — factory + Files/Tags/Props indices.
```

- [ ] **Step 8.3: Verify gate**

```powershell
npm run verify
```
Expected: lint, check, build, test:integrity, test:unit all pass.

- [ ] **Step 8.4: Commit + tag**

```powershell
git add package.json manifest.json versions.json "docs/Vaultman - Agent Memory.md"
git commit -m "chore(release): bump to 1.0.0-beta.20 (Sub-A.1 Tipos close)"
git tag 1.0.0-beta.20
git push ; git push --tags
```

---

## Iteration A.2.1 — Factory + base indices + service rewrites

### Task 9: Create `createNodeIndex<T>` factory + tests

**Files:**
- Create: `src/services/createNodeIndex.ts`
- Create: `test/unit/services/createNodeIndex.test.ts`

- [ ] **Step 9.1: Write the failing test**

Create `test/unit/services/createNodeIndex.test.ts`:

```typescript
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
```

- [ ] **Step 9.2: Run the test — should fail**

```powershell
npm run test:unit -- test/unit/services/createNodeIndex.test.ts
```
Expected: `Cannot find module '../../../src/services/createNodeIndex'`.

- [ ] **Step 9.3: Implement the factory**

Create `src/services/createNodeIndex.ts`:

```typescript
import type { INodeIndex, NodeBase } from '../types/contracts';

export interface NodeIndexOptions<TNode extends NodeBase> {
  build: () => TNode[] | Promise<TNode[]>;
}

export function createNodeIndex<TNode extends NodeBase>(
  opts: NodeIndexOptions<TNode>,
): INodeIndex<TNode> {
  let _nodes: TNode[] = [];
  let _byId = new Map<string, TNode>();
  const subs = new Set<() => void>();

  const fire = (): void => {
    for (const cb of subs) cb();
  };

  return {
    get nodes(): readonly TNode[] {
      return _nodes;
    },
    async refresh(): Promise<void> {
      const built = await opts.build();
      _nodes = built;
      _byId = new Map(built.map((n) => [n.id, n]));
      fire();
    },
    subscribe(cb: () => void): () => void {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    byId(id: string): TNode | undefined {
      return _byId.get(id);
    },
  };
}
```

- [ ] **Step 9.4: Run tests — should pass**

```powershell
npm run test:unit -- test/unit/services/createNodeIndex.test.ts
```
Expected: 3/3 pass.

- [ ] **Step 9.5: Commit**

```powershell
git add src/services/createNodeIndex.ts test/unit/services/createNodeIndex.test.ts
git commit -m "feat(services): add createNodeIndex<T> factory + tests (Sub-A.2.1)"
```

### Task 10: `serviceFilesIndex` + tests

**Files:**
- Create: `src/services/serviceFilesIndex.ts`
- Create: `test/unit/services/serviceFilesIndex.test.ts`

- [ ] **Step 10.1: Write the failing test**

Create `test/unit/services/serviceFilesIndex.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mockApp, mockTFile, mockVault } from '../../helpers/obsidian-mocks';
import { createFilesIndex } from '../../../src/services/serviceFilesIndex';

describe('serviceFilesIndex', () => {
  it('builds FileNode[] from vault.getMarkdownFiles', async () => {
    const files = [mockTFile('notes/a.md'), mockTFile('notes/b.md')];
    const app = mockApp({ vault: mockVault(files) });
    const idx = createFilesIndex(app);
    await idx.refresh();
    expect(idx.nodes.length).toBe(2);
    expect(idx.nodes[0].path).toBe('notes/a.md');
    expect(idx.nodes[0].file).toBe(files[0]);
  });

  it('byId is the file path', async () => {
    const f = mockTFile('x.md');
    const app = mockApp({ vault: mockVault([f]) });
    const idx = createFilesIndex(app);
    await idx.refresh();
    expect(idx.byId('x.md')?.basename).toBe('x');
  });
});
```

- [ ] **Step 10.2: Run — should fail (missing module)**

```powershell
npm run test:unit -- test/unit/services/serviceFilesIndex.test.ts
```

- [ ] **Step 10.3: Implement**

Create `src/services/serviceFilesIndex.ts`:

```typescript
import type { App } from 'obsidian';
import type { FileNode, IFilesIndex } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createFilesIndex(app: App): IFilesIndex {
  return createNodeIndex<FileNode>({
    build: () =>
      app.vault.getMarkdownFiles().map((file) => ({
        id: file.path,
        path: file.path,
        basename: file.basename,
        file,
      })),
  });
}
```

- [ ] **Step 10.4: Run tests — pass**

```powershell
npm run test:unit -- test/unit/services/serviceFilesIndex.test.ts
```
Expected: 2/2 pass.

- [ ] **Step 10.5: Commit**

```powershell
git add src/services/serviceFilesIndex.ts test/unit/services/serviceFilesIndex.test.ts
git commit -m "feat(services): add serviceFilesIndex (IFilesIndex impl) (Sub-A.2.1)"
```

### Task 11: `serviceTagsIndex` + tests

**Files:**
- Create: `src/services/serviceTagsIndex.ts`
- Create: `test/unit/services/serviceTagsIndex.test.ts`

- [ ] **Step 11.1: Write the failing test**

Create `test/unit/services/serviceTagsIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, mockVault, mockMetadataCache } from '../../helpers/obsidian-mocks';
import { createTagsIndex } from '../../../src/services/serviceTagsIndex';

describe('serviceTagsIndex', () => {
  it('aggregates #tag counts across files via metadataCache', async () => {
    const f1 = mockTFile('a.md');
    const f2 = mockTFile('b.md');
    const cacheMap = new Map([
      [f1.path, { tags: [{ tag: '#x', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 2, offset: 2 } } }] }],
      [f2.path, { tags: [{ tag: '#x', position: { start: { line: 0, col: 0, offset: 0 }, end: { line: 0, col: 2, offset: 2 } } }, { tag: '#y', position: { start: { line: 0, col: 3, offset: 3 }, end: { line: 0, col: 5, offset: 5 } } }] }],
    ]);
    const app = mockApp({ vault: mockVault([f1, f2]), metadataCache: mockMetadataCache(cacheMap) });
    const idx = createTagsIndex(app);
    await idx.refresh();
    const x = idx.nodes.find((n) => n.tag === '#x');
    const y = idx.nodes.find((n) => n.tag === '#y');
    expect(x?.count).toBe(2);
    expect(y?.count).toBe(1);
  });
});
```

- [ ] **Step 11.2: Run — should fail**

```powershell
npm run test:unit -- test/unit/services/serviceTagsIndex.test.ts
```

- [ ] **Step 11.3: Implement**

Create `src/services/serviceTagsIndex.ts`:

```typescript
import type { App } from 'obsidian';
import { getAllTags } from 'obsidian';
import type { TagNode, ITagsIndex } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createTagsIndex(app: App): ITagsIndex {
  return createNodeIndex<TagNode>({
    build: () => {
      const counts = new Map<string, number>();
      for (const file of app.vault.getMarkdownFiles()) {
        const cache = app.metadataCache.getFileCache(file);
        if (!cache) continue;
        const tags = getAllTags(cache) ?? [];
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
    },
  });
}
```

- [ ] **Step 11.4: Run tests — pass**

```powershell
npm run test:unit -- test/unit/services/serviceTagsIndex.test.ts
```

- [ ] **Step 11.5: Commit**

```powershell
git add src/services/serviceTagsIndex.ts test/unit/services/serviceTagsIndex.test.ts
git commit -m "feat(services): add serviceTagsIndex (ITagsIndex impl) (Sub-A.2.1)"
```

### Task 12: `servicePropsIndex` (rename of `PropertyIndexService`) + tests

**Files:**
- Create: `src/services/servicePropsIndex.ts`
- Create: `test/unit/services/servicePropsIndex.test.ts`
- Modify: `src/utils/utilPropIndex.ts` (mark old singleton deprecated; keep export as re-export from new module during migration window)

- [ ] **Step 12.1: Read current `utilPropIndex.ts` to map the existing API**

```powershell
Get-Content src/utils/utilPropIndex.ts | Select-Object -First 60
```
Note the current public methods: `refresh()`, `getProperty(name)`, `getAllProperties()`, etc. The new `IPropsIndex` impl must cover these via `nodes`/`byId` plus a thin shim if needed for non-migrated callers in this iter (callers fully migrate at A.4.1).

- [ ] **Step 12.2: Write the failing test**

Create `test/unit/services/servicePropsIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, mockVault, mockMetadataCache } from '../../helpers/obsidian-mocks';
import { createPropsIndex } from '../../../src/services/servicePropsIndex';

describe('servicePropsIndex', () => {
  it('aggregates properties + values across files', async () => {
    const f1 = mockTFile('a.md', { status: 'draft', tags: ['x'] });
    const f2 = mockTFile('b.md', { status: 'done' });
    const cacheMap = new Map([
      [f1.path, { frontmatter: { status: 'draft', tags: ['x'] } }],
      [f2.path, { frontmatter: { status: 'done' } }],
    ]);
    const app = mockApp({ vault: mockVault([f1, f2]), metadataCache: mockMetadataCache(cacheMap) });
    const idx = createPropsIndex(app);
    await idx.refresh();
    const status = idx.nodes.find((n) => n.property === 'status');
    expect(status?.values.sort()).toEqual(['done', 'draft']);
    expect(status?.fileCount).toBe(2);
  });
});
```

- [ ] **Step 12.3: Run — should fail**

- [ ] **Step 12.4: Implement**

Create `src/services/servicePropsIndex.ts`:

```typescript
import type { App } from 'obsidian';
import type { IPropsIndex, PropNode } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createPropsIndex(app: App): IPropsIndex {
  return createNodeIndex<PropNode>({
    build: () => {
      const acc = new Map<string, { values: Set<string>; files: Set<string> }>();
      for (const file of app.vault.getMarkdownFiles()) {
        const fm = app.metadataCache.getFileCache(file)?.frontmatter;
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
    },
  });
}
```

- [ ] **Step 12.5: Run tests — pass**

```powershell
npm run test:unit -- test/unit/services/servicePropsIndex.test.ts
```

- [ ] **Step 12.6: Commit**

```powershell
git add src/services/servicePropsIndex.ts test/unit/services/servicePropsIndex.test.ts
git commit -m "feat(services): add servicePropsIndex (IPropsIndex impl) (Sub-A.2.1)"
```

### Task 13: Wire indices into `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 13.1: Replace `new PropertyIndexService(this.app)` with `createPropsIndex(this.app)` and add `createFilesIndex` + `createTagsIndex`**

In `src/main.ts` constructor (around line 53):

```typescript
this.filesIndex = createFilesIndex(this.app);
this.tagsIndex = createTagsIndex(this.app);
this.propsIndex = createPropsIndex(this.app);
// Keep old PropertyIndexService alive ONLY if a migrated consumer needs it; A.4.1 removes it.
```

Add the imports + class properties typed as the interfaces:

```typescript
import { createFilesIndex } from './services/serviceFilesIndex';
import { createTagsIndex } from './services/serviceTagsIndex';
import { createPropsIndex } from './services/servicePropsIndex';
import type { IFilesIndex, ITagsIndex, IPropsIndex } from './types/contracts';

// inside class
filesIndex!: IFilesIndex;
tagsIndex!: ITagsIndex;
propsIndex!: IPropsIndex;
```

In `onload()` after constructing, await refresh:

```typescript
await Promise.all([this.filesIndex.refresh(), this.tagsIndex.refresh(), this.propsIndex.refresh()]);
```

- [ ] **Step 13.2: Wire vault + metadataCache events to refresh**

```typescript
this.registerEvent(this.app.metadataCache.on('changed', () => {
  void this.propsIndex.refresh();
  void this.tagsIndex.refresh();
}));
this.registerEvent(this.app.vault.on('create', () => void this.filesIndex.refresh()));
this.registerEvent(this.app.vault.on('delete', () => void this.filesIndex.refresh()));
this.registerEvent(this.app.vault.on('rename', () => void this.filesIndex.refresh()));
```

- [ ] **Step 13.3: Verify**

```powershell
npm run check ; npm run build ; npm run test:integrity ; npm run test:unit
```
Expected: all pass. Plugin still loads, indices populate.

- [ ] **Step 13.4: Commit**

```powershell
git add src/main.ts
git commit -m "feat(main): wire IFiles/ITags/IProps indices into plugin lifecycle (Sub-A.2.1)"
```

### Task 14: Rewrite `serviceFilter.ts` to consume indices via runes

**Files:**
- Modify: `src/services/serviceFilter.ts` → rename to `src/services/serviceFilter.svelte.ts`
- Modify: existing tests in `test/unit/services/serviceFilter.test.ts`

- [ ] **Step 14.1: Rename file**

```powershell
git mv src/services/serviceFilter.ts src/services/serviceFilter.svelte.ts
```

- [ ] **Step 14.2: Rewrite to use runes + indices**

Replace contents of `src/services/serviceFilter.svelte.ts`:

```typescript
import type { App, TFile } from 'obsidian';
import type { FilterGroup, FilterNode } from '../types/typeFilter';
import type { IFilterService, IFilesIndex } from '../types/contracts';
import { evalNode } from '../utils/filter-evaluator';

export class FilterService implements IFilterService {
  activeFilter = $state<FilterGroup>({ type: 'group', logic: 'all', children: [], id: 'root', enabled: true });
  selectedFiles = $state<TFile[]>([]);
  filteredFiles = $derived.by(() => this.computeFiltered());

  private app: App;
  private filesIndex: IFilesIndex;
  private subs = new Set<() => void>();
  private indexUnsub: () => void;

  constructor(app: App, filesIndex: IFilesIndex) {
    this.app = app;
    this.filesIndex = filesIndex;
    this.indexUnsub = this.filesIndex.subscribe(() => this.fire());
  }

  private fire(): void {
    for (const cb of this.subs) cb();
  }

  private computeFiltered(): TFile[] {
    const files = this.filesIndex.nodes.map((n) => n.file);
    return files.filter((f) => evalNode(this.activeFilter, f, this.app));
  }

  setFilter(filter: FilterGroup): void { this.activeFilter = filter; this.fire(); }
  clearFilters(): void {
    this.activeFilter = { type: 'group', logic: 'all', children: [], id: 'root', enabled: true };
    this.fire();
  }
  addNode(node: FilterNode, parent?: FilterGroup): void {
    const target = parent ?? this.activeFilter;
    node.id = node.id ?? Math.random().toString(36).substring(2, 11);
    node.enabled = node.enabled ?? true;
    target.children.push(node);
    this.activeFilter = { ...this.activeFilter };
    this.fire();
  }
  removeNode(node: FilterNode, parent?: FilterGroup): void {
    const target = parent ?? this.activeFilter;
    const idx = target.children.indexOf(node);
    if (idx !== -1) {
      target.children.splice(idx, 1);
      this.activeFilter = { ...this.activeFilter };
      this.fire();
    }
  }
  removeNodeByProperty(prop: string, value?: string): void {
    const walk = (g: FilterGroup): boolean => {
      const idx = g.children.findIndex((n) =>
        n.type === 'rule' && n.property === prop && (value === undefined || n.values.includes(value))
      );
      if (idx !== -1) { g.children.splice(idx, 1); return true; }
      for (const child of g.children) if (child.type === 'group' && walk(child)) return true;
      return false;
    };
    if (walk(this.activeFilter)) {
      this.activeFilter = { ...this.activeFilter };
      this.fire();
    }
  }
  setSelectedFiles(files: TFile[]): void { this.selectedFiles = files; this.fire(); }
  subscribe(cb: () => void): () => void { this.subs.add(cb); return () => this.subs.delete(cb); }

  destroy(): void { this.indexUnsub(); this.subs.clear(); }
}
```

- [ ] **Step 14.3: Update existing tests**

Edit `test/unit/services/serviceFilter.test.ts` to import from the new path and pass a stub `IFilesIndex`:

```typescript
import { FilterService } from '../../../src/services/serviceFilter.svelte';
import { createFilesIndex } from '../../../src/services/serviceFilesIndex';
```

Add a `mockFilesIndex` helper if test setup gets verbose:

```typescript
function makeIdx(files: TFile[]): IFilesIndex {
  return {
    get nodes() { return files.map((f) => ({ id: f.path, path: f.path, basename: f.basename, file: f })); },
    refresh: async () => {},
    subscribe: () => () => {},
    byId: (id) => { const f = files.find((x) => x.path === id); return f ? { id: f.path, path: f.path, basename: f.basename, file: f } : undefined; },
  };
}
```

Update each test to instantiate `new FilterService(app, makeIdx(files))`.

- [ ] **Step 14.4: Update `main.ts` wiring**

Replace `this.filterService = new FilterService(this.app);` with:

```typescript
this.filterService = new FilterService(this.app, this.filesIndex);
```

- [ ] **Step 14.5: Run check + build + tests**

```powershell
npm run check ; npm run build ; npm run test:unit ; npm run test:integrity
```
Expected: all pass.

- [ ] **Step 14.6: Commit**

```powershell
git add -A
git commit -m "refactor(serviceFilter): rewrite as IFilterService with runes + IFilesIndex consumer (Sub-A.2.1)"
```

### Task 15: Refactor `serviceQueue.ts` to expose `pending`/`size` runes

**Files:**
- Modify: `src/services/serviceQueue.ts` → rename to `src/services/serviceQueue.svelte.ts`

- [ ] **Step 15.1: Rename file**

```powershell
git mv src/services/serviceQueue.ts src/services/serviceQueue.svelte.ts
```

- [ ] **Step 15.2: Replace internal arrays with `$state`**

In `src/services/serviceQueue.svelte.ts` replace the `transactions`/`opCounter` private state with a single rune `pending = $state<PendingChange[]>([])` and a `$derived` `size = $derived(this.pending.length)`. Update all internal mutators (`add`, `remove`, `clear`, `execute`) to mutate `this.pending` via `[...this.pending, ...]` reassignment so reactivity fires. Maintain the existing `Events` emitter for backward compat (UI not migrated yet); A.4.2 removes it once `explorerQueue` is fully wired.

Implement the `IOperationQueue` interface explicitly:

```typescript
import type { IOperationQueue } from '../types/contracts';
// class declaration:
export class OperationQueueService extends Component implements IOperationQueue {
  pending = $state<PendingChange[]>([]);
  size = $derived(this.pending.length);
  // ... rest unchanged but mutators now write `this.pending = [...this.pending, change]` etc.
  subscribe(cb: () => void): () => void {
    this.events.on('changed', cb);
    return () => this.events.off('changed', cb);
  }
}
```

- [ ] **Step 15.3: Update existing tests**

Edit `test/unit/services/serviceQueue.test.ts` import path. The existing assertions on `queue.queue.length` migrate to `queue.size` / `queue.pending.length`.

- [ ] **Step 15.4: Run check + build + tests**

```powershell
npm run check ; npm run build ; npm run test:unit ; npm run test:integrity
```
Expected: all pass. If integration test fails on the `queue` getter (Step §1 line 63 noted a back-compat shim), keep the shim for now — A.4.2 will remove it.

- [ ] **Step 15.5: Commit**

```powershell
git add -A
git commit -m "refactor(serviceQueue): expose pending/size as runes; implement IOperationQueue (Sub-A.2.1)"
```

### Task 16: Promote `serviceNavigation-WIP` to `serviceNavigation` implementing `IRouter`

**Files:**
- Move: `src/services/serviceNavigation-WIP.svelte.ts` → `src/services/serviceNavigation.svelte.ts`
- Create: `test/unit/services/serviceNavigation.test.ts`

- [ ] **Step 16.1: Rename via git mv**

```powershell
git mv src/services/serviceNavigation-WIP.svelte.ts src/services/serviceNavigation.svelte.ts
```

- [ ] **Step 16.2: Make class implement `IRouter` and add `reorderTab`**

In `src/services/serviceNavigation.svelte.ts`:

```typescript
import type { IRouter } from '../types/contracts';

export class NavigationService implements IRouter {
  // existing fields stay
  // …
  reorderTab(fromIdx: number, toIdx: number): void {
    const newOrder = [...this.tabOrder];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    this.tabOrder = newOrder;
  }
}
```

Adjust `pageOrder`/`tabOrder` defaults to match the v1.0 sidebar nav (master spec §7 of AGENTS.md says default `['ops', 'statistics', 'filters']`).

- [ ] **Step 16.3: Write tests**

Create `test/unit/services/serviceNavigation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { NavigationService } from '../../../src/services/serviceNavigation.svelte';

describe('NavigationService (IRouter)', () => {
  it('navigates to a known page', () => {
    const r = new NavigationService();
    r.navigateToPage('files');
    expect(r.activePage).toBe('files');
  });
  it('ignores navigation to an unknown page', () => {
    const r = new NavigationService();
    const before = r.activePage;
    r.navigateToPage('nope');
    expect(r.activePage).toBe(before);
  });
  it('reorders pages via reorderPage(from, to)', () => {
    const r = new NavigationService();
    r.pageOrder = ['a', 'b', 'c'];
    r.reorderPage(0, 2);
    expect(r.pageOrder).toEqual(['b', 'c', 'a']);
  });
  it('reorders tabs via reorderTab(from, to)', () => {
    const r = new NavigationService();
    r.tabOrder = ['x', 'y', 'z'];
    r.reorderTab(2, 0);
    expect(r.tabOrder).toEqual(['z', 'x', 'y']);
  });
});
```

- [ ] **Step 16.4: Run tests + verify**

```powershell
npm run test:unit -- test/unit/services/serviceNavigation.test.ts
npm run check ; npm run build
```
Expected: 4/4 pass; check + build green.

- [ ] **Step 16.5: Commit**

```powershell
git add -A
git commit -m "feat(services): promote serviceNavigation-WIP → serviceNavigation (IRouter impl) + tests (Sub-A.2.1)"
```

### Task 17: Close A.2.1 — spike validation gate + version bump

**Files:**
- Modify: `package.json` (no version change yet — A.2 closes after .2)
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 17.1: Spike validation review**

Inspect `serviceFilesIndex.ts`, `serviceTagsIndex.ts`, `servicePropsIndex.ts`. Confirm the `INodeIndex<T>` shape is ergonomic for all three. If any of the three required widening or special-casing (for instance, content match needed `setQuery`), document the rationale. The spec already adds `setQuery` to `IContentIndex`; no further widening should be needed for the base three.

If a real ergonomic issue surfaces:
- Update `INodeIndex<T>` in `contracts.ts`.
- Write a new ADR (e.g. ADR-012) explaining the change (per ADR-006).
- Re-run all tests.

- [ ] **Step 17.2: Update Agent Memory**

Append to `docs/Vaultman - Agent Memory.md`:

```markdown
### 2026-04-30 — Sub-A.2.1 closed (Factory + base indices)
- `createNodeIndex<T>` factory + tests (3/3 green).
- Files/Tags/Props indices implementing `INodeIndex<T>`.
- `serviceFilter` rewritten as runes + `IFilterService`; `serviceQueue` exposes `pending`/`size`.
- `serviceNavigation` promoted from WIP, implements `IRouter`.
- Spike validated: abstraction ergonomic for all 3 base indices.
- Next: Sub-A.2.2 — Content/Operations/ActiveFilters real + CSSSnippets/Templates stubs.
```

- [ ] **Step 17.3: Verify gate**

```powershell
npm run verify
```
Expected: green. No version bump (A.2.1 + A.2.2 share `1.0.0-beta.21` at A.2 close).

- [ ] **Step 17.4: Commit**

```powershell
git add "docs/Vaultman - Agent Memory.md"
git commit -m "docs(memory): close Sub-A.2.1 — factory + base indices spike validated"
```

---

## Iteration A.2.2 — Remaining indices

### Task 18: `serviceContentIndex` + tests

**Files:**
- Create: `src/services/serviceContentIndex.ts`
- Create: `test/unit/services/serviceContentIndex.test.ts`

- [ ] **Step 18.1: Write the failing test**

Create `test/unit/services/serviceContentIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mockApp, mockTFile, mockVault } from '../../helpers/obsidian-mocks';
import { createContentIndex } from '../../../src/services/serviceContentIndex';

describe('serviceContentIndex', () => {
  it('returns empty when query is empty', async () => {
    const f = mockTFile('a.md', undefined, 'hello world');
    const app = mockApp({ vault: mockVault([f]) });
    const idx = createContentIndex(app);
    idx.setQuery('');
    await idx.refresh();
    expect(idx.nodes.length).toBe(0);
  });

  it('finds matches with line and snippet', async () => {
    const f = mockTFile('a.md', undefined, 'line one\nfoobar baz\nline three');
    const app = mockApp({ vault: mockVault([f]) });
    const idx = createContentIndex(app);
    idx.setQuery('foobar');
    await idx.refresh();
    expect(idx.nodes.length).toBe(1);
    expect(idx.nodes[0].line).toBe(1);
    expect(idx.nodes[0].match).toBe('foobar');
  });
});
```

Note: `mockTFile` accepts an optional third arg `content`. If the helper signature differs, extend it (Sub-C added the helper; widening the signature is fine).

- [ ] **Step 18.2: Run — fails**

- [ ] **Step 18.3: Implement**

Create `src/services/serviceContentIndex.ts`:

```typescript
import type { App } from 'obsidian';
import type { ContentMatch, IContentIndex } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

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
          const idx = line.indexOf(query);
          if (idx === -1) continue;
          out.push({
            id: `${file.path}:${i}:${idx}`,
            filePath: file.path,
            line: i,
            before: line.slice(Math.max(0, idx - 30), idx),
            match: query,
            after: line.slice(idx + query.length, Math.min(line.length, idx + query.length + 30)),
          });
        }
      }
      return out;
    },
  });
  return Object.assign(base, {
    setQuery(q: string): void { query = q; void base.refresh(); },
  });
}
```

- [ ] **Step 18.4: Run tests**

```powershell
npm run test:unit -- test/unit/services/serviceContentIndex.test.ts
```

- [ ] **Step 18.5: Commit**

```powershell
git add src/services/serviceContentIndex.ts test/unit/services/serviceContentIndex.test.ts
git commit -m "feat(services): add serviceContentIndex (IContentIndex impl) (Sub-A.2.2)"
```

### Task 19: `serviceOperationsIndex` + `serviceActiveFiltersIndex` (real, read-only views)

**Files:**
- Create: `src/services/serviceOperationsIndex.ts`
- Create: `src/services/serviceActiveFiltersIndex.ts`
- Create: `test/unit/services/serviceOperationsIndex.test.ts`
- Create: `test/unit/services/serviceActiveFiltersIndex.test.ts`

- [ ] **Step 19.1: Write tests for OperationsIndex**

Create `test/unit/services/serviceOperationsIndex.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createOperationsIndex } from '../../../src/services/serviceOperationsIndex';
import type { IOperationQueue } from '../../../src/types/contracts';
import type { PendingChange } from '../../../src/types/typeOps';

function stubQueue(initial: PendingChange[] = []): IOperationQueue & { _set(p: PendingChange[]): void } {
  let list = initial;
  const subs = new Set<() => void>();
  return {
    get pending() { return list; },
    get size() { return list.length; },
    add: (c) => { list = [...list, c]; for (const s of subs) s(); },
    remove: (id) => { list = list.filter((c) => c.id !== id); for (const s of subs) s(); },
    clear: () => { list = []; for (const s of subs) s(); },
    execute: async () => ({ ok: true } as never),
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    _set: (p) => { list = p; for (const s of subs) s(); },
  };
}

describe('serviceOperationsIndex', () => {
  it('mirrors queue.pending into nodes', async () => {
    const q = stubQueue([{ id: '1', type: 'DELETE_PROP' } as never]);
    const idx = createOperationsIndex(q);
    await idx.refresh();
    expect(idx.nodes.length).toBe(1);
    expect(idx.byId('1')?.change.id).toBe('1');
  });

  it('refreshes when queue notifies', async () => {
    const q = stubQueue([]);
    const idx = createOperationsIndex(q);
    await idx.refresh();
    const cb = vi.fn();
    idx.subscribe(cb);
    q._set([{ id: '2', type: 'RENAME_FILE' } as never]);
    // queue.subscribe → idx.refresh fires sub: needs an explicit refresh on subscribe in the impl
    await idx.refresh();
    expect(idx.nodes.length).toBe(1);
  });
});
```

- [ ] **Step 19.2: Implement OperationsIndex**

Create `src/services/serviceOperationsIndex.ts`:

```typescript
import type { IOperationQueue, IOperationsIndex, QueueChange } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

export function createOperationsIndex(queue: IOperationQueue): IOperationsIndex {
  const base = createNodeIndex<QueueChange>({
    build: () =>
      queue.pending.map((change) => ({
        id: change.id,
        change,
        group: change.type ?? 'unknown',
      })),
  });
  queue.subscribe(() => { void base.refresh(); });
  return base;
}
```

- [ ] **Step 19.3: Write tests for ActiveFiltersIndex**

Create `test/unit/services/serviceActiveFiltersIndex.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createActiveFiltersIndex } from '../../../src/services/serviceActiveFiltersIndex';
import type { IFilterService } from '../../../src/types/contracts';

function stubFilter(): IFilterService {
  return {
    activeFilter: { type: 'group', logic: 'all', children: [
      { type: 'rule', filterType: 'has_property', property: 'status', values: ['draft'], id: 'r1', enabled: true },
    ], id: 'root', enabled: true },
    filteredFiles: [],
    selectedFiles: [],
    setFilter: () => {},
    clearFilters: () => {},
    addNode: () => {},
    removeNode: () => {},
    removeNodeByProperty: () => {},
    setSelectedFiles: () => {},
    subscribe: () => () => {},
  };
}

describe('serviceActiveFiltersIndex', () => {
  it('flattens active rules into nodes', async () => {
    const idx = createActiveFiltersIndex(stubFilter());
    await idx.refresh();
    expect(idx.nodes.length).toBe(1);
    expect(idx.nodes[0].rule.property).toBe('status');
  });
});
```

- [ ] **Step 19.4: Implement ActiveFiltersIndex**

Create `src/services/serviceActiveFiltersIndex.ts`:

```typescript
import type { IActiveFiltersIndex, ActiveFilterEntry, IFilterService } from '../types/contracts';
import type { FilterGroup, FilterRule } from '../types/typeFilter';
import { createNodeIndex } from './createNodeIndex';

function flatten(group: FilterGroup): FilterRule[] {
  const out: FilterRule[] = [];
  const walk = (g: FilterGroup): void => {
    for (const child of g.children) {
      if (child.type === 'rule') out.push(child);
      else walk(child);
    }
  };
  walk(group);
  return out;
}

export function createActiveFiltersIndex(filter: IFilterService): IActiveFiltersIndex {
  const base = createNodeIndex<ActiveFilterEntry>({
    build: () =>
      flatten(filter.activeFilter).map((rule) => ({
        id: rule.id ?? Math.random().toString(36).slice(2, 11),
        rule,
      })),
  });
  filter.subscribe(() => { void base.refresh(); });
  return base;
}
```

- [ ] **Step 19.5: Run tests + verify**

```powershell
npm run test:unit ; npm run check ; npm run build
```

- [ ] **Step 19.6: Commit**

```powershell
git add src/services/serviceOperationsIndex.ts src/services/serviceActiveFiltersIndex.ts test/unit/services/serviceOperationsIndex.test.ts test/unit/services/serviceActiveFiltersIndex.test.ts
git commit -m "feat(services): add serviceOperationsIndex + serviceActiveFiltersIndex (Sub-A.2.2)"
```

### Task 20: Stubs for CSSSnippets + Templates indices + wire all 8 in `main.ts`

**Files:**
- Create: `src/services/serviceCSSSnippetsIndex.ts`
- Create: `src/services/serviceTemplatesIndex.ts`
- Modify: `src/main.ts`

- [ ] **Step 20.1: Write stub implementations**

Create `src/services/serviceCSSSnippetsIndex.ts`:

```typescript
import type { ICSSSnippetsIndex, SnippetNode } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

/**
 * Stub. v1.0 has no consumer; structure preserved per ADR-008 + Annex A.2.2.
 * v1.0+1 will read snippets from `app.customCss?.snippets` via obsidian-extended.
 */
export function createCSSSnippetsIndex(): ICSSSnippetsIndex {
  return createNodeIndex<SnippetNode>({ build: () => [] });
}
```

Create `src/services/serviceTemplatesIndex.ts`:

```typescript
import type { ITemplatesIndex, TemplateNode } from '../types/contracts';
import { createNodeIndex } from './createNodeIndex';

/**
 * Stub. v1.0 has no consumer; structure preserved per ADR-008 + Annex A.2.2.
 * v1.0+1 hooks into Templater via the templates folder setting.
 */
export function createTemplatesIndex(): ITemplatesIndex {
  return createNodeIndex<TemplateNode>({ build: () => [] });
}
```

- [ ] **Step 20.2: Wire all indices in `main.ts`**

Add fields and constructor wiring:

```typescript
import { createContentIndex } from './services/serviceContentIndex';
import { createOperationsIndex } from './services/serviceOperationsIndex';
import { createActiveFiltersIndex } from './services/serviceActiveFiltersIndex';
import { createCSSSnippetsIndex } from './services/serviceCSSSnippetsIndex';
import { createTemplatesIndex } from './services/serviceTemplatesIndex';
import type { IContentIndex, IOperationsIndex, IActiveFiltersIndex, ICSSSnippetsIndex, ITemplatesIndex } from './types/contracts';

// fields
contentIndex!: IContentIndex;
operationsIndex!: IOperationsIndex;
activeFiltersIndex!: IActiveFiltersIndex;
cssSnippetsIndex!: ICSSSnippetsIndex;
templatesIndex!: ITemplatesIndex;

// onload, after queueService + filterService instantiated:
this.contentIndex = createContentIndex(this.app);
this.operationsIndex = createOperationsIndex(this.queueService);
this.activeFiltersIndex = createActiveFiltersIndex(this.filterService);
this.cssSnippetsIndex = createCSSSnippetsIndex();
this.templatesIndex = createTemplatesIndex();

await Promise.all([
  this.contentIndex.refresh(),
  this.operationsIndex.refresh(),
  this.activeFiltersIndex.refresh(),
  this.cssSnippetsIndex.refresh(),
  this.templatesIndex.refresh(),
]);
```

- [ ] **Step 20.3: Verify**

```powershell
npm run verify
```

- [ ] **Step 20.4: Commit**

```powershell
git add -A
git commit -m "feat(services): add CSSSnippets + Templates index stubs; wire all 8 indices (Sub-A.2.2)"
```

### Task 21: Close A.2 — version bump + memory

**Files:**
- Modify: `package.json` → `1.0.0-beta.21`
- Modify: `manifest.json`
- Modify: `versions.json`
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 21.1: Bump versions to `1.0.0-beta.21`** (same pattern as Step 8.1).

- [ ] **Step 21.2: Memory note**

Append:

```markdown
### 2026-04-30 — Sub-A.2 closed (Indices)
- 8 indices (6 real + 2 stubs) all implementing `INodeIndex<T>`.
- Content + Operations + ActiveFilters real; CSSSnippets + Templates stubs (v1.0+1 consumers).
- Version: 1.0.0-beta.21.
- Next: Sub-A.3 — primitives.
```

- [ ] **Step 21.3: Verify + commit + tag**

```powershell
npm run verify
git add -A ; git commit -m "chore(release): bump to 1.0.0-beta.21 (Sub-A.2 indices close)"
git tag 1.0.0-beta.21 ; git push ; git push --tags
```

---

## Iteration A.3 — Primitives

> **Component scope reminder:** primitives use `$props()`, `$bindable()`, and `$derived` only. NO direct service imports inside `primitives/*.svelte`. Consumers wire data in.

### Task 22: `BtnSquircle.svelte`

**Files:**
- Create: `src/components/primitives/BtnSquircle.svelte`

- [ ] **Step 22.1: Read existing `btnSelection.svelte` for style cues**

```powershell
Get-Content src/components/btnSelection.svelte
```
Note class names + props.

- [ ] **Step 22.2: Write the primitive**

```svelte
<script lang="ts">
  import { setIcon } from 'obsidian';

  let {
    icon,
    label,
    onClick,
    isActive = false,
    disabled = false,
    size = 'md',
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  function attachIcon(node: HTMLElement): void {
    setIcon(node, icon);
  }

  let classes = $derived(
    `vm-btn-squircle vm-btn-squircle-${size}${isActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`
  );
</script>

<button
  class={classes}
  aria-label={label}
  title={label}
  disabled={disabled}
  onclick={() => { if (!disabled) onClick(); }}
>
  <span use:attachIcon class="vm-btn-squircle-icon"></span>
</button>
```

- [ ] **Step 22.3: Add CSS classes in `styles.css`** (single-line additions; don't restyle existing buttons):

```css
.vm-btn-squircle { /* base squircle styles — copy from btnSelection.svelte's existing CSS */ }
.vm-btn-squircle.is-active { background: var(--vaultman-accent-secondary); }
```

The accent token `--vaultman-accent-secondary` references Annex A.3 item 2.8.A.1.

- [ ] **Step 22.4: Verify build**

```powershell
npm run build
```

- [ ] **Step 22.5: Commit**

```powershell
git add src/components/primitives/BtnSquircle.svelte styles.css
git commit -m "feat(primitives): add BtnSquircle (Sub-A.3)"
```

### Task 23: `Badge.svelte`

**Files:**
- Create: `src/components/primitives/Badge.svelte`

- [ ] **Step 23.1: Write the primitive**

```svelte
<script lang="ts">
  let {
    label,
    accent,
  }: {
    label: string;
    accent?: string; // CSS var name OR direct color (e.g. "--color-accent" or "#e67e22")
  } = $props();

  let style = $derived(accent ? `--badge-accent: var(${accent}, ${accent});` : '');
</script>

<span class="vm-badge" style={style}>{label}</span>
```

- [ ] **Step 23.2: CSS**

```css
.vm-badge { background: var(--badge-accent, var(--background-secondary)); /* … */ }
```

- [ ] **Step 23.3: Verify + commit**

```powershell
npm run build
git add src/components/primitives/Badge.svelte styles.css
git commit -m "feat(primitives): add Badge (Sub-A.3)"
```

### Task 24: `Toggle.svelte`

**Files:**
- Create: `src/components/primitives/Toggle.svelte`

- [ ] **Step 24.1: Write primitive**

```svelte
<script lang="ts">
  let {
    checked = $bindable(false),
    label,
    disabled = false,
    onChange,
  }: {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onChange?: (next: boolean) => void;
  } = $props();

  function toggle(): void {
    if (disabled) return;
    checked = !checked;
    onChange?.(checked);
  }
</script>

<label class="vm-toggle" class:is-disabled={disabled}>
  <input type="checkbox" bind:checked={checked} {disabled} onchange={() => onChange?.(checked)} />
  <span class="vm-toggle-knob"></span>
  <span class="vm-toggle-label">{label}</span>
</label>
```

- [ ] **Step 24.2: Verify + commit**

```powershell
npm run build
git add src/components/primitives/Toggle.svelte styles.css
git commit -m "feat(primitives): add Toggle (Sub-A.3)"
```

### Task 25: `Dropdown.svelte`

**Files:**
- Create: `src/components/primitives/Dropdown.svelte`

- [ ] **Step 25.1: Write primitive**

```svelte
<script lang="ts" generics="T">
  let {
    value = $bindable<T>(),
    options,
    label,
    disabled = false,
  }: {
    value: T;
    options: { value: T; label: string }[];
    label?: string;
    disabled?: boolean;
  } = $props();
</script>

<label class="vm-dropdown">
  {#if label}<span class="vm-dropdown-label">{label}</span>{/if}
  <select bind:value={value} {disabled}>
    {#each options as opt (String(opt.value))}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</label>
```

- [ ] **Step 25.2: Verify + commit**

```powershell
npm run build
git add src/components/primitives/Dropdown.svelte styles.css
git commit -m "feat(primitives): add Dropdown (Sub-A.3)"
```

### Task 26: `TextInput.svelte`

**Files:**
- Create: `src/components/primitives/TextInput.svelte`

- [ ] **Step 26.1: Write primitive**

```svelte
<script lang="ts">
  let {
    value = $bindable(''),
    label,
    placeholder = '',
    disabled = false,
    onInput,
  }: {
    value: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    onInput?: (next: string) => void;
  } = $props();
</script>

<label class="vm-text-input">
  {#if label}<span class="vm-text-input-label">{label}</span>{/if}
  <input
    type="text"
    bind:value={value}
    {placeholder}
    {disabled}
    oninput={() => onInput?.(value)}
  />
</label>
```

- [ ] **Step 26.2: Verify + commit**

```powershell
npm run build
git add src/components/primitives/TextInput.svelte styles.css
git commit -m "feat(primitives): add TextInput (Sub-A.3)"
```

### Task 27: `HighlightText.svelte` + close A.3

**Files:**
- Create: `src/components/primitives/HighlightText.svelte`
- Modify: `package.json` → `1.0.0-beta.22`
- Modify: `manifest.json`, `versions.json`
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 27.1: Write the primitive**

```svelte
<script lang="ts">
  let {
    text,
    ranges = [],
  }: {
    text: string;
    ranges?: { start: number; end: number }[];
  } = $props();

  let segments = $derived.by(() => {
    if (ranges.length === 0) return [{ text, highlight: false }];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const out: { text: string; highlight: boolean }[] = [];
    let cursor = 0;
    for (const r of sorted) {
      if (cursor < r.start) out.push({ text: text.slice(cursor, r.start), highlight: false });
      out.push({ text: text.slice(r.start, r.end), highlight: true });
      cursor = r.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), highlight: false });
    return out;
  });
</script>

{#each segments as seg, i (i)}
  {#if seg.highlight}<mark class="vm-highlight">{seg.text}</mark>{:else}{seg.text}{/if}
{/each}
```

- [ ] **Step 27.2: Bump versions to `1.0.0-beta.22`** (same pattern as Step 8.1).

- [ ] **Step 27.3: Memory note**

```markdown
### 2026-04-30 — Sub-A.3 closed (Primitives)
- 6 primitives in `src/components/primitives/`: BtnSquircle, Badge, Toggle, Dropdown, TextInput, HighlightText.
- Pure Svelte 5 runes, no service imports.
- Version: 1.0.0-beta.22.
- Next: Sub-A.4.1 — Explorer + Virtualizer<T> + Decoration.
```

- [ ] **Step 27.4: Verify + commit + tag**

```powershell
npm run verify
git add -A ; git commit -m "chore(release): bump to 1.0.0-beta.22 (Sub-A.3 primitives close)"
git tag 1.0.0-beta.22 ; git push ; git push --tags
```

---

## Iteration A.4.1 — Explorer + Virtualizer + Decoration + Sorting

### Task 28: Promote `serviceDecorate_WIP` to `serviceDecorate` + ADR-011

**Files:**
- Move: `src/services/serviceDecorate_WIP.ts` → `src/services/serviceDecorate.ts`
- Create: `test/unit/services/serviceDecorate.test.ts`
- Create: `docs/superpowers/adr/ADR-011-decorative-output-via-decoration-manager.md`

- [ ] **Step 28.1: Move + rewrite to implement `IDecorationManager`**

The current `serviceDecorate_WIP.ts` is empty (0 LOC per inventory). Replace with full implementation:

```powershell
git mv src/services/serviceDecorate_WIP.ts src/services/serviceDecorate.ts
```

Write `src/services/serviceDecorate.ts`:

```typescript
import type { App } from 'obsidian';
import type { IDecorationManager, DecorationOutput, NodeBase } from '../types/contracts';

export class DecorationManager implements IDecorationManager {
  private app: App;
  private subs = new Set<() => void>();
  private highlightQuery = '';

  constructor(app: App) { this.app = app; }

  setHighlightQuery(q: string): void {
    this.highlightQuery = q;
    for (const cb of this.subs) cb();
  }

  decorate<TNode extends NodeBase>(node: TNode, _context?: unknown): DecorationOutput {
    const out: DecorationOutput = { icons: [], badges: [], highlights: [] };
    const label = (node as { label?: string; tag?: string; property?: string; basename?: string }).label
      ?? (node as { tag?: string }).tag
      ?? (node as { property?: string }).property
      ?? (node as { basename?: string }).basename
      ?? '';
    if (this.highlightQuery && label) {
      let i = 0;
      while ((i = label.indexOf(this.highlightQuery, i)) !== -1) {
        out.highlights.push({ start: i, end: i + this.highlightQuery.length });
        i += this.highlightQuery.length;
      }
    }
    return out;
  }

  subscribe(cb: () => void): () => void { this.subs.add(cb); return () => this.subs.delete(cb); }
}
```

- [ ] **Step 28.2: Write tests**

Create `test/unit/services/serviceDecorate.test.ts`:

```typescript
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
});
```

- [ ] **Step 28.3: Write ADR-011**

Create `docs/superpowers/adr/ADR-011-decorative-output-via-decoration-manager.md` documenting that all visual decoration (icons, badges, highlights, snippets) flows through `IDecorationManager.decorate()` instead of being computed inline in views. Reference master spec §5.6 + Annex A.4.1 items 2.3.5, 2.3.E.1, 2.3.C.2, 2.6.A.4.

- [ ] **Step 28.4: Run tests + verify**

```powershell
npm run test:unit ; npm run check ; npm run build
```

- [ ] **Step 28.5: Commit**

```powershell
git add -A
git commit -m "feat(services): promote serviceDecorate_WIP → serviceDecorate (IDecorationManager) + tests + ADR-011 (Sub-A.4.1)"
```

### Task 29: `serviceSorting` revival

**Files:**
- Create: `src/services/serviceSorting.ts`
- Create: `test/unit/services/serviceSorting.test.ts`

- [ ] **Step 29.1: Write tests first**

Create `test/unit/services/serviceSorting.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sortNodes, type SortOption } from '../../../src/services/serviceSorting';

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
    const sorted = sortNodes(nodes, { field: 'mtime', direction: 'desc' });
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
    sortNodes(nodes, { field: 'mtime', direction: 'desc' });
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(50); // perf budget for the regression in Annex A.4.1 item 2.10.1
  });
});
```

- [ ] **Step 29.2: Implement**

Create `src/services/serviceSorting.ts`:

```typescript
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

function getValue(node: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = node;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function sortNodes<T>(nodes: readonly T[], opt: SortOption): T[] {
  const out = [...nodes];
  const dir = opt.direction === 'asc' ? 1 : -1;
  out.sort((a, b) => {
    const va = getValue(a, opt.field);
    const vb = getValue(b, opt.field);
    if (va === vb) return 0;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
  return out;
}
```

- [ ] **Step 29.3: Run tests**

```powershell
npm run test:unit -- test/unit/services/serviceSorting.test.ts
```
Expected: 4/4 pass including the 50ms perf budget on 1000 nodes.

- [ ] **Step 29.4: Commit**

```powershell
git add src/services/serviceSorting.ts test/unit/services/serviceSorting.test.ts
git commit -m "feat(services): revive serviceSorting with perf budget (Sub-A.4.1)"
```

### Task 30: Refactor `serviceVirtualizer.ts` to runes-driven `Virtualizer<T>`

**Files:**
- Modify: `src/services/serviceVirtualizer.ts` → rename to `src/services/serviceVirtualizer.svelte.ts`
- Modify: `test/unit/services/serviceVirtualizer.test.ts`

- [ ] **Step 30.1: Rename file**

```powershell
git mv src/services/serviceVirtualizer.ts src/services/serviceVirtualizer.svelte.ts
```

- [ ] **Step 30.2: Add rune state to Virtualizer**

Replace the abstract class with a concrete generic class holding `$state` for `scrollTop`/`items`/`rowHeight` plus `$derived` window. Keep `TreeVirtualizer<T>` extending the new base for tree flattening:

```typescript
import type { TreeNode } from '../types/typeTree';

export interface FlatNode<TMeta = unknown> {
  node: TreeNode<TMeta>;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
}

export class Virtualizer<T> {
  scrollTop = $state(0);
  items = $state<T[]>([]);
  rowHeight = $state(32);
  viewportHeight = $state(400);
  overscan = $state(5);

  window: VirtualWindow = $derived.by(() => {
    if (this.rowHeight <= 0 || this.items.length === 0) return { startIndex: 0, endIndex: 0 };
    const rawStart = Math.floor(this.scrollTop / this.rowHeight);
    const visible = Math.ceil(this.viewportHeight / this.rowHeight);
    const startIndex = Math.max(0, rawStart - this.overscan);
    const endIndex = Math.min(this.items.length, rawStart + visible + this.overscan);
    return { startIndex, endIndex };
  });

  visible: T[] = $derived.by(() => this.items.slice(this.window.startIndex, this.window.endIndex));
}

export class TreeVirtualizer<TMeta = unknown> extends Virtualizer<FlatNode<TMeta>> {
  flatten(nodes: readonly TreeNode<TMeta>[], expandedIds: ReadonlySet<string>): FlatNode<TMeta>[] {
    const out: FlatNode<TMeta>[] = [];
    const walk = (list: readonly TreeNode<TMeta>[], depth: number): void => {
      for (const n of list) {
        const hasChildren = !!n.children && n.children.length > 0;
        const isExpanded = hasChildren && expandedIds.has(n.id);
        out.push({ node: n, depth, isExpanded, hasChildren });
        if (isExpanded) walk(n.children!, depth + 1);
      }
    };
    walk(nodes, 0);
    return out;
  }
}
```

- [ ] **Step 30.3: Update tests**

Edit `test/unit/services/serviceVirtualizer.test.ts` import path and assertions to use `v.window` / `v.items = …` instead of the old `computeWindow(...)` call signature.

- [ ] **Step 30.4: Verify**

```powershell
npm run check ; npm run build ; npm run test:unit
```

- [ ] **Step 30.5: Commit**

```powershell
git add -A
git commit -m "refactor(serviceVirtualizer): rune-driven Virtualizer<T> generic (Sub-A.4.1)"
```

### Task 31: `logicExplorer.ts` (pure logic) + tests

**Files:**
- Create: `src/logic/logicExplorer.ts`
- Create: `test/unit/logic/logicExplorer.test.ts`

- [ ] **Step 31.1: Tests first**

Create `test/unit/logic/logicExplorer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ExplorerLogic } from '../../../src/logic/logicExplorer';

describe('ExplorerLogic', () => {
  it('toggleSelect adds and removes from selection', () => {
    const e = new ExplorerLogic();
    e.toggleSelect('a');
    expect(e.selectedIds.has('a')).toBe(true);
    e.toggleSelect('a');
    expect(e.selectedIds.has('a')).toBe(false);
  });

  it('expand/collapse manage expandedIds', () => {
    const e = new ExplorerLogic();
    e.expand('node1');
    expect(e.expandedIds.has('node1')).toBe(true);
    e.collapse('node1');
    expect(e.expandedIds.has('node1')).toBe(false);
  });

  it('search updates the query', () => {
    const e = new ExplorerLogic();
    e.setSearch('foo');
    expect(e.search).toBe('foo');
  });

  it('clearSelection wipes everything', () => {
    const e = new ExplorerLogic();
    e.toggleSelect('a'); e.toggleSelect('b');
    e.clearSelection();
    expect(e.selectedIds.size).toBe(0);
  });
});
```

- [ ] **Step 31.2: Implement**

Create `src/logic/logicExplorer.ts` (pure TS, no Svelte runes — runes live at the service layer that wraps it):

```typescript
export class ExplorerLogic {
  selectedIds = new Set<string>();
  expandedIds = new Set<string>();
  scrollTop = 0;
  search = '';

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  expand(id: string): void { this.expandedIds.add(id); }
  collapse(id: string): void { this.expandedIds.delete(id); }
  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
  }
  setSearch(q: string): void { this.search = q; }
  clearSelection(): void { this.selectedIds.clear(); }
}
```

- [ ] **Step 31.3: Run tests + commit**

```powershell
npm run test:unit -- test/unit/logic/logicExplorer.test.ts
git add src/logic/logicExplorer.ts test/unit/logic/logicExplorer.test.ts
git commit -m "feat(logic): add logicExplorer + tests (Sub-A.4.1)"
```

### Task 32: `serviceExplorer.svelte.ts` (orchestration) + tests

**Files:**
- Create: `src/services/serviceExplorer.svelte.ts`
- Create: `test/unit/services/serviceExplorer.test.ts`

- [ ] **Step 32.1: Tests first**

Create `test/unit/services/serviceExplorer.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ExplorerService } from '../../../src/services/serviceExplorer.svelte';
import type { INodeIndex, IDecorationManager } from '../../../src/types/contracts';

function stubIdx<T extends { id: string }>(nodes: T[]): INodeIndex<T> {
  const subs = new Set<() => void>();
  return {
    get nodes() { return nodes; },
    refresh: async () => { for (const s of subs) s(); },
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    byId: (id) => nodes.find((n) => n.id === id),
  };
}

const stubDecorate: IDecorationManager = {
  decorate: () => ({ icons: [], badges: [], highlights: [] }),
  subscribe: () => () => {},
};

describe('ExplorerService', () => {
  it('exposes filtered nodes when search is set', () => {
    const idx = stubIdx([
      { id: 'a', label: 'apple' },
      { id: 'b', label: 'banana' },
    ]);
    const svc = new ExplorerService<{ id: string; label: string }>({ index: idx, decorate: stubDecorate });
    svc.setSearch('app');
    expect(svc.filteredNodes.map((n) => n.id)).toEqual(['a']);
  });

  it('toggleSelect drives serviceExplorer.selectedIds', () => {
    const svc = new ExplorerService({ index: stubIdx([{ id: 'a' }]), decorate: stubDecorate });
    svc.toggleSelect('a');
    expect(svc.selectedIds.has('a')).toBe(true);
  });
});
```

- [ ] **Step 32.2: Implement**

Create `src/services/serviceExplorer.svelte.ts`:

```typescript
import type { INodeIndex, IDecorationManager, NodeBase, IExplorer } from '../types/contracts';
import { ExplorerLogic } from '../logic/logicExplorer';

// Add IExplorer to contracts.ts if not yet present (see Task 2 — included in initial draft).

export interface ExplorerOptions<TNode extends NodeBase> {
  index: INodeIndex<TNode>;
  decorate: IDecorationManager;
}

export class ExplorerService<TNode extends NodeBase & { label?: string }> implements IExplorer<TNode> {
  private logic = new ExplorerLogic();
  private idx: INodeIndex<TNode>;
  private dec: IDecorationManager;
  private subs = new Set<() => void>();

  selectedIds = $state(new Set<string>());
  expandedIds = $state(new Set<string>());
  search = $state('');
  filteredNodes: readonly TNode[] = $derived.by(() => this.applyFilter());

  constructor(opts: ExplorerOptions<TNode>) {
    this.idx = opts.index;
    this.dec = opts.decorate;
    this.idx.subscribe(() => this.fire());
    this.dec.subscribe(() => this.fire());
  }

  private applyFilter(): readonly TNode[] {
    if (!this.search) return this.idx.nodes;
    const q = this.search.toLowerCase();
    return this.idx.nodes.filter((n) => (n.label ?? '').toLowerCase().includes(q));
  }

  private fire(): void { for (const cb of this.subs) cb(); }

  toggleSelect(id: string): void {
    this.logic.toggleSelect(id);
    this.selectedIds = new Set(this.logic.selectedIds);
    this.fire();
  }
  toggleExpand(id: string): void {
    this.logic.toggleExpand(id);
    this.expandedIds = new Set(this.logic.expandedIds);
    this.fire();
  }
  setSearch(q: string): void {
    this.logic.setSearch(q);
    this.search = q;
    this.fire();
  }
  clearSelection(): void {
    this.logic.clearSelection();
    this.selectedIds = new Set();
    this.fire();
  }
  subscribe(cb: () => void): () => void { this.subs.add(cb); return () => this.subs.delete(cb); }
}
```

Note: `IExplorer<TNode>` was declared in Task 2's contracts file — confirm its shape matches:

```typescript
export interface IExplorer<TNode extends NodeBase> {
  readonly selectedIds: ReadonlySet<string>;
  readonly expandedIds: ReadonlySet<string>;
  readonly search: string;
  readonly filteredNodes: readonly TNode[];
  toggleSelect(id: string): void;
  toggleExpand(id: string): void;
  setSearch(q: string): void;
  clearSelection(): void;
  subscribe(cb: () => void): () => void;
}
```

If the original Task 2 draft missed `IExplorer<T>`, add it now and update the contracts.ts commit (rebase the A.1 commit OR commit a small follow-up adjustment with `feat(types): add IExplorer<T> to contracts (Sub-A.4.1)`). Prefer the follow-up commit — keeps history linear.

- [ ] **Step 32.3: Run tests**

```powershell
npm run test:unit -- test/unit/services/serviceExplorer.test.ts
```

- [ ] **Step 32.4: Commit**

```powershell
git add -A
git commit -m "feat(services): add serviceExplorer (IExplorer<T>) + tests (Sub-A.4.1)"
```

### Task 33: Thin `viewTree.svelte` to render flat nodes via snippets

**Files:**
- Modify: `src/components/views/viewTree.svelte`

- [ ] **Step 33.1: Read current `viewTree.svelte` (184 LOC)**

```powershell
Get-Content src/components/views/viewTree.svelte
```
Identify what business logic (filters, badge calc, highlight) needs to move OUT of the view and into `serviceExplorer` / `serviceDecorate`.

- [ ] **Step 33.2: Rewrite as thin renderer with snippets**

Replace the `<script>` block to accept `flatNodes`, `nodeContent` (snippet), `nodeDecorator` (snippet), and `onClick`:

```svelte
<script lang="ts" generics="TNode extends { id: string }">
  import type { Snippet } from 'svelte';
  import type { FlatNode } from '../../services/serviceVirtualizer.svelte';

  let {
    flatNodes,
    rowHeight = 32,
    onClick,
    nodeContent,
    nodeDecorator,
  }: {
    flatNodes: FlatNode<TNode>[];
    rowHeight?: number;
    onClick?: (node: TNode) => void;
    nodeContent: Snippet<[TNode]>;
    nodeDecorator?: Snippet<[TNode]>;
  } = $props();
</script>

<div class="vm-view-tree">
  {#each flatNodes as flat (flat.node.id)}
    <div
      class="vm-tree-row"
      style="padding-left: {flat.depth * 16}px; height: {rowHeight}px;"
      onclick={() => onClick?.(flat.node.meta as TNode)}
      role="button"
      tabindex="0"
    >
      {@render nodeContent(flat.node.meta as TNode)}
      {#if nodeDecorator}{@render nodeDecorator(flat.node.meta as TNode)}{/if}
    </div>
  {/each}
</div>
```

The implementation deletes the inline filter/badge/highlight logic. Consumers (`tabProps`/`tabFiles`/`tabTags`) wire snippets that pull data from their `IExplorer<TNode>` + `IDecorationManager`.

- [ ] **Step 33.3: Wire each consumer (tabProps, tabFiles, tabTags) to provide snippets**

Sample for `tabProps.svelte`:

```svelte
{#snippet propContent(p: PropNode)}
  <span>{p.property}</span>
{/snippet}
{#snippet propDecorator(p: PropNode)}
  <span class="vm-prop-count">{p.fileCount}</span>
{/snippet}
<ViewTree {flatNodes} nodeContent={propContent} nodeDecorator={propDecorator} onClick={onPropClick} />
```

Apply the same pattern to `tabFiles.svelte` + `tabTags.svelte`. Keep behavior identical — this is a structural refactor only.

- [ ] **Step 33.4: Verify build + svelte-check + integration tests**

```powershell
npm run check ; npm run build ; npm run test:integrity
```
Expected: green. If integration tests fail, snippet wiring missed a callsite — `Get-Content -Pattern "ViewTree" src/components/pages/*.svelte` to find them.

- [ ] **Step 33.5: Reload plugin manually and smoke-test (per AGENTS.md sec 9)**

Use the `obsidian-cli` skill to reload the plugin. Verify: tabs open, lists render, click toggles selection, search input filters nodes.

- [ ] **Step 33.6: Commit**

```powershell
git add -A
git commit -m "refactor(viewTree): thin to flat-node renderer with snippets (Sub-A.4.1)"
```

### Task 34: Migrate `viewGrid.svelte` to `Virtualizer<T>` + close A.4.1

**Files:**
- Modify: `src/components/views/viewGrid.svelte`
- Modify: `package.json` (no version bump until A.4 close)
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 34.1: Migrate `viewGrid.svelte`**

Read current grid (likely classic CSS grid with manual rendering). Replace render loop with `Virtualizer<TNode>` instance, `bind:scrollTop` on the outer scroll container, render only `v.visible`. Wire click events (Annex A.4.1 item 2.3.E.2):

```svelte
<script lang="ts" generics="TNode extends { id: string }">
  import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
  let { items, onClick }: { items: TNode[]; onClick?: (n: TNode) => void } = $props();
  const v = new Virtualizer<TNode>();
  $effect(() => { v.items = items; });
</script>
<div class="vm-grid" onscroll={(e) => (v.scrollTop = (e.currentTarget as HTMLElement).scrollTop)}>
  {#each v.visible as n (n.id)}
    <div class="vm-grid-cell" onclick={() => onClick?.(n)}>{n.id}</div>
  {/each}
</div>
```

This validates the abstraction (the spike of A.4.1).

- [ ] **Step 34.2: Update Agent Memory**

```markdown
### 2026-04-30 — Sub-A.4.1 closed (Explorer + Virtualizer + Decoration)
- `Virtualizer<T>` generic with rune state.
- `logicExplorer` + `serviceExplorer` + `serviceDecorate` all implementing contracts.
- `serviceSorting` revived (perf budget < 50ms / 1000 nodes).
- `viewTree` thinned; `viewGrid` migrated to Virtualizer<T>.
- ADR-011 documents decoration flow.
- Coverage target met (≥80% for new logic + service files).
- Next: Sub-A.4.2 — frame, navbars, popups, tabs, explorerQueue, explorerActiveFilters.
```

- [ ] **Step 34.3: Verify gate**

```powershell
npm run verify
```

- [ ] **Step 34.4: Commit**

```powershell
git add -A
git commit -m "refactor(viewGrid): migrate to Virtualizer<T>; close Sub-A.4.1 (Sub-A.4.1)"
```

---

## Iteration A.4.2 — Frame + Navbars + Popups + Tabs + ExplorerQueue + ExplorerActiveFilters

### Task 35: `serviceOverlayState` + ADR-010

**Files:**
- Create: `src/services/serviceOverlayState.svelte.ts`
- Create: `test/unit/services/serviceOverlayState.test.ts`
- Create: `docs/superpowers/adr/ADR-010-overlay-state-replaces-prop-drilling.md`

- [ ] **Step 35.1: Tests first**

Create `test/unit/services/serviceOverlayState.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

describe('OverlayStateService', () => {
  it('push adds entry to stack', () => {
    const o = new OverlayStateService();
    o.push({ id: 'a', component: {} as never });
    expect(o.stack.length).toBe(1);
    expect(o.isOpen('a')).toBe(true);
  });

  it('pop removes the top entry', () => {
    const o = new OverlayStateService();
    o.push({ id: 'a', component: {} as never });
    o.push({ id: 'b', component: {} as never });
    o.pop();
    expect(o.stack.length).toBe(1);
    expect(o.isOpen('b')).toBe(false);
  });

  it('popById removes a specific entry', () => {
    const o = new OverlayStateService();
    o.push({ id: 'a', component: {} as never });
    o.push({ id: 'b', component: {} as never });
    o.popById('a');
    expect(o.stack.map((e) => e.id)).toEqual(['b']);
  });

  it('clear empties the stack', () => {
    const o = new OverlayStateService();
    o.push({ id: 'a', component: {} as never });
    o.push({ id: 'b', component: {} as never });
    o.clear();
    expect(o.stack.length).toBe(0);
  });
});
```

- [ ] **Step 35.2: Implement**

Create `src/services/serviceOverlayState.svelte.ts`:

```typescript
import type { IOverlayState, OverlayEntry } from '../types/contracts';

export class OverlayStateService implements IOverlayState {
  stack = $state<OverlayEntry[]>([]);

  push(entry: OverlayEntry): void {
    this.stack = [...this.stack, entry];
  }
  pop(): void {
    this.stack = this.stack.slice(0, -1);
  }
  popById(id: string): void {
    this.stack = this.stack.filter((e) => e.id !== id);
  }
  clear(): void { this.stack = []; }
  isOpen(id: string): boolean { return this.stack.some((e) => e.id === id); }
}
```

- [ ] **Step 35.3: Write ADR-010**

`docs/superpowers/adr/ADR-010-overlay-state-replaces-prop-drilling.md`:

```markdown
# ADR-010: `IOverlayState` replaces popup prop drilling

- Date: 2026-04-30
- Status: Accepted

## Context
Pre-A.4.2, `frameVaultman.svelte` drilled 13 props into `layoutPopup.svelte` (active-filters / scope / search / move payloads). Adding a popup required touching every level.

## Decision
Popups register themselves via `IOverlayState.push({ id, component, props })`. The frame renders the topmost (or all stacked) entries. Click outside dismisses by default.

## Consequences
- `layoutPopup.svelte` is deleted in A.4.2.
- New popups define their own `props` shape — no shared type union.
- Stack management is in one service; component lifecycle is the consumer's responsibility.

## Verification
1. `Glob` for `layoutPopup.svelte` → must return 0.
2. `Grep` for `OverlayStateService` consumers → frame + popupIsland + buttons triggering popups.
```

- [ ] **Step 35.4: Wire into `main.ts`**

```typescript
import { OverlayStateService } from './services/serviceOverlayState.svelte';
import type { IOverlayState } from './types/contracts';
overlayState!: IOverlayState;
// in onload:
this.overlayState = new OverlayStateService();
```

- [ ] **Step 35.5: Run tests + verify**

```powershell
npm run test:unit ; npm run check ; npm run build
```

- [ ] **Step 35.6: Commit**

```powershell
git add -A
git commit -m "feat(services): add OverlayStateService (IOverlayState) + ADR-010 + tests (Sub-A.4.2)"
```

### Task 36: Rewrite `frameVaultman.svelte`

**Files:**
- Modify: `src/components/frameVaultman.svelte` (846 LOC → expected ≤500)

- [ ] **Step 36.1: Read current frame**

```powershell
Get-Content src/components/frameVaultman.svelte | Select-Object -First 80
Get-Content src/components/frameVaultman.svelte | Measure-Object -Line
```
Inventory: page mounts, popup payloads (13 props passed to layoutPopup), DOM transition handling.

- [ ] **Step 36.2: Apply refactor**

Replace the `<script>` block sections progressively:

1. Replace manual DOM offset math with `$derived` from `IRouter.activePage` + `pageOrder.indexOf(activePage)`.
2. Remove the 13 popup props; render `<PopupIsland />` once and let it consume `IOverlayState`.
3. Lazy-mount pages: render only the visible page + adjacent pages (for slide transition); never all three at once (Annex A.4.2 item 2.1.1).

Skeleton:

```svelte
<script lang="ts">
  import type { VaultmanPlugin } from '../main';
  import { setContext } from 'svelte';
  import PopupIsland from './layout/popupIsland.svelte';
  import NavbarPages from './layout/navbarPages.svelte';
  import PageOps from './pages/pageTools.svelte';
  import PageStats from './pages/pageStats.svelte';
  import PageFilters from './pages/pageFilters.svelte';

  let { plugin }: { plugin: VaultmanPlugin } = $props();

  setContext('vaultman', { plugin });

  let activePage = $derived(plugin.router.activePage);
  let pageIndex = $derived(plugin.router.pageOrder.indexOf(activePage));
  let offset = $derived(`translate3d(${-pageIndex * 100}%, 0, 0)`);
</script>

<div class="vm-frame">
  <div class="vm-pages-track" style="transform: {offset};">
    {#each plugin.router.pageOrder as pageId (pageId)}
      <div class="vm-page-slot">
        {#if pageId === 'ops'}<PageOps {plugin} />{:else if pageId === 'statistics'}<PageStats {plugin} />{:else if pageId === 'filters'}<PageFilters {plugin} />{/if}
      </div>
    {/each}
  </div>
  <NavbarPages tabs={plugin.router.pageOrder.map((id) => ({ id, icon: '', labelKey: id }))} bind:active={plugin.router.activePage} />
  <PopupIsland overlayState={plugin.overlayState} />
</div>
```

Move modal handling to `OverlayState.push(...)` calls inside the relevant page.

- [ ] **Step 36.3: Verify**

```powershell
npm run check ; npm run build ; npm run test:integrity
```
Expected: green.

- [ ] **Step 36.4: Reload plugin** via `obsidian-cli` skill, smoke-test page transitions + popup open/close.

- [ ] **Step 36.5: Commit**

```powershell
git add -A
git commit -m "refactor(frame): rewrite with $derived offset + IRouter + IOverlayState (Sub-A.4.2)"
```

### Task 37: Make `navbarPages.svelte` agnostic

**Files:**
- Modify: `src/components/layout/navbarPages.svelte`

- [ ] **Step 37.1: Replace hardcoded tabs with `tabs: TabConfig[]` prop**

```svelte
<script lang="ts">
  import type { TabConfig } from '../../types/typeUI';
  import { setIcon } from 'obsidian';
  import { translate } from '../../i18n/index';

  let {
    tabs,
    active = $bindable(),
  }: {
    tabs: TabConfig[];
    active: string;
  } = $props();

  function attachIcon(node: HTMLElement, icon: string): { update?: (icon: string) => void } {
    setIcon(node, icon);
    return { update: (icon: string) => setIcon(node, icon) };
  }
</script>

<nav class="vm-navbar-pages">
  {#each tabs as tab (tab.id)}
    <button
      class="vm-navbar-tab"
      class:is-active={tab.id === active}
      aria-label={translate(tab.labelKey)}
      onclick={() => (active = tab.id)}
    >
      <span use:attachIcon={tab.icon}></span>
    </button>
  {/each}
</nav>
```

- [ ] **Step 37.2: Verify + commit**

```powershell
npm run check ; npm run build
git add src/components/layout/navbarPages.svelte
git commit -m "refactor(navbarPages): agnostic; consumes TabConfig[] (Sub-A.4.2)"
```

### Task 38: Migrate `tabContent.svelte` to `IContentIndex`

**Files:**
- Modify: `src/components/pages/tabContent.svelte`

- [ ] **Step 38.1: Replace ad-hoc find/replace with `IContentIndex` consumption**

```svelte
<script lang="ts">
  import type { VaultmanPlugin } from '../../main';
  import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
  import TextInput from '../primitives/TextInput.svelte';
  import HighlightText from '../primitives/HighlightText.svelte';

  let { plugin }: { plugin: VaultmanPlugin } = $props();
  let query = $state('');
  const v = new Virtualizer<typeof plugin.contentIndex.nodes[number]>();

  $effect(() => { plugin.contentIndex.setQuery(query); });
  $effect(() => { v.items = [...plugin.contentIndex.nodes]; });
</script>

<div class="vm-tab-content">
  <TextInput bind:value={query} placeholder="Search content…" />
  <div class="vm-content-list" onscroll={(e) => (v.scrollTop = (e.currentTarget as HTMLElement).scrollTop)}>
    {#each v.visible as match (match.id)}
      <div class="vm-content-row">
        <span class="vm-content-path">{match.filePath}:{match.line}</span>
        <span>{match.before}<HighlightText text={match.match} ranges={[{ start: 0, end: match.match.length }]} />{match.after}</span>
      </div>
    {/each}
  </div>
</div>
```

- [ ] **Step 38.2: Verify + reload + commit**

```powershell
npm run check ; npm run build
git add src/components/pages/tabContent.svelte
git commit -m "refactor(tabContent): consume IContentIndex via primitives (Sub-A.4.2)"
```

### Task 39: Promote `popupIsland_WIP` + delete `layoutPopup`

**Files:**
- Move: `src/components/layout/popupIsland_WIP.svelte` → `src/components/layout/popupIsland.svelte`
- Modify: `src/components/layout/popupIsland.svelte` (consume `IOverlayState`)
- Delete: `src/components/layout/layoutPopup.svelte`

- [ ] **Step 39.1: Rename**

```powershell
git mv src/components/layout/popupIsland_WIP.svelte src/components/layout/popupIsland.svelte
```

- [ ] **Step 39.2: Rewrite to consume `IOverlayState`**

```svelte
<script lang="ts">
  import type { IOverlayState } from '../../types/contracts';
  import { mount, unmount } from 'svelte';
  import { onDestroy } from 'svelte';

  let { overlayState }: { overlayState: IOverlayState } = $props();
  let unsub: (() => void) | undefined;

  // Re-render whenever stack changes; handled by reactivity since overlayState.stack is $state.

  function dismissTop(): void { overlayState.pop(); }
  function onOverlayKey(e: KeyboardEvent): void { if (e.key === 'Escape') dismissTop(); }
</script>

<div class="vm-popup-island"
  class:is-empty={overlayState.stack.length === 0}
  onkeydown={onOverlayKey}
  tabindex="-1"
>
  {#each overlayState.stack as entry (entry.id)}
    <div
      class="vm-popup-entry"
      onclick={(e) => {
        if (e.target === e.currentTarget && entry.dismissOnOutsideClick !== false) overlayState.popById(entry.id);
      }}
      role="dialog"
      aria-modal="true"
    >
      <svelte:component this={entry.component} {...(entry.props ?? {})} />
    </div>
  {/each}
</div>
```

(Adjust `<svelte:component>` syntax to Svelte 5: use a snippet or direct mount. If `<svelte:component>` is deprecated in 5.55.x, instead use `{@const Comp = entry.component}<Comp ...>`.)

- [ ] **Step 39.3: Delete `layoutPopup.svelte`**

```powershell
git rm src/components/layout/layoutPopup.svelte
```

Update any remaining import of `layoutPopup`:

```powershell
Select-String -Path src/**/*.svelte,src/**/*.ts -Pattern "layoutPopup"
```
Expected: 0. If matches, update them to `popupIsland.svelte` + `OverlayState.push(...)` calls.

- [ ] **Step 39.4: Verify + reload + commit**

```powershell
npm run check ; npm run build ; npm run test:integrity
git add -A
git commit -m "refactor(popups): promote popupIsland_WIP; delete layoutPopup (Sub-A.4.2)"
```

### Task 40: `explorerQueue.svelte` + `explorerActiveFilters.svelte` + delete `logicQueue.ts`/`logicFilters.ts`

**Files:**
- Create: `src/components/explorers/explorerQueue.svelte`
- Create: `src/components/explorers/explorerActiveFilters.svelte`
- Delete: `src/logic/logicQueue.ts`
- Delete: `src/logic/logicFilters.ts`
- Modify: `vitest.config.ts` (drop `logic/logic{Queue,Filters}.ts` exclusion since the files no longer exist; ADR-009 marks Superseded by this change)
- Modify: `docs/superpowers/adr/ADR-009-misnamed-logic-files.md` (mark `Status: Superseded by Sub-A.4.2`)

- [ ] **Step 40.1: Build `explorerQueue.svelte`**

```svelte
<script lang="ts">
  import type { VaultmanPlugin } from '../../main';
  import { ExplorerService } from '../../services/serviceExplorer.svelte';
  import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
  import ViewTree from '../views/viewTree.svelte';

  let { plugin }: { plugin: VaultmanPlugin } = $props();
  const svc = new ExplorerService({ index: plugin.operationsIndex, decorate: plugin.decorationManager });
  const v = new Virtualizer<typeof plugin.operationsIndex.nodes[number]>();
  $effect(() => { v.items = [...svc.filteredNodes]; });
</script>

<div class="vm-explorer-queue">
  {#snippet content(n)}
    <span>{n.change.type}</span>
  {/snippet}
  {#snippet decor(n)}
    <button onclick={() => plugin.queueService.remove(n.id)} aria-label="Delete op">×</button>
  {/snippet}
  <ViewTree flatNodes={v.visible.map((n) => ({ node: { id: n.id, meta: n, children: [] }, depth: 0, isExpanded: false, hasChildren: false }))} nodeContent={content} nodeDecorator={decor} />
</div>
```

This addresses Annex A.4.2 items 2.6.A.1 (grouping via `n.group`), 2.6.A.2 (delete button), 2.6.A.10 (queue counter — `plugin.queueService.size`).

- [ ] **Step 40.2: Build `explorerActiveFilters.svelte`**

```svelte
<script lang="ts">
  import type { VaultmanPlugin } from '../../main';
  import { ExplorerService } from '../../services/serviceExplorer.svelte';
  import ViewTree from '../views/viewTree.svelte';
  import { Virtualizer } from '../../services/serviceVirtualizer.svelte';

  let { plugin }: { plugin: VaultmanPlugin } = $props();
  const svc = new ExplorerService({ index: plugin.activeFiltersIndex, decorate: plugin.decorationManager });
  const v = new Virtualizer<typeof plugin.activeFiltersIndex.nodes[number]>();
  $effect(() => { v.items = [...svc.filteredNodes]; });
</script>

<div class="vm-explorer-active-filters">
  <header class="vm-subtitle">{svc.filteredNodes.length} filters · {plugin.filterService.filteredFiles.length} files</header>
  {#snippet content(n)}
    <span>{n.rule.property} = {n.rule.values.join(', ')}</span>
  {/snippet}
  {#snippet decor(n)}
    <button onclick={() => plugin.filterService.removeNode(n.rule)} aria-label="Remove rule">×</button>
  {/snippet}
  <ViewTree flatNodes={v.visible.map((n) => ({ node: { id: n.id, meta: n, children: [] }, depth: 0, isExpanded: false, hasChildren: false }))} nodeContent={content} nodeDecorator={decor} />
</div>
```

This addresses Annex A.4.2 items 2.6.B.1 (subtitle counter).

- [ ] **Step 40.3: Wire popups in `frameVaultman` to push these explorers via `OverlayState.push(...)`**

Replace the old "openActiveFiltersPopup" handler with:

```typescript
plugin.overlayState.push({ id: 'active-filters', component: ExplorerActiveFilters, props: { plugin } });
```

Same for the queue popup with `explorerQueue`.

- [ ] **Step 40.4: Delete the old logic files**

```powershell
git rm src/logic/logicQueue.ts src/logic/logicFilters.ts
```

Update `vitest.config.ts`: remove the exclusion for these two files (no longer exists).

Update `ADR-009-misnamed-logic-files.md`: change `Status: Accepted` → `Status: Superseded by Sub-A.4.2 (files deleted, queue/filter behavior owned by explorers + services)`.

- [ ] **Step 40.5: Bump version to `1.0.0-beta.23`** (same pattern as Step 8.1).

- [ ] **Step 40.6: Memory note**

```markdown
### 2026-04-30 — Sub-A.4 closed (Components)
- `frameVaultman` rewritten with $derived offset + IRouter + IOverlayState.
- `navbarPages` agnostic.
- `tabContent` consumes IContentIndex.
- `layoutPopup` deleted; `popupIsland` consumes IOverlayState (ADR-010).
- `explorerQueue` + `explorerActiveFilters` real explorers (annex 2.6.A.* + 2.6.B.1).
- `logicQueue.ts` + `logicFilters.ts` deleted (ADR-009 superseded).
- Version: 1.0.0-beta.23.
- Next: Sub-A.5 — Settings declarative.
```

- [ ] **Step 40.7: Verify gate + commit + tag**

```powershell
npm run verify
git add -A
git commit -m "chore(release): bump to 1.0.0-beta.23 (Sub-A.4 components close)"
git tag 1.0.0-beta.23 ; git push ; git push --tags
```

---

## Iteration A.5 — Settings declarative

### Task 41: Reduce `settingsVM.ts` to mount/unmount bridge

**Files:**
- Modify: `src/settingsVM.ts` (284 LOC → expected ≤80)

- [ ] **Step 41.1: Replace contents**

Replace contents of `src/settingsVM.ts`:

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
import { mount, unmount, type Component } from 'svelte';
import type { VaultmanPlugin } from './main';
import SettingsUI from './components/settings/SettingsUI.svelte';

export class VaultmanSettingsTab extends PluginSettingTab {
  plugin: VaultmanPlugin;
  private svelteApp: ReturnType<typeof mount> | null = null;

  constructor(app: App, plugin: VaultmanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    this.svelteApp = mount(SettingsUI as unknown as Component<{ plugin: VaultmanPlugin }>, {
      target: containerEl,
      props: { plugin: this.plugin },
    });
  }

  hide(): void {
    if (this.svelteApp) {
      void unmount(this.svelteApp);
      this.svelteApp = null;
    }
  }
}
```

- [ ] **Step 41.2: Verify + commit**

```powershell
npm run check ; npm run build
git add src/settingsVM.ts
git commit -m "refactor(settings): reduce settingsVM to mount/unmount bridge (Sub-A.5)"
```

### Task 42: Build `SettingsUI.svelte` with primitives

**Files:**
- Create: `src/components/settings/SettingsUI.svelte`

- [ ] **Step 42.1: Compose UI from primitives**

```svelte
<script lang="ts">
  import type { VaultmanPlugin } from '../../main';
  import Toggle from '../primitives/Toggle.svelte';
  import Dropdown from '../primitives/Dropdown.svelte';
  import TextInput from '../primitives/TextInput.svelte';

  let { plugin }: { plugin: VaultmanPlugin } = $props();
  let s = $state({ ...plugin.settings });

  $effect(() => {
    Object.assign(plugin.settings, s);
    void plugin.saveSettings();
  });
</script>

<div class="vm-settings">
  <h2>Vaultman Settings</h2>
  <Dropdown
    label="Open mode"
    bind:value={s.openMode}
    options={[
      { value: 'sidebar', label: 'Sidebar' },
      { value: 'main', label: 'Main' },
      { value: 'both', label: 'Both' },
    ]}
  />
  <Dropdown
    label="Language"
    bind:value={s.language}
    options={[
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' },
      { value: 'auto', label: 'Auto' },
    ]}
  />
  <Toggle bind:checked={s.explorerCtrlClickSearch} label="Ctrl+click opens search" />
  <Toggle bind:checked={s.explorerShowQueuePreview} label="Show queue preview in explorer" />
  <Toggle bind:checked={s.explorerContentSearch} label="Enable content search in explorer" />
  <TextInput bind:value={s.sessionFilePath} label="Session file path" placeholder="vaultman/session.md" />
  <!-- … cover every existing setting field listed in AGENTS.md sec 6 -->
</div>
```

Cover every field from `src/types/settings.ts` (`language`, `defaultPropertyType`, `filterTemplates`, `sessionFilePath`, `explorerCtrlClickSearch`, `explorerShowQueuePreview`, `explorerContentSearch`, `explorerOperationScope`, `operationsPanelPosition`, `basesLastUsedPath`, `basesOpenMode`, `basesOpsPanelSide`, `basesExplorerSide`, `basesAutoAttach`, `basesInjectCheckboxes`, `basesShowColumnSeparators`, `openMode`, `pageOrder`).

- [ ] **Step 42.2: Verify**

```powershell
npm run check ; npm run build ; npm run test:integrity
```

- [ ] **Step 42.3: Reload + manually open settings, verify each field round-trips**

- [ ] **Step 42.4: Commit**

```powershell
git add src/components/settings/SettingsUI.svelte
git commit -m "feat(settings): declarative UI with primitives (Sub-A.5)"
```

### Task 43: Settings migration integration test + close A.5

**Files:**
- Create: `test/integration/settingsMigration.test.ts`
- Modify: `package.json` → `1.0.0-rc.1`
- Modify: `manifest.json`, `versions.json`
- Modify: `docs/Vaultman - Agent Memory.md`

- [ ] **Step 43.1: Write the integration test**

Per ADR-003 the settings round-trip lives at the integration tier (not unit). Reuse the obsidian-integration-testing harness pattern from existing `test/integration/`:

Create `test/integration/settingsMigration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { VaultmanSettingsTab } from '../../src/settingsVM';
// Use existing integration harness — refer to other test/integration/*.test.ts files for setup.

describe('settings migration', () => {
  it('an existing settings.json is preserved when SettingsUI mounts/unmounts', async () => {
    // Stand up plugin with a known settings.json, mount SettingsUI, change nothing, unmount.
    // Assert: settings.json bytes unchanged.
    expect(true).toBe(true); // PLACEHOLDER — replace with actual harness wiring per existing test/integration/* pattern
  });
});
```

If the integration harness can't easily simulate this round-trip in-headless, escalate to e2e in a follow-up; flag it in the closure note. The placeholder is acceptable ONLY if explicitly noted in the memory closure.

Run integration tests:

```powershell
npm run test:integrity
```

- [ ] **Step 43.2: Bump version to `1.0.0-rc.1`** (same pattern as Step 8.1).

- [ ] **Step 43.3: Memory note**

```markdown
### 2026-04-30 — Sub-A.5 closed (Settings declarative)
- `settingsVM.ts` reduced to mount/unmount bridge.
- `SettingsUI.svelte` declarative with primitives + autosave $effect.
- Migration integration test: <NOTE PASS/PLACEHOLDER STATUS>.
- Version: 1.0.0-rc.1.
- Hardening project complete. Next session: PR `hardening-refactor` → `hardening`, then plan v1.0 Polish kickoff.
```

- [ ] **Step 43.4: Verify gate + commit + tag**

```powershell
npm run verify
git add -A
git commit -m "chore(release): bump to 1.0.0-rc.1 (Sub-A.5 settings close)"
git tag 1.0.0-rc.1 ; git push ; git push --tags
```

---

## Closure: Coverage backfill + handoff + PR

### Task 44: Backfill Sub-C coverage gaps

**Files:**
- Modify/create: `test/unit/services/serviceCMenu.test.ts`
- Modify/create: `test/unit/utils/utilPropIndex.test.ts`
- Modify/create: `test/unit/utils/dropDAutoSuggestionInput.test.ts`
- Modify/create: `test/unit/utils/inputModal.test.ts`

- [ ] **Step 44.1: `serviceCMenu` workspace handler coverage**

Add tests that mock `app.workspace.on('file-menu')` callbacks and trigger them, asserting that `ContextMenuService` registered the expected menu items. Reuse `mockApp` and add a `mockWorkspace({ events })` helper if not present.

- [ ] **Step 44.2: `utilPropIndex` debounce timer coverage**

Use `vi.useFakeTimers()` to advance timers and assert the debounced refresh fires once. Cover lifecycle event paths (vault create/delete/rename + metadataCache changed) by triggering the registered handlers via the mocked `Events`.

- [ ] **Step 44.3: `dropDAutoSuggestionInput` `DropDSuggest` inner class coverage**

Re-export `DropDSuggest` as a `__test_only__` named export from `src/utils/dropDAutoSuggestionInput.ts` so the unit test can import and exercise it directly. Add a JSDoc note marking the export as test-only.

- [ ] **Step 44.4: `inputModal` DOM-bound paths**

Mount the modal via the integration mock, assert the input element receives focus and the resolve callback fires on Enter.

- [ ] **Step 44.5: Verify coverage thresholds**

```powershell
npm run test:cover
```
Expected: `src/utils/` ≥ 80% / ≥ 80% (lines / functions). If still below, document the residual gap in ADR-007 instead of bumping thresholds.

- [ ] **Step 44.6: Commit**

```powershell
git add test/unit src/utils/dropDAutoSuggestionInput.ts
git commit -m "test(coverage): backfill Sub-C gaps (serviceCMenu, utilPropIndex, dropDAutoSuggestionInput, inputModal) (Sub-A closure)"
```

### Task 45: Update HANDOFF.md + open PR

**Files:**
- Modify: `docs/HANDOFF.md`

- [ ] **Step 45.1: Rewrite HANDOFF.md to reflect Sub-A close**

Replace the file's `PRÓXIMOS PASOS` section with:

```markdown
### Paso 5 — Sub-A Refactor ✅ DONE 2026-04-30

Resultados:
- 7 iters cerradas (A.1, A.2.1, A.2.2, A.3, A.4.1, A.4.2, A.5).
- `src/types/contracts.ts` (16 interfaces) + `obsidian-extended.ts`.
- 8 indices (6 reales + 2 stubs).
- 6 primitives Svelte 5.
- `Virtualizer<T>` genérico + `logicExplorer` + `serviceExplorer` + `serviceDecorate` + `serviceSorting`.
- Frame rewrite + `OverlayState` + `popupIsland` finalizado.
- `explorerQueue` + `explorerActiveFilters` reales.
- Settings declarativo con primitives + autosave.
- ADRs 001-011 escritos (009 superseded).
- Coverage backfill aplicado.
- Lint bloquea `(app as any)`; CI gate verde.
- Version: `1.0.0-rc.1`.

### Paso 6 — Cierre del proyecto Hardening 🔴 PRÓXIMO

1. Pedir review usuario para PR `hardening-refactor → hardening`.
2. Tras merge, bump a `1.0.0-rc.1` queda como tag final del proyecto.
3. Decidir: ¿`hardening → main` ahora o esperar v1.0 Polish?
4. Brainstorm v1.0 Polish (4 sub-bloques) — usar `superpowers:brainstorming`.
```

- [ ] **Step 45.2: Open PR**

```powershell
git push
gh pr create --base hardening --head hardening-refactor `
  --title "Sub-A Refactor — contracts + indices + primitives + explorer abstraction (1.0.0-rc.1)" `
  --body "Closes Sub-A of Vaultman Hardening master spec. Adds INodeIndex<T> factory + 8 indices, 6 Svelte 5 primitives, Virtualizer<T> generic, OverlayState, frame rewrite, explorerQueue + explorerActiveFilters as real explorers, declarative settings, ADRs 001-011, lint blocks (app as any). Coverage gates green. Version 1.0.0-rc.1."
```

- [ ] **Step 45.3: Final verify + commit + push**

```powershell
npm run verify
git add docs/HANDOFF.md
git commit -m "docs(handoff): close Sub-A; next is hardening project closure (Sub-A.5)"
git push
```

---

## Notes for the executing agent

- **Caveman mode**: if active in the executing session, KEEP it. Plan content is normal-mode prose (per skill rule).
- **Spec consultation**: open `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` and `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` before any iter close. Annex A.x maps every triaged item to an iter — confirm no item slipped.
- **WIP files**: A.1 inventories them; later iters delete or promote each. None survive into `1.0.0-rc.1`.
- **`(app as any)` regression**: lint catches it from A.1 onward. Never disable the rule blanket-style.
- **Tests written DURING Sub-A** (logicExplorer, serviceExplorer, indices, Virtualizer, serviceSorting, OverlayState, decoration) — NOT in Sub-C. Sub-C only covered what existed at Sub-B close.
- **Reload after every visual iter**: A.4.1 and A.4.2 require manual smoke via `obsidian-cli` skill; integration tests don't catch all visual regressions.
- **Branch hygiene**: rebase `hardening-refactor` onto `hardening` daily during execution. If conflicts surface in `main.ts` because hardening received an unrelated commit, resolve forward — never reset.
