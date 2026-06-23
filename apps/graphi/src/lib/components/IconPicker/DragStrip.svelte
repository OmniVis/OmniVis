<script lang="ts">
  import SearchIcon from '~icons/material-symbols/search';
  import CloseIcon from '~icons/material-symbols/close';
  import { azureIconsMap } from '$/util/mermaid';
  import { diagramSupportsIcons } from '$/util/mermaidIconSyntax';
  import { iconDragStore, exitDragMode, setDraggingIcon } from '$/util/iconDragStore';
  import { stateStore } from '$/util/state';

  let searchQuery = $state('');
  let activeTab: 'iconify' | 'azure' = $state('iconify');
  let iconifyResults: { prefix: string; name: string }[] = $state([]);
  let isSearchingIconify = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

  let isDragMode = $derived($iconDragStore.mode === 'drag-drop');

  // Auto-exit drag mode when diagram type stops supporting icons
  $effect(() => {
    if (isDragMode && !diagramSupportsIcons($stateStore.diagramType)) {
      exitDragMode();
    }
  });

  let azureIcons = $derived(Array.from(azureIconsMap.keys()));
  let filteredAzureIcons = $derived(
    azureIcons.filter((icon) => icon.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  $effect(() => {
    if (activeTab === 'iconify' && searchQuery.length >= 2) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        isSearchingIconify = true;
        try {
          const res = await fetch(
            `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=40`
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
    } else if (activeTab === 'iconify') {
      iconifyResults = [];
    }
    return () => clearTimeout(searchTimeout);
  });

  function handleDragStart(event: DragEvent, iconId: string) {
    setDraggingIcon(iconId);
    event.dataTransfer?.setData('text/plain', iconId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  function handleDragEnd() {
    setDraggingIcon(null);
  }
</script>

{#if isDragMode}
  <div class="flex shrink-0 flex-col gap-2 border-b border-border bg-background px-3 py-2">
    <!-- Top row: search + tabs + close -->
    <div class="flex items-center gap-2">
      <div class="flex flex-1 items-center gap-2 rounded-md border bg-muted/30 px-2 py-1">
        <SearchIcon class="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search icons to drag..."
          class="w-full bg-transparent text-sm focus:outline-none"
          bind:value={searchQuery} />
      </div>

      <div class="flex items-center rounded-md border p-0.5 text-xs">
        <button
          class="rounded px-2 py-0.5 transition-colors {activeTab === 'iconify'
            ? 'bg-muted font-medium'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (activeTab = 'iconify')}>
          Iconify
        </button>
        <button
          class="rounded px-2 py-0.5 transition-colors {activeTab === 'azure'
            ? 'bg-muted font-medium'
            : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (activeTab = 'azure')}>
          Azure
        </button>
      </div>

      <button
        class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Exit drag mode"
        onclick={exitDragMode}>
        <CloseIcon class="size-4" />
      </button>
    </div>

    <!-- Icon strip -->
    <div class="flex gap-1.5 overflow-x-auto pb-1">
      {#if activeTab === 'iconify'}
        {#if isSearchingIconify}
          <span class="text-xs text-muted-foreground">Loading...</span>
        {:else if iconifyResults.length === 0}
          <span class="text-xs text-muted-foreground">
            {searchQuery.length < 2 ? 'Type to search icons' : 'No results'}
          </span>
        {:else}
          {#each iconifyResults as icon (`${icon.prefix}:${icon.name}`)}
            <div
              draggable="true"
              ondragstart={(e) => handleDragStart(e, `${icon.prefix}:${icon.name}`)}
              ondragend={handleDragEnd}
              class="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded border border-transparent bg-muted/50 p-1.5 transition-colors hover:border-border hover:bg-accent active:cursor-grabbing"
              title={`${icon.prefix}:${icon.name}`}
              role="button"
              tabindex="0">
              <img
                src={`https://api.iconify.design/${icon.prefix}/${icon.name}.svg`}
                alt={icon.name}
                class="h-6 w-6 dark:invert"
                draggable="false" />
            </div>
          {/each}
        {/if}
      {:else}
        {#each filteredAzureIcons as icon (icon)}
          {@const svgData = azureIconsMap.get(icon)}
          <div
            draggable="true"
            ondragstart={(e) => handleDragStart(e, icon)}
            ondragend={handleDragEnd}
            class="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded border border-transparent bg-muted/50 p-1 transition-colors hover:border-border hover:bg-accent active:cursor-grabbing"
            title={icon}
            role="button"
            tabindex="0">
            {#if svgData}
              <svg
                viewBox={`0 0 ${svgData.width} ${svgData.height}`}
                class="h-6 w-6"
                style="pointer-events:none">
                <!-- eslint-disable svelte/no-at-html-tags -->
                {@html svgData.body}
                <!-- eslint-enable svelte/no-at-html-tags -->
              </svg>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
