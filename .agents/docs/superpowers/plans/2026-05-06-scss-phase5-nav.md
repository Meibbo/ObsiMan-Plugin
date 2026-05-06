# SCSS Phase 5: Navbar, Misc, and Final Cleanup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the SCSS refactor by addressing the `src/styles/nav/` directory, resolving any lingering miscellanous components (`animation`, etc.), and performing a final linting pass with `stylelint-scss`.

**Architecture:** This phase ensures that the `main.scss` file strictly adheres to the ITCSS/7-1 folder structure order (Settings -> Tools -> Generic -> Elements -> Objects -> Components -> Utilities).

**Tech Stack:** SCSS, Stylelint

---

### Task 1: Refactor Nav Components

**Files:**
- Modify: `src/styles/nav/_tab-bar.scss`
- Modify: `src/styles/nav/_toolbar.scss`
- Modify: `src/styles/nav/_v3-nav.scss`

- [ ] **Step 1: Simplify Nav Layouts**
Convert navigation bars to use Flexbox reliably. Ensure alignments (e.g., `justify-content: space-between`, `align-items: center`) are handled via SCSS tokens or mixins if repeated.

- [ ] **Step 2: Add Obsidian Icons and Typographic Tokens**
Update the toolbar icon buttons to use Obsidian's native icon hover states (e.g., `.clickable-icon` behavior).

- [ ] **Step 3: Commit**
```bash
git add src/styles/nav/
git commit -m "style(scss): refactor nav and toolbar styles"
```

### Task 2: Finalize Main Index and Animations

**Files:**
- Modify: `src/main.scss`
- Modify: `src/styles/_animation.scss`

- [ ] **Step 1: Reorder `main.scss` Imports**
Ensure `src/main.scss` imports follow the ITCSS order:
1. `tokens` and `mixins` (via `@use`)
2. `global` and `layout`
3. `components/*` (including newly extracted ones from Phase 2)
4. `nav`, `data`, `explorer`, `panel`, `popup`

- [ ] **Step 2: Refactor Animations**
Review `_animation.scss`. Ensure keyframes and transitions are performant (animate only `transform` and `opacity`). Extract transition timings to tokens (e.g., `$vm-transition-speed: 0.2s`).

- [ ] **Step 3: Commit**
```bash
git add src/main.scss src/styles/_animation.scss
git commit -m "style(scss): finalize ITCSS import order and animations"
```

### Task 3: Setup and Run Stylelint (Final Validation)

**Files:**
- Create/Modify: `.stylelintrc.json` (if needed)

- [ ] **Step 1: Run SCSS validation**
Run the existing linter (e.g., `pnpm run lint:style` or equivalent). If none exists, advise the user to configure `stylelint-scss`.

- [ ] **Step 2: Remove dead code**
Scan for empty classes or duplicated rules that were left behind during the refactor. 

- [ ] **Step 3: Final Build and Commit**
Run `pnpm run build`. Check for successful compilation.
```bash
git commit -a -m "style(scss): final cleanup and linting pass"
```
