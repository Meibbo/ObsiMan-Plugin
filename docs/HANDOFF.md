# HANDOFF.md — ObsiMan Session State

> **This file is the live project state.** Every AI agent updates it at the end of their session.
> The next agent reads it FIRST (after AGENTS.md) to pick up exactly where work stopped.

---

## Documented behaviors (for future agents)

### Queue execution model
- **Queue auto-clears** after `execute()` completes — regardless of Obsidian's indexing state. This is intentional: the plugin's job (renaming files via `fileManager.renameFile`) is done; Obsidian's background indexing is independent.
- **Execution is chunked**: processes 20 files per tick, yielding to the UI thread via `setTimeout(0)` between chunks. This keeps the app responsive during large batches.
- **Live progress Notice**: a persistent `Notice` updates in real-time (`"Applying changes… X / N"`) and hides when done.
- **Batch queueing**: always use `queueService.addBatch([])` when queuing multiple files at once. `add()` fires a UI re-render event per call — 1000 `add()` calls = 1000 re-renders = UI freeze. `addBatch()` fires exactly one event.

### Obsidian indexing behavior (confirmed via docs + forum)
- `fileManager.renameFile()` moves files instantly at the filesystem level.
- Obsidian's `metadataCache` indexes each renamed file **individually**, firing a `'rename'` event per file (not batched). This is single-threaded by design.
- The vault panel (folder file counts) updates incrementally as each file is re-indexed — this is normal Obsidian behavior, not a plugin bug.
- There is no native Obsidian API to batch or accelerate this indexing; all plugins face this limitation.

---

## Last updated
- **Date**: 2026-04-07
- **Agent**: Claude Code (claude-sonnet-4-6)
- **Branch**: `add-functions`
- **Version**: `1.0.0-beta.4`
- **Build status**: ✅ `npm run build` passes, 0 errors, 1 pre-existing Svelte warning

---

## What was completed this session (2026-04-07, session 6)

### Plugin philosophy + agent workflow ✅
- AGENTS.md section 1 rewritten with "Augment, don't replace" philosophy table
- AGENTS.md checklist step 8 added: search online before assuming any API exists
- AGENTS.md section 11 added: full integration API surface (verified 2026-04-07) for global-search, bases, properties, tags, Linter, Tag Wrangler, MultiProperties, plus research links
- HANDOFF.md pending iterations rewritten with plugin augmentation roadmap (Iters.7–14)

### Iter.6 — Find & Replace in Content tab ✅
- `src/types/operation.ts`: added `FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT'` signal
- `src/services/OperationQueueService.ts`: handles `FIND_REPLACE_CONTENT` — reads raw file content via `vault.read()`, applies regex, writes back via `vault.modify()` only if content changed
- `src/i18n/en.ts`: added 12 `content.*` keys
- `styles.css`: added `.obsiman-content-*` and `.obsiman-icon-toggle` CSS classes
- `src/views/ObsiManView.svelte`: Content tab fully implemented:
  - Find input + `Aa` (case) + `.*` (regex) toggle buttons on one row
  - Replace input below
  - Scope hint derived from `selectedCount`/`filteredCount`
  - "Preview" button scans target files async, shows count + collapsible snippet list
  - "Queue replace" button adds one `PendingChange` for all target files
  - Invalid regex shows inline error
  - Preview resets automatically when search params change

### Design + specs ✅
- `docs/superpowers/specs/2026-04-07-find-replace-content-design.md` — approved design doc
- `docs/superpowers/plans/2026-04-07-find-replace-content.md` — implementation plan

⚠️ **Not yet tested in Obsidian** — need manual verification (Task 6 of the plan)

---

## What was completed this session (2026-04-07, session 5)

### obsidian-cli setup ✅
- `Obsidian.com` (not `Obsidian.exe`) is the correct Windows CLI redirector
- Wrapper at `/c/Users/vic_A/bin/obsidian` → `obsidian.bat` → `Obsidian.com`
- Full dev cycle: `npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'`

### Navbar click navigation fix ✅ (was broken after Iter.3 pointer reorder refactor)
- Root cause: `pillEl.setPointerCapture()` on `pointerdown` redirected all pointer events (including `click`) to the pill, so nav icon `onclick` never fired
- Fix: pointer capture now set only inside the 2s long-press timer callback, not on initial `pointerdown`

### Blank pages 2 & 3 fix ✅ (major layout bug discovered via drag-page)
- Root cause: `overflow: hidden` was on the same element as `translateX`. CSS clips in local space, so pages 2/3 were always clipped away regardless of slide position
- Fix: added `.obsiman-pages-viewport` wrapper with `overflow: hidden`; `.obsiman-page-container` no longer has overflow hidden, just slides freely inside the viewport

### Move to folder — Iter.5 ✅
- `MOVE_FILE` signal in `operation.ts`
- `OperationQueueService.applyChange` handles `MOVE_FILE` via `fileManager.renameFile`
- `FolderSuggest` added to `autocomplete.ts` (uses `app.vault.getAllFolders()`)
- Move popup is **in-frame slide-up** (not Obsidian modal) — follows wireframe UX philosophy
- `addBatch()` added to `OperationQueueService` — avoids 1000 UI re-renders when queuing many files
- `execute()` now chunked (20 files/tick, `setTimeout(0)` yield) + live progress Notice

### Bottom bar float + blur — Iter.5.5 ✅
- `.obsiman-bottom-nav` is now `position: absolute; bottom: 0` inside `.obsiman-pages-viewport`
- No longer pushes content up — floats over it at all frame sizes
- `::before` gradient (transparent → `--background-primary`, 48px tall) fades content into nav, signals scrollability
- Pages get `padding-bottom: 80px` so content scrolls fully clear of the nav

### Bug fixes ✅
- `addClass('class1 class2')` → `addClasses(['class1', 'class2'])` in all 4 modals (FileRenameModal, FileMoveModal, LinterModal, QueueDetailsModal)

---

## What was completed this session (2026-04-07, session 3+4)

### Main View — Iter.4 ✅
- `src/components/PropertyGridComponent.ts` — recovered from git commit `c30ea02` (831 lines; virtual-scroll spreadsheet grid with inline editing)
- `src/views/ObsiManMainView.ts` — new thin shell, mounts `ObsiManMainView.svelte`
- `src/views/ObsiManMainView.svelte` — new 3-section layout:
  - **Top**: Filters section (collapsible — chevron toggle, Add/Clear/Save template buttons, FilterTreeComponent)
  - **Center**: Files grid (PropertyGridComponent, fills remaining space, flex: 1)
  - **Bottom**: Operations section (collapsible — OperationsPanelComponent)
- `main.ts`: registered `OBSIMAN_MAIN_VIEW_TYPE`, added `activateMainView()`, added `open-main-view` command
- `src/types/settings.ts`: added optional `gridRenderMode`, `gridEditableColumns`, `gridLivePreviewColumns`, `gridRenderChunkSize`, `gridColumns` fields (PropertyGridComponent references these)
- `styles.css`: added `obsiman-main-layout` + section CSS at end of file

⚠️ **Pill navbar is broken** (user chose to ignore for now — continue roadmap)
⚠️ **Not yet tested** in Obsidian

---

## What was completed this session (2026-04-07, session 3)

### Fix ribbon ✅
- `main.ts`: Ribbon icon now calls `activateSidebarView()` instead of `runAttachCommand()`
- Label changed from "Attach ObsiMan to .base file" → "Open ObsiMan"
- The "attach to bases" workflow is still accessible via the `attach-to-bases` command

### CSS layout fix — blank pages ✅
- `styles.css`: Removed redundant second `.obsiman-view { position: relative; overflow: hidden }` block
- `styles.css`: Removed `height: 100%` from main `.obsiman-view` rule — this caused a flex sizing feedback loop in Obsidian's `.view-content` context; layout now relies purely on Obsidian's `flex: 1` + our `display: flex; flex-direction: column`
- `styles.css`: Removed old `.obsiman-view { overflow-y: auto; padding: 0 }` rule replaced by comment

### Drag-and-drop reorder fix ✅
- `ObsiManView.svelte`: Replaced HTML5 DnD (`draggable`, `ondragstart`, `ondrop`) with pointer events only
- Root cause: Obsidian workspace intercepts HTML5 drag events and creates tab groups
- New approach: `onpointerdown` on icon → long press timer → reorder mode → `onpointermove` on pill uses `elementFromPoint` → `onpointerup` commits the swap
- Uses `pillEl.setPointerCapture()` so move events fire even outside individual icons
- Visual feedback: `.is-reorder-target` CSS class highlights the drop target icon

### Scope tab in Filters page — Iter.3 ✅
- `ObsiManView.svelte`: Filters page now has a sub-tab bar with "Rules" | "Scope" tabs
- Rules tab: existing filter tree + Add/Clear/Save template buttons
- Scope tab: inline scope selector (All vault / Filtered files / Selected files) — same logic as old scope popup but now embedded in the Filters page
- `en.ts`: Added `filter.tab.rules`, `filter.tab.scope`, `scope.desc` keys
- `styles.css`: Added `.obsiman-scope-desc` rule; replaced `.obsiman-nav-icon:active` grab cursor with `.is-reorder-target` highlight

---

## ⚠️ Needs testing in Obsidian (session 3)

1. Ribbon icon → opens sidebar (not bases picker)
2. Filters page: click "Filters" nav icon → see "Rules" and "Scope" tabs
3. Filters → Scope tab → 3 options visible, clicking saves scope
4. Long-press 2s nav icon → pill outline → move pointer to another icon → icon highlights → release → pages reorder
5. Ops page: subtab bar + content visible (not blank)
6. Files page: file list renders (count + search + rows)

**File list still may be empty** if `FilterService.filteredFiles` is empty at mount (timing issue with metadataCache). If files show "0 filtered" but vault has files, check if `metadataCache.on('resolved')` fires after component mount.

---

## Previous session work (2026-04-06, session 2)

### Fix empty Files/Filters pages ✅
- `ObsiManView.svelte`: Added `refreshFilterTree()` call in `onMount` (was missing — filter tree never rendered)
- `ObsiManView.svelte`: Added `metadataCache.on('resolved', refreshFiles)` listener (files re-render after vault indexes)
- `ObsiManView.svelte`: Fixed `resolvedPageOrder()` fallback from `['files','filters','ops']` → `['ops','files','filters']`
- `styles.css`: Removed `max-height: 200px` from old `.obsiman-filter-tree` rule (was clipping the tree)

### Remove "open main view" UX ✅
- `ObsiManView.svelte`: Removed expand button from header, removed `openMainView()` function, removed `OBSIMAN_EXPLORER_VIEW_TYPE` import
- `main.ts`: Removed `open-main-view` command, removed `activateMainView()` method, simplified `activateSidebarView()` to always use sidebar
- `settings/ObsiManSettingsTab.ts`: `openMode` setting still exists (sidebar/main/both) but now all modes open the sidebar

### Long-press page reorder on navbar pill ✅
- `ObsiManView.svelte`: `pageOrder` is now `$state` (reactive), added long-press (2s) + drag-and-drop reorder handlers on nav icons
- `ObsiManView.svelte`: In reorder mode: pill gets `is-reordering` class, icons become `draggable`, badges hidden, clicking disabled
- On drop: `pageOrder` updates live, saved to `plugin.settings.pageOrder`
- `settings/ObsiManSettingsTab.ts`: Removed pageOrder Setting block and `buildPageOrderList()` method + unused `setIcon` import
- `styles.css`: Added reorder mode styles (accent outline on pill, grab cursor on icons)

---

## Previous session work (2026-04-06, session 1)

### Svelte 5 infrastructure ✅
- Installed `svelte@5.55.1` + `esbuild-svelte@0.9.4`
- `esbuild.config.mjs` updated with Svelte plugin (`css: "injected"`, a11y/non_reactive_update warnings suppressed)
- `src/svelte.d.ts` created (TypeScript module declaration for `.svelte` imports)

### ObsiManView migrated to Svelte 5 ✅
**`src/views/ObsiManView.ts`** — 40-line shell: `onOpen()` mounts `ObsiManView.svelte`, `onClose()` unmounts it.

**`src/views/ObsiManView.svelte`** ← NEW main component:
- 3-page horizontal slide navigation (Ops | Files | Filters — default order)
- CSS variable `--page-index` drives `translateX`
- `transitionend` guard: checks `propertyName === 'transform'`
- Per-page dynamic FABs (see spec below)
- View mode popup, Search popup, Active Filters popup, Scope popup (all as in-view overlays)
- All Ops sub-tabs always in DOM (prevents QueueListComponent losing container)
- `min-height: 0` on page container and pages (fixes Ops/Filters empty bug)

### Nav bar redesign (Stitch-inspired) ✅
- FABs: filled with `--interactive-accent` color
- Nav icons: Lucide icon per page (files/filter/settings-2)
- Active icon: glow via `color-mix`
- Frosted glass pill container (`backdrop-filter: blur`)
- All colors use Obsidian CSS variables (no hardcoded hex)

### Per-page FABs (from wireframe spec) ✅
- **Files** (center, always): Left = View mode popup | Right = Search popup
- **Ops** (leftmost by default): Left FAB = Open Queue (→ QueueDetailsModal)
- **Filters** (rightmost by default): Right FAB = Active Filters popup
- FAB side = outer edge: index 0 → LEFT, last index → RIGHT
- Placeholder div maintains symmetric layout when FAB is absent
- Active filters button **removed** from Files topbar (now only on Filters FAB)
- Scope button **removed** from Ops FileOps tab (scope becomes Filters tab — not yet built)

### Page order corrected ✅
- Default `pageOrder` changed from `['files','filters','ops']` → `['ops','files','filters']`
- Matches wireframe: Ops left | Files center | Filters right

### Wireframe documented ✅
- Image saved at `img/ObsiMan - Ui.png`
- Full UI spec written into `AGENTS.md` section 7

---

## Plugin philosophy — "Augment, don't replace"

ObsiMan augments Obsidian's native ecosystem (Search, Bases, Properties, Tags) and community plugins (Linter, Tag Wrangler, etc.) — it does not replace them. Every feature should ask: *"What does the existing plugin do well, and what is it missing?"*

**Agent rule**: Before implementing any integration, search online for the target plugin's API docs and GitHub. Never assume an API exists. See AGENTS.md section 11 for known API surfaces.

---

## Pending iterations (priority order)

### ~~Iteración 3 — Scope tab inside Filters page~~ ✅ Done
### ~~Iteración 4 — Main View complete (3-section layout)~~ ✅ Done
### ~~Iteración 5 — Move to folder + batch queue + progress~~ ✅ Done
### ~~Iteración 5.5 — Bottom bar float + blur + responsive animations~~ ✅ Done

### ~~Iteración 6 — Find & Replace (Content tab)~~ ✅ Done
- Full raw file content search (including frontmatter) via `vault.read()` + native `RegExp`
- UI: compact row (Find + `Aa` + `.*`), Replace input, scope hint, Preview + Queue buttons
- Preview: count + collapsible per-file snippet list; auto-resets on input change
- `FIND_REPLACE_CONTENT` signal constant follows `MOVE_FILE` pattern
- Note: Obsidian's global-search plugin has no data API — `vault.read()` scan is the correct approach
- ⚠️ **Needs testing in Obsidian**

### Iteración 7 — Search plugin augmentation (full)
ObsiMan as a Replace companion to Obsidian Search:
- "Send to ObsiMan" button in Search results (or command)
- Use Search results as target scope for operations
- Research: `app.internalPlugins.plugins['global-search']` API surface

### Iteración 8 — Bases augmentation
Bulk property ops on Bases views:
- Research Bases plugin API before implementing
- Already partially done (checkbox injection) — extend with queue integration

### Iteración 9 — Tag operations (augments Tags core + Tag Wrangler)
- Bulk rename tags scoped to filtered/selected files
- Research Tag Wrangler API (`app.plugins.plugins['tag-wrangler']`)

### Iteración 10 — Linter integration (augments Obsidian Linter)
- Batch linting via ObsiMan queue
- Research: `app.plugins.plugins['obsidian-linter'].lintFile()` or similar

### Iteración 11 — Template tab (Templater integration)
### Iteración 12 — Visual polish (plugin icon, status bar, chevron icons)
### Iteración 13 — Data imports (HabitKit, Dailyo, LaunchBox, Contacts)
### Iteración 14 — Theme selector

### Iteración 5 — Operations: logic for existing stubs (partially done)
- Pattern-based rename `{{title}}`, `{{date}}`, `{{counter}}` — UI exists, substitution not working
- File diff view — skeleton, no rendering

---

## Known placeholders (not bugs)
- File diff view modal — skeleton, no rendering
- Move to folder — UI exists, logic not implemented
- Pattern-based rename — UI exists, substitution not working
- Linter tab — visible but not functional
- Templates tab — stubbed
- Content tab — stubbed
- Scope tab inside Filters — not yet built (scope popup still exists in code but has no trigger button)

---

## Context budget notes
- **Claude Code (Sonnet 4.6)**: ~200K context window. START NEXT SESSION IN A NEW CONVERSATION.
- **Rule**: If context < 20%, update this file and switch agents BEFORE starting a new iteration.

---

## How to start the next session

```
Read AGENTS.md and docs/HANDOFF.md in the ObsiMan plugin folder.
Then ask: "Svelte migration + nav redesign is done. Have you tested the new sidebar?
Any issues before we start Iter.3 (Scope tab inside Filters)?"
Then proceed based on confirmation.
```

---

## File structure snapshot (2026-04-06)

```
obsiman/
├── AGENTS.md               ← updated: UI spec section added (section 7)
├── CLAUDE.md
├── esbuild.config.mjs      ← Svelte plugin added
├── main.ts                 ← openSidebarLeaf fixed
├── styles.css              ← pill nav + Stitch redesign + placeholder CSS
├── img/
│   └── ObsiMan - Ui.png   ← wireframe source of truth
├── src/
│   ├── svelte.d.ts         ← NEW: .svelte type declarations
│   ├── views/
│   │   ├── ObsiManView.ts          ← thin shell (mount/unmount)
│   │   ├── ObsiManView.svelte      ← NEW: full UI in Svelte 5
│   │   ├── ObsiManExplorerView.ts  ← unchanged (placeholder for main view)
│   │   └── ObsiManOpsView.ts       ← unchanged
│   ├── components/
│   │   ├── FileListComponent.ts    ← added setSearchFilter, showSelectedOnly
│   │   └── [other components unchanged]
│   ├── types/
│   │   └── settings.ts     ← added viewMode, pageOrder default ['ops','files','filters']
│   └── i18n/
│       └── en.ts           ← +11 keys (nav, view mode, search)
└── docs/
    ├── HANDOFF.md          ← THIS FILE
    └── Known Issues.md
```
