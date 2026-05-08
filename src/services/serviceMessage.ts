import { Notice } from 'obsidian';

export type ServiceMessageKind = 'info' | 'success' | 'warning' | 'error';

export interface ServiceMessage {
	id: number;
	kind: ServiceMessageKind;
	text: string;
	createdAt: number;
	timeout: number;
	details?: unknown;
	error?: unknown;
}

export interface ServiceMessageOptions {
	timeout?: number;
	details?: unknown;
	error?: unknown;
}

export interface ServiceMessageInput extends ServiceMessageOptions {
	kind: ServiceMessageKind;
	text: string;
}

export interface ServiceMessageLogger {
	info(message: string, details?: unknown): void;
	log(message: string, details?: unknown): void;
	warn(message: string, details?: unknown): void;
	error(message: string, error?: unknown): void;
}

export interface ServiceMessageServiceOptions {
	presenter?: (message: ServiceMessage) => void;
	logger?: ServiceMessageLogger;
	now?: () => number;
	defaultTimeout?: number;
	maxHistory?: number;
}

type ServiceMessageListener = (message: ServiceMessage) => void;

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_MAX_HISTORY = 100;

function defaultPresenter(message: ServiceMessage): void {
	new Notice(message.text, message.timeout);
}

function defaultLogger(): ServiceMessageLogger {
	return console;
}

export class ServiceMessageService {
	private nextId = 1;
	private readonly presenter: (message: ServiceMessage) => void;
	private readonly logger: ServiceMessageLogger;
	private readonly now: () => number;
	private readonly defaultTimeout: number;
	private readonly maxHistory: number;
	private readonly messages: ServiceMessage[] = [];
	private readonly listeners = new Set<ServiceMessageListener>();

	constructor(options: ServiceMessageServiceOptions = {}) {
		this.presenter = options.presenter ?? defaultPresenter;
		this.logger = options.logger ?? defaultLogger();
		this.now = options.now ?? Date.now;
		this.defaultTimeout = options.defaultTimeout ?? DEFAULT_TIMEOUT;
		this.maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
	}

	emit(input: ServiceMessageInput): ServiceMessage {
		const message: ServiceMessage = {
			id: this.nextId++,
			kind: input.kind,
			text: input.text,
			createdAt: this.now(),
			timeout: input.timeout ?? this.defaultTimeout,
			details: input.details,
			error: input.error,
		};
		this.messages.push(message);
		while (this.messages.length > this.maxHistory) this.messages.shift();
		this.log(message);
		this.presenter(message);
		for (const listener of this.listeners) listener(message);
		return message;
	}

	info(text: string, options: ServiceMessageOptions = {}): ServiceMessage {
		return this.emit({ kind: 'info', text, ...options });
	}

	success(text: string, options: ServiceMessageOptions = {}): ServiceMessage {
		return this.emit({ kind: 'success', text, ...options });
	}

	warning(text: string, options: ServiceMessageOptions = {}): ServiceMessage {
		return this.emit({ kind: 'warning', text, ...options });
	}

	error(text: string, options: ServiceMessageOptions = {}): ServiceMessage {
		return this.emit({ kind: 'error', text, ...options });
	}

	subscribe(listener: ServiceMessageListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	list(): ServiceMessage[] {
		return [...this.messages];
	}

	clear(): void {
		this.messages.length = 0;
	}

	private log(message: ServiceMessage): void {
		if (message.kind === 'error') {
			this.logger.error(message.text, message.error ?? message.details);
			return;
		}
		if (message.kind === 'warning') {
			this.logger.warn(message.text, message.details);
		}
	}
}

export function createServiceMessageService(
	options: ServiceMessageServiceOptions = {},
): ServiceMessageService {
	return new ServiceMessageService(options);
}

export const serviceMessage = createServiceMessageService();
