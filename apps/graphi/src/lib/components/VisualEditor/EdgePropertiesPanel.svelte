<script lang="ts">
  import { stateStore, updateCode } from '$/util/state';
  import { clearSelection } from '$/util/visualEditStore';
  import { renderedNodesStore } from '$/util/renderedNodesStore';
  import {
    updateEdgeLabel,
    deleteFlowchartEdge,
    reconnectEdge,
    changeEdgeStyle,
    parseSvgEdgeId,
    type EdgeStyle
  } from '$/util/diagramManipulation';
  import TrashIcon from '~icons/material-symbols/delete-outline-rounded';

  let { edgeId }: { edgeId: string } = $props();

  let nodeIds = $derived($renderedNodesStore.map((n) => n.id));
  let parsed = $derived(parseSvgEdgeId(edgeId, nodeIds));
  let fromId = $derived(parsed?.from ?? '');
  let toId = $derived(parsed?.to ?? '');

  // ── read current edge label from source ──────────────────────────────────────
  function getEdgeLabel(code: string, from: string, to: string): string {
    if (!from || !to) return '';
    const ef = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const et = to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = code.match(new RegExp(`\\b${ef}\\b[^|\\n]*\\|([^|]+)\\|[^|\\n]*\\b${et}\\b`));
    return m ? m[1].trim() : '';
  }

  let currentEdgeLabel = $derived(getEdgeLabel($stateStore.code ?? '', fromId, toId));
  // eslint-disable-next-line svelte/prefer-writable-derived
  let labelInput = $state('');
  $effect(() => {
    labelInput = currentEdgeLabel;
  });

  function commitLabel() {
    if (fromId && toId) {
      updateCode(updateEdgeLabel($stateStore.code ?? '', fromId, toId, labelInput));
    }
  }

  function handleDelete() {
    if (fromId && toId) {
      updateCode(deleteFlowchartEdge($stateStore.code ?? '', fromId, toId));
      clearSelection();
    }
  }

  function handleReconnect(e: Event) {
    const newTo = (e.target as HTMLSelectElement).value;
    if (fromId && toId && newTo && newTo !== toId) {
      updateCode(reconnectEdge($stateStore.code ?? '', fromId, toId, newTo));
      clearSelection();
    }
  }

  const STYLES: { value: EdgeStyle; label: string; preview: string }[] = [
    { value: 'solid', label: 'Solid', preview: '→' },
    { value: 'dashed', label: 'Dashed', preview: '⤳' },
    { value: 'thick', label: 'Thick', preview: '⇒' }
  ];
</script>

<div class="flex flex-col gap-5 overflow-y-auto p-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">Edge</p>
    <button
      class="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      onclick={handleDelete}
      title="Delete this edge">
      <TrashIcon class="size-4" />
    </button>
  </div>

  {#if parsed}
    <!-- From / To -->
    <div
      class="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <code class="font-mono font-medium">{fromId}</code>
      <span class="text-muted-foreground">→</span>
      <code class="font-mono font-medium">{toId}</code>
    </div>

    <!-- Label -->
    <div class="space-y-1.5">
      <label for="edge-label-input" class="text-sm font-medium">Label</label>
      <input
        id="edge-label-input"
        class="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
        placeholder="Edge label…"
        bind:value={labelInput}
        onblur={commitLabel}
        onkeydown={(e) => e.key === 'Enter' && commitLabel()} />
    </div>

    <!-- Arrow style -->
    <div class="space-y-1.5">
      <p class="text-sm font-medium">Arrow Style</p>
      <div class="grid grid-cols-3 gap-1">
        {#each STYLES as s (s.value)}
          <button
            class="flex flex-col items-center gap-0.5 rounded border border-border px-2 py-2 text-xs transition-colors hover:border-primary hover:bg-accent"
            onclick={() =>
              updateCode(changeEdgeStyle($stateStore.code ?? '', fromId, toId, s.value))}>
            <span class="text-base">{s.preview}</span>
            <span class="text-muted-foreground">{s.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Change target (reconnect) -->
    <div class="space-y-1.5">
      <label for="edge-target-select" class="text-sm font-medium">Change Target</label>
      <select
        id="edge-target-select"
        class="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        onchange={handleReconnect}>
        <option value={toId}>{toId} (current)</option>
        {#each nodeIds.filter((id) => id !== toId) as id (id)}
          <option value={id}>{id}</option>
        {/each}
      </select>
    </div>
  {:else}
    <p class="text-xs text-muted-foreground italic">
      Could not parse edge endpoints from ID: <code class="font-mono">{edgeId}</code>
    </p>
  {/if}
</div>
