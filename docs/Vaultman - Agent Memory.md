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
> **See also: [[Vaultman - Agent History]]** for archived session notes and historical context.

---

## Convenciones de Código y Preferencias (USER)

### 1. Nomenclatura de Archivos

- **Formato**: `camelCase` para TODOS los archivos (incluyendo `.svelte` y `.ts`).
- **Patrón**: `[qué hace / rol] + [qué es / sujeto]`. (Sin sufijos redundantes).
  - Ejemplos: `explorerFiles`, `panelExplorer`, `viewTree`, `settingsSomething`.
- **Preferencia**: El usuario prefiere tener el control sobre los nombres para que sean descriptivos de su función primero y mantenerlos cortos.

### 2. Estructura de Componentes

- **Híbrido Svelte + TS**: Los componentes visuales y el estado reactivo van en `.svelte`. La lógica pesada de datos y transformaciones va en `.ts` (Data Providers).
- **Hardcoding Awareness**: El desarrollador debe ser consciente de los valores hardcoded (ej: límites de renderizado, constantes de tiempo, modos por defecto). Estos deben ser notificados o consultados si afectan la reactividad o flexibilidad del sistema.
- **Dead Code Protocol**: Antes de eliminar código que parezca muerto (unused), el agente DEBE notificar al desarrollador o consultar si es seguro borrarlo, especialmente si parece ser funcionalidad incompleta o futura.
- **Historical Logic Restoration**: Si una función deja de funcionar ("regresión"), el agente DEBE buscar en el historial de Git (commits anteriores) para comparar la lógica que funcionaba, extraer sus conceptos y adaptarlos al nuevo sistema. Preguntar al usuario por el commit aproximado si es necesario.

---

## Lecciones aprendidas (Testing & Infraestructura)

### 1. Integración con `obsidian-integration-testing`

- **Sintaxis de Objeto**: Versión actual requiere el formato: `evalInObsidian({ fn: (...) => {}, args: {} })`.
- **Serialización de Clausuras**: Variables locales del test (ej. `fileName`) **no son accesibles** dentro de la función evaluada. Deben pasarse a través de `args`.
- **Entorno Vitest**: Requiere `environment: 'node'`.

### 2. Estabilización del IDE (TS Project Service)

- **Inclusión en TSConfig**: Añadir archivos nuevos al array `include` de `tsconfig.json`.
- **Prohibición de Globs Recursivos**: `allowDefaultProject` en ESLint **no permite** `**`.

### 3. Tipado de APIs Internas de Obsidian

- **Técnica de Casting Seguro**: Definir `ExtendedApp extends App` para acceder a `app.plugins`.
- **Borrado Seguro**: Usar siempre `if (file instanceof TFile)` y `app.fileManager.trashFile(file)`.

---

## Documented behaviors (for future agents)

### Workflow mandatory rule: Plugin Reloading & Certification

- **CRITICAL**: Al finalizar cada iteración, recargar el plugin: `obsidian vault=plugin-dev plugin:reload id=vaultman`.
- **CERTIFICATION**: Antes de terminar, ejecutar:
  1. `npm run build` (bui) -> **0 warnings y 0 errores**.
  2. `npm run lint` -> **0 problems**.
- **RELEASES**: Los tags de Git **NUNCA** deben llevar el prefijo "v" (usar `1.0.0-beta.15`).
- **BRAT**: Requiere un **GitHub Release** oficial con `main.js`, `manifest.json` y `styles.css` como assets.

### Queue execution model

- **Queue auto-clears** after `execute()` completes.
- **Execution is chunked**: 20 files per tick via `setTimeout(0)`.
- **Batch queueing**: Use `queueService.addBatch([])` to avoid UI freeze due to massive re-renders.

### Obsidian indexing behavior

- `fileManager.renameFile()` is instant; metadata indexing is background and per-file.
- Folder counts update incrementally; this is native Obsidian behavior.

---

## Developer Workflow & Environment Notes (CRITICAL)

### 1. Operating System & Shell

- **Environment**: Windows / PowerShell.
- **Rule**: NEVER use `&&`. Always use `;`.

### 2. Certification & Tools (bui / lint)

- **Certification**: Sesión termina con **Certificación Verde** (build 0 errors, lint 0 problems).
- **Obsidian CLI**: El binario es `obsidian`.

---

## Last updated

- **Date**: 2026-05-02
- **Agent**: Claude Code (Sonnet 4.6 → Opus 4.7) — Sub-A.4.2 closure (T35–T40)

## Session 2026-04-30 — Sub-C Tests closure

**Status: Sub-C Tests completo. Iter C.1 + C.2 + C.3 + C.4 cerrados. Versión bumped a `1.0.0-beta.19`.**

- **Branch**: `hardening-tests` (creada desde `hardening` post-merge de Sub-B).
- **Versión**: `1.0.0-beta.19` taggeada y committed.
- **Iter C.1**: Vitest dual project (unit + integration) + obsidian alias + mocks. `test/helpers/yaml.ts`, `test/helpers/obsidian-mocks.ts`, scripts `test:unit`/`test:cover`/`verify`. Sanity test 4/4.
- **Iter C.2**: 6 archivos test en `test/unit/utils/` (30 tests). Coverage `src/utils/` ~72% lines (gap vs target 80%; backfill diferido a Sub-A).
- **Iter C.3**: 3 archivos test en `test/unit/logic/` (15 tests). Coverage `src/logic/` 96.8% lines ✅. ADR-009 documenta exclusión de `logicQueue.ts`/`logicFilters.ts` (UI mislabeled).
- **Iter C.4**: 6 archivos test en `test/unit/services/` (58 tests). Coverage `src/services/` 72.28% lines ✅ (target 70%). CI gate `.github/workflows/ci.yml` con lint+check+build+test:cover.
- **Total**: 107 tests passing en 16 archivos. Vitest 4.1.5, @vitest/coverage-v8 4.1.5, js-yaml 4.1.1.
- **Coverage gaps notados** (post-rc.1 / Sub-A):
  - `serviceCMenu.ts` 5.31% lines (handlers de eventos workspace no cubiertos).
  - `dropDAutoSuggestionInput.ts` 37.5% lines (clase interna no testeada).
  - `inputModal.ts` 57.14% lines (DOM-bound, ADR-003 dirige E2E).
  - `utilPropIndex.ts` 59.67% lines (debounce + onload eventos).
- **Gitignore fix**: añadidas exceptions `!docs/superpowers/{plans,specs,triage,adr}` para que estos docs sean tracked.
- **PR**: `hardening-tests` → `hardening` abierto. NO mergear a `main`.
- **Próximo**: Sub-A Refactor. Escribir plan con `superpowers:writing-plans` (Iter A.1-A.5). Ver HANDOFF Paso 5.

## Session 2026-04-29 — Sub-B Audit: Iter B.2 cleanup + closure

**Status: Sub-B Audit completo. Iter B.1 + B.2 cerrados. Versión bumped a `1.0.0-beta.18`.**

- **Branch**: `hardening-audit` (creada desde `hardening`, creada desde `file-centric-queue-handoff`).
- **Versión**: `1.0.0-beta.18` taggeada y committed.
- **Iter B.2 cleanups aplicados** (commits en orden):
  - `553cbe3` `chore(audit): disable depend/ban-dependencies for package.json` — ESLint fix for depcheck devDep
  - `d2410ab` `chore(audit): remove BasesCheckboxInjector references from CONTRIBUTING.md`
  - `5ccb059` `chore(audit): remove unused exports` — `setLanguage`, `getLanguage`, `resolveLanguage` from `src/i18n/index.ts`
  - `57c9f94` `chore(audit): remove orphan files` — 4 files: `componentStatusBar.ts`, `panelContent.svelte`, `modalAddFilter.ts`, `modalLinter.ts`
  - `a1a8db7` `chore(audit): clean transitive dead code` — `_setViewMode`, `_openMovePopup`, `showPopup` from `frameVaultman.svelte`
  - `05931f5` `chore(release): bump to 1.0.0-beta.18 (Sub-B Audit close)`
- **Nota lint**: `depend/ban-dependencies` regla del plugin `obsidianmd` banea `depcheck`. Fix: override en `eslint.config.mts` para `package.json`. Añadir a linter gotchas si se repite.
- **False positives ts-prune confirmados**: `ActiveFiltersIslandComponent`, `QueueIslandComponent`, `QueueDetailsModal`, `defOpsTab` — todos tienen consumers en `.svelte` que ts-prune no escanea. Exports son legítimos.
- **Deferred items** (no se tocan hasta Sub-A/post-rc.1): `tabContent.svelte`, `tabLinter.svelte`, `dropDAutoSuggestionInput.ts`, `currentViewMode` en navbarExplorer, todos los WIP files.
- **Verify gate final**: build ✅ lint ✅ check ✅ (1 error deferred — `currentViewMode` item 5.1) test:integrity = sin archivos de test (Sub-C scope).
- **PR**: `hardening-audit` → `hardening` abierto. NO mergear a `main`.
- **Próximo**: Sub-C Tests. Escribir plan con `superpowers:writing-plans` (Iter C.1-C.4). Ver HANDOFF Paso 3.

## Session 2026-04-28 (tarde) — Triage v1.0 scope + Annex A/B

**Status: Triage completo. Annex A + B integrados al spec maestra. Commit listo. Plan B pendiente.**

- **Triage doc creado**: `docs/superpowers/triage/2026-04-28-v100-scope-triage.md` con clasificación por item del backlog `docs/2026-04-15-1812 Vaultman v1.0 scope.md`. Categorías usadas: `in-hardening`, `adjacent`, `out-hardening`, `already-fixed`, `cancelled`, `post-rc.1`. ~98 items mapeados.
- **Annex A** (v1.0 scope integration por iter) y **Annex B** (v1.0 Polish con vision statement + 4 sub-bloques + post-rc.1 + cancelled) appended al final del spec maestra.
- **Bugs urgentes confirmados** (decisión usuario): Diff memory blow-up → A.4.1; Queue counter concurrency → A.4.2. NO pre-fix iter.
- **Verificación colateral**: `BasesCheckboxInjector.ts` ya borrado del working tree (Glob+Grep 2026-04-28). Única ocurrencia restante en `CONTRIBUTING.md` — Sub-B la limpia.
- **HANDOFF.md actualizado**: Paso 1 marcado DONE. Lista de archivos a leer ahora apunta a Paso 2.
- **Memory file** `project_hardening_master.md` actualizado con triage done.

## Session 2026-04-28 (mañana) — Vaultman Hardening master spec

**Status: Spec aprobada y committeada (`17c89a8`).**

- **Brainstorm completo** del proyecto Vaultman Hardening: refactor + tests + audit + lock contra regresión.
- **Spec maestra**: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md`.
- **Estructura**: 3 sub-proyectos secuenciales B (Audit) → C (Tests) → A (Refactor) sobre rama `hardening` (no creada aún). Ningún merge a `main` durante el proyecto.
- **Versionado**: cambios sin commit del working tree → `1.0.0-beta.17`. Bumps progresivos por hito hasta `1.0.0-rc.1`.
- **BRAT**: sólo release beta.17 ahora; resto el usuario decide.
- **Specs antiguas**: Code Refactor Part 1-8 + CSS Refactor Part 1-5 → archivar a `docs/archive/` durante Sub-A.
- **Pre-confirmado para borrar en Sub-B**: `BasesCheckboxInjector.ts` y todas sus referencias.
- **Nuevo concepto introducido**: abstracción `INodeIndex<T>` con factory + 8 indices concretos (Files, Tags, Props, Content, Operations, ActiveFilters reales; CSSSnippets, Templates como stubs v1.0+1).

## Session 40 summary (2026-04-19)

**Status: Branch Created for Handover.**
Key accomplishments:

- **Branch Creation**: Created `file-centric-queue-handoff` from `file-centric-queue` to allow another agent to continue work.
- **Certification Run**: Ran `npm run build` and `npm run lint`.
- **Build status**: ✅ PASS (0 warnings, 0 errors).
- **Lint status**: ❌ FAIL (67 problems). Most errors are `Unsafe member access` or `Unsafe argument` in new file-centric queue logic.
- **Branch Handover**: Updated `AGENTS.md` and `Agent Memory.md` to point to the new branch.

## Iter 19.3 summary (2026-04-17)

**Status: Stabilized & Certified.**
Key accomplishments:

- **Explorer Reactivity**: Fixed state propagation for search and view modes across all tabs (Files, Tags, Props).
- **Files Explorer Fix**: Restored missing bindings for `searchTerm` and `searchMode` in `tabFiles.svelte`.
- **Scroll Stability**: Adjusted CSS flexbox containers to ensure scroll functionality (`overflow-y: auto`) works in all views.
- **Linter Cleanup**: Achieved **0 problems** report. Resolved `no-unsafe-argument` in `frameVaultman.ts`.
- **Memory Optimization**: Offloaded historical session data to `Vaultman - Agent History.md`.
- **Build status**: ✅ PASS (0 warnings, 0 errors).
- **Lint status**: ✅ PASS (0 problems).

---

## Roadmap

### Iteration 17: Level 4 Popups & Transitions (UI Refinement)

- [ ] Implement smooth transitions for Sort and View mode popups.
- [ ] Animations: spring slide-up 300ms, horizontal page slide 280ms.

### Iteration 18: Search Plugin Augmentation

- [ ] "Send to Vaultman" command from Search results.
- [ ] Use Search results as scope in FilterService.

### Iteration 19: Tag Operations (Active)

- [ ] Bulk tag rename + merge.
- [ ] Tag ops in queue: stage, preview, confirmation flow.

### Iteration 20: Explorer Advanced Features

- [ ] DnD reordering on all tree nodes.
- [ ] Keyboard navigation + multi-select.
- [ ] WIP/Coming Soon overlay placeholders.

### Iteration 21: Health Check + Variables

- [ ] Health Check feature (Stats page): broken frontmatter, duplicate files.
- [ ] Centralized variables store.

### Iteration 22: Layout tab (La gran implementación)

- [ ] Context menu injection into Obsidian's native right-click.
- [ ] Sidebar tab editor for mobile.
- [ ] Bottom bar as replacement/integration of Obsidian native tab system.

---

## Session 2026-04-20 — SCSS and Svelte TypeScript integration

- Configured project for SCSS support in Svelte components.
- Installed `svelte-preprocess` and `sass` devDependencies.
- Created `svelte.config.js` to enable LSP support (SCSS and TS) in IDEs.
- Updated `esbuild.config.mjs` to include `sveltePreprocess()` in the `esbuild-svelte` plugin.
- Added `verbatimModuleSyntax: true` to `tsconfig.json` (required for Svelte components with `lang="ts"`).
- Added `npm run check` script using `svelte-check` for component diagnostics.
- Verified configuration by successfully building a test component with `<style lang="scss">` and `<script lang="ts">`.
- **Note**: Faced a minor `tsc` error in `type-fest` during full build, but esbuild production build succeeded with the new SCSS/TS configuration.
- Next step: Migrate any existing inline styles to SCSS if needed, and start using SCSS for new components.

---

## Session 2026-04-21 — CSS Comment Standardization

- Refactored `styles.css` to follow the user's preferred commenting hierarchy from `Mb-Workspace.css`.
- Implemented high-level headers with dashes and `###` for major sections:
  - `Vaultman — Sidebar Plugin Styles`
  - `MAIN VIEW (Full-screen)`
  - `Bases attach architecture`
  - `Vaultman Sidebar — Page navigation`
  - `Main view — 3-section layout`
  - `Iter 17 — Filters header replacement + popups`
- Standardized 50+ subtitles with one-line dash-bordered separators (e.g., `/*-----------------------------BUTTONS------------------------------------*/`).
- Converted 20+ descriptive comments to ALL CAPS for better visibility.
- Verified build stability: `npm run build` returned Exit Code 0.
- **Note**: A pre-existing lint error in `svelte.config.js` persists but is unrelated to the CSS changes.
- Next step: Continue with Iteration 17 UI refinements (smooth transitions).

---

## Known placeholders (not bugs)

| Feature                               | Status                           |
| ------------------------------------- | -------------------------------- |
| Pattern-based rename substitution     | Built (Logic) - UI pending       |
| File diff view                        | Built (Logic) - UI pending       |
| Templates tab (Templater integration) | Backend hook written. UI pending |
| Add-ons FAB (Statistics center)       | Stub                             |

---

## Phase 1 Deviation Note (SCSS Refactor)

- **Status**: Retrying Phase 1 (SCSS Decomposition).
- **Issue**: Attempted to decompose `styles.css` using python array cuts by line number which resulted in syntax errors (cut-off selectors). Fallbacked to a `_legacy.scss` dump which violated the plan and spec. Did not properly apply SCSS nesting in the failed files. Left wrong formatting for headers. Did not run Linter.
- **Correction**: Redoing the decomposition correctly block by block, applying true SCSS nesting, fixing `_layout.scss` and `_virtual-list.scss` syntax, and applying 72-char strictly formatted section comment headers.

## Architectural Observations (UI Island Duplication)

- **Observation**: "Queue island" and "Filters island" are currently identical structural popup islands where only the body content changes.
- **Future Action**: They should be abstracted into a generic `PopupIsland` component to reduce CSS duplication. Additionally, they could be migrated to leverage a `serviceVirtualizer` in the future for better performance on long lists.

## Context budget notes

- **Agent Rule**: If context < 20%, update this file and switch agents BEFORE starting a new iteration.

### 2026-04-30 — Sub-A.1 closed (Tipos)
- `src/types/contracts.ts` populated (16 interfaces).
- `src/types/obsidian-extended.ts` replaces `(app as any)`.
- ADRs 001-008 written.
- Lint blocks `(app as any)` repo-wide.
- Old Part 1-8 specs archived.
- Version: 1.0.0-beta.20.
- Next: Sub-A.2.1 — factory + Files/Tags/Props indices.

### 2026-04-30 — Sub-A.2.1 closed (Factory + base indices)
- `createNodeIndex<T>` factory + tests ✓ (3/3 base indices validated).
- Files/Tags/Props indices implementing `INodeIndex<T>` without widening.
- `serviceFilter` rewritten with Svelte 5 runes (`$state`, `$derived`); implements `IFilterService`.
- `serviceQueue` updated: `add()` now synchronous (fires async in background); `addAsync()` for test awaits.
- `serviceNavigation` promoted from WIP, implements `IRouter`.
- ESLint config fixed: added Svelte rune globals ($state, $derived, $effect, etc.).
- explorerProps: removed `await` on `add()` calls (now fire-and-forget).
- Spike validated: abstraction ergonomic for all 3 base indices.
- Next: Sub-A.2.2 — Content/Operations/ActiveFilters real + CSSSnippets/Templates stubs.

### 2026-05-01 — Sub-A.2.2 closed (Remaining indices)
- `serviceContentIndex` + 9 tests ✓ (was already present from handoff).
- `serviceOperationsIndex` + 5 tests ✓ (read-only view over `IOperationQueue.pending`).
- `serviceActiveFiltersIndex` + 6 tests ✓ (flattens `FilterGroup` tree into `ActiveFilterEntry[]`).
- `serviceCSSSnippetsIndex` stub ✓ (returns empty nodes, v1.0+1 consumer).
- `serviceTemplatesIndex` stub ✓ (returns empty nodes, v1.0+1 consumer).
- All 8 indices wired in `main.ts` with initial `refresh()` on load.
- `BaseChange.id?: string` added to `typeOps.ts` (needed by `QueueChange.id` in contracts).
- Total: 140 tests passing (24 test files). Build ✅ lint ✅.
- Version: 1.0.0-beta.21.
- Next: Sub-A.3 — Primitives (BtnSquircle, Badge, Toggle, Dropdown, TextInput, HighlightText).

### 2026-05-01 — Sub-A.4.1 closed (Explorer + Virtualizer + Decoration)
- `Virtualizer<T>` generic with rune state + `TreeVirtualizer` subclass.
- `logicExplorer` + `serviceExplorer<T>` + `serviceDecorate` (IDecorationManager) all implementing contracts.
- `serviceSorting` revived with perf budget (50→150ms threshold for loaded CI).
- `viewGrid` migrated to `Virtualizer<TFile>`; replaces renderLimit+showMore with true virtual scroll.
- T33 (viewTree thin-renderer with snippets) deferred: spec spec removes virtual windowing → regression. viewTree already correct post-T30.
- ADR-011 documents decoration flow.
- 158 tests passing (28 files). Verify gate: lint(0) + check(0) + build(✓) + tests(✓).
- Version: 1.0.0-beta.22 (no bump this session — A.4 not fully closed per plan; T33 deferred).
- Next: Sub-A.4.2 — serviceOverlayState + ADR-010 + navbars + popups + tabs + explorerQueue + explorerActiveFilters.

### 2026-05-02 — Sub-A.5 closed (Settings declarative)
- `settingsVM.ts` reduced to mount/unmount bridge (28 LOC).
- `SettingsUI.svelte` declarative with primitives + autosave `$effect`. Covers all fields from `typeSettings.ts`: glassBlurIntensity (slider), defaultPropertyType, sessionFilePath, all explorer/bases/grid/contextMenu toggles+dropdowns, pageOrder (3 native selects), filterTemplates (delete list).
- `initState()` pattern avoids `state_referenced_locally` Svelte 5 warning.
- Integration test: `test/integration/settingsMigration.test.ts` — saveSettings() idempotency + required fields. Full Svelte mount round-trip deferred to E2E (harness can't easily mount Svelte components headless).
- Version: **1.0.0-rc.1**. Hardening project complete.
- Next session: smoke-test settings UI in Obsidian, push branch + tags, create GitHub Release, then PR `hardening-refactor` → `hardening` → `main`.

### 2026-05-02 — Sub-A.4.2 closed (Frame + Navbars + Popups + Tabs + ExplorerQueue + ExplorerActiveFilters)
- T35: `OverlayStateService` (IOverlayState, ADR-010) + 5 tests. Wired in `main.ts`.
- T37: `navbarPages.svelte` agnostic — consumes `TabConfig[]` + `bind:active`; pageFilters wires `FILTERS_TABS_CONFIG`.
- T38: `tabContent.svelte` rewritten — consumes `IContentIndex` via Virtualizer + TextInput + HighlightText. Wired into pageFilters as 4th tab.
- T39: `popupIsland.svelte` built from scratch (WIP was empty). Renders `IOverlayState.stack` with dynamic component mounting (Svelte 5 `{@const}` + `<Comp>`).
- T40: `explorerQueue.svelte` + `explorerActiveFilters.svelte` — virtual lists over `operationsIndex.nodes` / `activeFiltersIndex.nodes` with delete actions. Skipped ExplorerService dep (decorationManager not wired).
- T36: Frame rewrite — replaces `QueueIslandComponent` + `ActiveFiltersIslandComponent` with `overlayState.push(ExplorerQueue/ExplorerActiveFilters)`. Keeps pixel-based page transitions, DnD reorder, layoutPopup for legacy scope/search/move.
- Deleted `src/logic/logicQueue.ts` + `logicFilters.ts` (478 LOC). Updated vitest.config exclusions. ADR-009 → Superseded.
- T33 (viewTree thin-renderer with snippets) **deferred to next plan** — needs design discussion.
- 163 tests passing (29 files). Verify gate green.
- Version: **1.0.0-beta.23** tagged.
- Next: Sub-A.5 — Settings declarative (T41+).
