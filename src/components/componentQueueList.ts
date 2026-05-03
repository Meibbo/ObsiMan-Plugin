import type { StagedOp, VirtualFileState } from "../types/typeOps";
import type { OpKind } from "../types/typeOps";
import type { OperationQueueService } from "../services/serviceQueue.svelte";
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

type QueueGroupKey =
  | "prop"
  | "content_replace"
  | "file_rename"
  | "file_move"
  | "template"
  | "tag";

interface QueueOpEntry {
  vfs: VirtualFileState;
  op: StagedOp;
}

interface QueueGroup {
  key: QueueGroupKey;
  label: string;
  entries: QueueOpEntry[];
  fileCount: number;
}

const GROUP_ORDER: QueueGroupKey[] = [
  "prop",
  "content_replace",
  "file_rename",
  "file_move",
  "template",
  "tag",
];

export class QueueListComponent {
  private containerEl: HTMLElement;
  private callbacks: QueueListCallbacks;
  private selectedPaths = new Set<string>();
  private collapsedGroups = new Set<QueueGroupKey>();

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
        cls: "vm-queue-empty",
        text: translate("ops.queue.empty"),
      });
      return;
    }

    if (this.callbacks.showHeader !== false) {
      const headerEl = this.containerEl.createDiv({
        cls: "vm-queue-header",
      });
      headerEl.createSpan({
        text: translate("queue.summary", {
          files: service.fileCount,
          ops: service.opCount,
        }),
        cls: "vm-queue-title",
      });
    }

    const listEl = this.containerEl.createDiv({ cls: "vm-queue-list" });
    const groups = this.buildGroups(entries);
    for (const group of groups) {
      this.renderGroup(listEl, group, groups);
    }
  }

  getSelectedPaths(): string[] {
    return [...this.selectedPaths];
  }

  private buildGroups(entries: VirtualFileState[]): QueueGroup[] {
    const groupedEntries = new Map<QueueGroupKey, QueueOpEntry[]>();

    for (const vfs of entries) {
      for (const op of vfs.ops) {
        const key = this.opKindToGroup(op.kind);
        const groupEntries = groupedEntries.get(key) ?? [];
        groupEntries.push({ vfs, op });
        groupedEntries.set(key, groupEntries);
      }
    }

    const groups: QueueGroup[] = [];
    for (const key of GROUP_ORDER) {
      const groupEntries = groupedEntries.get(key);
      if (!groupEntries || groupEntries.length === 0) {
        continue;
      }

      groups.push({
        key,
        label: translate(`queue.op_type.${key}`),
        entries: groupEntries,
        fileCount: new Set(groupEntries.map(({ vfs }) => vfs.originalPath)).size,
      });
    }

    return groups;
  }

  private renderGroup(parent: HTMLElement, group: QueueGroup, groups: QueueGroup[]): void {
    const sectionEl = parent.createDiv({ cls: "vm-queue-group" });
    const isCollapsed = this.collapsedGroups.has(group.key);

    const headerEl = sectionEl.createDiv({
      cls: "vm-queue-group-header",
    });
    headerEl.setAttribute("role", "button");
    headerEl.setAttribute("tabindex", "0");
    headerEl.setAttribute("aria-expanded", isCollapsed ? "false" : "true");

    headerEl.createSpan({
      cls: "vm-queue-group-label",
      text: group.label,
    });

    const metaEl = headerEl.createDiv({ cls: "vm-queue-group-meta" });
    metaEl.createSpan({
      cls: "vm-queue-group-files",
      text: `\u03a3 ${group.fileCount}`,
    });
    metaEl.createSpan({
      cls: "vm-queue-group-count",
      text: `${group.entries.length} ops`,
    });

    headerEl.createSpan({
      cls: "vm-queue-group-chevron",
      text: isCollapsed ? "\u25b6" : "\u25bc",
    });

    const toggleGroup = () => {
      if (this.collapsedGroups.has(group.key)) {
        this.collapsedGroups.delete(group.key);
      } else {
        this.collapsedGroups.add(group.key);
      }
      this.renderGroupList(parent, groups);
    };

    headerEl.addEventListener("click", toggleGroup);
    headerEl.addEventListener("keydown", (evt: KeyboardEvent) => {
      if (evt.key === "Enter" || evt.key === " ") {
        evt.preventDefault();
        toggleGroup();
      }
    });

    if (isCollapsed) {
      return;
    }

    const bodyEl = sectionEl.createDiv({ cls: "vm-queue-group-body" });
    for (const entry of group.entries) {
      this.renderOpRow(bodyEl, entry.vfs, entry.op, group.entries);
    }
  }

  private renderGroupList(parent: HTMLElement, groups: QueueGroup[]): void {
    parent.empty();
    for (const group of groups) {
      this.renderGroup(parent, group, groups);
    }
  }

  private opKindToGroup(kind: OpKind): QueueGroupKey {
    switch (kind) {
      case "set_prop":
      case "delete_prop":
      case "rename_prop":
      case "reorder_props":
        return "prop";
      case "find_replace_content":
        return "content_replace";
      case "rename_file":
        return "file_rename";
      case "move_file":
        return "file_move";
      case "apply_template":
        return "template";
      case "set_tag":
      case "delete_tag":
      case "add_tag":
        return "tag";
    }
  }

  private renderOpRow(
    parent: HTMLElement,
    vfs: VirtualFileState,
    op: StagedOp,
    entries: QueueOpEntry[]
  ): void {
    const itemEl = parent.createDiv({ cls: "vm-queue-item" });
    const isExpanded =
      this.callbacks.expandedPath === vfs.originalPath &&
      this.callbacks.expandedOpId === op.id;
    const touchedFileCount = this.countTouchedFiles(op, entries);

    itemEl.toggleClass("is-expanded", isExpanded);
    itemEl.setAttribute("role", "button");
    itemEl.setAttribute("tabindex", "0");
    itemEl.setAttribute("aria-expanded", isExpanded ? "true" : "false");

    if (this.callbacks.selectable) {
      const cb = itemEl.createEl("input", {
        cls: "vm-queue-checkbox",
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
      cls: "vm-queue-index",
      text: String(touchedFileCount),
    });

    itemEl.createSpan({
      cls: "vm-queue-path",
      text: op.details,
    });

    const expandIndicatorEl = itemEl.createSpan({
      cls: "vm-queue-file-count",
      text: isExpanded ? "\u25bc" : "\u25b6",
    });
    expandIndicatorEl.setAttribute("aria-hidden", "true");

    const removeBtn = itemEl.createEl("button", {
      cls: "vm-filter-remove-btn clickable-icon",
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

  private countTouchedFiles(op: StagedOp, entries: QueueOpEntry[]): number {
    return new Set(
      entries
        .filter((entry) => this.isSameLogicalOp(entry.op, op))
        .map((entry) => entry.vfs.originalPath)
    ).size;
  }

  private isSameLogicalOp(left: StagedOp, right: StagedOp): boolean {
    return (
      left.kind === right.kind &&
      left.action === right.action &&
      left.details === right.details
    );
  }
}
