<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<div class="mx-auto max-w-4xl py-8">
  <div class="mb-12 text-center">
    <div
      class="shadow-glow-primary mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
      <i class="fas fa-layer-group text-4xl text-primary"></i>
    </div>
    <h1 class="mb-4 text-4xl font-bold">Welcome to Graphi CMS</h1>
    <p class="mx-auto max-w-2xl text-lg text-muted-foreground">
      Your premium, database-free content management system powered directly by your GitHub
      repository.
    </p>
  </div>

  <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
    <!-- Content Card -->
    <button
      class="group flex h-full flex-col rounded-2xl border border-border bg-card p-8 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-lg"
      on:click={() => goto('/admin/docs')}
      aria-label="Manage Content">
      <div
        class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
        <i class="fas fa-file-alt text-2xl text-primary"></i>
      </div>
      <h2 class="mb-3 text-2xl font-bold transition-colors group-hover:text-primary">
        Manage Content
      </h2>
      <p class="flex-grow leading-relaxed text-muted-foreground">
        Write documentation, tutorials, and changelogs using our custom Markdown editor. Changes are
        instantly committed to GitHub and deployed.
      </p>
      <div class="mt-6 flex items-center text-sm font-medium text-primary">
        Get Started <i
          class="fas fa-arrow-right ml-2 transition-transform group-hover:translate-x-1"></i>
      </div>
    </button>

    <!-- Access Control Card -->
    <button
      class="group flex h-full flex-col rounded-2xl border border-border bg-card p-8 text-left shadow-sm transition-all hover:border-purple-500/50 hover:shadow-lg"
      on:click={() => goto('/admin/users')}
      aria-label="Access Control">
      <div
        class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 transition-transform group-hover:scale-110">
        <i class="fas fa-users-cog text-2xl text-purple-500"></i>
      </div>
      <h2 class="mb-3 text-2xl font-bold transition-colors group-hover:text-purple-400">
        Access Control
      </h2>
      <p class="flex-grow leading-relaxed text-muted-foreground">
        Determine who has authorization to log in and use this CMS. Add or remove trusted GitHub
        accounts seamlessly.
      </p>
      <div class="mt-6 flex items-center text-sm font-medium text-purple-500">
        Manage Users <i
          class="fas fa-arrow-right ml-2 transition-transform group-hover:translate-x-1"></i>
      </div>
    </button>
  </div>
</div>
