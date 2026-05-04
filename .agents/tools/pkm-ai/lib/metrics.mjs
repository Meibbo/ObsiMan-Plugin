import fs from "node:fs";
import path from "node:path";

export const METRICS_PATH = ".agents/metrics/pkm-ai.jsonl";

export const METRIC_EVENTS = new Set([
  "glossary_checked",
  "glossary_miss",
  "archive_created",
  "line_limit_sharded",
  "health_failed",
  "health_passed",
]);

export function nowTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "");
}

export function assertTimestamp(timestamp) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    throw new Error("timestamp must use YYYY-MM-DDTHH:mm:ss");
  }
}

export function recordMetric(root, event, fields = {}) {
  if (!METRIC_EVENTS.has(event)) {
    throw new Error(`unknown metric event: ${event}`);
  }

  const ts = fields.ts ?? nowTimestamp();
  assertTimestamp(ts);

  const entry = { ts, event };
  for (const [key, value] of Object.entries(fields)) {
    if (key !== "ts" && value !== undefined && value !== "") entry[key] = value;
  }

  const filePath = path.join(root, METRICS_PATH);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`);
  return entry;
}
