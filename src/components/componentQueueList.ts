import type { VirtualFileState } from "../types/typeOps";
import type { OperationQueueService } from "../services/serviceQueue";
import { translate } from "../i18n/index";

export interface QueueListCallbacks {
  onRemoveFile: (path: string) => void;
  onRemoveOp?: (path: string, opId: string) => void;
  selectable?: boolean;
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

    const listEl = this.containerEl.createDiv({ cls: "vaultman-queue-list" });
    for (const vfs of entries) {
      this.renderFileRow(listEl, vfs);
    }
  }

  getSelectedPaths(): string[] {
    return [...this.selectedPaths];
  }

  private renderFileRow(parent: HTMLElement, vfs: VirtualFileState): void {
    const itemEl = parent.createDiv({ cls: "vaultman-queue-item" });

    if (this.callbacks.selectable) {
      const cb = itemEl.createEl("input", {
        cls: "vaultman-queue-checkbox",
        attr: { type: "checkbox" },
      });
      cb.addEventListener("change", () => {
        if (cb.checked) this.selectedPaths.add(vfs.originalPath);
        else this.selectedPaths.delete(vfs.originalPath);
      });
    }

    itemEl.createSpan({
      cls: "vaultman-queue-path",
      text: vfs.originalPath,
    });

    itemEl.createSpan({
      cls: "vaultman-queue-file-count",
      text: translate("queue.file_row", { ops: vfs.ops.length }),
    });

    const removeBtn = itemEl.createEl("button", {
      cls: "vaultman-filter-remove-btn clickable-icon",
      attr: { "aria-label": "Remove all ops on this file" },
    });
    removeBtn.setText("\u00d7");
    removeBtn.addEventListener("click", () =>
      this.callbacks.onRemoveFile(vfs.originalPath),
    );
  }
}
