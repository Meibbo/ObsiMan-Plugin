import { describe, expect, it } from 'vitest';
import { ViewService } from '../../../src/services/serviceViews.svelte';
import { EXPLORER_VIEW_MODES, isExplorerViewMode } from '../../../src/types/typeViews';
import type { ActiveFilterEntry, NodeBase, QueueChange } from '../../../src/types/typeContracts';
import type {
	ExplorerRenderModel,
	ExplorerViewInput,
	ExplorerViewMode,
	IViewService,
	ViewAction,
	ViewLayers,
	ViewRow,
} from '../../../src/types/typeViews';
import type { ExplorerViewMode as ProviderViewMode } from '../../../src/types/typeExplorer';

interface TestNode extends NodeBase {
	label: string;
	detail?: string;
}

describe('view service contracts', () => {
	it('supports the canonical explorer view modes', () => {
		const modes: ExplorerViewMode[] = [...EXPLORER_VIEW_MODES];
		const providerMode: ProviderViewMode = 'table';

		expect(modes).toContain(providerMode);
		expect(isExplorerViewMode('masonry')).toBe(false);
	});

	it('represents list rows with semantic layers and actions', () => {
		const node: TestNode = { id: 'queue:1', label: 'Rename property', detail: 'status -> state' };
		const action: ViewAction<TestNode> = {
			id: 'remove',
			label: 'Remove',
			icon: 'lucide-x',
			tone: 'danger',
			run: (row) => row.node.id,
		};
		const layers: ViewLayers = {
			icons: [{ id: 'op', icon: 'lucide-pencil', source: 'operation' }],
			badges: { ops: [{ id: 'queued', label: 'Queued', tone: 'accent' }] },
			highlights: { query: [{ start: 0, end: 6 }] },
			state: { pending: true },
		};
		const row: ViewRow<TestNode> = {
			id: node.id,
			node,
			label: node.label,
			detail: node.detail,
			cells: [],
			layers,
			actions: [action],
		};
		const model: ExplorerRenderModel<TestNode> = {
			explorerId: 'queue',
			mode: 'list',
			rows: [row],
			columns: [],
			groups: [],
			selection: { ids: new Set() },
			focus: { id: null },
			sort: { id: 'manual', direction: 'asc' },
			search: { query: 'rename' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: { canSelect: false },
		};

		expect(model.rows[0].layers.badges?.ops?.[0].label).toBe('Queued');
		expect(model.rows[0].actions[0].run?.(row)).toBe('queue:1');
	});

	it('defines a service contract that can build render models from input', () => {
		const input: ExplorerViewInput<TestNode> = {
			explorerId: 'filters',
			mode: 'list',
			nodes: [{ id: 'filter:1', label: 'has: status' }],
		};
		const service: Pick<IViewService, 'getModel'> = {
			getModel(received) {
				return {
					explorerId: received.explorerId,
					mode: received.mode,
					rows: [],
					columns: [],
					groups: [],
					selection: { ids: new Set() },
					focus: { id: null },
					sort: { id: 'manual', direction: 'asc' },
					search: { query: '' },
					virtualization: { rowHeight: 32, overscan: 5 },
					capabilities: {},
				};
			},
		};

		expect(service.getModel(input).mode).toBe('list');
	});
});

describe('ViewService', () => {
	it('stores view mode per explorer and notifies subscribers', () => {
		const service = new ViewService();
		let calls = 0;
		const unsubscribe = service.subscribe('queue', () => {
			calls += 1;
		});

		expect(service.getViewMode('queue')).toBe('tree');

		service.setViewMode('queue', 'list');

		expect(service.getViewMode('queue')).toBe('list');
		expect(calls).toBe(1);

		unsubscribe();
		service.setViewMode('queue', 'table');
		expect(calls).toBe(1);
	});

	it('tracks selection and marks selected rows in render models', () => {
		const service = new ViewService();
		const nodes: TestNode[] = [
			{ id: 'a', label: 'Alpha' },
			{ id: 'b', label: 'Beta' },
		];

		service.select('filters', 'b');
		const model = service.getModel({ explorerId: 'filters', mode: 'list', nodes });

		expect([...model.selection.ids]).toEqual(['b']);
		expect(model.rows.map((row) => row.layers.state?.selected ?? false)).toEqual([false, true]);

		service.select('filters', 'b', 'toggle');
		expect([...service.getModel({ explorerId: 'filters', mode: 'list', nodes }).selection.ids]).toEqual([]);
	});

	it('builds flat rows with mapper-provided labels, details, actions, and decoration layers', () => {
		const service = new ViewService({
			decorationManager: {
				decorate() {
					return {
						icons: ['lucide-pencil'],
						badges: [{ label: 'Queued', accent: 'accent' }],
						highlights: [{ start: 0, end: 6 }],
					};
				},
				subscribe() {
					return () => {};
				},
			},
		});
		const nodes: TestNode[] = [{ id: 'queue:1', label: 'Rename property', detail: 'status -> state' }];
		const model = service.getModel({
			explorerId: 'queue',
			mode: 'list',
			nodes,
			getLabel: (node) => node.label,
			getDetail: (node) => node.detail ?? '',
			getActions: () => [{ id: 'remove', label: 'Remove', tone: 'danger' }],
			getDecorationContext: () => ({ kind: 'operation' }),
		});

		expect(model.rows[0].label).toBe('Rename property');
		expect(model.rows[0].detail).toBe('status -> state');
		expect(model.rows[0].actions[0].id).toBe('remove');
		expect(model.rows[0].layers.icons?.[0]).toMatchObject({
			icon: 'lucide-pencil',
			source: 'operation',
		});
		expect(model.rows[0].layers.badges?.ops?.[0].label).toBe('Queued');
		expect(model.rows[0].layers.highlights?.query).toEqual([{ start: 0, end: 6 }]);
	});

	it('maps queue changes to operation badges and pending state without decoration badges', () => {
		const service = new ViewService();
		const nodes: QueueChange[] = [
			{
				id: 'op-delete-status',
				group: 'delete_prop',
				change: {
					id: 'op-delete-status',
					type: 'property',
					action: 'delete',
					details: 'Delete status',
					property: 'status',
				} as never,
			},
		];
		const model = service.getModel({
			explorerId: 'queue',
			mode: 'list',
			nodes,
			getLabel: (node) => node.change.action,
			getDetail: (node) => node.change.details,
			getDecorationContext: () => ({ kind: 'operation' }),
		});

		expect(model.rows[0].layers.state?.pending).toBe(true);
		expect(model.rows[0].layers.badges?.ops?.[0]).toMatchObject({
			id: 'op-delete-status:op',
			label: 'delete',
			tone: 'danger',
			sourceId: 'op-delete-status',
			actionId: 'remove',
		});
		expect(model.rows[0].layers.icons?.[0]).toMatchObject({
			icon: 'lucide-trash-2',
			source: 'operation',
		});
	});

	it('maps active filter entries to filter badges, active state, and filter highlights', () => {
		const service = new ViewService();
		const nodes: ActiveFilterEntry[] = [
			{
				id: 'filter-status',
				rule: {
					id: 'filter-status',
					type: 'rule',
					filterType: 'has_property',
					property: 'status',
					values: [],
				},
			},
		];
		const model = service.getModel({
			explorerId: 'active-filters',
			mode: 'list',
			nodes,
			getLabel: () => 'has: status',
			getDecorationContext: () => ({ kind: 'filter' }),
		});

		expect(model.rows[0].layers.state?.activeFilter).toBe(true);
		expect(model.rows[0].layers.badges?.filters?.[0]).toMatchObject({
			id: 'filter-status:filter',
			label: 'has property',
			tone: 'info',
			sourceId: 'filter-status',
			actionId: 'remove',
		});
		expect(model.rows[0].layers.highlights?.filter).toEqual([{ start: 5, end: 11 }]);
		expect(model.rows[0].layers.highlights?.query).toBeUndefined();
	});
});
