<script lang="ts">
  import { Button } from '$/components/ui/button';
  import * as Popover from '$/components/ui/popover';
  import Icon from '~icons/material-symbols/add-reaction';
  import SearchIcon from '~icons/material-symbols/search';
  import { azureIconsMap } from '$/util/mermaid';

  const { onInsert } = $props<{ onInsert: (iconId: string) => void }>();

  let searchQuery = $state('');
  let isOpen = $state(false);
  let activeTab = $state<'iconify' | 'azure'>('iconify');

  let iconifyResults: Array<{ prefix: string; name: string }> = $state([]);
  let isSearchingIconify = $state(false);

  let azureIcons = $derived(Array.from(azureIconsMap.keys()));
  let filteredAzureIcons = $derived(
    azureIcons.filter((icon) => icon.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let searchTimeout: NodeJS.Timeout;

  $effect(() => {
    if (activeTab === 'iconify' && searchQuery.length >= 2) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        isSearchingIconify = true;
        try {
          const res = await fetch(
            `https://api.iconify.design/search?query=${searchQuery}&limit=60`
          );
          const data = await res.json();
          iconifyResults = data.icons.map((id: string) => {
            const [prefix, name] = id.split(':');
            return { prefix, name };
          });
        } catch (e) {
          console.error('Failed to search iconify:', e);
          iconifyResults = [];
        } finally {
          isSearchingIconify = false;
        }
      }, 300);
    } else if (activeTab === 'iconify') {
      iconifyResults = [];
    }
  });

  function handleInsert(iconId: string) {
    onInsert(iconId);
    isOpen = false;
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger>
    <Button variant="ghost" size="sm" title="Insert Icon">
      <Icon class="size-5" />
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-80 p-3 shadow-lg">
    <div class="flex w-full flex-col">
      <div class="flex w-full items-center rounded-md bg-muted p-1 text-muted-foreground">
        <button
          class="inline-flex flex-1 items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 {activeTab ===
          'iconify'
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:bg-background/50 hover:text-foreground'}"
          onclick={() => (activeTab = 'iconify')}>
          Iconify
        </button>
        <button
          class="inline-flex flex-1 items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 {activeTab ===
          'azure'
            ? 'bg-background text-foreground shadow-sm'
            : 'hover:bg-background/50 hover:text-foreground'}"
          onclick={() => (activeTab = 'azure')}>
          Azure
        </button>
      </div>

      <div class="mt-3 flex items-center gap-2 rounded-md border bg-background px-2 py-1">
        <SearchIcon class="text-muted-foreground" />
        <input
          type="text"
          placeholder="Search icons..."
          class="w-full bg-transparent text-sm focus:outline-none"
          bind:value={searchQuery} />
      </div>

      {#if activeTab === 'iconify'}
        <div class="mt-2 grid h-64 grid-cols-5 gap-2 overflow-y-auto p-1">
          {#if isSearchingIconify}
            <div class="col-span-5 p-4 text-center text-sm text-muted-foreground">Loading...</div>
          {:else if iconifyResults.length === 0}
            <div class="col-span-5 p-4 text-center text-sm text-muted-foreground">
              {searchQuery.length < 2 ? 'Type to search 200,000+ icons' : 'No results found'}
            </div>
          {:else}
            {#each iconifyResults as icon}
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
      {:else if activeTab === 'azure'}
        <div class="mt-2 grid h-64 grid-cols-4 gap-2 overflow-y-auto p-1">
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
                  <!-- Use the base64 SVG preview or raw rendering (raw is smaller) -->
                  <svg viewBox={`0 0 ${svgData.width} ${svgData.height}`} class="h-6 w-6">
                    {@html svgData.body}
                  </svg>
                {/if}
                <span class="mt-1 w-full truncate text-center text-[9px]"
                  >{icon.replace('azure:', '')}</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
