<script lang="ts">
  import { Toaster } from '$/components/ui/sonner/index.js';
  import { loadingStateStore } from '$/util/loading';
  import { toggleDarkTheme } from '$/util/state';
  import { base } from '$app/paths';
  import { mode, ModeWatcher } from 'mode-watcher';
  import { onMount, type Snippet } from 'svelte';
  import { initAuthListener, checkAuth } from '$lib/stores/auth';
  import '../app.css';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  onMount(() => {
    initAuthListener();
    checkAuth();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`${base}/service-worker.js`, { scope: `${base}/` })
        .then(function (registration) {
          console.log('Registration successful, scope is:', registration.scope);
        })
        .catch(function (error) {
          console.log('Service worker registration failed, error:', error);
        });
    }
  });

  $effect(() => {
    toggleDarkTheme($mode === 'dark');
  });
</script>

<ModeWatcher defaultMode="light" />
<Toaster />

<main class="h-full w-full">
  {@render children()}
</main>

{#if $loadingStateStore.loading}
  <div
    class="absolute top-0 left-0 z-50 flex h-screen w-screen justify-center bg-gray-600 align-middle opacity-50">
    <div class="my-auto text-4xl font-bold text-indigo-100">
      <div class="loader mx-auto"></div>
      <div>{$loadingStateStore.message}</div>
    </div>
  </div>
{/if}

<style>
  .loader {
    border: 0.45em solid #f3f3f3;
    border-radius: 50%;
    border-top: 0.45em solid #6365f1;
    width: 3em;
    height: 3em;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
  }

  /* Safari */
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
