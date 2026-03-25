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

<div class="flex flex-col gap-6 p-4">
  <div class="space-y-4">
    <h3 class="text-sm font-medium tracking-wider text-muted-foreground uppercase">Appearance</h3>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <AppThemeIcon class="size-4" />
        <Label for="app-theme-mode">App Theme</Label>
      </div>
      <Switch id="app-theme-mode" checked={isAppDark} onCheckedChange={handleAppThemeChange} />
    </div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <ThemeIcon class="size-4" />
        <Label for="theme-mode">Diagram Dark Mode</Label>
      </div>
      <Switch id="theme-mode" checked={isDark} onCheckedChange={handleThemeChange} />
    </div>
  </div>

  <div class="space-y-4">
    <h3 class="text-sm font-medium tracking-wider text-muted-foreground uppercase">Editor</h3>
    <div class="flex items-center justify-between">
      <Label for="auto-sync">Auto Sync</Label>
      <Switch id="auto-sync" checked={sync} onCheckedChange={toggleSync} />
    </div>
    <div class="flex items-center justify-between">
      <Label for="rough-mode">Rough Mode</Label>
      <Switch id="rough-mode" checked={rough} onCheckedChange={toggleRough} />
    </div>
    <div class="flex items-center justify-between">
      <Label for="pan-zoom">Pan & Zoom</Label>
      <Switch id="pan-zoom" checked={panZoom} onCheckedChange={togglePanZoom} />
    </div>
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-0.5">
        <Label for="performance-mode" class="flex items-center gap-1.5">
          <ZapIcon class="size-3.5 text-amber-500" />
          Performance Mode
        </Label>
        <span class="text-[10px] text-muted-foreground">Optimize for large diagrams</span>
      </div>
      <Switch id="performance-mode" checked={performanceMode} onCheckedChange={togglePerformance} />
    </div>
  </div>

  <div class="space-y-4 border-t pt-4">
    <h3 class="text-sm font-medium tracking-wider text-destructive uppercase">Danger Zone</h3>
    <div class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">
        Clear all local data including diagrams, themes, workspace files, folders, and settings.
      </p>
      <Button variant="destructive" size="sm" onclick={handleClearData} class="gap-2">
        <TrashIcon class="size-4" />
        Clear All Data
      </Button>
    </div>
  </div>
</div>
