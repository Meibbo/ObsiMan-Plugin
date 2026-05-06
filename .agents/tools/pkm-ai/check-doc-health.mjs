#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { lineCount, listMarkdownFiles, readMarkdown, relativePath, validateFrontmatter } from "./lib/frontmatter.mjs";
import { normalizeGlossaryTerm, readGlossaryTerms } from "./lib/glossary.mjs";
import { recordMetric } from "./lib/metrics.mjs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: node .agents/tools/pkm-ai/check-doc-health.mjs

Checks .agents/docs active Markdown files for line limits, frontmatter rules,
parent link shape, and forbidden active public agent-doc paths.`);
  process.exit(0);
}

const root = process.cwd();
const failures = [];
const warnings = [];
const superpowersPath = path.join(root, "docs", "superpowers");
const glossaryTerms = readGlossaryTerms(root);

if (fs.existsSync(superpowersPath)) {
  failures.push({ code: "forbidden-path", path: "docs/superpowers", detail: "active public docs/superpowers must not exist" });
}

for (const file of listMarkdownFiles(root, ".agents/docs", { excludeArchive: true })) {
  const rel = relativePath(root, file);
  const text = fs.readFileSync(file, "utf8");
  const limit = 200;
  const lines = lineCount(text);
  if (lines > limit) {
    failures.push({ code: "line-limit", path: rel, detail: `${lines} > ${limit}` });
  }

  try {
    const markdown = readMarkdown(file);
    failures.push(...validateFrontmatter(markdown.frontmatter, rel));
    failures.push(...validateArchiveSource(markdown.frontmatter, text, rel));
    warnings.push(...validateGlossaryCandidates(markdown.frontmatter, rel, glossaryTerms));
    warnings.push(...validateSummarySource(markdown.frontmatter, text, rel));
  } catch (error) {
    failures.push({ code: "frontmatter-parse", path: rel, detail: error.message });
  }
}

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.log(`WARN\t${warning.code}\t${warning.path}\t${warning.detail}`);
  }
}

if (failures.length > 0) {
  console.log(`doc health: FAIL (${failures.length})`);
  for (const failure of failures) {
    console.log(`${failure.code}\t${failure.path}\t${failure.detail}`);
  }
  recordMetric(root, "health_failed", { path: ".agents/docs", detail: `${failures.length} failures` });
  process.exit(1);
}

recordMetric(root, "health_passed", { path: ".agents/docs", detail: `${warnings.length} warnings` });
console.log("doc health: OK");

function validateArchiveSource(frontmatter, text, rel) {
  if (!isActiveDoc(rel)) return [];
  if (!isReplacementLike(frontmatter)) return [];
  if (hasArchiveSource(frontmatter, text)) return [];
  return [{ code: "archive-source", path: rel, detail: "replacement/compaction needs archive_source or archive link" }];
}

function validateSummarySource(frontmatter, text, rel) {
  if (!/(^|\/)(specs|plans)\//.test(rel)) return [];
  if (!isReplacementLike(frontmatter) && !/^##\s+(Summary|Resumen)\b/im.test(text)) return [];
  if (hasArchiveSource(frontmatter, text) || /(^|\/)\d{2}-[^/\n]+\.md\b/.test(text)) return [];
  return [{ code: "summary-source", path: rel, detail: "summary-like spec/plan should link source, shard, or archive" }];
}

function validateGlossaryCandidates(frontmatter, rel, terms) {
  const candidates = Array.isArray(frontmatter.glossary_candidates) ? frontmatter.glossary_candidates : [];
  return candidates
    .filter((candidate) => !terms.has(normalizeGlossaryTerm(candidate)))
    .map((candidate) => ({ code: "glossary-unknown", path: rel, detail: String(candidate) }));
}

function isActiveDoc(rel) {
  return rel.startsWith(".agents/docs/") && !rel.startsWith(".agents/docs/archive/");
}

function isReplacementLike(frontmatter) {
  return Boolean(
    frontmatter.compacted === true ||
      frontmatter.summary === true ||
      frontmatter.replaces ||
      frontmatter.summary_of ||
      frontmatter.compacted_from,
  );
}

function hasArchiveSource(frontmatter, text) {
  return Boolean(
    frontmatter.archive_source ||
      frontmatter.source_record ||
      frontmatter.shard_source ||
      /\.agents\/docs\/archive\//.test(text),
  );
}
