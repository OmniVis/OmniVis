<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { Home } from 'lucide-svelte';
  import {
    isAuthenticated,
    isCheckingAuth,
    authUser,
    login,
    logout as storeLogout,
    initAuthListener
  } from '$lib/stores/auth';
  import * as DropdownMenu from '$/components/ui/dropdown-menu';
  import { Github, LogOut, ChevronDown } from 'lucide-svelte';

  let authError = '';

  onMount(() => {
    // We already run initAuthListener globally, but we can capture errors locally if we want.
    // The global listener in +layout.svelte handles state perfectly so we just show errors here if present.
    // The callback sets local auth error if validation fails in this tab.
    initAuthListener(
      (err) => {
        authError = err;
      },
      () => {
        authError = '';
        window.history.replaceState({}, document.title, '/admin');
      }
    );
  });

  function handleLogin() {
    login();
  }

  function handleLogout() {
    storeLogout();
    goto('/admin');
  }
</script>

<svelte:head>
  <title>Graphi CMS</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background font-sans text-foreground">
  <!-- Header -->
  <header class="sticky top-0 z-30 border-b border-border bg-card/50 backdrop-blur-sm">
    <div class="container mx-auto flex h-16 items-center justify-between px-4">
      <div class="flex items-center gap-3">
        <a
          href="{base}/"
          class="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
          <Home class="h-5 w-5" />
        </a>
        <div class="h-6 w-px bg-border"></div>
        <img src="/graphi-logo.png" alt="Graphi Logo" class="h-8 w-8 rounded" />
        <h1
          class="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-xl font-bold text-transparent">
          Graphi CMS
        </h1>
      </div>

      {#if $isAuthenticated}
        <div class="flex items-center gap-4">
          <nav class="hidden gap-1 md:flex">
            <a
              href="/admin"
              class="rounded-md px-3 py-2 text-sm font-medium {$page.url.pathname === '/admin'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}">Dashboard</a>
            <a
              href="/admin/docs"
              class="rounded-md px-3 py-2 text-sm font-medium {$page.url.pathname.includes(
                '/admin/docs'
              )
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}">Content</a>
            <a
              href="/admin/users"
              class="rounded-md px-3 py-2 text-sm font-medium {$page.url.pathname.includes(
                '/admin/users'
              )
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}">Access</a>
          </nav>
          <div class="mx-2 h-6 w-px bg-border"></div>
          {#if $authUser}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                {#snippet child({ props })}
                  <button
                    {...props}
                    class="flex items-center gap-2 rounded-full border border-border p-1 pr-3 transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/20 focus:outline-none">
                    <img src={$authUser.avatar_url} alt="Profile" class="h-8 w-8 rounded-full" />
                    <span class="text-sm font-medium">{$authUser.login}</span>
                    <ChevronDown class="h-4 w-4 text-muted-foreground" />
                  </button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-56">
                <DropdownMenu.Label class="font-normal">
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm leading-none font-medium">{$authUser.login}</p>
                    <p class="text-xs leading-none text-muted-foreground">GitHub Account</p>
                  </div>
                </DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onclick={() => window.open($authUser.html_url, '_blank')}>
                  <Github class="mr-2 h-4 w-4" /> Go to Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onclick={handleLogout}
                  class="text-destructive focus:text-destructive">
                  <LogOut class="mr-2 h-4 w-4" /> Log out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {:else}
            <!-- Fallback loading state -->
            <div class="flex items-center gap-2 rounded-full border border-border p-1 pr-3">
              <div class="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
              <div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="container mx-auto flex-grow p-4 md:p-8">
    {#if $isCheckingAuth}
      <div class="flex h-[60vh] items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <i class="fas fa-circle-notch fa-spin text-4xl text-primary"></i>
          <p class="animate-pulse text-muted-foreground">Authenticating with GitHub...</p>
        </div>
      </div>
    {:else if !$isAuthenticated}
      <div class="flex h-[60vh] items-center justify-center">
        <div
          class="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-8 shadow-xl">
          <div class="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5">
          </div>

          <div class="mb-8 text-center">
            <div
              class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <i class="fab fa-github text-3xl text-primary"></i>
            </div>
            <h2 class="mb-2 text-2xl font-bold">Editor Login</h2>
            <p class="text-sm text-muted-foreground">
              Access to the Graphi CMS requires an authorized GitHub account.
            </p>
          </div>

          {#if authError}
            <div
              class="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              {authError}
            </div>
          {/if}

          <button
            class="flex w-full items-center justify-center gap-3 rounded-lg bg-[#24292e] px-4 py-3 font-medium text-white shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-all hover:bg-[#2f363d] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
            on:click={handleLogin}>
            <i class="fab fa-github text-lg"></i>
            Authorize with GitHub
          </button>

          <div class="mt-6 text-center text-xs text-muted-foreground">
            <p>Powered by the GitHub API. No external databases.</p>
          </div>
        </div>
      </div>
    {:else}
      <!-- Render authenticated pages -->
      <slot />
    {/if}
  </main>
</div>
