#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseMarkdown, toPosixPath } from "./lib/frontmatter.mjs";

const HELP = `Usage: node .agents/tools/pkm-ai/manage-tasks.mjs [options]

Options:
  --file <path>           Target Markdown file to update or read.
  --status <status>       Update frontmatter status (todo, in-progress, done, blocked, etc.).
  --agent <name>          Update updated_by in frontmatter (codex, claude, etc.).
  --toggle <id|regex>     Toggle a task line. 
                          - IDs: [ ], [/], [x]
                          - Statuses: --todo, --progress, --done
  --complete-plan         Append '✅ YYYY-MM-DDTHH:mm:ss' to the end of the file.
  --create                Create a new file from a template.
  --template <name>       Template name (item, plan, spec).
  --title <title>         Title for the new file.
  --initiative <init>     Initiative name for the new file.
  --id <id>               ID for the new file (e.g. VM-0001).
  --parent <link>         Parent wikilink (e.g. [[docs/work/init/index|init]]).
  --filter <status>       Filter tasks from the file and print them (todo, progress, done).
  --help, -h              Show this help message.

Examples:
  node .agents/tools/pkm-ai/manage-tasks.mjs --file docs/work/init/plans/p.md --status done --complete-plan
  node .agents/tools/pkm-ai/manage-tasks.mjs --file docs/work/init/plans/p.md --toggle "Task A" --done
  node .agents/tools/pkm-ai/manage-tasks.mjs --create --template plan --title "Phase 2" --initiative hardening
`;

function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || Object.keys(args).length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const now = formatLocalTimestamp(new Date());

  if (args.create) {
    handleCreate(args, now);
    return;
  }

  if (!args.file) {
    console.error("Error: --file is required for updates or filtering.");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, "utf8");
  let { body, rawFrontmatter } = parseMarkdown(content);
  let changed = false;

  if (args.filter) {
    handleFilter(body, args.filter);
    return;
  }

  // Use line-based frontmatter update to preserve formatting
  let lines = rawFrontmatter.split(/\r?\n/);
  
  if (args.status) {
    updateLine(lines, "status", args.status);
    changed = true;
  }
  if (args.agent) {
    updateLine(lines, "updated_by", args.agent);
    changed = true;
  }
  if (changed) {
    updateLine(lines, "updated", now);
  }

  if (args.toggle) {
    const targetStatus = args.done ? "x" : args.progress ? "/" : args.todo ? " " : null;
    if (targetStatus !== null) {
      const newBody = toggleTask(body, args.toggle, targetStatus);
      if (newBody !== body) {
        body = newBody;
        changed = true;
      }
    }
  }

  if (args.completePlan) {
    if (!body.includes("✅")) {
      body = body.trimEnd() + `\n\n✅ ${now}\n`;
      changed = true;
    }
  }

  if (changed) {
    const newContent = `---\n${lines.join("\n")}\n---\n${body}`;
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${args.file}`);
  } else {
    console.log(`No changes made to ${args.file}`);
  }
}

function updateLine(lines, key, value) {
  const index = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (index >= 0) {
    lines[index] = `${key}: ${value}`;
  } else {
    lines.push(`${key}: ${value}`);
  }
}

function toggleTask(body, search, status) {
  const lines = body.split("\n");
  const regex = new RegExp(search, "i");
  let found = false;
  const newLines = lines.map((line) => {
    if (!found && regex.test(line) && line.includes("- [")) {
      found = true;
      return line.replace(/- \[[ x/]?\]/, `- [${status}]`);
    }
    return line;
  });
  return newLines.join("\n");
}

function handleFilter(body, status) {
  const char = status === "done" ? "x" : status === "progress" ? "/" : " ";
  const lines = body.split("\n");
  const tasks = lines.filter((l) => l.includes(`- [${char}]`));
  console.log(tasks.join("\n"));
}

function handleCreate(args, now) {
  const templateName = args.template || "item";
  const templatePath = path.resolve(process.cwd(), `.agents/docs/templates/${templateName}-template.md`);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template not found: ${templatePath}`);
    process.exit(1);
  }

  let template = fs.readFileSync(templatePath, "utf8");
  const agent = args.agent || "antigravity";
  const initiative = args.initiative || "draft";
  const title = args.title || "New Item";
  const id = args.id || "";
  const parent = args.parent || `[[docs/work/${initiative}/index|${initiative}]]`;

  const output = template
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{initiative\}\}/g, initiative)
    .replace(/\{\{id\}\}/g, id)
    .replace(/\{\{timestamp\}\}/g, now)
    .replace(/\{\{agent\}\}/g, agent)
    .replace(/\{\{parent_link\}\}/g, parent);

  const fileName = (id ? `${id}-` : "") + title.toLowerCase().replace(/\s+/g, "-") + ".md";
  const dir = path.join(process.cwd(), ".agents/docs/work", initiative, args.template === "item" ? "items" : args.template === "plan" ? "plans" : "specs");
  
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const finalPath = path.join(dir, fileName);
  fs.writeFileSync(finalPath, output);
  console.log(`Created ${toPosixPath(path.relative(process.cwd(), finalPath))}`);
}

main();
