<script>
  import * as Dialog from '$/components/ui/dialog';
  import ShareIcon from '~icons/material-symbols/share';
  import CopyInput from './CopyInput.svelte';
</script>

<Dialog.Root>
  <Dialog.Trigger
    class="flex items-center gap-1.5 border border-slate-200 px-2.5 py-1 text-xs font-semibold tracking-wider text-slate-700 uppercase transition-all hover:bg-slate-50 active:scale-[0.97]"
    title="Share">
    <ShareIcon class="size-3.5" />
    <span class="hidden sm:inline">Share</span>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-xl">
        <ShareIcon class="size-5" /> Shareable links
      </Dialog.Title>
      <Dialog.Description>Share your diagrams with others.</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h2 class="flex items-center gap-2 font-bold">Graphi</h2>
        <CopyInput value={window.location.href} />
        <Dialog.Description>
          The content of the diagrams you create never leaves your browser.
        </Dialog.Description>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
