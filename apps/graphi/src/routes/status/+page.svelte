<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import {
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    RefreshCw,
    Database,
    Globe,
    Cpu,
    LayoutGrid,
    Zap
  } from 'lucide-svelte';
  import { mode } from 'mode-watcher';

  // --- Types ---
  type CheckStatus = 'ok' | 'degraded' | 'error' | 'pending';

  interface Check {
    name: string;
    category: 'Storage' | 'Network' | 'Engine' | 'Browser';
    description: string;
    status: CheckStatus;
    message: string;
    latencyMs: number;
    hint?: string;
  }

  // --- Config ---
  const AUTO_REFRESH_SECONDS = 30;

  const STATUS_CFG = {
    ok: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      label: 'Operational',
      text: 'text-emerald-600'
    },
    degraded: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      dot: 'bg-amber-400',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      label: 'Degraded',
      text: 'text-amber-600'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      dot: 'bg-red-500',
      icon: XCircle,
      iconColor: 'text-red-500',
      label: 'Error',
      text: 'text-red-600'
    },
    pending: {
      bg: 'bg-slate-50',
      border: 'border-slate-100',
      dot: 'bg-slate-300 animate-pulse',
      icon: Loader2,
      iconColor: 'text-slate-400',
      label: 'Checking…',
      text: 'text-slate-400'
    }
  };

  const OVERALL_BANNERS = {
    ok: {
      bg: 'bg-emerald-600',
      text: 'Graphi Engine Operational',
      sub: 'All client-side components are running normally.'
    },
    degraded: {
      bg: 'bg-amber-500',
      text: 'Partial Degradation',
      sub: 'Some features may be limited. Check the details below.'
    },
    error: {
      bg: 'bg-red-600',
      text: 'System Outage Detected',
      sub: 'Critical client-side services are failing.'
    }
  };

  const CATEGORY_ICONS = {
    Storage: Database,
    Network: Globe,
    Engine: LayoutGrid,
    Browser: Cpu
  };

  // --- State ---
  let checks = $state<Check[]>([
    {
      category: 'Storage',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'LocalStorage',
      status: 'pending'
    },
    {
      category: 'Storage',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'IndexedDB',
      status: 'pending'
    },
    {
      category: 'Network',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'Internet Access',
      status: 'pending'
    },
    {
      category: 'Engine',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'Mermaid Load',
      status: 'pending'
    },
    {
      category: 'Browser',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'Web Workers',
      status: 'pending'
    },
    {
      category: 'Browser',
      description: '',
      latencyMs: 0,
      message: '',
      name: 'File System API',
      status: 'pending'
    }
  ]);

  let loading = $state(true);
  let checkedAt = $state<Date | null>(null);
  let countdown = $state(AUTO_REFRESH_SECONDS);
  let overall = $derived.by(() => {
    if (checks.some((c) => c.status === 'error')) return 'error';
    if (checks.some((c) => c.status === 'degraded')) return 'degraded';
    return 'ok';
  });

  // --- Check Logic ---
  async function runChecks() {
    loading = true;
    checkedAt = new Date();
    countdown = AUTO_REFRESH_SECONDS;

    // LocalStorage
    const startLS = Date.now();
    try {
      localStorage.setItem('__health_check', 'ok');
      localStorage.removeItem('__health_check');
      updateCheck('LocalStorage', 'ok', 'Writable & Accessible', Date.now() - startLS);
    } catch {
      updateCheck('LocalStorage', 'error', 'Blocked or Full', Date.now() - startLS);
    }

    // IndexedDB
    const startIDB = Date.now();
    try {
      const request = indexedDB.open('__health_check_db', 1);
      request.onsuccess = () => {
        updateCheck('IndexedDB', 'ok', 'Connected', Date.now() - startIDB);
        indexedDB.deleteDatabase('__health_check_db');
      };
      request.onerror = () =>
        updateCheck('IndexedDB', 'error', 'Connection failed', Date.now() - startIDB);
    } catch {
      updateCheck('IndexedDB', 'error', 'Not supported', Date.now() - startIDB);
    }

    // Network
    const startNet = Date.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
      updateCheck('Internet Access', 'ok', 'Online', Date.now() - startNet);
    } catch {
      updateCheck('Internet Access', 'degraded', 'Offline or CORS blocked', Date.now() - startNet);
    }

    // Mermaid
    const startMermaid = Date.now();
    // @ts-expect-error - mermaid is loaded globally
    if (window.mermaid) {
      updateCheck('Mermaid Load', 'ok', 'Initialized', Date.now() - startMermaid);
    } else {
      updateCheck('Mermaid Load', 'degraded', 'Not yet loaded', Date.now() - startMermaid);
    }

    // Web Workers
    updateCheck(
      'Web Workers',
      typeof Worker !== 'undefined' ? 'ok' : 'error',
      typeof Worker !== 'undefined' ? 'Supported' : 'Not supported',
      0
    );

    // File System API
    updateCheck(
      'File System API',
      'showOpenFilePicker' in window ? 'ok' : 'degraded',
      'showOpenFilePicker' in window ? 'Supported (Native)' : 'Legacy fallback only',
      0
    );

    loading = false;
  }

  function updateCheck(name: string, status: CheckStatus, message: string, latencyMs: number) {
    checks = checks.map((c) => (c.name === name ? { ...c, status, message, latencyMs } : c));
  }

  onMount(() => {
    runChecks();
    const interval = setInterval(() => {
      if (countdown > 0) {
        countdown--;
      } else {
        runChecks();
      }
    }, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="min-h-screen bg-[#FDFDFD] font-sans text-slate-900" class:dark={$mode === 'dark'}>
  <!-- Header -->
  <header
    class="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md">
    <div class="flex items-center gap-3">
      <img src="{base}/graphi_favicon.png" alt="Graphi" class="h-5 w-5 object-contain" />
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-black tracking-[0.2em] text-slate-900 uppercase">
          Engine Status
        </span>
        <span class="text-slate-200 select-none">·</span>
        <a
          href="{base}/"
          class="text-[10px] font-medium text-slate-400 transition-colors hover:text-indigo-600">
          ← Back to Graphi
        </a>
      </div>
    </div>
    <button
      on:click={runChecks}
      disabled={loading}
      class="flex h-8 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[10px] font-black tracking-[0.15em] text-white uppercase transition-colors hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-50">
      {#if loading}
        <Loader2 class="h-3 w-3 animate-spin" />
      {:else}
        <RefreshCw class="h-3 w-3" />
      {/if}
      {loading ? 'Running…' : 'Run Tests'}
    </button>
  </header>

  <main class="mx-auto max-w-4xl space-y-10 px-6 py-10">
    <!-- Overall status banner -->
    <div
      class="rounded-[28px] {loading && !checkedAt
        ? 'bg-slate-200'
        : OVERALL_BANNERS[overall].bg} p-8 text-white transition-colors duration-500">
      {#if loading && !checkedAt}
        <div class="space-y-3">
          <div class="h-6 w-64 animate-pulse rounded-full bg-slate-300" />
          <div class="h-4 w-48 animate-pulse rounded-full bg-slate-300 opacity-60" />
        </div>
      {:else}
        <div class="mb-2 flex items-center gap-3">
          <div class="h-3 w-3 rounded-full bg-white/80 {overall === 'ok' ? '' : 'animate-pulse'}" />
          <h1 class="text-xl font-black tracking-tight">{OVERALL_BANNERS[overall].text}</h1>
        </div>
        <p class="text-sm text-white/70">{OVERALL_BANNERS[overall].sub}</p>
        <div
          class="mt-4 flex items-center gap-4 text-[10px] font-bold tracking-widest text-white/50 uppercase">
          {#if checkedAt}
            <span>Last checked: {checkedAt.toLocaleTimeString()}</span>
          {/if}
          <span>·</span>
          {#if loading}
            <span class="flex items-center gap-1">
              <Loader2 class="h-3 w-3 animate-spin" /> Running…
            </span>
          {:else}
            <span>Next check in {countdown}s</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Per-category sections -->
    {#each ['Storage', 'Network', 'Engine', 'Browser'] as cat (cat)}
      {@const catChecks = checks.filter((c) => c.category === cat)}
      {@const Icon = CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}
      <section>
        <div class="mb-3 flex items-center gap-2">
          <Icon class="h-3.5 w-3.5 text-slate-400" />
          <h3 class="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
            {cat}
          </h3>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each catChecks as check (check.name)}
            {@const cfg = STATUS_CFG[check.status]}
            {@const CheckIcon = cfg.icon}
            <div class="rounded-2xl border {cfg.border} {cfg.bg} flex min-w-0 flex-col gap-2 p-5">
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2">
                  <CheckIcon
                    class="h-4 w-4 shrink-0 {cfg.iconColor} {check.status === 'pending'
                      ? 'animate-spin'
                      : ''}" />
                  <span
                    class="truncate text-[11px] font-black tracking-[0.15em] text-slate-800 uppercase">
                    {check.name}
                  </span>
                </div>
                {#if check.status !== 'pending' && check.latencyMs > 0}
                  <span class="shrink-0 text-[9px] font-bold text-slate-400 tabular-nums">
                    {check.latencyMs}ms
                  </span>
                {/if}
              </div>

              {#if check.status !== 'pending'}
                <p class="text-[11px] font-medium {cfg.text} leading-tight">{check.message}</p>
                {#if check.description}
                  <p class="mt-1 text-[10px] leading-snug text-slate-400">{check.description}</p>
                {/if}
              {:else}
                <div class="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}

    <!-- Footer -->
    <footer class="pb-6 text-center text-[10px] font-medium text-slate-300">
      <div class="flex items-center justify-center gap-1">
        <Zap class="h-3 w-3" />
        <span>
          Status checks run in your browser — results reflect your local environment's capabilities
          and connectivity.
        </span>
      </div>
    </footer>
  </main>
</div>
