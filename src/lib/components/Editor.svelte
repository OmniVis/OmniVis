<script lang="ts">
  import DesktopEditor from '$/components/DesktopEditor.svelte';
  import MobileEditor from '$/components/MobileEditor.svelte';
  import { Button } from '$/components/ui/button';
  import { TID } from '$/constants';
  import { stateStore, updateCode, updateConfig } from '$lib/util/state';
  import { aiRepairRequest } from '$lib/util/aiRepair';
  import { debounce } from 'lodash-es';
  import ExclamationCircleIcon from '~icons/material-symbols/error-outline-rounded';
  import AIRepairIcon from '~icons/material-symbols/auto-fix-high';

  const { isMobile } = $props<{ isMobile: boolean }>();

  const debouncedUpdate = debounce((text: string, isCode: boolean) => {
    if (isCode) {
      updateCode(text);
    } else {
      updateConfig(text);
    }
  }, 1500);

  const onUpdate = (text: string) => {
    const isCode = $stateStore.editorMode === 'code';
    if ($stateStore.performanceMode) {
      debouncedUpdate(text, isCode);
    } else {
      // If we're not in performance mode, we want instant updates.
      // We still cancel any pending debounced updates to avoid "ghost" updates later.
      debouncedUpdate.cancel();
      if (isCode) {
        updateCode(text);
      } else {
        updateConfig(text);
      }
    }
  };

  let showError = $state(false);

  const showErrorDebounced = debounce(() => {
    showError = true;
  }, 5000);

  function handleAIRepair() {
    const errorMsg = $stateStore.error?.toString() ?? 'Syntax error';
    aiRepairRequest.set(
      `Please fix this Mermaid.js syntax error.\n\nError:\n${errorMsg}\n\nReturn only the corrected Mermaid code.`
    );
  }

  $effect(() => {
    if ($stateStore.error) {
      showErrorDebounced();
    } else {
      showErrorDebounced.cancel();
      showError = false;
    }

    return () => {
      showErrorDebounced.cancel();
    };
  });
</script>

<div class="flex h-full flex-col overflow-hidden">
  {#if isMobile}
    <div class="flex-1 overflow-hidden">
      <MobileEditor {onUpdate} />
    </div>
  {:else}
    <div class="flex-1 overflow-hidden">
      <DesktopEditor {onUpdate} />
    </div>
  {/if}
  {#if showError && $stateStore.error instanceof Error}
    <div
      class="flex flex-none flex-col border-t-2 border-destructive text-sm"
      data-testid={TID.errorContainer}>
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 bg-destructive/5 px-3 py-2">
        <div class="flex items-center gap-2">
          <ExclamationCircleIcon class="size-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p class="text-[11px] font-black tracking-wider text-destructive uppercase">
              Syntax Error
            </p>
            <p class="text-[10px] text-muted-foreground">Use AI Repair to fix automatically</p>
          </div>
        </div>
        {#if $stateStore.editorMode === 'code'}
          <Button
            variant="default"
            size="sm"
            data-testid={TID.aiRepairButton}
            onclick={handleAIRepair}
            class="h-7 shrink-0 gap-1.5 rounded-none px-3 text-[10px] font-bold tracking-wider uppercase">
            <AIRepairIcon class="size-3.5" />
            AI Repair
          </Button>
        {/if}
      </div>
      <!-- Error message -->
      <output
        class="max-h-28 overflow-auto bg-background/50 px-3 py-2"
        name="mermaid-error"
        for="editor">
        <pre
          class="text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{$stateStore.error?.toString()}</pre>
      </output>
    </div>
  {/if}
</div>
