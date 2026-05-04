import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "check-doc-health.mjs");

test("check-doc-health fails compacted active docs without archive source", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "current", "handoff.md"),
    `---
title: Current handoff
type: agent-handoff
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
compacted: true
tags:
  - agent/current
---

# Current Handoff

Short replacement.
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /archive-source/);
});

test("check-doc-health warns for unknown glossary candidates", () => {
  const root = makeTempRoot();
  writeFile(
    path.join(root, ".agents", "docs", "architecture", "glossary.md"),
    `---
title: Glossary
type: architecture
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
tags:
  - agent/architecture
---

# Glossary

- Known term: defined.
`,
  );
  writeFile(
    path.join(root, ".agents", "docs", "work", "pkm-ai", "notes", "term-test.md"),
    `---
title: Term test
type: note
status: draft
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T16:22:00
glossary_candidates:
  - swam
tags:
  - agent/note
---

# Term Test
`,
  );

  const result = spawnSync(process.execPath, [toolPath], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /doc health: OK/);
  assert.match(result.stdout, /WARN/);
  assert.match(result.stdout, /glossary-unknown/);
  assert.match(result.stdout, /swam/);
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-health-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
