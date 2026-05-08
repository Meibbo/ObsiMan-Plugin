import { describe, expect, it, vi } from 'vitest';
import { createServiceMessageService } from '../../../src/services/serviceMessage';

describe('serviceMessage', () => {
	it('emits info, success, warning, and error messages through one presenter', () => {
		const presented: unknown[] = [];
		const service = createServiceMessageService({
			presenter: (message) => presented.push(message),
			now: () => 42,
			logger: {
				info: vi.fn(),
				log: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
			},
		});

		service.info('Indexed vault');
		service.success('Queue applied');
		service.warning('Folder does not exist');
		service.error('Action failed', { error: new Error('boom') });

		expect(presented).toMatchObject([
			{ id: 1, kind: 'info', text: 'Indexed vault', createdAt: 42 },
			{ id: 2, kind: 'success', text: 'Queue applied', createdAt: 42 },
			{ id: 3, kind: 'warning', text: 'Folder does not exist', createdAt: 42 },
			{ id: 4, kind: 'error', text: 'Action failed', createdAt: 42 },
		]);
		expect(service.list().map((message) => message.kind)).toEqual([
			'info',
			'success',
			'warning',
			'error',
		]);
	});

	it('notifies subscribers and logs warning/error details', () => {
		const logger = {
			info: vi.fn(),
			log: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
		const seen: unknown[] = [];
		const service = createServiceMessageService({
			presenter: vi.fn(),
			logger,
			now: () => 10,
		});

		const unsubscribe = service.subscribe((message) => seen.push(message));
		const error = new Error('cannot apply');
		service.warning('Check this', { details: { path: 'A.md' } });
		service.error('Apply failed', { error });
		unsubscribe();
		service.info('After unsubscribe');

		expect(seen).toMatchObject([
			{ kind: 'warning', text: 'Check this', details: { path: 'A.md' } },
			{ kind: 'error', text: 'Apply failed', error },
		]);
		expect(logger.warn).toHaveBeenCalledWith('Check this', { path: 'A.md' });
		expect(logger.error).toHaveBeenCalledWith('Apply failed', error);
	});
});
