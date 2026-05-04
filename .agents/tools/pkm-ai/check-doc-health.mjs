#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { lineCount, listMarkdownFiles, readMarkdown, relativePath, validateFrontmatter } from "./lib/frontmatter.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/check-doc-health.mjs

Checks .agents/docs active Markdown files for line limits, frontmatter rules,
parent link shape, and forbidden active public agent-doc paths.`);
  process.exit(0);
}

const root = process.cwd();
const failures = [];
const superpowersPath = path.join(root, "docs", "superpowers");

if (fs.existsSync(superpowersPath)) {
  failures.push({ code: "forbidden-path", path: "docs/superpowers", detail: "active public docs/superpowers must not exist" });
}

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchiveRaw: true })) {
  const rel = relativePath(root, file);
  const text = fs.readFileSync(file, "utf8");
  const limit = rel === ".agents/docs/current/status.md" || rel === ".agents/docs/current/handoff.md" ? 100 : 200;
  const lines = lineCount(text);
  if (lines > limit) {
    failures.push({ code: "line-limit", path: rel, detail: `${lines} > ${limit}` });
  }

  try {
    failures.push(...validateFrontmatter(readMarkdown(file).frontmatter, rel));
  } catch (error) {
    failures.push({ code: "frontmatter-parse", path: rel, detail: error.message });
  }
}

if (failures.length > 0) {
  console.log(`doc health: FAIL (${failures.length})`);
  for (const failure of failures) {
    console.log(`${failure.code}\t${failure.path}\t${failure.detail}`);
  }
  process.exit(1);
}

console.log("doc health: OK");
