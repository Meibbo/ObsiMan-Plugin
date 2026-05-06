# SCSS Phase 4: Explorer and Data Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `src/styles/explorer/` and `src/styles/data/` directories. These core components (Grids, Cards, Trees, Filters) contain complex visual logic that must be simplified using CSS Grid/Flexbox modern standards, and integrated with Obsidian variables.

**Architecture:** We will focus heavily on responsive layout primitives and reducing CSS bloat in complex UI trees like the file explorer.

**Tech Stack:** SCSS

---

### Task 1: Refactor Data Visualization (Grid, Cards, Filters)

**Files:**
- Modify: `src/styles/data/_grid.scss`
- Modify: `src/styles/data/_cards.scss`
- Modify: `src/styles/data/_filter.scss`
- Modify: `src/styles/data/_file.scss`

- [ ] **Step 1: Modernize Grid/Flex Layouts**
Audit `_grid.scss` and `_cards.scss`. Ensure `display: grid` with `gap` is preferred over old flexbox margin-hacks.
Extract spacing values to use spacing tokens (e.g., `gap: $vm-spacing-m;`).

- [ ] **Step 2: Consolidate Filter and File Styles**
Ensure `_filter.scss` and `_file.scss` use Obsidian typography variables (`var(--text-normal)`, `var(--font-ui-small)`).

- [ ] **Step 3: Flatten Nesting**
Refactor deeply nested rules into flat BEM block/element rules.

- [ ] **Step 4: Commit**
```bash
git add src/styles/data/
git commit -m "style(scss): modernize data grids, cards, and filters"
```

### Task 2: Refactor Explorer Components (Tree, Filters, Navigation)

**Files:**
- Modify: `src/styles/explorer/_tree.scss`
- Modify: `src/styles/explorer/_active-filters.scss`
- Modify: `src/styles/explorer/_nav.scss`
- Modify: `src/styles/explorer/_structure.scss`
- Modify: `src/styles/explorer/_search.scss`

- [ ] **Step 1: Simplify Tree Rendering**
The file explorer tree (`_tree.scss`) often has complex padding/margin logic to simulate indentation. Standardize indentation using a CSS variable (e.g., `--tree-indent: 1.5rem`) so it can be easily adjusted.

- [ ] **Step 2: Add Obsidian Interactive States**
Ensure the explorer items use the interactive hover mixin created in Phase 1, mimicking Obsidian's native file explorer highlight behavior (`var(--nav-item-background-hover)`).

- [ ] **Step 3: Test and Build**
Ensure no breaking changes to the explorer tree rendering. Test scrolling and selection states visually if possible.

- [ ] **Step 4: Commit**
```bash
git add src/styles/explorer/
git commit -m "style(scss): refactor explorer tree styles and active filters"
```
