<script lang="ts">
  import * as Dialog from '$/components/ui/dialog';
  import { Button } from '$/components/ui/button';
  import { siteFiles } from '$lib/util/siteWorkspace.svelte';
  import { exportSpecificItems } from '$lib/util/exportWorkspace';
  import ChevronRight from '~icons/material-symbols/chevron-right';
  import FolderIcon from '~icons/material-symbols/folder-open';
  import DocumentIcon from '~icons/material-symbols/description';
  import DownloadIcon from '~icons/material-symbols/download';
  import { SvelteSet } from 'svelte/reactivity';
  import type { VirtualFile } from '$lib/util/idb';

  interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }

  let { open, onOpenChange }: Props = $props();

  let selectedIds = $state(new SvelteSet<string>());
  let expansionStore = $state<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    expansionStore[id] = !expansionStore[id];
  }

  interface TreeItem extends VirtualFile {
    children: TreeItem[];
  }

  const siteTree = $derived.by(() => {
    const map: Record<string, TreeItem> = {
      root: {
        children: [],
        content: '',
        id: 'root',
        isFolder: true,
        name: 'root',
        order: 0,
        parentPath: ''
      }
    };
    siteFiles.forEach((file) => {
      map[file.id] = { ...file, children: [] };
    });
    siteFiles.forEach((file) => {
      const parent = map[file.parentPath] || map['root'];
      parent.children.push(map[file.id]);
    });
    return map['root'].children;
  });

  function toggleSelect(id: string, isFolder: boolean) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
      if (isFolder) {
        // Unselect children
        const unselectChildren = (parentId: string) => {
          siteFiles
            .filter((f) => f.parentPath === parentId)
            .forEach((child) => {
              selectedIds.delete(child.id);
              if (child.isFolder) unselectChildren(child.id);
            });
        };
        unselectChildren(id);
      }
    } else {
      selectedIds.add(id);
      if (isFolder) {
        // Select children
        const selectChildren = (parentId: string) => {
          siteFiles
            .filter((f) => f.parentPath === parentId)
            .forEach((child) => {
              selectedIds.add(child.id);
              if (child.isFolder) selectChildren(child.id);
            });
        };
        selectChildren(id);
      }
    }
  }

  async function handleExport() {
    if (selectedIds.size === 0) return;
    await exportSpecificItems(siteFiles, Array.from(selectedIds));
    onOpenChange(false);
  }

  function selectAll() {
    siteFiles.forEach((f) => selectedIds.add(f.id));
  }

  function selectNone() {
    selectedIds.clear();
  }
</script>

<Dialog.Root {open} {onOpenChange}>
  <Dialog.Content class="flex max-h-[80vh] flex-col sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <DownloadIcon class="size-5 text-accent" />
        Export Cloud Workspace
      </Dialog.Title>
      <Dialog.Description>
        Select the files and folders you want to download as a ZIP file.
      </Dialog.Description>
    </Dialog.Header>

    <div class="my-2 flex-1 overflow-y-auto border-y py-4">
      <div class="flex flex-col gap-0.5">
        {#each siteTree as item (item.id)}
          {@render treeItem(item, 0)}
        {/each}
      </div>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <div class="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          class="text-[10px] font-bold uppercase"
          onclick={selectAll}>Select All</Button>
        <Button
          variant="ghost"
          size="sm"
          class="text-[10px] font-bold uppercase"
          onclick={selectNone}>Clear</Button>
      </div>
      <Button disabled={selectedIds.size === 0} onclick={handleExport} class="gap-2">
        <DownloadIcon class="size-4" />
        Download ZIP ({selectedIds.size})
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

{#snippet treeItem(item: TreeItem, depth: number)}
  <div class="flex flex-col">
    <div
      class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
      style="padding-left: {depth * 16 + 8}px">
      <input
        type="checkbox"
        checked={selectedIds.has(item.id)}
        onchange={() => toggleSelect(item.id, item.isFolder)}
        class="size-4 rounded-sm border-primary transition-all focus-visible:ring-2 focus-visible:ring-ring" />

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-1 items-center gap-2 overflow-hidden"
        onclick={() => (item.isFolder ? toggleExpand(item.id) : toggleSelect(item.id, false))}>
        {#if item.isFolder}
          <span
            class="text-muted-foreground transition-transform"
            class:rotate-90={expansionStore[item.id]}>
            <ChevronRight class="size-4" />
          </span>
          <FolderIcon class="size-4 shrink-0 text-accent opacity-80" />
        {:else}
          <div class="size-4 shrink-0" style="margin-left: 20px">
            <DocumentIcon class="size-4 text-accent opacity-60" />
          </div>
        {/if}
        <span class="truncate text-sm font-medium">{item.name}</span>
      </div>
    </div>

    {#if item.isFolder && expansionStore[item.id] && item.children}
      <div class="flex flex-col">
        {#each item.children as child (child.id)}
          {@render treeItem(child, depth + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
