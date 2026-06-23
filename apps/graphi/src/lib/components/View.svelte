<script lang="ts">
  import type { State, ValidatedState } from '$/types';
  import { recordRenderTime, shouldRefreshView } from '$/util/autoSync';
  import { render as renderDiagram } from '$/util/mermaid';
  import { PanZoomState } from '$/util/panZoom';
  import { inputStateStore, stateStore, updateCode, updateCodeStore } from '$/util/state';
  import { logEvent, saveStatistics } from '$/util/stats';
  import FontAwesome, { mayContainFontAwesome } from '$lib/components/FontAwesome.svelte';
  import { get } from 'svelte/store';
  import { iconDragStore, setDraggingIcon } from '$/util/iconDragStore';
  import {
    extractIconCapableLines,
    insertOrUpdateArchitectureIcon,
    insertOrUpdateFlowchartIcon
  } from '$/util/mermaidIconSyntax';
  import {
    renderedNodesStore,
    setRenderedNodes,
    clearRenderedNodes
  } from '$/util/renderedNodesStore';
  import type { RenderedNode } from '$/util/renderedNodesStore';
  import uniqueID from 'lodash-es/uniqueId';
  import type { MermaidConfig } from 'mermaid';
  import { mode } from 'mode-watcher';
  import { onMount } from 'svelte';
  import { Svg2Roughjs } from 'svg2roughjs';

  let {
    panZoomState = new PanZoomState(),
    shouldShowGrid = true
  }: { panZoomState?: PanZoomState; shouldShowGrid?: boolean } = $props();
  let code = '';
  let config = '';
  let container: HTMLDivElement | undefined = $state();
  let rough: boolean;
  let view: HTMLDivElement | undefined = $state();
  let error = $state(false);
  let panZoom = true;
  let manualUpdate = true;
  let waitForFontAwesomeToLoad: FontAwesome['waitForFontAwesomeToLoad'] | undefined = $state();
  let diagramType: string | undefined;

  // Set up panZoom state observer to update the store when pan/zoom changes
  const setupPanZoomObserver = () => {
    panZoomState.onPanZoomChange = (pan, zoom) => {
      updateCodeStore({ pan, zoom });
      logEvent('panZoom');
    };
  };

  const handlePanZoom = (state: State, graphDiv: SVGSVGElement) => {
    try {
      panZoomState.updateElement(graphDiv, state);
    } catch (error) {
      console.error('PanZoom error:', error);
    }
  };

  const handleStateChange = async (state: ValidatedState) => {
    const startTime = Date.now();
    if (state.error !== undefined) {
      error = true;
      return;
    }
    error = false;
    diagramType = undefined;
    try {
      if (container) {
        manualUpdate = true;
        // Do not render if there is no change in Code/Config/PanZoom
        if (
          code === state.code &&
          config === state.mermaid &&
          rough === state.rough &&
          panZoom === state.panZoom
        ) {
          return;
        }

        if (!shouldRefreshView()) {
          return;
        }

        code = state.code;
        config = state.mermaid;
        rough = state.rough;
        panZoom = state.panZoom ?? true;

        if (mayContainFontAwesome(code)) {
          await waitForFontAwesomeToLoad?.();
        }

        const scroll = view?.parentElement?.scrollTop;
        delete container.dataset.processed;
        const viewID = uniqueID('graph-');
        let mermaidConfig: MermaidConfig;
        if (typeof state.mermaid === 'string') {
          try {
            mermaidConfig = JSON.parse(state.mermaid);
          } catch {
            mermaidConfig = { theme: 'default' };
          }
        } else {
          mermaidConfig = state.mermaid as unknown as MermaidConfig;
        }
        mermaidConfig.suppressErrorRendering = true;

        const {
          svg,
          bindFunctions,
          diagramType: detectedDiagramType
        } = await renderDiagram(mermaidConfig, code, viewID);
        diagramType = detectedDiagramType;

        // Clean up any Mermaid sandbox/error elements that may have leaked into body during render
        document
          .querySelectorAll(`#d${viewID}, #d-error, [id^="mermaid-error"]`)
          .forEach((el) => el.remove());

        // Prevent Mermaid's fallback error SVG from overwriting the last valid diagram
        // We use DOMParser because Mermaid v11+ includes ".error-icon" in the CSS block of valid diagrams
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
        if (svgDoc.querySelector('#d-error, .error-icon, .error-text')) {
          throw new Error('Mermaid rendering syntax error');
        }

        if (svg.length > 0) {
          // eslint-disable-next-line svelte/no-dom-manipulating
          container.innerHTML = svg;
          let graphDiv = document.querySelector<SVGSVGElement>(`#${viewID}`);
          if (!graphDiv) {
            throw new Error('graph-div not found');
          }
          if (state.rough) {
            const svg2roughjs = new Svg2Roughjs('#container');
            svg2roughjs.svg = graphDiv;
            await svg2roughjs.sketch();
            graphDiv.remove();
            const sketch = document.querySelector<SVGSVGElement>('#container > svg');
            if (!sketch) {
              throw new Error('sketch not found');
            }
            const height = sketch.getAttribute('height');
            const width = sketch.getAttribute('width');
            sketch.setAttribute('id', 'graph-div');
            sketch.setAttribute('height', '100%');
            sketch.setAttribute('width', '100%');
            sketch.setAttribute('viewBox', `0 0 ${width} ${height}`);
            sketch.style.maxWidth = '100%';
            graphDiv = sketch;
          } else {
            graphDiv.setAttribute('height', '100%');
            graphDiv.style.maxWidth = '100%';
            if (bindFunctions) {
              bindFunctions(graphDiv);
            }
          }
          if (state.panZoom) {
            handlePanZoom(state, graphDiv);
          }
          // Populate the rendered-nodes store so the IconPicker can show a live node list
          populateRenderedNodes(graphDiv, code, diagramType);
          // Re-mark drop targets after every render if drag mode is active
          if (get(iconDragStore).mode === 'drag-drop') {
            markDropTargets(graphDiv);
          }
        }
        if (view?.parentElement && scroll) {
          view.parentElement.scrollTop = scroll;
        }
        error = false;
      } else if (manualUpdate) {
        manualUpdate = false;
      }
    } catch (error_) {
      console.error('view fail', error_);
      error = true;
      clearRenderedNodes();
      // Clean up any Mermaid sandbox elements that leaked into the body
      document
        .querySelectorAll('[id^="dgraph-"], #d-error, svg[id^="mermaid-"]')
        .forEach((el) => el.remove());
    }
    const renderTime = Date.now() - startTime;
    saveStatistics({ code, diagramType, isRough: state.rough, renderTime });
    recordRenderTime(renderTime, () => {
      $inputStateStore.updateDiagram = true;
    });
  };

  // ── drag-drop support ────────────────────────────────────────────────────────

  // Immediately mark drop targets when drag mode is activated, without waiting
  // for the next Mermaid re-render (which may not happen if code hasn't changed).
  $effect(() => {
    if ($iconDragStore.mode !== 'drag-drop') return;
    const svgEl = container?.querySelector('svg');
    if (!svgEl) return;
    markDropTargets(svgEl);
  });

  /**
   * Scans the rendered SVG for node elements and publishes them to renderedNodesStore.
   * Flowchart nodes are detected via `g.node` / `g.icon-shape` CSS classes (Mermaid v11+).
   * Architecture-beta nodes still rely on extractIconCapableLines for their line numbers,
   * which are needed by insertOrUpdateArchitectureIcon.
   */
  function populateRenderedNodes(
    svgEl: Element,
    currentCode: string,
    currentDiagramType: string | undefined
  ): void {
    const nodes: RenderedNode[] = [];

    if (
      currentDiagramType === 'flowchart' ||
      currentDiagramType === 'graph' ||
      currentDiagramType === 'flowchart-v2'
    ) {
      // For flowcharts: read node IDs directly from the rendered SVG.
      // Each node has id="flowchart-{nodeId}-{counter}".
      svgEl.querySelectorAll<Element>('g.node, g.icon-shape').forEach((el) => {
        const elId = el.getAttribute('id') ?? '';
        const m = elId.match(/^flowchart-(.+)-\d+$/);
        // lineNumber is 0 for flowchart nodes — insertion uses nodeId, not line number.
        if (m && !nodes.some((n) => n.id === m[1])) {
          nodes.push({ id: m[1], type: 'flowchart-node', lineNumber: 0 });
        }
      });
    } else {
      // For architecture-beta and any future icon-capable type, fall back to text parsing
      // because we need the 1-indexed line numbers for insertOrUpdateArchitectureIcon.
      const nodeMap = extractIconCapableLines(currentCode, currentDiagramType);
      nodeMap.forEach((info, lineNumber) => {
        nodes.push({ ...info, lineNumber });
      });
    }

    setRenderedNodes(nodes);
  }

  /**
   * Marks SVG elements as droppable after each diagram render.
   * Uses Mermaid's own CSS classes (g.node, g.icon-shape) to find node elements —
   * no text-parsing needed here since we only care about what's actually rendered.
   */
  function markDropTargets(svgEl: Element): void {
    // Remove any stale markers first
    svgEl.querySelectorAll('[data-icon-droppable]').forEach((el) => {
      el.removeAttribute('data-icon-droppable');
      el.classList.remove('drag-over');
    });

    // Mark every rendered node element as a drop target.
    // Flowchart: g.node / g.icon-shape. Architecture-beta: g.node-service / g.node-group.
    svgEl
      .querySelectorAll<Element>('g.node, g.icon-shape, g.node-service, g.node-group')
      .forEach((el) => {
        el.setAttribute('data-icon-droppable', 'true');
      });
  }

  /**
   * Walks up from a drag event target to find the nearest [data-icon-droppable]
   * ancestor, crossing the SVG foreignObject boundary if needed.
   * (Native closest() may not traverse from HTML inside <foreignObject> back into SVG.)
   */
  function findDroppable(target: Element | null): Element | null {
    if (!target) return null;
    // Standard path — works for SVG paths, rects, and other SVG elements
    const found = target.closest('[data-icon-droppable]');
    if (found) return found;
    // Fallback: if target is an HTML element inside a <foreignObject> (e.g. text labels),
    // climb up until we hit the foreignObject, then continue up through SVG ancestors.
    let el: Element | null = target;
    while (el) {
      if (el.tagName.toLowerCase() === 'foreignobject') {
        return el.closest('[data-icon-droppable]');
      }
      el = el.parentElement;
    }
    return null;
  }

  let lastHighlighted: Element | null = null;

  function handleDragOver(event: DragEvent): void {
    // Always prevent default so the browser allows the drop (shows copy cursor).
    // The actual target validation happens in handleDrop.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

    const droppable = findDroppable(event.target as Element | null);
    if (droppable !== lastHighlighted) {
      lastHighlighted?.classList.remove('drag-over');
      if (droppable) droppable.classList.add('drag-over');
      lastHighlighted = droppable;
    }
  }

  function handleDragLeave(event: DragEvent): void {
    // Only clear when leaving the SVG container entirely
    const related = event.relatedTarget as Element | null;
    if (!container || (related && container.contains(related))) return;
    lastHighlighted?.classList.remove('drag-over');
    lastHighlighted = null;
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    // Use lastHighlighted (set by dragover) — avoids re-running closest() with
    // the same foreignObject boundary issue in the drop event.
    const droppable = lastHighlighted;
    lastHighlighted?.classList.remove('drag-over');
    lastHighlighted = null;

    const iconId = event.dataTransfer?.getData('text/plain') || get(iconDragStore).draggingIconId;
    if (!iconId) return;
    setDraggingIcon(null);

    if (!droppable) return;

    // Resolve node from the dropped element's id attribute using the rendered-nodes store.
    // The store was populated on the last render, so it reflects exactly what's on screen.
    const rawId = droppable.getAttribute('id') ?? '';
    const renderedNodes = get(renderedNodesStore);

    // Try flowchart ID format first: "flowchart-{nodeId}-{counter}"
    let nodeEntry: RenderedNode | undefined;
    const flowchartMatch = rawId.match(/^flowchart-(.+)-\d+$/);
    if (flowchartMatch) {
      nodeEntry = renderedNodes.find((n) => n.id === flowchartMatch[1]);
    }
    if (!nodeEntry) {
      // Fallback: split on non-word chars for architecture-beta and other types
      const parts = rawId.split(/[^A-Za-z0-9_]/);
      nodeEntry = renderedNodes.find((n) => parts.includes(n.id));
    }

    if (!nodeEntry) return;

    const currentCode = code;
    let newCode: string;
    if (nodeEntry.type === 'flowchart-node') {
      newCode = insertOrUpdateFlowchartIcon(currentCode, nodeEntry.id, iconId);
    } else {
      newCode = insertOrUpdateArchitectureIcon(currentCode, nodeEntry.lineNumber, iconId);
    }
    updateCode(newCode);
  }

  onMount(() => {
    setupPanZoomObserver();
    // Queue state changes to avoid race condition
    let pendingStateChange = Promise.resolve();
    stateStore.subscribe((state) => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      pendingStateChange = pendingStateChange.then(() => handleStateChange(state).catch(() => {}));
    });
  });
</script>

<FontAwesome bind:waitForFontAwesomeToLoad />

<div
  id="view"
  bind:this={view}
  class={[
    'h-full w-full',
    shouldShowGrid && `grid-bg-${$mode}`,
    error && 'pointer-events-none opacity-20'
  ]}>
  <div
    id="container"
    bind:this={container}
    class="h-full overflow-auto"
    role="application"
    aria-label="Diagram canvas"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}>
  </div>
</div>

<style>
  :global([data-icon-droppable]) {
    cursor: crosshair;
    transition: filter 0.2s;
  }
  :global([data-icon-droppable].drag-over) {
    filter: drop-shadow(0 0 10px #3b82f6) drop-shadow(0 0 4px #93c5fd) brightness(1.08);
  }

  .grid-bg-light {
    background-size: 30px 30px;
    background-image: radial-gradient(circle, #e4e4e48c 2px, #0000 2px);
  }

  .grid-bg-dark {
    background-size: 30px 30px;
    background-image: radial-gradient(circle, #46464646 2px, #0000 2px);
  }
</style>
