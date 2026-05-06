# Vaultman SCSS Architecture Hardening (Mega Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute a professional migration of all Vaultman styles into a strict ITCSS/7-1 architecture using BEM and Obsidian native design tokens, completely eliminating inline `<style>` tags and hardcoded hex/rgb values.

**Architecture:** This is the master index for the SCSS refactor. Because the refactor touches over 5,500 lines of CSS, it is heavily sharded into phase-specific specs. Each phase spec is exhaustively detailed with exact 1-to-1 code replacements to prevent implementation hallucination.

**Tech Stack:** SCSS, Svelte, Vite, Stylelint

---

## Refactoring Shards

This refactor is divided into 5 sequential phases. **You must execute them in order.**

- [ ] **Phase 1: Base, Tokens & Mixins**
  - **Spec:** `[[docs/superpowers/plans/2026-05-06-scss-phase1-base.md]]`
  - **Scope:** Creates the single source of truth for all variables by mapping them to Obsidian's `--var` API, standardizes `_mixins.scss`, and refactors global primitives.

- [ ] **Phase 2: Svelte Components Extraction**
  - **Spec:** `[[docs/superpowers/plans/2026-05-06-scss-phase2-svelte.md]]`
  - **Scope:** Exhaustively extracts all `<style>` blocks from 10 Svelte components (Tabs, Navbar, Explorer) into dedicated BEM-compliant SCSS modules in `src/styles/components/`.

- [ ] **Phase 3: Panels and Popups Refactoring**
  - **Spec:** `[[docs/superpowers/plans/2026-05-06-scss-phase3-panels.md]]`
  - **Scope:** Translates `src/styles/panel/` and `src/styles/popup/` to use the Phase 1 tokens. Replaces all hardcoded z-indexes and background shadows with native variables.

- [ ] **Phase 4: Explorer and Data Visualization**
  - **Spec:** `[[docs/superpowers/plans/2026-05-06-scss-phase4-explorer.md]]`
  - **Scope:** Modernizes `_tree.scss`, `_grid.scss`, and filters. Converts legacy flex hacks to CSS Grid and flattens deep nesting into strict BEM.

- [ ] **Phase 5: Nav, Animations & Final ITCSS Pass**
  - **Spec:** `[[docs/superpowers/plans/2026-05-06-scss-phase5-nav.md]]`
  - **Scope:** Finishes `nav/` styles, reorders `main.scss` imports to strictly follow the 7-1 pattern, and runs the final `stylelint-scss` quality gate.

---

## Implementation Guidelines for Agents

1. **No Reasoning, Just Execution:** The linked specs contain exhaustive SCSS code blocks. Do not invent classes or tokens. Copy the code provided in the specs.
2. **Compile Often:** Run `pnpm run build` after completing every individual task in a phase to catch compilation errors early.
3. **Commit Convention:** Use `style(scss): ...` for all commits related to this mega plan.
