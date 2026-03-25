<script lang="ts">
  import type { PageData } from './$types';
  import { base } from '$app/paths';
  import { FileText, Clock, ChevronRight, BookOpen, Newspaper } from 'lucide-svelte';

  export let data: PageData;

  const categories = {
    docs: {
      label: 'Documentation',
      icon: BookOpen,
      color: 'text-primary bg-primary/10 border-primary/20'
    },
    changelogs: {
      label: 'Changelog',
      icon: Newspaper,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
    }
  };
</script>

<div class="min-h-screen bg-background pb-20">
  <!-- Hero Section -->
  <div class="relative mb-12 overflow-hidden border-b border-border bg-muted/30 py-20">
    <div
      class="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5">
    </div>
    <div
      class="absolute top-0 right-0 -z-10 h-96 w-96 translate-x-1/2 -translate-y-1/2 transform rounded-full bg-primary/5 blur-3xl">
    </div>

    <div class="container mx-auto max-w-5xl px-4 text-center">
      <div
        class="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary uppercase">
        <FileText class="h-3.5 w-3.5" />
        Resources & Guides
      </div>
      <h1 class="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">Knowledge Base</h1>
      <p class="mx-auto max-w-2xl text-xl text-muted-foreground">
        Everything you need to master Graphi. From setup guides to advanced Mermaid configurations.
      </p>
    </div>
  </div>

  <div class="container mx-auto max-w-5xl px-4">
    {#if data.docs.length > 0}
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        {#each data.docs as doc (doc.slug)}
          {@const cat = categories[doc.category as keyof typeof categories] || categories.docs}
          <a
            href="{base}/docs/{doc.slug}"
            class="group relative block overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-xl">
            <!-- Hover Gradient -->
            <div
              class="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100">
            </div>

            <div class="mb-6 flex items-start justify-between">
              <div
                class="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold {cat.color}">
                <svelte:component this={cat.icon} class="h-3.5 w-3.5" />
                {cat.label}
              </div>
              <div
                class="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                <Clock class="h-3.5 w-3.5" />
                {new Date(doc.date.trim()).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>

            <h2
              class="mb-3 pr-8 text-2xl leading-tight font-bold transition-colors group-hover:text-primary">
              {doc.title}
            </h2>

            <p class="mb-6 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              Explore the details and integration steps for this topic in our comprehensive guide.
            </p>

            <div class="flex items-center text-sm font-bold text-primary">
              Read Article <ChevronRight
                class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>

            <!-- Background Glow Decor -->
            <div
              class="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-colors group-hover:bg-primary/10">
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <div
        class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-muted/10 py-20 text-center">
        <div
          class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <BookOpen class="h-8 w-8" />
        </div>
        <h3 class="mb-2 text-xl font-bold">No documentation found</h3>
        <p class="mb-8 max-w-xs text-muted-foreground">
          The knowledge base is currently empty. Start by creating your first document in the CMS.
        </p>
        <a
          href="{base}/admin"
          class="flex items-center gap-2 font-bold text-primary hover:underline">
          Go to Admin Dashboard <ChevronRight class="h-4 w-4" />
        </a>
      </div>
    {/if}
  </div>
</div>
