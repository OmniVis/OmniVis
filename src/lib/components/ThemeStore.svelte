<script lang="ts">
  import {
    builtInThemes,
    customThemes,
    activeThemeId,
    setActiveTheme,
    addCustomTheme,
    removeCustomTheme,
    applyThemeToConfig
  } from '$/util/themeStore';
  import { stateStore, updateCodeStore } from '$/util/state';
  import type { DiagramTheme } from '$/util/themeStore';
  import { Button } from '$/components/ui/button';
  import { toast } from 'svelte-sonner';
  import TrashIcon from '~icons/material-symbols/delete-outline';
  import CheckIcon from '~icons/material-symbols/check';
  import PaletteIcon from '~icons/material-symbols/palette';
  import HelpIcon from '~icons/material-symbols/info-outline';
  import ResetIcon from '~icons/material-symbols/restart-alt';
  import * as Popover from '$/components/ui/popover';
  import { mode } from 'mode-watcher';

  const themes = $derived([...builtInThemes, ...$customThemes]);
  let showAddForm = $state(false);
  let activeCategory = $state<'light' | 'dark' | 'custom'>('light');

  // New theme form
  let newName = $state('');
  let newDescription = $state('');
  let newPrimaryColor = $state('#6366f1');
  let newBgColor = $state('#ffffff');
  let newLineColor = $state('#333333');

  function selectTheme(id: string) {
    setActiveTheme(id);
    const theme = themes.find((t) => t.id === id);
    if (theme) {
      const currentConfig = $stateStore.mermaid;
      const newConfig = applyThemeToConfig(currentConfig, theme);
      updateCodeStore({ mermaid: newConfig });
    }
  }

  function deleteTheme(id: string) {
    if (confirm('Delete this theme?')) {
      removeCustomTheme(id);
      toast.info('Theme removed');
    }
  }

  function handleAddTheme() {
    if (!newName.trim()) return;

    addCustomTheme({
      name: newName,
      description: newDescription || 'Custom theme',
      type: 'light', // Default, maybe add toggle later
      mermaidThemeVariables: {
        theme: 'base',
        primaryColor: newPrimaryColor,
        primaryTextColor: '#ffffff',
        primaryBorderColor: newPrimaryColor,
        lineColor: newLineColor,
        secondaryColor: newBgColor,
        tertiaryColor: newBgColor
      }
    });

    toast.success(`Theme "${newName}" created!`);
    newName = '';
    newDescription = '';
    showAddForm = false;
    activeCategory = 'custom';
  }

  function resetTheme() {
    const isDark = $mode === 'dark';
    const targetId = isDark ? 'dark' : 'default';

    setActiveTheme(targetId);
    updateCodeStore({
      mermaid: JSON.stringify({ theme: isDark ? 'dark' : 'default' }, null, 2)
    });

    toast.success('Theme reset to default');
  }

  // Helpers for extracting colors for the preview
  function getColors(theme: DiagramTheme) {
    const vars = theme.mermaidThemeVariables || {};
    return {
      primary: vars.primaryColor || '#666',
      text: vars.primaryTextColor || (theme.type === 'dark' ? '#fff' : '#333'),
      line: vars.lineColor || '#999',
      bg: vars.secondaryColor || (theme.type === 'dark' ? '#1f2937' : '#fff')
    };
  }

  // Filter themes based on tab
  const filteredThemes = $derived(
    themes.filter((t) => {
      if (activeCategory === 'custom') return !t.isBuiltIn;
      return t.isBuiltIn && t.type === activeCategory;
    })
  );
</script>

<div class="flex h-full flex-col bg-background/50">
  <div class="flex items-center justify-between border-b p-4">
    <div class="flex items-center gap-2 font-bold tracking-tight">
      <PaletteIcon class="text-primary" />
      Themes
    </div>
    <div class="flex items-center gap-1">
      <Button size="sm" variant="ghost" onclick={resetTheme} title="Reset to default">
        <ResetIcon class="mr-1 size-4" /> Reset
      </Button>
      <Button size="sm" variant="ghost" onclick={() => (showAddForm = !showAddForm)}>
        {showAddForm ? 'Cancel' : '+ Create'}
      </Button>
    </div>
  </div>

  {#if showAddForm}
    <div class="animate-in space-y-3 border-b bg-muted/30 p-4 slide-in-from-top-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">New Theme</h4>
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="ghost" size="icon" class="size-5">
              <HelpIcon class="size-3.5" />
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-64 space-y-2 p-3 text-xs">
            <p><strong>Primary:</strong> Applies to the main elements (nodes, actors, etc.)</p>
            <p>
              <strong>Background:</strong> Changes the background color of notes and secondary elements.
            </p>
            <p><strong>Lines:</strong> Colors the arrows, links, and borders of the diagram.</p>
          </Popover.Content>
        </Popover.Root>
      </div>
      <input
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        type="text"
        placeholder="Theme Name"
        bind:value={newName} />
      <div class="flex justify-between gap-4">
        <label class="flex flex-col items-center gap-1 text-xs">
          <span>Primary</span>
          <input
            type="color"
            bind:value={newPrimaryColor}
            class="h-6 w-12 cursor-pointer rounded border-none p-0" />
        </label>
        <label class="flex flex-col items-center gap-1 text-xs">
          <span>Background</span>
          <input
            type="color"
            bind:value={newBgColor}
            class="h-6 w-12 cursor-pointer rounded border-none p-0" />
        </label>
        <label class="flex flex-col items-center gap-1 text-xs">
          <span>Lines</span>
          <input
            type="color"
            bind:value={newLineColor}
            class="h-6 w-12 cursor-pointer rounded border-none p-0" />
        </label>
      </div>
      <Button size="sm" onclick={handleAddTheme} disabled={!newName.trim()} class="w-full">
        Save Theme
      </Button>
    </div>
  {/if}

  <!-- Tabs -->
  <div class="px-4 pt-4 pb-2">
    <div class="flex space-x-1 rounded-lg bg-muted p-1">
      <button
        class="flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-all {activeCategory ===
        'light'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/50'}"
        onclick={() => (activeCategory = 'light')}>
        Light
      </button>
      <button
        class="flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-all {activeCategory ===
        'dark'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/50'}"
        onclick={() => (activeCategory = 'dark')}>
        Dark
      </button>
      <button
        class="flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-all {activeCategory ===
        'custom'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/50'}"
        onclick={() => (activeCategory = 'custom')}>
        My Themes
      </button>
    </div>
  </div>

  <div class="grid flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-4">
    {#each filteredThemes as theme (theme.id)}
      {@const colors = getColors(theme)}
      <button
        class="group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 text-left text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
        class:ring-2={$activeThemeId === theme.id}
        class:ring-primary={$activeThemeId === theme.id}
        onclick={() => selectTheme(theme.id)}>
        <!-- Swatch Preview -->
        <div
          class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border shadow-inner"
          style:background={colors.bg}>
          <!-- Abstract Mini Diagram -->
          <div class="absolute top-2 left-2 h-3 w-3 rounded-full" style:background={colors.primary}>
          </div>
          <div class="absolute right-2 bottom-2 h-1 w-8" style:background={colors.line}></div>
          <div class="absolute top-2 right-2 text-[10px] font-bold" style:color={colors.text}>
            Aa
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <span class="truncate text-sm font-semibold">{theme.name}</span>
            {#if $activeThemeId === theme.id}
              <CheckIcon class="size-4 text-primary" />
            {/if}
          </div>

          <span class="line-clamp-1 text-xs text-muted-foreground">{theme.description}</span>

          <!-- Color Palette Dots -->
          <div class="mt-2 flex items-center gap-1.5">
            <div class="flex flex-col items-center gap-0.5" title="Primary Color">
              <div class="h-3 w-3 rounded-full border shadow-sm" style:background={colors.primary}>
              </div>
            </div>
            <div class="flex flex-col items-center gap-0.5" title="Text Color">
              <div class="h-3 w-3 rounded-full border shadow-sm" style:background={colors.text}>
              </div>
            </div>
            <div class="flex flex-col items-center gap-0.5" title="Line Color">
              <div class="h-3 w-3 rounded-full border shadow-sm" style:background={colors.line}>
              </div>
            </div>
          </div>
        </div>

        {#if !theme.isBuiltIn}
          <div
            role="button"
            tabindex="0"
            class="absolute top-2 right-2 rounded-full p-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                deleteTheme(theme.id);
              }
            }}
            onclick={(e) => {
              e.stopPropagation();
              deleteTheme(theme.id);
            }}
            title="Delete theme">
            <TrashIcon class="size-4" />
          </div>
        {/if}
      </button>
    {/each}

    {#if filteredThemes.length === 0}
      <div class="py-8 text-center text-sm text-muted-foreground">
        No themes found in this category.
      </div>
    {/if}
  </div>
</div>
