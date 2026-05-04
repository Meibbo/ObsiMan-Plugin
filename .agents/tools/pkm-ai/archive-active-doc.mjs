#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { recordMetric } from "./lib/metrics.mjs";
import { relativePath, toPosixPath } from "./lib/frontmatter.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/archive-active-doc.mjs --initiative <name> --reason <text> [--now YYYY-MM-DDTHH:mm:ss] <active-doc-path>

Copies an active agent Markdown doc to .agents/docs/archive/<initiative>/active-docs/
before a substantial rewrite. Prints the archive path for archive_source links.`);
  process.exit(0);
}

const args = process.argv.slice(2);
const options = { initiative: "", reason: "", now: "" };
const positional = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--initiative") {
    options.initiative = args[index + 1] ?? "";
    index += 1;
  } else if (arg === "--reason") {
    options.reason = args[index + 1] ?? "";
    index += 1;
  } else if (arg === "--now") {
    options.now = args[index + 1] ?? "";
    index += 1;
  } else {
    positional.push(arg);
  }
}

try {
  const archivePath = archiveActiveDoc(process.cwd(), positional[0], options);
  console.log(archivePath);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export function archiveActiveDoc(root, activePath, options) {
  if (!activePath) throw new Error("active doc path is required");
  if (!options.initiative) throw new Error("--initiative is required");
  if (!options.reason) throw new Error("--reason is required");

  const sourcePath = path.resolve(root, activePath);
  if (!fs.existsSync(sourcePath)) throw new Error(`active doc not found: ${activePath}`);

  const rel = relativePath(root, sourcePath);
  if (!rel.startsWith(".agents/docs/") || rel.startsWith(".agents/docs/archive/")) {
    throw new Error("active doc must be under .agents/docs and outside archive");
  }

  const timestamp = (options.now || new Date().toISOString().replace(/\.\d{3}Z$/, "")).replace(/:/g, "");
  const name = path.basename(activePath, ".md");
  const parentName = path.basename(path.dirname(activePath));
  const archiveRel = `.agents/docs/archive/${options.initiative}/active-docs/${timestamp}-${parentName}-${name}.md`;
  const archiveAbs = path.join(root, archiveRel);

  fs.mkdirSync(path.dirname(archiveAbs), { recursive: true });
  fs.copyFileSync(sourcePath, archiveAbs);
  updateManifest(root, options.initiative, {
    source: rel,
    archive: archiveRel,
    reason: options.reason,
    now: options.now || "",
  });
  recordMetric(root, "archive_created", { ts: options.now || undefined, path: archiveRel, detail: options.reason });

  return toPosixPath(archiveRel);
}

function updateManifest(root, initiative, entry) {
  const manifestPath = path.join(root, ".agents", "docs", "archive", initiative, "manifest.md");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(
      manifestPath,
      `---
title: ${initiative} archive manifest
type: archive-manifest
status: active
created: ${entry.now || "unknown"}
updated: ${entry.now || "unknown"}
tags:
  - agent/archive
---

# ${initiative} Archive Manifest

`,
    );
  }
  fs.appendFileSync(
    manifestPath,
    `- archive_created: ${entry.archive} from ${entry.source}; reason: ${entry.reason}\n`,
  );
}
