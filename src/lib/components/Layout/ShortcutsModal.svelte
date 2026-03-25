<script lang="ts">
  import * as Dialog from '$/components/ui/dialog';
  import { Button } from '$/components/ui/button';
  import KeyboardIcon from '~icons/material-symbols/keyboard-outline';

  let { isOpen = $bindable(false) } = $props();

  const shortcuts = [
    { key: 'Ctrl + S', description: 'Manual Save' },
    { key: 'Ctrl + P', description: 'Command Palette' },
    { key: 'Ctrl + F', description: 'Find / Replace' },
    { key: 'Enter', description: 'Apply Changes' },
    { key: 'Space + Drag', description: 'Pan Diagram' },
    { key: 'Ctrl + Scroll', description: 'Zoom Diagram' }
  ];
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <KeyboardIcon class="size-5" />
        Keyboard Shortcuts
      </Dialog.Title>
      <Dialog.Description>Common keyboard shortcuts for the Graphi Editor.</Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="space-y-3">
        {#each shortcuts as shortcut}
          <div
            class="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
            <span class="text-sm font-medium text-foreground">{shortcut.description}</span>
            <kbd
              class="pointer-events-none inline-flex h-6 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 select-none">
              {shortcut.key}
            </kbd>
          </div>
        {/each}
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="secondary" onclick={() => (isOpen = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
