<script lang="ts">
  import MobileNav from './MobileNav.svelte';
  import Editor from '$/components/Editor.svelte';
  import View from '$/components/View.svelte';
  import FileExplorer from '$/components/FileExplorer/FileExplorer.svelte';
  import TemplatePane from '$/components/Layout/TemplatePane.svelte';
  import Settings from '$/components/Layout/Settings.svelte';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$/components/ui/sheet';
  import { PanZoomState } from '$/util/panZoom';
  import { stateStore } from '$/util/state';

  interface Props {
    isMobile: boolean;
  }

  let { isMobile }: Props = $props();

  let activeView = $state('code');
  let isDrawerOpen = $state(false);
  let drawerView = $state(''); // 'explorer' | 'templates' | 'settings'

  const panZoomState = new PanZoomState();

  function handleViewChange(view: string) {
    if (view === 'code' || view === 'preview') {
      activeView = view;
      isDrawerOpen = false;
    } else {
      drawerView = view;
      isDrawerOpen = true;
    }
  }
</script>

<div class="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
  <!-- Main Content Area -->
  <div class="relative flex-1 overflow-hidden">
    {#if activeView === 'code'}
      <div class="h-full w-full">
        <Editor {isMobile} />
      </div>
    {:else}
      <div class="h-full w-full bg-muted/10">
        <View {panZoomState} shouldShowGrid={$stateStore.grid} />
      </div>
    {/if}
  </div>

  <!-- Bottom Navigation -->
  <MobileNav {activeView} onViewChange={handleViewChange} />

  <!-- Drawers for Files, Templates, Settings -->
  <Sheet bind:open={isDrawerOpen}>
    <SheetContent side="bottom" class="h-[80dvh] p-0">
      <SheetHeader class="border-b px-4 py-2">
        <SheetTitle>
          {drawerView === 'explorer'
            ? 'Files'
            : drawerView === 'templates'
              ? 'Templates'
              : 'Settings'}
        </SheetTitle>
      </SheetHeader>
      <div class="h-full overflow-y-auto p-4 pb-10">
        {#if drawerView === 'explorer'}
          <FileExplorer {isMobile} />
        {:else if drawerView === 'templates'}
          <TemplatePane />
        {:else if drawerView === 'settings'}
          <Settings />
        {/if}
      </div>
    </SheetContent>
  </Sheet>
</div>
