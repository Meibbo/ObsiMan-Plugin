# Iter.8 — Bug Fixes completos beta.6 + Feature completions

**Date:** 2026-04-09  
**Branch:** `add-functions`  
**Version target:** `1.0.0-beta.7`

---

## Scope

Fix all confirmed beta.6 bugs plus complete several partially-stubbed features surfaced during testing. Grouped by code area to minimize cross-cutting changes and enable atomic commits per group.

---

## Group 1 — `OperationQueueService` + Queue Island

### 1a. Rename value scope fix

**Bug:** Rename-value operation queues every file in the vault instead of only files containing the target property+value.

**Fix:** When building the file list for a rename-value operation, compute the scope as:

```
scope = intersect(
  PropertyIndexService.getFilesWithValue(prop, val),  // files with that exact prop+value
  FilterService.filteredFiles                          // currently filtered set (= full vault if no filters)
)
```

- If no filters active → `filteredFiles` is the full vault → result equals `getFilesWithValue(prop, val)`
- If filters active → only files in the filtered set that also have that prop+value are processed
- This is consistent with how users expect scope to work: filters narrow the target set

### 1b. Queue Island (replaces native Obsidian popup)

**Bug:** Clicking the Ops FAB opens a native Obsidian popup instead of an in-frame floating island.

**New component:** `QueueIslandComponent` — mounted directly in `ObsiManView.svelte`, rendered conditionally when `queueItems.length > 0`.

**Layout (bottom → top):**
- Floats above the bottom bar (same stacking as Active Filters popup)
- Slide-up animation: `cubic-bezier(0.34, 1.56, 0.64, 1)` (same as Active Filters)

**Structure:**
1. **Header** (visually distinct, removable without touching the rest): `"N cambios pendientes"` count label
2. **Squircle buttons row:** Execute ▶ · Clear ✕ · Details ☰
3. **Item list:** each row = filename + operation type

**Height behavior:**
- Minimum: shows 3–4 items
- Grows with content up to `min(content-height, 70vh)`
- If frame is too small for 70vh to be useful, island stays at minimum height
- Beyond max height: items scroll inside the island (overflow-y: auto on list container)
- The squircle buttons and header never scroll — only the list does

**Trigger:** Ops FAB (same as before) toggles island open/close. Island auto-closes after Execute completes.

---

## Group 2 — `FilterService` + Navbar + Drag reorder

### 2a. File/folder search → FilterService integration

**Bug:** Name and folder fields in the Files page search FAB filter only `FileListComponent` locally; they don't feed into `FilterService`, so other pages and the stats bar don't reflect them.

**Fix:**
- Add `FilterService.setSearchFilter(name: string, folder: string)` method
- This method updates two internal rule types: `file_name` (matches filename only) and `file_folder` (matches path only) — strictly separated, no cross-matching
- `filteredFiles` recomputes to include these rules
- All consumers (Filters badge, stats bar, Ops scope, Active Filters popup) now see the correct scope

### 2b. Filters badge in pill navbar

**Bug:** Filters icon badge never shows even when filters are active.

**Fix:** Wire the Filters badge to the same reactive `filterRuleCount` property used by the Active Filters FAB. Badge shows count when `> 0`, hidden otherwise.

### 2c. Files badge in pill navbar

**New:** Files icon gets a badge showing `selectedCount` (number of selected files).  
- Visible only when `selectedCount > 0`
- Hidden otherwise
- Same badge styling as Ops and Filters badges

### 2d. Drag reorder — DOM duplicates bug

**Bug:** Moving a page in the navbar causes its component to appear in both old and new positions. Closing and reopening the view fixes positions correctly.

**Root cause:** Svelte reuses DOM nodes when array items change position without explicit keying.

**Fix:** Ensure the `{#each}` block that renders pages uses a keyed iteration — `{#each pageOrder as page (page)}`. If already keyed, wrap the page container in `{#key pageOrder.join(',')}` to force a full remount on reorder. Verify that each page's component is properly destroyed on unmount.

---

## Group 3 — `PropertyExplorerComponent`

### 3a. View modes: Grid + Cards (new implementations)

Current default view is **Tree** (hierarchical list). Two new modes are added:

**Grid view:**
- Matrix layout, Excel-style
- Properties as rows, values in adjacent cells
- Lightweight table styling using Obsidian CSS variables

**Cards view:**
- Grid of cards per property
- Each card: large centered property icon + name below + stats (occurrence count, type)
- View options toggles apply to card content (see 3d)
- **Clic → drill-down in-place** (replaces the card grid inside the component, no modal):
  - Topbar: `←` back button (far left) → returns to card grid on click; property type icon (large) + app icon (large) to its right; property name as heading; stats at far right
  - Body: property values as rounded-rectangle chips, ordered by active Sort, flowing left→right, top→bottom

### 3b. Tags-only view behavior

Tags view works identically to the prop explorer tree, with these specifics:
- **Left click on tag** → `FilterService.addRule({ type: 'has_tag', value: tag })` (same as prop click adds a has_property rule)
- **Right click on tag** → context menu with: Rename, Merge with… (UI only this iteration — options render but trigger a `Notice("Coming soon")`. Full rename/merge logic delegated to the tags iteration.)
- No drill-down on click (tags don't have a values sub-level in the same sense as properties)

### 3c. Properties/values with 0 occurrences under active filters

When a filter is active, any property whose occurrence count in the filtered scope is 0 is **hidden entirely** from the view (tree, grid, and cards). Individual values with 0 occurrences within a visible property are also hidden.

### 3d. View options toggles

Four toggles controlling what appears in all view modes:
| Toggle | Default | What it controls |
|--------|---------|-----------------|
| Property icon | ON | Primary visual icon for the property — a decorative Lucide icon auto-assigned by ObsiMan per property (distinct from the data-type icon) |
| Property name | ON | The text label of the property |
| Occurrence count | ON | Number of files containing the property in the current scope |
| Type icon | **OFF** | Data-type indicator icon (e.g., `calendar` for date, `check-square` for checkbox, `hash` for number) — same as Obsidian's native type icon |

**Clarification — Property icon vs Type icon:**
- *Property icon*: a decorative/representative icon shown prominently in Cards view (large, centered). If no custom icon exists, use the type icon as fallback.
- *Type icon*: the small data-type indicator, shown inline next to the property name or in a corner. Independent toggle from the property icon.

Toggles apply to Tree, Grid, and Cards views uniformly.

### 3e. Property type icon rendering

**Bug:** Type icon toggle exists but icon never renders.

**Fix:** In `renderTree()` (and the new Grid/Cards render paths), when `showTypeIcon === true`, prepend the appropriate Lucide icon based on `property.type`:
- `text` → `type`
- `date` / `datetime` → `calendar`
- `checkbox` → `check-square`
- `number` → `hash`
- `list` (multitext/tags/aliases) → `list`
- Unknown → `circle-help`

---

## Group 4 — CSS + Micro-fixes

### 4a. Tab bar unification (Filters adopts Ops style)

**Bug:** Filters 4-tab toolbar shows icons without visible text labels, tabs not centered, style differs from Ops.

**Fix:**
- Ops tab bar is the reference style
- Filters tab bar adopts identical CSS (same classes or shared CSS rules)
- Both Ops and Filters tabs: icon on the **left**, text label to the right of the icon
- Ops tabs gain icons (reference icon set from `ObsiManExplorerView` toolbar)

### 4b. Search tab toggle (one click)

**Bug:** Search tab in Filters page requires multiple interactions to open/close the search bar.

**Fix:** First click → opens search bar + focuses input. Second click on the same tab → closes it. Standard toggle pattern on the tab click handler.

### 4c. ✕ clear button inside the input

**Bug:** Clear button renders to the right of the input container, outside it.

**Fix:** Position with `position: absolute; right: 8px; top: 50%; transform: translateY(-50%)` inside the input wrapper. Input gets `padding-right` to avoid text overlapping the button.

### 4d. Remove "ObsiMan" view header

**Bug:** `obsiman-view-header` element wastes vertical space on every page.

**Fix:** Remove the header element from `ObsiManView.svelte`. The plugin is self-evident in context.

---

## Roadmap additions (not in this iteration)

- **UX onboarding iteration**: tooltips on scope-sensitive operations, warnings when rename/replace targets the full vault, info bubbles for key concepts. Target: when beta testers / user study participants join.
- **Drag & drop in PropertyExplorerComponent**: move values between properties (prop explorer), move subcategories within categories (tags view).

---

## Commit strategy

One commit per group, in order:
1. `fix(queue): rename value scope + queue island component`
2. `fix(filters+nav): FilterService search integration, badges (filters/files), drag reorder fix`
3. `feat(explorer): grid/cards views, tags-only behavior, 0-count hiding, type icon, view toggles`
4. `fix(ui): tab bar unification, search toggle, clear button position, remove view header`

After all groups: bump to `1.0.0-beta.7`.
