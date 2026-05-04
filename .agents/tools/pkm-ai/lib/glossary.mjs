import fs from "node:fs";
import path from "node:path";

export const GLOSSARY_PATH = ".agents/docs/architecture/glossary.md";

export function readGlossaryTerms(root = process.cwd()) {
  const filePath = path.join(root, GLOSSARY_PATH);
  if (!fs.existsSync(filePath)) return new Set();

  const text = fs.readFileSync(filePath, "utf8");
  const terms = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^-\s+([^:]+):/);
    if (match) terms.add(normalizeGlossaryTerm(match[1]));
  }
  return terms;
}

export function normalizeGlossaryTerm(term) {
  return String(term).trim().toLowerCase();
}

export function hasGlossaryTerm(root, term) {
  return readGlossaryTerms(root).has(normalizeGlossaryTerm(term));
}
