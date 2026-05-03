<script lang="ts">
  import type { IOverlayState } from "../../../types/typeContracts";
  import type { Component } from "svelte";

  let { overlayState }: { overlayState: IOverlayState } = $props();

  function dismissTop(): void {
    overlayState.pop();
  }

  function onOverlayKey(e: KeyboardEvent): void {
    if (e.key === "Escape") dismissTop();
  }
</script>

{#if overlayState.stack.length > 0}
  <div
    class="vm-popup-island"
    onkeydown={onOverlayKey}
    tabindex="-1"
    role="presentation"
  >
    {#each overlayState.stack as entry (entry.id)}
      {@const Comp = entry.component as Component<Record<string, unknown>>}
      <div
        class="vm-popup-island-entry"
        onclick={(e) => {
          if (
            e.target === e.currentTarget &&
            entry.dismissOnOutsideClick !== false
          ) {
            overlayState.popById(entry.id);
          }
        }}
        onkeydown={() => {}}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <Comp {...(entry.props ?? {})} />
      </div>
    {/each}
  </div>
{/if}
