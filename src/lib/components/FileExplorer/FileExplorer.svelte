<script lang="ts">
  import {
    fileList,
    readFile,
    refreshDirectory,
    openDirectory,
    openFiles,
    removeRoot,
    removeFile,
    saveActiveFile,
    saveStatus,
    activeFileHandle,
    activeVirtualFileId,
    lastSavedCode,
    type FileEntry
  } from '$lib/util/fileSystem';
  import {
    siteFiles,
    loadSiteWorkspace,
    createVirtualFile,
    createVirtualFolder,
    deleteVirtualItem,
    moveVirtualItem,
    updateVirtualItem
  } from '$lib/util/siteWorkspace.svelte';
  import * as Resizable from '$/components/ui/resizable';
  import { onMount } from 'svelte';
  import MoreIcon from '~icons/material-symbols/more-vert';
  import { fileMetadataStore, fileMetadata, expansionStore } from '$lib/util/fileMetadata.svelte';
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { packFileContent, unpackFileContent } from '$lib/util/fileContent';
  import FolderIcon from '~icons/material-symbols/folder-open';
  import ChevronRight from '~icons/material-symbols/chevron-right';
  import RefreshIcon from '~icons/material-symbols/refresh';
  import SettingsIcon from '~icons/material-symbols/settings';
  import AddFolderIcon from '~icons/material-symbols/create-new-folder';
  import AddFileIcon from '~icons/material-symbols/note-add';
  import DatabaseIcon from '~icons/material-symbols/database';
  import CloudIcon from '~icons/material-symbols/cloud';
  import LockIcon from '~icons/material-symbols/lock';
  import ProcessIcon from '~icons/material-symbols/settings-backup-restore';
  import BugIcon from '~icons/material-symbols/bug-report';
  import StarIcon from '~icons/material-symbols/star';
  import HeartIcon from '~icons/material-symbols/favorite';
  import LibraryIcon from '~icons/material-symbols/library-books';
  import HistoryIcon from '~icons/material-symbols/history';
  import TerminalIcon from '~icons/material-symbols/terminal';
  import CheckIcon from '~icons/material-symbols/check-circle';
  import WarningIcon from '~icons/material-symbols/warning';
  import RocketIcon from '~icons/material-symbols/rocket-launch';
  import WorkIcon from '~icons/material-symbols/business-center';
  import HomeIcon from '~icons/material-symbols/home';
  import SchoolIcon from '~icons/material-symbols/school';
  import MedicalIcon from '~icons/material-symbols/medical-services';
  import ConstructionIcon from '~icons/material-symbols/construction';
  import AccountIcon from '~icons/material-symbols/account-circle';
  import XIcon from '~icons/material-symbols/close';
  import DocumentIcon from '~icons/material-symbols/description';
  import SaveIcon from '~icons/material-symbols/save';
  import * as Popover from '$/components/ui/popover';
  import { Button } from '$/components/ui/button';
  import { exportToZip } from '$lib/util/exportWorkspace';
  import ExportSelectionDialog from '$/components/Layout/ExportSelectionDialog.svelte';
  import DownloadIcon from '~icons/material-symbols/download';
  import { toast } from 'svelte-sonner';
  import type { Component } from 'svelte';
  import { cn } from '$/utils';

  let { isMobile = false } = $props();

  // Local UI state for popovers (Svelte 5 $state)
  let popoverOpen = $state<Record<string, boolean>>({});
  let isExportDialogOpen = $state(false);

  const iconMap: Record<string, Component> = {
    Account: AccountIcon,
    Bug: BugIcon,
    Check: CheckIcon,
    Cloud: CloudIcon,
    Construction: ConstructionIcon,
    Database: DatabaseIcon,
    Default: DocumentIcon,
    Heart: HeartIcon,
    History: HistoryIcon,
    Home: HomeIcon,
    Library: LibraryIcon,
    Lock: LockIcon,
    Medical: MedicalIcon,
    Process: ProcessIcon,
    Rocket: RocketIcon,
    School: SchoolIcon,
    Star: StarIcon,
    Terminal: TerminalIcon,
    Warning: WarningIcon,
    Work: WorkIcon
  };

  const iconOptions = Object.entries(iconMap).map(([name, icon]) => ({ name, icon }));

  function toggleExpand(path: string) {
    expansionStore[path] = !expansionStore[path];
  }

  /** Returns a default theme config based on current diagram dark mode */
  function getDiagramThemeFallback() {
    try {
      const currentConfig = JSON.parse($stateStore.mermaid);
      const isDark = currentConfig.theme === 'dark';
      return { theme: isDark ? 'dark' : 'default' };
    } catch {
      return { theme: 'default' };
    }
  }

  onMount(async () => {
    await loadSiteWorkspace();
  });

  async function loadFile(entry: FileEntry) {
    if (entry.kind !== 'file') return;
    try {
      const content = await readFile(entry.handle as FileSystemFileHandle);
      const { code, config } = unpackFileContent(content);
      const update: Record<string, any> = { code, pan: undefined, zoom: undefined };
      if (config) {
        update.mermaid = config;
      } else {
        // Fallback: set theme based on current diagram dark mode
        const currentTheme = getDiagramThemeFallback();
        update.mermaid = JSON.stringify(currentTheme, null, 2);
      }
      updateCodeStore(update);
      activeVirtualFileId.set(null); // Clear virtual state
    } catch (err) {
      console.error('Failed to read file', err);
      toast.error('Failed to read file. You might need to re-authorize the folder.');
    }
  }

  async function loadVirtualFile(fileId: string) {
    const file = siteFiles.find((f) => f.id === fileId);
    if (file) {
      activeVirtualFileId.set(file.id);
      activeFileHandle.set(null); // Clear local state
      const { code, config } = unpackFileContent(file.content);
      lastSavedCode.set(code);
      const update: Record<string, any> = { code, pan: undefined, zoom: undefined };
      if (config) {
        update.mermaid = config;
      } else {
        const currentTheme = getDiagramThemeFallback();
        update.mermaid = JSON.stringify(currentTheme, null, 2);
      }
      updateCodeStore(update);
    }
  }

  // Drag and Drop Logic
  let draggedItemId = $state<string | null>(null);
  let dragHoverItemId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, id: string) {
    draggedItemId = id;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    }
  }

  function handleDragOver(e: DragEvent, targetId: string) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (draggedItemId !== targetId) {
      dragHoverItemId = targetId;
    }
  }

  async function handleDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    const id = draggedItemId;
    draggedItemId = null;
    dragHoverItemId = null;

    if (!id || id === targetId) return;

    const targetItem = siteFiles.find((f) => f.id === targetId);
    if (targetItem && targetItem.isFolder) {
      // Move into folder
      await moveVirtualItem(id, targetId);
    } else {
      // Move to same level as target
      const targetParent = targetItem ? targetItem.parentPath : 'root';
      const order = targetItem ? targetItem.order : siteFiles.length;
      await moveVirtualItem(id, targetParent, order);
    }
  }

  function handleDragLeave() {
    dragHoverItemId = null;
  }

  async function handleRefresh() {
    await refreshDirectory();
    toast.success('Explorer refreshed');
  }

  // Virtual Site Tree Logic
  const siteTree = $derived.by(() => {
    const map: Record<string, any> = { root: { children: [] } };
    siteFiles.forEach((file) => {
      map[file.id] = { ...file, children: [] };
    });
    siteFiles.forEach((file) => {
      const parent = map[file.parentPath] || map['root'];
      parent.children.push(map[file.id]);
    });
    return map['root'].children;
  });

  async function handleManualSave() {
    const packed = packFileContent($stateStore.code, $stateStore.mermaid);
    const saved = await saveActiveFile(packed);
    if (saved) {
      toast.success('Saved to file');
    }
  }

  function stripExtension(name: string) {
    return name.replace(/\.(mmd|mermaid|txt|json|dia|md)$/i, '');
  }

  async function reauthorize(entry: FileEntry) {
    try {
      // @ts-expect-error - File System API types are experimental
      const permission = await entry.handle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        await refreshDirectory();
      }
    } catch (err) {
      console.error('Re-auth failed', err);
      const error = err as Error;
      if (
        error.name === 'NotFoundError' ||
        error.message.toLowerCase().includes('not found') ||
        error.message.toLowerCase().includes('inaccessible')
      ) {
        toast.error(`Folder "${entry.rootName}" not found. Removing from explorer.`);
        await removeRoot(entry.rootName);
      } else {
        toast.error(`Failed to gain permission for "${entry.rootName}": ${error.message}`);
      }
    }
  }
</script>

<div class="flex h-full w-full flex-col bg-card">
  <Resizable.PaneGroup direction="vertical">
    <!-- SITE FILES (CLOUD) -->
    <Resizable.Pane defaultSize={40} minSize={20}>
      <div class="flex h-full flex-col border-b">
        <div class="flex items-center justify-between border-b bg-muted/30 p-2">
          <div class="flex items-center gap-1.5 px-1">
            <CloudIcon class="size-4 text-primary" />
            <h3 class="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Cloud Workspace
            </h3>
          </div>
          <div class="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={() => createVirtualFolder('New Folder')}
              title="New Folder">
              <AddFolderIcon class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={() =>
                createVirtualFile('Untitled Diagram', 'flowchart TD\n  Start --> Stop')}
              title="New Diagram">
              <AddFileIcon class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={() => (isExportDialogOpen = true)}
              title="Export Cloud Workspace">
              <DownloadIcon class="size-3.5" />
            </Button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-1">
          {#if siteTree.length === 0}
            <div class="flex h-32 flex-col items-center justify-center p-4 text-center">
              <p class="text-[10px] text-muted-foreground italic">No cloud diagrams yet.</p>
            </div>
          {:else}
            <div class="flex flex-col gap-0.5">
              {#each siteTree as item (item.id)}
                {@render virtualItem(item, 0)}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </Resizable.Pane>

    <Resizable.Handle />

    <!-- PC FILES -->
    <Resizable.Pane defaultSize={60} minSize={20}>
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b bg-muted/30 p-2">
          <div class="flex items-center gap-1.5 px-1">
            <FolderIcon class="size-4 text-primary" />
            <h3 class="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              Your PC
            </h3>
          </div>
          <div class="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={handleRefresh}
              title="Refresh Explorer">
              <RefreshIcon class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={openDirectory}
              title="Open Folder">
              <AddFolderIcon class="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-6"
              onclick={openFiles}
              title="Open File(s)">
              <AddFileIcon class="size-3.5" />
            </Button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-1 text-card-foreground">
          {#if $fileList.length === 0}
            <div class="flex h-32 flex-col items-center justify-center gap-4 p-4 text-center">
              <div class="opacity-40">
                <FolderIcon class="mx-auto mb-2 size-8" />
                <p class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Not Linked
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-[10px] font-bold uppercase"
                onclick={openDirectory}>
                Open Folder
              </Button>
            </div>
          {:else}
            <div class="flex flex-col gap-0.5">
              {#each $fileList as entry (entry.path)}
                {@render fileItem(entry, 0)}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </Resizable.Pane>
  </Resizable.PaneGroup>

  <ExportSelectionDialog open={isExportDialogOpen} onOpenChange={(v) => (isExportDialogOpen = v)} />
</div>

{#snippet virtualItem(item: any, depth: number)}
  <div class="flex flex-col">
    <div
      role="treeitem"
      tabindex="0"
      aria-selected={$activeVirtualFileId === item.id}
      draggable="true"
      ondragstart={(e) => handleDragStart(e, item.id)}
      ondragover={(e) => handleDragOver(e, item.id)}
      ondrop={(e) => handleDrop(e, item.id)}
      ondragleave={handleDragLeave}
      class={cn(
        'group flex w-full items-center gap-2 rounded px-2 transition-colors hover:bg-muted/50',
        $activeVirtualFileId === item.id && 'bg-accent/15 ring-1 ring-accent/30',
        dragHoverItemId === item.id && 'bg-accent/30 outline-1 outline-accent outline-dashed'
      )}
      style="padding-left: {depth * 12 + 8}px">
      <button
        class="flex flex-1 items-center gap-2 overflow-hidden py-1.5"
        onclick={() => (item.isFolder ? toggleExpand(item.id) : loadVirtualFile(item.id))}>
        {#if item.isFolder}
          <span class="text-muted-foreground" class:rotate-90={expansionStore[item.id]}>
            <ChevronRight class="size-3.5" />
          </span>
          <FolderIcon class="size-3.5 shrink-0 text-primary opacity-80" />
        {:else}
          <div class="size-3.5 shrink-0" style="margin-left: 17.5px">
            <DocumentIcon class="size-3.5 text-primary opacity-60" />
          </div>
        {/if}
        <span class="truncate text-xs font-semibold">{item.name}</span>
      </button>

      {#if isMobile}
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="ghost" size="icon" class="size-7">
              <MoreIcon class="size-4" />
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-40 p-2" side="right" align="start">
            <div class="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                class="justify-start gap-2"
                onclick={() => {
                  const newName = prompt('New name:', item.name);
                  if (newName) {
                    item.name = newName;
                    updateVirtualItem(item);
                  }
                }}>
                <SettingsIcon class="size-4" />
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="justify-start gap-2 text-destructive hover:text-destructive"
                onclick={() => deleteVirtualItem(item.id)}>
                <XIcon class="size-4" />
                Delete
              </Button>
            </div>
          </Popover.Content>
        </Popover.Root>
      {:else}
        <div class="flex items-center opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            class="size-6"
            onclick={() => {
              const newName = prompt('New name:', item.name);
              if (newName) {
                item.name = newName;
                updateVirtualItem(item);
              }
            }}
            title="Rename">
            <SettingsIcon class="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="size-6 hover:text-destructive"
            onclick={() => deleteVirtualItem(item.id)}
            title="Delete">
            <XIcon class="size-3" />
          </Button>
        </div>
      {/if}
    </div>
    {#if item.isFolder && expansionStore[item.id] && item.children}
      <div class="flex flex-col">
        {#each item.children as child (child.id)}
          {@render virtualItem(child, depth + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet fileItem(entry: FileEntry, depth: number)}
  <div class="flex flex-col">
    {#if entry.kind === 'directory'}
      <div
        class={cn(
          'group flex w-full items-center gap-1 rounded px-2 transition-colors hover:bg-muted/50',
          isMobile ? 'py-2' : 'py-1'
        )}
        style="padding-left: {depth * 12 + 8}px">
        <button
          class="flex flex-1 items-center gap-1 overflow-hidden"
          onclick={() =>
            entry.name.includes('Click to re-authorize')
              ? reauthorize(entry)
              : toggleExpand(entry.path)}>
          <span
            class="text-muted-foreground transition-transform duration-200"
            class:rotate-90={expansionStore[entry.path]}>
            <ChevronRight class="size-4" />
          </span>
          <FolderIcon class="size-4 shrink-0 text-primary opacity-80" />
          <span class="truncate font-semibold">{entry.name}</span>
        </button>

        {#if depth === 0}
          <Button
            variant="ghost"
            size="icon"
            class={cn(
              'size-6 opacity-0 group-hover:opacity-100',
              (isMobile || entry.name.includes('re-authorize') || entry.name.includes('Error')) &&
                'opacity-100'
            )}
            onclick={(e) => {
              e.stopPropagation();
              removeRoot(entry.rootName);
            }}
            title="Close Folder">
            <XIcon class="size-3" />
          </Button>
        {/if}
      </div>
      {#if expansionStore[entry.path] && entry.children}
        <div class="flex flex-col">
          {#each entry.children as child (child.path)}
            {@render fileItem(child, depth + 1)}
          {/each}
        </div>
      {/if}
    {:else}
      <div
        class={cn(
          'group flex w-full items-center gap-2 rounded px-2 transition-colors hover:bg-muted/50',
          isMobile ? 'py-1.5' : 'py-0.5',
          $activeFileHandle === entry.handle && 'bg-accent/15 ring-1 ring-accent/30'
        )}
        style="padding-left: {depth * 12 + 24}px">
        <button class="flex min-w-0 flex-1 items-center gap-2" onclick={() => loadFile(entry)}>
          <div class="flex size-4 shrink-0 items-center justify-center">
            {#if fileMetadata[entry.path]?.icon}
              {@const IconComp =
                iconMap[fileMetadata[entry.path].icon ?? 'Default'] || DocumentIcon}
              <IconComp class="size-4 text-primary opacity-100" />
            {:else}
              <DocumentIcon class="size-4 text-primary opacity-60" />
            {/if}
          </div>
          <span class="truncate text-sm">{stripExtension(entry.name)}</span>
        </button>

        {#if entry.rootName === 'files'}
          <Button
            variant="ghost"
            size="icon"
            class={cn('size-6 opacity-0 group-hover:opacity-100', isMobile && 'opacity-100')}
            onclick={(e) => {
              e.stopPropagation();
              removeFile(entry.path);
            }}
            title="Remove File">
            <XIcon class="size-3" />
          </Button>
        {/if}

        <div
          class={cn(
            'flex items-center gap-0 opacity-0 group-hover:opacity-100',
            isMobile && 'opacity-100'
          )}>
          <Popover.Root
            open={popoverOpen[entry.path] || false}
            onOpenChange={(v) => (popoverOpen[entry.path] = v)}>
            <Popover.Trigger>
              <Button variant="ghost" size="icon" class="size-6">
                <SettingsIcon class="size-3" />
              </Button>
            </Popover.Trigger>
            <Popover.Content class="w-64 p-3" side="right" align="start">
              <div class="flex flex-col gap-3">
                <p
                  class="px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Select Icon
                </p>
                <div class="grid grid-cols-4 gap-2">
                  {#each iconOptions as opt (opt.name)}
                    <Button
                      variant="outline"
                      size="icon"
                      class={cn(
                        'size-12 border-2 transition-all hover:bg-accent hover:text-accent-foreground',
                        (fileMetadata[entry.path]?.icon === opt.name ||
                          (!fileMetadata[entry.path]?.icon && opt.name === 'Default')) &&
                          'border-primary bg-primary/5 shadow-inner'
                      )}
                      onclick={() => {
                        console.log(`User selected icon: ${opt.name} for ${entry.path}`);
                        fileMetadataStore.setIcon(entry.path, opt.name);
                        popoverOpen[entry.path] = false; // Close popover
                      }}
                      title={opt.name}>
                      <opt.icon class="size-6 shrink-0" />
                    </Button>
                  {/each}
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      </div>
    {/if}
  </div>
{/snippet}
