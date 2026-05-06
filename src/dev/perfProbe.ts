export interface PerfProbeMetricInput {
	nodes?: number;
	rows?: number;
	visibleRows?: number;
}

export interface PerfProbeCounter {
	count: number;
	totalNodes: number;
	totalRows: number;
	totalVisibleRows: number;
}

export interface PerfProbeTiming extends PerfProbeCounter {
	totalMs: number;
	maxMs: number;
}

export type PerfScenarioName =
	| 'filters-search'
	| 'tree-scroll'
	| 'filter-select'
	| 'operation-badges';

export interface PerfScenarioOptions {
	query?: string;
	steps?: number;
}

export interface PerfProbeSnapshot {
	scenario?: string;
	startedAt: number;
	endedAt: number;
	counters: Record<string, PerfProbeCounter>;
	timings: Record<string, PerfProbeTiming>;
}

export interface PerfProbeApi {
	count(name: string, input?: PerfProbeMetricInput): void;
	measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T;
	reset(): void;
	snapshot(): PerfProbeSnapshot;
	run(name: PerfScenarioName, options?: PerfScenarioOptions): Promise<PerfProbeSnapshot>;
}

export interface PerfProbeOptions {
	now: () => number;
	doc?: Document;
}

export interface PerfProbe {
	api: PerfProbeApi;
	count(name: string, input?: PerfProbeMetricInput): void;
	measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T;
	reset(): void;
	snapshot(): PerfProbeSnapshot;
	installGlobal(target: { __vaultmanPerfProbe?: unknown }): () => void;
}

let activePerfProbe: PerfProbeApi | undefined;

export function setActivePerfProbe(probe: PerfProbeApi): void {
	activePerfProbe = probe;
}

export function clearActivePerfProbe(): void {
	activePerfProbe = undefined;
}

export function getActivePerfProbe(): PerfProbeApi | undefined {
	return activePerfProbe;
}

function createCounter(): PerfProbeCounter {
	return {
		count: 0,
		totalNodes: 0,
		totalRows: 0,
		totalVisibleRows: 0,
	};
}

function addMetricInput(target: PerfProbeCounter, input?: PerfProbeMetricInput): void {
	target.count += 1;
	target.totalNodes += input?.nodes ?? 0;
	target.totalRows += input?.rows ?? 0;
	target.totalVisibleRows += input?.visibleRows ?? 0;
}

async function waitFrames(doc: Document | undefined, count = 2): Promise<void> {
	const win = doc?.defaultView;
	for (let i = 0; i < count; i += 1) {
		if (!win) {
			await Promise.resolve();
			continue;
		}
		await new Promise<void>((resolve) => {
			if (win.requestAnimationFrame) {
				win.requestAnimationFrame(() => resolve());
				return;
			}
			win.setTimeout(resolve, 0);
		});
	}
}

function inputText(input: HTMLInputElement, value: string): void {
	const win = input.ownerDocument.defaultView;
	input.value = value;
	const EventConstructor = win?.InputEvent ?? InputEvent;
	input.dispatchEvent(
		new EventConstructor('input', { bubbles: true, inputType: 'insertText', data: value }),
	);
}

function clickElement(element: HTMLElement): void {
	const win = element.ownerDocument.defaultView;
	const EventConstructor = win?.MouseEvent ?? MouseEvent;
	element.dispatchEvent(new EventConstructor('click', { bubbles: true, cancelable: true }));
}

function scrollElement(element: HTMLElement, steps: number): void {
	const boundedSteps = Math.max(1, steps);
	const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
	const increment = maxScroll > 0 ? maxScroll / boundedSteps : element.clientHeight || 32;
	for (let i = 1; i <= boundedSteps; i += 1) {
		element.scrollTop = Math.round(increment * i);
		element.dispatchEvent(new Event('scroll', { bubbles: true }));
	}
}

export function createPerfProbe({ now, doc }: PerfProbeOptions): PerfProbe {
	let startedAt = now();
	let counters: Record<string, PerfProbeCounter> = {};
	let timings: Record<string, PerfProbeTiming> = {};

	function count(name: string, input?: PerfProbeMetricInput): void {
		counters[name] ??= createCounter();
		addMetricInput(counters[name], input);
	}

	function measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T {
		const start = now();
		const result = fn();
		const duration = now() - start;
		timings[name] ??= {
			...createCounter(),
			totalMs: 0,
			maxMs: 0,
		};
		addMetricInput(timings[name], input);
		timings[name].totalMs += duration;
		timings[name].maxMs = Math.max(timings[name].maxMs, duration);
		return result;
	}

	function reset(): void {
		startedAt = now();
		counters = {};
		timings = {};
	}

	function snapshot(): PerfProbeSnapshot {
		return {
			startedAt,
			endedAt: now(),
			counters,
			timings,
		};
	}

	async function run(name: PerfScenarioName, options: PerfScenarioOptions = {}): Promise<PerfProbeSnapshot> {
		reset();
		count(`scenario.${name}`);

		if (name === 'filters-search') {
			const input = doc?.querySelector<HTMLInputElement>('.vm-filters-search-input');
			if (input) inputText(input, options.query ?? 'status');
		} else if (name === 'tree-scroll') {
			const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
			if (outer) scrollElement(outer, options.steps ?? 8);
		} else if (name === 'filter-select') {
			const row = doc?.querySelector<HTMLElement>('.vm-tree-virtual-row');
			if (row) clickElement(row);
		} else if (name === 'operation-badges') {
			const badge = doc?.querySelector<HTMLElement>('.vm-badge.is-undoable, .vm-badge');
			if (badge) clickElement(badge);
		}

		await waitFrames(doc, 2);
		return { ...snapshot(), scenario: name };
	}

	const api: PerfProbeApi = {
		count,
		measure,
		reset,
		snapshot,
		run,
	};

	function installGlobal(target: { __vaultmanPerfProbe?: unknown }): () => void {
		const hadPrevious = Object.prototype.hasOwnProperty.call(target, '__vaultmanPerfProbe');
		const previous = target.__vaultmanPerfProbe;
		target.__vaultmanPerfProbe = api;
		setActivePerfProbe(api);

		return () => {
			if (activePerfProbe === api) {
				clearActivePerfProbe();
			}
			if (hadPrevious) {
				target.__vaultmanPerfProbe = previous;
				return;
			}
			delete target.__vaultmanPerfProbe;
		};
	}

	return {
		api,
		count,
		measure,
		reset,
		snapshot,
		installGlobal,
	};
}
