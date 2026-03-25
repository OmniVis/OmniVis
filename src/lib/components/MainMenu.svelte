<script lang="ts">
  import McWrapper from '$/components/McWrapper.svelte';
  import * as Popover from '$/components/ui/popover';
  import { Switch } from '$/components/ui/switch';
  import { urlsStore } from '$/util/state';
  import { cn } from '$/utils';
  import { mode, setMode } from 'mode-watcher';
  import type { Component, Snippet } from 'svelte';
  import AddIcon from '~icons/material-symbols/add';
  import DuplicateIcon from '~icons/material-symbols/content-copy';
  import ContrastIcon from '~icons/material-symbols/contrast';
  import PlaygroundIcon from '~icons/material-symbols/shape-line';

  interface MenuItem {
    label: string;
    icon: Component;
    href: string;
    class?: string;
    sharesData?: boolean;
    checkDiagramType?: boolean;
    isSectionEnd?: boolean;
    renderer: (item: Omit<MenuItem, 'renderer'>) => ReturnType<Snippet>;
  }

  const menuItems = $derived.by(() => {
    const urls = $urlsStore;
    return [
      { label: 'New', icon: AddIcon, href: urls.new, renderer: menuItem },
      { label: 'Duplicate', icon: DuplicateIcon, href: window.location.href, renderer: menuItem },
      {
        href: urls.mermaidChart({ medium: 'main_menu' }).playground,
        icon: PlaygroundIcon,
        isSectionEnd: true,
        label: 'Edit in Playground',
        renderer: mcMenuItem
      },
      {
        href: '#',
        icon: ContrastIcon,
        isSectionEnd: true,
        label: 'Dark Mode',
        renderer: darkModeMenuItem
      }
    ];
  });
</script>

{#snippet menuItem(options: MenuItem)}
  <a
    data-sveltekit-reload
    href={options.href}
    target="_blank"
    class={cn(
      'flex items-center justify-start gap-2 border-b border-border p-2 px-3 text-sm text-foreground transition-colors hover:bg-muted',
      options.isSectionEnd && 'border-b-2',
      options.class
    )}>
    <options.icon class="mr-1 size-4 text-muted-foreground" />
    {options.label}
  </a>
{/snippet}

{#snippet mcMenuItem(item: MenuItem)}
  <McWrapper
    side="right"
    labelPrefix={item.sharesData === false ? 'Opens a new tab in' : undefined}
    sharesData={item.sharesData}
    shouldCheckDiagramType={item.checkDiagramType}>
    {@render menuItem(item)}
  </McWrapper>
{/snippet}

{#snippet darkModeMenuItem(options: MenuItem)}
  <div
    class={cn(
      'flex cursor-pointer items-center justify-between border-b border-border px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted',
      options.isSectionEnd && 'border-b-0',
      options.class
    )}>
    <span class="flex items-center gap-2">
      <ContrastIcon class="mr-1 size-4 text-muted-foreground" />
      Dark Mode
    </span>
    <Switch
      checked={$mode === 'dark'}
      onCheckedChange={(dark) => setMode(dark ? 'dark' : 'light')} />
  </div>
{/snippet}

<Popover.Root>
  <Popover.Trigger
    class="shrink-0 rounded-md p-1 transition-colors outline-none hover:bg-muted focus:ring-2 focus:ring-primary">
    <img
      src="https://raw.githubusercontent.com/GraphiTeam/Assets/refs/heads/main/graphilogo.png"
      alt="Menu"
      class="size-6 object-contain" />
  </Popover.Trigger>
  <Popover.Content
    align="start"
    class="flex w-56 flex-col overflow-hidden rounded-xl border border-border bg-background p-0 shadow-lg"
    sideOffset={8}>
    {#each menuItems as { renderer, ...item } (item.label)}
      {@render renderer(item)}
    {/each}
  </Popover.Content>
</Popover.Root>
