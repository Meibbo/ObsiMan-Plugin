# Iter.6 — Find & Replace in File Content (Content Tab)

**Date**: 2026-04-07  
**Status**: Approved  
**Branch**: `add-functions`

---

## Purpose

Add Find & Replace for file content to ObsiMan's Content tab (Ops page). This augments Obsidian's core Search plugin, which has no Replace functionality. The implementation does not depend on the Search plugin's API (which has no data-access surface); it operates independently using `vault.read()` + native `RegExp`.

---

## Design decisions

| Question | Answer |
|---|---|
| Content scope | Full raw file text — including YAML frontmatter — via `vault.read()` |
| Preview | On-demand: user clicks "Preview" button, no live scanning |
| Preview output | Match count + collapsible per-file snippet list (`>` toggle) |
| UI layout | Option A compact: Find input + `Aa` + `.*` toggle buttons on one row; Replace input below |
| Implementation pattern | New `FIND_REPLACE_CONTENT` signal constant — same pattern as `MOVE_FILE` |
| Search engine | Native JS `RegExp` (no external plugin dependency) |
| Target files | Selected files if any; otherwise all filtered files |

---

## UI — Content tab layout

```
┌─────────────────────────────────────┐
│ [ Find in content…     ] [Aa] [.*]  │  ← single row: input + case + regex toggles
│ [ Replace with…                   ] │  ← replace input, full width
│                                     │
│ Scope: 47 filtered files            │  ← derived from selectedCount / filteredCount
│                                     │
│ [  Preview  ]  [  Queue Replace  ] │  ← Preview left, Queue CTA right
│                                     │
│ ▶ 12 matches in 4 files            │  ← after Preview click; > toggles snippet list
│   ├ notes/todo.md (3)              │
│   │  …buy ‹milk› tomorrow…         │
│   └ journal/2026-04.md (1)         │
│      …picked up ‹milk› and…        │
└─────────────────────────────────────┘
```

**Toggle buttons** (`Aa`, `.*`):
- `Aa` = case-sensitive (off by default)
- `.*` = regex mode (off by default; plain text search when off)
- Active state: filled accent background (matches existing `.obsiman-icon-toggle.is-active` pattern)

**Scope hint**: derived reactively from `selectedCount` / `filteredCount` state (already reactive `$state` variables). No file scanning required for the hint.

**Preview results**:
- Collapsed by default after Preview click: `▶ 12 matches in 4 files`
- Click `▶`/`▼` to expand/collapse the per-file snippet list
- Each snippet: ~50 chars of surrounding context, matched text wrapped in `<mark>` equivalent
- Max 3 snippets per file shown (to limit DOM size)
- Max 20 files shown in the list; remainder noted as `…and N more files`

**Queue Replace button**: disabled when Find field is empty. Clicking adds one `PendingChange` to the queue covering all target files.

---

## Architecture

### 1. `src/types/operation.ts` — new signal constant

```ts
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
```

The `logicFunc` for a content-replace operation returns:
```ts
{
  [FIND_REPLACE_CONTENT]: {
    pattern: string,       // raw text or regex string
    replacement: string,
    isRegex: boolean,
    caseSensitive: boolean,
  }
}
```

### 2. `src/services/OperationQueueService.ts` — handle signal in `applyChange`

After the existing `MOVE_FILE` block, add:

```ts
if (FIND_REPLACE_CONTENT in updates) {
  const { pattern, replacement, isRegex, caseSensitive } =
    updates[FIND_REPLACE_CONTENT] as FindReplaceParams;
  const content = await this.app.vault.read(file);
  const flags = 'g' + (caseSensitive ? '' : 'i');
  const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, flags);
  const newContent = content.replace(regex, replacement);
  if (newContent !== content) {
    await this.app.vault.modify(file, newContent);
  }
  return;
}
```

The `FindReplaceParams` type is defined inline in `OperationQueueService.ts` (no new file needed).

### 3. `src/views/ObsiManView.svelte` — Content tab UI

New reactive state (added to the script section):
```ts
let contentFind = $state('');
let contentReplace = $state('');
let contentCaseSensitive = $state(false);
let contentIsRegex = $state(false);
let contentPreviewResult = $state<ContentPreviewResult | null>(null);
let contentPreviewOpen = $state(false);   // snippet list collapsed/expanded
let contentPreviewing = $state(false);    // loading state for Preview button
```

`ContentPreviewResult` (inline type in the script):
```ts
type ContentPreviewResult = {
  totalMatches: number;
  files: Array<{
    file: TFile;
    matchCount: number;
    snippets: string[];   // pre-formatted context strings, max 3
  }>;
  moreFiles: number;      // files beyond the 20-file display limit
};
```

New functions:
- `async function previewContentReplace()` — reads each target file, counts RegExp matches, builds `ContentPreviewResult`
- `function queueContentReplace()` — adds one `PendingChange` for all target files

Reset `contentPreviewResult` when `contentFind`, `contentIsRegex`, or `contentCaseSensitive` changes (via `$effect`).

### 4. `src/i18n/en.ts` — new keys

```ts
'content.find_placeholder': 'Find in content…',
'content.replace_placeholder': 'Replace with…',
'content.toggle_case': 'Case sensitive',
'content.toggle_regex': 'Regular expression',
'content.scope_hint_selected': 'Scope: {count} selected file(s)',
'content.scope_hint_filtered': 'Scope: {count} filtered file(s)',
'content.preview': 'Preview',
'content.queue_replace': 'Queue replace',
'content.preview_count': '{matches} matches in {files} file(s)',
'content.preview_more': '…and {count} more files',
'content.no_matches': 'No matches found',
```

---

## CSS additions (`styles.css`)

```css
/* Content tab */
.obsiman-content-find-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
}
.obsiman-content-find-row .obsiman-search-input {
  flex: 1;
  margin-bottom: 0;
}
.obsiman-icon-toggle {
  background: var(--background-modifier-form-field);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  color: var(--text-muted);
  padding: 4px 7px;
  font-size: var(--font-ui-smaller);
  cursor: pointer;
  flex-shrink: 0;
  min-width: 28px;
  text-align: center;
}
.obsiman-icon-toggle.is-active {
  background: var(--color-accent);
  color: var(--text-on-accent);
  border-color: var(--color-accent);
}
.obsiman-content-scope-hint {
  font-size: var(--font-ui-smaller);
  color: var(--text-muted);
  margin: 4px 0 8px;
}
.obsiman-content-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.obsiman-content-preview {
  font-size: var(--font-ui-smaller);
}
.obsiman-content-preview-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--text-normal);
  margin-bottom: 4px;
}
.obsiman-content-preview-header .obsiman-preview-chevron {
  color: var(--text-muted);
}
.obsiman-content-preview-file {
  color: var(--color-accent);
  margin-top: 6px;
  font-size: var(--font-ui-smaller);
}
.obsiman-content-preview-snippet {
  color: var(--text-muted);
  padding-left: 10px;
  font-size: var(--font-ui-smaller);
}
.obsiman-content-preview-snippet mark {
  background: var(--text-highlight-bg);
  color: var(--text-normal);
  border-radius: 2px;
}
```

---

## Files changed

| File | Change |
|---|---|
| `src/types/operation.ts` | Add `FIND_REPLACE_CONTENT` constant |
| `src/services/OperationQueueService.ts` | Handle `FIND_REPLACE_CONTENT` in `applyChange`; import the constant |
| `src/views/ObsiManView.svelte` | Replace Content tab stub with full UI; add reactive state + functions |
| `src/i18n/en.ts` | Add `content.*` keys |
| `styles.css` | Add `.obsiman-content-*` and `.obsiman-icon-toggle` classes |

No new files required.

---

## Edge cases

- **Empty Find field**: "Queue Replace" button is disabled; Preview does nothing.
- **Invalid regex**: Wrap `new RegExp(pattern, flags)` in `try/catch`; show an error hint below the Find input if the pattern is invalid.
- **No matches**: Preview shows "No matches found" instead of count.
- **File read error**: Caught by `OperationQueueService.execute()`'s try/catch — counted as an error, logged in the result notice.
- **Replace with empty string**: Valid — effectively deletes all matches. No special handling needed.
- **Search field cleared after queuing**: The queue item is a closure over the pattern/replacement values at queue time — changing the input after queuing does not affect queued items.
