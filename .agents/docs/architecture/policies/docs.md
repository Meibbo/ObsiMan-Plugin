---
title: Docs policy
type: policy
status: active
parent: "[[.agents/docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-04T08:40:55
tags:
  - agent/policy
---

# Docs Policy

## Rules

- Active agent Markdown files stay under 200 lines as a sharding trigger, not an
  instruction to remove detail.
- `current/status.md` and `current/handoff.md` stay under 100 lines.
- Line limits protect navigation. They do not authorize lossy summaries.
- Use timestamps as `YYYY-MM-DDTHH:mm:ss` with no timezone offset.
- Do not fabricate update times. If exact edit time is unavailable, mark the
  timestamp as approximate in the handoff or use a timestamp script.
- Use one `parent` property with a full-path Obsidian wikilink and initiative alias.
- Do not use `parent_path`.
- Keep indexes compact; shard large docs into folder manifests.
- Keep `current/handoff.md` compact; shard long handoff history into archive
  handoff files and link them from the current handoff.
- Do not delete agent working memory when the user asked for archive; move it to
  `.agents/docs/archive/<initiative>/...` or record the replacement path.
- When replacing a long active file, preserve the full source record first, then
  create a route summary or shard manifest that links to the preserved detail.
- A 200-line active route summary is useful only if it lets the agent reconstruct
  the big picture from linked source records and shards.

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
