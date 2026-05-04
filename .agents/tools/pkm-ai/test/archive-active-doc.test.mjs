import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const toolPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "archive-active-doc.mjs");

test("archive-active-doc copies an active doc into initiative archive and records manifest", () => {
  const root = makeTempRoot();
  const docPath = path.join(root, ".agents", "docs", "current", "status.md");
  writeFile(
    docPath,
    `---
title: Current status
type: agent-status
status: active
parent: "[[.agents/docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:00:00
updated: 2026-05-04T01:00:00
tags:
  - agent/current
---

# Current Status

Important source detail.
`,
  );

  const output = execFileSync(
    process.execPath,
    [
      toolPath,
      "--initiative",
      "pkm-ai",
      "--reason",
      "preserve before compacting current status",
      "--now",
      "2026-05-04T16:20:30",
      ".agents/docs/current/status.md",
    ],
    { cwd: root, encoding: "utf8" },
  );

  const archivePath = output.trim();
  assert.equal(
    archivePath,
    ".agents/docs/archive/pkm-ai/active-docs/2026-05-04T162030-current-status.md",
  );
  assert.equal(fs.readFileSync(path.join(root, archivePath), "utf8"), fs.readFileSync(docPath, "utf8"));

  const manifest = fs.readFileSync(path.join(root, ".agents", "docs", "archive", "pkm-ai", "manifest.md"), "utf8");
  assert.match(manifest, /archive_created/);
  assert.match(manifest, /preserve before compacting current status/);
  assert.match(manifest, /2026-05-04T162030-current-status\.md/);
});

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pkm-ai-archive-"));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
