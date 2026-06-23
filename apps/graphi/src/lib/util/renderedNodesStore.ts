import { writable } from 'svelte/store';
import type { NodeInfo } from './mermaidIconSyntax';

export interface RenderedNode extends NodeInfo {
  /** 1-indexed source line; 0 for flowchart nodes (insertion uses nodeId, not line). */
  lineNumber: number;
}

export const renderedNodesStore = writable<RenderedNode[]>([]);

export function setRenderedNodes(nodes: RenderedNode[]): void {
  renderedNodesStore.set(nodes);
}

export function clearRenderedNodes(): void {
  renderedNodesStore.set([]);
}
