<script lang="ts">
  import { stateStore, updateCode, updateCodeStore } from '$/util/state';
  import { Button } from '$/components/ui/button';
  import { Input } from '$/components/ui/input';
  import { Switch } from '$/components/ui/switch';
  import View from '$/components/View.svelte';
  import type { PanZoomState } from '$/util/panZoom';
  import PlusIcon from '~icons/material-symbols/add-rounded';
  import EditIcon from '~icons/material-symbols/edit-square-outline';

  let { panZoomState }: { panZoomState: PanZoomState } = $props();

  let isInteractive = $derived($stateStore.viewMode === 'interactive');
  let selectedElement = $state<{
    id: string;
    type: 'node' | 'edge' | 'label';
    label: string;
  } | null>(null);

  function handleSvgClick(event: MouseEvent) {
    if (!isInteractive) return;

    // Check if we are clicking on the toolbar or other UI elements
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;

    const svgTarget = event.target as SVGElement;
    let current: SVGElement | null = svgTarget;

    // Check if we clicked exactly on a text element or its immediate parent
    if (
      svgTarget.tagName === 'text' ||
      svgTarget.tagName === 'tspan' ||
      svgTarget.classList.contains('label') ||
      svgTarget.parentElement?.classList.contains('label')
    ) {
      const label =
        svgTarget.textContent?.trim() || svgTarget.parentElement?.textContent?.trim() || '';
      if (label) {
        selectedElement = {
          id:
            (svgTarget as any).id ||
            (svgTarget.parentElement as any).id ||
            (svgTarget.closest('.edgeLabel') as any)?.id ||
            'text-element',
          type: 'label',
          label
        };
        return;
      }
    }

    while (current && current.tagName !== 'svg') {
      const classList = current.classList;
      if (
        classList.contains('node') ||
        classList.contains('edgePath') ||
        classList.contains('edgeLabel') ||
        classList.contains('label-container') ||
        current.getAttribute('data-id')
      ) {
        let type: 'node' | 'edge' | 'label' = 'node';
        if (classList.contains('edgePath')) type = 'edge';
        if (classList.contains('edgeLabel') || classList.contains('label-container'))
          type = 'label';

        const id =
          current.id ||
          current.getAttribute('data-id') ||
          (type === 'label' ? 'edge-label' : 'unknown');
        const labelElement =
          current.querySelector('.label') || current.querySelector('text') || current;
        const label = labelElement?.textContent?.trim() || '';

        selectedElement = { id, type, label };
        return;
      }
      current = current.parentElement as SVGElement | null;
    }

    selectedElement = null;
  }

  function updateLabel(newLabel: string) {
    if (!selectedElement) return;
    const oldCode = $stateStore.code;
    const oldLabel = selectedElement.label;

    if (!oldLabel && selectedElement.type === 'label') return;

    const lines = oldCode.split('\n');
    const escapedOldLabel = oldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const newLines = lines.map((line, index) => {
      if (index === 0) return line; // Protect header

      if (selectedElement.type === 'node' && selectedElement.id !== 'unknown') {
        const nodeId = selectedElement.id;
        const nodeDefPattern = new RegExp(
          `(${nodeId})\\[(.*?)\\]|(${nodeId})\\((.*?)\\)|(${nodeId})\\{(.*?)\\}|(${nodeId})\\[\\[(.*?)\\]\\]|(${nodeId})\\>(.*?)\\]|(${nodeId})\\((.*?)\\)`,
          'g'
        );

        if (nodeDefPattern.test(line)) {
          return line.replace(nodeDefPattern, (match) => {
            if (match.includes('[')) return match.replace(/\[.*\]/, `[${newLabel}]`);
            if (match.includes('(')) return match.replace(/\(.*\)/, `(${newLabel})`);
            if (match.includes('{')) return match.replace(/\{.*\}/, `{${newLabel}}`);
            return match.replace(oldLabel, newLabel);
          });
        }

        // If no definition, but line contains the ID and oldLabel, try replacing
        if (new RegExp(`\\b${nodeId}\\b`).test(line) && line.includes(oldLabel)) {
          return line.replace(new RegExp(escapedOldLabel, 'g'), newLabel);
        }
      } else if (selectedElement.type === 'label') {
        // Edge labels: look for |label| pattern
        const edgeLabelPattern = new RegExp(`\\|${escapedOldLabel}\\|`, 'g');
        if (edgeLabelPattern.test(line)) {
          return line.replace(edgeLabelPattern, `|${newLabel}|`);
        }
      }

      // Fallback: if we are sure this is the right element, but couldn't find a pattern
      // Only do this if the line isn't the header and contains the exact old label
      if (
        oldLabel &&
        line.includes(oldLabel) &&
        (selectedElement.type === 'label' ||
          (selectedElement.id !== 'unknown' && line.includes(selectedElement.id)))
      ) {
        return line.replace(new RegExp(escapedOldLabel, 'g'), newLabel);
      }

      return line;
    });

    const newCode = newLines.join('\n');
    if (newCode !== oldCode) {
      updateCode(newCode);
      selectedElement.label = newLabel;
    }
  }

  function applyStyle(color: string) {
    if (!selectedElement || selectedElement.type !== 'node') return;
    const nodeName = selectedElement.id;
    const oldCode = $stateStore.code;

    const styleRegex = new RegExp(`^style ${nodeName} [^\\n]+$`, 'm');
    let newCode: string;
    if (styleRegex.test(oldCode)) {
      newCode = oldCode.replace(styleRegex, `style ${nodeName} fill:${color}`);
    } else {
      // Append style at the end
      newCode = oldCode.trimEnd() + `\nstyle ${nodeName} fill:${color}`;
    }
    updateCode(newCode);
  }

  function removeStyle() {
    if (!selectedElement || selectedElement.type !== 'node') return;
    const nodeName = selectedElement.id;
    const oldCode = $stateStore.code;

    const styleRegex = new RegExp(`^style ${nodeName} [^\\n]+$`, 'm');
    let newCode: string;
    if (styleRegex.test(oldCode)) {
      newCode = oldCode.replace(styleRegex, '').replace(/\n\s*\n/g, '\n');
      updateCode(newCode);
    }
  }

  function updateShape(shape: 'box' | 'round' | 'diamond') {
    if (!selectedElement || selectedElement.type !== 'node') return;
    const nodeId = selectedElement.id;
    const oldCode = $stateStore.code;
    const label = selectedElement.label;

    const nodeDefPattern = new RegExp(
      `(${nodeId})\\[(.*?)\\]|(${nodeId})\\((.*?)\\)|(${nodeId})\\{(.*?)\\}`,
      'g'
    );

    let brackets = ['[', ']'];
    if (shape === 'round') brackets = ['(', ')'];
    if (shape === 'diamond') brackets = ['{', '}'];

    const lines = oldCode.split('\n');
    const newLines = lines.map((line, index) => {
      if (index === 0) return line; // Protect header

      if (nodeDefPattern.test(line)) {
        return line.replace(nodeDefPattern, `${nodeId}${brackets[0]}${label}${brackets[1]}`);
      } else if (new RegExp(`\\b${nodeId}\\b`).test(line)) {
        // Only replace if it's the start of a definition or a solo ID on the line
        // Avoid replacing ID inside other words
        return line.replace(
          new RegExp(`\\b${nodeId}\\b`, 'g'),
          `${nodeId}${brackets[0]}${label}${brackets[1]}`
        );
      }
      return line;
    });

    const newCode = newLines.join('\n');
    if (newCode !== oldCode) {
      updateCode(newCode);
    }
  }

  function addNode() {
    const oldCode = $stateStore.code;
    const newNodeId = `Node${Math.floor(Math.random() * 1000)}`;
    const newCode = oldCode + `\n    ${newNodeId}[New Node]`;
    updateCode(newCode);
    selectedElement = { id: newNodeId, type: 'node', label: 'New Node' };
  }

  function addEdge() {
    const oldCode = $stateStore.code;
    const sourceNode = selectedElement?.type === 'node' ? selectedElement.id : 'A';
    const targetNodeId = `Node${Math.floor(Math.random() * 1000)}`;
    const newCode = oldCode + `\n    ${sourceNode} -->|link| ${targetNodeId}[New Node]`;
    updateCode(newCode);
    selectedElement = { id: targetNodeId, type: 'node', label: 'New Node' };
  }

  function updateTheme(themeName: string) {
    const oldCode = $stateStore.code;
    const themeRegex = /%%\{init: \{'theme': '[^']*'\}\}%%/;

    let newCode: string;
    if (!themeName) {
      // Remove the theme block if empty
      newCode = oldCode
        .replace(themeRegex, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    } else {
      const newThemeStr = `%%{init: {'theme': '${themeName}'}}%%`;
      if (themeRegex.test(oldCode)) {
        newCode = oldCode.replace(themeRegex, newThemeStr);
      } else {
        newCode = newThemeStr + '\n' + oldCode;
      }
    }
    updateCode(newCode);
  }

  function toggleInteractive(checked: boolean) {
    updateCodeStore({ viewMode: checked ? 'interactive' : 'code' });
    if (!checked) selectedElement = null;
  }
</script>

<div class="relative flex h-full flex-col overflow-hidden">
  <!-- Interactive View Header -->
  <div class="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <EditIcon class="text-accent" />
        <span class="text-sm font-semibold">Interactive Mode</span>
        <Switch checked={isInteractive} onCheckedChange={toggleInteractive} size="sm" />
      </div>

      {#if isInteractive}
        <select
          class="rounded border bg-background px-2 py-1 text-xs"
          onchange={(e) => updateTheme((e.target as HTMLSelectElement).value)}>
          <option value="">Select Theme</option>
          <option value="default">Default</option>
          <option value="dark">Dark</option>
          <option value="forest">Forest</option>
          <option value="neutral">Neutral</option>
        </select>
      {/if}
    </div>

    {#if isInteractive}
      <div class="flex gap-2">
        <Button variant="outline" size="sm" onclick={addNode}>
          <PlusIcon class="mr-1" />
          Node
        </Button>
        <Button variant="outline" size="sm" onclick={addEdge}>
          <PlusIcon class="mr-1" />
          Edge
        </Button>
      </div>
    {/if}
  </div>

  <div class="flex flex-1 overflow-hidden">
    <!-- Preview Area -->
    <div
      class={['relative flex-1', isInteractive && 'cursor-crosshair']}
      onclick={handleSvgClick}
      role="presentation">
      <View {panZoomState} shouldShowGrid={$stateStore.grid} />

      {#if isInteractive && !selectedElement}
        <div
          class="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full border bg-background/80 px-4 py-1 text-xs font-medium shadow-sm backdrop-blur-sm">
          Click an element to edit
        </div>
      {/if}
    </div>

    <!-- Properties Panel (Sidebar) -->
    {#if isInteractive && selectedElement}
      <aside class="w-64 border-l bg-background p-4 shadow-xl transition-all">
        {#if isInteractive && selectedElement}
          <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div class="mb-4">
              <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {selectedElement.type}: {selectedElement.id}
              </h3>
            </div>

            <div class="flex flex-col gap-4">
              <div class="space-y-1.5">
                <label for="label-text" class="text-sm leading-none font-medium">Label Text</label>
                <Input
                  id="label-text"
                  value={selectedElement.label}
                  oninput={(e) => updateLabel((e.target as HTMLInputElement).value)}
                  placeholder="Label text..." />
              </div>

              {#if selectedElement.type === 'node'}
                <div class="space-y-1.5">
                  <span class="text-sm leading-none font-medium">Node Shape</span>
                  <select
                    class="w-full rounded border bg-background px-2 py-1 text-sm"
                    onchange={(e) => updateShape((e.target as HTMLSelectElement).value as any)}>
                    <option value="box">Box</option>
                    <option value="round">Rounded</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>

                <div class="space-y-1.5 pt-2">
                  <div class="flex items-center justify-between">
                    <span class="text-sm leading-none font-medium">Node Color</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 px-2 text-[10px]"
                      onclick={removeStyle}>Reset</Button>
                  </div>
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    {#each ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'] as color}
                      <button
                        class="size-6 rounded-md border border-border shadow-sm transition-transform hover:scale-110"
                        style="background-color: {color}"
                        onclick={() => applyStyle(color)}
                        title={color}></button>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="mt-2 border-t pt-4">
                <h4 class="text-xs font-bold text-muted-foreground uppercase">Style Config</h4>
                <p class="mt-1 text-[10px] text-muted-foreground italic">
                  Use the theme selector above for global styles.
                </p>
              </div>
            </div>
          </div>
        {/if}
        <div class="mt-4 rounded-lg bg-accent/5 p-3 text-[10px] leading-tight">
          <strong>Tip:</strong> Changes are saved directly to the code on the left.
        </div>
      </aside>
    {/if}
  </div>
</div>
