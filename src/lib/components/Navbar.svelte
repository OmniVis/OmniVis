<script lang="ts" module>
  import { logEvent } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import MainMenu from '$/components/MainMenu.svelte';
  import { Button } from '$/components/ui/button';
  import { Separator } from '$/components/ui/separator';
  import type { ComponentProps, Snippet } from 'svelte';
  import { stateStore } from '$/util/state';
  import { explorerVisible } from '$/util/fileMetadata.svelte';
  import DropdownNavMenu from './DropdownNavMenu.svelte';
  import SideNavigationIcon from '~icons/material-symbols/menu-open-rounded';
  import GithubIcon from '~icons/mdi/github';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
  }

  let { children, mobileToggle }: Props = $props();

  type Links = ComponentProps<typeof DropdownNavMenu>['links'];

  const githubLinks: Links = [
    { title: 'Mermaid JS', href: 'https://github.com/mermaid-js/mermaid' },
    {
      title: 'Mermaid Live Editor',
      href: 'https://github.com/mermaid-js/mermaid-live-editor'
    },
    {
      title: 'Mermaid CLI',
      href: 'https://github.com/mermaid-js/mermaid-cli'
    }
  ];
</script>

<nav class="z-50 flex p-4 sm:p-6">
  <div class="flex flex-1 items-center gap-2">
    <MainMenu />
    <img
      src="https://raw.githubusercontent.com/GraphiTeam/GraphiTeam/refs/heads/main/static/graphi-logo.png"
      alt="GraphiTeam Logo"
      class="size-8 rounded-sm" />
    <a href="/" class="whitespace-nowrap text-accent">
      {#if !mobileToggle}
        GraphiTeam
      {/if}
      {$stateStore.viewMode === 'code' ? 'Code Editor' : 'Interactive Playground'}
    </a>
  </div>

  <div
    id="menu"
    class="hidden flex-nowrap items-center justify-between gap-3 overflow-hidden md:flex">
    <Button
      variant="ghost"
      size="icon"
      onclick={() => (explorerVisible.visible = !explorerVisible.visible)}
      title={explorerVisible.visible ? 'Hide Explorer' : 'Show Explorer'}>
      <SideNavigationIcon />
    </Button>
    <DropdownNavMenu icon={GithubIcon} links={githubLinks} />
    <Separator orientation="vertical" />
    {@render children()}
  </div>
  {@render mobileToggle?.()}
</nav>
