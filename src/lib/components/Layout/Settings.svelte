<script lang="ts">
  import { toggleDarkTheme, updateCodeStore, stateStore } from '$/util/state';
  import { Switch } from '$/components/ui/switch';
  import { Label } from '$/components/ui/label';
  import { Button } from '$/components/ui/button';
  import { mode, setMode } from 'mode-watcher';
  import ThemeIcon from '~icons/material-symbols/dark-mode-rounded';
  import AppThemeIcon from '~icons/material-symbols/palette';
  import TrashIcon from '~icons/material-symbols/delete-forever';
  import ZapIcon from '~icons/material-symbols/bolt';
  import SyncIcon from '~icons/material-symbols/sync-rounded';
  import DrawIcon from '~icons/material-symbols/draw-rounded';
  import PanIcon from '~icons/material-symbols/pan-tool-rounded';

  let sync = $derived($stateStore.updateDiagram);
  // let autoSync = $derived($stateStore.autoSync);
  let rough = $derived($stateStore.rough);
  let panZoom = $derived($stateStore.panZoom);
  let currentTheme = $derived(JSON.parse($stateStore.mermaid).theme);
  let isDark = $derived(currentTheme === 'dark');
  let isAppDark = $derived($mode === 'dark');
  let performanceMode = $derived($stateStore.performanceMode);

  const toggleSync = () => {
    updateCodeStore({ updateDiagram: !sync });
  };
  // const toggleAutoSync = () => {
  //  updateCodeStore({ autoSync: !autoSync });
  // };

  const toggleRough = () => {
    updateCodeStore({ rough: !rough });
  };

  const togglePanZoom = () => {
    updateCodeStore({ panZoom: !panZoom });
  };

  const handleThemeChange = () => {
    toggleDarkTheme(!isDark);
  };

  const togglePerformance = () => {
    updateCodeStore({ performanceMode: !performanceMode });
  };

  const handleAppThemeChange = () => {
    setMode($mode === 'dark' ? 'light' : 'dark');
  };

  const handleClearData = async () => {
    if (
      !confirm(
        'This will clear ALL local data including your diagrams, themes, workspace files, and settings. This cannot be undone.\n\nAre you sure?'
      )
    ) {
      return;
    }
    try {
      // Clear all localStorage
      localStorage.clear();

      // Clear all IndexedDB databases
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }

      // Reload to reset everything
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear data:', e);
      // Force reload anyway
      localStorage.clear();
      window.location.reload();
    }
  };
</script>

<div class="flex flex-col gap-0 divide-y divide-border">
  <!-- Appearance Section -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-muted-foreground uppercase">
      Appearance
    </p>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <AppThemeIcon class="size-4 text-muted-foreground" />
          <Label for="app-theme-mode" class="cursor-pointer">App Theme</Label>
        </div>
        <Switch id="app-theme-mode" checked={isAppDark} onCheckedChange={handleAppThemeChange} />
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <ThemeIcon class="size-4 text-muted-foreground" />
          <Label for="theme-mode" class="cursor-pointer">Diagram Dark Mode</Label>
        </div>
        <Switch id="theme-mode" checked={isDark} onCheckedChange={handleThemeChange} />
      </div>
    </div>
  </div>

  <!-- Editor Section -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-muted-foreground uppercase">Editor</p>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <SyncIcon class="size-4 text-muted-foreground" />
          <Label for="auto-sync" class="cursor-pointer">Auto Sync</Label>
        </div>
        <Switch id="auto-sync" checked={sync} onCheckedChange={toggleSync} />
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <DrawIcon class="size-4 text-muted-foreground" />
          <Label for="rough-mode" class="cursor-pointer">Rough Mode</Label>
        </div>
        <Switch id="rough-mode" checked={rough} onCheckedChange={toggleRough} />
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-foreground">
          <PanIcon class="size-4 text-muted-foreground" />
          <Label for="pan-zoom" class="cursor-pointer">Pan & Zoom</Label>
        </div>
        <Switch id="pan-zoom" checked={panZoom} onCheckedChange={togglePanZoom} />
      </div>
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2 text-sm text-foreground">
            <ZapIcon class="size-4 text-amber-500" />
            <Label for="performance-mode" class="cursor-pointer">Performance Mode</Label>
          </div>
          <span class="ml-6 text-[10px] text-muted-foreground">Optimize for large diagrams</span>
        </div>
        <Switch
          id="performance-mode"
          checked={performanceMode}
          onCheckedChange={togglePerformance} />
      </div>
    </div>
  </div>

  <!-- Danger Zone -->
  <div class="px-4 py-3">
    <p class="mb-3 text-[9px] font-black tracking-widest text-destructive uppercase">Danger Zone</p>
    <p class="mb-3 text-[11px] text-muted-foreground">
      Permanently clears diagrams, themes, workspace files, and settings.
    </p>
    <Button
      variant="destructive"
      size="sm"
      onclick={handleClearData}
      class="w-full gap-2 rounded-none text-[10px] font-bold tracking-wider uppercase">
      <TrashIcon class="size-4" />
      Clear All Data
    </Button>
  </div>
</div>
