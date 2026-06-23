<script lang="ts">
  import { stateStore, updateCode } from '$/util/state';
  import { clearSelection } from '$/util/visualEditStore';
  import {
    updateNodeLabel,
    toggleNodeBold,
    changeNodeShape,
    deleteFlowchartNode,
    type NodeShape
  } from '$/util/diagramManipulation';
  import { insertOrUpdateFlowchartIcon } from '$/util/mermaidIconSyntax';
  import TrashIcon from '~icons/material-symbols/delete-outline-rounded';
  import BoldIcon from '~icons/material-symbols/format-bold';
  import ItalicIcon from '~icons/material-symbols/format-italic';

  let { nodeId }: { nodeId: string } = $props();

  // ── string helpers ───────────────────────────────────────────────────────────
  function escId(id: string) {
    return id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ── label / formatting readers ───────────────────────────────────────────────
  function getRawLabelContent(code: string, id: string): string {
    const m = code.match(
      new RegExp(
        `\\b${escId(id)}\\s*(?:\\[\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>)([^\\]\\)\\}\\n]*?)(?:\\]\\]|\\)\\)|\\}\\}|\\]|\\)|\\})`
      )
    );
    return m ? m[1] : '';
  }

  function getNodeLabel(code: string, id: string): string {
    let raw = getRawLabelContent(code, id);
    if (!raw) return id;
    raw = raw.replace(/^\*\*(.+)\*\*$/, '$1');
    raw = raw.replace(/^_(.+)_$/, '$1');
    return raw;
  }

  function isBold(code: string, id: string): boolean {
    return /^\*\*/.test(getRawLabelContent(code, id));
  }

  function isItalic(code: string, id: string): boolean {
    const raw = getRawLabelContent(code, id);
    const inner = raw.replace(/^\*\*(.+)\*\*$/, '$1');
    return /^_/.test(inner);
  }

  function toggleNodeItalic(code: string, id: string): string {
    const shapeRe = new RegExp(
      `(\\b${escId(id)}\\s*(?:\\[\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>))([^\\]\\)\\}\\n]*?)((?:\\]\\]|\\)\\)|\\}\\}|\\]|\\)|\\}))`
    );
    return code.replace(shapeRe, (_, open, content, close) => {
      const boldWrapped = /^\*\*(.+)\*\*$/.test(content);
      const inner = boldWrapped ? content.slice(2, -2) : content;
      const newInner = /^_(.+)_$/.test(inner) ? inner.slice(1, -1) : `_${inner}_`;
      return `${open}${boldWrapped ? `**${newInner}**` : newInner}${close}`;
    });
  }

  // ── style prop helpers (parse/modify/rebuild approach) ───────────────────────
  function getStyleProps(code: string, id: string): string[] {
    const m = code.match(new RegExp(`^style\\s+${escId(id)}\\s+([^\\n]+)$`, 'm'));
    return m
      ? m[1]
          .split(/\s*,\s*/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
  }

  function setStyleLine(code: string, id: string, props: string[]): string {
    const existingRe = new RegExp(`^style\\s+${escId(id)}\\s+[^\\n]+`, 'm');
    if (props.length === 0) {
      return code
        .replace(new RegExp(`^style\\s+${escId(id)}\\s+[^\\n]+\n?`, 'm'), '')
        .replace(/\n{3,}/g, '\n\n');
    }
    const newLine = `style ${id} ${props.join(',')}`;
    if (existingRe.test(code)) return code.replace(existingRe, newLine);
    return code.trimEnd() + '\n' + newLine;
  }

  function applyStyleProp(code: string, id: string, prop: string, value: string): string {
    const props = getStyleProps(code, id);
    const propRe = new RegExp(`^${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`);
    const idx = props.findIndex((p) => propRe.test(p));
    const next = [...props];
    if (idx >= 0) next[idx] = `${prop}:${value}`;
    else next.push(`${prop}:${value}`);
    return setStyleLine(code, id, next);
  }

  function removeStyleProp(code: string, id: string, prop: string): string {
    const props = getStyleProps(code, id);
    const propRe = new RegExp(`^${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`);
    return setStyleLine(
      code,
      id,
      props.filter((p) => !propRe.test(p))
    );
  }

  function getStyleProp(code: string, id: string, prop: string): string {
    const props = getStyleProps(code, id);
    const propRe = new RegExp(`^${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(.+)$`);
    const found = props.find((p) => propRe.test(p));
    return found ? found.replace(propRe, '$1').trim() : '';
  }

  // ── icon helpers ─────────────────────────────────────────────────────────────
  function getNodeIcon(code: string, id: string): string {
    const m = code.match(new RegExp(`\\b${escId(id)}@\\{[^}]*\\bicon\\s*:\\s*"([^"]+)"`));
    return m ? m[1] : '';
  }

  function removeFlowchartIcon(code: string, id: string): string {
    const nodeEsc = escId(id);
    const fullIconLine = new RegExp(`^\\s*${nodeEsc}@\\{\\s*icon\\s*:\\s*"[^"]*"\\s*\\}\\s*$`);
    const atBlockRe = new RegExp(`^(\\s*${nodeEsc}@\\{)(.*)\\}\\s*$`);
    return code
      .split('\n')
      .map((line) => {
        if (fullIconLine.test(line)) return null;
        const m = line.match(atBlockRe);
        if (!m) return line;
        const withoutIcon = m[2]
          .replace(/,?\s*icon\s*:\s*"[^"]*"\s*,?/, '')
          .replace(/^,|,$/g, '')
          .trim();
        return withoutIcon ? `${m[1]} ${withoutIcon} }` : null;
      })
      .filter((l) => l !== null)
      .join('\n');
  }

  function iconifyUrl(iconId: string): string {
    const [prefix, name] = iconId.split(':');
    return `https://api.iconify.design/${prefix}/${name}.svg`;
  }

  // ── color validation ─────────────────────────────────────────────────────────
  function isValidHex(v: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(v);
  }

  // ── reactive state ───────────────────────────────────────────────────────────
  let currentLabel = $derived(getNodeLabel($stateStore.code ?? '', nodeId));
  let bold = $derived(isBold($stateStore.code ?? '', nodeId));
  let italic = $derived(isItalic($stateStore.code ?? '', nodeId));
  let currentIcon = $derived(getNodeIcon($stateStore.code ?? '', nodeId));

  let currentFillColor = $derived(
    getStyleProp($stateStore.code ?? '', nodeId, 'fill') || '#ffffff'
  );
  let currentStrokeColor = $derived(
    getStyleProp($stateStore.code ?? '', nodeId, 'stroke') || '#333333'
  );
  let currentTextColor = $derived(
    getStyleProp($stateStore.code ?? '', nodeId, 'color') || '#333333'
  );
  let currentStrokeWidthPx = $derived(getStyleProp($stateStore.code ?? '', nodeId, 'stroke-width'));
  let currentStrokeWidthNum = $derived(
    currentStrokeWidthPx ? Math.max(1, parseInt(currentStrokeWidthPx)) : 1
  );
  let isDashed = $derived(getStyleProp($stateStore.code ?? '', nodeId, 'stroke-dasharray') !== '');

  // eslint-disable-next-line svelte/prefer-writable-derived
  let labelInput = $state('');
  $effect(() => {
    labelInput = currentLabel;
  });

  // eslint-disable-next-line svelte/prefer-writable-derived
  let fillInput = $state('#ffffff');
  $effect(() => {
    fillInput = currentFillColor;
  });

  // eslint-disable-next-line svelte/prefer-writable-derived
  let strokeInput = $state('#333333');
  $effect(() => {
    strokeInput = currentStrokeColor;
  });

  // eslint-disable-next-line svelte/prefer-writable-derived
  let textColorInput = $state('#333333');
  $effect(() => {
    textColorInput = currentTextColor;
  });

  // ── icon search ───────────────────────────────────────────────────────────────
  let iconQuery = $state('');
  let iconResults: string[] = $state([]);
  let iconSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  function searchIcons(query: string) {
    if (iconSearchTimeout) clearTimeout(iconSearchTimeout);
    if (!query.trim()) {
      iconResults = [];
      return;
    }
    iconSearchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=20`
        );
        const data = (await res.json()) as { icons?: string[] };
        iconResults = data.icons ?? [];
      } catch {
        iconResults = [];
      }
    }, 300);
  }

  function setIcon(iconId: string) {
    updateCode(insertOrUpdateFlowchartIcon($stateStore.code ?? '', nodeId, iconId));
    iconQuery = '';
    iconResults = [];
  }

  // ── event handlers ───────────────────────────────────────────────────────────
  function commitLabel() {
    const trimmed = labelInput.trim();
    if (trimmed && trimmed !== currentLabel) {
      updateCode(updateNodeLabel($stateStore.code ?? '', nodeId, trimmed));
    }
  }

  function handleDelete() {
    updateCode(deleteFlowchartNode($stateStore.code ?? '', nodeId));
    clearSelection();
  }

  // ── constants ────────────────────────────────────────────────────────────────
  const SHAPES: { value: NodeShape; label: string }[] = [
    { value: 'box', label: 'Rectangle [ ]' },
    { value: 'round', label: 'Rounded ( )' },
    { value: 'diamond', label: 'Diamond { }' },
    { value: 'circle', label: 'Circle (( ))' },
    { value: 'hexagon', label: 'Hexagon {{ }}' }
  ];
</script>

<div class="flex flex-col gap-0 overflow-y-auto">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border px-4 py-3">
    <p class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
      Node · <code class="font-mono">{nodeId}</code>
    </p>
    <button
      class="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      onclick={handleDelete}
      title="Delete node (also removes all connected edges)">
      <TrashIcon class="size-4" />
    </button>
  </div>

  <!-- ── Text ───────────────────────────────────────────────────────────────── -->
  <section class="flex flex-col gap-3 border-b border-border px-4 py-4">
    <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Text</p>

    <!-- Label -->
    <div class="space-y-1.5">
      <label for="node-label-input" class="text-sm font-medium">Label</label>
      <input
        id="node-label-input"
        class="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
        bind:value={labelInput}
        onblur={commitLabel}
        onkeydown={(e) => e.key === 'Enter' && commitLabel()} />
    </div>

    <!-- Formatting toggles -->
    <div class="flex gap-1">
      <button
        class="flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-sm transition-colors {bold
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-accent'}"
        onclick={() => updateCode(toggleNodeBold($stateStore.code ?? '', nodeId))}
        title="Toggle bold">
        <BoldIcon class="size-4" />
        Bold
      </button>
      <button
        class="flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-sm transition-colors {italic
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border hover:bg-accent'}"
        onclick={() => updateCode(toggleNodeItalic($stateStore.code ?? '', nodeId))}
        title="Toggle italic">
        <ItalicIcon class="size-4" />
        Italic
      </button>
    </div>
  </section>

  <!-- ── Visual ─────────────────────────────────────────────────────────────── -->
  <section class="flex flex-col gap-3 border-b border-border px-4 py-4">
    <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Visual</p>

    <!-- Shape -->
    <div class="space-y-1.5">
      <label for="node-shape-select" class="text-sm font-medium">Shape</label>
      <select
        id="node-shape-select"
        class="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        onchange={(e) =>
          updateCode(
            changeNodeShape(
              $stateStore.code ?? '',
              nodeId,
              (e.target as HTMLSelectElement).value as NodeShape
            )
          )}>
        {#each SHAPES as s (s.value)}
          <option value={s.value}>{s.label}</option>
        {/each}
      </select>
    </div>

    <!-- Icon -->
    <div class="space-y-1.5">
      <p class="text-sm font-medium">Icon</p>

      {#if currentIcon}
        <div class="flex items-center gap-2 rounded border border-border bg-muted/20 px-2 py-1.5">
          <img
            src={iconifyUrl(currentIcon)}
            alt={currentIcon}
            class="size-5 shrink-0"
            style="color: currentColor" />
          <code class="flex-1 truncate font-mono text-xs text-muted-foreground">{currentIcon}</code>
          <button
            class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onclick={() => updateCode(removeFlowchartIcon($stateStore.code ?? '', nodeId))}
            title="Remove icon">
            <TrashIcon class="size-3.5" />
          </button>
        </div>
      {/if}

      <input
        id="node-icon-search"
        class="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
        placeholder={currentIcon ? 'Search to change…' : 'Search icons…'}
        bind:value={iconQuery}
        oninput={() => searchIcons(iconQuery)} />

      {#if iconResults.length > 0}
        <div
          class="grid max-h-36 grid-cols-5 gap-1 overflow-y-auto rounded border border-border bg-background p-1">
          {#each iconResults as icon (icon)}
            <button
              class="flex flex-col items-center gap-0.5 rounded p-1 transition-colors hover:bg-accent"
              title={icon}
              onclick={() => setIcon(icon)}>
              <img src={iconifyUrl(icon)} alt={icon} class="size-6" />
              <span class="w-full truncate text-center text-[9px] text-muted-foreground"
                >{icon.split(':')[1] ?? icon}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- ── Color ──────────────────────────────────────────────────────────────── -->
  <section class="flex flex-col gap-3 border-b border-border px-4 py-4">
    <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Color</p>

    <!-- Fill -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Fill</p>
        <button
          class="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => updateCode(removeStyleProp($stateStore.code ?? '', nodeId, 'fill'))}>
          Reset
        </button>
      </div>
      <div class="flex items-center gap-2">
        <!-- Stylized swatch + native picker overlay -->
        <label
          class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded border border-border shadow-sm"
          title="Pick fill color">
          <div class="absolute inset-0" style="background:{fillInput}"></div>
          <input
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={fillInput}
            oninput={(e) => {
              fillInput = (e.target as HTMLInputElement).value;
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'fill', fillInput));
            }} />
        </label>
        <input
          type="text"
          class="h-7 flex-1 rounded border border-border bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="#ffffff"
          bind:value={fillInput}
          oninput={() => {
            if (isValidHex(fillInput)) {
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'fill', fillInput));
            }
          }} />
      </div>
    </div>

    <!-- Outline -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Outline</p>
        <button
          class="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => updateCode(removeStyleProp($stateStore.code ?? '', nodeId, 'stroke'))}>
          Reset
        </button>
      </div>
      <div class="flex items-center gap-2">
        <label
          class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded border border-border shadow-sm"
          title="Pick outline color">
          <div class="absolute inset-0" style="background:{strokeInput}"></div>
          <input
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={strokeInput}
            oninput={(e) => {
              strokeInput = (e.target as HTMLInputElement).value;
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'stroke', strokeInput));
            }} />
        </label>
        <input
          type="text"
          class="h-7 flex-1 rounded border border-border bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="#333333"
          bind:value={strokeInput}
          oninput={() => {
            if (isValidHex(strokeInput)) {
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'stroke', strokeInput));
            }
          }} />
      </div>
    </div>

    <!-- Text color -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Text</p>
        <button
          class="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onclick={() => updateCode(removeStyleProp($stateStore.code ?? '', nodeId, 'color'))}>
          Reset
        </button>
      </div>
      <div class="flex items-center gap-2">
        <label
          class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded border border-border shadow-sm"
          title="Pick text color">
          <div class="absolute inset-0" style="background:{textColorInput}"></div>
          <input
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={textColorInput}
            oninput={(e) => {
              textColorInput = (e.target as HTMLInputElement).value;
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'color', textColorInput));
            }} />
        </label>
        <input
          type="text"
          class="h-7 flex-1 rounded border border-border bg-background px-2 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="#333333"
          bind:value={textColorInput}
          oninput={() => {
            if (isValidHex(textColorInput)) {
              updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'color', textColorInput));
            }
          }} />
      </div>
    </div>
  </section>

  <!-- ── Border ─────────────────────────────────────────────────────────────── -->
  <section class="flex flex-col gap-3 px-4 py-4">
    <p class="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Border</p>

    <!-- Width -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">Width</p>
        <div class="flex items-center gap-2">
          <span class="font-mono text-xs text-muted-foreground">{currentStrokeWidthNum}px</span>
          <button
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
            onclick={() =>
              updateCode(removeStyleProp($stateStore.code ?? '', nodeId, 'stroke-width'))}>
            Reset
          </button>
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="8"
        step="1"
        class="w-full accent-primary"
        value={currentStrokeWidthNum}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'stroke-width', `${v}px`));
        }} />
      <div class="flex justify-between text-[10px] text-muted-foreground">
        <span>1px</span>
        <span>8px</span>
      </div>
    </div>

    <!-- Style: solid / dashed -->
    <div class="space-y-1.5">
      <p class="text-sm font-medium">Style</p>
      <div class="grid grid-cols-2 gap-1">
        <button
          class="rounded border px-2 py-1.5 text-xs transition-colors {!isDashed
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:bg-accent'}"
          onclick={() =>
            updateCode(removeStyleProp($stateStore.code ?? '', nodeId, 'stroke-dasharray'))}>
          Solid
        </button>
        <button
          class="rounded border px-2 py-1.5 text-xs transition-colors {isDashed
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:bg-accent'}"
          onclick={() =>
            updateCode(applyStyleProp($stateStore.code ?? '', nodeId, 'stroke-dasharray', '5 5'))}>
          Dashed
        </button>
      </div>
    </div>
  </section>
</div>
