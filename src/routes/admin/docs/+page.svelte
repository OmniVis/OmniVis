<script lang="ts">
  import { onMount } from 'svelte';
  import { getDirectoryContents, deleteFile } from '$lib/github/api';
  import { goto } from '$app/navigation';

  const DOCS_PATH = 'src/content/docs';

  interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
  }

  let files: GitHubFile[] = [];
  let isLoading = true;
  let error = '';

  onMount(async () => {
    try {
      const contents = await getDirectoryContents(DOCS_PATH);
      // Filter only markdown files
      files = contents
        .filter((f: GitHubFile) => f.name && f.name.endsWith('.md'))
        .sort((a, b) => b.name.localeCompare(a.name)); // Newest first via date in filename
    } catch (e) {
      error = 'Failed to load documents from GitHub.';
      console.error(e);
    } finally {
      isLoading = false;
    }
  });

  function createNew() {
    // Just route to a non-existent slug to trigger create mode
    goto('/admin/docs/new-document');
  }

  async function handleDelete(file: GitHubFile) {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${file.name}? This will commit a deletion to the repository.`
      )
    ) {
      return;
    }

    try {
      await deleteFile(file.path, `chore(cms): delete ${file.name}`, file.sha);
      // Refresh list
      files = files.filter((f) => f.sha !== file.sha);
    } catch (e) {
      alert('Failed to delete file. Check console.');
      console.error(e);
    }
  }
</script>

<div class="mx-auto max-w-5xl">
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="mb-2 text-3xl font-bold">Documentation</h1>
      <p class="text-muted-foreground">
        Manage your markdown documentation files directly on GitHub.
      </p>
    </div>
    <button
      class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      on:click={createNew}>
      <i class="fas fa-plus"></i> New Document
    </button>
  </div>

  {#if error}
    <div
      class="mb-6 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
      <i class="fas fa-exclamation-triangle"></i>
      {error}
    </div>
  {/if}

  <div class="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    {#if isLoading}
      <div class="flex justify-center p-12 text-muted-foreground">
        <i class="fas fa-circle-notch fa-spin text-3xl"></i>
      </div>
    {:else if files.length === 0}
      <div class="flex flex-col items-center p-12 text-center text-muted-foreground">
        <i class="fas fa-folder-open mb-4 text-4xl opacity-50"></i>
        <p>No documents found in `src/content/docs`.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 divide-y divide-border">
        <!-- Header row -->
        <div
          class="grid grid-cols-12 gap-4 bg-muted/30 p-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <div class="col-span-8">Filename</div>
          <div class="col-span-2 text-right">Size</div>
          <div class="col-span-2 text-right">Actions</div>
        </div>

        <!-- Data rows -->
        {#each files as file (file.sha)}
          <div
            class="group grid grid-cols-12 items-center gap-4 p-4 transition-colors hover:bg-muted/20">
            <div class="col-span-8 flex items-center gap-3">
              <i class="fab fa-markdown text-xl text-primary/70"></i>
              <a
                href="/admin/docs/{file.name.replace('.md', '')}?sha={file.sha}"
                class="font-medium text-foreground transition-colors hover:text-primary focus:underline focus:outline-none">
                {file.name}
              </a>
            </div>
            <div class="col-span-2 text-right text-sm text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </div>
            <div
              class="col-span-2 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <a
                href="/admin/docs/{file.name.replace('.md', '')}?sha={file.sha}"
                aria-label="Edit {file.name}"
                class="rounded border border-border bg-background p-2 text-muted-foreground shadow-sm transition-colors hover:text-primary"
                title="Edit">
                <i class="fas fa-pen"></i>
              </a>
              <button
                class="rounded border border-transparent p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete {file.name}"
                on:click={() => handleDelete(file)}
                title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
