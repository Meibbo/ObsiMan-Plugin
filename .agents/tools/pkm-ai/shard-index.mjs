#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { lineCount, listMarkdownFiles, relativePath, readMarkdown, toPosixPath } from "./lib/frontmatter.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const oversized = [];

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
  const rel = relativePath(root, file);
  if (rel.endsWith("/index.md")) continue; // Avoid sharding an index again immediately

  const limit = 200;
  const content = fs.readFileSync(file, "utf8");
  const lines = lineCount(content);
  if (lines > limit) {
    oversized.push({ path: file, rel, lines, limit });
  }
}

if (oversized.length === 0) {
  console.log("shard-index: no oversized active docs found.");
  process.exit(0);
}

if (!write) {
  console.log("path\tlines\tlimit\tsuggested action");
  for (const item of oversized) {
    const parsed = path.parse(item.rel);
    console.log(`${item.rel}\t${item.lines}\t${item.limit}\tshard into ${parsed.dir}/${parsed.name}/`);
  }
  process.exit(0);
}

// Implement --write logic
for (const item of oversized) {
  console.log(`Sharding ${item.rel}...`);
  const { frontmatter, body } = readMarkdown(item.path);
  
  // Split by H2 headers
  const sections = body.split(/^##\s+/m);
  if (sections.length <= 1) {
    console.log(`  Skipping ${item.rel}: No H2 headers found to shard.`);
    continue;
  }

  let topContent = sections[0].trim();
  const h2Sections = sections.slice(1);

  const parsed = path.parse(item.rel);
  const shardDirRel = path.join(parsed.dir, parsed.name);
  const shardDirAbs = path.join(root, shardDirRel);
  
  if (!fs.existsSync(shardDirAbs)) {
    fs.mkdirSync(shardDirAbs, { recursive: true });
  }

  const shardLinks = [];
  
  for (const section of h2Sections) {
    const firstLineEnd = section.indexOf("\n");
    const title = (firstLineEnd === -1 ? section : section.slice(0, firstLineEnd)).trim();
    const sectionBody = firstLineEnd === -1 ? "" : section.slice(firstLineEnd).trim();
    
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const shardFilename = `${slug}.md`;
    const shardPathAbs = path.join(shardDirAbs, shardFilename);

    const shardFrontmatter = {
      ...frontmatter,
      title,
      parent: `[[${toPosixPath(path.join(shardDirRel, "index"))}|${parsed.name}]]`
    };
    
    // Ensure we don't have duplicated title in frontmatter and H1 if it was already there
    // But usually we want the H1 in the shard.
    
    const shardContent = `---\n${yaml.dump(shardFrontmatter, { schema: yaml.JSON_SCHEMA })}---\n\n# ${title}\n\n${sectionBody}\n`;
    
    fs.writeFileSync(shardPathAbs, shardContent, "utf8");
    shardLinks.push(`- [[${toPosixPath(path.join(shardDirRel, slug))}|${title}]]`);
  }

  // Update original file as an index
  const indexFrontmatter = {
    ...frontmatter,
    summary: true,
    compacted: true,
  };
  
  // Clean up topContent: remove original title if we're making it a summary
  // But usually we keep it.
  
  const indexContent = `---\n${yaml.dump(indexFrontmatter, { schema: yaml.JSON_SCHEMA })}---\n\n${topContent}\n\n## Shards\n\n${shardLinks.join("\n")}\n`;
  
  const newIndexPathAbs = path.join(shardDirAbs, "index.md");
  fs.writeFileSync(newIndexPathAbs, indexContent, "utf8");
  
  // Remove original file
  fs.unlinkSync(item.path);
  
  console.log(`  Created ${shardLinks.length} shards in ${shardDirRel}/`);
}
