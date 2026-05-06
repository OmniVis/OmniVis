<script lang="ts">
  import { cn } from '$/utils';
  import FolderIcon from '~icons/material-symbols/folder-open';
  import ExportIcon from '~icons/material-symbols/download';
  import TemplateIcon from '~icons/material-symbols/grid-view';
  import SettingsIcon from '~icons/material-symbols/settings';
  import HistoryIcon from '~icons/material-symbols/history';
  import PaletteIcon from '~icons/material-symbols/palette';
  import KeyboardIcon from '~icons/material-symbols/keyboard-outline';
  import AIIcon from '~icons/material-symbols/auto-awesome';

  interface Props {
    activeView: string;
    onViewChange: (view: string) => void;
    showAISidebar?: boolean;
    onAIToggle?: () => void;
  }

  let { activeView, onViewChange, showAISidebar = false, onAIToggle }: Props = $props();

  const primaryActions = [
    { id: 'explorer', icon: FolderIcon, label: 'Explorer' },
    { id: 'history', icon: HistoryIcon, label: 'History' },
    { id: 'templates', icon: TemplateIcon, label: 'Templates' },
    { id: 'themes', icon: PaletteIcon, label: 'Themes' },
    { id: 'export', icon: ExportIcon, label: 'Export' }
  ];

  const secondaryActions = [
    { id: 'shortcuts', icon: KeyboardIcon, label: 'Keyboard Shortcuts' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' }
  ];
</script>

<aside
  class="theme-transition z-40 flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-border bg-surface py-4">
  <div class="flex flex-col items-center gap-3">
    {#each primaryActions as action (action.id)}
      <button
        class={cn(
          'rounded-none p-2 transition-all',
          activeView === action.id
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'w-full text-muted-foreground hover:bg-muted/50 hover:text-primary'
        )}
        onclick={() => onViewChange(activeView === action.id ? '' : action.id)}
        title={action.label}>
        <action.icon class="mx-auto h-5 w-5" />
      </button>
    {/each}

    <!-- Divider -->
    <div class="my-1 h-px w-8 bg-border"></div>

    <!-- AI Assistant toggle -->
    <button
      class={cn(
        'rounded-none p-2 transition-all',
        showAISidebar
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'w-full text-muted-foreground hover:bg-muted/50 hover:text-primary'
      )}
      onclick={onAIToggle}
      title="AI Assistant">
      <AIIcon class="mx-auto h-5 w-5" />
    </button>
  </div>

  <div class="mt-auto flex flex-col items-center gap-3">
    {#each secondaryActions as action (action.id)}
      <button
        class={cn(
          'rounded-none p-2 transition-all',
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
