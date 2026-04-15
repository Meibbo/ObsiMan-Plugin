---
in:
  - "[[Vaultman]]"
  - iterations
type:
  - docs
  - task
author:
  - "[[Meibbo]]"
input: AI-gen
---
# Vaultman - Agent Memory

> **This file is the live project state.** Every AI agent updates it at the end of their session.
> The next agent reads it FIRST (after AGENTS.md) to pick up exactly where work stopped.
> **See also: [[Vaultman - Linter Gotchas]]** for recurring typing and linter solutions.

---

## Lecciones aprendidas (Testing & Infraestructura)

### 1. Integración con `obsidian-integration-testing`
- **Sintaxis de Objeto**: No usar el shorthand `evalInObsidian(fn)`. La versión actual requiere el formato de objeto: `evalInObsidian({ fn: (...) => {}, args: {} })`.
- **Serialización de Clausuras**: Las variables locales del test (ej. `fileName`) **no son accesibles** dentro de la función evaluada en Obsidian porque se serializa a string y se envía a otro proceso. Deben pasarse explícitamente a través de la propiedad `args`.
- **Entorno Vitest**: Requiere `environment: 'node'` y el `globalSetup` oficial en `vitest.config.ts`.

### 2. Estabilización del IDE (TS Project Service)
- **Inclusión en TSConfig**: Cualquier archivo nuevo en la raíz o carpetas fuera de `src/` (como `test/`) debe añadirse al array `include` de `tsconfig.json`.
- **Configuración ESLint**: Para que el Parsing Error de la línea 1 desaparezca, el archivo debe estar en `parserOptions.projectService.allowDefaultProject` de `eslint.config.mts`.
- **Prohibición de Globs Recursivos**: `allowDefaultProject` **no permite** el uso de `**` (ej. `test/**/*.ts` es ilegal). Se deben usar rutas específicas o patrones simples como `test/integration/*.ts`.

### 3. Tipado de APIs Internas de Obsidian
- **Propiedades Ocultas**: Propiedades como `app.plugins` no están en el tipo `App` oficial. 
- **Técnica de Casting Seguro**: Definir una interfaz `ExtendedApp extends App` y realizar el casting interno dentro de las funciones de evaluación: `const extendedApp = app as ExtendedApp;`. Esto mantiene la compatibilidad de firmas de funciones genéricas.
- **Borrado Seguro**: Usar siempre `if (file instanceof TFile)` y `app.fileManager.trashFile(file)` en lugar de `vault.delete()`.

---

## Documented behaviors (for future agents)

### Workflow mandatory rule: Plugin Reloading
- **CRITICAL**: Al finalizar cada iteración de código (o al proponer una prueba visual), el agente **debe obligatoriamente recargar el plugin** usando la skill Obsidian CLI:
  Ejecutar el comando de consola: `obsidian.bat "vault=plugin-dev" "plugin:reload" "id=vaultman"` para que los cambios se reflejen inmediatamente en la aplicación.

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

## Developer Workflow & Environment Notes (CRITICAL)

### 1. Operating System & Shell
- **Environment**: Windows.
- **Shell**: PowerShell.
- **Rule**: NEVER use `&&` to chain commands. Always use `;` (e.g., `git add .; git commit`).

### 2. Obsidian CLI (`obsidian`)
- **Reliability**: The command is `obsidian` (or `obsidian.com`). 
- **Timeouts**: `obsidian help` and `obsidian eval` can be slow. If a command hangs, check status frequently but don't assume failure immediately.
- **Eval**: Avoid complex async/await in a single `eval` call string via PowerShell due to quoting issues. Use scratch scripts for complex logic.

### 3. File Paths
- **Format**: Use backslashes `\` for paths in commands, but be mindful of escape characters in strings.
- **Workspace**: Always work within the absolute path of the user's workspace listed in the system message.

---

## Last updated
- **Date**: 2026-04-15
- **Agent**: Antigravity (Gemini 1.5) — Session 36 (Finalizing ADD mode + Badge system + beta.15 release)

## Iter 19.2 summary (2026-04-15)
All deferred and cleanup tasks for Iteration 19 / 20-start shipped. Released as **1.0.0-beta.15**.
Key accomplishments:
- **Tag Operations**: Extended `TagChange.action` union to include `'add'`.
- **Files Explorer ADD mode**: Implemented behavior for ADD mode in `FilesExplorerPanel`. Clicking a file (or selected files) now opens `PropertyManagerModal` in 'add' mode.
- **Property Manager**: Added `'add'` action support to `PropertyManagerModal` (UI dropdown + `buildChange()` logic).
- **Badge System**: Implemented `addOpCount` tracking using `$derived` from `queueService`. Passed the count through `FiltersPage` → `NavbarFilters` → `ViewModePopup` to render a badge on the ADD mode FAB.
- **Localisation**: Added strings for `'add'` action and `'ADD mode'` in both `en.ts` and `es.ts`.
- **Cleanup**: Removed legacy `@ts-ignore` from `navbarFilters.svelte` as methods are now fully typed and implemented.
- **Git**: Merged `add-functions` into `main` and tagged `1.0.0-beta.15`.
- **Branch**: `add-functions`
- **Version**: `1.0.0-beta.15`
- **Build status**: ✅ Build PASSING (Clean — 0 warnings, 0 errors).

---

## What was completed this session (2026-04-15, Session 34 — Iter 18 Tasks 5–8)

Plan file: `C:\Users\vic_A\.claude\plans\lucky-humming-backus.md`

- **Task 5 — Glass-top CSS** (`a063c30`): Added `.vaultman-navbar-filters` sticky + `vaultman-glass--top` with `::before` blur pseudo (gradient `to top`), FAB size rule. Also added `.vaultman-props-grid` + `.vaultman-prop-card` CSS for grid view.
- **Task 6 — Wire ViewModePopup** (`cbea1a3`): Added `onViewModeChange?.(v)` call in `popupView.svelte selectView()`. Added `setViewMode()` + `setSortBy()` + `_renderGrid()` + `_applySort()` to `explorerProps.ts`. Also added `setIcon` import and `viewMode`/`sortBy`/`sortDir` fields. Grid view renders prop cards; tree view applies sort.
- **Task 7 — Wire SortPopup** (`1f01572`): Added `onSortChange?.(sortBy, sortDir)` call in `popupSort.svelte selectSort()`. Added `setSortBy()` + `_sortFiles()` to `explorerFiles.ts`. Added `setSortColumn()` to `viewGrid.ts`. Added `setSortBy()` + `_applySort()` to `explorerTags.ts`. Fixed pre-existing `constn` typo in `main.ts`.
- **Task 8 — Build + Reload** (`1f01572`): `npm run build` EXIT 0, 0 warnings. Plugin reloaded, `dev:errors` → No errors captured.

### Iter 18 — COMPLETE ✅

### What's next
- No open tasks from Iter 18. Start Iter 19 per user direction.

---

---

## What was completed this session (2026-04-14, session 31 — Island UI Restoration & Polish)
- **Island UI & Interaction**:
    - **Rising Glass Backdrop**: Implemented `vaultman-island-backdrop` with animated height and blur that covers the frame when islands are open.
    - **Outside Click Closing**: Added backdrop click handler (and a11y keyboard support) to close islands when clicking anywhere outside.
    - **Standardized Geometry**: Adjusted island max-height to `60vh` and standardized margins/borders for parity between Queue and Active Filters islands.
- **Aesthetic & Visual Polish**:
    - **Highlight Restoration**: Reverted highlighted tree nodes to use standard text/caret colors while maintaining the accent background and inset left-border.
    - **Indentation Cleanup**: Removed "dot" icons from value nodes and ensured indentation spacers don't consume extra space when icons are missing.
    - **Deleted State**: Implemented muted (`opacity: 0.5`) and strikethrough styles for properties/tags/values currently in the operation queue for deletion.
- **Tags Explorer Enhancements**:
    - **Inline Rename**: Refactored `UnifiedTreeView` and `TagsExplorerPanel` to support inline input fields for renaming, replacing the standard modal.
    - **Context Menu**: Improved tag context menu reliability and added specialized actions.
- **Stability & Types**:
    - **TreeNode Expansion**: Added `cls` property to `TreeNode` for dynamic row styling.
    - **Bug Fixes**: Resolved unhandled promises in event handlers and fixed icon type mismatches (`null` vs `undefined`).
    - **Build Certification**: Verified `npm run build` PASSES (Clean).

---

## What was completed this session (2026-04-14, Session 32 — Iter 17 Popups & Transitions)

- **Committed Vaultman rename files**: `main.ts`, `VaultmanSettingsTab.ts`, `settings.ts` (iVaultmanPlugin interface to break circular import).
- **SortPopup.svelte** (new): 2-row layout — scope dropdown + template (no-op) + close btn in row 1; 4 squircles (Name/Count/Date/Sub) with ↑/↓ direction toggle in row 2; vert-col absolute left with top/bot circle buttons and collapsible drawer (prop types for Props tab, All/Nested/Simple for Tags, direct toggle for Files); per-tab squircle sets.
- **ViewModePopup.svelte** (new): close + template (no-op) + search* buttons in row 1; horizontal-scroll pills (multi-selectable, no scrollbar, default-on/off per tab×view); 4 view-mode squircles (Tree/D&D/Grid/Cards) in row 2; search btn renders only for Files/Grid.
- **FiltersPage.svelte wired**: `headerMode: 'header' | 'sort' | 'viewmode'` + `headerExitDir: 'left' | 'right'`; clicking view-mode btn → `headerExitDir='left'`, `headerMode='viewmode'`; clicking sort btn → `headerExitDir='right'`, `headerMode='sort'`; `{#key filtersActiveTab}` + `fade({duration:180})` for tab transitions.
- **CSS added**: `popup-enter-from-left/right` slide animations (280ms `cubic-bezier(0.4,0,0.2,1)`), sort vert-col + drawer, viewmode pills scroll strip, squircle icon/dir helper classes.
- **i18n**: 40+ new keys for sort/viewmode popup strings.

### What's next
- [ ] Implement actual **templates** logic in Queue Island and Sort/View popups (buttons present, no-op).
- [ ] **Interaction**: Multi-select support in tree views (Props/Tags).
- [ ] **Mobile**: Test island responsiveness on small screens.
- [ ] **Bugs**: Verify performance on vaults with >10k files during high-frequency filtering.
- [ ] **Iter 18**: D&D list view implementation or Cards/Masonry frame spec.

---

## ✅ COMPLETE — ContextMenuService (Sessions 26–27)

### What was done (Session 27 — full plan execution)

All 9 tasks from `docs/superpowers/plans/2026-04-13-context-menu-service.md` executed and committed:

| Commit | Task |
|--------|------|
| `2f6c3d5` | Types: `src/types/context-menu.ts` + settings fields |
| `4a7d098` | `ContextMenuService` scaffold (registry, openPanelMenu, workspace hooks, curator) |
| `1342886` | Wire in `main.ts` (`addChild`) |
| `3ca09c1` | Migrate `TagsExplorerPanel` (3 actions) |
| `8b4e556` | Migrate `PropsExplorerPanel` (10 actions L1+L2) |
| `cdadd0b` | Migrate `FilesExplorerPanel` (3 actions) |
| `8120056` | Workspace stub "Edit with VM" |
| `5779819` | `MenuCuratorPanel` + Layout tab stub in `OperationsPage.svelte` |
| `1e3f4eb` | Integrity test + test infra fixes |

### Notes for next agent
- **Panel action registration**: Panel actions (tag.*, prop.*, value.*, file.*) register in panel `onload()`, which fires when the Vaultman view is mounted. Integrity test only checks `workspace.edit-with-vm` (registered at service load time).
- **Test infra**: `obsidian` package has no runtime entry. Top-level `import { TFile }` removed from test file; `evalInObsidian` callbacks resolve Obsidian types at runtime inside Obsidian.
- **Deleted `_updateValue`** in `PropsExplorerPanel.ts` — dead code after `_showContextMenu` removal.
- **`OpsTab` union** in `src/types/ui.ts` now includes `"layout"`.
- **Manual verification still needed**: right-click tags/props/files in panels, verify native file-menu gets Vaultman section, test curator panel in Layout tab.

### What's next — TypeScript lint errors to fix (next session priority)
El compilador TS arroja errores de "Unsafe access / error typed value" en los paneles que usan `contextMenuService`. Los archivos a revisar:
- `src/types/settings.ts` — ya tiene `import type { MenuHideRule }` estático (correcto)
- `src/services/ContextMenuService.ts` — leer completo para verificar
- `src/components/containers/PropsExplorerPanel.ts` — main suspect: unsafe access on `this.plugin.contextMenuService`
- `main.ts` — verificar que `contextMenuService!: ContextMenuService` esté declarado (lo está según commit)

Probable causa raíz: el ESLint rule `@typescript-eslint/no-unsafe-*` detecta que `this.plugin` tiene tipo `VaultmanPlugin` pero `contextMenuService` podría estar tipado como `any` en algún lugar intermedio, o el import circular entre `main.ts` y los servicios hace que el tipo se resuelva como `error`. Ejecutar `npm run lint` para ver los errores exactos antes de tocar código.

---

## ✅ BRAINSTORM COMPLETE — ContextMenuService (Session 26)

### Spec: `docs/superpowers/specs/2026-04-13-context-menu-service-design.md`
### Plan: `docs/superpowers/plans/2026-04-13-context-menu-service.md`

### All decisions locked
- **Q1**: Unified `ContextMenuService` — in-frame panels + workspace native menus (file-menu, editor-menu, more-options) + Curator
- **Q2**: `node + surface` two-dimensional registration
- **Q3**: Flat options object `registerAction({ id, nodeTypes, surfaces, label, icon, when?, run })`
- **Q4**: Panels become thin — all actions register through service (full migration, 3 panels)
- **Q5**: Settings toggle per surface (`contextMenuShowInFileMenu/EditorMenu/MoreOptions`)
- **Q6**: 17 actions total (tag×3, prop×3, value×7, file×3, workspace×1 stub)
- **Q7**: Curator = title substring match via Settings; UI in Layout tab (MenuCuratorPanel); visual intercept picker deferred to future
- **Rename note**: Plugin must become VaultMan (Obsidian store forbids app name in plugin ID). Deferred to store submission milestone. Workspace action label = "Edit with VM".

### Plan summary (9 tasks)
1. Types: `src/types/context-menu.ts` + settings fields
2. `ContextMenuService` scaffold (registry, openPanelMenu, workspace hooks, _applyHideRules)
3. Wire in `main.ts` (addChild)
4. Migrate `TagsExplorerPanel` (3 actions)
5. Migrate `PropsExplorerPanel` (10 actions: L1+L2)
6. Migrate `FilesExplorerPanel` (3 actions)
7. Workspace stub "Edit with VM"
8. `MenuCuratorPanel` + Layout tab stub in `OperationsPage.svelte`
9. Integrity test + reload

### Canvas artifact
`docs/Vaultman - Architecture & Roadmap.canvas` — 51 nodes, 3 sections: Architecture, Roadmap, Wireframe. Use json-canvas skill to update it when architecture changes.

### Questions still to answer (start here next session)
- **Q3**: What does the registration API look like? (interface for `registerAction(...)`)
- **Q4**: How does it integrate with existing Panel code without breaking them?
- **Q5**: How does workspace-level visibility control work at runtime?
- **Q6**: What are the exact actions for v1.0.0 (both in-frame and workspace)?

### Visual companion server
- Session dir: `<vault>/.superpowers/brainstorm/vaultman-live/`
- Screens saved: `scope-v100.html`, `ctx-actions-scope.html`
- **To restart server in new session** (Windows — must use bat method):
  ```bash
  cat > "C:/tmp/brainstorm-launch.bat" << 'BATEOF'
  @echo off
  set BRAINSTORM_DIR=c:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/plugin-dev/.obsidian/plugins/vaultman/.superpowers/brainstorm/vaultman-live
  set BRAINSTORM_HOST=127.0.0.1
  set BRAINSTORM_URL_HOST=localhost
  set BRAINSTORM_OWNER_PID=0
  cd /d "C:/Users/vic_A/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/scripts"
  node server.cjs
  BATEOF
  powershell.exe -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','C:/tmp/brainstorm-launch.bat' -WindowStyle Hidden"
  sleep 2
  cat "c:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/plugin-dev/.obsidian/plugins/vaultman/.superpowers/brainstorm/vaultman-live/state/server-info"
  ```

### v1.0.0 scope (full list saved in memory: project_v100_scope.md)
Key items: navbar swap (hub=pages, pill=tabs), Content tab → Filters page, node click model (single=select, double/ctrl=open), tree CSS fixes, View/Sort modal brainstorm needed, FAB popup continuity.

---

### 1. Unified Architecture ✅
- **Folder Merge**: `src/views/` has been merged into `src/components/` to simplify the project structure. All UI-related code now lives in `src/components/` (containers, layout, pages, tabs, etc.).
- **View Consolidation**: `VaultmanView` has been renamed and consolidated into `VaultmanFrame`.
- **View Type**: `Vaultman_FRAME_TYPE` ('vaultman-frame') is now the primary view identifier used for both sidebar and main pane leaves.

### 2. Source Path Updates ✅
- Updated `main.ts` and `tsconfig.json` to reflect the migration.
- Alias `@components/*` now points correctly to `src/components/*`.
- Resolved all TypeScript and build errors following the refactor.

### 3. Build Integrity Verified ✅
- Confirmed `npm run build` finishes with `Exit code: 0`.
- Confirmed `npm run build` finishes with `Exit code: 0`.
- Verified that `tsconfig.json` correctly tracks all new source files.

---

## What was completed this session (2026-04-13, session 27 — ContextMenuService Lint Fix)
- **Settings Refactor**: Replaced inline `import()` in `src/types/settings.ts` with explicit import for `MenuHideRule`.
- **Type Safety**: Resolved 6 "unsafe" lint errors in `src/services/ContextMenuService.ts` by enabling correct type inference for context menu hide rules.
- **Build Certification**: Verified `npm run build` PASSES (Exit code 0).

## What was completed this session (2026-04-13, session 24 — Frame Recovery + Stats Localization)
- **Frame Restoration**: Fixed broken relative imports in `VaultmanFrame.svelte` and corrected the missing `.vaultman-frame` CSS variable scope.
- **Layout Expansion**: Added `vaultman-pages-viewport` and `vaultman-page-container` styles to `styles.css` to fix the "collapsed content" issue (Zero height).
- **Statistics Localization**: Internationalized all labels in `StatisticsPage.svelte` using the `translate()` function and added missing keys to `en.ts`.
- **Iteration 15 Certified**: Marked "Statistics Dashboard" as completed in the roadmap.

## What was completed this session (2026-04-13, session 23 — BUG-1 through BUG-14 verification + BUG-11 CSS fix)

### Discovery: BUG-1 through BUG-14 already applied
After auditing the code, all runtime bugs from Session 22's diagnosis were **already applied in the beta.12 release commit** (4018136) made directly by Meibbo. The Agent Memory was not updated to reflect this.

**Status of each bug:**
- BUG-1 (node duplication): ✅ `_pendingRaf` + `cancelAnimationFrame` in `UnifiedTreeView.render()`
- BUG-2 (context menu override): ✅ `e.stopPropagation()` in contextmenu listener
- BUG-3 (prop types no children): ✅ resolved by BUG-1
- BUG-4 (ghost empty values): ✅ skip null/empty string in `PropsLogic._buildTree()`
- BUG-5 (props missing badge): ✅ `normalizedKey = key.toLowerCase()` in `PropsLogic._buildTree()`
- BUG-6 (tag filter highlights): ✅ `FilterService.hasTagFilter()` fully implemented
- BUG-7 (active filters popup tag label): ✅ `case 'has_tag'` in `describeFilterNode()`
- BUG-8 (selected count never updates): ✅ `onSelectionChange` callback wired in `FilesExplorerPanel` + `FiltersPage`
- BUG-9 (Iconic icons after click): ✅ already confirmed fixed in Session 22 via `onLoaded()`
- BUG-10 (dots on leaf nodes): ✅ leaf toggleSpan left empty (no icon set)
- BUG-11 (abrupt expand/collapse): ✅ **FIXED THIS SESSION** — added `vaultman-tree-expand` keyframe animation to `.vaultman-tree-children` in `styles.css`
- BUG-12 (font weight too bold): ✅ `font-weight: normal` on `.vaultman-tree-label`
- BUG-13 (nodes too close): ✅ `padding: 4px 8px` on `.vaultman-tree-row`
- BUG-14 (active filter toggle no icon): ✅ `use:icon={rule.enabled ? 'lucide-eye' : 'lucide-eye-off'}` in `ActiveFiltersPopup.svelte`

### What's next: Iteration 15 — Statistics Dashboard

## What was completed this session (2026-04-12, session 22 — Lint fixes + runtime bug diagnosis) [ARCHIVED SUMMARY]

### Lint fixes ✅
- Deleted `src/components/NavbarComponent.ts` — unused dead code
- Created `src/utils/inputModal.ts` — `showInputModal()` replaces `prompt()`
- `FilesExplorerPanel.ts`, `PropsExplorerPanel.ts`, `TagsExplorerPanel.ts`: unsafe assertions removed, types fixed
- `IconicService.ts`: added `onLoaded(cb)` method

### Runtime bugs diagnosed (all applied in beta.12 by Meibbo — see above)

**BUG-1 — Node duplication (primary bug, causes most others):**
- Root cause: `UnifiedTreeView.render()` calls `containerEl.empty()` + `rowEls.clear()` synchronously but defers `renderNodes()` to `requestAnimationFrame`. Two `$effect`s in Svelte call `setSearchTerm()` on the same panel simultaneously → two rAFs queue → both fire and append nodes to the already-populated container.
- Fix: Add `private _pendingRaf: number | null` field; at start of `render()` cancel the pending rAF before scheduling a new one.

**BUG-2 — Context menus show but actions fail:**
- Root cause A: Obsidian's workspace has a global `contextmenu` handler on document that intercepts the event after our handler fires (bubble phase), overriding our `Menu`. Fix: add `e.stopPropagation()` before `opts.onContextMenu()` in `UnifiedTreeView._renderRow()` contextmenu listener.
- Root cause B: `prompt()` replaced with `showInputModal` (already done in lint fixes).

**BUG-3 — Prop types don't show children:**
- Caused by BUG-1 (duplication). Will likely resolve once BUG-1 fixed. If not, investigate further.

**BUG-4 — Ghost values (sin nombre, badge alto):**
- Root cause: `PropsLogic._buildTree()` converts `null`/`undefined` frontmatter values to `''` via `String(null ?? '')`. Creates phantom empty-string value nodes.
- Fix in `PropsLogic._buildTree()`: skip `str === ''` when building valueMap.

**BUG-5 — Many props missing badge/frequency:**
- Root cause: `getAllPropertyInfos()` returns lowercase-normalized keys (e.g., `'genre'`), but `valueMap` is built from raw frontmatter keys (e.g., `'Genre'`). `valueMap.get('genre')` returns undefined.
- Fix in `PropsLogic._buildTree()`: normalize keys to lowercase when building valueMap: `const normalizedKey = key.toLowerCase()`.

**BUG-6 — Tag filter highlights not working (no `is-active-filter` on tag nodes):**
- Root cause: `FilterService.hasTagFilter()` is a stub returning `false`.
- Fix: Implement by walking `activeFilter` tree and checking for `filterType === 'has_tag'` rules with matching value.

**BUG-7 — Active filters popup: tag entries show "filter" instead of tag name:**
- Root cause: `describeFilterNode()` in `VaultmanView.svelte` has no case for `'has_tag'`. Falls to `default: return prop || "filter"`. Tag rules have `property: ''`, so it returns `"filter"`.
- Fix: Add `case 'has_tag': return \`has tag: \${(vals as string[])[0] ?? ''}\`;`

**BUG-8 — Selected files count never updates:**
- Root cause: `onSelectionChange: () => {}` in `FilesExplorerPanel._mountView()` is a no-op. `selectedCount` in `VaultmanView.svelte` never gets updated.
- Fix: Pass a callback from VaultmanView to FilesExplorerPanel that sets `selectedCount`.

**BUG-9 — Iconic icons only load after click:**
- Root cause: `loadIcons()` is async. First render fires before it completes. Already FIXED via `onLoaded(cb)` in IconicService + `plugin.iconicService?.onLoaded(() => this._render())` in both panels' `onload()`.

**BUG-10 — Dots in nested node indentation instead of tree line:**
- Root cause: `UnifiedTreeView._renderRow()` sets `setIcon(toggleSpan, 'lucide-dot')` for leaf nodes.
- Fix: Leave the toggle span empty for leaf nodes (just `min-width: 16px` flex spacer, no icon).

**BUG-11 — Expand/collapse too abrupt:**
- Fix: Add CSS fade-in animation to `.vaultman-tree-children` (no height transition needed, just opacity+translate).

**BUG-12 — Font weight too bold:**
- Fix: Add `font-weight: var(--font-normal)` to `.vaultman-tree-label` in styles.css.

**BUG-13 — Nodes too close together:**
- Fix: Increase `.vaultman-tree-row` padding from `2px 8px` to `4px 8px`.

**BUG-14 — Active filter toggle button has no icon:**
- Root cause: `vaultman-active-filter-toggle` div in `ActiveFiltersPopup.svelte` has no icon set.
- Fix: Add `use:icon={rule.enabled ? 'lucide-eye' : 'lucide-eye-off'}` to the toggle div.

**BUG-15 — Filters header search not reflected in active filters:**
- Design clarification needed: header search is in-panel display filter, NOT a FilterService rule. If user wants it to also appear in active filters, that's a design decision.

### What's NOT done yet (for next agent):
Execute BUG-1 through BUG-14 fixes, then run build, then reload plugin.

### Architecture notes (still valid from Iter.14)
- `Logic` = pure data, `Panel` = orchestrator (Component), `View` = renderer (UnifiedTreeView/GridView)
- `PropsExplorerPanel` computes active filter highlights internally on every `_render()` call

---

## What was completed this session (2026-04-12, session 21 — Iter.14 Filters Explorer Refactor)

### Task 1 — TreeNode types ✅
- Created `src/types/tree.ts` — `TreeNode<T>`, `TagMeta`, `PropMeta`, `FileMeta` interfaces.

### Task 2-4 — Logic layer ✅
- Created `src/logic/TagsLogic.ts` — cached tag tree build + in-memory filter via `prepareSimpleSearch`.
- Created `src/logic/PropsLogic.ts` — cached prop tree, value nodes, type incompatibility detection.
- Created `src/logic/FilesLogic.ts` — flat list + folder-hierarchy tree builder + search filter.

### Task 5-6 — Shared renderers ✅
- Created `src/components/UnifiedTreeView.ts` — callback-driven tree renderer, 200-node render limit, `updateVisibility()` for no-DOM-rebuild search updates.
- Created `src/components/GridView.ts` — generalized file grid with sorting, checkboxes, context menus.

### Task 7 — IconicService ✅
- Added `tagIcons` support + `getTagIcon(tagPath)` method to `src/services/IconicService.ts`.

### Task 8-10 — Panel orchestrators ✅
- Created `src/components/TagsExplorerPanel.ts` — tags tree, Iconic icons, context menu (rename/delete/send to frontmatter), search filter mode (all/leaf).
- Created `src/components/PropsExplorerPanel.ts` — props tree with type icons, L1 (property) + L2 (value) context menus, type incompatibility warnings, value convert operations.
- Created `src/components/FilesExplorerPanel.ts` — grid/tree view modes, file context menu (rename/delete/move), `setSearchFilter()` for name/folder search.

### Task 11-13 — Svelte wiring ✅
- Replaced old components in `FiltersTagsTab.svelte`, `FiltersPropsTab.svelte`, `FiltersFilesTab.svelte`.
- Updated `FiltersPage.svelte` + `VaultmanView.svelte` type annotations to new Panel types.
- Removed obsolete method calls: `setActiveFilters`, `setViewOptions`, `showSelectedOnly` (new architecture handles internally).

### Task 14 — CSS ✅
- Added `.vaultman-tree-row`, `.vaultman-tree-toggle`, `.vaultman-tree-icon`, `.vaultman-tree-label`, `.vaultman-tree-count`, `.vaultman-badge-warning` to `styles.css`.
- Fixed icon overflow + chevron min-width regressions.

### Task 15 — Cleanup ✅
- Deleted `src/components/TagsExplorerComponent.ts`, `PropertyExplorerComponent.ts`, `FileListComponent.ts`.
- Fixed `NavbarComponent.ts` (dead code — type reference updated to avoid compile error).
- Verified build PASSES. Plugin reloads without errors in Obsidian.

### Architecture notes (for next agent)
- **Naming convention enforced**: `Logic` = pure data, `Panel` = orchestrator (Component), `View` = renderer (UnifiedTreeView/GridView).
- `PropsExplorerPanel` computes active filter highlights internally on every `_render()` call — no external `setActiveFilters()` needed.
- `VaultmanView.svelte` now holds `$state<TagsExplorerPanel>`, `<PropsExplorerPanel>`, `<FilesExplorerPanel>`.
- One-time teardown error on reload (old `PropertyExplorerComponent` in state had no `.unload()`) — expected, not a bug.

---

## What was completed this session (2026-04-12, session 19 — Search UI Unification)

### Task 1 — Centralized Search Architecture ✅
- Established `FiltersPage` header as the single source for search state (`filtersSearch`).
- Decoupled `PropertyExplorerComponent` and `TagsExplorerComponent` from internal search inputs.
- Implemented `hideSearch` constructor option and `setSearchTerm(term)` synchronization.

### Task 2 — Component Stabilization ✅
- Fixed code corruption in `PropertyExplorerComponent.ts` (removed duplicate methods and malformed listeners).
- Fixed TypeScript warnings in `TagsExplorerComponent.ts` (unused `options`).
- Verified build stability with `npm run build` (Exit code: 0).

### Task 3 — Svelte Reactivity ✅
- Integrated `$effect` hooks in `FiltersPropsTab.svelte` and `FiltersTagsTab.svelte` for real-time synchronization.
- Verified that switching tabs preserves the search term visibility and filtering logic.

### Task 4 — UI Regression Fixes (Search Pill & Duplicate Input) ✅
- Fixed search pill visual glitches ("rectángulo" and style inheritance from `metadata-input-text`) by changing input type from `search` to `text` and adding `!important` CSS resets.
- Resolved "duplicate input" issue in the Filters Props tab by hardening the `hideSearch` logic in `PropertyExplorerComponent` to strictly respect configuration.

### Task 5 — Native Rename Experiment ✅
- Investigated vault-wide property renaming using Obsidian CLI.
- Verified that there is no single-command CLI equivalent for global rename; the recommended "native" way is iterating files and using `app.fileManager.processFrontMatter`, which is consistent with Vaultman's implementation.
- Performed an experiment renaming `gameGenre` to `Genre` via CLI `eval`.

---

## What was completed this session (2026-04-11, session 18 — i18n System Refactor & Stabilization)

### Task 1 — i18n Naming Standardization ✅
- Renamed the global translation function from `t()` to `translate()` to avoid scoping and minification conflicts in Obsidian/Svelte.
- Standardized imports in all `src/` subdirectories to use `import { translate } from ...`.
- Updated all UI strings in Svelte templates and TypeScript components.

### Task 2 — Collision Correction & Code Integrity ✅
- Fixed severe collateral damage from initial bulk renaming that corrupted native methods:
    - Reverted `setTextranslate` -> `setText` in `FilterTreeComponent.ts`
    - Reverted `clearTimeoutranslate` -> `clearTimeout` in `PropertyExplorerComponent.ts`
    - Reverted `startNameEditranslate` -> `startNameEdit` in `PropertyGridComponent.ts`
    - Reverted `startInlineEditranslate` -> `startInlineEdit` in `PropertyGridComponent.ts`
- Resolved severe a11y warnings in `BottomNav.svelte` (clics without key events and dynamic roles/tabindex).
- Fixed implicit `any` type and dangerous stringification in `PropertyExplorerComponent.ts`.
- Fixed type mismatch in `FiltersPage.svelte` (tab array casting).
- Fixed non-reactive `pillEl` update and removed unused `isAnimating` in `VaultmanView.svelte`.
- Performed a comprehensive manual audit and verified `npm run build` PASSES (Exit code: 0).
- Successfully migrated all Svelte popups and main views to `translate()` (thanks to `t('` strategy).
- Verified `main.ts` is syntactically correct and clean of "ack:" corruption.

### Task 3 — Commands & Activation ✅
- Added `vaultman:open-sidebar` command to `main.ts` for quick toggle functionality.
- Fixed command ID conflict issues (IDs no longer include redundant plugin prefix).
- Resolved `ReferenceError: t is not defined` blocker that prevented plugin activation.

### Task 4 — UI Polish & Final Stabilization ✅
- Restored missing `onUpdate` method in `OperationQueueService`, fixing a severe `TypeError` on plugin reload.
- Changed main ribbon and tab icons to `lucide-dessert` for a sweeter UI.
- Removed unused reactive state `totalFiles` from `VaultmanView.svelte`.
- Added missing plural overrides in `en.ts` to fix display of raw `ops.tabs.*` translation keys.
- Completely resolved Svelte compilation/a11y warnings in `BottomNav.svelte` by converting the collapsed navigation area to a real button and properly configuring `tablist` ARIA roles and tabindexes.

---

## What was completed this session (2026-04-10, session 17 — Iteration 13 testing stabilization)

### Task 1 — Integrity Suite Corrected ✅
- Removed legacy `vaultman:open-main-view` command and `activateMainView` method from `main.ts`.
- Added `Verify FilterService initialization` test to `vaultman.integrity.test.ts`.
- All integrity tests PASS.

### Task 2 — E2E Vault Fixtures ✅
- Created `Project A.md`, `Task B.md`, and `Folder/Nested file.md` in `test/vaults/e2e`.
- Synchronized fixtures for UI-based property/tag testing.

### Task 3 — E2E Test Code Ready ✅
- Added Filters page tabs rendering verification and Statistics count verification to `vaultman.e2e.ts`.
- *Verification pending* due to environment-specific WDIO hangs on the current Google Drive mount.

---

## What was completed this session (2026-04-10, session 16 — documentation & roadmap cleanup)

### Task 1 — Comprehensive Documentation Audit & Archive ✅
- Audited `docs/Vaultman - User Interface.md` and `docs/Vaultman - Plugin Architecture.md`.
- Identified and moved all completed bug fixes from `Vaultman - Bugs.md` to `docs/Vaultman - Archived tasks.md`.
- Created a new section in `Archived tasks.md`: **v1.0.0-beta.2—9 — Stability & UI Polish**.
- Cleaned up `Vaultman - Bugs.md` to only contain active pending bugs and placeholders.
- Verified that `AGENTS.md` correctly points to the renamed bug tracker and reflects version `1.0.0-beta.9`.

### Task 2 — Testing Documentation Verification ✅
- Verified `docs/Vaultman - Testing.md` accurately describes the dual-tier strategy (Vitest/Integrity + WDIO/E2E).
- Confirmed stale assertion for `vaultman:open-main-view` is documented and slated for cleanup in Iter.13.

### Task 3 — Roadmap Restructure ✅
- Reordered pending iterations in this file (13 through 18) for numerical clarity.
- Ensured Iter.13 (Testing) remains the immediate next priority.
- Synced task order with the current session objectives.

---

## Plugin philosophy — "Augment, don't replace"

Vaultman augments Obsidian's native ecosystem (Search, Bases, Properties, Tags) and community plugins (Linter, Tag Wrangler, etc.) — it does not replace them. Every feature should ask: *"What does the existing plugin do well, and what is it missing?"*

**Agent rule**: Before implementing any integration, search online for the target plugin's API docs and GitHub. Never assume an API exists. See AGENTS.md section 11 for known API surfaces.

### ~~Iteration 14: Filters Explorer Refactor (Logic/Panel/View)~~ ✅ DONE (beta.11)

### Iteration 15: Statistics Dashboard (v1.0 cards) ✅ DONE
- [x] Implement 3-col card layout (Folders, Files, Props, Values, Tags)
- [x] Add basic stat providers with scope toggle: `in vault` / `Filtered` / `Selected`
- [x] Meta stats: Total links + Word count (Word count is stubbed for performance)
- [x] Placeholder for v1.1 dashboards

### Iteration 16: Operations Logic Completion (Backend) ✅ DONE
- [x] Pattern-based rename substitution in `FileRenameModal`
- [x] File diff view rendering in `QueueDetailsModal` (newPath path diffing)
- [x] Templates tab (Templater integration) - Backend `APPLY_TEMPLATE` hook written. UI pending.
- [x] Fix race condition in queue execute (beta.5 bug)

### Iteration 17: Level 4 Popups & Transitions
- [ ] Sort popup (replaces Filters header)
- [ ] View mode popup (replaces Filters header)
- [ ] Animations: spring slide-up 300ms, horizontal page slide 280ms

### Iteration 18: Search Plugin Augmentation
- [ ] "Send to Vaultman" command from Search results
- [ ] Use Search results as scope in FilterService
- [ ] Scope pill for "Search results" in Statistics

### Iteration 19: Tag Operations
- [ ] Bulk tag rename + merge
- [ ] Tag ops in queue: stage, preview, confirmation flow

### Iteration 20: Explorer Advanced Features (brainstorm 2026-04-12)
> See memory: `project_explorer_vision.md` + `project_brainstorm_2026_04_12.md`
- [ ] DnD reordering on all tree nodes
- [x] Badge system (SOLID, multi-state, multi-zone)
- [x] Highlighting system (Search term bounding boxes)
- [ ] Virtual DOM queue preview (needs own brainstorm first)
- [ ] Keyboard navigation + multi-select
- [ ] Special prop widgets: calendar (date), slider (number), Better Selector (cssclasses)
- [ ] WIP/Coming Soon overlay placeholders

### Iteration 21: Health Check + Variables
> See memory: `project_brainstorm_2026_04_12.md`
- [ ] Health Check feature (Stats page): broken frontmatter, duplicate files, conflicts
- [ ] Centralized variables store (data.json / variables.md)
- [ ] Tag click + Ctrl: open assigned page with tag as alias

### Iteration 22: Layout tab (La gran implementación)
> See memory: `project_brainstorm_2026_04_12.md` — requires own brainstorm
- [ ] Ops → Layout tab: apply/adjust CSS snippets (hide topbar, reposition nav buttons)
- [ ] Context menu injection into Obsidian's native right-click from any note
- [ ] Sidebar tab editor for mobile (insert + reorder tabs without editing JSON)
- [ ] Bottom bar as replacement/integration of Obsidian native tab system
  - Tab Stack vertical in mobile sidebar (2 tabs in 1 view)
  - Any plugin page/tab inside Vaultman frame

---

## Known placeholders (not bugs)

| Feature | Status |
|---------|--------|
| Pattern-based rename substitution | In Iter.16 |
| File diff view | In Iter.16 |
| Linter tab batch logic | Deferred (impractical via `executeCommandById`) |
| Templates tab (Templater integration) | In Iter.16 |
| View mode popup (Filters header left btn) | Stub — future iteration |
| Sort popup (Filters header right btn) | Stub — future iteration |
| Add-ons FAB (Statistics center) | Stub — future iteration |

---

## Context budget notes
- **Claude Code (Sonnet 4.6)**: ~200K context window. START NEXT SESSION IN A NEW CONVERSATION.
- **Rule**: If context < 20%, update this file and switch agents BEFORE starting a new iteration.

---

## How to start the next session

```
Read AGENTS.md and docs/Vaultman - Agent Memory.md in the Vaultman plugin folder.
Last completed: Session 20 (Brainstorm + spec + plan — Filters Explorer Refactor).
Next up: Iter.14 — execute plan at docs/superpowers/plans/2026-04-12-filters-explorer-refactor.md
```
