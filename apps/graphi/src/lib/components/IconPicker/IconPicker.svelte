<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import Icon from '~icons/material-symbols/add-reaction';
  import SearchIcon from '~icons/material-symbols/search';
  import BackIcon from '~icons/material-symbols/arrow-back';
  import { azureIconsMap } from '$/util/mermaid';
  import { stateStore, updateCode } from '$/util/state';
  import {
    diagramSupportsIcons,
    insertOrUpdateArchitectureIcon,
    insertOrUpdateFlowchartIcon
  } from '$/util/mermaidIconSyntax';
  import type { NodeInfo } from '$/util/mermaidIconSyntax';
  import { enterDragMode } from '$/util/iconDragStore';
  import { renderedNodesStore } from '$/util/renderedNodesStore';
  import type { RenderedNode } from '$/util/renderedNodesStore';

  // ── internal state ──────────────────────────────────────────────────────────
  let isOpen = $state(false);
  let step: 'nodes' | 'icons' = $state('nodes');
  let selectedNode: RenderedNode | null = $state(null);
  let searchQuery = $state('');
  let activeTab: 'iconify' | 'azure' = $state('iconify');
  let iconifyResults: { prefix: string; name: string }[] = $state([]);
  let isSearchingIconify = $state(false);

  let searchTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  // ── derived from global store ────────────────────────────────────────────────
  let supportsIcons = $derived(diagramSupportsIcons($stateStore.diagramType));

  // Node list comes from the rendered SVG (populated by View.svelte after each render),
  // so it reflects exactly what is drawn on the canvas — no text-parsing needed here.
  let nodeList = $derived($renderedNodesStore);

  let azureIcons = $derived(Array.from(azureIconsMap.keys()));
  let filteredAzureIcons = $derived(
    azureIcons.filter((icon) => icon.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── reset on close ───────────────────────────────────────────────────────────
  $effect(() => {
    if (!isOpen) {
      step = 'nodes';
      selectedNode = null;
      searchQuery = '';
      iconifyResults = [];
      clearTimeout(searchTimeout);
    }
  });

  // ── iconify search ────────────────────────────────────────────────────────────
  $effect(() => {
    if (step === 'icons' && activeTab === 'iconify' && searchQuery.length >= 2) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        isSearchingIconify = true;
        try {
          const res = await fetch(
            `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=60`
          );
          const data = await res.json();
          iconifyResults = (data.icons as string[]).map((id) => {
            const [prefix, name] = id.split(':');
            return { prefix, name };
          });
        } catch {
          iconifyResults = [];
        } finally {
          isSearchingIconify = false;
        }
      }, 300);
    } else if (step === 'icons' && activeTab === 'iconify') {
      iconifyResults = [];
    }
    return () => clearTimeout(searchTimeout);
  });

  // ── actions ──────────────────────────────────────────────────────────────────
  function selectNode(node: RenderedNode) {
    selectedNode = node;
    step = 'icons';
  }

  function goBack() {
    step = 'nodes';
    selectedNode = null;
    searchQuery = '';
    iconifyResults = [];
  }

  function handleInsert(iconId: string) {
    if (!selectedNode) return;
    const code = $stateStore.code ?? '';
    let newCode: string;
    if (selectedNode.type === 'flowchart-node') {
      newCode = insertOrUpdateFlowchartIcon(code, selectedNode.id, iconId);
    } else {
      newCode = insertOrUpdateArchitectureIcon(code, selectedNode.lineNumber, iconId);
    }
    updateCode(newCode);
    isOpen = false;
  }

  function handleDragMode() {
    enterDragMode();
    isOpen = false;
  }

  function nodeBadgeLabel(type: NodeInfo['type']): string {
    if (type === 'arch-service') return 'service';
    if (type === 'arch-group') return 'group';
    return 'node';
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger>
    <Button variant="ghost" size="sm" title="Insert Icon">
      <Icon class="size-5" />
    </Button>
  </Popover.Trigger>

  <Popover.Content class="w-80 p-3 shadow-lg">
    {#if !supportsIcons}
      <!-- ── Unsupported diagram type ──────────────────────────────────────── -->
      <div class="flex flex-col items-center gap-2 py-4 text-center">
        <Icon class="size-8 text-muted-foreground/40" />
        <p class="text-sm font-medium text-foreground">Icons not supported</p>
        <p class="text-xs text-muted-foreground">
          The current diagram type does not support icon syntax. Switch to a
          <span class="font-medium text-foreground">flowchart</span> or
          <span class="font-medium text-foreground">architecture-beta</span> diagram to use icons.
        </p>
      </div>
    {:else if step === 'nodes'}
      <!-- ── Step 1: Node list ─────────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <p class="text-xs font-semibold text-muted-foreground">Select a node to add an icon to</p>

        {#if nodeList.length === 0}
          <p class="py-4 text-center text-sm text-muted-foreground">No nodes found in diagram</p>
        {:else}
          <div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {#each nodeList as node (node.id)}
              <button
                class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                onclick={() => selectNode(node)}>
                <span
                  class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {nodeBadgeLabel(node.type)}
                </span>
                <span class="truncate font-mono text-xs">{node.id}</span>
              </button>
            {/each}
          </div>
        {/if}

        <button
          class="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          onclick={handleDragMode}>
          Drag mode
        </button>
      </div>
    {:else}
      <!-- ── Step 2: Icon search ───────────────────────────────────────────── -->
      <div class="flex flex-col gap-2">
        <!-- Breadcrumb -->
        <button
          class="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onclick={goBack}>
          <BackIcon class="size-3.5" />
          <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            {nodeBadgeLabel(selectedNode?.type ?? 'flowchart-node')}
          </span>
          <span class="font-mono">{selectedNode?.id}</span>
        </button>

        <!-- Tabs -->
        <div class="flex w-full items-center rounded-md bg-muted p-1 text-muted-foreground">
          <button
            class="inline-flex flex-1 items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none {activeTab ===
            'iconify'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50 hover:text-foreground'}"
            onclick={() => (activeTab = 'iconify')}>
            Iconify
          </button>
          <button
            class="inline-flex flex-1 items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline-none {activeTab ===
            'azure'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50 hover:text-foreground'}"
            onclick={() => (activeTab = 'azure')}>
            Azure
          </button>
        </div>

        <!-- Search -->
        <div class="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
          <SearchIcon class="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search icons..."
            class="w-full bg-transparent text-sm focus:outline-none"
            bind:value={searchQuery} />
        </div>

        <!-- Icon grid -->
        {#if activeTab === 'iconify'}
          <div class="grid h-64 grid-cols-5 gap-2 overflow-y-auto p-1">
            {#if isSearchingIconify}
              <div class="col-span-5 p-4 text-center text-sm text-muted-foreground">Loading...</div>
            {:else if iconifyResults.length === 0}
              <div class="col-span-5 p-4 text-center text-sm text-muted-foreground">
                {searchQuery.length < 2 ? 'Type to search 200,000+ icons' : 'No results found'}
              </div>
            {:else}
              {#each iconifyResults as icon (`${icon.prefix}:${icon.name}`)}
                <button
                  class="flex aspect-square items-center justify-center rounded border border-transparent bg-muted/50 p-2 transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
                  onclick={() => handleInsert(`${icon.prefix}:${icon.name}`)}
                  title={`${icon.prefix}:${icon.name}`}>
                  <img
                    src={`https://api.iconify.design/${icon.prefix}/${icon.name}.svg`}
                    alt={icon.name}
                    class="h-6 w-6 dark:invert" />
                </button>
              {/each}
            {/if}
          </div>
        {:else}
          <div class="grid h-64 grid-cols-4 gap-2 overflow-y-auto p-1">
            {#if filteredAzureIcons.length === 0}
              <div class="col-span-4 p-4 text-center text-sm text-muted-foreground">
                No Azure icons found
              </div>
            {:else}
              {#each filteredAzureIcons as icon (icon)}
                {@const svgData = azureIconsMap.get(icon)}
                <button
                  class="flex aspect-square flex-col items-center justify-center gap-1 rounded border border-transparent bg-muted/50 p-1 transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground"
                  onclick={() => handleInsert(icon)}
                  title={icon}>
                  {#if svgData}
                    <svg viewBox={`0 0 ${svgData.width} ${svgData.height}`} class="h-6 w-6">
                      <!-- eslint-disable svelte/no-at-html-tags -->
                      {@html svgData.body}
                      <!-- eslint-enable svelte/no-at-html-tags -->
                    </svg>
                  {/if}
                  <span class="mt-1 w-full truncate text-center text-[9px]">
                    {icon.replace('azure:', '')}
                  </span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>
