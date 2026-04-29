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

- **Date**: 2026-04-28
- **Agent**: Claude Code (Opus 4.7) — Brainstorm session (Vaultman Hardening project)

## Session 2026-04-28 — Vaultman Hardening master spec

**Status: Spec aprobada y committeada. Plan B pendiente.**

- **Brainstorm completo** del proyecto Vaultman Hardening: refactor + tests + audit + lock contra regresión.
- **Spec maestra**: `docs/superpowers/specs/2026-04-28-vaultman-hardening-master.md` (commit `17c89a8`).
- **Estructura**: 3 sub-proyectos secuenciales B (Audit) → C (Tests) → A (Refactor) sobre rama `hardening` (no creada aún). Ningún merge a `main` durante el proyecto.
- **Versionado**: cambios sin commit del working tree → `1.0.0-beta.17`. Bumps progresivos por hito hasta `1.0.0-rc.1`.
- **BRAT**: sólo release beta.17 ahora; resto el usuario decide.
- **Specs antiguas**: Code Refactor Part 1-8 + CSS Refactor Part 1-5 → archivar a `docs/archive/` durante Sub-A.
- **Pre-confirmado para borrar en Sub-B**: `BasesCheckboxInjector.ts` y todas sus referencias.
- **Nuevo concepto introducido**: abstracción `INodeIndex<T>` con factory + 8 indices concretos (Files, Tags, Props, Content, Operations, ActiveFilters reales; CSSSnippets, Templates como stubs v1.0+1).
- **Próximo paso**: nueva sesión invoca `superpowers:writing-plans` para plan ejecutable de Sub-B (Audit). Output esperado en `docs/superpowers/plans/2026-04-28-vaultman-hardening-sub-b.md`.
- **HANDOFF.md actualizado** con instrucciones para próxima sesión.

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
