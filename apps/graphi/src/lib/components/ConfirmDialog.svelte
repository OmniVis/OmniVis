<script lang="ts">
  interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    isOpen,
    title,
    message,
    confirmLabel = 'Continue',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel
  }: Props = $props();
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[300] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onclick={onCancel}></div>
    <div class="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div class="p-6">
        <h3 class="mb-1 text-base font-black text-slate-900">{title}</h3>
        <p class="text-sm text-slate-500">{message}</p>
      </div>
      <div class="flex gap-2 border-t border-slate-100 p-4">
        <button
          onclick={onCancel}
          class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
          {cancelLabel}
        </button>
        <button
          onclick={onConfirm}
          class="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
