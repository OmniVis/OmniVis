<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<div class="flex h-full w-full flex-col border-r bg-background text-foreground">
  <div
    class="flex items-center border-b bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
    {title}
  </div>
  <div class="flex-1 overflow-y-auto">
    {@render children()}
  </div>
</div>
