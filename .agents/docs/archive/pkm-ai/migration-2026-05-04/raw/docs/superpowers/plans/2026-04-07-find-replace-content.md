# Iter.6 — Find & Replace in File Content

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Find & Replace in the Content tab of the Ops page — searches raw file content (including frontmatter) using RegExp, previews matches with snippets, and queues the replace operation through the existing `OperationQueueService`.

**Architecture:** A new `FIND_REPLACE_CONTENT` signal constant follows the same pattern as `MOVE_FILE` and `RENAME_FILE`. The service reads raw content via `vault.read()`, applies the regex, and writes back via `vault.modify()`. The Svelte UI handles the preview scan client-side (async read of each target file) and feeds a single `PendingChange` into the existing queue.

**Tech Stack:** TypeScript, Svelte 5, Obsidian Plugin API (`vault.read`, `vault.modify`), ESLint with obsidianmd rules, esbuild.

**Spec:** `docs/superpowers/specs/2026-04-07-find-replace-content-design.md`

---

## File map

| File | Change |
|---|---|
| `src/types/operation.ts` | Add `FIND_REPLACE_CONTENT` exported constant |
| `src/services/OperationQueueService.ts` | Import constant; add handler block in `applyChange` |
| `src/i18n/en.ts` | Add `content.*` i18n keys |
| `styles.css` | Add `.obsiman-content-*` and `.obsiman-icon-toggle` CSS |
| `src/views/ObsiManView.svelte` | Replace Content tab stub; add state, types, functions |

No new files.

---

## Task 1: Add `FIND_REPLACE_CONTENT` signal constant

**Files:**
- Modify: `src/types/operation.ts`

- [ ] **Step 1.1: Add the constant**

Open `src/types/operation.ts`. After the `MOVE_FILE` line add:

```ts
// Before (lines 4-7):
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';
export const MOVE_FILE = '_MOVE_FILE';

// After:
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';
export const MOVE_FILE = '_MOVE_FILE';
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
```

- [ ] **Step 1.2: Build check**

```bash
cd "c:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/plugin-dev/.obsidian/plugins/obsiman"
npm run build
```

Expected: `0 errors`. (1 pre-existing Svelte warning about non-reactive update is OK.)

- [ ] **Step 1.3: Commit**

```bash
git add src/types/operation.ts
git commit -m "feat(content): add FIND_REPLACE_CONTENT signal constant"
```

---

## Task 2: Handle `FIND_REPLACE_CONTENT` in `OperationQueueService`

**Files:**
- Modify: `src/services/OperationQueueService.ts`

- [ ] **Step 2.1: Update the import line**

Line 3 currently reads:
```ts
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE } from '../types/operation';
```

Change to:
```ts
import { DELETE_PROP, RENAME_FILE, REORDER_ALL, MOVE_FILE, FIND_REPLACE_CONTENT } from '../types/operation';
```

- [ ] **Step 2.2: Add the handler in `applyChange`**

After the `MOVE_FILE` block (which ends at `return;` around line 160), add a new block before the `// Apply frontmatter changes` comment:

```ts
		if (MOVE_FILE in updates) {
			const targetFolder = updates[MOVE_FILE] as string;
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			await this.app.fileManager.renameFile(file, newPath);
			return;
		}

		if (FIND_REPLACE_CONTENT in updates) {
			const { pattern, replacement, isRegex, caseSensitive } = updates[FIND_REPLACE_CONTENT] as {
				pattern: string;
				replacement: string;
				isRegex: boolean;
				caseSensitive: boolean;
			};
			const flags = 'g' + (caseSensitive ? '' : 'i');
			const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escaped, flags);
			const content = await this.app.vault.read(file);
			const newContent = content.replace(regex, replacement);
			if (newContent !== content) {
				await this.app.vault.modify(file, newContent);
			}
			return;
		}

		// Apply frontmatter changes
```

- [ ] **Step 2.3: Build check**

```bash
npm run build
```

Expected: `0 errors`.

- [ ] **Step 2.4: Commit**

```bash
git add src/services/OperationQueueService.ts
git commit -m "feat(content): handle FIND_REPLACE_CONTENT in OperationQueueService"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `src/i18n/en.ts`

- [ ] **Step 3.1: Add keys at the end of the export object**

In `src/i18n/en.ts`, find the last key before the closing `};` and append:

```ts
	// Content tab — Find & Replace
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
	'content.invalid_regex': 'Invalid regular expression',
```

- [ ] **Step 3.2: Build check**

```bash
npm run build
```

Expected: `0 errors`.

- [ ] **Step 3.3: Commit**

```bash
git add src/i18n/en.ts
git commit -m "feat(content): add content tab i18n keys"
```

---

## Task 4: Add CSS

**Files:**
- Modify: `styles.css`

- [ ] **Step 4.1: Append at the end of `styles.css`**

```css
/* ─── Content tab — Find & Replace ─────────────────────────────────────── */

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
	line-height: 1.4;
}

.obsiman-icon-toggle.is-active {
	background: var(--color-accent);
	color: var(--text-on-accent);
	border-color: var(--color-accent);
}

.obsiman-content-regex-error {
	font-size: var(--font-ui-smaller);
	color: var(--text-error);
	margin: -2px 0 6px;
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

.obsiman-content-actions .obsiman-btn {
	flex: 1;
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
	user-select: none;
}

.obsiman-preview-chevron {
	color: var(--text-muted);
	font-size: 10px;
}

.obsiman-content-preview-file {
	color: var(--color-accent);
	margin-top: 4px;
}

.obsiman-content-preview-snippet {
	color: var(--text-muted);
	padding-left: 10px;
	word-break: break-word;
}

.obsiman-content-preview-snippet mark {
	background: var(--text-highlight-bg);
	color: var(--text-normal);
	border-radius: 2px;
	padding: 0 1px;
}
```

- [ ] **Step 4.2: Build check**

```bash
npm run build
```

Expected: `0 errors`.

- [ ] **Step 4.3: Commit**

```bash
git add styles.css
git commit -m "feat(content): add CSS for content tab find & replace"
```

---

## Task 5: Implement Content tab UI in `ObsiManView.svelte`

**Files:**
- Modify: `src/views/ObsiManView.svelte`

This task has several sub-steps. Do them in order — each one builds on the last.

### 5a — Update imports

- [ ] **Step 5a.1: Add `FIND_REPLACE_CONTENT` to the operation import**

Find this line (around line 12):
```ts
	import { MOVE_FILE } from '../types/operation';
```

Replace with:
```ts
	import { MOVE_FILE, FIND_REPLACE_CONTENT } from '../types/operation';
```

### 5b — Add inline types

- [ ] **Step 5b.1: Add `ContentSnippet` and `ContentPreviewResult` types**

Find the `type OpsTab` line (around line 19):
```ts
type OpsTab = 'fileops' | 'linter' | 'template' | 'content';
```

Add after it:
```ts
	type ContentSnippet = { before: string; match: string; after: string };
	type ContentPreviewResult = {
		totalMatches: number;
		files: Array<{ file: import('obsidian').TFile; matchCount: number; snippets: ContentSnippet[] }>;
		moreFiles: number;
	};
```

### 5c — Add reactive state

- [ ] **Step 5c.1: Add content tab state variables**

Find the `// ─── Move popup ───` section (around line 365). Insert a new section immediately before it:

```ts
	// ─── Content tab — Find & Replace ────────────────────────────────────────

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(false);
	let contentPreviewing = $state(false);
	let contentRegexError = $state('');

	const contentScopeHint = $derived.by(() => {
		if (selectedCount > 0)
			return t('content.scope_hint_selected').replace('{count}', String(selectedCount));
		return t('content.scope_hint_filtered').replace('{count}', String(filteredCount));
	});

	$effect(() => {
		// Reset preview when search params change
		void contentFind; void contentIsRegex; void contentCaseSensitive;
		contentPreviewResult = null;
		contentRegexError = '';
	});
```

### 5d — Add functions

- [ ] **Step 5d.1: Add `buildContentRegex` helper**

In the same section (after the `$effect` above), add:

```ts
	function buildContentRegex(pattern: string, isRegex: boolean, caseSensitive: boolean): RegExp {
		const flags = 'g' + (caseSensitive ? '' : 'i');
		const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(escaped, flags);
	}
```

- [ ] **Step 5d.2: Add `previewContentReplace` async function**

```ts
	async function previewContentReplace() {
		if (!contentFind) return;
		contentPreviewing = true;
		contentPreviewResult = null;
		contentRegexError = '';

		let regex: RegExp;
		try {
			regex = buildContentRegex(contentFind, contentIsRegex, contentCaseSensitive);
		} catch {
			contentRegexError = t('content.invalid_regex');
			contentPreviewing = false;
			return;
		}

		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : [...plugin.filterService.filteredFiles];

		const MAX_FILES = 20;
		const MAX_SNIPPETS = 3;
		const CONTEXT_LEN = 50;

		let totalMatches = 0;
		let matchingFileCount = 0;
		const fileResults: ContentPreviewResult['files'] = [];

		for (const file of targets) {
			const content = await plugin.app.vault.read(file);
			regex.lastIndex = 0;
			const matches = [...content.matchAll(regex)];
			if (matches.length === 0) continue;

			matchingFileCount++;
			totalMatches += matches.length;

			if (fileResults.length < MAX_FILES) {
				const snippets: ContentSnippet[] = matches.slice(0, MAX_SNIPPETS).map((m) => {
					const start = m.index ?? 0;
					const end = start + m[0].length;
					return {
						before: content.slice(Math.max(0, start - CONTEXT_LEN), start),
						match: m[0],
						after: content.slice(end, end + CONTEXT_LEN),
					};
				});
				fileResults.push({ file, matchCount: matches.length, snippets });
			}
		}

		contentPreviewResult = {
			totalMatches,
			files: fileResults,
			moreFiles: Math.max(0, matchingFileCount - MAX_FILES),
		};
		contentPreviewOpen = true;
		contentPreviewing = false;
	}
```

- [ ] **Step 5d.3: Add `queueContentReplace` function**

```ts
	function queueContentReplace() {
		if (!contentFind) return;
		contentRegexError = '';

		try {
			buildContentRegex(contentFind, contentIsRegex, contentCaseSensitive);
		} catch {
			contentRegexError = t('content.invalid_regex');
			return;
		}

		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : [...plugin.filterService.filteredFiles];

		const pattern = contentFind;
		const replacement = contentReplace;
		const isRegex = contentIsRegex;
		const caseSensitive = contentCaseSensitive;

		const change: PendingChange = {
			property: '',
			action: 'find_replace_content',
			details: `Find "${pattern}" → Replace "${replacement}" in ${targets.length} file(s)`,
			files: targets,
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: { pattern, replacement, isRegex, caseSensitive },
			}),
			customLogic: true,
		};
		plugin.queueService.add(change);
	}
```

### 5e — Replace the template stub

- [ ] **Step 5e.1: Replace the Content tab stub**

Find this block in the template (around line 618):
```svelte
					<!-- Content tab -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'content'}>
						<div class="obsiman-coming-soon">{t('ops.coming_soon')}</div>
					</div>
```

Replace with:
```svelte
					<!-- Content tab -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'content'}>
						<!-- Find row: input + Aa + .* toggles -->
						<div class="obsiman-content-find-row">
							<input
								class="obsiman-search-input"
								type="text"
								placeholder={t('content.find_placeholder')}
								bind:value={contentFind}
							/>
							<button
								class="obsiman-icon-toggle"
								class:is-active={contentCaseSensitive}
								aria-label={t('content.toggle_case')}
								title={t('content.toggle_case')}
								onclick={() => { contentCaseSensitive = !contentCaseSensitive; }}
							>Aa</button>
							<button
								class="obsiman-icon-toggle"
								class:is-active={contentIsRegex}
								aria-label={t('content.toggle_regex')}
								title={t('content.toggle_regex')}
								onclick={() => { contentIsRegex = !contentIsRegex; }}
							>.*</button>
						</div>
						{#if contentRegexError}
							<div class="obsiman-content-regex-error">{contentRegexError}</div>
						{/if}
						<input
							class="obsiman-search-input"
							type="text"
							placeholder={t('content.replace_placeholder')}
							bind:value={contentReplace}
						/>
						<div class="obsiman-content-scope-hint">{contentScopeHint}</div>
						<div class="obsiman-content-actions">
							<button
								class="obsiman-btn"
								disabled={!contentFind || contentPreviewing}
								onclick={() => { void previewContentReplace(); }}
							>{contentPreviewing ? '…' : t('content.preview')}</button>
							<button
								class="obsiman-btn mod-cta"
								disabled={!contentFind}
								onclick={queueContentReplace}
							>{t('content.queue_replace')}</button>
						</div>
						{#if contentPreviewResult !== null}
							<div class="obsiman-content-preview">
								<div
									class="obsiman-content-preview-header"
									onclick={() => { contentPreviewOpen = !contentPreviewOpen; }}
									role="button"
									tabindex="0"
								>
									<span class="obsiman-preview-chevron">{contentPreviewOpen ? '▼' : '▶'}</span>
									{#if contentPreviewResult.totalMatches === 0}
										<span>{t('content.no_matches')}</span>
									{:else}
										<span>{t('content.preview_count')
											.replace('{matches}', String(contentPreviewResult.totalMatches))
											.replace('{files}', String(contentPreviewResult.files.length + contentPreviewResult.moreFiles))
										}</span>
									{/if}
								</div>
								{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
									{#each contentPreviewResult.files as fileResult}
										<div class="obsiman-content-preview-file">
											{fileResult.file.path} ({fileResult.matchCount})
										</div>
										{#each fileResult.snippets as snippet}
											<div class="obsiman-content-preview-snippet">
												<span>{snippet.before}</span><mark>{snippet.match}</mark><span>{snippet.after}</span>
											</div>
										{/each}
									{/each}
									{#if contentPreviewResult.moreFiles > 0}
										<div class="obsiman-text-faint">{t('content.preview_more').replace('{count}', String(contentPreviewResult.moreFiles))}</div>
									{/if}
								{/if}
							</div>
						{/if}
					</div>
```

- [ ] **Step 5e.2: Build check**

```bash
npm run build
```

Expected: `0 errors`. (1 pre-existing Svelte non-reactive-update warning is OK.)

- [ ] **Step 5e.3: Lint check**

```bash
npm run lint
```

Expected: only the pre-existing errors listed in AGENTS.md section 4 — no new errors.

- [ ] **Step 5e.4: Commit**

```bash
git add src/views/ObsiManView.svelte src/types/operation.ts src/i18n/en.ts styles.css
git commit -m "feat: implement Find & Replace in Content tab (Iter.6)"
```

---

## Task 6: Manual verification in Obsidian

- [ ] **Step 6.1: Reload the plugin**

```bash
npm run build && obsidian 'vault=plugin-dev' 'plugin:reload' 'id=obsiman' && obsidian 'vault=plugin-dev' 'dev:errors'
```

- [ ] **Step 6.2: Verify the Content tab UI**

Open the ObsiMan sidebar → navigate to Ops page → click "Content" tab.

Confirm:
1. Two inputs appear: "Find in content…" and "Replace with…"
2. `Aa` and `.*` toggle buttons are next to the Find input
3. Scope hint shows the correct file count
4. "Preview" and "Queue replace" buttons are present
5. "Queue replace" is disabled when Find is empty

- [ ] **Step 6.3: Verify plain-text find & replace**

1. Type a word that exists in some vault files into Find
2. Type a replacement in Replace
3. Click "Preview" — confirm count appears and snippets expand with `▼`
4. Click `▼` to collapse — confirm it collapses
5. Click "Queue replace" — confirm item appears in the queue (Ops → File Ops tab, or press the queue FAB)
6. Apply the queue — confirm the word is replaced in the target files

- [ ] **Step 6.4: Verify regex mode**

1. Enable `.*` toggle (turns accent color)
2. Enter a valid regex pattern like `\d{4}-\d{2}-\d{2}` (matches dates)
3. Click Preview — confirm it finds date strings
4. Enter an invalid regex like `[unclosed`
5. Confirm the red error message appears below the Find input

- [ ] **Step 6.5: Verify case-sensitive mode**

1. Enable `Aa` toggle
2. Search for a word in mixed case — confirm only exact-case matches appear in preview

- [ ] **Step 6.6: Update HANDOFF.md**

Mark Iter.6 as done in `docs/HANDOFF.md`. Update "Last updated" date, agent, and build status. Add any blockers or notes about what to test next.

```bash
git add docs/HANDOFF.md
git commit -m "docs: mark Iter.6 complete in HANDOFF.md"
```

---

## Self-review notes

- **Spec coverage**: All spec sections covered — signal constant (Task 1), service handler (Task 2), i18n (Task 3), CSS (Task 4), UI layout with toggles + preview + snippets + queue button (Task 5). Edge cases: invalid regex error (5e.1), no-matches state (5e.1), empty-find disabled state (5e.1). ✓
- **Type consistency**: `ContentSnippet` and `ContentPreviewResult` defined in 5b; used identically in 5d functions and 5e template. `FIND_REPLACE_CONTENT` added in Task 1, imported in Tasks 2 and 5a. ✓
- **No placeholders**: All code blocks are complete. ✓
- **AGENTS.md patterns**: No `innerHTML` (using Svelte `{snippet.before}` not `{@html}`), no `element.style.*`, using `addClasses` not `addClass('a b')`, async handler wrapped in `void`. ✓
