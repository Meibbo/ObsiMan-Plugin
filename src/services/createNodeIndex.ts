import type { INodeIndex, NodeBase } from '../types/contracts';

export interface NodeIndexOptions<TNode extends NodeBase> {
  build: () => TNode[] | Promise<TNode[]>;
}

export function createNodeIndex<TNode extends NodeBase>(
  opts: NodeIndexOptions<TNode>,
): INodeIndex<TNode> {
  let _nodes: TNode[] = [];
  let _byId = new Map<string, TNode>();
  const subs = new Set<() => void>();

  const fire = (): void => {
    for (const cb of subs) cb();
  };

  return {
    get nodes(): readonly TNode[] {
      return _nodes;
    },
    async refresh(): Promise<void> {
      const built = await opts.build();
      _nodes = built;
      _byId = new Map(built.map((n) => [n.id, n]));
      fire();
    },
    subscribe(cb: () => void): () => void {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    byId(id: string): TNode | undefined {
      return _byId.get(id);
    },
  };
}
