<script lang="ts">
  import { Button } from '$/components/ui/button';
  import { cn } from '$/utils';
  import CodeIcon from '~icons/custom/code';
  import PreviewIcon from '~icons/material-symbols/preview';
  import FolderIcon from '~icons/material-symbols/folder-open-rounded';
  import TemplateIcon from '~icons/material-symbols/account-tree-outline-rounded';
  import SettingsIcon from '~icons/material-symbols/settings-outline-rounded';

  interface Props {
    activeView: string;
    onViewChange: (view: string) => void;
  }

  let { activeView, onViewChange }: Props = $props();

  const actions = [
    { id: 'code', icon: CodeIcon, label: 'Code' },
    { id: 'preview', icon: PreviewIcon, label: 'Preview' },
    { id: 'explorer', icon: FolderIcon, label: 'Files' },
    { id: 'templates', icon: TemplateIcon, label: 'Templates' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' }
  ];
</script>

<div class="pb-safe flex h-16 w-full items-center justify-around border-t bg-background px-2">
  {#each actions as action (action.id)}
    <Button
      variant="ghost"
      size="icon"
      class={cn(
        'flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-lg',
        activeView === action.id ? 'text-primary' : 'text-muted-foreground'
      )}
      onclick={() => onViewChange(action.id)}>
      <action.icon class="size-6" />
      <span class="text-[10px] font-medium">{action.label}</span>
    </Button>
  {/each}
</div>
