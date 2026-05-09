---
title: Node notes next-priority implementation order
type: backlog-priority
status: active
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set|binding notes and set]]"
created: 2026-05-09T03:42:43
updated: 2026-05-09T03:42:43
tags:
  - agent/backlog
  - vaultman/node-binding
  - vaultman/page-tools
  - priority/next
created_by: codex
updated_by: codex
---

# Node Notes Next-Priority Implementation Order

## Decision

Promote the node-notes addendum as the next implementation lane before the
remaining post-cut-9 polish cuts and before TanStack table follow-up polish.

Reason: this work extends the already-shipped `NodeBindingService` while that
context is fresh, gives the finished binding-note feature visible new surfaces,
and directly answers the latest user request. The remaining cut ladder still
matters, but most pending items are polish, audits, or broader holding cuts.

## Immediate Guardrail

Do not start product-code implementation until the current dirty worktree is
understood. At the time this priority was recorded, unrelated modified/untracked
files already existed outside this docs change.

## Ordered Node-Notes Cuts

### NN-0 - Contract Correction

Scope:

- Update `NodeBindingService` tests for:
  - `snippet -> $snippetname`
  - `plugin -> %pluginname`
- Extend `BindingNodeKind` with `plugin`.
- Decide and encode canonical plugin token as `%${manifest.id}`.
- Add typed internal wrappers in `typeObsidian.ts` for `customCss` and
  community plugin controls.

Why first: every later UI path depends on these semantics.

### NN-1 - Snippets Explorer In pageTools

Scope:

- Implement snippets index from `app.customCss.snippets`, with filesystem
  fallback over `.obsidian/snippets/*.css`.
- Add `explorerSnippets` provider.
- Add `tabSnippets.svelte` inside `pageTools`.
- Render the enabled/disabled toggle in the count-side slot.
- Wire binding-note action using `$snippetname`.

Why before plugins: snippet toggling is narrower than plugin toggling and uses
an already-known Obsidian internal surface from MySnippets.

### NN-2 - Plugins Explorer In pageTools

Scope:

- Implement plugins index from `app.plugins.manifests`.
- Add `explorerPlugins` provider.
- Add `tabPlugins.svelte` inside `pageTools`.
- Make binding-note action create/open `%pluginId` notes.
- Keep enable/disable guarded and explicit; never disable Vaultman itself.

Why after snippets: plugin controls mutate Obsidian state and need stricter
guardrails.

### NN-3 - PageStats Add-ons Note Preview

Scope:

- Replace the Statistics left FAB stub with an add-ons island.
- Add `Open note` through a public `FuzzySuggestModal<TFile>`.
- Render selected note markdown in-frame with
  `MarkdownRenderer.render(app, markdown, host, file.path, component)`.
- Add `Show PageStats` to unload the render component and restore stats.

Why after pageTools explorers: this is independent, but it depends on the same
"note as first-class in-frame surface" direction and should not block data
provider work.

### NN-4 - Native Obsidian Surface Adapter

Scope:

- Add Tag Wrangler-style Ctrl/Cmd/Alt/middle click handling for native tag and
  property tag surfaces.
- Add Folder Notes-style handling for file-explorer folders and breadcrumbs.
- Trigger hover previews with `workspace.trigger("hover-link", ...)`.
- Use capture handlers and prevent native behavior only after Vaultman handles
  the event.

Why later: this touches private DOM selectors and needs live Obsidian smoke
coverage.

### NN-5 - Harness Spike Only If Needed

Scope:

- Prefer existing unit/component tests plus Obsidian CLI/CDP smoke.
- Consider `obsidian-web` only as an isolated spike pinned to a commit, no real
  vault data, no vendored code, and only after licensing/safety constraints are
  accepted.

Why last: it is test infrastructure risk, not product behavior.

## Order Against Existing Pending Work

1. Finish/triage existing dirty worktree state.
2. NN-0 through NN-3.
3. NN-4 if live Obsidian smoke tooling is available.
4. Backlog Cut 10: user-facing view-size control.
5. Backlog Cut 11: cursor affordance and cheap hover pass.
6. Backlog Cuts 12-15: release-blocking audits for explorer search,
   queue/file/grid correctness, active highlighting, and badge bubbling.
7. Backlog Cuts 16-18: rename decision, overlay behavior, performance
   verification.
8. Backlog Cuts 19-24 and TanStack post-MVP table follow-ups.
9. Backlog Cut 25 stays post-rc.1 holding work.

## Source Links

- [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/index|node note UI assimilation research]]
- [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/03-tools-snippets-plugins|pageTools snippets and plugins explorers]]
- [[docs/work/hardening/plans/2026-05-07-multifacet-2/07-binding-notes-and-set|binding notes plan shard]]
- [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index|pending cut ladder]]

