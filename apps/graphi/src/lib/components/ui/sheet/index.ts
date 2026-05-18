import { Dialog as SheetPrimitive } from 'bits-ui';
import Content from './sheet-content.svelte';
import Header from './sheet-header.svelte';
import Overlay from './sheet-overlay.svelte';
import Title from './sheet-title.svelte';

const Root = SheetPrimitive.Root;
const Trigger = SheetPrimitive.Trigger;
const Close = SheetPrimitive.Close;
const Portal = SheetPrimitive.Portal;

export {
  Close,
  Content,
  Header,
  Overlay,
  Portal,
  Root,
  //
  Root as Sheet,
  Close as SheetClose,
  Content as SheetContent,
  Header as SheetHeader,
  Overlay as SheetOverlay,
  Portal as SheetPortal,
  Title as SheetTitle,
  Trigger as SheetTrigger,
  Title,
  Trigger
};
