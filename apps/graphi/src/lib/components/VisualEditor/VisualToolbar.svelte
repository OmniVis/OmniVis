<script lang="ts">
  import { visualEditStore, setSubMode, clearSelection } from '$/util/visualEditStore';
  import { iconDragStore, enterDragMode, exitDragMode } from '$/util/iconDragStore';
  import { stateStore, updateCode } from '$/util/state';
  import { addFlowchartNode } from '$/util/diagramManipulation';
  import CursorIcon from '~icons/material-symbols/arrow-selector-tool';
  import ConnectIcon from '~icons/material-symbols/cable';
  import IconsIcon from '~icons/material-symbols/add-reaction';

  let subMode = $derived($visualEditStore.subMode);
  let isDragMode = $derived($iconDragStore.mode === 'drag-drop');

  function handleSelectMode() {
    if (isDragMode) exitDragMode();
    setSubMode('select');
    clearSelection();
  }

  function handleConnectMode() {
    if (isDragMode) exitDragMode();
    setSubMode('connect');
    clearSelection();
  }

  function handleIconMode() {
    if (isDragMode) {
      exitDragMode();
    } else {
      setSubMode('select');
      enterDragMode();
    }
  }

  function handleAddNode() {
    const code = $stateStore.code ?? '';
    // Generate a short unique ID
    const id = `N${Math.floor(Math.random() * 9000 + 1000)}`;
    updateCode(addFlowchartNode(code, id, 'New Node', 'box'));
  }

  const btnBase =
    'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors';
  const btnActive = 'bg-primary text-primary-foreground';
  const btnIdle = 'text-muted-foreground hover:bg-accent hover:text-accent-foreground';
</script>

<div class="flex shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-3 py-1.5">
  <!-- Submode group -->
  <div class="flex items-center gap-0.5 rounded border border-border bg-background p-0.5">
    <button
      class="{btnBase} {subMode === 'select' && !isDragMode ? btnActive : btnIdle}"
      onclick={handleSelectMode}
      title="Select mode — click nodes and edges to select them">
      <CursorIcon class="size-3.5" />
      Select
    </button>
    <button
      class="{btnBase} {subMode === 'connect' && !isDragMode ? btnActive : btnIdle}"
      onclick={handleConnectMode}
      title="Connect mode — click two nodes to draw an edge between them">
      <ConnectIcon class="size-3.5" />
      Connect
    </button>
    <button
      class="{btnBase} {isDragMode ? btnActive : btnIdle}"
      onclick={handleIconMode}
      title="Icon mode — drag icons onto diagram nodes">
      <IconsIcon class="size-3.5" />
      Icons
    </button>
  </div>

  <div class="mx-1 h-4 w-px bg-border"></div>

  <button
    class="{btnBase} border border-dashed border-border hover:border-primary hover:text-primary"
    onclick={handleAddNode}
    title="Add a new node to the diagram">
    + Node
  </button>
</div>
