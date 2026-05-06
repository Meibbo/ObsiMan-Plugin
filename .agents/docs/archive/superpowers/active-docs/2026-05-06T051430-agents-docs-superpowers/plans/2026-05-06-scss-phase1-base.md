# SCSS Phase 1: Base, Tokens & Mixins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a robust ITCSS/7-1 SCSS architecture for the base layers (`_tokens.scss`, `_mixins.scss`, and `_global.scss`). We will centralize design tokens around Obsidian's native CSS variables and refactor global utilities.

**Architecture:** 
- The `_tokens.scss` file will be the Single Source of Truth for all colors, borders, and z-indexes, mapped directly to Obsidian native `--var` properties.
- The `_mixins.scss` file will export reusable BEM utilities (truncation, glassmorphism, flex-centers).
- `_global.scss` will implement `.vm-` prefixed utility classes and generic base styles using ONLY the imported tokens and mixins.

**Tech Stack:** SCSS, Obsidian Plugin API

---

### Task 1: Consolidate Obsidian Native Tokens (`_tokens.scss`)

**Files:**
- Modify: `src/styles/_tokens.scss`

- [ ] **Step 1: Replace `_tokens.scss` content with exhaustive variables**

Open `src/styles/_tokens.scss` and completely replace its contents with this exhaustive list of Obsidian-mapped variables. Notice how we categorize them into Themes, Typography, Interactive, and specific Vaultman primitives.

```scss
//********************************************************************\\
//*   .-/Made by Meibbo\-.  .-|Vaultman v1.0.0|-.  .-/April 2026\-.  *\\
//********************************************************************\\

// --- 1. THEME & BACKGROUNDS ---
$vm-bg-primary: var(--background-primary);
$vm-bg-secondary: var(--background-secondary);
$vm-bg-modifier-hover: var(--background-modifier-hover);
$vm-bg-modifier-active-hover: var(--background-modifier-active-hover);
$vm-bg-modifier-border: var(--background-modifier-border);

// --- 2. TYPOGRAPHY & COLORS ---
$vm-text-normal: var(--text-normal);
$vm-text-muted: var(--text-muted);
$vm-text-faint: var(--text-faint);
$vm-text-accent: var(--text-accent);
$vm-text-on-accent: var(--text-on-accent);

// --- 3. INTERACTIVE & ACCENTS ---
$vm-color-accent: var(--interactive-accent);
$vm-color-accent-hover: var(--interactive-accent-hover);
$vm-interactive-normal: var(--interactive-normal);
$vm-interactive-hover: var(--interactive-hover);

// --- 4. BORDERS & SHADOWS ---
$vm-border-width: var(--border-width);
$vm-border-color: var(--background-modifier-border);
$vm-shadow-s: var(--shadow-s);
$vm-shadow-l: var(--shadow-l);
$vm-radius-s: var(--radius-s);
$vm-radius-m: var(--radius-m);

// --- 5. VAULTMAN SPECIFIC EXTENSIONS ---
$vm-diff-added-bg: rgba(46, 160, 67, 0.4);   // #2ea04366 equivalent
$vm-diff-deleted-bg: rgba(248, 81, 73, 0.4); // #f8514966 equivalent
$vm-z-index-island: 50;
$vm-z-index-popup: 100;
```

- [ ] **Step 2: Commit Tokens**

```bash
git add src/styles/_tokens.scss
git commit -m "style(scss): exhaustively map vaultman tokens to obsidian variables"
```

---

### Task 2: Standardize Mixins (`_mixins.scss`)

**Files:**
- Modify: `src/styles/_mixins.scss`

- [ ] **Step 1: Replace `_mixins.scss` to use the new tokens and add structural utilities**

Open `src/styles/_mixins.scss` and replace it with the following code. This ensures all mixins reference our new `$vm-` variables and removes hardcoded css vars like `var(--vm-bg-hover)` which are now handled via SCSS tokens.

```scss
//********************************************************************\\
//*   .-/Made by Meibbo\-.  .-|Vaultman v1.0.0|-.  .-/April 2026\-.  *\\
//********************************************************************\\

@use "tokens" as *;

//...----------—————————————(   MIXINS Y EXTENDS  )————————————------------...\\

// Text Truncation
@mixin text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Flex centering utility
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// Hover Glass effect for interactive items
@mixin hover-bg-accent {
  background: $vm-bg-modifier-hover;
  transition: background-color 0.15s ease-in-out;
  
  &:hover {
    // Uses native CSS color-mix to blend the token
    background: color-mix(in srgb, $vm-color-accent 15%, transparent);
    color: $vm-text-normal;
  }
}

// Border rules for lists
@mixin border-separator {
  border-bottom: $vm-border-width solid $vm-border-color;
  &:last-child {
    border-bottom: none;
  }
}

// Base structural component
%vm-component-base {
  background: $vm-bg-primary;
  border: $vm-border-width solid $vm-border-color;
  border-radius: $vm-radius-s;
  padding: 4px 8px;
}
```

- [ ] **Step 2: Commit Mixins**

```bash
git add src/styles/_mixins.scss
git commit -m "style(scss): modernize mixins using central SCSS tokens"
```

---

### Task 3: Refactor Global Styles (`_global.scss`)

**Files:**
- Modify: `src/styles/_global.scss`

- [ ] **Step 1: Refactor the `.vm-section` and `.vm-btn` primitives**

Open `src/styles/_global.scss`. We need to swap all old variables (`$border`, `$muted`, `$bg-hover`) with our new `$vm-` prefixed tokens. Replace the entire file contents:

```scss
//********************************************************************\\
//*   .-/Made by Meibbo\-.  .-|Vaultman v1.0.0|-.  .-/April 2026\-.  *\\
//********************************************************************\\

@use 'tokens' as *;
@use 'mixins' as *;

/*---------------------------------SECTIONS------------------------------------*/
.vm-section {
  border-bottom: $vm-border-width solid $vm-border-color;
  padding: 8px 12px;

  &-header h4 {
    margin: 0 0 6px 0;
    font-size: 0.85em;
    font-weight: 600;
    text-transform: uppercase;
    color: $vm-text-muted;
    letter-spacing: 0.05em;
  }
}

/*----------------------------------BUTTONS------------------------------------*/
.vm-btn {
  @include flex-center;
  font-size: 0.8em;
  padding: 4px 10px;
  border-radius: $vm-radius-s;
  cursor: pointer;
  background: $vm-interactive-normal;
  border: $vm-border-width solid $vm-border-color;
  color: $vm-text-normal;
  transition: background-color 0.15s ease;

  &:hover {
    background: $vm-bg-modifier-hover;
  }

  &.mod-cta {
    background: $vm-color-accent;
    color: $vm-text-on-accent;
    border-color: $vm-color-accent;

    &:hover {
      background: $vm-color-accent-hover;
      opacity: 0.9;
    }
  }

  &-small {
    font-size: 0.75em;
    padding: 2px 8px;
    background: transparent;
    color: $vm-text-muted;
    border: none;

    &:hover {
      background: $vm-bg-modifier-hover;
      color: $vm-text-normal;
    }
  }
}
```

- [ ] **Step 2: Verify Compilation**

Run the build script to ensure SCSS compiles correctly and variables are successfully linked.
Run: `pnpm run build`
Expected: Passes with no SCSS undefined variable errors.

- [ ] **Step 3: Commit Globals**

```bash
git add src/styles/_global.scss
git commit -m "style(scss): refactor global primitives with complete token integration"
```
