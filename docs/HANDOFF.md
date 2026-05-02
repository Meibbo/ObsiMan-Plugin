# HANDOFF — Vaultman Next Session

> Updated: 2026-05-02 | From: ChatGPT Codex → Next agent
> Branch: `hardening-refactor` | Version: `1.0.0-rc.1`
> `pnpm run verify` green; Obsidian reload/settings/queue island smoke green.

---

## Most recent session (Codex, 2026-05-02 — Sub-A island runtime closure)

### ✅ Fixed in this turn

1. **Queue island opens again** — `frameVaultman.svelte` had a tab-change `$effect` that called `closeQueueIsland()` / `closeFiltersIsland()`. Those methods read `overlayState.stack` through `popById()`, so every `overlayState.push()` was captured as a dependency and immediately closed the island. The close calls now run inside `untrack()`.
2. **PopupIsland regression test added** — `test/component/popupIsland.test.ts` mounts `PopupIsland` with a real Svelte child component (`PopupIslandChild.svelte`) and asserts both `.vm-popup-island` and child content render.

### Verify status

- `pnpm run verify` → green:
  - lint 0 errors / 4 pre-existing warnings
  - svelte-check 0 errors / 0 warnings
  - build OK
  - unit 167/167
  - component 4/4
- Obsidian smoke:
  - plugin reload OK
  - settings tab mounts: `{"settingsUI":true}`
  - queue FAB opens: `{"queueStack":1,"queueIsland":true,"queueChild":true}`
  - `dev:errors` clean after clearing transient ResizeObserver loop notifications

### Next

1. Commit closure.
2. Push `hardening-refactor` + rc.1 tag if release flow is desired.
3. Open PR `hardening-refactor` → `hardening`, then proceed to `main` after review.
4. Start Polish plan after hardening is published/merged.

---

## Previous session (Opus 4.7, 2026-05-02 PM #2 — partial fix, blocker resolved by Codex)

### ✅ Fixed in this turn
1. **Pill blur restored** — Vite+'s esbuild CSS minifier was dropping the unprefixed `backdrop-filter` declaration when both prefixed and unprefixed appeared. Set `build.cssTarget: ['chrome120']` and `build.cssMinify: 'esbuild'` in `vite.config.ts`. Compiled `styles.css` now keeps `backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px);` for `.vm-nav-pill`. Verified live: `getComputedStyle(.vm-nav-pill).backdropFilter === 'blur(22px)'`.
2. **`.vm-island-backdrop` rising-glass design restored** — my earlier turn redefined `.vm-island-backdrop` in `_islands.scss` (opaque rectangle, `z-index: 35`), which overrode the original masked `::before` blur in `_v3-nav.scss:61`. Reverted: `_islands.scss` now contains a comment pointing to `_v3-nav.scss` and only keeps `.vm-popup-island` / `.vm-popup-island-entry` rules (those classes are unique to `popupIsland.svelte`).

### ❌ Still blocking — islands DO NOT open

Repro:
```powershell
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="(async()=>{const ws=app.workspace;let l=ws.getLeavesOfType('vm-frame')[0]||ws.getRightLeaf(true);await l.setViewState({type:'vm-frame',active:true});ws.revealLeaf(l);await new Promise(r=>setTimeout(r,1000));l.view.contentEl.querySelector('.vm-nav-fab').click();})()"
obsidian vault=plugin-dev dev:errors
```

`dev:errors` shows on every push:
```
Uncaught TypeError: t is not a function
    at eval (plugin:vaultman:7:41103)
    ...stack inside Svelte runtime (xn/jn/ei/...) — looks like the each-block of popupIsland.svelte blowing up while mounting <Comp {...props} />.
```

DOM probe after `plugin.overlayState.push({id:'queue', component: ExplorerQueueComp, props})` (or even a fake `function noop(){return {}}` component) shows that the `{#if overlayState.stack.length > 0} <div class="vm-popup-island">` never appears in `.vm-pages-viewport` — only `.vm-page-container`, `.vm-island-backdrop`, `.vm-bottom-nav` are rendered. Stack length goes to 1 in JS, but Svelte 5 does not flush the conditional render — the runtime error aborts the effect graph.

**Hypothesis** for the next agent: Svelte 5's compiled output for the dynamic-component-with-spread pattern in [popupIsland.svelte:23](src/components/layout/popupIsland.svelte:23):
```svelte
{#each overlayState.stack as entry (entry.id)}
  {@const Comp = entry.component as Component<Record<string, unknown>>}
  <div ...>
    <Comp {...(entry.props ?? {})} />
  </div>
{/each}
```
emits `(e, t) => { t(e, props_fn) }` where `t` ends up being the entry's component reference. If the component is somehow reaching the runtime as a plain object (not a function), `t(e, ...)` throws. But CLI test pushed `function noop(){return {}}` and it ALSO failed — so the caller-shape might not be the issue.

Recommended next steps:
1. Open `src/components/layout/popupIsland.svelte` and try replacing the `{@const Comp = entry.component} <Comp {...props} />` pattern with a plain `<svelte:component this={entry.component} />`-equivalent or imperative `mount()` inside an effect. Svelte 5 doc: see `mcp__svelte__svelte-autofixer` on the file first.
2. Look up the Svelte 5 changelog around v5.55 (current dep) for any regression in dynamic-component spread.
3. Confirm `entry.component` arrives as a function via `console.log(typeof entry.component, entry.component)` inside the each block.

### ❌ Other regressions reported by user (not investigated this turn)
- **`tabContent` empty / `NavbarExplorer` hidden** — DOM probe shows `.vm-tab-content` exists with `childCount: 2` and `innerHTML.length: 5145` but `offsetHeight: 0, offsetWidth: 0`. CSS layout collapse, not missing markup. May be related to `flex: 1` not propagating from a parent with `display` not flex or zero size. Needs git-bisect against last known good commit (suggest `0dd241c` Sub-A.4.2 close).
- **`NavbarExplorer` not visible** — only on filters page; if active page is `'ops'` (default), it's correctly absent. User should confirm by switching to filters tab.
- **`serviceDecorate` not acting on nodes** — pre-existing deferred work from Sub-A.4.2 ("decorationManager NOT wired in main.ts"). Not a regression from recent sessions; resolve by wiring `IDecorationManager` in main.ts and into `ExplorerService`.

### Verify status
- `pnpm run lint` → 4 warnings / 0 errors (pre-existing).
- `pnpm run check` → 0 errors / 0 warnings.
- `pnpm run build` → OK.
- `pnpm run test:unit` → 167/167.
- `pnpm run test:component` → 3/3 (component lane added in earlier turn).

### Open question for next agent
Should `<PopupIsland>` be moved back outside `.vm-pages-viewport` to its original location (a sibling of `.vm-view`)? My move was speculative for absolute positioning. The runtime error happens regardless of placement.

---

## Earlier same-day session (Opus 4.7, 2026-05-02 PM #1)

### Fix — islands not opening (Sub-A.4.2 visual regression)

`popupIsland.svelte` rendered with classes `.vm-popup-island` / `.vm-popup-island-entry` and the `.vm-island-backdrop` toggle had **no SCSS rules** at all. Result: `overlayState.push()` mounted the popup, but it was invisible (no positioning, no z-index, no transition).

Fixes in this session:

- `src/styles/popup/_islands.scss`: added rules for `.vm-island-backdrop` (absolute fill, opacity transition, `is-open` activates pointer events), `.vm-popup-island` (absolute wrapper above bottom nav, z-index 40, `pointer-events: none`), `.vm-popup-island-entry` (centered, max-width 420px, spring entry animation, `pointer-events: auto`).
- `src/components/frameVaultman.svelte`: moved `<PopupIsland>` inside `.vm-pages-viewport` (sibling of `.vm-island-backdrop`) so the absolute positioning attaches to the positioned ancestor.

### Regression test lane (jsdom component project)

Added a Vitest project named `component` so future Svelte runtime loops surface in CI rather than only in manual Obsidian smoke.

- `vitest.config.ts`: new project with `environment: 'jsdom'`, `resolve.conditions: ['browser']`, `obsidian` aliased to the existing mock.
- `package.json`: new `test:component` script; `verify` now runs `lint → check → build → test:unit → test:component`.
- `test/helpers/dom-obsidian-polyfill.ts`: polyfills Obsidian's element helpers (`addClass / removeClass / toggleClass / empty / createEl / createDiv / createSpan / setText`) on `Element.prototype` so jsdom mounts work.
- `test/component/settingsUI.test.ts`: mounts `SettingsUI.svelte` with a fake plugin (DEFAULT_SETTINGS, `vi.fn()` for `saveSettings` and `updateGlassBlur`) and asserts:
  - `.vm-settings` root renders.
  - `saveSettings` and `updateGlassBlur` are NOT called during mount.
  - `plugin.settings` is not mutated during mount.
  - If a blanket `$effect` autosave is reintroduced, Svelte throws `effect_update_depth_exceeded` inside `flushSync()` and the suite fails naturally.
- `test/unit/services/serviceOverlayState.test.ts`: added no-op assertions (`pop` on empty, `popById('missing')`, `clear` on empty preserve array identity; `popById('queue')` removes only the queue entry).

Frame smoke (`frameVaultman.svelte`) NOT landed — frame requires deep mocks for `queueService`, `filterService`, every node index, and ResizeObserver. SettingsUI + OverlayState cover the recently broken surface; revisit if the frame regresses again.

### Verify
- `pnpm run verify` → lint 4 warn / 0 err (pre-existing), svelte-check 0/0, vp build 16s, test:unit 167/167, test:component 3/3.
- `obsidian plugin:reload id=vaultman` → reloaded; `dev:errors` → `No errors captured`.

---

## Previous session — ChatGPT Codex

> Context warning: previous session ended with ~8% context. Start fresh: read `AGENTS.md`, this file, and `docs/Vaultman - Agent Memory.md`.

---

## Current Status

Hard production-build migration to **Vite+** is complete and smoke-tested.

Toolchain architecture now:

- Package manager: `pnpm@10.29.2` (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Build/test runner: `vp` from local `vite-plus@0.1.20`.
- Vite/Rolldown through Vite+:
  - `vite v8.0.10`
  - `rolldown v1.0.0-rc.17`
  - `vitest v4.1.5`
  - `oxlint v1.61.0`
- Lint architecture:
  - `pnpm run lint` = `vp lint && eslint .`
  - `vp lint` covers fast Oxlint checks.
  - `eslint .` still required for Obsidian-specific rules and type-aware TypeScript rules.

Verification already passed:

```powershell
pnpm run verify
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="app.commands.executeCommandById('vaultman:open'); 'opened'"
obsidian vault=plugin-dev eval code="app.setting.open(); app.setting.openTabById('vaultman'); JSON.stringify({settingsUI: !!app.setting.activeTab?.containerEl?.querySelector('.vm-settings')})"
obsidian vault=plugin-dev dev:errors
```

Last `dev:errors` result: `No errors captured`.

Do **not** assume old notes about the Sub-A.5 settings loop are still current. That bug was fixed.

---

## What Changed In Last Session

### Vite+ Production Migration

- Installed local `vite-plus@0.1.20`.
- Added `packageManager: pnpm@10.29.2`.
- Added `vite.config.ts`.
- Added `src/pluginEntry.ts`.
- Production build now runs:

```powershell
pnpm run build
# tsc -noEmit -skipLibCheck && vp build && node scripts/sync-test-build.mjs
```

- `vp build` outputs:
  - `dist/vite/main.js`
  - `dist/vite/styles.css`
- `scripts/sync-test-build.mjs` copies:
  - `dist/vite/main.js` → plugin root `main.js`
  - `dist/vite/styles.css` → plugin root `styles.css`
  - root `manifest.json`, `main.js`, `styles.css` → `dist/build`
- CI now uses `voidzero-dev/setup-vp@v1`, `vp install`, and `vp run ...`.

Important: `styles.css` is still generated output. Edit SCSS under `src/styles/**/*.scss`, not `styles.css`.

### Svelte Runtime Loop Fixes

Fixed `effect_update_depth_exceeded` from two causes:

1. `SettingsUI.svelte`
   - Removed blanket `$effect` autosave.
   - Settings now persist from explicit `onChange` / `onInput` handlers.
   - `saveSettings()` is no longer called during initial mount.

2. `OverlayStateService`
   - `pop()`, `popById()`, and `clear()` now no-op when the stack would not change.
   - Root cause: `frameVaultman.svelte` has an effect that calls `closeQueueIsland()` / `closeFiltersIsland()`. Previously `popById("queue")` always assigned a new array even when `"queue"` was absent, causing the effect to read and write the same rune-backed state forever.

Also updated:

- `src/components/primitives/Dropdown.svelte`
- `src/components/primitives/Toggle.svelte`

Both now have reliable `onChange` callbacks.

---

## Why Tests Missed The Runtime Bug

Current automated tests are mostly logic/service tests. They did not mount the real Svelte frame/settings components in a DOM lifecycle.

Gaps:

- `test:unit` runs in Node environment.
- `vitest.config.ts` explicitly excludes `**/*.svelte` from coverage.
- No `jsdom` or Vitest browser-mode component project exists.
- `SettingsUI.svelte` was not mounted in a test.
- `frameVaultman.svelte` was not mounted in a test.
- `serviceOverlayState.test.ts` did not assert no-op mutation identity / no-op behavior.
- `svelte-check` cannot catch reactive runtime loops. The code was type-correct.

Obsidian CLI caught it because it exercised the real plugin lifecycle.

---

## Next Agent Task: Add Regression Tests For Svelte Runtime Loops

Goal: catch `effect_update_depth_exceeded` before manual Obsidian smoke.

Use skills:

- `svelte-code-writer`
- `svelte-core-bestpractices`
- `obsidian-cli` if doing smoke

Run Svelte autofixer for any touched `.svelte` file:

```powershell
npx @sveltejs/mcp svelte-autofixer .\path\to\Component.svelte --svelte-version 5
```

### Step 1 — Strengthen Overlay Service Tests

File:

- `test/unit/services/serviceOverlayState.test.ts`

Add tests:

- `pop()` on empty stack keeps stack empty and does not create a new stack value.
- `popById("missing")` does not change stack when id is absent.
- `clear()` on empty stack does not create a new stack value.
- `popById("queue")` removes the queue entry when present.
- Optional: use `flushSync` from `svelte` if the existing tests use rune flush semantics.

Reason: this would have caught the frame loop root cause.

### Step 2 — Add Component Test Lane

Preferred first pass: `jsdom`, not browser mode. Lower setup cost.

Install:

```powershell
pnpm add -D jsdom
```

Update `vitest.config.ts`:

- Add a third project named `component`.
- Use `plugins: [svelte()]`.
- Use `environment: 'jsdom'`.
- Include `test/component/**/*.test.ts`.
- Alias `obsidian` to `test/helpers/obsidian-mocks.ts`.
- For Vitest/Svelte docs, use `resolve.conditions = ['browser']` if needed.

Update `package.json`:

```json
"test:component": "vp test run --project component --config vitest.config.ts",
"verify": "pnpm run lint && pnpm run check && pnpm run build && pnpm run test:unit && pnpm run test:component"
```

### Step 3 — Add SettingsUI Mount Test

New file suggestion:

- `test/component/settingsUI.test.ts`

Test shape:

```ts
import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import SettingsUI from '../../src/components/settings/SettingsUI.svelte';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

function makePlugin() {
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    updateGlassBlur: vi.fn(),
  };
}

test('mounts without autosave loop', () => {
  const target = document.createElement('div');
  document.body.append(target);
  const plugin = makePlugin();

  const component = mount(SettingsUI, { target, props: { plugin } });
  flushSync();

  expect(target.querySelector('.vm-settings')).not.toBeNull();
  expect(plugin.saveSettings).not.toHaveBeenCalled();

  unmount(component);
  target.remove();
});
```

If `activeDocument` is missing in jsdom, set it in test setup:

```ts
vi.stubGlobal('activeDocument', document);
```

### Step 4 — Add Frame Mount Smoke Test

New helper:

- `test/helpers/mockVaultmanPlugin.ts`

The frame needs a broad plugin surface. Keep the mock minimal, but realistic.

Minimum fields likely needed:

- `app`
  - from `mockApp()`
  - add `metadataCache.off` if absent
  - add `workspace.getLeavesOfType`, `workspace.getLeftLeaf`, `workspace.getRightLeaf`, `workspace.getLeaf`, `workspace.revealLeaf` if frame calls them
- `settings`
- `queueService`
- `filterService`
- `overlayState`
- `filesIndex`, `tagsIndex`, `propsIndex`, `contentIndex`, `operationsIndex`, `activeFiltersIndex`
- `propertyIndex`
- `iconicService` if rendered paths use it

New file suggestion:

- `test/component/frameVaultman.test.ts`

Test:

- mount `frameVaultman.svelte`
- `flushSync()`
- assert `.vm-view` exists
- fail naturally if Svelte throws `effect_update_depth_exceeded`

This test would have caught the `closeQueueIsland()` + `popById()` loop.

### Step 5 — Optional Obsidian CLI Smoke Script

After component tests exist, keep manual smoke but make it scriptable.

Potential script:

- `scripts/smoke-obsidian.mjs`

Commands:

```powershell
obsidian vault=plugin-dev dev:errors clear
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="app.commands.executeCommandById('vaultman:open'); 'opened'"
obsidian vault=plugin-dev eval code="app.setting.open(); app.setting.openTabById('vaultman'); JSON.stringify({settingsUI: !!app.setting.activeTab?.containerEl?.querySelector('.vm-settings')})"
obsidian vault=plugin-dev dev:errors
```

Expected final output: `No errors captured`.

Do not add this to CI unless CI has Obsidian available. Keep it local/manual or as `pnpm run smoke:obsidian`.

---

## Important Current Working Tree Notes

Expected modified/new files from last session include:

- `.github/workflows/ci.yml`
- `eslint.config.mts`
- `package-lock.json`
- `package.json`
- `scripts/sync-test-build.mjs`
- `src/pluginEntry.ts`
- `vite.config.ts`
- `src/components/primitives/Dropdown.svelte`
- `src/components/primitives/Toggle.svelte`
- `src/components/settings/SettingsUI.svelte`
- `src/services/serviceOverlayState.svelte.ts`
- `styles.css` generated by build
- `tsconfig.json`
- `docs/HANDOFF.md`
- `docs/Vaultman - Agent Memory.md`

There is also `.codex/` untracked from local tool use. Do not commit it unless user explicitly wants that.

`src/logic/logicQueue.ts` was an untracked resurrected legacy file and was removed. Handoff/memory from Sub-A.4.2 said it was intentionally deleted.

---

## Commands To Run Before Final

```powershell
pnpm run verify
obsidian vault=plugin-dev dev:errors clear
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="app.commands.executeCommandById('vaultman:open'); 'opened'"
obsidian vault=plugin-dev eval code="app.setting.open(); app.setting.openTabById('vaultman'); JSON.stringify({settingsUI: !!app.setting.activeTab?.containerEl?.querySelector('.vm-settings')})"
obsidian vault=plugin-dev dev:errors
```

Expected:

- `pnpm run verify` green.
- settings eval includes `"settingsUI":true`.
- `dev:errors` says `No errors captured`.

---

## Rules For Next Agent

- Read `AGENTS.md` first.
- Read ADRs before touching `src/services/` or `src/types/`.
- Use `apply_patch` for edits.
- Use PowerShell `;`, not `&&`.
- Do not edit `styles.css` manually.
- Do not reintroduce blanket `$effect` autosave.
- Any service method called from a `$effect` must be idempotent for no-op calls.
- If context <20%, stop and update this handoff before continuing.


