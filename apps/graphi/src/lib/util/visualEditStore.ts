import { writable } from 'svelte/store';

export type VisualSubMode = 'select' | 'connect';

export interface VisualEditState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  subMode: VisualSubMode;
  /** Set during connect mode after the first click (source node). */
  connectFromId: string | null;
}

export const visualEditStore = writable<VisualEditState>({
  selectedNodeId: null,
  selectedEdgeId: null,
  subMode: 'select',
  connectFromId: null
});

export function setSelectedNode(nodeId: string): void {
  visualEditStore.update((s) => ({
    ...s,
    selectedNodeId: nodeId,
    selectedEdgeId: null
  }));
}

export function setSelectedEdge(edgeId: string): void {
  visualEditStore.update((s) => ({
    ...s,
    selectedNodeId: null,
    selectedEdgeId: edgeId
  }));
}

export function clearSelection(): void {
  visualEditStore.update((s) => ({
    ...s,
    selectedNodeId: null,
    selectedEdgeId: null,
    connectFromId: null
  }));
}

export function setSubMode(mode: VisualSubMode): void {
  visualEditStore.update((s) => ({
    ...s,
    subMode: mode,
    connectFromId: null
  }));
}

export function setConnectFrom(nodeId: string): void {
  visualEditStore.update((s) => ({
    ...s,
    connectFromId: nodeId,
    selectedNodeId: nodeId
  }));
}

export function clearConnectFrom(): void {
  visualEditStore.update((s) => ({
    ...s,
    connectFromId: null,
    selectedNodeId: null
  }));
}
