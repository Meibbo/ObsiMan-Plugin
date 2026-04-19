import type { StagedOp, VirtualFileState } from "../types/typeOps";
import type { OperationQueueService } from "../services/serviceQueue";
import { translate } from "../i18n/index";

export interface QueueListCallbacks {
  onRemoveFile: (path: string) => void;
  onRemoveOp?: (path: string, opId: string) => void;
  onExpandOp?: (path: string, opId: string) => void;
  onCollapseOp?: () => void;
  selectable?: boolean;
  showHeader?: boolean;
  expandedPath?: string | null;
  expandedOpId?: string | null;
}

export class QueueListComponent {
  private containerEl: HTMLElement;
  private callbacks: QueueListCallbacks;
  private selectedPaths = new Set<string>();

  constructor(containerEl: HTMLElement, callbacks: QueueListCallbacks) {
    this.containerEl = containerEl;
    this.callbacks = callbacks;
  }

  render(service: OperationQueueService): void {
    this.containerEl.empty();
    this.selectedPaths.clear();

    const entries = service.listTransactions();
    if (entries.length === 0) {
      this.containerEl.createDiv({
        cls: "vaultman-queue-empty",
        text: translate("ops.queue.empty"),
      });
      return;
    }

    if (this.callbacks.showHeader !== false) {
      const headerEl = this.containerEl.createDiv({
        cls: "vaultman-queue-header",
      });
      headerEl.createSpan({
        text: translate("queue.summary", {
          files: service.fileCount,
          ops: service.opCount,
        }),
        cls: "vaultman-queue-title",
      });
    }

    const listEl = this.containerEl.createDiv({ cls: "vaultman-queue-list" });
    for (const vfs of entries) {
      for (const op of vfs.ops) {
        this.renderOpRow(listEl, vfs, op);
      }
    }
  }

  getSelectedPaths(): string[] {
    return [...this.selectedPaths];
  }

  private renderOpRow(parent: HTMLElement, vfs: VirtualFileState, op: StagedOp): void {
    const itemEl = parent.createDiv({ cls: "vaultman-queue-item" });
    const isExpanded =
      this.callbacks.expandedPath === vfs.originalPath &&
      this.callbacks.expandedOpId === op.id;

    itemEl.toggleClass("is-expanded", isExpanded);
    itemEl.setAttribute("role", "button");
    itemEl.setAttribute("tabindex", "0");
    itemEl.setAttribute("aria-expanded", isExpanded ? "true" : "false");

    if (this.callbacks.selectable) {
      const cb = itemEl.createEl("input", {
        cls: "vaultman-queue-checkbox",
        attr: { type: "checkbox" },
      });
      cb.addEventListener("change", () => {
        if (cb.checked) this.selectedPaths.add(vfs.originalPath);
        else this.selectedPaths.delete(vfs.originalPath);
      });
      cb.addEventListener("click", (evt) => {
        evt.stopPropagation();
      });
    }

    itemEl.createSpan({
      cls: "vaultman-queue-index",
      text: isExpanded ? "▼" : "▶",
    });

    itemEl.createSpan({
      cls: "vaultman-queue-path",
      text: op.details,
    });

    itemEl.createSpan({
      cls: "vaultman-queue-file-count",
      text: vfs.originalPath.split("/").pop() ?? vfs.originalPath,
    });

    const removeBtn = itemEl.createEl("button", {
      cls: "vaultman-filter-remove-btn clickable-icon",
      attr: { "aria-label": "Remove op" },
    });
    removeBtn.setText("\u00d7");
    removeBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (this.callbacks.onRemoveOp) {
        this.callbacks.onRemoveOp(vfs.originalPath, op.id);
        return;
      }
      this.callbacks.onRemoveFile(vfs.originalPath);
    });

    const toggleExpanded = () => {
      if (isExpanded) {
        this.callbacks.onCollapseOp?.();
      } else {
        this.callbacks.onExpandOp?.(vfs.originalPath, op.id);
      }
    };

    itemEl.addEventListener("click", toggleExpanded);
    itemEl.addEventListener("keydown", (evt: KeyboardEvent) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        toggleExpanded();
      }
    });
  }
}
