<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { PageData } from './$types';
  import { base } from '$app/paths';
  import { ChevronLeft, Calendar, User, Clock, Share2, Check } from 'lucide-svelte';

  export let data: PageData;
  const doc = data.doc;

  let copied = false;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
</script>

<div class="min-h-screen bg-background pb-20">
  <!-- Article Header -->
  <div class="mb-12 border-b border-border bg-muted/20 py-12">
    <div class="container mx-auto max-w-4xl px-4">
      <a
        href="{base}/docs"
        class="mb-8 inline-flex items-center gap-2 text-sm font-bold text-primary transition-all hover:gap-3">
        <ChevronLeft class="h-4 w-4" />
        Back to Knowledge Base
      </a>

      <h1 class="mb-6 text-4xl leading-tight font-extrabold tracking-tight md:text-6xl">
        {doc.frontmatter.title}
      </h1>

      <div
        class="flex flex-wrap items-center gap-6 border-t border-border/50 pt-6 text-sm text-muted-foreground">
        <div class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-primary" />
          <span
            >Published {new Date(doc.frontmatter.date.trim()).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
        </div>
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-primary" />
          <span>5 min read</span>
        </div>
        <div class="flex items-center gap-2">
          <User class="h-4 w-4 text-primary" />
          <span>Graphi Team</span>
        </div>
      </div>
    </div>
  </div>

  <div class="container mx-auto max-w-4xl px-4">
    <div class="grid grid-cols-1 gap-12 lg:grid-cols-4">
      <!-- Sidebar / Meta -->
      <div class="order-2 lg:order-1 lg:col-span-1">
        <div class="sticky top-24 space-y-8">
          <div>
            <h3 class="mb-4 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Share this guide
            </h3>
            <button
              on:click={handleCopyLink}
              class="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary {copied
                ? 'text-primary'
                : ''}">
              {#if copied}
                <Check class="h-4 w-4" /> Copied!
              {:else}
                <Share2 class="h-4 w-4" /> Copy Link
              {/if}
            </button>
          </div>

          <div
            class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-amber-900 dark:text-amber-100">
            <h4 class="mb-2 text-sm font-bold text-amber-600 dark:text-amber-400">💡 Fun Fact</h4>
            <p class="mb-0 text-xs leading-relaxed">
              Did you know? Graphi renders complex UML diagrams locally in your browser so none of
              your architecture secrets are ever sent to an external server.
            </p>
          </div>
        </div>
      </div>

      <article class="order-1 lg:order-2 lg:col-span-3">
        <div
          class="prose prose-slate dark:prose-invert prose-headings:font-extrabold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-lg prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-2xl max-w-none">
          {@html doc.html}
        </div>

        <!-- Footer Meta -->
        <div
          class="mt-16 flex items-center justify-between border-t border-border pt-8 text-sm text-muted-foreground">
          <p>Last edited on {new Date(doc.frontmatter.date.trim()).toLocaleDateString()}</p>
        </div>
      </article>
    </div>
  </div>
</div>
