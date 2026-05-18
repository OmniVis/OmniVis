<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  // Props using Svelte 5 runes
  interface Props {
    isOpen: boolean;
    onComplete: () => void;
  }
  let { isOpen, onComplete }: Props = $props();

  type Screen = 'entry' | 'create-username' | 'save-key' | 'login-key' | 'success';
  let screen = $state<Screen>('entry');

  let username = $state('');
  let usernameError = $state('');
  let pastedKey = $state('');
  let pastedKeyError = $state('');
  let provisionalKey = $state('');
  let keyCopied = $state(false);
  let keySaved = $state(false);
  let isWorking = $state(false);
  let workError = $state('');

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  onMount(() => {
    provisionalKey = generateUUID();
  });

  const USERNAME_RE = /^[\w\s-]{2,30}$/;

  function validateUsername(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 2) return 'Username must be at least 2 characters';
    if (trimmed.length > 30) return 'Username must be 30 characters or fewer';
    if (!USERNAME_RE.test(trimmed)) return 'Only letters, numbers, spaces, _ and - are allowed';
    return '';
  }

  function handleCopyKey() {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(provisionalKey)
        .catch((e) => console.error('Failed to copy key', e));
    }
    keyCopied = true;
  }

  async function handleRegister() {
    const error = validateUsername(username);
    if (error) {
      usernameError = error;
      return;
    }
    usernameError = '';

    isWorking = true;
    workError = '';
    try {
      const res = await fetch(`${base || ''}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: provisionalKey, username: username.trim() })
      });

      if (res.ok) {
        localStorage.setItem('graphi_user_id', provisionalKey);
        localStorage.setItem('graphi_username', username.trim());
        screen = 'save-key';
      } else {
        const data = await res.json();
        workError = data.error || 'Registration failed';
      }
    } catch {
      workError = 'Network error — please try again';
    } finally {
      isWorking = false;
    }
  }

  async function handleLogin() {
    const trimmed = pastedKey.trim();
    if (!UUID_RE.test(trimmed)) {
      pastedKeyError = 'Please enter a valid key';
      return;
    }
    pastedKeyError = '';

    isWorking = true;
    workError = '';
    try {
      const res = await fetch(`${base || ''}/api/user?user_id=${trimmed}`);
      const data = await res.json();

      if (data.exists && data.username) {
        localStorage.setItem('graphi_user_id', trimmed);
        localStorage.setItem('graphi_username', data.username);
        onComplete();
      } else {
        pastedKeyError = 'Key not found or no account associated';
      }
    } catch {
      workError = 'Network error — please try again';
    } finally {
      isWorking = false;
    }
  }

  function handleFinish() {
    onComplete();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>

    <!-- Modal card -->
    <div
      class="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
      <!-- ENTRY SCREEN -->
      {#if screen === 'entry'}
        <div class="p-8">
          <h2 class="mb-1 text-center text-xl font-black">Welcome to Graphi</h2>
          <p class="mb-8 text-center text-sm text-slate-500">
            Create an account to save your graphs to the cloud, or continue locally.
          </p>
          <div class="space-y-3">
            <button
              onclick={() => (screen = 'create-username')}
              class="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600">
              Create an account
            </button>
            <button
              onclick={() => (screen = 'login-key')}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
              I already have a key
            </button>
            <button
              onclick={onComplete}
              class="w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">
              Use locally — no account
            </button>
          </div>
        </div>
      {/if}

      <!-- CREATE USERNAME SCREEN -->
      {#if screen === 'create-username'}
        <div class="p-8">
          <h2 class="mb-1 text-center text-xl font-black">Choose a username</h2>
          <p class="mb-6 text-center text-sm text-slate-500">
            This is how you'll appear in Graphi.
          </p>

          <div class="mb-4">
            <label class="mb-1.5 block text-xs font-bold tracking-widest text-slate-500 uppercase">
              Username
            </label>
            <input
              autoFocus
              bind:value={username}
              placeholder="e.g. alex_designs"
              maxLength={30}
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-300 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
            {#if usernameError}
              <p class="mt-1.5 text-xs font-medium text-red-500">{usernameError}</p>
            {/if}
          </div>

          {#if workError}
            <div
              class="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
              {workError}
            </div>
          {/if}

          <div class="flex gap-3">
            <button
              onclick={() => (screen = 'entry')}
              class="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50">
              Back
            </button>
            <button
              onclick={handleRegister}
              disabled={isWorking || !username.trim()}
              class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-wait disabled:opacity-50">
              {isWorking ? 'Working...' : 'Continue'}
            </button>
          </div>
        </div>
      {/if}

      <!-- SAVE KEY SCREEN -->
      {#if screen === 'save-key'}
        <div class="p-8">
          <h2 class="mb-1 text-center text-xl font-black">Save your key</h2>
          <p class="mb-6 text-center text-sm text-slate-500">
            This key is your account. Graphi cannot recover it.
          </p>

          <div class="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p class="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Your key
            </p>
            <p class="font-mono text-sm break-all text-slate-700 select-all">
              {provisionalKey}
            </p>
          </div>

          <div class="mb-6 space-y-3">
            <button
              onclick={handleCopyKey}
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
              {keyCopied ? 'Copied!' : 'Copy Key'}
            </button>
            <label class="flex cursor-pointer items-center gap-2">
              <input type="checkbox" bind:checked={keySaved} class="h-4 w-4" />
              <span class="text-xs text-slate-600">I have saved my key securely</span>
            </label>
          </div>

          <button
            onclick={handleFinish}
            disabled={!keySaved}
            class="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
            Finish
          </button>
        </div>
      {/if}

      <!-- LOGIN KEY SCREEN -->
      {#if screen === 'login-key'}
        <div class="p-8">
          <h2 class="mb-1 text-center text-xl font-black">Enter your key</h2>
          <p class="mb-6 text-center text-sm text-slate-500">
            Paste the key you saved when creating your account.
          </p>

          <div class="mb-4">
            <textarea
              autoFocus
              bind:value={pastedKey}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              rows={2}
              class="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 placeholder-slate-300 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            ></textarea>
            {#if pastedKeyError}
              <p class="mt-1.5 text-xs font-medium text-red-500">{pastedKeyError}</p>
            {/if}
          </div>

          {#if workError}
            <div
              class="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
              {workError}
            </div>
          {/if}

          <div class="flex gap-3">
            <button
              onclick={() => (screen = 'entry')}
              class="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50">
              Back
            </button>
            <button
              onclick={handleLogin}
              disabled={isWorking || !pastedKey.trim()}
              class="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
              {isWorking ? 'Checking...' : 'Log in'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
