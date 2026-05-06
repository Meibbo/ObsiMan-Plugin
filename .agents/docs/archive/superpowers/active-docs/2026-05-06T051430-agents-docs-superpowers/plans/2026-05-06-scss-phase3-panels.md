# SCSS Phase 3: Panels and Popups Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `src/styles/panel/` and `src/styles/popup/` SCSS directories. These files currently contain many hardcoded values and deep nesting. We will flatten the specificity and apply the central tokens and Obsidian native variables.

**Architecture:** Use BEM block/element/modifier to keep nesting strictly under 3 levels. Ensure Obsidian CSS variables are used for all background and text colors.

**Tech Stack:** SCSS

---

### Task 1: Refactor Panel SCSS (Ops, Diff, Query)

**Files:**
- Modify: `src/styles/panel/_ops.scss`
- Modify: `src/styles/panel/_diff.scss`
- Modify: `src/styles/panel/_query.scss`
- Modify: `src/styles/panel/_context.scss`

- [ ] **Step 1: Audit and Replace Hardcoded Values**
Search for hex codes (`#1a1a1a`, `#ffffff`), rgb values, and hardcoded `px` sizes in these files.
Replace them with tokens from `_tokens.scss` or direct Obsidian variables (`var(--background-secondary)`).

- [ ] **Step 2: Flatten Nesting (Max 3 levels)**
Check for deep SCSS nesting (e.g., `.panel { .container { .header { .title { ... } } } }`).
Refactor to use BEM (e.g., `.vm-panel__title`).

- [ ] **Step 3: Test Panel UI**
Render the Panel UI in the Obsidian dev environment to ensure no layout breakages occurred.

- [ ] **Step 4: Commit**
```bash
git add src/styles/panel/
git commit -m "style(scss): refactor panel styles to use tokens and BEM"
```

### Task 2: Refactor Popup SCSS (Island, Sort, Viewdiff)

**Files:**
- Modify: `src/styles/popup/_island.scss`
- Modify: `src/styles/popup/_sort.scss`
- Modify: `src/styles/popup/_viewdiff.scss`
- Modify: `src/styles/popup/_v3-popups.scss`

- [ ] **Step 1: Simplify Z-index and Positioning**
Popups often have tricky `z-index` and `position: absolute` rules. Ensure `z-index` values are extracted to tokens (e.g., `$z-index-popup: 100;`) in `_tokens.scss` to avoid overlap issues.

- [ ] **Step 2: Apply Obsidian Border and Shadow Variables**
Obsidian provides native variables for borders and shadows (e.g., `var(--border-color)`, `box-shadow: var(--shadow-s)`). Apply these to the popup containers so they look native to Obsidian.

- [ ] **Step 3: Flatten Nesting and Consolidate Classes**
As with Task 1, flatten deep nesting and remove redundant or unused classes.

- [ ] **Step 4: Commit**
```bash
git add src/styles/popup/ src/styles/_tokens.scss
git commit -m "style(scss): refactor popup styles with native shadows and z-index tokens"
```
