# Iter.8 — Bug Fixes beta.6 + Feature Completions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 12 confirmed beta.6 bugs and complete the PropertyExplorer view modes (grid, cards, tags), reaching a clean beta.7 release.

**Architecture:** Four groups of changes, committed atomically per group. Group 1: OperationQueueService scope fix + new QueueIslandComponent. Group 2: FilterService search integration + navbar badges + drag reorder fix. Group 3: PropertyExplorerComponent view modes + tags behavior + view option toggles. Group 4: CSS/micro-fixes.

**Tech Stack:** TypeScript · Svelte 5 (`$state`, `$derived`, `$effect`, keyed `{#each}`) · Obsidian Plugin API · esbuild

---

## File Map

| File | Action | Changes |
|------|--------|---------|
| `src/components/PropertyExplorerComponent.ts` | Modify | Rename scope fix, view modes, tags click, 0-count, toggles |
| `src/components/QueueIslandComponent.ts` | **Create** | New floating island component for queue |
| `src/services/FilterService.ts` | Modify | Add `setSearchFilter()`, `_searchName`, `_searchFolder` |
| `src/types/filter.ts` | Modify | Add `'file_folder'` to `FilterType` |
| `src/utils/filter-evaluator.ts` | Modify | Add `file_folder` case |
| `src/views/ObsiManView.svelte` | Modify | Wire search filter, badges, drag reorder, island, tab bar fix, search toggle fix, header removal |
| `src/i18n/en.ts` | Modify | Add new i18n keys |
| `src/i18n/es.ts` | Modify | Mirror new keys |
| `styles.css` | Modify | Tab bar unification, clear button position, island styles |
| `manifest.json` + `package.json` | Modify | Bump to 1.0.0-beta.7 |

---

## Task 1: Fix rename value scope in PropertyExplorerComponent

**Goal:** Rename/move/delete value operations should only target files that actually have that specific property+value — not all `getOperationFiles()`.

**Files:**
- Modify: `src/components/PropertyExplorerComponent.ts`

### Steps

- [ ] **1.1 — Add private helper `getFilesWithValue`**

In `PropertyExplorerComponent`, add this method after `getOperationFiles()` (line ~665):

```typescript
/** Intersect operation scope with files that have propName === value */
private getFilesWithValue(propName: string, value: string): TFile[] {
    return this.getOperationFiles().filter((file) => {
        const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
        const val: unknown = fm[propName];
        if (Array.isArray(val)) return (val as unknown[]).some((v) => String(v) === value);
        return String(val) === value;
    });
}
```

- [ ] **1.2 — Update `showValueContextMenu` to pass scoped files**

In `showValueContextMenu(e: MouseEvent, propName: string, value: string)`, replace the first line inside the menu constructor with:

```typescript
private showValueContextMenu(e: MouseEvent, propName: string, value: string): void {
    const scopedFiles = this.getFilesWithValue(propName, value);
    const menu = new Menu();

    // Rename Value
    menu.addItem((item) =>
        item.setTitle(t('explorer.ctx.rename_value')).setIcon('lucide-pencil').onClick(() => {
            new RenameValueModal(this.plugin.app, this.plugin, propName, value, scopedFiles).open();
        })
    );

    // Move Value
    menu.addItem((item) =>
        item.setTitle(t('explorer.ctx.move_value')).setIcon('lucide-move').onClick(() => {
            new MoveValueModal(this.plugin.app, this.plugin, propName, value, scopedFiles).open();
        })
    );
    // ... rest of menu unchanged (Convert + Delete)
```

- [ ] **1.3 — Update `queueValueTransform` and `queueValueDelete` to use scoped files**

In `queueValueTransform(propName, oldValue, transform)`, replace:
```typescript
const files = this.getOperationFiles();
```
with:
```typescript
const files = this.getFilesWithValue(propName, oldValue);
```

In `queueValueDelete(propName, value)`, replace:
```typescript
const files = this.getOperationFiles();
```
with:
```typescript
const files = this.getFilesWithValue(propName, value);
```

- [ ] **1.4 — Build and verify**

```bash
cd "C:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/plugin-dev/.obsidian/plugins/obsiman"
npm run build
```
Expected: 0 errors.

---

## Task 2: Create QueueIslandComponent

**Goal:** Replace the native `QueueDetailsModal` popup triggered from the Ops FAB with an in-frame floating island that slides up from the bottom.

**Files:**
- Create: `src/components/QueueIslandComponent.ts`

### Steps

- [ ] **2.1 — Create `QueueIslandComponent.ts`**

```typescript
import { setIcon, type App } from 'obsidian';
import type { OperationQueueService } from '../services/OperationQueueService';
import type { PendingChange } from '../types/operation';
import { t } from '../i18n/index';

/**
 * In-frame floating island showing the pending operation queue.
 * Rendered above the bottom nav bar. Height grows with content up to
 * 70% of the viewport height, then scrolls internally.
 *
 * Structure (bottom → top):
 *   header ("N cambios pendientes")
 *   squircle buttons: Execute ▶ · Clear ✕ · Details ☰
 *   scrollable item list
 */
export class QueueIslandComponent {
    private containerEl: HTMLElement;
    private app: App;
    private queueService: OperationQueueService;
    private onClose: () => void;
    private onOpenDetails: () => void;

    private islandEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;

    constructor(
        containerEl: HTMLElement,
        app: App,
        queueService: OperationQueueService,
        onClose: () => void,
        onOpenDetails: () => void
    ) {
        this.containerEl = containerEl;
        this.app = app;
        this.queueService = queueService;
        this.onClose = onClose;
        this.onOpenDetails = onOpenDetails;
    }

    mount(): void {
        this.islandEl = this.containerEl.createDiv({ cls: 'obsiman-queue-island' });

        // Header — count label (visually distinct, can be removed without touching rest)
        this.headerEl = this.islandEl.createDiv({ cls: 'obsiman-queue-island-header' });

        // Squircle action buttons
        const btnRow = this.islandEl.createDiv({ cls: 'obsiman-squircle-row obsiman-queue-island-btns' });

        const executeBtn = btnRow.createDiv({
            cls: 'obsiman-squircle',
            attr: { 'aria-label': t('ops.apply'), role: 'button', tabindex: '0' },
        });
        setIcon(executeBtn, 'lucide-play');
        executeBtn.addEventListener('click', () => {
            void this.queueService.execute();
            this.onClose();
        });

        const clearBtn = btnRow.createDiv({
            cls: 'obsiman-squircle',
            attr: { 'aria-label': t('ops.clear'), role: 'button', tabindex: '0' },
        });
        setIcon(clearBtn, 'lucide-x');
        clearBtn.addEventListener('click', () => {
            this.queueService.clear();
            this.onClose();
        });

        const detailsBtn = btnRow.createDiv({
            cls: 'obsiman-squircle',
            attr: { 'aria-label': t('ops.details'), role: 'button', tabindex: '0' },
        });
        setIcon(detailsBtn, 'lucide-list');
        detailsBtn.addEventListener('click', () => {
            this.onOpenDetails();
        });

        // Scrollable item list
        this.listEl = this.islandEl.createDiv({ cls: 'obsiman-queue-island-list' });

        this.render();

        // Slide in
        requestAnimationFrame(() => {
            this.islandEl?.addClass('is-open');
        });
    }

    render(): void {
        if (!this.listEl || !this.headerEl) return;
        const queue = this.queueService.queue;

        this.headerEl.setText(`${queue.length} ${t('queue.island.pending')}`);

        this.listEl.empty();
        if (queue.length === 0) {
            this.listEl.createDiv({ cls: 'obsiman-queue-island-empty', text: t('queue.empty') });
            return;
        }

        for (const change of queue) {
            const rowEl = this.listEl.createDiv({ cls: 'obsiman-queue-island-row' });
            const fileCount = change.files.length;
            rowEl.createSpan({
                cls: 'obsiman-queue-island-row-files',
                text: `${fileCount} file${fileCount !== 1 ? 's' : ''}`,
            });
            rowEl.createSpan({
                cls: 'obsiman-queue-island-row-detail',
                text: change.details,
            });
        }
    }

    destroy(): void {
        this.islandEl?.remove();
        this.islandEl = null;
        this.listEl = null;
        this.headerEl = null;
    }
}
```

- [ ] **2.2 — Add i18n keys**

In `src/i18n/en.ts`, add to the queue section:
```typescript
'queue.island.pending': 'pending changes',
'queue.empty': 'Queue is empty',
```

In `src/i18n/es.ts`, add:
```typescript
'queue.island.pending': 'cambios pendientes',
'queue.empty': 'La cola está vacía',
```

- [ ] **2.3 — Add CSS for the island**

In `styles.css`, add after the `.obsiman-active-filters-popup` block (search for it):

```css
/* === Queue Island === */
.obsiman-queue-island {
  position: absolute;
  bottom: calc(var(--obsiman-nav-height, 64px) + 8px);
  left: 12px;
  right: 12px;
  z-index: 20;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 70vh;
  transform: translateY(20px);
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.2s ease;
}

.obsiman-queue-island.is-open {
  transform: translateY(0);
  opacity: 1;
}

.obsiman-queue-island-header {
  font-size: var(--font-ui-small);
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.obsiman-queue-island-btns {
  justify-content: center;
}

.obsiman-queue-island-list {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 80px; /* show at least ~3 items */
}

.obsiman-queue-island-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: var(--font-ui-smaller);
}

.obsiman-queue-island-row:nth-child(odd) {
  background: var(--background-modifier-hover);
}

.obsiman-queue-island-row-files {
  flex-shrink: 0;
  color: var(--text-accent);
  font-weight: 500;
}

.obsiman-queue-island-row-detail {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.obsiman-queue-island-empty {
  color: var(--text-faint);
  font-size: var(--font-ui-small);
  text-align: center;
  padding: 12px 0;
}
```

- [ ] **2.4 — Wire island into ObsiManView.svelte**

In `ObsiManView.svelte`:

**a) Add import** at top of `<script>`:
```typescript
import { QueueIslandComponent } from '../components/QueueIslandComponent';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
```
(QueueDetailsModal import stays — used by the Details ☰ button)

**b) Add reactive state** after the `queuedCount` state:
```typescript
let queueIslandOpen = $state(false);
let queueIsland: QueueIslandComponent | undefined;
let queueIslandEl: HTMLElement | null = null;
```

**c) Add island mount/unmount function** (put after `initQueueList`):
```typescript
function toggleQueueIsland() {
    if (queueIslandOpen) {
        closeQueueIsland();
    } else {
        openQueueIsland();
    }
}

function openQueueIsland() {
    if (!queueIslandEl) return;
    queueIslandOpen = true;
    queueIsland = new QueueIslandComponent(
        queueIslandEl,
        plugin.app,
        plugin.queueService,
        () => closeQueueIsland(),
        () => { new QueueDetailsModal(plugin.app, plugin.queueService).open(); }
    );
    queueIsland.mount();
}

function closeQueueIsland() {
    queueIsland?.destroy();
    queueIsland = undefined;
    queueIslandOpen = false;
}
```

**d) Replace the Ops FAB action** — find `pageFabDef`:
```typescript
const pageFabDef: Record<string, FabDef> = {
    ops: {
        icon: 'lucide-list-checks',
        label: t('ops.queue'),
        action: () => { toggleQueueIsland(); },  // ← changed from QueueDetailsModal
    },
    filters: {
        icon: 'lucide-filter',
        label: t('filters.active'),
        action: () => showPopup('active-filters'),
    },
};
```

**e) Add island container element** in the template, inside `.obsiman-pages-viewport` but BEFORE the bottom nav `<div>`:
```svelte
<!-- Queue island container — floats above bottom nav -->
<div class="obsiman-queue-island-wrap" bind:this={queueIslandEl}></div>
```

**f) Auto-close island on queue execute** — update `onMount`:
```typescript
const onQueueChanged = () => {
    refreshQueue();
    if (plugin.queueService.isEmpty && queueIslandOpen) {
        closeQueueIsland();
    }
    queueIsland?.render(); // refresh island content when queue changes
};
```

- [ ] **2.5 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **2.6 — Reload plugin in Obsidian and test**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

Verify:
- Open ObsiMan sidebar
- Queue any operation (e.g. rename a file)
- Tap Ops FAB → island slides up with correct items
- Tap Execute ▶ → applies changes, island closes
- Tap Clear ✕ → clears queue, island closes
- Tap Details ☰ → QueueDetailsModal opens (island stays open)
- Island height grows with more items, scrolls beyond ~70vh

- [ ] **2.7 — Commit Group 1**

```bash
git add src/components/PropertyExplorerComponent.ts src/components/QueueIslandComponent.ts src/i18n/en.ts src/i18n/es.ts styles.css src/views/ObsiManView.svelte
git commit -m "fix(queue): rename value scope scoped to prop+value files; queue island replaces native popup"
```

---

## Task 3: FilterService + filter-evaluator — search filter integration

**Goal:** Add `setSearchFilter(name, folder)` to FilterService so all consumers (stats bar, Ops scope, filteredFiles) reflect Files page search.

**Files:**
- Modify: `src/types/filter.ts`
- Modify: `src/utils/filter-evaluator.ts`
- Modify: `src/services/FilterService.ts`

### Steps

- [ ] **3.1 — Add `file_folder` to FilterType**

In `src/types/filter.ts`, update `FilterType`:
```typescript
export type FilterType =
    | 'has_property'
    | 'missing_property'
    | 'specific_value'
    | 'multiple_values'
    | 'folder'
    | 'folder_exclude'
    | 'file_name'
    | 'file_name_exclude'
    | 'file_folder';   // ← new: matches folder path only (not filename)
```

- [ ] **3.2 — Add `file_folder` case to filter-evaluator**

In `src/utils/filter-evaluator.ts`, in `matchesFile()`, add before the closing brace:
```typescript
case 'file_folder': {
    const folder = rule.values[0] ?? '';
    if (!folder) return true; // empty folder = no filter
    const parentPath = (file.parent?.path ?? '').toLowerCase();
    return parentPath.includes(folder.toLowerCase());
}
```

- [ ] **3.3 — Add search filter fields to FilterService**

In `src/services/FilterService.ts`, add after the `filteredFiles` declaration:
```typescript
/** File name search (applied alongside filter tree, not part of tree) */
private _searchName = '';
/** Folder path search (applied alongside filter tree, not part of tree) */
private _searchFolder = '';
```

Add this public method after `loadTemplate()`:
```typescript
/** Set file name and folder search terms. Pass empty strings to clear. */
setSearchFilter(name: string, folder: string): void {
    this._searchName = name;
    this._searchFolder = folder;
    this.applyFilters();
}
```

- [ ] **3.4 — Include search terms in `applyFilters()`**

In `FilterService.applyFilters()`, update the method to intersect search results:

```typescript
applyFilters(): void {
    const allFiles = this.app.vault.getMarkdownFiles();

    let base: TFile[];
    if (this.activeFilter.children.length === 0) {
        base = [...allFiles];
    } else {
        const getMeta = (file: TFile) => this.app.metadataCache.getFileCache(file);
        const matchingPaths = evalNode(this.activeFilter, allFiles, getMeta);
        base = allFiles.filter((f) => matchingPaths.has(f.path));
    }

    // Apply search filters (AND with filter tree result)
    if (this._searchName) {
        const term = this._searchName.toLowerCase();
        base = base.filter((f) => f.basename.toLowerCase().includes(term));
    }
    if (this._searchFolder) {
        const term = this._searchFolder.toLowerCase();
        base = base.filter((f) =>
            (f.parent?.path ?? '').toLowerCase().includes(term)
        );
    }

    this.filteredFiles = base.sort((a, b) =>
        a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' })
    );

    this.events.trigger('changed');
}
```

- [ ] **3.5 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

---

## Task 4: ObsiManView.svelte — wire search, fix badges, fix drag reorder

**Files:**
- Modify: `src/views/ObsiManView.svelte`

### Steps

- [ ] **4.1 — Wire search fields to FilterService**

Find the existing `$effect` for search:
```typescript
$effect(() => {
    fileList?.setSearchFilter(searchName, searchFolder);
});
```

Replace with:
```typescript
$effect(() => {
    fileList?.setSearchFilter(searchName, searchFolder);
    plugin.filterService.setSearchFilter(searchName, searchFolder);
});
```

(Keeping `fileList?.setSearchFilter` so the FileListComponent still gets local updates — but now FilterService also drives the shared `filteredFiles`.)

- [ ] **4.2 — Diagnose and fix filters badge**

The badge code at line ~1180 is:
```svelte
{#if !isReordering && pageId === "filters" && filterRuleCount > 0}
    <div class="obsiman-nav-dot-badge">{filterRuleCount}</div>
{/if}
```

First, add a temporary console.log to `updateStats()` to verify `filterRuleCount` is non-zero when filters are active:
```typescript
function updateStats() {
    totalFiles = plugin.propertyIndex.fileCount;
    filteredCount = plugin.filterService.filteredFiles.length;
    selectedCount = plugin.basesInjector?.selectedPaths?.size ?? 0;
    queuedCount = plugin.queueService.queue.length;
    filterRuleCount = countFilterLeaves(plugin.filterService.activeFilter);
    // TEMP debug — remove before commit
    if (filterRuleCount > 0) console.log('[ObsiMan] filterRuleCount:', filterRuleCount);
}
```

Reload plugin, add a filter, check console. If `filterRuleCount > 0` but badge is invisible: add `overflow: visible` to `.obsiman-nav-icon` in `styles.css`:
```css
.obsiman-nav-icon {
  position: relative;
  overflow: visible; /* ← ensure badge is not clipped */
  /* ... rest unchanged */
}
```

Remove the console.log after verifying.

- [ ] **4.3 — Add Files badge for selectedCount**

In the navbar `{#each pageOrder as pageId, i}` block, add the Files badge alongside the existing Filters and Ops badges:

```svelte
{#if !isReordering && pageId === "files" && selectedCount > 0}
    <div class="obsiman-nav-dot-badge">{selectedCount}</div>
{/if}
{#if !isReordering && pageId === "filters" && filterRuleCount > 0}
    <div class="obsiman-nav-dot-badge">{filterRuleCount}</div>
{/if}
{#if !isReordering && pageId === "ops" && queuedCount > 0}
    <div class="obsiman-nav-dot-badge">{queuedCount}</div>
{/if}
```

- [ ] **4.4 — Fix drag reorder DOM duplicates**

The `{#each pageOrder as pageId (pageId)}` is already keyed. The duplicate content bug is caused by Svelte not fully re-evaluating page content when `pageOrder` changes. Fix by forcing content remount using a version counter:

Add state after `pageOrder`:
```typescript
let pageOrder = $state(resolvedPageOrder());
let pageRenderKey = $state(0); // incremented on each reorder to force remount
```

In `onPillPointerUp`, after assigning `pageOrder = order`:
```typescript
pageOrder = order;
pageRenderKey++; // force page content remount
```

In the template, wrap each page's conditional content with `{#key}`:
```svelte
{#each pageOrder as pageId (pageId)}
    <div class="obsiman-page" data-page={pageId}>
        {#key pageRenderKey}
            {#if pageId === "files"}
                <!-- ... files content unchanged ... -->
            {:else if pageId === "filters"}
                <!-- ... filters content unchanged ... -->
            {:else if pageId === "ops"}
                <!-- ... ops content unchanged ... -->
            {/if}
        {/key}
    </div>
{/each}
```

Note: This causes `FileListComponent`, `PropertyExplorerComponent`, and `QueueListComponent` to be destroyed and recreated after each reorder. That's acceptable since reorder is a rare, intentional user action.

- [ ] **4.5 — Fix search tab toggle (one-click open, one-click close)**

Find `toggleFiltersTab`:
```typescript
function toggleFiltersTab(tab: FiltersTabAction, e: MouseEvent) {
    if (filtersActiveTab === tab) {
        filtersActiveTab = null;
    } else {
        filtersActiveTab = tab;
        if (tab === 'search') propExplorer?.toggleSearch();
        else if (tab === 'scope') propExplorer?.showFilterMenu(e);
        else if (tab === 'sort') propExplorer?.showSortMenu(e);
    }
}
```

Replace with:
```typescript
function toggleFiltersTab(tab: FiltersTabAction, e: MouseEvent) {
    if (filtersActiveTab === tab) {
        filtersActiveTab = null;
        if (tab === 'search') propExplorer?.toggleSearch(); // close search bar
    } else {
        filtersActiveTab = tab;
        if (tab === 'search') propExplorer?.toggleSearch();
        else if (tab === 'scope') propExplorer?.showFilterMenu(e);
        else if (tab === 'sort') propExplorer?.showSortMenu(e);
    }
}
```

- [ ] **4.6 — Remove "ObsiMan" view header**

Find and delete from the template:
```svelte
<!-- ─── Header ─────────────────────────────────────────────────────────────── -->
<div class="obsiman-view-header" use:bindViewRoot>
    <span class="obsiman-view-title">{t("plugin.name")}</span>
</div>
```

Move the `use:bindViewRoot` action to the `.obsiman-pages-viewport` div (the ResizeObserver still needs a root element):
```svelte
<div class="obsiman-pages-viewport" use:bindViewport use:bindViewRoot>
```

- [ ] **4.7 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **4.8 — Reload and test Group 2**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

Verify:
- Type in Files page name search FAB → stats bar "X filtered" updates, Ops scope reflects search
- Add a filter via Add Filter modal → Filters badge shows count
- Queue an operation → Ops badge shows count
- Select files → Files badge shows count
- Long-press nav icon 2s → drag to another position → release → pages reorder correctly, no duplicates
- Click Search tab in Filters → search bar opens; click again → closes
- The "ObsiMan" heading is gone

- [ ] **4.9 — Commit Group 2**

```bash
git add src/types/filter.ts src/utils/filter-evaluator.ts src/services/FilterService.ts src/views/ObsiManView.svelte styles.css
git commit -m "fix(filters+nav): FilterService search integration, badges (filters/files/ops), drag reorder fix, search tab toggle, remove header"
```

---

## Task 5: PropertyExplorerComponent — view option toggles + 0-count fix

**Goal:** Add `showPropIcon` and `showPropName` toggles; fix `showType` to actually control type icon rendering and default it to `false`; hide values with 0 count in any scoped view.

**Files:**
- Modify: `src/components/PropertyExplorerComponent.ts`
- Modify: `src/views/ObsiManView.svelte`
- Modify: `src/i18n/en.ts` and `src/i18n/es.ts`

### Steps

- [ ] **5.1 — Add new toggle fields to PropertyExplorerComponent**

In the `// ── View Options ─────────────────────────────────────────` section (line ~61):
```typescript
// ── View Options ─────────────────────────────────────────
private viewFormat: 'tree' | 'grid' | 'cards' = 'tree';
private showPropIcon = true;   // show primary property icon
private showPropName = true;   // show property name text
private showCount = true;      // show occurrence count
private showTypeIcon = false;  // show data-type icon (OFF by default)
private showValues = true;
private tagsOnly = false;
```

(Remove `private showType = true;` — replaced by `showTypeIcon` and `showPropIcon`)

- [ ] **5.2 — Update `setViewOptions` signature and body**

```typescript
setViewOptions(opts: {
    format: 'tree' | 'grid' | 'cards';
    showPropIcon: boolean;
    showPropName: boolean;
    showCount: boolean;
    showTypeIcon: boolean;
    tagsOnly: boolean;
}): void {
    this.viewFormat = opts.format;
    this.showPropIcon = opts.showPropIcon;
    this.showPropName = opts.showPropName;
    this.showCount = opts.showCount;
    this.showTypeIcon = opts.showTypeIcon;
    this.tagsOnly = opts.tagsOnly;
    this.invalidateCache();
    this.renderTree();
}
```

- [ ] **5.3 — Apply toggles in `renderPropertyNode`**

In `renderPropertyNode`, find the property icon section:
```typescript
// Property icon (Iconic custom → fallback to type icon)
const iconData = this.plugin.iconicService.getIcon(propName);
const iconSpan = headerEl.createSpan({ cls: 'obsiman-explorer-icon' });
if (iconData) {
    setIcon(iconSpan, iconData.icon);
    if (iconData.color) iconSpan.style.color = `var(--color-${iconData.color})`;
} else {
    const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
    setIcon(iconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
    iconSpan.addClass('obsiman-explorer-icon-default');
}

// Property name
headerEl.createSpan({ cls: 'obsiman-explorer-prop-name', text: propName });

// Count (plain text, no background)
headerEl.createSpan({ cls: 'obsiman-explorer-badge', text: String(totalFiles) });
```

Replace with:
```typescript
// Primary property icon (Iconic custom → fallback to type icon)
if (this.showPropIcon) {
    const iconData = this.plugin.iconicService.getIcon(propName);
    const iconSpan = headerEl.createSpan({ cls: 'obsiman-explorer-icon' });
    if (iconData) {
        setIcon(iconSpan, iconData.icon);
        if (iconData.color) iconSpan.style.color = `var(--color-${iconData.color})`;
    } else {
        const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
        setIcon(iconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
        iconSpan.addClass('obsiman-explorer-icon-default');
    }
}

// Data-type icon (separate, OFF by default)
if (this.showTypeIcon) {
    const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
    const typeIconSpan = headerEl.createSpan({ cls: 'obsiman-explorer-type-icon' });
    setIcon(typeIconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-type');
}

// Property name
if (this.showPropName) {
    headerEl.createSpan({ cls: 'obsiman-explorer-prop-name', text: propName });
}

// Count
if (this.showCount) {
    headerEl.createSpan({ cls: 'obsiman-explorer-badge', text: String(totalFiles) });
}
```

- [ ] **5.4 — Hide values with 0 count**

In `renderPropertyNode`, in the expanded values section, find the `for (const value of sortedValues)` loop:

After computing `const count = valueCounts.get(value) ?? 0;`, add a skip for zero-count values:
```typescript
for (const value of sortedValues) {
    const count = valueCounts.get(value) ?? 0;
    // When scope is filtered/selected, hide values with no matching files
    if (count === 0 && this.filterScope !== 'all') continue;
    // ... rest of value rendering unchanged
}
```

- [ ] **5.5 — Update Svelte view options state and panel**

In `ObsiManView.svelte`, update the explorer state variables:
```typescript
let explorerViewFormat = $state<'tree' | 'grid' | 'cards'>('tree');
let explorerShowPropIcon = $state(true);    // new
let explorerShowPropName = $state(true);    // new
let explorerShowCount = $state(true);
let explorerShowTypeIcon = $state(false);   // was explorerShowType = true → now false
let explorerTagsOnly = $state(false);
```

Update the `$effect` that calls `setViewOptions`:
```typescript
$effect(() => {
    propExplorer?.setViewOptions({
        format: explorerViewFormat,
        showPropIcon: explorerShowPropIcon,
        showPropName: explorerShowPropName,
        showCount: explorerShowCount,
        showTypeIcon: explorerShowTypeIcon,
        tagsOnly: explorerTagsOnly,
    });
});
```

Update the view panel in the template to add the two new checkboxes:
```svelte
<div class="obsiman-view-panel-section">
    <span class="obsiman-view-panel-label">{t('filters.view.show')}</span>
    <label class="obsiman-view-panel-check">
        <input type="checkbox" bind:checked={explorerShowPropIcon} />
        {t('filters.view.show.prop_icon')}
    </label>
    <label class="obsiman-view-panel-check">
        <input type="checkbox" bind:checked={explorerShowPropName} />
        {t('filters.view.show.prop_name')}
    </label>
    <label class="obsiman-view-panel-check">
        <input type="checkbox" bind:checked={explorerShowCount} />
        {t('filters.view.show.count')}
    </label>
    <label class="obsiman-view-panel-check">
        <input type="checkbox" bind:checked={explorerShowTypeIcon} />
        {t('filters.view.show.type_icon')}
    </label>
</div>
```

- [ ] **5.6 — Add i18n keys**

In `src/i18n/en.ts`:
```typescript
'filters.view.show.prop_icon': 'Property icon',
'filters.view.show.prop_name': 'Property name',
'filters.view.show.type_icon': 'Type icon',
```

In `src/i18n/es.ts`:
```typescript
'filters.view.show.prop_icon': 'Ícono de propiedad',
'filters.view.show.prop_name': 'Nombre de propiedad',
'filters.view.show.type_icon': 'Ícono de tipo',
```

- [ ] **5.7 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

---

## Task 6: PropertyExplorerComponent — tags view left/right click

**Goal:** Left click on a tag adds a `has_tag` filter rule; right click shows a context menu (UI only, actions stub).

**Files:**
- Modify: `src/components/PropertyExplorerComponent.ts`

### Steps

- [ ] **6.1 — Update `renderTagsOnlyTree` with click handlers**

In `renderTagsOnlyTree()`, find the click handler for `headerEl`:
```typescript
headerEl.addEventListener('click', () => {
    if (hasChildren) {
        if (this.expandedProps.has(fullPath)) this.expandedProps.delete(fullPath);
        else this.expandedProps.add(fullPath);
        this.renderTree();
    }
});
```

Replace with:
```typescript
headerEl.addEventListener('click', () => {
    if (hasChildren) {
        if (this.expandedProps.has(fullPath)) this.expandedProps.delete(fullPath);
        else this.expandedProps.add(fullPath);
        this.renderTree();
    } else {
        // Leaf tag: add has_tag filter
        const tagValue = `#${fullPath}`;
        this.plugin.filterService.addNode({
            type: 'rule',
            filterType: 'file_name', // ← uses existing file_name as placeholder;
            // TODO: add has_tag filterType in a dedicated tags iteration
            property: '',
            values: [tagValue],
        });
    }
});
```

> **Note:** `has_tag` is not yet a `FilterType`. For now, use a temporary workaround that adds a `file_name` rule with the tag value so clicking does *something* visible. The proper `has_tag` filter type will be added in the tags iteration. Document this placeholder in a TODO comment.

Actually, a better approach: add `has_tag` to FilterType now and handle it in filter-evaluator using `getAllTags`:

In `src/types/filter.ts`, add `'has_tag'` to FilterType:
```typescript
export type FilterType =
    | 'has_property'
    | 'missing_property'
    | 'specific_value'
    | 'multiple_values'
    | 'folder'
    | 'folder_exclude'
    | 'file_name'
    | 'file_name_exclude'
    | 'file_folder'
    | 'has_tag';  // ← new
```

In `src/utils/filter-evaluator.ts`, add the import and case:

At top:
```typescript
import { getAllTags, type TFile, type CachedMetadata } from 'obsidian';
```

In `matchesFile()`:
```typescript
case 'has_tag': {
    const tagTarget = (rule.values[0] ?? '').toLowerCase();
    const allTags = getAllTags(meta ?? {}) ?? [];
    return allTags.some((t) => t.toLowerCase() === tagTarget || t.toLowerCase() === tagTarget.replace(/^#/, ''));
}
```

Now update `renderTagsOnlyTree` click handler:
```typescript
headerEl.addEventListener('click', () => {
    if (hasChildren) {
        if (this.expandedProps.has(fullPath)) this.expandedProps.delete(fullPath);
        else this.expandedProps.add(fullPath);
        this.renderTree();
    } else {
        // Leaf tag: add filter
        const tagValue = `#${fullPath}`;
        this.plugin.filterService.addNode({
            type: 'rule',
            filterType: 'has_tag',
            property: '',
            values: [tagValue],
        });
    }
});
```

- [ ] **6.2 — Add right-click context menu on tags**

After the click handler, add:
```typescript
headerEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.showTagContextMenu(e, `#${fullPath}`);
});
```

Add the `showTagContextMenu` private method to `PropertyExplorerComponent`:
```typescript
private showTagContextMenu(e: MouseEvent, tag: string): void {
    const menu = new Menu();
    menu.addItem((item) =>
        item.setTitle(t('explorer.ctx.rename_tag')).setIcon('lucide-pencil').onClick(() => {
            new Notice(t('explorer.ctx.coming_soon'));
        })
    );
    menu.addItem((item) =>
        item.setTitle(t('explorer.ctx.merge_tag')).setIcon('lucide-git-merge').onClick(() => {
            new Notice(t('explorer.ctx.coming_soon'));
        })
    );
    menu.showAtMouseEvent(e);
}
```

- [ ] **6.3 — Add i18n keys for tag context menu**

In `src/i18n/en.ts`:
```typescript
'explorer.ctx.rename_tag': 'Rename tag',
'explorer.ctx.merge_tag': 'Merge with…',
'explorer.ctx.coming_soon': 'Coming soon — tags iteration',
```

In `src/i18n/es.ts`:
```typescript
'explorer.ctx.rename_tag': 'Renombrar tag',
'explorer.ctx.merge_tag': 'Unir con…',
'explorer.ctx.coming_soon': 'Próximamente — iteración de tags',
```

- [ ] **6.4 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

---

## Task 7: PropertyExplorerComponent — Grid view mode

**Goal:** When `viewFormat === 'grid'`, render properties in an Excel-style table (properties as rows, values in adjacent cells).

**Files:**
- Modify: `src/components/PropertyExplorerComponent.ts`
- Modify: `styles.css`

### Steps

- [ ] **7.1 — Add `renderGridView` method**

In `renderTree()`, add a branch at the top (after the `tagsOnly` check):
```typescript
private renderTree(): void {
    if (!this.treeEl) return;
    if (this.tagsOnly) {
        this.renderTagsOnlyTree();
        return;
    }
    if (this.viewFormat === 'grid') {
        this.renderGridView();
        return;
    }
    if (this.viewFormat === 'cards') {
        this.renderCardsView();
        return;
    }
    // ... existing tree rendering
```

Add the `renderGridView` method:
```typescript
private renderGridView(): void {
    if (!this.treeEl) return;
    this.treeEl.empty();
    this.treeEl.addClass('obsiman-explorer-grid');
    this.treeEl.removeClass('obsiman-explorer-cards');

    const index = this.plugin.propertyIndex.index;
    const propFileCounts = this.getPropFileCounts();
    const fileCounts = this.getFileCountMap();

    let propNames = [...index.keys()];
    if (this.filterScope !== 'all') {
        propNames = propNames.filter((n) => (propFileCounts.get(n) ?? 0) > 0);
    }
    propNames = this.sortProperties(propNames, index, propFileCounts);

    if (propNames.length === 0) {
        this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: t('explorer.empty') });
        return;
    }

    const table = this.treeEl.createEl('table', { cls: 'obsiman-grid-table' });
    for (const propName of propNames) {
        const values = index.get(propName);
        if (!values) continue;
        const valueCounts = fileCounts.get(propName) ?? new Map<string, number>();

        const row = table.createEl('tr', { cls: 'obsiman-grid-row' });

        // Header cell: property name (+ icon if enabled)
        const headerCell = row.createEl('td', { cls: 'obsiman-grid-prop-cell' });
        if (this.showPropIcon) {
            const iconData = this.plugin.iconicService.getIcon(propName);
            const iconSpan = headerCell.createSpan({ cls: 'obsiman-explorer-icon' });
            if (iconData) {
                setIcon(iconSpan, iconData.icon);
                if (iconData.color) iconSpan.style.color = `var(--color-${iconData.color})`;
            } else {
                const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
                setIcon(iconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
            }
        }
        if (this.showPropName) {
            headerCell.createSpan({ cls: 'obsiman-grid-prop-name', text: propName });
        }
        if (this.showCount) {
            headerCell.createSpan({ cls: 'obsiman-explorer-badge', text: String(propFileCounts.get(propName) ?? 0) });
        }

        // Right-click on header: property context menu
        headerCell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showPropertyContextMenu(e, propName);
        });

        // Value cells
        const valuesCell = row.createEl('td', { cls: 'obsiman-grid-values-cell' });
        const sortedValues = [...values].sort((a, b) => {
            if (this.valueSortMode === 'value_alpha') return a.localeCompare(b, undefined, { sensitivity: 'base' });
            return (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
        });

        for (const value of sortedValues) {
            const count = valueCounts.get(value) ?? 0;
            if (count === 0 && this.filterScope !== 'all') continue;
            const chip = valuesCell.createSpan({ cls: 'obsiman-grid-value-chip' });
            chip.setText(value);
            if (this.showCount) {
                chip.createSpan({ cls: 'obsiman-grid-value-count', text: ` (${count})` });
            }
            chip.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showValueContextMenu(e, propName, value);
            });
            chip.addEventListener('click', (e) => {
                e.stopPropagation();
                this.plugin.filterService.addNode({
                    type: 'rule',
                    filterType: 'specific_value',
                    property: propName,
                    values: [value],
                });
            });
        }
    }
}
```

- [ ] **7.2 — Add CSS for grid view**

In `styles.css`:
```css
/* === PropertyExplorer — Grid view === */
.obsiman-explorer-grid .obsiman-grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-ui-smaller);
}

.obsiman-grid-row {
  border-bottom: 1px solid var(--background-modifier-border);
}

.obsiman-grid-row:last-child {
  border-bottom: none;
}

.obsiman-grid-prop-cell {
  padding: 4px 6px;
  vertical-align: top;
  white-space: nowrap;
  width: 40%;
  color: var(--text-muted);
  cursor: context-menu;
  display: flex;
  align-items: center;
  gap: 4px;
}

.obsiman-grid-prop-name {
  font-weight: 500;
  color: var(--text-normal);
}

.obsiman-grid-values-cell {
  padding: 4px 6px;
  vertical-align: top;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.obsiman-grid-value-chip {
  background: var(--background-modifier-hover);
  border-radius: 4px;
  padding: 1px 6px;
  cursor: pointer;
  color: var(--text-normal);
}

.obsiman-grid-value-chip:hover {
  background: var(--background-modifier-border);
}

.obsiman-grid-value-count {
  color: var(--text-faint);
}
```

- [ ] **7.3 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

---

## Task 8: PropertyExplorerComponent — Cards view mode with drill-down

**Goal:** When `viewFormat === 'cards'`, render a card grid. Clicking a card navigates in-place to a drill-down showing that property's values as chips. A back button returns to the card grid.

**Files:**
- Modify: `src/components/PropertyExplorerComponent.ts`
- Modify: `styles.css`

### Steps

- [ ] **8.1 — Add drill-down state**

In `PropertyExplorerComponent`, add after `private filterByType`:
```typescript
// ── Cards drill-down ──────────────────────────────────────
private cardsDrilldownProp: string | null = null;
```

- [ ] **8.2 — Add `renderCardsView` method**

```typescript
private renderCardsView(): void {
    if (!this.treeEl) return;
    this.treeEl.empty();
    this.treeEl.removeClass('obsiman-explorer-grid');
    this.treeEl.addClass('obsiman-explorer-cards');

    if (this.cardsDrilldownProp !== null) {
        this.renderCardsDrilldown(this.cardsDrilldownProp);
        return;
    }

    const index = this.plugin.propertyIndex.index;
    const propFileCounts = this.getPropFileCounts();

    let propNames = [...index.keys()];
    if (this.filterScope !== 'all') {
        propNames = propNames.filter((n) => (propFileCounts.get(n) ?? 0) > 0);
    }
    propNames = this.sortProperties(propNames, index, propFileCounts);

    if (propNames.length === 0) {
        this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: t('explorer.empty') });
        return;
    }

    const grid = this.treeEl.createDiv({ cls: 'obsiman-cards-grid' });

    for (const propName of propNames) {
        const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
        const count = propFileCounts.get(propName) ?? 0;
        const iconData = this.plugin.iconicService.getIcon(propName);

        const card = grid.createDiv({ cls: 'obsiman-prop-card' });

        // Card icon (large, centered)
        if (this.showPropIcon) {
            const iconWrap = card.createDiv({ cls: 'obsiman-prop-card-icon' });
            if (iconData) {
                setIcon(iconWrap, iconData.icon);
                if (iconData.color) iconWrap.style.color = `var(--color-${iconData.color})`;
            } else {
                setIcon(iconWrap, TYPE_ICON_MAP[propType] ?? 'lucide-text');
            }
        }

        // Type icon (small, if enabled)
        if (this.showTypeIcon) {
            const typeWrap = card.createDiv({ cls: 'obsiman-prop-card-type-icon' });
            setIcon(typeWrap, TYPE_ICON_MAP[propType] ?? 'lucide-type');
        }

        // Property name
        if (this.showPropName) {
            card.createDiv({ cls: 'obsiman-prop-card-name', text: propName });
        }

        // Stats row
        const stats = card.createDiv({ cls: 'obsiman-prop-card-stats' });
        if (this.showCount) {
            stats.createSpan({ cls: 'obsiman-prop-card-count', text: String(count) });
        }

        // Click → drill-down
        card.addEventListener('click', () => {
            this.cardsDrilldownProp = propName;
            this.renderTree();
        });

        // Right-click → property context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showPropertyContextMenu(e, propName);
        });
    }
}

private renderCardsDrilldown(propName: string): void {
    if (!this.treeEl) return;
    const index = this.plugin.propertyIndex.index;
    const fileCounts = this.getFileCountMap();
    const propFileCounts = this.getPropFileCounts();
    const valueCounts = fileCounts.get(propName) ?? new Map<string, number>();
    const values = index.get(propName) ?? new Set<string>();
    const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
    const iconData = this.plugin.iconicService.getIcon(propName);
    const totalCount = propFileCounts.get(propName) ?? 0;

    // Topbar: ← back · prop icon · app icon · name · stats
    const topbar = this.treeEl.createDiv({ cls: 'obsiman-cards-drilldown-topbar' });

    const backBtn = topbar.createDiv({ cls: 'obsiman-cards-back clickable-icon', attr: { 'aria-label': 'Back', role: 'button', tabindex: '0' } });
    setIcon(backBtn, 'lucide-arrow-left');
    backBtn.addEventListener('click', () => {
        this.cardsDrilldownProp = null;
        this.renderTree();
    });

    // Property icon
    const propIconWrap = topbar.createDiv({ cls: 'obsiman-cards-drilldown-prop-icon' });
    if (iconData) {
        setIcon(propIconWrap, iconData.icon);
        if (iconData.color) propIconWrap.style.color = `var(--color-${iconData.color})`;
    } else {
        setIcon(propIconWrap, TYPE_ICON_MAP[propType] ?? 'lucide-text');
    }

    // App icon
    const appIconWrap = topbar.createDiv({ cls: 'obsiman-cards-drilldown-app-icon' });
    setIcon(appIconWrap, 'lucide-box'); // ObsiMan app icon

    // Property name
    topbar.createDiv({ cls: 'obsiman-cards-drilldown-title', text: propName });

    // Stats
    topbar.createDiv({ cls: 'obsiman-cards-drilldown-stats', text: `${totalCount} files · ${values.size} values` });

    // Values as chips
    const chipsWrap = this.treeEl.createDiv({ cls: 'obsiman-cards-drilldown-chips' });

    const sortedValues = [...values].sort((a, b) => {
        if (this.valueSortMode === 'value_alpha') return a.localeCompare(b, undefined, { sensitivity: 'base' });
        return (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
    });

    for (const value of sortedValues) {
        const count = valueCounts.get(value) ?? 0;
        if (count === 0 && this.filterScope !== 'all') continue;

        const chip = chipsWrap.createDiv({ cls: 'obsiman-cards-value-chip' });
        chip.createSpan({ cls: 'obsiman-cards-value-text', text: value });
        if (this.showCount) {
            chip.createSpan({ cls: 'obsiman-cards-value-count', text: String(count) });
        }

        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            this.plugin.filterService.addNode({
                type: 'rule',
                filterType: 'specific_value',
                property: propName,
                values: [value],
            });
        });

        chip.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showValueContextMenu(e, propName, value);
        });
    }
}
```

- [ ] **8.3 — Reset drilldown on view change**

In `setViewOptions()`, add before `this.renderTree()`:
```typescript
if (opts.format !== 'cards') {
    this.cardsDrilldownProp = null;
}
```

- [ ] **8.4 — Add CSS for cards view**

In `styles.css`:
```css
/* === PropertyExplorer — Cards view === */
.obsiman-explorer-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.obsiman-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  padding: 4px;
}

.obsiman-prop-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: background 0.12s;
}

.obsiman-prop-card:hover {
  background: var(--background-modifier-hover);
}

.obsiman-prop-card-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.obsiman-prop-card-icon svg {
  width: 22px;
  height: 22px;
}

.obsiman-prop-card-type-icon {
  width: 14px;
  height: 14px;
  color: var(--text-faint);
}

.obsiman-prop-card-name {
  font-size: var(--font-ui-smaller);
  font-weight: 500;
  color: var(--text-normal);
  word-break: break-word;
  line-height: 1.2;
}

.obsiman-prop-card-stats {
  font-size: 0.7em;
  color: var(--text-faint);
}

/* Cards drilldown */
.obsiman-cards-drilldown-topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 8px;
  border-bottom: 1px solid var(--background-modifier-border);
  margin-bottom: 8px;
}

.obsiman-cards-back {
  flex-shrink: 0;
  color: var(--text-muted);
}

.obsiman-cards-drilldown-prop-icon {
  width: 20px;
  height: 20px;
  color: var(--color-accent);
  display: flex;
  align-items: center;
}

.obsiman-cards-drilldown-app-icon {
  width: 18px;
  height: 18px;
  color: var(--text-faint);
  display: flex;
  align-items: center;
}

.obsiman-cards-drilldown-title {
  font-weight: 600;
  font-size: var(--font-ui-small);
  flex: 1;
}

.obsiman-cards-drilldown-stats {
  font-size: var(--font-ui-smaller);
  color: var(--text-faint);
  flex-shrink: 0;
}

.obsiman-cards-drilldown-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px;
}

.obsiman-cards-value-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: var(--font-ui-smaller);
  transition: background 0.12s;
}

.obsiman-cards-value-chip:hover {
  background: var(--background-modifier-hover);
}

.obsiman-cards-value-text {
  color: var(--text-normal);
}

.obsiman-cards-value-count {
  color: var(--text-faint);
  font-size: 0.85em;
}
```

- [ ] **8.5 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **8.6 — Reload and test Group 3**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

Verify:
- Filters page → View tab → select Grid → property table renders
- Filters page → View tab → select Cards → card grid renders
- Click a card → drill-down shows values as chips
- Click ← back → returns to card grid
- Toggle "Property name" OFF → names disappear from tree/grid/cards
- Toggle "Type icon" ON → type icon appears next to prop names
- Tags-only mode → click a leaf tag → filter added, stats update
- Tags-only mode → right-click a tag → menu shows "Rename tag", "Merge with…" (both show Notice)
- Value with 0 occurrences in filtered scope is hidden

- [ ] **8.7 — Commit Group 3**

```bash
git add src/components/PropertyExplorerComponent.ts src/types/filter.ts src/utils/filter-evaluator.ts src/i18n/en.ts src/i18n/es.ts src/views/ObsiManView.svelte styles.css
git commit -m "feat(explorer): grid/cards views, tags click+ctx, 0-count hiding, view toggles, has_tag filter type"
```

---

## Task 9: CSS + Micro-fixes — Tab bar, clear button, Group 4

**Files:**
- Modify: `styles.css`
- Modify: `src/views/ObsiManView.svelte`

### Steps

- [ ] **9.1 — Add icons to Ops tab bar**

In `ObsiManView.svelte`, update the `opsTabs` array:
```typescript
const opsTabs: Array<{ id: OpsTab; label: string; icon: string }> = [
    { id: 'fileops', label: t('ops.tab.fileops'), icon: 'lucide-file-cog' },
    { id: 'linter', label: t('ops.tab.linter_short'), icon: 'lucide-check-circle' },
    { id: 'template', label: t('ops.tab.template_short'), icon: 'lucide-layout-template' },
    { id: 'content', label: t('ops.tab.content_short'), icon: 'lucide-search' },
];
```

Update the Ops tab bar template to render icon + label:
```svelte
<div class="obsiman-subtab-bar">
    {#each opsTabs as tab}
        <div
            class="obsiman-subtab"
            class:is-active={opsTab === tab.id}
            data-tab={tab.id}
            onclick={() => { opsTab = tab.id; }}
            role="tab"
            tabindex="0"
        >
            <span class="obsiman-subtab-icon" use:icon={tab.icon}></span>
            <span>{tab.label}</span>
        </div>
    {/each}
</div>
```

- [ ] **9.2 — Unify tab bar CSS (Filters adopts Ops style)**

In `styles.css`, update `.obsiman-filters-tabbar` and `.obsiman-filters-tab` to share CSS class `.obsiman-subtab-bar` and `.obsiman-subtab`:

Replace the Filters tab bar in the template to use Ops classes:
```svelte
<div class="obsiman-subtab-bar obsiman-filters-tabbar">
    {#each filtersTabItems as tab}
        <div
            class="obsiman-subtab"
            class:is-active={filtersActiveTab === tab.id}
            onclick={(e) => toggleFiltersTab(tab.id, e)}
            role="tab"
            tabindex="0"
        >
            <span class="obsiman-subtab-icon" use:icon={tab.icon}></span>
            <span class="obsiman-subtab-label">{t(tab.labelKey)}</span>
        </div>
    {/each}
    <!-- view panel stays below -->
```

Add to `styles.css`:
```css
.obsiman-subtab-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.obsiman-subtab-icon svg {
  width: 14px;
  height: 14px;
}

.obsiman-subtab {
  /* update existing rule to use flex + icon */
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  cursor: pointer;
  font-size: var(--font-ui-smaller);
  /* ... rest unchanged */
}
```

Also update the `@container` rule so Filters tab labels hide at narrow width:
```css
@container (max-width: 220px) {
  .obsiman-subtab-label { display: none; }
  .obsiman-filters-tab-label { display: none; } /* keep for compat */
}
```

- [ ] **9.3 — Fix clear button position inside input**

The current `.obsiman-explorer-search-clear` is a flex sibling of the input. Fix by wrapping input in a relative container.

In `PropertyExplorerComponent.ts`, in `render()`, replace the search row creation:

```typescript
// Search row with clear button INSIDE the input wrapper
const searchRow = this.searchWrapper.createDiv({ cls: 'obsiman-explorer-search-row' });

const inputWrap = searchRow.createDiv({ cls: 'obsiman-explorer-search-input-wrap' });

this.searchEl = inputWrap.createEl('input', {
    cls: 'obsiman-explorer-search-input',
    attr: {
        type: 'text',
        placeholder: this.searchMode === 'properties'
            ? t('explorer.search')
            : (t('explorer.search_values') ?? 'Search values…'),
    },
});
this.searchEl.value = this.searchTerm;

// Clear button — positioned inside input-wrap via CSS
const clearBtn = inputWrap.createDiv({
    cls: 'obsiman-explorer-search-clear clickable-icon',
    attr: { 'aria-label': t('filters.search.clear') ?? 'Clear search' },
});
```

(Remove `clearBtn` from `searchRow` — it's now inside `inputWrap`)

In `styles.css`, replace the existing clear button rules:
```css
.obsiman-explorer-search-input-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.obsiman-explorer-search-input-wrap .obsiman-explorer-search-input {
  width: 100%;
  padding-right: 28px; /* room for clear btn */
}

.obsiman-explorer-search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  flex-shrink: 0;
  color: var(--text-muted);
}

.obsiman-explorer-search-clear.is-hidden {
  display: none;
}
```

Remove the old `.obsiman-explorer-search-row .obsiman-explorer-search-input { flex: 1; }` rule (no longer needed — `inputWrap` handles flex).

- [ ] **9.4 — Build and verify**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **9.5 — Reload and test Group 4**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

Verify:
- Ops tab bar: each tab shows icon to the left of the label
- Filters tab bar: same icon-left-of-label style, same visual weight as Ops
- ✕ clear button appears inside the search input, right-aligned
- No visual regressions on other UI elements

- [ ] **9.6 — Commit Group 4**

```bash
git add src/components/PropertyExplorerComponent.ts src/views/ObsiManView.svelte styles.css
git commit -m "fix(ui): tab bar icon+label style, clear button inside input"
```

---

## Task 10: Bump version, update Known Issues and HANDOFF.md

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `data.json` (if version tracked there)
- Modify: `docs/Known Issues.md`
- Modify: `docs/HANDOFF.md`

### Steps

- [ ] **10.1 — Bump version to 1.0.0-beta.7**

In `manifest.json`, change:
```json
"version": "1.0.0-beta.6"
```
to:
```json
"version": "1.0.0-beta.7"
```

In `package.json`, change `"version"` field similarly.

- [ ] **10.2 — Mark beta.6 bugs as fixed in Known Issues.md**

For each bug addressed in this iteration, change `- [ ]` to `- [x]` and append `→ Fixed in 1.0.0-beta.7`.

Add a new `## v1.0.0-beta.7` section documenting:
- Queue island (new)
- Grid/Cards view modes (new)
- Any new bugs discovered during testing

- [ ] **10.3 — Update HANDOFF.md**

Update `## Last updated` block with today's date, completed work summary, and new pending items.

Add the following to Pending iterations in HANDOFF.md:
```markdown
### Iteración UX onboarding — tooltips, scope warnings, beta tester guidance
- Info bubbles on scope-sensitive operations (rename, replace)
- Warning when operation targets full vault with no filters
- Target: when beta testers / user study participants join

### Iteración Tags — full rename/merge/drag-drop
- Implement has_tag filter type logic (stubbed in Iter.8)
- Tag rename: update all files referencing the tag
- Tag merge: replace tag A with tag B across vault
- D&D subcategories within categories in tags view
```

- [ ] **10.4 — Final build and full reload test**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

- [ ] **10.5 — Commit and wrap up**

```bash
git add manifest.json package.json docs/Known\ Issues.md docs/HANDOFF.md
git commit -m "chore: bump to 1.0.0-beta.7 (Iter.8 — bug fixes + feature completions)"
```

---

## Self-review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| Rename value scope fix | Task 1 |
| Queue island (slide-up, squircle btns, header, grow to 70vh) | Task 2 |
| FilterService.setSearchFilter | Task 3 |
| file_folder filter type | Task 3 |
| Search fields → FilterService | Task 4.1 |
| Filters badge shows filterRuleCount | Task 4.2 |
| Files badge shows selectedCount | Task 4.3 |
| Drag reorder duplicate fix | Task 4.4 |
| Search tab one-click toggle | Task 4.5 |
| Remove ObsiMan header | Task 4.6 |
| showPropIcon + showPropName toggles | Task 5 |
| showTypeIcon default false | Task 5 |
| 0-count values hidden when scope filtered | Task 5.4 |
| Tags left click = addRule | Task 6.1 |
| Tags right click = context menu (stubbed) | Task 6.2 |
| has_tag filter type | Task 6.1 |
| Grid view mode | Task 7 |
| Cards view mode + drill-down | Task 8 |
| Cards drill-down topbar (← · prop icon · app icon · name · stats) | Task 8.2 |
| Tab bar icons left of label (Ops + Filters unified) | Task 9.1–9.2 |
| Clear button inside input | Task 9.3 |
| Roadmap additions | Task 10.3 |

All spec requirements are covered. ✅

### Placeholder scan

- Task 6.1: `has_tag` case in filter-evaluator uses `getAllTags` — confirm Obsidian import is available (it is, `getAllTags` is exported from `'obsidian'`).
- Task 8.2: App icon uses `'lucide-box'` as placeholder — this is acceptable for now; the actual ObsiMan icon can be substituted in the polish iteration.
- Task 2.4 step (f): `queueIslandEl` must be bound before `openQueueIsland()` is called. Ensure `bind:this={queueIslandEl}` is on the container div before any FAB actions fire.

### Type consistency

- `setViewOptions` signature change: `showType: boolean` → `showTypeIcon: boolean`, `showValues` removed, `showPropIcon` + `showPropName` added. Verify all call sites in `ObsiManView.svelte` use the updated parameter names.
- `QueueIslandComponent.render()` references `this.queueService.queue` — confirm queue is a public readonly field (it is: `readonly queue: PendingChange[]`).
- `has_tag` added to `FilterType` — confirm no TypeScript exhaustiveness check on `FilterType` will fail (the `matchesFile` switch has no `default` branch; add a default return `false` or ensure TypeScript doesn't enforce exhaustiveness).

Add to `filter-evaluator.ts` after the last case:
```typescript
default:
    return false;
```
