import { explorerProps } from '../../src/providers/explorerProps';
import { ViewService } from '../../src/services/serviceViews.svelte';
import { createPerfProbe, setActivePerfProbe } from '../../src/dev/perfProbe';

// Mock App
const mockApp = {
	vault: {
		getMarkdownFiles: () => Array(10000).fill({ path: 'test.md' }),
	},
	metadataCache: {
		getFileCache: () => ({ frontmatter: { test: 'value' } }),
		getAllPropertyInfos: () => ({})
	},
} as any;

const viewService = new ViewService();

// Mock Plugin
const mockPlugin = {
	app: mockApp,
	propsIndex: {
		subscribe: () => () => {},
		nodes: Array(1000).fill(0).map((_, i) => ({
			id: `prop-${i}`,
			property: `prop-${i}`,
			values: ['value1', 'value2'],
			valueFrequencies: { 'value1': 1, 'value2': 1 },
			fileCount: 1,
		})),
	},
	operationsIndex: {
		nodes: Array(100).fill(0).map((_, i) => ({
			id: `op-${i}`,
			change: { type: 'property', property: 'prop-0', action: 'set', value: 'value1' },
			group: 'test',
		})),
	},
	activeFiltersIndex: {
		nodes: [],
	},
	contextMenuService: {
		registerAction: () => {},
	},
	viewService: viewService,
	filterService: {
		filteredFiles: [],
		selectedFiles: [],
	},
	settings: {
		explorerOperationScope: 'filtered',
	},
} as any;

const probe = createPerfProbe({ now: () => Date.now() });
setActivePerfProbe(probe.api);

const explorer = new explorerProps(mockPlugin);

console.log('Starting optimized benchmark...');
const start = Date.now();
for (let i = 0; i < 10; i++) {
	explorer.getTree();
}
const end = Date.now();
console.log(`Average getTree time: ${(end - start) / 10}ms`);
const snapshot = probe.snapshot();
console.log('Timings:', JSON.stringify(snapshot.timings, null, 2));
