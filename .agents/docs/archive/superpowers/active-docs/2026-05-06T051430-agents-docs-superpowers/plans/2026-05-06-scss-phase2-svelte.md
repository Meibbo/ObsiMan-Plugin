# SCSS Phase 2: Svelte Components to SCSS Extraction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exhaustively extract inline `<style>` blocks from 10 Svelte components into dedicated SCSS modules within `src/styles/components/`. We will use BEM and `_tokens.scss`.

**Architecture:** Svelte scoped styles are moving to global SCSS for easier maintenance.

**Tech Stack:** SCSS, Svelte, Vite

---

### Task 1: Extract Layout & Navbar Styles

**Files:**
- Modify: `src/components/layout/navbarPillFab.svelte`
- Modify: `src/components/layout/navbarTabs.svelte`
- Create: `src/styles/components/_navbar.scss`

- [ ] **Step 1: Create `_navbar.scss`**
Create `src/styles/components/_navbar.scss` with the extracted exact styles using BEM and SCSS Tokens:

```scss
@use "../tokens" as *;

.vm-nav-expand-trigger {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  pointer-events: auto;
  z-index: $vm-z-index-popup;

  &:focus-visible {
    outline: 2px solid $vm-color-accent;
    outline-offset: -2px;
    border-radius: $vm-radius-m;
  }
}

.vm-tab {
  &.is-disabled {
    cursor: default;
    pointer-events: none;
  }
  &.is-faint {
    opacity: 0.45;
  }
}
```

- [ ] **Step 2: Clean up Svelte files**
Remove the `<style>` block entirely from `src/components/layout/navbarPillFab.svelte` (lines 169-188) and `src/components/layout/navbarTabs.svelte` (lines 62-70).

---

### Task 2: Extract Tab Content Styles

**Files:**
- Modify: `src/components/pages/tabContent.svelte`
- Modify: `src/components/pages/tabFiles.svelte`
- Modify: `src/components/pages/tabProps.svelte`
- Modify: `src/components/pages/tabTags.svelte`
- Create: `src/styles/components/_tabs.scss`

- [ ] **Step 1: Create `_tabs.scss`**
Create `src/styles/components/_tabs.scss`:

```scss
@use "../tokens" as *;

// Shared tab flex containers
.vm-files-tab-content,
.vm-props-tab-content,
.vm-tags-tab-content,
.vm-content-tab {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.vm-content-tab { height: 100%; gap: 8px; }

.vm-content-fnr {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 0 auto;
  padding: 8px;
  border: $vm-border-width solid $vm-border-color;
  border-radius: 8px;
  background: color-mix(in srgb, $vm-bg-secondary 88%, transparent);

  &-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  
  &-input {
    flex: 1;
    min-width: 0;
    height: 26px;
    padding: 0 8px !important;
    border: $vm-border-width solid $vm-border-color !important;
    border-radius: 6px !important;
    background: $vm-bg-primary !important;
    color: $vm-text-normal;
    font-size: var(--font-ui-smaller);
    box-shadow: none !important;
  }
  
  &-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
    border: none;
    background: transparent;
    color: $vm-text-muted;
    cursor: pointer;
    padding: 0;
    
    :global(svg) { width: 15px; height: 15px; }
  }

  &-help {
    position: absolute;
    top: 34px;
    right: 8px;
    z-index: 130;
    min-width: 180px;
    padding: 5px;
    border: $vm-border-width solid $vm-border-color;
    border-radius: 8px;
    background: $vm-bg-secondary;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
    
    &-link {
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 24px;
      padding: 3px 7px;
      border-radius: 5px;
      color: $vm-text-muted;
      font-size: var(--font-ui-smaller);
      text-decoration: none;
      
      &:hover { background: $vm-bg-modifier-hover; color: $vm-text-normal; }
    }
  }

  &-options { flex-wrap: wrap; }
  
  &-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: $vm-text-muted;
    font-size: var(--font-ui-smaller);
    white-space: nowrap;
  }
  
  &-footer { justify-content: space-between; align-items: center; }
  
  &-scope {
    display: inline-flex;
    gap: 3px;
    padding: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, $vm-bg-primary 80%, transparent);
    
    &-pill {
      min-height: 20px;
      padding: 0 6px;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: $vm-text-muted;
      font-size: 10px;
      cursor: pointer;
      
      &.is-active { background: $vm-color-accent; color: $vm-text-on-accent; }
    }
    
    &-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      color: $vm-text-muted;
      font-size: var(--font-ui-smaller);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  &-queue {
    min-height: 24px;
    padding: 0 8px;
    border: $vm-border-width solid $vm-border-color;
    border-radius: 6px;
    background: $vm-color-accent;
    color: $vm-text-on-accent;
    font-size: var(--font-ui-smaller);
    cursor: pointer;
    white-space: nowrap;
    
    &:disabled {
      cursor: default;
      opacity: 0.45;
      background: $vm-bg-modifier-border;
      color: $vm-text-muted;
    }
  }
}

.vm-content-empty {
  color: $vm-text-muted;
  font-size: 0.8em;
  padding: 8px 4px;
}
```

- [ ] **Step 2: Clean Svelte files**
Delete `<style>` blocks from `tabContent.svelte` (lines 222-349), `tabFiles.svelte` (lines 64-72), `tabProps.svelte` (lines 55-63), and `tabTags.svelte` (lines 55-63).

---

### Task 3: Extract Explorers & Views Styles

**Files:**
- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `src/components/explorers/explorerActiveFilters.svelte`
- Modify: `src/components/primitives/IndicatorOrbitingInk.svelte`
- Modify: `src/components/views/viewEmptyLanding.svelte`
- Create: `src/styles/components/_explorer-ui.scss`

- [ ] **Step 1: Create `_explorer-ui.scss`**
Create `src/styles/components/_explorer-ui.scss`:

```scss
@use "../tokens" as *;

/* panelExplorer & activeFilters */
.vm-panel-explorer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.vm-active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: $vm-border-width solid $vm-border-color;
  background: $vm-bg-secondary;
}

.vm-active-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: $vm-bg-primary;
  border: $vm-border-width solid $vm-border-color;
  border-radius: $vm-radius-s;
  font-size: var(--font-ui-smaller);
  color: $vm-text-muted;
}

.vm-active-filter-remove {
  cursor: pointer;
  color: $vm-text-faint;
  &:hover { color: $vm-text-normal; }
}

/* viewEmptyLanding */
.vm-empty-landing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 160px;
  height: 100%;
  padding: 24px;
  color: $vm-text-muted;
  text-align: left;
  
  &-indicator { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: 0 0 auto; }
  &-icon {
    display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex: 0 0 auto; color: $vm-text-accent;
    :global(svg) { width: 22px; height: 22px; }
  }
  &-copy { display: flex; flex-direction: column; gap: 4px; max-width: 280px; }
  h3 { margin: 0; color: $vm-text-normal; font-size: 14px; font-weight: 600; line-height: 1.3; }
  p { margin: 0; font-size: 12px; line-height: 1.4; }
}

/* IndicatorOrbitingInk */
.vm-indicator-orbiting-ink {
  width: var(--indicator-size);
  height: var(--indicator-size);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: $vm-bg-primary;
  filter: contrast(20);
  overflow: hidden;
  border-radius: 50%;
}

.gooey-container { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.gooey-blob { background-color: var(--indicator-color); position: absolute; filter: blur(10px); border-radius: 50%; }

@keyframes orbit-blob {
  0% { transform: rotate(0deg) translateX(calc(var(--indicator-size) * 0.2)) rotate(0deg); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
  100% { transform: rotate(360deg) translateX(calc(var(--indicator-size) * 0.2)) rotate(-360deg); border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
}
@keyframes pulse-blob {
  0%, 100% { transform: scale(1); border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
  50% { transform: scale(1.2); border-radius: 60% 40% 30% 70% / 50% 60% 30% 60%; }
}

.anim-orbit { animation: orbit-blob 4s linear infinite; }
.anim-pulse { animation: pulse-blob 3s ease-in-out infinite; }

.blob-1 { width: calc(var(--indicator-size) * 0.3); height: calc(var(--indicator-size) * 0.3); animation-duration: 3s; }
.blob-2 { width: calc(var(--indicator-size) * 0.25); height: calc(var(--indicator-size) * 0.25); animation-duration: 4s; animation-direction: reverse; }
.blob-center { width: calc(var(--indicator-size) * 0.35); height: calc(var(--indicator-size) * 0.35); position: relative; }
```

- [ ] **Step 2: Clean Svelte files**
Remove all `<style>` tags from the 4 Svelte files listed above.

---

### Task 4: Hook Up to Main

**Files:**
- Modify: `src/main.scss`

- [ ] **Step 1: Import Components**
At the bottom of `src/main.scss`, add:
```scss
@use "components/navbar";
@use "components/tabs";
@use "components/explorer-ui";
```

- [ ] **Step 2: Verify & Commit**
```bash
pnpm run build
git add src/components/ src/styles/
git commit -m "style(scss): exhaustively extract all svelte styles into BEM SCSS"
```
