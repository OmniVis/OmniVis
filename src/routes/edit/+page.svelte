<script lang="ts">
  import Editor from '$/components/Editor.svelte';
  import FileExplorer from '$/components/FileExplorer/FileExplorer.svelte';
  import HistoryTimeline from '$/components/History/HistoryTimeline.svelte';
  import ThemeStore from '$/components/ThemeStore.svelte';
  import { base } from '$app/paths';
  import { mode } from 'mode-watcher';
  import ActivityBar from '$/components/Layout/ActivityBar.svelte';
  import ExportPane from '$/components/Layout/ExportPane.svelte';
  import MobileLayout from '$/components/Layout/MobileLayout.svelte';
  import SideBar from '$/components/Layout/SideBar.svelte';
  import StatusBar from '$/components/Layout/StatusBar.svelte';
  import MainMenu from '$/components/MainMenu.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import Share from '$/components/Share.svelte';
  import Settings from '$/components/Layout/Settings.svelte';
  import TemplatePane from '$/components/Layout/TemplatePane.svelte';
  import View from '$/components/View.svelte';
  import { Button } from '$/components/ui/button';
  import * as Resizable from '$/components/ui/resizable';
  import type { Tab } from '$/types';
  import { loadRoots, saveFile } from '$lib/util/fileSystem';
  import { packFileContent } from '$/util/fileContent';
  import { PanZoomState } from '$/util/panZoom';

  import { stateStore, updateCodeStore } from '$/util/state';
  import { logEvent } from '$/util/stats';
  import { initHandler } from '$/util/util';
  import { siteFiles } from '$lib/util/siteWorkspace.svelte';
  import { onMount } from 'svelte';
  import { toast } from 'svelte-sonner';
  import CodeIcon from '~icons/custom/code';
  import SaveIcon from '~icons/material-symbols/save';
  import GearIcon from '~icons/material-symbols/settings';
  import Card from '$/components/Card/Card.svelte';
  import AIChatSidebar from '$/components/AIChatSidebar.svelte';
  import { scheduleAutoSave } from '$/util/historyStore';
  import CheckIcon from '~icons/material-symbols/check-circle-outline';
  import ShortcutsModal from '$/components/Layout/ShortcutsModal.svelte';

  const panZoomState = new PanZoomState();

  const tabSelectHandler = (tab: Tab) => {
    // @ts-expect-error - editorMode is a subset of tab.id
    updateCodeStore({ editorMode: tab.id });
  };

  const editorTabs: Tab[] = [
    { icon: CodeIcon, id: 'code', title: 'Code' },
    { icon: GearIcon, id: 'config', title: 'Config' }
  ];

  let width = $state(1200);
  let isMobile = $derived(width > 0 && width < 768);

  onMount(async () => {
    await initHandler();

    const onHashChange = () => {
      void initHandler();
    };
    window.addEventListener('hashchange', onHashChange);

    window.addEventListener('appinstalled', () => {
      logEvent('pwaInstalled', { isMobile });
    });
    await loadRoots();

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  });

  let activeSideBarView = $state('explorer');
  let showAISidebar = $state(false);
  let isShortcutsOpen = $state(false);

  // NEW: Simple vs Advanced Mode (Synced with store)
  let isAdvancedMode = $derived($stateStore.isAdvancedMode);
  const toggleMode = (pressed: boolean) => {
    updateCodeStore({ isAdvancedMode: pressed });
  };

  async function handleSaveDiagram() {
    const packed = packFileContent($stateStore.code, $stateStore.mermaid);
    const saved = await saveActiveFile(packed);
    if (saved) {
      toast.success('Diagram saved successfully');
      return;
    }
    try {
      if (await saveFile(packed)) {
        toast.success('Diagram saved successfully');
      }
    } catch {
      // Error handled in saveFile
    }
  }

  import {
    activeFileHandle,
    activeVirtualFileId,
    lastSavedCode,
    saveActiveFile,
    saveStatus,
    writeFile
  } from '$lib/util/fileSystem';
  import { debounce } from 'lodash-es';

  const isDirty = $derived(
    (!!$activeFileHandle || !!$activeVirtualFileId) && $stateStore.code !== $lastSavedCode
  );

  const autosave = debounce(async (code: string) => {
    const handle = $activeFileHandle;
    const virtualId = $activeVirtualFileId;
    const packed = packFileContent(code, $stateStore.mermaid);

    if (virtualId) {
      console.log('Autosaving virtual file:', virtualId);
      await saveActiveFile(packed);
      return;
    }

    if (handle && code !== $lastSavedCode) {
      try {
        // @ts-expect-error - File System API types are experimental
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          console.log('Autosaving handle:', handle.name);
          await writeFile(handle, packed);
        } else {
          saveStatus.set('blocked');
        }
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }
  }, 15000);

  $effect(() => {
    if ((!!$activeFileHandle || !!$activeVirtualFileId) && isDirty) {
      autosave($stateStore.code);
    }
    scheduleAutoSave($stateStore.code, $stateStore.mermaid);
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveDiagram();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      // Reserved for Command Palette or Export
    }
  }
</script>

<svelte:window bind:innerWidth={width} onkeydown={handleKeydown} />

{#if width > 0 && isMobile}
  <MobileLayout {isMobile} />
{:else}
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
    <!-- Clean Header -->
    <header
      class="z-50 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <img
            src="{base}/branding/graphi-logomark-on-{$mode === 'dark' ? 'dark' : 'light'}.png"
            alt="Graphi Logo"
            class="h-7 w-auto object-contain" />
          <span class="flex items-center gap-2 text-[13px] font-black tracking-widest uppercase">
            Graphi
          </span>
          {#if $activeVirtualFileId || $activeFileHandle}
            <span class="text-border">/</span>
            <span class="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              {#if $activeVirtualFileId}
                {siteFiles.find((f) => f.id === $activeVirtualFileId)?.name || 'Untitled Diagram'}
              {:else}
                {$activeFileHandle?.name || 'Untitled Diagram'}
              {/if}
              {#if isDirty}
                <span class="text-[10px] text-primary">●</span>
              {/if}
            </span>
          {/if}
        </div>

        <div class="mx-2 h-4 w-[1px] bg-border"></div>

        {#if isAdvancedMode}
          <MainMenu />
        {/if}
      </div>

      <div class="flex items-center gap-3">
        <!-- Save Status -->
        <div
          class="mr-2 flex min-w-[60px] justify-end text-[10px] font-bold tracking-wider uppercase">
          {#if $saveStatus === 'saving'}
            <span class="animate-pulse text-muted-foreground">Saving...</span>
          {:else if $saveStatus === 'success'}
            <span
              class="flex animate-out items-center gap-1 text-green-600 duration-1000 fill-mode-forwards fade-out dark:text-green-400">
              <CheckIcon class="size-3.5" />
              Saved
            </span>
          {:else if $saveStatus === 'blocked'}
            <span
              class="cursor-help text-[9px] text-destructive"
              title="Click Save button to grant permission">Need Permission</span>
          {/if}
        </div>

        <!-- Mode Toggle -->
        <div class="flex items-center border border-border">
          <button
            class="h-7 cursor-pointer border-r border-border px-3 text-[10px] font-bold tracking-wider uppercase transition-colors {!isAdvancedMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted/40'}"
            onclick={() => toggleMode(false)}>
            Simple
          </button>
          <button
            class="h-7 cursor-pointer px-3 text-[10px] font-bold tracking-wider uppercase transition-colors {isAdvancedMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted/40'}"
            onclick={() => toggleMode(true)}>
            Advanced
          </button>
        </div>

        <!-- Actions -->
        <div class="flex items-center border border-border">
          <Button
            variant="default"
            size="sm"
            onclick={handleSaveDiagram}
            title="Save to File"
            class="h-7 gap-1.5 rounded-none px-3 text-[10px] font-bold tracking-wider uppercase">
            <SaveIcon class="size-3.5" />
            Save
          </Button>
          <div class="h-7 w-[1px] bg-border"></div>
          <Share />
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Only show ActivityBar in Advanced Mode -->
      {#if isAdvancedMode}
        <ActivityBar
          activeView={activeSideBarView}
          {showAISidebar}
          onAIToggle={() => (showAISidebar = !showAISidebar)}
          onViewChange={(view) => {
            if (view === 'shortcuts') {
              isShortcutsOpen = true;
              return;
            }
            if (view === activeSideBarView && activeSideBarView !== '') {
              // Toggle off
              activeSideBarView = '';
            } else {
              activeSideBarView = view;
            }
          }} />
      {/if}

      <Resizable.PaneGroup direction="horizontal" class="flex-1 overflow-hidden">
        <!-- Sidebar only in Advanced Mode + Active View -->
        {#if isAdvancedMode && activeSideBarView}
          <Resizable.Pane order={1} defaultSize={20} minSize={15} maxSize={40} collapsible={false}>
            <SideBar
              title={activeSideBarView === 'explorer'
                ? 'Explorer'
                : activeSideBarView === 'export'
                  ? 'Export'
                  : activeSideBarView === 'history'
                    ? 'History'
                    : activeSideBarView === 'themes'
                      ? 'Theme Store'
                      : activeSideBarView === 'templates'
                        ? 'Templates'
                        : 'Settings'}>
              {#if activeSideBarView === 'explorer' && !isMobile}
                <div class="h-full p-2">
                  <FileExplorer {isMobile} />
                </div>
              {:else if activeSideBarView === 'export'}
                <ExportPane />
              {:else if activeSideBarView === 'history'}
                <div class="h-full overflow-y-auto">
                  <HistoryTimeline
                    onRestore={(code, mermaid) => {
                      const update: Record<string, string> = { code };
                      if (mermaid) update.mermaid = mermaid;
                      updateCodeStore(update);
                    }} />
                </div>
              {:else if activeSideBarView === 'themes'}
                <ThemeStore />
              {:else if activeSideBarView === 'templates'}
                <div class="h-full overflow-y-auto">
                  <TemplatePane />
                </div>
              {:else if activeSideBarView === 'settings'}
                <Settings />
              {/if}
            </SideBar>
          </Resizable.Pane>
          <Resizable.Handle
            withHandle
            class="w-1.5 bg-border/50 transition-colors hover:bg-primary/50" />
        {/if}

        <Resizable.Pane order={2} defaultSize={80}>
          <div class="flex h-full flex-col overflow-hidden">
            <!-- Removed old header, now unified at top -->
            <!-- Nested Resizable Group for Editor & Preview -->
            <Resizable.PaneGroup
              direction="horizontal"
              class="h-full w-full flex-1"
              autoSaveId="graphi-editor-panes">
              <Resizable.Pane
                order={1}
                defaultSize={50}
                minSize={20}
                class="flex h-full flex-col border-r border-border bg-background">
                <Card
                  onselect={tabSelectHandler}
                  isOpen
                  flat
                  tabs={isAdvancedMode ? editorTabs : [editorTabs[0]]}
                  activeTabID={$stateStore.editorMode}
                  isClosable={false}
                  class="flex h-full w-full flex-col rounded-none border-0 bg-transparent">
                  {#snippet actions()}{/snippet}
                  <div class="relative flex-1 overflow-hidden">
                    <Editor {isMobile} />
                  </div>
                </Card>
              </Resizable.Pane>

              <Resizable.Handle
                withHandle
                class="w-1.5 bg-border/50 transition-colors hover:bg-primary/50" />

              <!-- Preview Area -->
              <Resizable.Pane
                order={2}
                defaultSize={50}
                minSize={20}
                class="relative flex h-full flex-col overflow-hidden bg-background">
                <View {panZoomState} shouldShowGrid={$stateStore.grid} />
                <div class="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
                  <PanZoomToolbar {panZoomState} />
                </div>
              </Resizable.Pane>

              {#if showAISidebar}
                <Resizable.Handle withHandle class="w-1.5 bg-border/50" />
                <Resizable.Pane
                  order={3}
                  defaultSize={30}
                  minSize={20}
                  maxSize={50}
                  class="relative flex h-full flex-col border-l border-border bg-card">
                  <AIChatSidebar
                    currentCode={$stateStore.code}
                    onInsertCode={(code) => updateCodeStore({ code })}
                    onReplaceCode={(code) => updateCodeStore({ code })}
                    onClose={() => (showAISidebar = false)} />
                </Resizable.Pane>
              {/if}
            </Resizable.PaneGroup>
          </div>
        </Resizable.Pane>
      </Resizable.PaneGroup>
    </div>

    <!-- Replace old StatusBar component call with new styled one -->
    <StatusBar />
  </div>

  <ShortcutsModal bind:isOpen={isShortcutsOpen} />
{/if}
