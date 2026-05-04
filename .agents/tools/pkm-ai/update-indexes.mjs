#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { listMarkdownFiles, parseMarkdown, readMarkdown, relativePath } from "./lib/frontmatter.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/update-indexes.mjs

Updates .agents/docs/current/backlog.md from item files under .agents/docs/work/**/items/.
This command writes the backlog index.`);
  process.exit(0);
}

const root = process.cwd();
const backlogPath = path.join(root, ".agents/docs/current/backlog.md");
const itemFiles = listMarkdownFiles(root, ".agents/docs/work", { excludeArchiveRaw: true }).filter((file) =>
  relativePath(root, file).includes("/items/"),
);

const items = itemFiles
  .map((file) => {
    const rel = relativePath(root, file);
    const frontmatter = readMarkdown(file).frontmatter;
    return {
      id: frontmatter.id ?? "",
      title:
        frontmatter.title ??
        titleFromItemPath(file, frontmatter.id) ??
        cleanTitle(firstHeading(fs.readFileSync(file, "utf8")), frontmatter.id) ??
        path.basename(file, ".md"),
      status: frontmatter.status ?? "",
      size: frontmatter.task_size ?? "",
      path: rel.replace(/\.md$/, ""),
    };
  })
  .filter((item) => item.id)
  .sort((a, b) => a.id.localeCompare(b.id));

const current = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, "utf8") : "";
const parsed = parseMarkdown(current);
const frontmatterBlock = parsed.rawFrontmatter ? `---\n${parsed.rawFrontmatter}\n---\n\n` : "";
const lines = [
  "# Current Backlog",
  "",
  "All active backlog items. Canonical records live under",
  "`.agents/docs/work/<initiative>/items/`.",
  "",
  "## Items",
  "",
  ...items.map((item) => `- [[${item.path}|${item.id}]] - ${item.title}; ${item.status}; ${item.size}.`),
  "",
  "## Shard Trigger",
  "",
  "Shard by initiative or status when this index approaches 150 lines or exceeds",
  "one screen of active work.",
  "",
];

fs.writeFileSync(backlogPath, `${frontmatterBlock}${lines.join("\n")}`);
console.log(`updated .agents/docs/current/backlog.md from ${items.length} item file(s)`);

function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1];
}

function titleFromItemPath(file, id) {
  if (!id) return undefined;
  const slug = path.basename(file, ".md");
  const prefix = `${id.toLowerCase()}-`;
  if (!slug.toLowerCase().startsWith(prefix)) return undefined;
  return slug
    .slice(prefix.length)
    .split("-")
    .map((word, index) => (word === "pkm" || word === "ai" ? word.toUpperCase() : index === 0 ? capitalize(word) : word))
    .join(" ")
    .replace("PKM AI", "PKM-AI");
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function cleanTitle(title, id) {
  if (!title) return undefined;
  return id ? title.replace(new RegExp(`^${escapeRegex(id)}\\s+`, "i"), "") : title;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
