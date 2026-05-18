<script lang="ts">
  import { onMount } from 'svelte';
  import { render } from '$/util/mermaid';
  import type { MermaidConfig } from 'mermaid';

  // Props using Svelte 5 runes
  interface Props {
    code: string;
    config?: MermaidConfig;
  }
  let { code, config = {} }: Props = $props();

  let svg = $state('');
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const id = `preview-${Math.random().toString(36).slice(2, 11)}`;
      const result = await render(config, code, id);
      svg = result.svg;
    } catch (err) {
      console.error('Failed to render preview:', err);
      error = 'Failed to render preview';
    } finally {
      loading = false;
    }
  });
</script>

<div
  class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-t-xl bg-slate-100">
  {#if loading}
    <div class="text-xs text-slate-400">Rendering preview...</div>
  {:else if error}
    <div class="text-xs text-red-400">{error}</div>
  {:else}
    <div class="flex h-full w-full items-center justify-center p-2">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html svg}
    </div>
  {/if}
</div>

<style>
  :global(.w-full.h-full.p-2 svg) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
