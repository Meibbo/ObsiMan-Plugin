# HANDOFF — ObsiMan Next Session

> Generated: 2026-04-10 | From: Claude Code (Sonnet 4.6) → To: Cursor
> Branch: `add-functions` | Version: `1.0.0-beta.9` | Build: ✅ passing

---

## Context on this handoff

The previous Claude Code session ran out of context tokens (~6% remaining) before completing the following tasks. The user wants Cursor to pick up all of them in sequence.

---

## Tasks for this session

### 1. Update docs with current iteration state

Go through these four doc files and update/create unchecked tasks and iteration notes:

- `docs/ObsiMan - Known Issues.md` → **rename this file to `ObsiMan - Bugs.md`** and update all references to it in AGENTS.md (section 0 checklist, step 3) and in Agent Memory.
- `docs/ObsiMan - User Interface.md` — audit for unchecked `[ ]` tasks, mark what was done in Iter.12.
- `docs/ObsiMan - Plugin Architecture.md` — audit for unchecked `[ ]` tasks.
- `docs/ObsiMan - Agent Memory.md` — already up to date through Iter.12; leave the existing content, just confirm no stale tasks remain.

### 2. Implement integrity / integration testing

The user wants to evaluate and set up **two testing solutions**. Research both before choosing implementation approach:

**Option A — wdio-obsidian-service**
- Repo: https://github.com/jesse-r-s-hines/wdio-obsidian-service
- WebdriverIO-based, launches real Obsidian binary, enables E2E UI tests
- Already scaffolded: `wdio.conf.mts` and `test/` exist in the project root (untracked)
- Check `wdio.conf.mts` and `test/` for existing setup before making changes

**Option B — obsidian-integration-testing**
- Repo: https://github.com/mnaoumov/obsidian-integration-testing
- In-plugin test runner, runs tests inside a live Obsidian vault
- No existing scaffolding in this repo

**What to do:**
1. Read both repos' READMEs (via web fetch or context7 MCP)
2. Review the existing `wdio.conf.mts` and `test/` directory
3. Check `vitest.config.ts` (already exists, untracked) — may be for unit tests only
4. Recommend which solution fits better, or set up both if they serve different purposes (unit vs E2E)
5. Add `npm run test` and `npm run test:e2e` scripts to `package.json` as appropriate
6. Document the chosen approach in `docs/ObsiMan - Testing.md` (create if not exists)

### 3. Restructure roadmap in Agent Memory

Combine:
- What's already in `docs/ObsiMan - Agent Memory.md` (pending iterations)
- Unchecked `[ ]` tasks from `docs/ObsiMan - User Interface.md`, `docs/ObsiMan - Plugin Architecture.md`, and the renamed `docs/ObsiMan - Bugs.md`
- The two new testing initiatives from task 2 above

**Rules for the new roadmap:**
- Group by iteration (max 6 tasks each per AGENTS.md rule)
- Keep completed items in `docs/ObsiMan - Archived tasks.md`
- Testing setup should be its own iteration (e.g. Iter.13 or wherever it fits)
- The rename from "Issues" to "Bugs" should be reflected everywhere

---

## File index for this session

| File | Action |
|------|--------|
| `docs/ObsiMan - Known Issues.md` | Rename → `ObsiMan - Bugs.md` |
| `AGENTS.md` | Update references from Known Issues → Bugs |
| `docs/ObsiMan - User Interface.md` | Audit unchecked tasks |
| `docs/ObsiMan - Plugin Architecture.md` | Audit unchecked tasks |
| `docs/ObsiMan - Agent Memory.md` | Restructure roadmap section |
| `docs/ObsiMan - Archived tasks.md` | Move completed items here |
| `docs/ObsiMan - Testing.md` | Create — document testing approach |
| `wdio.conf.mts` | Review existing setup |
| `test/` | Review existing test scaffolding |
| `vitest.config.ts` | Review — unit test config |
| `package.json` | Add test scripts |

---

## Start-of-session commands

```bash
git log --oneline -5
npm run build
cat docs/HANDOFF.md  # this file
```

Then follow the normal AGENTS.md checklist (section 0).

---

## Known state as of handoff

- Build: ✅ 0 errors, 0 Svelte warnings
- Last iteration: **Iter.12** — Unified Tab System, Search Pill, Category Filtering
- `data.json` has `filtersShowTabLabels: true` and `filtersTabLabelsMigrated: true`
- Untracked files: `.agents/`, `screenshot-check.png`, `scripts/`, `test/`, `vitest.config.ts`, `wdio.conf.mts`
- Unstaged changes: `main.ts`, `package.json`, `src/components/PropertyExplorerComponent.ts`, `src/components/TagsExplorerComponent.ts`, `src/i18n/en.ts`, `src/types/settings.ts`, `src/views/ObsiManView.svelte`, `src/views/pages/StatisticsPage.svelte`, `styles.css`, `data.json`
