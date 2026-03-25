<script lang="ts">
  import { Button } from '$/components/ui/button';
  import { cn } from '$/utils';
  import FolderIcon from '~icons/material-symbols/folder-open';
  import ExportIcon from '~icons/material-symbols/download';
  import TemplateIcon from '~icons/material-symbols/grid-view';
  import SettingsIcon from '~icons/material-symbols/settings';
  import InfoIcon from '~icons/material-symbols/info-outline';
  import HistoryIcon from '~icons/material-symbols/history';
  import PaletteIcon from '~icons/material-symbols/palette';
  import KeyboardIcon from '~icons/material-symbols/keyboard-outline';

  interface Props {
    activeView: string;
    onViewChange: (view: string) => void;
  }

  let { activeView, onViewChange }: Props = $props();

  const primaryActions = [
    { id: 'explorer', icon: FolderIcon, label: 'Explorer' },
    { id: 'history', icon: HistoryIcon, label: 'History' },
    { id: 'templates', icon: TemplateIcon, label: 'Templates' },
    { id: 'themes', icon: PaletteIcon, label: 'Themes' },
    { id: 'export', icon: ExportIcon, label: 'Export' }
  ];

  const secondaryActions = [
    { id: 'shortcuts', icon: KeyboardIcon, label: 'Keyboard Shortcuts' },
    { id: 'credits', icon: InfoIcon, label: 'Credits' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' }
  ];
</script>

<aside
  class="theme-transition z-40 flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-border bg-background py-4">
  <div class="flex flex-col items-center gap-3">
    {#each primaryActions as action (action.id)}
      <button
        class={cn(
          'rounded-lg p-2 transition-all',
          activeView === action.id
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'w-full text-muted-foreground hover:bg-muted/50 hover:text-primary'
        )}
        onclick={() => onViewChange(activeView === action.id ? '' : action.id)}
        title={action.label}>
        <action.icon class="mx-auto h-5 w-5" />
      </button>
    {/each}
  </div>

  <div class="mt-auto flex flex-col items-center gap-3">
    {#each secondaryActions as action (action.id)}
      <button
        class={cn(
          'rounded-lg p-2 transition-all',
          activeView === action.id
            ? 'w-full bg-primary/10 text-primary shadow-sm'
            : 'w-full text-muted-foreground hover:bg-muted/50 hover:text-primary'
        )}
        onclick={() => onViewChange(activeView === action.id ? '' : action.id)}
        title={action.label}>
        <action.icon class="mx-auto h-5 w-5" />
      </button>
    {/each}
  </div>
</aside>
