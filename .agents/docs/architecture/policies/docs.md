---
title: Docs policy
type: policy
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T16:55:00
tags:
  - agent/policy
---

# Docs Policy

## Rules

- Active agent Markdown files stay under 200 lines as a sharding trigger, not an
  instruction to remove detail.
- Preserve source detail first. Never compress, omit, summarize away, or delete
  technical context just to satisfy line limits.
- `current/status.md` and `current/handoff.md` stay under 100 lines by linking
  to shards or archives, not by losing information.
- Line limits protect navigation. They do not authorize lossy summaries.
- If a user asks for exhaustive capture, write the full detail without requiring
  them to separately say "do not omit detail".
- If sharding would slow down or interrupt capture, a temporary oversized source
  file is allowed. Add or queue a follow-up shard/manifest pass.
- Use timestamps as `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Do not fabricate update times. If exact edit time is unavailable, mark the
  timestamp as approximate in the handoff or use a timestamp script.
- Use one `parent` property with a full-path Obsidian wikilink and initiative alias.
- Do not use `parent_path`.
- Keep indexes compact; shard large docs into folder manifests.
- Shards may be thematic or continuation-based. Do not force a topic boundary
  just to satisfy a line limit. If one topic exceeds the page size, continue it
  in `part-2`, `part-3`, or similarly named shards, then route the next topic to
  a separate shard.
- Keep `current/handoff.md` compact; shard long handoff history into archive
  handoff files and link them from the current handoff.
- Do not delete agent working memory when the user asked for archive; move it to
  `.agents/docs/archive/<initiative>/...` or record the replacement path.
- When replacing a long active file, preserve the full source record first, then
  create a route summary or shard manifest that links to the preserved detail.
- Before replacing `current/status.md`, `current/handoff.md`, specs, plans, or
  policies in a way that removes substantial content, run
  `.agents/tools/pkm-ai/archive-active-doc.mjs` and link the archive from the
  replacement with `archive_source` or an explicit archive wikilink/path.
- Compacting or rewriting away detail without an archive source is a health
  failure, even if the active file satisfies line limits.
- A 200-line active route summary is useful only if it lets the agent reconstruct
  the big picture from linked source records and shards.
- Prefer detailed shards over terse summaries whenever the material is a spec,
  plan, design rationale, domain model, regression report, or implementation
  handoff.
- Before answering about an unfamiliar domain term, consult
  `.agents/docs/architecture/glossary.md` or
  `.agents/tools/pkm-ai/query-docs.mjs --glossary <term>`.
- If a term is missing from the glossary, say it is not in the glossary and
  propose adding it or marking it as an external/test term.
- New docs that intentionally introduce glossary candidates should list them in
  `glossary_candidates` until they are accepted or rejected.

## Read When

- Creating, migrating, refreshing, or reviewing agent docs.

## Do Not Read When

- Editing product code with no docs impact.

## Related Decisions

- Authoring policies from PKM-AI orchestration refresh.

## Repair Triggers

- Line limits are exceeded.
- Frontmatter fails YAML parsing.
- Parent links are missing, duplicated, or use `parent_path`.
- Active docs accumulate historical logs.
- Archived source for deleted working memory cannot be found.
- A summary has no source record, shard, or archive link for its lost detail.
- Unknown `glossary_candidates` appear in active docs.
