<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import X from 'lucide-svelte/icons/x';
  import type { Snippet } from 'svelte';
  import * as Sheet from './index.js';

  let {
    ref = $bindable(null),
    class: className,
    portalProps,
    side = 'bottom',
    children,
    ...restProps
  }: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
    portalProps?: SheetPrimitive.PortalProps;
    side?: 'top' | 'bottom' | 'left' | 'right';
    children: Snippet;
  } = $props();

  const sideVariants = {
    top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
    bottom:
      'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
    left: 'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
    right:
      'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm'
  };
</script>

<Sheet.Portal {...portalProps}>
  <Sheet.Overlay />
  <SheetPrimitive.Content
    bind:ref
    class={cn(
      'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500',
      sideVariants[side],
      className
    )}
    {...restProps}>
    {@render children?.()}
    <SheetPrimitive.Close
      class="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-secondary">
      <X class="size-4" />
      <span class="sr-only">Close</span>
    </SheetPrimitive.Close>
  </SheetPrimitive.Content>
</Sheet.Portal>
