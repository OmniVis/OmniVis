<script lang="ts">
  import View from '$/components/View.svelte';
  import VisualToolbar from './VisualToolbar.svelte';
  import NodePropertiesPanel from './NodePropertiesPanel.svelte';
  import EdgePropertiesPanel from './EdgePropertiesPanel.svelte';
  import DragStrip from '$/components/IconPicker/DragStrip.svelte';
  import PanZoomToolbar from '$/components/PanZoomToolbar.svelte';
  import {
    visualEditStore,
    setSelectedNode,
    setSelectedEdge,
    clearSelection,
    setSubMode,
    setConnectFrom,
    clearConnectFrom
  } from '$/util/visualEditStore';
  import { iconDragStore } from '$/util/iconDragStore';
  import { stateStore, updateCode } from '$/util/state';
  import { renderedNodesStore } from '$/util/renderedNodesStore';
  import {
    addFlowchartEdge,
    deleteFlowchartNode,
    deleteFlowchartEdge,
    parseSvgEdgeId
  } from '$/util/diagramManipulation';
  import type { PanZoomState } from '$/util/panZoom';

  let { panZoomState }: { panZoomState: PanZoomState } = $props();

  let canvas: HTMLDivElement | undefined = $state();

  let selectedNodeId = $derived($visualEditStore.selectedNodeId);
  let selectedEdgeId = $derived($visualEditStore.selectedEdgeId);
  let subMode = $derived($visualEditStore.subMode);
  let connectFromId = $derived($visualEditStore.connectFromId);
  let isDragMode = $derived($iconDragStore.mode === 'drag-drop');
  let hasSelection = $derived(!!selectedNodeId || !!selectedEdgeId);

  // ── Apply selection highlight via data-visual-selected attribute ────────────
  $effect(() => {
    if (!canvas) return;
    canvas
      .querySelectorAll('[data-visual-selected]')
      .forEach((el) => el.removeAttribute('data-visual-selected'));
    if (selectedNodeId) {
      canvas.querySelectorAll<Element>('g.node, g.icon-shape').forEach((el) => {
        const m = (el.getAttribute('id') ?? '').match(/^flowchart-(.+)-\d+$/);
        if (m && m[1] === selectedNodeId) el.setAttribute('data-visual-selected', 'node');
      });
    }
    if (selectedEdgeId) {
      canvas.querySelectorAll<Element>('[data-id]').forEach((el) => {
        if (el.getAttribute('data-id') === selectedEdgeId)
          el.setAttribute('data-visual-selected', 'edge');
      });
    }
  });

  // ── Hit-test helper ─────────────────────────────────────────────────────────
  function nodeIdFromTarget(target: Element | null): string | null {
    let el = target;
    while (el && el !== canvas) {
      if (
        (el.classList.contains('node') || el.classList.contains('icon-shape')) &&
        (el.getAttribute('id') ?? '').startsWith('flowchart-')
      ) {
        const m = (el.getAttribute('id') ?? '').match(/^flowchart-(.+)-\d+$/);
        if (m) return m[1];
      }
      el = el.parentElement;
    }
    return null;
  }

  // ── Wider transparent hit areas for edges ───────────────────────────────────
  let _addingHits = false;

  function refreshEdgeHitAreas() {
    if (!canvas || _addingHits) return;
    _addingHits = true;
    try {
      canvas.querySelectorAll('[data-edge-hit]').forEach((el) => el.remove());
      canvas
        .querySelectorAll<SVGPathElement>('path[data-edge="true"]:not([data-edge-hit])')
        .forEach((path) => {
          const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          hit.setAttribute('d', path.getAttribute('d') ?? '');
          hit.setAttribute('stroke', 'transparent');
          hit.setAttribute('stroke-width', '20');
          hit.setAttribute('fill', 'none');
          hit.setAttribute('pointer-events', 'stroke');
          hit.setAttribute('data-edge', 'true');
          hit.setAttribute('data-id', path.getAttribute('data-id') ?? '');
          hit.setAttribute('data-edge-hit', 'true');
          hit.style.cursor = 'pointer';
          path.parentNode?.insertBefore(hit, path.nextSibling);
        });
    } finally {
      _addingHits = false;
    }
  }

  let _edgeHitObserver: MutationObserver | null = null;

  $effect(() => {
    if (!canvas) return;
    _edgeHitObserver?.disconnect();
    refreshEdgeHitAreas();
    _edgeHitObserver = new MutationObserver(() => {
      if (!_addingHits) refreshEdgeHitAreas();
    });
    const svg = canvas.querySelector('svg');
    if (svg) _edgeHitObserver.observe(svg, { childList: true, subtree: true });
    return () => _edgeHitObserver?.disconnect();
  });

  // ── Canvas click: connect mode (click-to-connect) + select mode ────────────
  function handleCanvasClick(event: MouseEvent) {
    if (isDragMode) return;

    if (subMode === 'connect') {
      const nodeId = nodeIdFromTarget(event.target as Element | null);

      if (nodeId) {
        if (!connectFromId) {
          // First click: set source node
          setConnectFrom(nodeId);
        } else if (connectFromId === nodeId) {
          // Clicked source again: deselect it
          clearConnectFrom();
        } else {
          // Second click on a different node: create edge, stay in connect mode
          updateCode(addFlowchartEdge($stateStore.code ?? '', connectFromId, nodeId));
          clearConnectFrom();
        }
        return;
      }

      // Clicked on an edge — ignore
      let el: Element | null = event.target as Element | null;
      while (el && el !== canvas) {
        if (el.getAttribute('data-edge') === 'true') return;
        el = el.parentElement;
      }

      // Empty space: clear current source selection, stay in connect mode
      clearConnectFrom();
      return;
    }

    // Select mode
    const nodeId = nodeIdFromTarget(event.target as Element | null);
    if (nodeId !== null) {
      setSelectedNode(nodeId);
      return;
    }

    let el: Element | null = event.target as Element | null;
    while (el && el !== canvas) {
      if (el.getAttribute('data-edge') === 'true') {
        const edgeId = el.getAttribute('data-id') ?? '';
        if (edgeId) setSelectedEdge(edgeId);
        return;
      }
      el = el.parentElement;
    }

    clearSelection();
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  function handleKeyDown(event: KeyboardEvent) {
    const tag = (event.target as HTMLElement).tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;

    if (event.key === 'Escape') {
      clearSelection();
      setSubMode('select');
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!hasSelection) return;
      const code = $stateStore.code ?? '';
      if (selectedNodeId) {
        updateCode(deleteFlowchartNode(code, selectedNodeId));
        clearSelection();
      } else if (selectedEdgeId) {
        const nodeIds = $renderedNodesStore.map((n) => n.id);
        const parsed = parseSvgEdgeId(selectedEdgeId, nodeIds);
        if (parsed) {
          updateCode(deleteFlowchartEdge(code, parsed.from, parsed.to));
          clearSelection();
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- Full-height visual editor layout -->
<div class="visual-editor-root flex h-full flex-col overflow-hidden">
  <VisualToolbar />
  <DragStrip />

  <div class="flex flex-1 overflow-hidden">
    <!-- Canvas area -->
    <div
      class="relative flex-1 overflow-hidden"
      class:cursor-crosshair={subMode === 'connect'}
      onclick={handleCanvasClick}
      role="presentation"
      bind:this={canvas}>
      <View {panZoomState} shouldShowGrid={$stateStore.grid} />

      <!-- Connect mode hint -->
      {#if subMode === 'connect'}
        <div
          class="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-sm">
          {#if connectFromId}
            Click a target node to connect from "<strong>{connectFromId}</strong>" — or click canvas
            to cancel
          {:else}
            Click a source node
          {/if}
        </div>
      {:else if !hasSelection}
        <div
          class="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full border bg-background/80 px-4 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
          Click a node or edge to select it
        </div>
      {/if}

      <!-- PanZoom controls -->
      <div class="absolute right-4 bottom-4 z-20 flex flex-col gap-2">
        <PanZoomToolbar {panZoomState} />
      </div>
    </div>

    <!-- Properties panel (hidden in connect mode) -->
    {#if hasSelection && subMode !== 'connect'}
      <aside class="w-64 shrink-0 overflow-y-auto border-l border-border bg-background shadow-sm">
        {#if selectedNodeId}
          <NodePropertiesPanel nodeId={selectedNodeId} />
        {:else if selectedEdgeId}
          <EdgePropertiesPanel edgeId={selectedEdgeId} />
        {/if}
      </aside>
    {/if}
  </div>
</div>

<style>
  /* Selected node: subtle blue glow */
  :global(.visual-editor-root [data-visual-selected='node']) {
    filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.65));
  }

  /* Edge hover cursor */
  :global(.visual-editor-root [data-edge='true']) {
    cursor: pointer;
  }

  /* Selected edge: blue stroke */
  :global(.visual-editor-root [data-visual-selected='edge']) {
    stroke: #3b82f6 !important;
    stroke-width: 3px !important;
    stroke-opacity: 1 !important;
  }

  /* Droppable nodes in icon drag mode */
  :global(.visual-editor-root [data-icon-droppable]) {
    cursor: crosshair;
  }
  :global(.visual-editor-root [data-icon-droppable].drag-over) {
    filter: drop-shadow(0 0 10px #3b82f6) drop-shadow(0 0 4px #93c5fd) brightness(1.08);
  }
</style>
