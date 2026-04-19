import type { VirtualFileState } from "../types/typeOps";

export type FmChangeKind = "added" | "removed" | "changed" | "unchanged";

export interface FmDelta {
  key: string;
  kind: FmChangeKind;
  before?: unknown;
  after?: unknown;
}

export interface BodyHunkLine {
  kind: "ctx" | "add" | "del";
  text: string;
  lineNo?: number;
}

export interface BodyHunk {
  header: string;
  lines: BodyHunkLine[];
}

export interface FileDiff {
  path: string;
  newPath?: string;
  fmBefore: Record<string, unknown>;
  fmAfter: Record<string, unknown>;
  fmDeltas: FmDelta[];
  bodyBefore: string;
  bodyAfter: string;
  bodyChanged: boolean;
  opSummaries: Array<{ id: string; action: string; details: string }>;
}

function cloneFm(fm: Record<string, unknown>): Record<string, unknown> {
  const out = { ...fm };
  delete out["position"]; // metadataCache artifact
  return out;
}

export function diffFm(
  fmBefore: Record<string, unknown>,
  fmAfter: Record<string, unknown>,
): FmDelta[] {
  const before = cloneFm(fmBefore);
  const after = cloneFm(fmAfter);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const deltas: FmDelta[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    const bHas = key in before;
    const aHas = key in after;
    let kind: FmChangeKind;
    if (!bHas && aHas) kind = "added";
    else if (bHas && !aHas) kind = "removed";
    else if (JSON.stringify(b) !== JSON.stringify(a)) kind = "changed";
    else kind = "unchanged";
    deltas.push({ key, kind, before: b, after: a });
  }
  return deltas;
}

export function buildFileDiff(vfs: VirtualFileState): FileDiff {
  const fmBefore = cloneFm(vfs.fmInitial);
  const fmAfter = cloneFm(vfs.fm);
  return {
    path: vfs.originalPath,
    newPath: vfs.newPath,
    fmBefore,
    fmAfter,
    fmDeltas: diffFm(fmBefore, fmAfter),
    bodyBefore: vfs.bodyInitial,
    bodyAfter: vfs.body,
    bodyChanged: vfs.bodyInitial !== vfs.body,
    opSummaries: vfs.ops.map((op) => ({
      id: op.id,
      action: op.action,
      details: op.details,
    })),
  };
}

export function buildDiff(txs: Map<string, VirtualFileState>): FileDiff[] {
  return [...txs.values()].map(buildFileDiff);
}
