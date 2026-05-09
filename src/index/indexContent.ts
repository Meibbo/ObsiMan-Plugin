import type { App } from 'obsidian';
import type { ContentMatch, ContentSearchStatus, IContentIndex } from '../types/typeContracts';
import { getActivePerfProbe } from '../dev/perfProbe';

const IDLE_STATUS: ContentSearchStatus = {
	query: '',
	phase: 'idle',
	scanned: 0,
	total: 0,
	resultCount: 0,
};

export function createContentIndex(app: App): IContentIndex {
	let query = '';
	let nodes: ContentMatch[] = [];
	let byId = new Map<string, ContentMatch>();
	let status: ContentSearchStatus = { ...IDLE_STATUS };
	let refreshVersion = 0;
	const subs = new Set<() => void>();

	const fire = (): void => {
		for (const cb of subs) cb();
	};

	const publish = (nextNodes: ContentMatch[], nextStatus: ContentSearchStatus): void => {
		nodes = nextNodes;
		byId = new Map(nextNodes.map((node) => [node.id, node]));
		status = nextStatus;
		const probe = getActivePerfProbe();
		if (probe) {
			probe.measure('index.content.fire', { nodes: nextNodes.length }, fire);
		} else {
			fire();
		}
	};

	const index: IContentIndex = {
		get nodes(): readonly ContentMatch[] {
			return nodes;
		},
		get status(): ContentSearchStatus {
			return status;
		},
		async refresh(): Promise<void> {
			const currentVersion = ++refreshVersion;
			const currentQuery = query;
			const trimmed = currentQuery.trim();
			if (!trimmed) {
				publish([], { ...IDLE_STATUS });
				return;
			}

			const files = app.vault.getMarkdownFiles();
			const out: ContentMatch[] = [];
			publish([], {
				query: currentQuery,
				phase: 'scanning',
				scanned: 0,
				total: files.length,
				resultCount: 0,
			});

			const build = async (): Promise<void> => {
				const searchQuery = currentQuery.toLowerCase();
				for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
					if (refreshVersion !== currentVersion) return;
					const file = files[fileIndex];
					const content = await app.vault.read(file);
					if (refreshVersion !== currentVersion) return;
					const lines = content.split('\n');
					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						const searchLine = line.toLowerCase();
						let start = 0;
						while (true) {
							const idx = searchLine.indexOf(searchQuery, start);
							if (idx === -1) break;
							const match = line.slice(idx, idx + currentQuery.length);
							out.push({
								id: `${file.path}:${i}:${idx}`,
								filePath: file.path,
								line: i,
								before: line.slice(Math.max(0, idx - 30), idx),
								match,
								after: line.slice(idx + currentQuery.length, idx + currentQuery.length + 30),
							});
							start = idx + currentQuery.length;
							if (start >= line.length) break;
						}
					}
					publish([...out], {
						query: currentQuery,
						phase: 'scanning',
						scanned: fileIndex + 1,
						total: files.length,
						resultCount: out.length,
					});
				}
			};

			const probe = getActivePerfProbe();
			if (probe) {
				await probe.measureAsync('index.content.build', { files: files.length }, build);
			} else {
				await build();
			}

			if (refreshVersion !== currentVersion) return;
			publish([...out], {
				query: currentQuery,
				phase: 'done',
				scanned: files.length,
				total: files.length,
				resultCount: out.length,
			});
		},
		subscribe(cb: () => void): () => void {
			subs.add(cb);
			return () => subs.delete(cb);
		},
		byId(id: string): ContentMatch | undefined {
			return byId.get(id);
		},
		setQuery(q: string): void {
			if (query === q) return;
			query = q;
			void index.refresh();
		},
	};

	return index;
}
