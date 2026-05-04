#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { buildIndex, CACHE_PATH, filterEntries, formatRows, parseArgs } from "./lib/frontmatter.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/query-docs.mjs [filters] [search terms]

Filters:
  --id VM-0001
  --type feature
  --status planned
  --initiative pkm-ai
  --tag agent/item
  --json`);
  process.exit(0);
}

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const cachePath = path.join(root, CACHE_PATH);
const entries = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8")).entries
  : buildIndex(root, { excludeArchiveRaw: false, excludeTemplates: true });
const rows = filterEntries(entries, args.filters, args.search);

if (args.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(formatRows(rows));
}
