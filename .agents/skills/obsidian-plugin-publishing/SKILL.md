# Obsidian Plugin Publishing Workflow

Use this skill when the user asks about releasing, publishing, distributing, or announcing ObsiMan (or any Obsidian community plugin). Covers the full lifecycle: GitHub release → BRAT beta → official store → community.

> **Full reference doc**: `docs/obsiman-publishing-workflow.md` — read it for detailed steps, templates, and examples. This skill is the fast-lookup summary.

---

## Release artifacts (required)

Every GitHub Release MUST include these file attachments:

| File | Notes |
|------|-------|
| `main.js` | Built by `npm run build`. Do NOT commit to git. |
| `manifest.json` | Plugin metadata. Tag must match `version` field exactly. |
| `styles.css` | Optional, only if plugin has styles. |

## Version bump (all 4, always together)

```
manifest.json  → "version": "X.Y.Z"
package.json   → "version": "X.Y.Z"
versions.json  → "X.Y.Z": "<min-obsidian-version>"
CHANGELOG.md   → ## [X.Y.Z] — YYYY-MM-DD
```

## Tag convention

- Stable: `1.3.0` (**no `v` prefix — enforced by Obsidian's bot**)
- Beta: `1.3.0-beta.1`
- Hotfix: `1.3.1`

Tag must match `manifest.json → version` exactly. The `validate-plugin-entry.yml` bot rejects tags with a `v` prefix.

## Release flow

```
1. Bump versions (4 files) → commit to main
2. git tag X.Y.Z && git push origin X.Y.Z
3. GitHub: Draft Release → attach main.js + manifest.json + styles.css
4. BRAT users can install immediately
5. For official store: PR to obsidianmd/obsidian-releases
```

## BRAT (beta distribution)

- Repo: `TfTHacker/obsidian42-brat` (user installs this plugin first)
- Author action: public repo + GitHub release with main.js + manifest.json
- User installs by entering `username/obsiman` in BRAT settings
- Works with pre-releases too
- Share instructions: "Install BRAT → Add Beta Plugin → enter `username/obsiman`"

## Official store submission

1. Fork `obsidianmd/obsidian-releases`
2. Add to `community-plugins.json` (alphabetical by `id`):
   ```json
   {
     "id": "obsiman",
     "name": "ObsiMan",
     "author": "YOUR_NAME",
     "description": "Bulk property operations and vault management...",
     "repo": "username/obsiman"
   }
   ```
3. PR title: `Add plugin: ObsiMan`
4. Wait for volunteer review (1–4 weeks typical)

**Pre-submission naming rules (bot-enforced):**
- `id` must NOT contain `"obsidian"` (`obsiman` ✅)
- `name` must NOT end with `"Plugin"` (`ObsiMan` ✅)
- `description` must end with `.`, `?`, `!`, or `)` — verify this
- `id` lowercase, letters/numbers/hyphens only
- Version `x.y.z` only (no `v`, no `-beta`)

**Pre-submission checklist:**
- [ ] Stable release exists with correct bare semver tag
- [ ] Plugin follows Obsidian Plugin Guidelines (no telemetry, no remote eval)
- [ ] README is complete and informative
- [ ] `minAppVersion` is accurate
- [ ] `onunload()` cleans up all listeners/intervals/DOM

## Community announcements (after approval)

| Channel | Notes |
|---------|-------|
| `forum.obsidian.md/c/share-showcase/9` | Primary announcement post |
| `reddit.com/r/ObsidianMD` | Lead with the problem it solves |
| Obsidian Discord `#share-showcase` | Short post, link to forum thread |

## GitHub Actions automation

Reference workflow in `obsidian-sample-plugin`: `.github/workflows/release.yml`
- Trigger: `push` with tags
- Steps: checkout → node setup → `npm run build` → `gh release create`
- Full workflow template: see `docs/obsiman-publishing-workflow.md#9`

## Task files to update at release

- `docs/Archived tasks.md` — move completed items here, tagged with version
- `docs/ObsiMan - Marketing.md` — update marketing/announcement tasks
- `docs/Obsiman - User Interface.md` — update UI backlog status
- `docs/ObsiMan.md` — bump `version:` frontmatter field

## Key links

- Obsidian releases repo: `https://github.com/obsidianmd/obsidian-releases`
- Sample plugin: `https://github.com/obsidianmd/obsidian-sample-plugin`
- Plugin guidelines: `https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines`
- BRAT: `https://github.com/TfTHacker/obsidian42-brat`
- Obsidian forum Share & Showcase: `https://forum.obsidian.md/c/share-showcase/9`
