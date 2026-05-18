<script lang="ts">
  import { updateCodeStore, stateStore } from '$/util/state';
  import { Switch } from '$/components/ui/switch';
  import { Label } from '$/components/ui/label';
  import {
    getAutoSaveEnabled,
    setAutoSaveEnabled,
    getAutoSaveInterval,
    setAutoSaveInterval
  } from '$/util/historyStore';
  import DrawIcon from '~icons/material-symbols/draw-rounded';
  import PanIcon from '~icons/material-symbols/pan-tool-rounded';
  import GridIcon from '~icons/material-symbols/grid-4x4';
  import SaveIcon from '~icons/material-symbols/save-rounded';
  import TrashIcon from '~icons/material-symbols/delete-forever';
  import InfoIcon from '~icons/material-symbols/info-rounded';
  import { version } from 'mermaid/package.json';

  let rough = $derived($stateStore.rough);
  let panZoom = $derived($stateStore.panZoom);
  let grid = $derived($stateStore.grid ?? true);

  let autoSaveEnabled = $state(getAutoSaveEnabled());
  let autoSaveSeconds = $state(Math.round(getAutoSaveInterval() / 1000));

  let showClearConfirm = $state(false);

  function formatInterval(seconds: number): string {
    if (seconds < 60) return `Every ${seconds} second${seconds === 1 ? '' : 's'}`;
    const mins = Math.round(seconds / 60);
    return `Every ${mins} minute${mins === 1 ? '' : 's'}`;
  }

  function handleAutoSaveToggle(checked: boolean) {
    autoSaveEnabled = checked;
    setAutoSaveEnabled(checked);
  }

  function handleIntervalChange(e: Event) {
    const seconds = parseInt((e.target as HTMLInputElement).value, 10);
    autoSaveSeconds = seconds;
    setAutoSaveInterval(seconds * 1000);
  }

  async function handleClearData() {
    showClearConfirm = false;
    try {
      localStorage.clear();
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
      window.location.reload();
    } catch {
      localStorage.clear();
      window.location.reload();
    }
  }
</script>

<div class="flex flex-col divide-y divide-border">
  <!-- Editor Section -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-muted-foreground uppercase">Editor</p>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <DrawIcon class="size-4 text-muted-foreground" />
          <Label for="rough-mode" class="cursor-pointer">Rough (Hand-Drawn)</Label>
        </div>
        <Switch
          id="rough-mode"
          checked={rough}
          onCheckedChange={(v) => updateCodeStore({ rough: v })} />
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <PanIcon class="size-4 text-muted-foreground" />
          <Label for="pan-zoom" class="cursor-pointer">Pan &amp; Zoom</Label>
        </div>
        <Switch
          id="pan-zoom"
          checked={panZoom}
          onCheckedChange={(v) => updateCodeStore({ panZoom: v })} />
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <GridIcon class="size-4 text-muted-foreground" />
          <Label for="grid-toggle" class="cursor-pointer">Background Grid</Label>
        </div>
        <Switch
          id="grid-toggle"
          checked={grid}
          onCheckedChange={(v) => updateCodeStore({ grid: v })} />
      </div>
    </div>
  </div>

  <!-- Auto Save Section -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-muted-foreground uppercase">
      Auto Save
    </p>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <SaveIcon class="size-4 text-muted-foreground" />
          <Label for="autosave-toggle" class="cursor-pointer">Auto Save</Label>
        </div>
        <Switch
          id="autosave-toggle"
          checked={autoSaveEnabled}
          onCheckedChange={handleAutoSaveToggle} />
      </div>

      {#if autoSaveEnabled}
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">{formatInterval(autoSaveSeconds)}</span>
            <span class="text-[10px] text-muted-foreground">{autoSaveSeconds}s</span>
          </div>
          <input
            type="range"
            min="5"
            max="300"
            step="5"
            value={autoSaveSeconds}
            oninput={handleIntervalChange}
            class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-900" />
          <div class="flex justify-between text-[9px] text-muted-foreground">
            <span>5s</span>
            <span>5 min</span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- About Section -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-muted-foreground uppercase">About</p>
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <InfoIcon class="size-4" />
      <span>Mermaid</span>
      <span class="font-mono text-xs">v{version}</span>
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-destructive uppercase">Danger Zone</p>

    {#if !showClearConfirm}
      <p class="mb-3 text-[11px] text-muted-foreground">
        Permanently clears all diagrams, history, workspace files, and settings.
      </p>
      <button
        onclick={() => (showClearConfirm = true)}
        class="flex w-full items-center justify-center gap-2 rounded-none border border-destructive/40 px-3 py-2 text-[10px] font-bold tracking-wider text-destructive uppercase transition-colors hover:bg-destructive/5">
        <TrashIcon class="size-4" />
        Clear All Data
      </button>
    {:else}
      <p class="mb-3 text-[11px] font-medium text-destructive">
        This cannot be undone. Are you sure?
      </p>
      <div class="flex gap-2">
        <button
          onclick={() => (showClearConfirm = false)}
          class="flex-1 rounded-none border border-slate-200 px-3 py-2 text-[10px] font-bold tracking-wider text-slate-600 uppercase transition-colors hover:bg-slate-50">
          Cancel
        </button>
        <button
          onclick={handleClearData}
          class="flex-1 rounded-none border border-destructive bg-destructive px-3 py-2 text-[10px] font-bold tracking-wider text-white uppercase transition-colors hover:bg-destructive/90">
          Yes, Clear All
        </button>
      </div>
    {/if}
  </div>
</div>
