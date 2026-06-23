// src/lib/util/iconDragStore.ts
import { writable } from 'svelte/store';

export interface IconDragState {
  mode: 'idle' | 'drag-drop';
  draggingIconId: string | null;
}

export const iconDragStore = writable<IconDragState>({
  mode: 'idle',
  draggingIconId: null
});

export function enterDragMode(): void {
  iconDragStore.set({ mode: 'drag-drop', draggingIconId: null });
}

export function exitDragMode(): void {
  iconDragStore.set({ mode: 'idle', draggingIconId: null });
}

export function setDraggingIcon(iconId: string | null): void {
  iconDragStore.update((s) => ({ ...s, draggingIconId: iconId }));
}
