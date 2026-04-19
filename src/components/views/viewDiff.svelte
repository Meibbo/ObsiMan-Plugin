<script lang="ts">
  import { stringifyYaml } from "obsidian";
  import { translate } from "../../i18n/index";
  import type { OperationQueueService } from "../../services/serviceQueue";
  import {
    buildDiff,
    buildOperationDiff,
    computeBodyHunks,
    type FileDiff,
    type OperationDiffContext,
  } from "../../services/serviceDiff";

  type ViewDiffMode = "file-focused" | "operation-focused";

  interface Props {
    queueService: OperationQueueService;
    expandedOpContext?: OperationDiffContext | null;
    mode?: ViewDiffMode;
  }

  let {
    queueService,
    expandedOpContext = null,
    mode = "file-focused",
  }: Props = $props();

  let onlyChanges = $state(true);
  let fullDocument = $state(false);

  const allDiffs = $derived(buildDiff(queueService.transactions));

  const activeDiff = $derived.by<FileDiff | null>(() => {
    if (mode === "operation-focused" && expandedOpContext) {
      return buildOperationDiff(queueService.transactions, expandedOpContext);
    }
    return allDiffs[0] ?? null;
  });

  const bodyHunks = $derived.by(() =>
    activeDiff ? computeBodyHunks(activeDiff.bodyBefore, activeDiff.bodyAfter) : [],
  );

  const visibleFmDeltas = $derived.by(() =>
    activeDiff
      ? activeDiff.fmDeltas.filter((delta) => !onlyChanges || delta.kind !== "unchanged")
      : [],
  );

  const fullDocumentText = $derived.by(() => {
    if (!activeDiff) return "";
    const yaml = Object.keys(activeDiff.fmAfter).length > 0
      ? `---\n${stringifyYaml(activeDiff.fmAfter)}---\n`
      : "";
    return `${yaml}${activeDiff.bodyAfter}`;
  });

  const headerText = $derived.by(() => {
    if (!activeDiff) return translate("result.no_changes");
    if (mode === "operation-focused" && activeDiff.opSummaries[0]) {
      return activeDiff.opSummaries[0].details;
    }
    return activeDiff.newPath && activeDiff.newPath !== activeDiff.path
      ? `${activeDiff.path} → ${activeDiff.newPath}`
      : activeDiff.path;
  });

  function toggleOnlyChanges() {
    onlyChanges = !onlyChanges;
    if (!onlyChanges && !fullDocument) {
      fullDocument = true;
    }
  }

  function toggleFullDocument() {
    fullDocument = !fullDocument;
    if (!onlyChanges && !fullDocument) {
      onlyChanges = true;
    }
  }

  function formatValue(value: unknown): string {
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  }
</script>

<div class="vaultman-viewdiff">
  <div class="vaultman-viewdiff-toolbar">
    <div class="vaultman-viewdiff-title">{headerText}</div>
    <div class="vaultman-viewdiff-actions">
      <button
        class="vaultman-viewdiff-toggle"
        class:is-active={onlyChanges}
        type="button"
        onclick={toggleOnlyChanges}
      >
        {translate("queue.view_diff.only_changes")}
      </button>
      <button
        class="vaultman-viewdiff-toggle"
        class:is-active={fullDocument}
        type="button"
        onclick={toggleFullDocument}
      >
        {translate("queue.view_diff.full_document")}
      </button>
      <button class="vaultman-viewdiff-more" type="button" disabled>
        {translate("queue.view_diff.more_options")}
      </button>
    </div>
  </div>

  {#if !activeDiff}
    <div class="vaultman-viewdiff-empty">{translate("result.no_changes")}</div>
  {:else}
    <div class="vaultman-viewdiff-body">
      {#if onlyChanges}
        <div class="vaultman-viewdiff-section">
          <div class="vaultman-viewdiff-section-title">{translate("queue.view_diff.frontmatter")}</div>
          {#if visibleFmDeltas.length === 0}
            <div class="vaultman-viewdiff-empty-row">{translate("queue.view_diff.no_frontmatter_changes")}</div>
          {:else}
            {#each visibleFmDeltas as delta (delta.key)}
              <div class="vaultman-viewdiff-delta" class:is-unchanged={delta.kind === "unchanged"}>
                <div class="vaultman-viewdiff-delta-key">{delta.key}</div>
                <div class="vaultman-viewdiff-delta-values">
                  {#if delta.kind === "changed"}
                    <span class="vaultman-viewdiff-del">{formatValue(delta.before)}</span>
                    <span class="vaultman-viewdiff-arrow">→</span>
                    <span class="vaultman-viewdiff-add">{formatValue(delta.after)}</span>
                  {:else if delta.kind === "added"}
                    <span class="vaultman-viewdiff-add">{formatValue(delta.after)}</span>
                  {:else if delta.kind === "removed"}
                    <span class="vaultman-viewdiff-del">{formatValue(delta.before)}</span>
                  {:else}
                    <span>{formatValue(delta.after)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="vaultman-viewdiff-section">
          <div class="vaultman-viewdiff-section-title">{translate("queue.view_diff.body")}</div>
          {#if !activeDiff.bodyChanged}
            <div class="vaultman-viewdiff-empty-row">{translate("queue.view_diff.no_body_changes")}</div>
          {:else}
            {#each bodyHunks as hunk (hunk.header)}
              <div class="vaultman-viewdiff-hunk">
                <div class="vaultman-viewdiff-hunk-header">{hunk.header}</div>
                {#if hunk.lines.length === 0}
                  <div class="vaultman-viewdiff-empty-row">
                    {translate("queue.view_diff.body_omitted", {
                      bytes: Math.max(activeDiff.bodyBefore.length, activeDiff.bodyAfter.length),
                    })}
                  </div>
                {:else}
                  {#each hunk.lines as line, index (`${hunk.header}-${index}`)}
                    <div
                      class="vaultman-viewdiff-line"
                      class:is-add={line.kind === "add"}
                      class:is-del={line.kind === "del"}
                    >
                      <span class="vaultman-viewdiff-line-prefix">
                        {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                      </span>
                      <span class="vaultman-viewdiff-line-text">{line.text}</span>
                    </div>
                  {/each}
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      {/if}

      {#if fullDocument}
        <div class="vaultman-viewdiff-section">
          <div class="vaultman-viewdiff-section-title">{translate("queue.view_diff.document")}</div>
          <pre class="vaultman-viewdiff-document">{fullDocumentText}</pre>
        </div>
      {/if}
    </div>
  {/if}
</div>
