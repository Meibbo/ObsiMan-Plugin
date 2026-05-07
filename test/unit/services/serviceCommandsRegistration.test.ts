import { describe, expect, it, vi } from 'vitest';
import type { Command } from 'obsidian';
import {
	registerVaultmanCommands,
	VAULTMAN_COMMAND_IDS,
	type VaultmanCommandHost,
} from '../../../src/services/serviceCommands';

interface FakeHostState {
	hasLeaf: boolean;
	queueEmpty: boolean;
	hasFnRService: boolean;
	hasPanelApi: boolean;
}

function createFakePlugin() {
	const registered: Command[] = [];
	const plugin = {
		addCommand: vi.fn((command: Command) => {
			registered.push(command);
			return command;
		}),
	};
	return { plugin, registered };
}

function createFakeHost(state: FakeHostState): {
	host: VaultmanCommandHost;
	calls: {
		processAll: ReturnType<typeof vi.fn>;
		clearAll: ReturnType<typeof vi.fn>;
		activateView: ReturnType<typeof vi.fn>;
		openFiltersPopup: ReturnType<typeof vi.fn>;
		openQueuePopup: ReturnType<typeof vi.fn>;
		openViewMenu: ReturnType<typeof vi.fn>;
		openSortMenu: ReturnType<typeof vi.fn>;
		setMode: ReturnType<typeof vi.fn>;
		expand: ReturnType<typeof vi.fn>;
		focusFirstNode: ReturnType<typeof vi.fn>;
	};
} {
	const calls = {
		processAll: vi.fn(async () => ({ success: 0, errors: 0, messages: [] })),
		clearAll: vi.fn(),
		activateView: vi.fn(async () => {}),
		openFiltersPopup: vi.fn(),
		openQueuePopup: vi.fn(),
		openViewMenu: vi.fn(),
		openSortMenu: vi.fn(),
		setMode: vi.fn(),
		expand: vi.fn(),
		focusFirstNode: vi.fn(() => true),
	};

	const host: VaultmanCommandHost = {
		app: {
			workspace: {
				revealLeaf: vi.fn(),
			},
		} as unknown as VaultmanCommandHost['app'],
		queueService: {
			get isEmpty() {
				return state.queueEmpty;
			},
			processAll: calls.processAll,
			clearAll: calls.clearAll,
		} as unknown as VaultmanCommandHost['queueService'],
		activateView: calls.activateView,
		getVaultmanLeaf: () => (state.hasLeaf ? ({} as never) : null),
		getActiveFnRIslandService: () =>
			state.hasFnRService
				? ({
						setMode: calls.setMode,
						expand: calls.expand,
					} as never)
				: null,
		getActivePanelExplorerApi: () =>
			state.hasPanelApi ? { focusFirstNode: calls.focusFirstNode } : null,
		openFiltersPopup: calls.openFiltersPopup,
		openQueuePopup: calls.openQueuePopup,
		openViewMenu: calls.openViewMenu,
		openSortMenu: calls.openSortMenu,
	};
	return { host, calls };
}

function findCommand(commands: Command[], id: string): Command {
	const cmd = commands.find((c) => c.id === id);
	if (!cmd) throw new Error(`Command not registered: ${id}`);
	return cmd;
}

describe('registerVaultmanCommands', () => {
	it('registers every documented command id', () => {
		const { plugin, registered } = createFakePlugin();
		const { host } = createFakeHost({
			hasLeaf: true,
			queueEmpty: false,
			hasFnRService: true,
			hasPanelApi: true,
		});

		const commands = registerVaultmanCommands(plugin as never, host);

		expect(commands).toHaveLength(VAULTMAN_COMMAND_IDS.length);
		const registeredIds = registered.map((c) => c.id).sort();
		expect(registeredIds).toEqual([...VAULTMAN_COMMAND_IDS].sort());
		expect(plugin.addCommand).toHaveBeenCalledTimes(VAULTMAN_COMMAND_IDS.length);
	});

	it('greys out open-* commands when no panel leaf exists', () => {
		const { plugin } = createFakePlugin();
		const { host } = createFakeHost({
			hasLeaf: false,
			queueEmpty: false,
			hasFnRService: true,
			hasPanelApi: true,
		});
		const commands = registerVaultmanCommands(plugin as never, host);

		for (const id of [
			'open-filters',
			'open-queue',
			'open-view-menu',
			'open-sort-menu',
			'open-find-replace-active-explorer',
		]) {
			const cmd = findCommand(commands, id);
			expect(cmd.checkCallback).toBeDefined();
			expect(cmd.checkCallback!(true)).toBe(false);
		}
	});

	it('greys out process-queue when the queue is empty', () => {
		const { plugin } = createFakePlugin();
		const { host } = createFakeHost({
			hasLeaf: true,
			queueEmpty: true,
			hasFnRService: true,
			hasPanelApi: true,
		});
		const commands = registerVaultmanCommands(plugin as never, host);
		const cmd = findCommand(commands, 'process-queue');
		expect(cmd.checkCallback!(true)).toBe(false);
	});

	it('process-queue calls processAll when not empty', () => {
		const { plugin } = createFakePlugin();
		const { host, calls } = createFakeHost({
			hasLeaf: true,
			queueEmpty: false,
			hasFnRService: true,
			hasPanelApi: true,
		});
		const commands = registerVaultmanCommands(plugin as never, host);
		const cmd = findCommand(commands, 'process-queue');
		expect(cmd.checkCallback!(true)).toBe(true);
		cmd.checkCallback!(false);
		expect(calls.processAll).toHaveBeenCalledTimes(1);
	});

	it('open-find-replace-active-explorer requires an active FnR service', () => {
		const { plugin } = createFakePlugin();
		const { host } = createFakeHost({
			hasLeaf: true,
			queueEmpty: false,
			hasFnRService: false,
			hasPanelApi: true,
		});
		const commands = registerVaultmanCommands(plugin as never, host);
		const cmd = findCommand(commands, 'open-find-replace-active-explorer');
		expect(cmd.checkCallback!(true)).toBe(false);
	});

	it('open-filters invokes the filters popup hook when allowed', () => {
		const { plugin } = createFakePlugin();
		const { host, calls } = createFakeHost({
			hasLeaf: true,
			queueEmpty: false,
			hasFnRService: true,
			hasPanelApi: true,
		});
		const commands = registerVaultmanCommands(plugin as never, host);
		const cmd = findCommand(commands, 'open-filters');
		expect(cmd.checkCallback!(false)).toBe(true);
		expect(calls.openFiltersPopup).toHaveBeenCalledTimes(1);
	});
});
