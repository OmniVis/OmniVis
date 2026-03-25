<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getFileContent, commitFile } from '$lib/github/api';
  import matter from 'gray-matter';

  let title = '';
  let category = 'docs';
  let contentBody = '';

  let originalSha = '';
  let originalPath = '';

  let isLoading = true;
  let isSaving = false;
  let error = '';

  const slug = $page.params.slug;
  const isNew = slug === 'new-document';

  onMount(async () => {
    if (!isNew) {
      originalPath = `src/content/docs/${slug}.md`;

      // Get SHA from URL query if we came from list view
      const urlSha = $page.url.searchParams.get('sha');
      if (urlSha) originalSha = urlSha;

      try {
        const { content: rawFileContent, sha } = await getFileContent(originalPath);
        originalSha = sha;

        // Parse frontmatter
        const parsed = matter(rawFileContent);
        contentBody = parsed.content || '';
        title = parsed.data.title || slug.replace(/-/g, ' ');
        category = parsed.data.category || 'docs';
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        error = `Failed to load document: ${errorMsg}. Check if path is correct and token has permissions.`;
        console.error(e);
      }
    }
    isLoading = false;
  });

  async function handleSave() {
    if (!title.trim()) {
      error = 'Title is required';
      return;
    }

    isSaving = true;
    error = '';

    try {
      // Reconstruct markdown with frontmatter
      const dateStr = new Date().toISOString().split('T')[0];
      const frontmatterObj = {
        title,
        category,
        date: dateStr
      };

      const rawOutput = matter.stringify(contentBody, frontmatterObj);

      // Determine filename (use existing path if editing, generate new if creating)
      let targetPath = originalPath;
      let commitMessage = `content: update ${title}`;

      if (isNew) {
        // Generate safe slug from title
        const newSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        targetPath = `src/content/docs/${dateStr}-${newSlug}.md`;
        commitMessage = `content: create ${title}`;
      }

      await commitFile(targetPath, rawOutput, commitMessage, isNew ? undefined : originalSha);

      // Success! Return to list
      goto('/admin/docs');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save to GitHub';
      console.error(e);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="mx-auto max-w-5xl pb-24">
  <div class="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div class="flex items-center gap-3">
      <a
        href="/admin/docs"
        aria-label="Back to documents"
        class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
        <i class="fas fa-arrow-left"></i>
      </a>
      <h1 class="text-2xl font-bold">{isNew ? 'Create Document' : 'Edit Document'}</h1>
      {#if !isNew && !isLoading}
        <span
          class="bg-glow-primary rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >{slug}.md</span>
      {/if}
    </div>

    <div class="flex items-center gap-3">
      <button
        class="rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
        on:click={() => goto('/admin/docs')}
        disabled={isSaving}>
        Cancel
      </button>
      <button
        class="flex items-center gap-2 rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20"
        on:click={handleSave}
        disabled={isLoading || isSaving}>
        {#if isSaving}
          <i class="fas fa-spinner fa-spin"></i> Committing to Git...
        {:else}
          <i class="fas fa-cloud-upload-alt"></i> Save & Publish
        {/if}
      </button>
    </div>
  </div>

  {#if error}
    <div
      class="mb-6 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
      <i class="fas fa-exclamation-triangle"></i>
      {error}
    </div>
  {/if}

  {#if isLoading}
    <div class="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
      <i class="fas fa-circle-notch fa-spin text-4xl text-primary"></i>
    </div>
  {:else}
    <!-- Editor Layout -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <!-- Main Editor Area -->
      <div class="space-y-6 lg:col-span-3">
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <label for="title" class="mb-2 block text-sm font-medium text-muted-foreground"
            >Document Title</label>
          <input
            id="title"
            type="text"
            bind:value={title}
            placeholder="e.g., Getting Started with Graphi"
            class="w-full border-b-2 border-border bg-transparent px-0 py-2 text-2xl font-bold transition-colors outline-none placeholder:font-normal placeholder:text-muted/50 focus:border-primary" />
        </div>

        <div
          class="flex flex-col rounded-xl border border-border bg-card shadow-sm"
          style="height: calc(100vh - 350px); min-height: 500px;">
          <div
            class="flex items-center gap-2 border-b border-border bg-muted/20 p-3 text-sm text-muted-foreground">
            <i class="fab fa-markdown"></i> Markdown Content
            <span class="ml-auto text-xs opacity-60"
              >Supports standard GitHub Flavored Markdown</span>
          </div>
          <textarea
            bind:value={contentBody}
            placeholder="Write your document content here using Markdown..."
            class="w-full flex-1 resize-none bg-transparent p-6 font-mono text-sm leading-relaxed outline-none"
          ></textarea>
        </div>
      </div>

      <!-- Settings Sidebar -->
      <div class="space-y-6 lg:col-span-1">
        <!-- Document Meta -->
        <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 class="mb-4 flex items-center gap-2 border-b border-border pb-2 font-semibold">
            <i class="fas fa-sliders-h text-muted-foreground"></i> Metadata
          </h3>

          <div class="space-y-4">
            <div>
              <label for="category" class="mb-1 block text-sm font-medium text-muted-foreground"
                >Category</label>
              <select
                id="category"
                bind:value={category}
                class="w-full rounded-md border border-border bg-background px-3 py-2 transition-shadow outline-none focus:ring-2 focus:ring-primary/50">
                <option value="docs">Documentation</option>
                <option value="changelogs">Changelog</option>
              </select>
            </div>

            {#if !isNew}
              <div class="mt-4 border-t border-border pt-4">
                <p class="mb-1 text-xs text-muted-foreground">Git SHA</p>
                <p class="truncate font-mono text-xs text-foreground" title={originalSha}>
                  {originalSha.substring(0, 10)}...
                </p>
              </div>
            {/if}
          </div>
        </div>

        <!-- Info Card -->
        <div class="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <i class="fas fa-info-circle"></i> Direct to Git
          </h4>
          <p class="text-xs leading-relaxed text-muted-foreground">
            When you click Save, this interface uses your GitHub authorization to instantly create a
            commit on the <code>main</code> branch. GitHub actions will automatically rebuild the site
            immediately after.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
