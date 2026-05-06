# Memory and Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the hybrid memory architecture and PC-delegated tools for PKM-AI (archive, AST code parsing, graph traversal, logs, and metrics analysis).

**Architecture:** We are creating a suite of standalone NodeJS `.mjs` scripts inside `.agents/tools/pkm-ai/` that can be invoked by the agent to offload heavy scanning tasks. We also update the system routing (`start.md`) and specific skills to enforce the usage of these scripts over brute-force file reads.

**Tech Stack:** NodeJS (ES Modules), File System (fs), Acorn (for simple AST if needed) or RegExp parsing, shell execution.

---

### Task 1: Implement `manage-memory.mjs`

**Files:**
- Create: `.agents/tools/pkm-ai/manage-memory.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';
import path from 'path';

const action = process.argv[2];
const archiveDir = '.agents/docs/archive';

if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

if (action === 'archive') {
    const summary = process.argv[3] || 'No summary';
    const content = process.argv[4] || '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `archive-${timestamp}.md`;
    const filepath = path.join(archiveDir, filename);
    
    const fileContent = `---\ntitle: ${summary}\ntype: archive\ndate: ${new Date().toISOString()}\n---\n\n${content}\n`;
    fs.writeFileSync(filepath, fileContent, 'utf-8');
    console.log(`Archived to ${filepath}`);
} else if (action === 'retrieve') {
    const files = fs.readdirSync(archiveDir);
    console.log(`Archived files:\n${files.join('\n')}`);
} else {
    console.error('Usage: node manage-memory.mjs <archive|retrieve> [summary] [content]');
    process.exit(1);
}
```

- [ ] **Step 2: Run to verify it works**

Run: `node .agents/tools/pkm-ai/manage-memory.mjs archive "Test summary" "Test content"`
Expected: Prints `Archived to .agents/docs/archive/archive-[timestamp].md` and creates the file.

- [ ] **Step 3: Commit**

```bash
git add .agents/tools/pkm-ai/manage-memory.mjs
git commit -m "feat(pkm-ai): add manage-memory tool for archiving context"
```

---

### Task 2: Implement `analyze-code.mjs`

**Files:**
- Create: `.agents/tools/pkm-ai/analyze-code.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';
import path from 'path';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node analyze-code.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');

// Extremely simple RegExp based "AST-like" extraction for signatures
const exportMatches = content.match(/export\s+(const|function|class|interface|type)\s+(\w+)/g) || [];
const propMatches = content.match(/export\s+let\s+(\w+)/g) || [];

console.log(`=== Analysis for ${targetFile} ===`);
console.log('Exports found:');
exportMatches.forEach(m => console.log(`- ${m}`));
console.log('Props (Svelte) found:');
propMatches.forEach(m => console.log(`- ${m}`));
```

- [ ] **Step 2: Run to verify it works**

Run: `node .agents/tools/pkm-ai/analyze-code.mjs src/components/pages/pageFilters.svelte` (or any existing file)
Expected: Prints the exports and props found.

---

### Task 3: Implement `traverse-graph.mjs`

**Files:**
- Create: `.agents/tools/pkm-ai/traverse-graph.mjs`

- [ ] **Step 1: Write the tool script**

```javascript
import fs from 'fs';

const targetFile = process.argv[2];

if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node traverse-graph.mjs <file_path>');
    process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');
const imports = content.match(/import\s+.*?\s+from\s+['"](.*?)['"]/g) || [];

console.log(`=== Dependencies for ${targetFile} ===`);
imports.forEach(i => console.log(i));
```

- [ ] **Step 2: Run to verify it works**

Run: `node .agents/tools/pkm-ai/traverse-graph.mjs src/components/pages/pageFilters.svelte`
Expected: Prints the import statements found in the file.

- [ ] **Step 3: Commit**

```bash
git add .agents/tools/pkm-ai/traverse-graph.mjs
git commit -m "feat(pkm-ai): add traverse-graph tool for dependency tracking"
```

---

### Task 4: Implement `analyze-logs.mjs` and `analyze-metrics.mjs`

**Files:**
- Create: `.agents/tools/pkm-ai/analyze-logs.mjs`
- Create: `.agents/tools/pkm-ai/analyze-metrics.mjs`

- [ ] **Step 1: Write the `analyze-logs.mjs` tool**

```javascript
import fs from 'fs';

const logFile = process.argv[2];

if (!logFile || !fs.existsSync(logFile)) {
    console.error('Usage: node analyze-logs.mjs <log_file_path>');
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf-8');
const errorLines = content.split('\n').filter(line => line.includes('Error') || line.includes('Exception'));

console.log(`Found ${errorLines.length} error lines.`);
errorLines.slice(0, 10).forEach(line => console.log(line));
if(errorLines.length > 10) console.log('... (truncated)');
```

- [ ] **Step 2: Write the `analyze-metrics.mjs` tool**

```javascript
import fs from 'fs';

const metricsFile = '.agents/metrics/pkm-ai.jsonl';

if (!fs.existsSync(metricsFile)) {
    console.error('Metrics file not found.');
    process.exit(1);
}

const content = fs.readFileSync(metricsFile, 'utf-8');
const lines = content.trim().split('\n');
console.log(`Total metric events: ${lines.length}`);
console.log('Last 5 events:');
lines.slice(-5).forEach(l => console.log(l));
```

- [ ] **Step 3: Verify the tools**

Run: `node .agents/tools/pkm-ai/analyze-metrics.mjs`
Expected: Prints total metrics and the last 5 events.

- [ ] **Step 4: Commit**

```bash
git add .agents/tools/pkm-ai/analyze-logs.mjs .agents/tools/pkm-ai/analyze-metrics.mjs
git commit -m "feat(pkm-ai): add logs and metrics analysis tools"
```

---

### Task 5: Enforce Tool Usage in Docs and Skills

**Files:**
- Modify: `.agents/docs/start.md:14-22` (approx)
- Modify: `.agents/skills/diagnose/SKILL.md`
- Modify: `.agents/skills/improve-codebase-architecture/SKILL.md`

- [ ] **Step 1: Update `.agents/docs/start.md`**

Add these lines to the `Always read:` section instructions:

```markdown
- For large code files, use `.agents/tools/pkm-ai/analyze-code.mjs` instead of reading the whole file.
- To archive long context, use `.agents/tools/pkm-ai/manage-memory.mjs archive`.
```

- [ ] **Step 2: Update `diagnose/SKILL.md`**

In the "Execution" or "Process" section, add:
```markdown
- You MUST use `.agents/tools/pkm-ai/analyze-logs.mjs` to read error logs before attempting to guess the failure.
```

- [ ] **Step 3: Update `improve-codebase-architecture/SKILL.md`**

In the "Discovery" section, add:
```markdown
- You MUST use `.agents/tools/pkm-ai/traverse-graph.mjs` to understand file dependencies before moving or refactoring code.
```

- [ ] **Step 4: Commit**

```bash
git add .agents/docs/start.md .agents/skills/diagnose/SKILL.md .agents/skills/improve-codebase-architecture/SKILL.md
git commit -m "docs(pkm-ai): enforce usage of new analysis tools in base docs and skills"
```
