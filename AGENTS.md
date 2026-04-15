# AGENTS.md — Vaultman Plugin

> **Mandatory start-of-session protocol for ALL AI agents (Claude Code, Gemini CLI, Gemini Pro, Warp Agent, ChatGPT Codex, or any other).**
> Read this file FIRST before any work. Then read `docs/Vaultman - Agent Memory.md` for current session state.

---

## 0. Start-of-session checklist (REQUIRED — do not skip)

1. **Read this file** — architecture rules, coding patterns, constraints
2. **Read `docs/Vaultman - Agent Memory.md`** — current project state, pending iterations, last agent's notes
3. **Read `docs/Vaultman - Bugs.md`** — open bugs (don't reintroduce fixed ones)
4. **Find your tasks** — check `docs/Vaultman - User Interface.md`, `docs/Vaultman - Bugs.md` or `docs/Vaultman - Structure.md` for task checkboxes `[ ]`.
5. **Run `git log --oneline -5`** — confirm you're on the right branch and know last commits
6. **Ask the user** *(or verify via `npm run build`)* whether features from the last session are working
7. **Check your own context budget** — estimate how many large files you can read. If <20% remaining, warn the user and suggest switching agents BEFORE starting implementation
8. **Update `docs/Vaultman - Agent Memory.md`** at the END of your session with: what you completed, what's next, any blockers. Move completed tasks to `docs/Vaultman - Archived tasks.md`. Keep iterations to a strict maximum of 6 tasks.
8. **Before implementing any integration with a core or community plugin** — search online for its API docs, GitHub repo, and any known inter-plugin communication patterns. Never assume an API exists; verify it first. See section 11 for the integration philosophy and known API surfaces.

---

## 1. Project identity & philosophy

- **Plugin**: Vaultman — bulk property editor and vault management for Obsidian
- **Stack**: TypeScript + Obsidian Plugin API + esbuild + ESLint
- **Repo**: `https://github.com/Meibbo/Vaultman-Plugin`
- **Current branch**: `add-functions`
- **Version**: `1.0.0-beta.9` (working toward `1.0.0` stable)
- **Primary author**: Meibbo

### Core philosophy — "Augment, don't replace"

Vaultman is a **layer on top of Obsidian's native ecosystem**, not a standalone tool. Every feature should ask: *"Which core or community plugin already does this well, and how can we add what it's missing?"*

| Native capability | What it lacks | Vaultman adds |
|---|---|---|
| **Search** (core) | No replace, no batch action | Find & Replace in content (Content tab) |
| **Bases** (core) | No bulk property edit, no multi-file ops | Property grid, checkbox injection, queue ops |
| **Properties** (core) | No bulk rename/delete/clean | Property Manager modal |
| **Tags** (core) | No bulk rename/merge | Tag operations (planned) |
| **Linter** (community) | Requires manual run per-file | Batch linting via Vaultman queue |
| **Tag Wrangler** (community) | No integration with file filters | Tag ops scoped to filtered/selected files |
| **MultiProperties** (community) | No bulk queue | Queued multi-property ops (planned) |

**Key rule**: Before building any feature from scratch, check if a core or community plugin already has the logic. Prefer calling into its API or reading its output over reimplementing it. See section 11 for known API surfaces.

---

## 2. Architecture (read before touching code)

```
main.ts                    # Plugin entry — lifecycle, commands, ribbon, services
src/
  services/                # Business logic — extend Component, use addChild()
  views/                   # Obsidian ItemView subclasses (sidebar, explorer, ops)
  components/              # Plain UI classes — no framework, Obsidian DOM helpers
  modals/                  # Modal subclasses
  types/                   # TypeScript interfaces only
  utils/                   # Pure functions
  i18n/                    # t() with EN/ES + auto-detect
  settings/                # VaultmanSettingsTab
```

### Key services
| Service | Responsibility |
|---------|---------------|
| `PropertyIndexService` | Live frontmatter index (property → values map) |
| `FilterService` | Filter tree state + `filteredFiles` list |
| `OperationQueueService` | Stages and executes property changes |
| `SessionFileService` | Session `.md` read/write |
| `BasesCheckboxInjector` | Injects checkboxes into Obsidian Bases table DOM |

### View types
| View | Type ID | Purpose |
|------|---------|---------|
| `VaultmanView` | `vaultman-view` | **Main sidebar** (3-page nav, default) |
| `VaultmanExplorerView` | `vaultman-explorer-view` | Full-width property explorer |
| `VaultmanOpsView` | `vaultman-ops-view` | Full-width operations panel |

---

## 3. Mandatory coding patterns

### DOM construction — always use Obsidian helpers
```typescript
// ✅ Good
const div = parent.createDiv({ cls: 'my-class' });
div.createEl('span', { text: 'Hello' });
setIcon(div, 'lucide-search');

// ❌ Bad — never use innerHTML or raw HTML strings
div.innerHTML = '<span>Hello</span>';
```

### CSS classes — toggle, never overwrite
```typescript
el.addClass('is-active');       // ✅
el.removeClass('is-loading');   // ✅
el.toggleClass('is-open', bool);// ✅
el.className = 'my-class';      // ❌ wipes Obsidian's classes
el.style.color = 'red';         // ❌ use CSS classes instead
```

### Events — always use registerEvent()
```typescript
this.registerEvent(this.app.vault.on('modify', handler)); // ✅ auto-cleanup
this.app.vault.on('modify', handler); // ❌ leaks on unload
```

### File lookups — O(1) only
```typescript
const f = this.app.vault.getFileByPath(path); // ✅ O(1)
this.app.vault.getMarkdownFiles().find(...);   // ❌ O(n)
```

### Promises in event listeners
```typescript
el.addEventListener('click', () => { void asyncFn(); }); // ✅
el.addEventListener('click', async () => { await asyncFn(); }); // ❌ lint error
```

### No static style assignment (ESLint rule: `obsidianmd/no-static-styles-assignment`)
```typescript
el.style.transition = 'none'; // ❌ — add a CSS class instead
```

---

## 4. Build and lint

```bash
npm run dev          # watch mode with sourcemaps
npm run build        # tsc type-check + esbuild production bundle
npm run lint         # ESLint with obsidianmd rules
npm run test:integrity   # in-plugin integration tests (obsidian-integration-testing)
npm run test:e2e         # full E2E tests in real Obsidian (wdio-obsidian-service)
npm run test:all         # runs both test suites
```

**After every coding session, run `npm run build` before updating Vaultman - Agent Memory.md.**
Pre-existing lint errors (do not fix unless asked):
- `main.ts:70` sentence-case ribbon text
- `main.ts:189` async BasesFilePicker callback
- `BasesCheckboxInjector.ts:67` unnecessary type assertion
- `VaultmanExplorerView.ts:17`, `VaultmanOpsView.ts:17` sentence-case
- `VaultmanSettingsTab.ts:159,205,217,229` sentence-case in Bases section
- `version-bump.mjs:3` and `.obsidian/...excalidraw` — outside project scope

---

## 5. i18n rules

- All user-visible strings go through `t('key')` from `src/i18n/index.ts`
- Add new keys to `src/i18n/en.ts` — `t()` auto-falls back to English
- Spanish (`src/i18n/es.ts`) is maintained separately — add keys when asked
- **Never** hard-code English UI strings in components (except in Settings where the existing code already does it for Bases Integration section)

---

## 6. Settings fields reference

Current `VaultmanSettings` fields (in `src/types/settings.ts`):
- `language`, `defaultPropertyType`, `filterTemplates`, `sessionFilePath`
- `explorerCtrlClickSearch`, `explorerShowQueuePreview`, `explorerContentSearch`, `explorerOperationScope`
- `operationsPanelPosition`, `basesLastUsedPath`, `basesOpenMode`, `basesOpsPanelSide`, `basesExplorerSide`
- `basesAutoAttach`, `basesInjectCheckboxes`, `basesShowColumnSeparators`
- **`openMode`**: `'sidebar' | 'main' | 'both'` — what the ribbon opens
- **`pageOrder`**: `string[]` — order of sidebar pages `['files', 'filters', 'ops']`

---

## 7. UI Design spec (wireframe source of truth)

**Wireframe**: `img/Vaultman - Ui.png` — read this before implementing any UI change.
**Full design doc**: `docs/Vaultman - Wireframe.md` — read this for complete component specs, anatomy, and CSS class system.

### Frame hierarchy (corrected)
| Level | Name | What it describes |
|-------|------|-------------------|
| **1** | Layout | Reusable components and layout patterns — appear across multiple pages/tabs |
| **2** | Page | A full plugin page — content always visible regardless of active tab |
| **3** | Tab | Exchangeable content within a page |
| **4** | Pop-up | Replaces a section of the Level 2 page when activated (NOT a generic overlay) |

> A Level 4 pop-up does NOT float over everything — it **replaces** a specific section. Example: the Filters sort popup replaces the filters header with its own container, with open/close transition animation.

### Sidebar navigation — page order (UPDATED)
Default: **[Operations] [Statistics] [Filters]** (left → center → right)
- `pageOrder` default: `['ops', 'statistics', 'filters']`
- **Files is NO LONGER a page** — it is a tab inside the Filters page
- User can reorder in Settings — FAB positions adapt automatically

### Pages and their FABs
| Page | Position | FAB left | FAB right |
|------|----------|----------|-----------|
| Operations | left (index 0) | Queue list popup | — |
| Statistics | center | Add-ons (stub) | Settings |
| Filters | right (last) | — | Active Filters popup |

### Filters page — tabs (Level 3)
The Filters page has 3 tabs: **Tags | Props | Files**
- **Tags**: tag tree with unlimited nesting — default view: Tree list
- **Props**: property explorer (tree/grid/cards) — default view: Tree list
- **Files**: file list/grid — default view: Grid (Bases-style, no vertical lines)

The Filters page has a **persistent header** (always visible unless replaced by a Level 4 popup):
`[View mode btn] [Clear] [Category toggle] [Sort btn]`
- Left button → opens View mode popup (Level 4, replaces header)
- Right button → opens Sort popup (Level 4, replaces header)

### Operations page — tabs (Level 3)
Content | File Ops | Importer | Template | File diff
- Tabs show only the tab name as heading (no complex header)
- When tabs are fewer than usual, remaining elements center themselves

### Available views for ALL tabs (Tags, Props, Files)
Tree list · D&D list · Grid · Cards · Masonry
- D&D list integrates Linter buttons for filter-specific templates (no separate Linter frame)
- Each view has a Level 1 frame except Masonry (frame pending)

### Bottom bar (corrected)
The "bottom bar" is the **complete assembly**: pill navbar (●●●) + FAB buttons + glassmorphism background.
- Background: `backdrop-filter: blur` + semi-transparent bg — NOT a black gradient
- Shows elements underneath, blurred

### Pop-up islands (corrected)
- Body island floats **above** the bottom bar (bottom bar remains visible below)
- Squircle buttons are **separate islands** floating above the body — NOT inside the body
- Two sizes: mini (collapsed) and expanded (with full tree list)

### Key UI rules
- Active Filters popup: only via Filters page right FAB
- Sort/View mode popups: only via Filters header buttons (replace the header with transition)
- Scope selection in Statistics: selection pills (accent style, not dropdown)
- Scope selection in sort popups: drop-down list component (secondary container)
- Statistics page: stat cards only for v1.0 — dashboards planned for v1.1+

---

## 8. CSS conventions

- All plugin styles in `styles.css` (single file)
- Use Obsidian variables: `--text-normal`, `--text-muted`, `--color-accent`, `--background-primary`, etc.
- Use plugin tokens: `--vaultman-accent`, `--vaultman-bg-section`, `--vaultman-border`
- Class prefix: always `.vaultman-*`
- Mobile touch targets: min 44px
- Animations follow the **Workflow spec** from the UI design:
  - Pages: `cubic-bezier(0.4, 0, 0.2, 1)` 280ms horizontal slide
  - Tabs: `opacity` 180ms ease fade
  - Popups: `cubic-bezier(0.34, 1.56, 0.64, 1)` 300ms spring slide-up

---

## 8. Git workflow

- Work on `add-functions` branch
- Commit frequently with descriptive messages
- Merge to `main` when stable
- Never force-push main
- Tag releases: `git tag 1.0.0-beta.X`

---

## 9. Agent-specific notes

### Claude Code
- Has full tool access, web search, file editing
- Use Plan Mode for large changes (3+ files)
- Check context % before starting new iterations

### Gemini CLI
- Excellent for large-context reads (2M token window)
- Use for reviewing multiple files at once
- Run: `gemini -p "Read AGENTS.md and Vaultman - Agent Memory.md, then continue from where it left off"`

### Gemini Pro / Google Antigravity
- Best for reading the full codebase at once
- Paste `AGENTS.md + Vaultman - Agent Memory.md` as system context

### Warp Agent
- Terminal-focused — good for running build/lint/git commands
- Use for: `npm run build`, `npm run lint`, git operations

### ChatGPT Codex
- Good for code generation given clear specs
- Always provide `AGENTS.md` + the specific files to modify as context

---

## 10. What NOT to do

- Do NOT use `innerHTML` or `outerHTML`
- Do NOT overwrite `.className`
- Do NOT assign `element.style.*` directly (use CSS classes)
- Do NOT add features beyond what's asked
- Do NOT create new files unless necessary
- Do NOT commit without running `npm run build`
- Do NOT skip the start-of-session checklist above
- Do NOT assume an API exists for a core/community plugin — always verify online before coding

---

## 11. Integration API surface (verify before use)

> **Rule**: Before writing any integration code, search online for the plugin's GitHub, its TypeScript types, and any community docs. APIs change. What's listed here was verified at the date shown — re-check if more than 2 months have passed.

**Last verified: 2026-04-07**

### Obsidian core internal plugins
Access via `(app as any).internalPlugins.plugins['<id>'].instance` — internal plugins are **not typed** in the public API. Always guard with `?.` and existence checks.

| Plugin ID | Key entry point | Verified API | Notes |
|---|---|---|---|
| `global-search` | `(app as any).internalPlugins.plugins['global-search']?.instance` | `openGlobalSearch(query)` — opens the Search UI pane with query pre-filled. **No method returns results as data.** Reading results requires dirty DOM access to `resultDomLookup`. | For content matching inside our plugin, use `vault.read()` + native RegExp instead. `openGlobalSearch` is only useful to *navigate* to Search. |
| `properties` | `app.metadataCache` | `getFileCache(file).frontmatter` — fully public. `(app.metadataCache as any).getAllPropertyInfos()` — returns property types (runtime only, not in TS types). | Rich official API. Use `processFrontMatter` for writes. |
| `tags` | `app.metadataCache` | `getAllTags(cache)` from `obsidian` module returns `{tag, position}[]` per file. | Fully public. |
| `bases` | `(app as any).internalPlugins.plugins['bases']?.instance` | **No public API yet.** Bases shipped in Obsidian 1.9.0 (May 2025) — API for plugins is a filed feature request, not implemented. | Read `.base` files as raw text via `vault.read()`. Wait for official API before integrating. |

### Obsidian public API helpers (from `obsidian` module)
- `prepareSimpleSearch(query)` → `(text: string) => SearchResult | null` — space-separated word match. Fast. Returns match ranges for highlighting. **Does NOT scan vault** — you iterate files and apply it per string.
- `prepareFuzzySearch(query)` — character-sequence fuzzy variant. Slower. Same interface.
- `app.vault.read(file)` — reads raw file content including frontmatter. **Use for Find & Replace in content.**
- `app.vault.modify(file, newContent)` — writes raw content back atomically.
- `app.fileManager.processFrontMatter(file, fn)` — safe frontmatter-only mutation (YAML parse/serialize). **Prefer this over raw read/modify for any property operation.**

### Community plugins
Access via `app.plugins.plugins['<id>']` — only if installed and enabled. Always guard: `const p = app.plugins.plugins['obsidian-linter']; if (!p) return;`

| Plugin | ID | Verified API | Notes |
|---|---|---|---|
| **Obsidian Linter** | `obsidian-linter` | No `.api` property. Use `(app as any).commands.executeCommandById('obsidian-linter:lint-file')` — triggers linting on the **currently active file only**. `'obsidian-linter:lint-all-files'` for all. | Cannot pass an arbitrary file. Batch linting requires making each file active first — impractical. Better to call Linter's internal `lintText()` if we can reach it. Verify on GitHub. |
| **Tag Wrangler** | `tag-wrangler` | No `.api`. Fires `'tag-wrangler:context-menu'` workspace event for menu injection. | Treat as user-facing only. Implement tag ops yourself via `metadataCache` + `processFrontMatter`. |
| **MultiProperties** | `multi-properties` | No `.api`, no events, no inter-plugin surface. Pure modal UI. | Do not depend on it. Implement bulk property ops directly. |

### Research links (re-check before each integration sprint)
- Obsidian Plugin API types: https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
- Obsidian developer docs: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- Obsidian Linter GitHub: https://github.com/platers/obsidian-linter
- Tag Wrangler GitHub: https://github.com/pjeby/tag-wrangler
- Multi-Properties GitHub: https://github.com/technohiker/obsidian-multi-properties
- Forum — search API: https://forum.obsidian.md/t/is-it-possible-when-will-it-be-possible-to-access-search-programmatically/24916
- Forum — Bases API request: https://forum.obsidian.md/t/bases-api-for-plugins-to-add-custom-functions/109612
