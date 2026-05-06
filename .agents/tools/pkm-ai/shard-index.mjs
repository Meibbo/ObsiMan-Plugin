#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { lineCount, listMarkdownFiles, relativePath } from "./lib/frontmatter.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const oversized = [];

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
  const rel = relativePath(root, file);
  const limit = 200;
  const lines = lineCount(fs.readFileSync(file, "utf8"));
  if (lines > limit) {
    const parsed = path.parse(rel);
    oversized.push({
      path: rel,
      lines,
      limit,
      suggestion: `${parsed.dir}/${parsed.name}/index.md plus topic shards`,
    });
  }
}

if (write) {
  console.log("shard-index: --write is not implemented in this first pass; report only.");
}

if (oversized.length === 0) {
  console.log("shard-index: no oversized active docs found.");
} else {
  console.log("path\tlines\tlimit\tsuggested shard");
  for (const item of oversized) {
    console.log(`${item.path}\t${item.lines}\t${item.limit}\t${item.suggestion}`);
  }
  process.exitCode = write ? 1 : 0;
}
