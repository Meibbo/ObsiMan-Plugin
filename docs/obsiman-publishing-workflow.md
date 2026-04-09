---
title: ObsiMan — Plugin Publishing & Release Workflow
type:
  - guide
  - reference
in:
  - "[[ObsiMan]]"
tags:
  - obsidian/plugin
  - publishing
  - release
dateCreated: 2026-03-27
dateModified: 2026-03-27
---

# ObsiMan — Plugin Publishing & Release Workflow

> [!abstract] Purpose
> This document covers the full lifecycle of releasing ObsiMan: from a local build to a GitHub release, beta testing via BRAT, and final submission to the Obsidian Community Plugin store. It also covers community announcement channels.
>
> **Both the developer (Meibbo) and AI agents should reference this guide before any release-related work.**

---

## Table of Contents

- [[#1. Pre-Release Checklist]]
- [[#2. Version Bumping]]
- [[#3. Building for Release]]
- [[#4. GitHub Release]]
- [[#5. Beta Distribution via BRAT]]
- [[#6. Official Community Plugin Store Submission]]
- [[#7. Community Announcements]]
- [[#8. Post-Release]]
- [[#9. Automation — GitHub Actions]]
- [[#10. Release Cadence & Branch Strategy]]

---

## 1. Pre-Release Checklist

Before cutting any release, verify all of the following:

- [ ] `npm run build` passes with **zero errors**
- [ ] `npm run lint` passes with **zero errors**
- [ ] Plugin loads correctly in Obsidian (test in dev vault)
- [ ] Core functionality works on the target Obsidian version
- [ ] No hardcoded test data or debug `console.log` left in production code
- [ ] `manifest.json` → `minAppVersion` is accurate for any new API used
- [ ] `README.md` reflects current feature set
- [ ] `CHANGELOG.md` has a new section for this version

> [!warning] Mobile
> If `isDesktopOnly: false` in `manifest.json`, test on mobile (iOS/Android) or explicitly set `isDesktopOnly: true` if mobile is not supported.

---

## 2. Version Bumping

All four version references **must stay in sync**. Update them together in one commit:

| File | Field | Example |
|------|-------|---------|
| `manifest.json` | `"version"` | `"1.3.0"` |
| `package.json` | `"version"` | `"1.3.0"` |
| `versions.json` | new entry | `"1.3.0": "1.4.0"` |
| `CHANGELOG.md` | new section header | `## [1.3.0] — 2026-03-27` |

### `versions.json` format

Maps **plugin version** → **minimum Obsidian app version** required:

```json
{
  "1.0.0": "1.1.0",
  "1.2.0": "1.4.0",
  "1.3.0": "1.4.0"
}
```

> [!tip]
> Only bump `minAppVersion` when you actually use a newer Obsidian API. Bumping it unnecessarily excludes users on older stable releases.

### `CHANGELOG.md` format (Keep a Changelog)

```markdown
## [1.3.0] — 2026-03-27

### Added
- Excel-like cell selection (Ctrl/Shift/checkbox) in PropertyGridComponent
- Inline rename with live preview in grid

### Changed
- OperationsPanelComponent refactored to smart tab layout

### Fixed
- Bulk mark selection lost CSS after grid refactor

[1.3.0]: https://github.com/YOUR_USER/obsiman/compare/1.2.2...1.3.0
```

---

## 3. Building for Release

```bash
# Install dependencies (if needed)
npm install

# Production build — outputs main.js at plugin root
npm run build
```

**Required release artifacts** (must exist at plugin root after build):

| File | Required | Notes |
|------|----------|-------|
| `main.js` | ✅ Yes | Bundled plugin code |
| `manifest.json` | ✅ Yes | Plugin metadata |
| `styles.css` | Optional | Only if plugin has styles |

> [!caution] Do NOT commit
> `main.js` should NOT be committed to git (it's in `.gitignore`). It only goes into the GitHub Release assets.

---

## 4. GitHub Release

### Manual release steps

1. Ensure you are on the `main` branch with a clean working tree
2. Commit the version bump: `manifest.json`, `package.json`, `versions.json`, `CHANGELOG.md`
3. Create and push a git tag matching the version exactly:
   ```bash
   git tag 1.3.0
   git push origin 1.3.0
   ```
4. Go to GitHub → **Releases** → **Draft a new release**
5. Choose the tag you just pushed
6. Set **Release title** to `v1.3.0` (or just `1.3.0`)
7. Paste the relevant `CHANGELOG.md` section as the release notes
8. **Attach files** (drag & drop or upload):
   - `main.js`
   - `manifest.json`
   - `styles.css` (if applicable)
9. Publish the release

> [!important] Tag format
> The tag **must match exactly** what is in `manifest.json → version`. Obsidian's release system and BRAT both rely on this. Use `1.3.0`, not `v1.3.0` (the `v` prefix is accepted by some tools but can cause mismatches — be consistent).

### Tag naming rules (validated by Obsidian's bot)

> [!warning] No `v` prefix
> Tags **must be bare semver without a `v` prefix** — `1.3.0` not `v1.3.0`. Obsidian's automated `validate-plugin-entry.yml` bot rejects tags with a `v` prefix. Be consistent across all releases.

### Release naming convention for ObsiMan

| Type | Tag example | GitHub Release title |
|------|-------------|----------------------|
| Stable | `1.3.0` | `1.3.0 — Feature name` |
| Beta / pre-release | `1.3.0-beta.1` | `1.3.0-beta.1 (beta)` |
| Hotfix | `1.3.1` | `1.3.1 — Hotfix: description` |

---

## 5. Beta Distribution via BRAT

[BRAT (Beta Reviewers Auto-update Tester)](https://github.com/TfTHacker/obsidian42-brat) lets users install and auto-update plugins that are not yet in the official store, or pre-release versions of published plugins.

### What the plugin author must do

1. Ensure the GitHub repository is **public**
2. Create a GitHub Release (any tag — does not need to be a stable semver)
3. Attach `main.js` and `manifest.json` to the release
4. The release can be marked as "pre-release" in GitHub — BRAT picks up both pre-releases and stable releases
5. **No `manifest-beta.json` needed** — BRAT v2.0.0+ (released Feb 2026) no longer requires it. Older docs may mention it; ignore them.

> [!note] BRAT user requirement
> BRAT v2.0.0 requires **Obsidian 1.11.4+**. For users on older Obsidian builds, BRAT itself won't be installable.

### What users do to install via BRAT

1. Install BRAT from the Obsidian Community Plugin store
2. Open **Settings → Community Plugins → BRAT**
3. Click **"Add Beta Plugin"**
4. Enter the GitHub repository URL:
   ```
   YOUR_GITHUB_USERNAME/obsiman
   ```
   (just the `user/repo` part, no `https://github.com/` prefix)
5. BRAT downloads `main.js` and `manifest.json` from the latest release and installs the plugin

### BRAT update behavior

- BRAT can auto-update plugins on Obsidian startup (user opt-in)
- Users can also manually trigger updates from the BRAT settings tab
- Pre-release versions: users can pin a specific release tag via "Add Beta Plugin with frozen version"

### Sharing BRAT install instructions (template)

```markdown
## Install via BRAT (beta)

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) from the Community Plugins store
2. In BRAT settings, click **Add Beta Plugin**
3. Enter: `YOUR_GITHUB_USERNAME/obsiman`
4. Enable ObsiMan in Community Plugins settings
```

---

## 6. Official Community Plugin Store Submission

The official store is managed via the [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) GitHub repository.

### Requirements before submitting

- [ ] At least one stable GitHub release with correct tag and artifacts
- [ ] `manifest.json` is valid and complete
- [ ] Plugin follows [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [ ] No violations of Developer Policies (no telemetry, no remote code exec, etc.)
- [ ] README.md exists and clearly describes what the plugin does
- [ ] Plugin is functional and tested against the stated `minAppVersion`

### Submission steps

1. **Fork** [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) on GitHub
2. In your fork, open `community-plugins.json`
3. Add an entry for ObsiMan (keep entries in alphabetical order by `id`):

```json
{
  "id": "obsiman",
  "name": "ObsiMan",
  "author": "YOUR_NAME",
  "description": "Bulk property operations and vault management for Obsidian — filter, select, and edit YAML frontmatter across hundreds of notes at once.",
  "repo": "YOUR_GITHUB_USERNAME/obsiman"
}
```

4. Commit the change and open a **Pull Request** against `obsidianmd/obsidian-releases`
5. PR title format: `Add plugin: ObsiMan`
6. Fill in the PR template (checklist provided by the repo)

### Automated validation bot (`validate-plugin-entry.yml`)

GitHub Actions runs immediately on your PR and checks:
- [ ] `id`, `name`, `description` in `community-plugins.json` match `manifest.json` exactly
- [ ] Release tag matches `manifest.json → version` (no `v` prefix)
- [ ] Release has `main.js` and `manifest.json` as binary attachments
- [ ] `manifest.json` in the release matches the repo root version

**Naming rules the bot enforces (must pass for ObsiMan):**

| Rule | Status |
|------|--------|
| `id` must NOT contain `"obsidian"` as substring | ✅ `obsiman` is fine |
| `name` must NOT end with `"Plugin"` | ✅ `ObsiMan` is fine |
| `description` must end with `.`, `?`, `!`, or `)` | ⚠️ Verify your description ends with `.` |
| `id` must be lowercase, letters/numbers/hyphens only | ✅ `obsiman` is fine |
| Version must be `x.y.z` (no pre-release tags, no `v`) | ✅ Enforced |

### Human review checklist (what reviewers check)

- No security violations (no eval, no remote code fetch, no hidden network calls)
- Plugin does not trivially replicate Obsidian core functionality without added value
- Code is readable and does not contain obfuscation
- No tracking or telemetry without explicit user consent and a disclosed privacy policy
- `onunload()` properly cleans up all listeners, intervals, and DOM elements
- Works on mobile or explicitly sets `isDesktopOnly: true`

> [!info] Review timeline
> Automated bot check: immediate. Human review: typically **2–6 weeks** for new submissions. Track status by watching your PR on GitHub.

### Common rejection reasons

| Reason | How to avoid |
|--------|-------------|
| Plugin ID conflicts with existing plugin | Check `community-plugins.json` before choosing an ID |
| `manifest.json` missing required fields | Validate against the [sample plugin manifest](https://github.com/obsidianmd/obsidian-sample-plugin/blob/master/manifest.json) |
| Plugin makes undisclosed network calls | Document all external services in README |
| Missing or unhelpful README | Write a clear description, usage guide, and feature list |
| Plugin does not load or has obvious bugs | Test thoroughly before submitting |

---

## 7. Community Announcements

### Channels

| Channel | URL / Location | Timing | Notes |
|---------|---------------|--------|-------|
| Obsidian Forum — Share & Showcase | `https://forum.obsidian.md/c/share-showcase/9` | After approval or for beta | Primary announcement |
| Reddit — r/ObsidianMD | `https://www.reddit.com/r/ObsidianMD/` | 1–2 days after forum post | Cross-post with forum link |
| Obsidian Discord `#updates` | `https://discord.gg/obsidianmd` | After approval | Requires **Developer role** — get it by sharing repo in `#plugin-dev` first |
| Obsidian Discord `#share-showcase` | same server | Anytime | No role required |
| Twitter / X | Personal account | Anytime | Link to forum post |

### Forum post template (Share & Showcase)

```markdown
## ObsiMan — Bulk property & vault management plugin

**What it does**: [2–3 sentence description focused on user benefit]

**Key features**:
- Bulk edit YAML frontmatter across filtered files
- Excel-like multi-select with Ctrl/Shift/checkbox
- Live diff preview before applying changes
- Filter by any property/value combination
- Bidirectional sync with Obsidian Bases (.base files)

**Install**: Search "ObsiMan" in Settings → Community Plugins
(or via BRAT: `YOUR_USER/obsiman`)

**Screenshots**: [attach 2–3 screenshots]

**Links**:
- GitHub: https://github.com/YOUR_USER/obsiman
- Changelog: https://github.com/YOUR_USER/obsiman/releases

**Feedback welcome** — especially on: [specific areas you want input on]
```

### Reddit post tips

- Post in r/ObsidianMD with flair "Plugin/Feature"
- Lead with what problem it solves, not what it is
- Include a GIF or short video demonstrating the main workflow
- Respond to every comment in the first 24 hours

---

## 8. Post-Release

After every release:

- [ ] Verify BRAT users can install/update successfully
- [ ] Monitor GitHub Issues for bug reports
- [ ] Update `docs/Archived tasks.md` with completed items for this version
- [ ] Update `docs/ObsiMan.md` version badge/field
- [ ] Respond to forum/Reddit feedback
- [ ] Plan next version based on feedback and `docs/Obsiman - User Interface.md` backlog

---

## 9. Automation — GitHub Actions

The [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) includes a reference GitHub Actions workflow (`.github/workflows/release.yml`) that:

1. Triggers on `git push --tags`
2. Runs `npm run build`
3. Creates a GitHub Release automatically
4. Uploads `main.js`, `manifest.json`, `styles.css` as release assets

### Workflow file (`.github/workflows/release.yml`)

```yaml
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"

env:
  PLUGIN_NAME: obsiman  # must match manifest.json "id"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tag="${GITHUB_REF#refs/tags/}"
          gh release create "$tag" \
            --title "$tag" \
            --draft \
            main.js manifest.json styles.css
```

> [!tip] `secrets.GITHUB_TOKEN` is provided automatically by GitHub — no setup needed.

> [!tip] `--draft` creates a draft release for manual review before publishing. Remove `--draft` for fully automatic publishing on tag push.

> [!tip]
> With this workflow, the local release process is just:
> ```bash
> # 1. Bump versions in 4 files, commit
> git add manifest.json package.json versions.json CHANGELOG.md
> git commit -m "Release 1.4.0"
> # 2. Tag and push — workflow fires automatically
> git tag 1.4.0
> git push origin main --tags
> ```

---

## 10. Release Cadence & Branch Strategy

From `AGENTS.md`:

```
main          → stable releases only (push only at release time)
gui-changes   → low-risk visual/CSS tweaks
add-functions → new features, structural changes
```

**Release flow**:

```
add-functions (feature work)
    │
    ▼ merge to main when stable
  main
    │
    ▼ npm run build → artifacts
  GitHub Release (tag = version)
    │
    ├─▶ BRAT users (immediate)
    └─▶ Obsidian store (after PR approval)
```

### When to tag a beta vs stable release

| Condition                                       | Release type                         |
| ----------------------------------------------- | ------------------------------------ |
| Feature complete, needs real-world testing      | Beta (`1.3.0-beta.1`) via BRAT       |
| Beta stable, no critical issues after 1–2 weeks | Stable (`1.3.0`) — submit to store   |
| Critical bug in production                      | Hotfix (`1.3.1`) — fast-track stable |

---

## Related documents

- [[Archived tasks]] — completed tasks per version
- [[ObsiMan - Marketing]] — identity, competition research, announcement tasks
- [[Obsiman - User Interface]] — UI backlog and feature specifications
- [[obsiman_plugin_architecture]] — technical architecture reference
- [[ObsiMan]] — project index and roadmap
