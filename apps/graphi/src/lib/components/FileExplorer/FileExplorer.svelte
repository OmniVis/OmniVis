<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { base } from '$app/paths';
  import {
    activeFileHandle,
    activeVirtualFileId,
    activeCloudFileId,
    currentGraphName,
    isAuthModalOpen,
    lastSavedCode,
    lastSavedAt,
    saveStatus
  } from '$/util/fileSystem';
  import ConfirmDialog from '$/components/ConfirmDialog.svelte';
  import {
    siteFiles,
    loadSiteWorkspace,
    createVirtualFile,
    deleteVirtualItem,
    updateVirtualItem
  } from '$/util/siteWorkspace.svelte';
  import ThumbnailPreview from '$/components/ThumbnailPreview.svelte';
  import AuthModal from '$/components/AuthModal.svelte';
  import { stateStore, updateCodeStore } from '$/util/state';
  import { unpackFileContent, packFileContent } from '$/util/fileContent';
  import { toast } from 'svelte-sonner';

  // Icons
  import FolderIcon from '~icons/material-symbols/folder-open';
  import CloudIcon from '~icons/material-symbols/cloud';
  import DatabaseIcon from '~icons/material-symbols/database';
  import RefreshIcon from '~icons/material-symbols/refresh';
  import AddFileIcon from '~icons/material-symbols/note-add';
  import DeleteIcon from '~icons/material-symbols/delete';
  import PlayIcon from '~icons/material-symbols/play-arrow';
  import EditIcon from '~icons/material-symbols/edit';
  import UploadIcon from '~icons/material-symbols/upload';
  import CloseIcon from '~icons/material-symbols/close';
  import SaveIcon from '~icons/material-symbols/save';
  import DownloadIcon from '~icons/material-symbols/download';
  import UploadCloudIcon from '~icons/material-symbols/cloud-upload';

  let activeTab = $state<'pc' | 'browser' | 'cloud'>('browser');

  // Overwrite protection
  let pendingAction = $state<(() => Promise<void>) | null>(null);
  let showConfirm = $state(false);

  const isDirty = $derived(
    (!!$activeFileHandle || !!$activeVirtualFileId || !!$activeCloudFileId) &&
      $stateStore.code !== $lastSavedCode
  );

  function guardedLoad(action: () => Promise<void>) {
    if (isDirty) {
      pendingAction = action;
      showConfirm = true;
    } else {
      void action();
    }
  }

  // Auth state
  let userId = $state<string | null>(null);
  let username = $state<string | null>(null);

  // Cloud data
  let cloudEntries = $state<{ id: string; name: string | null; created_at: string }[]>([]);
  let cloudLoading = $state(false);

  onMount(async () => {
    await loadSiteWorkspace();
    userId = localStorage.getItem('graphi_user_id');
    username = localStorage.getItem('graphi_username');

    if (activeTab === 'cloud' && userId) {
      await fetchCloud();
    }
  });

  async function fetchCloud() {
    if (!userId) return;
    cloudLoading = true;
    try {
      const res = await fetch(`${base || ''}/api/graphs?user_id=${userId}`);
      cloudEntries = await res.json();
    } catch (err) {
      console.error('Failed to fetch cloud graphs:', err);
      toast.error('Failed to load cloud graphs');
    } finally {
      cloudLoading = false;
    }
  }

  async function handlePushToCloud(id: string, name: string | null) {
    if (!userId) {
      isAuthModalOpen.set(true);
      return;
    }
    try {
      saveStatus.set('saving');
      const packed = packFileContent($stateStore.code, $stateStore.mermaid);
      const res = await fetch(`${base || ''}/api/graphs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: packed, name, user_id: userId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawCode = $stateStore.code;
      lastSavedCode.set(rawCode);
      lastSavedAt.set(new Date());
      saveStatus.set('success');
      setTimeout(() => {
        if (get(saveStatus) === 'success') saveStatus.set('saved');
      }, 2000);
      toast.success(`Cloud updated · "${name || 'Untitled'}"`);
      await fetchCloud();
    } catch (err) {
      console.error('Failed to push to cloud:', err);
      toast.error('Failed to update cloud graph');
      saveStatus.set('unsaved');
    }
  }

  $effect(() => {
    if (activeTab === 'cloud' && userId && cloudEntries.length === 0) {
      fetchCloud();
    }
  });

  async function handleLoadVirtualFile(fileId: string) {
    const file = siteFiles.find((f) => f.id === fileId);
    if (file) {
      const { code, config } = unpackFileContent(file.content);
      updateCodeStore({
        code,
        mermaid: config || $stateStore.mermaid,
        pan: undefined,
        zoom: undefined
      });
      activeVirtualFileId.set(fileId);
      activeCloudFileId.set(null);
      currentGraphName.set(file.name);
      toast.success(`Loaded ${file.name}`);
    }
  }

  async function handleLoadCloudFile(id: string) {
    try {
      const res = await fetch(`${base || ''}/api/graphs/${id}`);
      const data = await res.json();
      if (data.code_content) {
        const { code, config } = unpackFileContent(data.code_content);
        updateCodeStore({
          code,
          mermaid: config || $stateStore.mermaid,
          pan: undefined,
          zoom: undefined
        });
        activeCloudFileId.set(id);
        activeVirtualFileId.set(null);
        currentGraphName.set(data.name || 'Untitled');
        toast.success('Loaded from cloud');
      }
    } catch (err) {
      console.error('Failed to load from cloud', err);
      toast.error('Failed to load from cloud');
    }
  }

  function handleAuthComplete() {
    isAuthModalOpen.set(false);
    userId = localStorage.getItem('graphi_user_id');
    username = localStorage.getItem('graphi_username');
    if (userId) {
      fetchCloud();
    }
  }

  // Import / Backup state & functions
  let isDragging = $state(false);
  let importedFile = $state<{ name: string; content: string } | null>(null);

  function downloadBackup() {
    try {
      const filename = `${$currentGraphName || 'diagram'}.dia`;
      const content = packFileContent($stateStore.code, $stateStore.mermaid);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully!');
    } catch (err) {
      console.error('Failed to download backup', err);
      toast.error('Failed to download backup');
    }
  }

  async function processSelectedFile(file: File) {
    try {
      // 1. Size check (max 512KB to match server limit)
      if (file.size > 512 * 1024) {
        toast.error('File too large (max 512KB)');
        return;
      }

      const content = await file.text();

      // 2. Basic XSS/HTML payload check
      const lowerContent = content.toLowerCase();
      if (
        lowerContent.includes('<script') ||
        lowerContent.includes('<html') ||
        lowerContent.includes('javascript:')
      ) {
        toast.error('Potentially malicious content detected');
        return;
      }

      importedFile = {
        name: file.name.replace(/\.[^/.]+$/, ''), // Strip extension
        content
      };
      toast.success(`Imported: ${file.name}`);
    } catch (err) {
      console.error('Failed to read file', err);
      toast.error('Failed to read file');
    }
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      void processSelectedFile(target.files[0]);
    }
  }

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void processSelectedFile(e.dataTransfer.files[0]);
    }
  }
</script>

<div class="flex h-full w-full flex-col border-r border-slate-200 bg-card">
  <!-- Header with Tabs -->
  <div class="flex shrink-0 border-b border-slate-200 bg-muted/30">
    <button
      onclick={() => (activeTab = 'browser')}
      class="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-black tracking-[0.15em] uppercase transition-colors {activeTab ===
      'browser'
        ? 'border-b-2 border-slate-900 text-slate-900'
        : 'text-slate-400 hover:text-slate-600'}">
      <DatabaseIcon class="size-3.5" />
      Browser
    </button>
    <button
      onclick={() => (activeTab = 'cloud')}
      class="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-black tracking-[0.15em] uppercase transition-colors {activeTab ===
      'cloud'
        ? 'border-b-2 border-slate-900 text-slate-900'
        : 'text-slate-400 hover:text-slate-600'}">
      <CloudIcon class="size-3.5" />
      Cloud
    </button>
    <button
      onclick={() => (activeTab = 'pc')}
      class="flex flex-1 items-center justify-center gap-2 py-3 text-[10px] font-black tracking-[0.15em] uppercase transition-colors {activeTab ===
      'pc'
        ? 'border-b-2 border-slate-900 text-slate-900'
        : 'text-slate-400 hover:text-slate-600'}">
      <FolderIcon class="size-3.5" />
      PC
    </button>
  </div>

  <!-- Content -->
  <div class="flex-1 space-y-4 overflow-y-auto p-4">
    <!-- BROWSER TAB -->
    {#if activeTab === 'browser'}
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-500 uppercase">Local Storage</h3>
        <button
          onclick={() => createVirtualFile('Untitled Diagram', 'flowchart TD\n  Start --> Stop')}
          class="p-1 text-slate-400 transition-colors hover:text-slate-900"
          title="New Diagram">
          <AddFileIcon class="size-4" />
        </button>
      </div>

      {#if siteFiles.length === 0}
        <div class="py-8 text-center text-xs text-slate-400">No diagrams saved in browser yet.</div>
      {:else}
        <div class="grid grid-cols-1 gap-3">
          {#each siteFiles as file (file.id)}
            <div
              class="overflow-hidden rounded-xl border transition-shadow hover:shadow-md {file.id ===
              $activeVirtualFileId
                ? 'border-blue-500 ring-2 ring-blue-500/10'
                : 'border-slate-200 bg-white'}">
              <ThumbnailPreview code={unpackFileContent(file.content).code} />
              <div class="flex items-center justify-between p-3">
                <span class="truncate text-sm font-medium">{file.name}</span>
                <div class="flex gap-1">
                  <button
                    onclick={() => guardedLoad(() => handleLoadVirtualFile(file.id))}
                    class="p-1 text-slate-400 transition-colors hover:text-blue-600"
                    title="Open">
                    <PlayIcon class="size-4" />
                  </button>
                  <button
                    onclick={async () => {
                      const newName = prompt('New name:', file.name);
                      if (newName) {
                        file.name = newName;
                        await updateVirtualItem(file);
                        if (file.id === $activeVirtualFileId) {
                          currentGraphName.set(newName);
                        }
                      }
                    }}
                    class="p-1 text-slate-400 transition-colors hover:text-slate-600"
                    title="Rename">
                    <EditIcon class="size-4" />
                  </button>
                  <button
                    onclick={async () => {
                      if (!userId) {
                        isAuthModalOpen.set(true);
                        return;
                      }
                      try {
                        const res = await fetch(`${base || ''}/api/graphs`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: file.content,
                            name: file.name,
                            user_id: userId
                          })
                        });
                        if (res.ok) {
                          toast.success('Saved to cloud!');
                          fetchCloud();
                        } else {
                          toast.error('Failed to save to cloud');
                        }
                      } catch {
                        toast.error('Failed to save to cloud');
                      }
                    }}
                    class="p-1 text-slate-400 transition-colors hover:text-slate-600"
                    title="Save to Cloud">
                    <CloudIcon class="size-4" />
                  </button>
                  <button
                    onclick={() => deleteVirtualItem(file.id)}
                    class="p-1 text-slate-400 transition-colors hover:text-red-600"
                    title="Delete">
                    <DeleteIcon class="size-4" />
                  </button>
                  <button
                    onclick={() => {
                      const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${file.name}.dia`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Downloaded!');
                    }}
                    class="p-1 text-slate-400 transition-colors hover:text-slate-600"
                    title="Download">
                    <DownloadIcon class="size-4" />
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- CLOUD TAB -->
    {#if activeTab === 'cloud'}
      {#if !userId}
        <div class="py-8 text-center">
          <CloudIcon class="mx-auto mb-2 size-8 text-slate-300" />
          <p class="mb-4 text-sm text-slate-600">Sign in to save graphs to the cloud.</p>
          <button
            onclick={() => isAuthModalOpen.set(true)}
            class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-600">
            Sign In
          </button>
        </div>
      {:else}
        <div class="mb-2 flex items-center justify-between">
          <div>
            <h3 class="text-xs font-bold text-slate-500 uppercase">Cloud Graphs</h3>
            <p class="text-[10px] text-slate-400">Signed in as {username}</p>
          </div>
          <button
            onclick={fetchCloud}
            class="p-1 text-slate-400 transition-colors hover:text-slate-900"
            title="Refresh">
            <RefreshIcon class="size-4" />
          </button>
        </div>

        {#if cloudLoading}
          <div class="py-8 text-center text-xs text-slate-400">Loading...</div>
        {:else if cloudEntries.length === 0}
          <div class="py-8 text-center text-xs text-slate-400">No cloud graphs yet.</div>
        {:else}
          <div class="grid grid-cols-1 gap-3">
            {#each cloudEntries as entry (entry.id)}
              <div
                class="overflow-hidden rounded-xl border transition-shadow hover:shadow-md {entry.id ===
                $activeCloudFileId
                  ? 'border-blue-500 ring-2 ring-blue-500/10'
                  : 'border-slate-200 bg-white'}">
                <div
                  class="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                  No Preview
                </div>
                <div class="flex items-center justify-between p-3">
                  <span class="truncate text-sm font-medium">{entry.name || 'Untitled'}</span>
                  <div class="flex items-center gap-1">
                    <button
                      onclick={() => guardedLoad(() => handleLoadCloudFile(entry.id))}
                      class="p-1 text-slate-400 transition-colors hover:text-blue-600"
                      title="Open">
                      <PlayIcon class="size-4" />
                    </button>
                    {#if entry.id === $activeCloudFileId}
                      <button
                        onclick={() => handlePushToCloud(entry.id, entry.name)}
                        class="p-1 text-slate-400 transition-colors hover:text-blue-600"
                        title="Push current editor content to cloud">
                        <UploadCloudIcon class="size-4" />
                      </button>
                    {/if}
                    <button
                      onclick={async () => {
                        try {
                          toast.info('Fetching file...');
                          const res = await fetch(`${base || ''}/api/graphs/${entry.id}`);
                          if (!res.ok) throw new Error('Failed to fetch');
                          const data = await res.json();
                          const blob = new Blob([data.code_content], {
                            type: 'text/plain;charset=utf-8'
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${entry.name || 'Untitled'}.dia`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Downloaded!');
                        } catch {
                          toast.error('Failed to download');
                        }
                      }}
                      class="p-1 text-slate-400 transition-colors hover:text-slate-600"
                      title="Download">
                      <DownloadIcon class="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    {/if}

    <!-- PC TAB -->
    {#if activeTab === 'pc'}
      <div class="space-y-4">
        <!-- 1. Backup Button Card -->
        <div class="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h4 class="text-xs font-bold text-slate-700">Backup Current Work</h4>
          <p class="mb-3 text-[10px] text-slate-500">
            Download the active diagram as a .dia file. You can restore it anytime later.
          </p>
          <button
            onclick={downloadBackup}
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-black tracking-wider text-white uppercase transition-all hover:bg-indigo-600 active:scale-[0.98]">
            <SaveIcon class="size-4" />
            Backup Current Work
          </button>
        </div>

        <!-- 2. Import Drag-and-Drop Area -->
        <div
          class="relative rounded-xl border-2 border-dashed p-6 text-center transition-all {isDragging
            ? 'border-indigo-500 bg-indigo-50/20'
            : 'border-slate-200 bg-white hover:border-slate-300'}"
          ondragover={(e) => {
            e.preventDefault();
            isDragging = true;
          }}
          ondragleave={() => {
            isDragging = false;
          }}
          ondrop={handleFileDrop}>
          <input
            type="file"
            accept=".dia,.mmd,.txt,.mermaid,.json"
            onchange={handleFileSelect}
            class="hidden"
            id="dia-file-upload" />
          <label for="dia-file-upload" class="flex cursor-pointer flex-col items-center gap-2">
            <UploadIcon class="size-8 text-slate-400" />
            <span class="text-xs font-semibold text-slate-700">Import Diagram File</span>
            <span class="text-[10px] leading-normal text-slate-400">
              Supports .dia, .mmd, .txt, .mermaid<br />Drag & drop or browse
            </span>
          </label>
        </div>

        <!-- 3. Choice Options for Selected/Dropped File -->
        {#if importedFile}
          <div
            class="animate-in space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm duration-200 fade-in">
            <div class="flex items-start justify-between">
              <div class="min-w-0">
                <div class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  Imported file
                </div>
                <h4 class="truncate text-sm font-bold text-slate-800">{importedFile.name}</h4>
                <p class="text-[10px] leading-snug text-slate-400">
                  {importedFile.content.split('\n').length} lines of Mermaid code
                </p>
              </div>
              <button
                onclick={() => (importedFile = null)}
                class="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                title="Clear">
                <CloseIcon class="size-4" />
              </button>
            </div>

            <div class="grid grid-cols-1 gap-2">
              <!-- Load directly -->
              <button
                onclick={() => {
                  const file = importedFile;
                  if (!file) return;
                  const { code, config } = unpackFileContent(file.content);
                  guardedLoad(async () => {
                    updateCodeStore({
                      code,
                      mermaid: config || $stateStore.mermaid,
                      pan: undefined,
                      zoom: undefined
                    });
                    toast.success('Loaded into editor!');
                    importedFile = null;
                  });
                }}
                class="flex items-center justify-start gap-3 rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                <PlayIcon class="size-4 shrink-0 text-indigo-600" />
                <div>
                  <div>Load directly</div>
                  <div class="text-[10px] font-normal text-slate-400">
                    Open in the editor without saving first
                  </div>
                </div>
              </button>

              <!-- Save to Browser -->
              <button
                onclick={async () => {
                  const file = importedFile;
                  if (!file) return;
                  const newFile = await createVirtualFile(file.name, file.content);
                  const { code, config } = unpackFileContent(file.content);
                  guardedLoad(async () => {
                    updateCodeStore({
                      code,
                      mermaid: config || $stateStore.mermaid,
                      pan: undefined,
                      zoom: undefined
                    });
                    activeVirtualFileId.set(newFile.id);
                    activeCloudFileId.set(null);
                    currentGraphName.set(newFile.name);
                    toast.success('Saved to browser & loaded!');
                    activeTab = 'browser';
                    importedFile = null;
                  });
                }}
                class="flex items-center justify-start gap-3 rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                <DatabaseIcon class="size-4 shrink-0 text-emerald-600" />
                <div>
                  <div>Save to Browser (Local)</div>
                  <div class="text-[10px] font-normal text-slate-400">
                    Save to your local browser database
                  </div>
                </div>
              </button>

              <!-- Save to Cloud -->
              <button
                onclick={async () => {
                  const file = importedFile;
                  if (!file) return;
                  if (!userId) {
                    isAuthModalOpen.set(true);
                    return;
                  }
                  try {
                    const res = await fetch(`${base || ''}/api/graphs`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        code: file.content,
                        name: file.name,
                        user_id: userId
                      })
                    });

                    if (res.ok) {
                      const data = await res.json();
                      toast.success('Saved to cloud!');
                      fetchCloud();
                      const { code, config } = unpackFileContent(file.content);
                      guardedLoad(async () => {
                        updateCodeStore({
                          code,
                          mermaid: config || $stateStore.mermaid,
                          pan: undefined,
                          zoom: undefined
                        });
                        activeCloudFileId.set(data.id);
                        activeVirtualFileId.set(null);
                        currentGraphName.set(file.name);
                        activeTab = 'cloud';
                        importedFile = null;
                      });
                    } else {
                      toast.error('Failed to save to cloud');
                    }
                  } catch (err) {
                    console.error('Failed to save to cloud', err);
                    toast.error('Failed to save to cloud');
                  }
                }}
                class="flex items-center justify-start gap-3 rounded-lg border border-slate-200 p-2.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
                <CloudIcon class="size-4 shrink-0 text-blue-600" />
                <div>
                  <div>Save to Cloud</div>
                  <div class="text-[10px] font-normal text-slate-400">
                    {#if userId}
                      Save to your cloud account
                    {:else}
                      Sign in to save to your cloud account
                    {/if}
                  </div>
                </div>
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<AuthModal isOpen={$isAuthModalOpen} onComplete={handleAuthComplete} />

<ConfirmDialog
  isOpen={showConfirm}
  title="Unsaved changes"
  message="You have unsaved changes. Opening this graph will discard them."
  confirmLabel="Discard & open"
  cancelLabel="Keep editing"
  onConfirm={async () => {
    showConfirm = false;
    if (pendingAction) {
      await pendingAction();
      pendingAction = null;
    }
  }}
  onCancel={() => {
    showConfirm = false;
    pendingAction = null;
  }} />
