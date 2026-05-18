<script lang="ts">
  import Editor from '$/components/Editor.svelte';
  import FileExplorer from '$/components/FileExplorer/FileExplorer.svelte';
  import HistoryTimeline from '$/components/History/HistoryTimeline.svelte';
  import ThemeStore from '$/components/ThemeStore.svelte';
  import { base } from '$app/paths';
  import ActivityBar from '$/components/Layout/ActivityBar.svelte';
  import ExportPane from '$/components/Layout/ExportPane.svelte';
  import MobileLayout from '$/components/Layout/MobileLayout.svelte';
  import SideBar from '$/components/Layout/SideBar.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import Share from '$/components/Share.svelte';
  import Settings from '$/components/Layout/Settings.svelte';
  import SecurityPane from '$/components/Layout/SecurityPane.svelte';
  import TemplatePane from '$/components/Layout/TemplatePane.svelte';
  import View from '$/components/View.svelte';
  import * as Resizable from '$/components/ui/resizable';
  import type { Tab } from '$/types';
  import { loadRoots, restoreActiveGraph, saveFile } from '$lib/util/fileSystem';
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
  import { scheduleAutoSave, undo, redo, canUndo, canRedo } from '$/util/historyStore';
  import UndoIcon from '~icons/material-symbols/undo';
  import RedoIcon from '~icons/material-symbols/redo';
  import CheckIcon from '~icons/material-symbols/check-circle-outline';
  import ShortcutsModal from '$/components/Layout/ShortcutsModal.svelte';
  import { aiRepairRequest } from '$/util/aiRepair';
  import {
    LogOut,
    User,
    Activity,
    ChevronDown,
    KeyRound,
    UserPlus,
    HelpCircle
  } from 'lucide-svelte';
  import GraphiOnboardingTour from '$/components/GraphiOnboardingTour.svelte';

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

    userId = localStorage.getItem('graphi_user_id');
    username = localStorage.getItem('graphi_username');

    const { loadSiteWorkspace } = await import('$/util/siteWorkspace.svelte');
    await loadSiteWorkspace();
    await restoreActiveGraph(base || '');

    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  });

  let activeSideBarView = $state('explorer');
  let showAISidebar = $state(false);
  let isShortcutsOpen = $state(false);

  let isAdvancedMode = $derived($stateStore.isAdvancedMode);
  const toggleMode = (pressed: boolean) => {
    updateCodeStore({ isAdvancedMode: pressed });
  };

  let userId = $state<string | null>(null);
  let username = $state<string | null>(null);

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
    activeCloudFileId,
    currentGraphName,
    isAuthModalOpen,
    lastSavedCode,
    saveActiveFile,
    saveStatus,
    writeFile
  } from '$lib/util/fileSystem';
  import { debounce } from 'lodash-es';

  const isDirty = $derived(
    (!!$activeFileHandle || !!$activeVirtualFileId || !!$activeCloudFileId) &&
      $stateStore.code !== $lastSavedCode
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

  $effect(() => {
    if ($aiRepairRequest) {
      showAISidebar = true;
    }
  });

  let showProfileMenu = $state(false);
  let profileMenuEl = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!showProfileMenu) return;
    function handleOutsideClick(e: MouseEvent) {
      if (profileMenuEl && !profileMenuEl.contains(e.target as Node)) {
        showProfileMenu = false;
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      const state = undo();
      if (state)
        updateCodeStore({ code: state.code, ...(state.mermaid ? { mermaid: state.mermaid } : {}) });
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      const state = redo();
      if (state)
        updateCodeStore({ code: state.code, ...(state.mermaid ? { mermaid: state.mermaid } : {}) });
    }
  }
</script>

<svelte:window bind:innerWidth={width} onkeydown={handleKeydown} />

{#if width > 0 && isMobile}
  <MobileLayout {isMobile} />
{:else}
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
    <!-- Header -->
    <header
      class="z-50 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 md:h-14 md:px-6">
      <!-- Left: logo + file name + (advanced) main menu -->
      <div class="flex shrink-0 items-center gap-2">
        <img
          src="{base}/branding/graphi-logomark-on-light.png"
          alt="Graphi Logo"
          class="h-6 w-auto object-contain md:h-8" />
        {#if $activeVirtualFileId || $activeFileHandle || $activeCloudFileId}
          <span class="text-slate-200">/</span>
          <span class="hidden max-w-[180px] truncate text-[11px] font-bold text-slate-600 lg:block">
            {#if $activeVirtualFileId}
              {siteFiles.find((f) => f.id === $activeVirtualFileId)?.name || 'Untitled Diagram'}
            {:else if $activeFileHandle}
              {$activeFileHandle?.name || 'Untitled Diagram'}
            {:else if $activeCloudFileId}
              {$currentGraphName || 'Untitled Diagram'}
            {/if}
            {#if isDirty}<span class="ml-0.5 text-[10px] text-amber-500">●</span>{/if}
          </span>
        {/if}
        {#if $activeVirtualFileId || $activeFileHandle || $activeCloudFileId}
          <div class="flex items-center gap-0.5">
            <button
              onclick={() => {
                const s = undo();
                if (s)
                  updateCodeStore({ code: s.code, ...(s.mermaid ? { mermaid: s.mermaid } : {}) });
              }}
              disabled={!$canUndo}
              title="Undo (Ctrl+Z)"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30">
              <UndoIcon class="size-4" />
            </button>
            <button
              onclick={() => {
                const s = redo();
                if (s)
                  updateCodeStore({ code: s.code, ...(s.mermaid ? { mermaid: s.mermaid } : {}) });
              }}
              disabled={!$canRedo}
              title="Redo (Ctrl+Y)"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30">
              <RedoIcon class="size-4" />
            </button>
          </div>
        {/if}
      </div>

      <!-- Centre: mode toggle -->
      <div class="flex flex-1 items-center justify-center">
        <div
          data-tour="mode-toggle"
          class="flex items-center rounded-sm border border-slate-200/60 bg-slate-50 p-0.5">
          <button
            onclick={() => toggleMode(false)}
            class="rounded-sm px-3 py-1 text-[10px] font-semibold tracking-wider uppercase transition-all {!isAdvancedMode
              ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-slate-500 hover:text-slate-900'}">
            Simple
          </button>
          <button
            onclick={() => toggleMode(true)}
            class="rounded-sm px-3 py-1 text-[10px] font-semibold tracking-wider uppercase transition-all {isAdvancedMode
              ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
              : 'text-slate-500 hover:text-slate-900'}">
            Advanced
          </button>
        </div>
      </div>

      <!-- Right: save + share + account -->
      <div class="flex shrink-0 items-center gap-0.5">
        <!-- Save button with status-aware styling -->
        <button
          onclick={handleSaveDiagram}
          data-tour="save-button"
          disabled={$saveStatus === 'saving'}
          title="Save"
          class="flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold tracking-wider uppercase transition-all active:scale-[0.97] disabled:cursor-wait {$saveStatus ===
          'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
            : isDirty
              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
          {#if $saveStatus === 'saving'}
            <SaveIcon class="size-3.5 animate-pulse" />
          {:else if $saveStatus === 'success'}
            <CheckIcon class="size-3.5" />
          {:else}
            <SaveIcon class="size-3.5" />
          {/if}
          <span class="hidden sm:inline">{$saveStatus === 'success' ? 'Saved' : 'Save'}</span>
        </button>

        <!-- Share -->
        <div data-tour="share-button" class="flex items-center">
          <Share />
        </div>

        <!-- Tour Relauncher -->
        <button
          onclick={() => {
            window.dispatchEvent(new CustomEvent('graphi-start-onboarding'));
          }}
          title="Restart Workspace Tour"
          class="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-95">
          <HelpCircle class="size-4" />
        </button>

        <!-- Separator -->
        <div class="mx-0.5 h-4 w-[1px] bg-slate-100"></div>

        <!-- Account -->
        <div class="relative" bind:this={profileMenuEl}>
          {#if !userId}
            <!-- Guest badge -->
            <button
              onclick={() => (showProfileMenu = !showProfileMenu)}
              class="flex items-center gap-1.5 bg-slate-100 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-700 uppercase transition-colors hover:bg-slate-200 active:scale-[0.97]">
              <User class="size-3.5 text-slate-400" />
              <span class="hidden lg:inline">Guest</span>
              <ChevronDown class="size-3 opacity-70" />
            </button>
            {#if showProfileMenu}
              <div
                class="absolute top-full right-0 z-[200] mt-2 w-56 animate-in overflow-hidden border border-slate-200 bg-white shadow-xl duration-150 fade-in slide-in-from-top-2">
                <div class="border-b border-slate-100 px-4 py-3">
                  <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Status
                  </p>
                  <p class="text-sm font-bold text-slate-900">Not signed in</p>
                </div>
                <div class="p-1.5">
                  <a
                    href="{base}/status"
                    target="_blank"
                    onclick={() => (showProfileMenu = false)}
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50">
                    <Activity class="size-4 shrink-0 text-slate-400" /> System Status
                  </a>
                </div>
                <div class="border-t border-slate-100 p-1.5">
                  <button
                    onclick={() => {
                      showProfileMenu = false;
                      isAuthModalOpen.set(true);
                    }}
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50">
                    <KeyRound class="size-4 shrink-0 text-slate-400" /> Login with Key
                  </button>
                  <button
                    onclick={() => {
                      showProfileMenu = false;
                      isAuthModalOpen.set(true);
                    }}
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50">
                    <UserPlus class="size-4 shrink-0 text-slate-400" /> Create Account
                  </button>
                </div>
              </div>
            {/if}
          {:else}
            <!-- Signed-in badge -->
            <button
              onclick={() => (showProfileMenu = !showProfileMenu)}
              class="flex items-center gap-1.5 bg-slate-900 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase transition-colors hover:bg-slate-700 active:scale-[0.97]">
              <span class="font-black">{(username || 'A').charAt(0).toUpperCase()}</span>
              <span class="hidden max-w-[80px] truncate lg:inline">{username || 'Account'}</span>
              <ChevronDown class="size-3 opacity-70" />
            </button>
            {#if showProfileMenu}
              <div
                class="absolute top-full right-0 z-[200] mt-2 w-64 animate-in overflow-hidden border border-slate-200 bg-white shadow-xl duration-200 fade-in slide-in-from-top-2">
                <div class="border-b border-slate-100 px-4 py-3">
                  <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Signed in as
                  </p>
                  <p class="text-sm font-bold text-slate-900">{username}</p>
                </div>
                <div class="p-1.5">
                  <a
                    href="{base}/status"
                    target="_blank"
                    onclick={() => (showProfileMenu = false)}
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50">
                    <Activity class="size-4 shrink-0 text-slate-400" /> System Status
                  </a>
                </div>
                <div class="border-t border-slate-100 p-1.5">
                  <button
                    onclick={() => {
                      localStorage.removeItem('graphi_user_id');
                      localStorage.removeItem('graphi_username');
                      userId = null;
                      username = null;
                      showProfileMenu = false;
                      window.location.reload();
                    }}
                    class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50">
                    <LogOut class="size-4 shrink-0 text-slate-400" /> Log out
                  </button>
                </div>
              </div>
            {/if}
          {/if}
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
                        : activeSideBarView === 'security'
                          ? 'Security'
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
              {:else if activeSideBarView === 'security'}
                <SecurityPane />
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
            <!-- Editor & Preview + fixed AI sidebar -->
            <div class="flex h-full w-full flex-1 overflow-hidden">
              <Resizable.PaneGroup
                direction="horizontal"
                class="h-full flex-1"
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
                    <div data-tour="editor-pane" class="relative flex-1 overflow-hidden">
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
                  class="relative flex h-full flex-col overflow-hidden bg-background"
                  data-tour="preview-pane">
                  <View {panZoomState} shouldShowGrid={$stateStore.grid} />
                  <div class="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
                    <PanZoomToolbar {panZoomState} />
                  </div>
                </Resizable.Pane>
              </Resizable.PaneGroup>

              <!-- AI Sidebar: fixed width, not resizable -->
              {#if showAISidebar}
                <div
                  class="relative flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
                  <AIChatSidebar
                    currentCode={$stateStore.code}
                    onInsertCode={(code) => updateCodeStore({ code })}
                    onReplaceCode={(code) => updateCodeStore({ code })}
                    onClose={() => (showAISidebar = false)} />
                </div>
              {/if}
            </div>
          </div>
        </Resizable.Pane>
      </Resizable.PaneGroup>
    </div>
  </div>

  <ShortcutsModal bind:isOpen={isShortcutsOpen} />
  <GraphiOnboardingTour />
{/if}
