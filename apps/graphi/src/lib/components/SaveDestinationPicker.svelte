<script lang="ts">
  import { base } from '$app/paths';
  import { get } from 'svelte/store';
  import { toast } from 'svelte-sonner';
  import CloudIcon from '~icons/material-symbols/cloud';
  import DatabaseIcon from '~icons/material-symbols/database';
  import FolderIcon from '~icons/material-symbols/folder-open';
  import { packFileContent } from '$/util/fileContent';
  import {
    activeCloudFileId,
    activeVirtualFileId,
    currentGraphName,
    isAuthModalOpen,
    lastSavedAt,
    lastSavedCode,
    saveFile,
    saveStatus
  } from '$/util/fileSystem';
  import { stateStore } from '$/util/state';
  import { createVirtualFile } from '$/util/siteWorkspace.svelte';

  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();

  const DIAGRAM_LABELS: Record<string, string> = {
    architecture: 'Architecture Diagram',
    classdiagram: 'Class Diagram',
    erdiagram: 'ER Diagram',
    flowchart: 'Flowchart',
    gantt: 'Gantt Chart',
    gitgraph: 'Git Graph',
    graph: 'Graph',
    mindmap: 'Mind Map',
    pie: 'Pie Chart',
    sequencediagram: 'Sequence Diagram',
    statediagram: 'State Diagram'
  };

  function deriveName(code: string): string {
    const firstLine = code.trim().split('\n')[0]?.toLowerCase().replace(/\s+/g, '') ?? '';
    for (const [key, label] of Object.entries(DIAGRAM_LABELS)) {
      if (firstLine.startsWith(key)) return label;
    }
    return 'Untitled Diagram';
  }

  async function saveToBrowser() {
    const { code, mermaid } = $stateStore;
    const name = deriveName(code);
    const packed = packFileContent(code, mermaid);
    saveStatus.set('saving');
    const file = await createVirtualFile(name, packed);
    activeVirtualFileId.set(file.id);
    activeCloudFileId.set(null);
    currentGraphName.set(file.name);
    lastSavedCode.set(code);
    lastSavedAt.set(new Date());
    saveStatus.set('success');
    setTimeout(() => {
      if (get(saveStatus) === 'success') saveStatus.set('saved');
    }, 2000);
    toast.success(`Saved to Browser · "${file.name}"`);
    onClose();
  }

  async function saveToCloud() {
    const userId = localStorage.getItem('graphi_user_id');
    if (!userId) {
      isAuthModalOpen.set(true);
      onClose();
      return;
    }
    const { code, mermaid } = $stateStore;
    const name = deriveName(code);
    const packed = packFileContent(code, mermaid);
    saveStatus.set('saving');
    try {
      const res = await fetch(`${base || ''}/api/graphs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: packed, name, user_id: userId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { id: string } = await res.json();
      activeCloudFileId.set(data.id);
      activeVirtualFileId.set(null);
      currentGraphName.set(name);
      lastSavedCode.set(code);
      lastSavedAt.set(new Date());
      saveStatus.set('success');
      setTimeout(() => {
        if (get(saveStatus) === 'success') saveStatus.set('saved');
      }, 2000);
      toast.success(`Saved to Cloud · "${name}"`);
      onClose();
    } catch {
      saveStatus.set('unsaved');
      toast.error('Failed to save to Cloud. Check your connection.');
    }
  }

  async function saveToDisk() {
    const packed = packFileContent($stateStore.code, $stateStore.mermaid);
    onClose();
    await saveFile(packed);
  }

  const isLoggedIn = !!localStorage.getItem('graphi_user_id');
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onClose()} />

<!-- Invisible backdrop to close on outside click -->
<div class="fixed inset-0 z-[199]" role="presentation" onclick={onClose}></div>

<!-- Picker panel -->
<div
  class="absolute top-full right-0 z-[200] mt-2 w-64 animate-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl duration-150 fade-in slide-in-from-top-2">
  <div class="border-b border-slate-100 px-4 py-3">
    <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Save where?</p>
  </div>
  <div class="flex flex-col gap-1 p-1.5">
    <button
      onclick={saveToBrowser}
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
      <DatabaseIcon class="size-4 shrink-0 text-emerald-600" />
      <div>
        <div class="text-sm font-semibold text-slate-800">Browser</div>
        <div class="text-[10px] text-slate-400">Stays in this browser, no account needed</div>
      </div>
    </button>
    <button
      onclick={saveToCloud}
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
      <CloudIcon class="size-4 shrink-0 text-blue-600" />
      <div>
        <div class="text-sm font-semibold text-slate-800">Cloud</div>
        <div class="text-[10px] text-slate-400">
          {isLoggedIn ? 'Sync across devices' : 'Sign in required'}
        </div>
      </div>
    </button>
    <button
      onclick={saveToDisk}
      class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50">
      <FolderIcon class="size-4 shrink-0 text-slate-500" />
      <div>
        <div class="text-sm font-semibold text-slate-800">Disk</div>
        <div class="text-[10px] text-slate-400">Save as .dia file on your computer</div>
      </div>
    </button>
  </div>
</div>
