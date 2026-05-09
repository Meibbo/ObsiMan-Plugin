---
title: NN-4 native Obsidian surface adapter
type: implementation-plan
status: done
parent: "[[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|node-notes-next-priority]]"
created: 2026-05-09T14:58:00
updated: 2026-05-09T16:14:38
tags:
  - agent/plan
  - vaultman/node-binding
  - vaultman/native-dom
  - vaultman/hover-preview
created_by: codex
updated_by: codex
---

# NN-4 Native Obsidian Surface Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vaultman binding-note behavior to native Obsidian tag, property
tag, folder, and breadcrumb surfaces without hijacking normal clicks.

**Architecture:** Add one focused `NativeSurfaceBindingService` Obsidian
component. Pure resolver helpers identify supported native DOM surfaces and
produce `BindingNodeInput`; the component registers capture handlers, calls
`NodeBindingService.bindOrCreate(...)` only for modifier/middle clicks, and
emits public `workspace.trigger("hover-link", ...)` previews only when exactly
one binding note already exists.

**Tech Stack:** TypeScript, Obsidian `Component`, `Plugin.registerHoverLinkSource`,
`Workspace.trigger("hover-link")`, Vitest unit tests, Obsidian CLI smoke.

---

## Execution Result

Status: done 2026-05-09T16:14:38.

Outcome:

- Added `NativeSurfaceBindingService`, a focused Obsidian `Component` that
  registers `vaultman-native-surface` as a hover source and listens for native
  document `click`, `auxclick`, and `mouseover` events.
- Ctrl/Cmd/Alt/middle clicks on native tag pane rows, reading-view tags,
  metadata tag pills, CodeMirror hashtags, file-explorer folders, and
  breadcrumbs now route to `NodeBindingService.bindOrCreate(...)`.
- Normal primary clicks stay native: Vaultman only calls `preventDefault()` and
  `stopImmediatePropagation()` after a supported native surface resolves and the
  click grammar is handled.
- Hover previews use `workspace.trigger("hover-link", ...)` only when the
  native surface resolves to exactly one existing binding-note alias.

Verification:

- RED: focused unit test failed before `serviceNativeSurfaceBinding.ts` existed.
- GREEN: focused native-surface unit suite passed with 1 file and 12 tests.
- Focused native-surface plus node-binding unit suites passed with 2 files and
  28 tests.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors after independently
  confirming `pnpm exec vp lint` and `pnpm exec eslint .`.
- `pnpm run build` passed and synced Vite+ build artifacts.
- Obsidian CLI smoke passed after enabling `vaultman` in `plugin-dev`:
  `plugin:reload`, `command id=vaultman:open`, `dev:errors`, `dev:console
  level=error`, and a runtime eval confirming
  `nativeSurfaceBindingService === true`.

## Files

- Create: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/main.ts`
- Modify: `test/helpers/obsidian-mocks.ts` only if test coverage needs public
  API support for event registration or hover source registration.
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`
- Update: `.agents/docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index.md`
- Update: `.agents/docs/current/status.md`
- Update: `.agents/docs/current/handoff.md`

## Behavior Contract

- Normal primary clicks are ignored and must not call `preventDefault()`.
- A handled click is one of:
  - `MouseEvent.metaKey === true`
  - `MouseEvent.ctrlKey === true`
  - `MouseEvent.altKey === true`
  - `MouseEvent.button === 1`
- Capture handlers call `preventDefault()` and `stopImmediatePropagation()` only
  after a native surface resolves to a supported binding node.
- Supported tag selectors:
  - `.tag-pane-tag`
  - `a.tag[href^="#"]`
  - `.metadata-property[data-property-key="tags"] .multi-select-pill`
  - `span.cm-hashtag`
- Supported folder selectors:
  - `.nav-folder-title`
  - `[data-path][data-type="folder"]`
  - `.view-header-breadcrumb[data-path]`
  - `.view-header-breadcrumb-separator + .view-header-breadcrumb[data-path]`
- Folder tokens use the resolved vault folder path as the `folder` label so
  binding aliases remain stable under duplicated folder names.
- Hover previews call `workspace.trigger("hover-link", payload)` with:
  - `payload.event` as the mouse event
  - `payload.source` as `vaultman-native-surface`
  - `payload.targetEl` as the matched native element
  - `payload.linktext` as the unique matched binding note path
  - `payload.hoverParent` as the nearest workspace/native container, falling
    back to the matched element

## Task 1: Pure Native Surface Resolver

**Files:**

- Create: `src/services/serviceNativeSurfaceBinding.ts`
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing resolver tests**

Add tests proving:

```ts
resolveNativeBindingTarget(tagPaneEl).node === {
  kind: 'tag',
  label: 'project/active',
  tagPath: 'project/active',
}

resolveNativeBindingTarget(metadataTagPill).node === {
  kind: 'tag',
  label: 'project/active',
  tagPath: 'project/active',
}

resolveNativeBindingTarget(folderEl).node === {
  kind: 'folder',
  label: 'Projects/Alpha',
}
```

Also assert `null` for unrelated elements.

- [x] **Step 2: Run resolver tests and verify RED**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNativeSurfaceBinding.test.ts
```

Expected: fail because `serviceNativeSurfaceBinding.ts` does not exist.

- [x] **Step 3: Implement minimal resolver helpers**

Create:

```ts
export const NATIVE_SURFACE_HOVER_SOURCE = 'vaultman-native-surface';

export interface NativeBindingTarget {
  element: HTMLElement;
  node: BindingNodeInput;
  hoverParent: HTMLElement;
}

export function resolveNativeBindingTarget(target: EventTarget | null): NativeBindingTarget | null
```

Use `closest(...)`, `textContent`, `href`, and `dataset.path`; avoid Obsidian
`Element.find(...)` helpers inside pure code.

- [x] **Step 4: Run resolver tests and verify GREEN**

Run the same unit command. Expected: 1 file passes.

## Task 2: Click Handling Contract

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing click tests**

Add tests for an exported helper:

```ts
export async function handleNativeBindingClick(event, deps): Promise<boolean>
```

Assertions:

- normal click on a supported tag returns `false`, does not call
  `bindOrCreate`, and does not prevent default.
- Ctrl click on a supported tag returns `true`, calls `bindOrCreate` with the
  tag input, and prevents/stops native behavior.
- middle click on a supported folder returns `true`, calls `bindOrCreate` with
  the folder input, and prevents/stops native behavior.
- modifier click on an unrelated element returns `false` and leaves the event
  alone.

- [x] **Step 2: Run tests and verify RED**

Expected: fail because `handleNativeBindingClick` is missing.

- [x] **Step 3: Implement click helper**

Implement only the pure click contract. Do not register DOM events yet.

- [x] **Step 4: Run tests and verify GREEN**

Run the focused unit command. Expected: all service tests pass.

## Task 3: Hover Preview Contract

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing hover tests**

Add tests for:

```ts
export function handleNativeBindingHover(event, deps): boolean
```

Assertions:

- a tag surface with exactly one alias match triggers `workspace.trigger` with
  source `vaultman-native-surface` and the matched note path.
- zero alias matches do not trigger.
- two alias matches do not trigger.

- [x] **Step 2: Run tests and verify RED**

Expected: fail because `handleNativeBindingHover` is missing.

- [x] **Step 3: Implement hover helper**

Use `computeAliasToken(...)` and `findNotesByAlias(...)`; never call
`bindOrCreate(...)` from hover.

- [x] **Step 4: Run tests and verify GREEN**

Run the focused unit command. Expected: all service tests pass.

## Task 4: Obsidian Component Wiring

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/main.ts`
- Modify: `test/helpers/obsidian-mocks.ts` only if needed.
- Test: `test/unit/services/serviceNativeSurfaceBinding.test.ts`

- [x] **Step 1: Write failing service wiring test**

Assert a `NativeSurfaceBindingService` instance:

- registers hover source through `plugin.registerHoverLinkSource(...)`
- registers `click`, `auxclick`, and `mouseover` handlers on the document with
  capture enabled
- disposes cleanly through Obsidian `Component` lifecycle

- [x] **Step 2: Run tests and verify RED**

Expected: fail because the component class or registration details are missing.

- [x] **Step 3: Implement component**

`NativeSurfaceBindingService extends Component` and receives:

```ts
{
  plugin: Plugin;
  app: App;
  bindingService: NodeBindingService;
  doc?: Document;
}
```

`onload()` calls `plugin.registerHoverLinkSource(...)`, then registers the
document event handlers. `main.ts` constructs the service after
`nodeBindingService` and adds it as a plugin child.

- [x] **Step 4: Run tests and verify GREEN**

Run focused unit tests. Expected: all pass.

## Task 5: Verification And Records

**Files:**

- Update current plan checkboxes.
- Update node-notes priority record with NN-4 outcome and verification.
- Update current status/handoff compactly.

- [x] **Step 1: Run focused unit tests**

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNativeSurfaceBinding.test.ts test/unit/services/serviceNodeBinding.test.ts
```

- [x] **Step 2: Run broad static/build checks**

```powershell
pnpm run lint
pnpm run check
pnpm run build
```

- [x] **Step 3: Run live Obsidian smoke**

Use the existing Obsidian CLI smoke path if available:

```powershell
obsidian vault=plugin-dev plugin:reload vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Expected: plugin reloads, Vaultman opens, and `dev:errors` reports no captured
Vaultman runtime errors.

- [x] **Step 4: Run whitespace check**

```powershell
git diff --check
```

- [x] **Step 5: Update records**

Mark NN-4 done only after the commands above have fresh passing output. If live
smoke is unavailable, leave NN-4 as implemented-without-live-smoke and record
the blocker explicitly.
