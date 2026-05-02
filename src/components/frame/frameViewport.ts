export class FrameViewportController {
	private viewportEl: HTMLElement | null = null;
	private containerEl: HTMLElement | null = null;

	constructor(private readonly getPageIndex: () => number) {}

	applyPageTransform(animated: boolean): void {
		if (!this.containerEl || !this.viewportEl) return;
		const w = this.viewportEl.offsetWidth;
		if (w === 0) return;

		const pages = this.containerEl.querySelectorAll<HTMLElement>('.vm-page');
		pages.forEach((page) => {
			page.style.width = `${w}px`;
		});
		if (animated) this.containerEl.classList.add('is-animating');
		this.containerEl.style.transform = `translateX(${Math.round(-this.getPageIndex() * w)}px)`;
	}

	onContainerTransitionEnd = (e: TransitionEvent): void => {
		if (e.target === e.currentTarget && e.propertyName === 'transform') {
			this.containerEl?.classList.remove('is-animating');
		}
	};

	bindViewport = (el: HTMLElement): { destroy(): void } => {
		this.viewportEl = el;
		const ro = new ResizeObserver(() => {
			this.applyPageTransform(false);
		});
		ro.observe(el);
		this.applyPageTransform(false);
		return {
			destroy: () => {
				ro.disconnect();
				this.viewportEl = null;
			},
		};
	};

	bindContainer = (el: HTMLElement): { destroy(): void } => {
		this.containerEl = el;
		this.applyPageTransform(false);
		return {
			destroy: () => {
				this.containerEl = null;
			},
		};
	};
}
