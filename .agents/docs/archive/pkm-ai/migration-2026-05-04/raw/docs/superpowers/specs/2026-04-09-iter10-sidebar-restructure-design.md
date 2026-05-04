# Iter.10 — Sidebar Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the sidebar from 3 pages (ops/files/filters) to 3 pages (ops/statistics/filters), extract Filters tabs into isolated sub-components, introduce TagsExplorerComponent, and replace the black gradient bottom bar with a glassmorphism system.

**Architecture:** Approach C (SOLID, high modularity) — sub-components are extracted into `src/views/tabs/` and `src/views/pages/`. `ObsiManView.svelte` becomes a pure orchestrator. No service logic is rewritten — only DOM wiring changes.

**Tech Stack:** TypeScript + Svelte 5 (runes) + Obsidian Plugin API + esbuild

**Design reference:** `docs/ObsiMan - Wireframe.md` · `img/ObsiMan - Ui.png`

---

## Recommendation

Use **Approach C** (sub-component extraction) over the simpler in-place rewrite (Approach B). `ObsiManView.svelte` will grow significantly through Iter.11–14 (sort popups, view mode popups, D&D list, Tags tree). Extracting now prevents the file from becoming unmaintainable and makes each future iteration faster to implement and easier to debug. The upfront cost is one iteration — the payoff is every iteration after.

---

## File map

### New files
| File | Responsibility |
|------|---------------|
| `src/views/tabs/FiltersTagsTab.svelte` | Mounts TagsExplorerComponent, owns tags tab state |
| `src/views/tabs/FiltersPropsTab.svelte` | Mounts PropertyExplorerComponent, exposes `propExplorer` binding |
| `src/views/tabs/FiltersFilesTab.svelte` | Mounts FileListComponent |
| `src/views/pages/StatisticsPage.svelte` | Vault stat cards + scope pills + FABs |
| `src/components/TagsExplorerComponent.ts` | Dedicated tag tree renderer (independent of PropertyExplorerComponent) |

### Modified files
| File | What changes |
|------|-------------|
| `src/views/ObsiManView.svelte` | Removes inline tab blocks, mounts sub-components, updates pageOrder default |
| `src/types/settings.ts` | Adds `glassBlurIntensity: number` |
| `src/settings/ObsiManSettingsTab.ts` | Adds Appearance section with blur slider |
| `styles.css` | Adds `.obsiman-glass` system, removes black gradient |
| `AGENTS.md` | Updates section 7 pageOrder + FAB table |

### Untouched files
`src/components/PropertyExplorerComponent.ts`, `src/components/FileListComponent.ts`, all services, `main.ts`, `ObsiManView.ts`

---

## CSS glass system

### `.obsiman-glass` — surface (shared across all blur elements)
```css
.obsiman-glass {
  backdrop-filter: blur(var(--obsiman-glass-blur, 12px));
  -webkit-backdrop-filter: blur(var(--obsiman-glass-blur, 12px));
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 40%, transparent);
}
```

### Scope modifiers
```css
.obsiman-glass--bottom  { position: absolute; bottom: 0; left: 0; right: 0; }
.obsiman-glass--full    { position: absolute; inset: 0; z-index: 100; }
.obsiman-glass--content { position: absolute; inset: 0; z-index: 10; }
```

### CSS variable injection (in ObsiManView.ts onOpen / settings change)
```typescript
// maps 0–100 setting value to 0–20px blur
const px = (plugin.settings.glassBlurIntensity / 100) * 20;
containerEl.style.setProperty('--obsiman-glass-blur', `${px}px`);
```

### Default setting
`glassBlurIntensity: 60` → 12px blur (current visual baseline)

---

## StatisticsPage data sources

| Stat card | Source | Scope-aware |
|-----------|--------|-------------|
| Folders | `app.vault.getAllFolders().length` | No (always vault) |
| Files | `filteredFiles.length` / `selectedFiles.length` / `getMarkdownFiles().length` | Yes |
| Props | `plugin.propertyIndex.index.size` | No (index is vault-wide; scope filtering is a future enhancement) |
| Values | Sum of all `Set.size` in index | No (same) |
| Tags | `Object.keys(app.metadataCache.getTags() ?? {}).length` | No |
| Word count | **Not in Iter.10** — requires `vault.read()` per file | — |
| Total links | **Not in Iter.10** — requires metadataCache link traversal | — |

Scope pills use selection-pill style (accent active / faint inactive). Changing scope reactively updates Files count via `$derived`.

---

## FiltersTagsTab + TagsExplorerComponent

`TagsExplorerComponent` is a **new independent TypeScript class** (not a mode of PropertyExplorerComponent). It owns its own DOM, event listeners, and render logic.

**Responsibilities:**
- Render a tag tree from `app.metadataCache` using `getAllTags()`
- Support unlimited nesting (`parent/child/grandchild` → indented tree)
- Left-click on leaf tag → `filterService.addNode({ type: 'rule', filterType: 'has_tag', ... })`
- Highlight active-filter tags (`.is-active-filter`)
- No toggle-all (unlike Props tab)

**Props interface (FiltersTagsTab.svelte):**
```typescript
export let plugin: ObsiManPlugin;
export let filterScope: 'all' | 'filtered' | 'selected';
```

**TagsExplorerComponent constructor:**
```typescript
constructor(containerEl: HTMLElement, plugin: ObsiManPlugin)
render(): void
destroy(): void
```

---

## ObsiManView.svelte — structural changes

### State changes
```typescript
// REMOVE: filtersActiveTab with 'search' | 'scope' | 'sort' | 'view'
// ADD:
let filtersActiveTab = $state<'tags' | 'props' | 'files'>('props');

// REMOVE: pageOrder default ['ops', 'files', 'filters']
// ADD:
let pageOrder = $state(plugin.settings.pageOrder ?? ['ops', 'statistics', 'filters']);
```

### Filters page structure (new)
```svelte
<!-- Filters header — persistent, owns view/sort buttons -->
<div class="obsiman-filters-header">
  <button class="obsiman-filters-header-left">...</button>   <!-- view mode -->
  <button class="obsiman-filters-header-center">...</button> <!-- clear + category -->
  <button class="obsiman-filters-header-right">...</button>  <!-- sort -->
</div>

<!-- Tab dots -->
<div class="obsiman-tab-dots">
  {#each ['tags','props','files'] as tab}
    <span class:is-active={filtersActiveTab === tab}
          onclick={() => filtersActiveTab = tab}>{tab}</span>
  {/each}
</div>

<!-- Tab content -->
{#if filtersActiveTab === 'tags'}
  <FiltersTagsTab {plugin} {filterScope} />
{:else if filtersActiveTab === 'props'}
  <FiltersPropsTab {plugin} {filterScope} bind:propExplorer />
{:else if filtersActiveTab === 'files'}
  <FiltersFilesTab {plugin} />
{/if}
```

### Statistics page (new)
```svelte
{#if activePage === 'statistics'}
  <div class="obsiman-page">
    <StatisticsPage {plugin} />
  </div>
{/if}
```

### Bottom bar (CSS change only, no HTML change)
Add `obsiman-glass obsiman-glass--bottom` classes to the existing bottom bar element. Remove old `::before` gradient rule.

---

## Settings — new Appearance section

Location in `ObsiManSettingsTab.ts`: new section after Language, before Bases Integration.

```typescript
new Setting(containerEl)
  .setHeading()
  .setName('Appearance');

new Setting(containerEl)
  .setName('Background blur intensity')
  .setDesc('Controls the glassmorphism blur on the bottom bar and popups. 0 = no blur, 100 = maximum.')
  .addSlider(slider => slider
    .setLimits(0, 100, 1)
    .setValue(this.plugin.settings.glassBlurIntensity ?? 60)
    .setDynamicTooltip()
    .onChange(async (value) => {
      this.plugin.settings.glassBlurIntensity = value;
      await this.plugin.saveSettings();
      // update CSS var on live view
      this.plugin.updateGlassBlur();
    }));
```

`updateGlassBlur()` is a new method on the plugin class that finds the open ObsiManView and sets `--obsiman-glass-blur`.

---

## DEFAULT_SETTINGS update

```typescript
export const DEFAULT_SETTINGS: ObsiManSettings = {
  // ... existing ...
  pageOrder: ['ops', 'statistics', 'filters'],  // was ['ops', 'files', 'filters']
  glassBlurIntensity: 60,                        // new
};
```

---

## What this iteration does NOT include

- Sort popup (Level 4 — Iter.12)
- View mode popup (Level 4 — Iter.12)
- Files Grid view redesign to Bases-style (Iter.12)
- D&D list view + Linter buttons (Iter.13)
- Word count / Total links in Statistics (Iter.15)
- Operations tabs extraction to sub-components (Iter.14)
- Right-click context menus (Iter.13)
- Masonry view (Iter.13)
