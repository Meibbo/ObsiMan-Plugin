export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

function getValue(node: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = node;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function sortNodes<T>(nodes: readonly T[], opt: SortOption): T[] {
  const out = [...nodes];
  const dir = opt.direction === 'asc' ? 1 : -1;
  out.sort((a, b) => {
    const va = getValue(a, opt.field);
    const vb = getValue(b, opt.field);
    if (va === vb) return 0;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
    return 0;
  });
  return out;
}
