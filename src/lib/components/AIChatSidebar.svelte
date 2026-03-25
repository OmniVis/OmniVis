<script lang="ts">
  import { generateDiagram, getConfig, saveConfig } from '$/util/aiService';
  import { packFileContent } from '$/util/fileContent';
  import { SvelteMap } from 'svelte/reactivity';
  import type { ChatMessage, AIServiceConfig } from '$/util/aiService';
  import { Button } from '$/components/ui/button';
  import SparklesIcon from '~icons/material-symbols/auto-awesome';
  import SendIcon from '~icons/material-symbols/send';
  import DeleteIcon from '~icons/material-symbols/delete-outline';
  import CloseIcon from '~icons/material-symbols/close';
  import SettingsIcon from '~icons/material-symbols/settings-outline';
  import UserIcon from '~icons/material-symbols/person';
  import RobotIcon from '~icons/material-symbols/smart-toy-outline';
  import ChevronDownIcon from '~icons/material-symbols/keyboard-arrow-down';
  import AddNoteIcon from '~icons/material-symbols/note-add-outline';
  import FullscreenIcon from '~icons/material-symbols/fullscreen';
  import CheckIcon from '~icons/material-symbols/check-circle-outline';
  import AIIcon from '~icons/material-symbols/auto-awesome';
  import Mermaid from 'mermaid';
  import { createVirtualFile } from '$lib/util/siteWorkspace.svelte';
  import { toast } from 'svelte-sonner';

  interface Props {
    currentCode: string;
    onInsertCode: (code: string) => void;
    onReplaceCode: (code: string) => void;
    onClose: () => void;
  }

  let { currentCode, onInsertCode, onReplaceCode, onClose }: Props = $props();

  let messages: ChatMessage[] = $state([]);
  let inputText = $state('');
  let isLoading = $state(false);
  let error = $state('');
  let showSettings = $state(false);

  // Settings
  let apiKey = $state('');
  let provider = $state<'gemini' | 'openai' | 'groq' | 'anthropic'>('groq'); // Default to Groq
  let model = $state('llama-3.3-70b-versatile');

  // Load existing config
  $effect(() => {
    const config = getConfig();
    if (config) {
      apiKey = config.apiKey;
      provider = config.provider;
      model = config.model || '';
    } else {
      showSettings = true;
    }
  });

  function saveSettings() {
    const config: AIServiceConfig = {
      apiKey,
      model: model || undefined,
      provider
    };
    saveConfig(config);
    showSettings = false;
    error = '';
  }

  async function sendMessage() {
    if (!inputText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now()
    };

    messages = [...messages, userMsg];
    const messageText = inputText;
    inputText = '';
    isLoading = true;
    error = '';

    try {
      const response = await generateDiagram(messageText, currentCode, messages);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      messages = [...messages, assistantMsg];
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function replaceCode(code: string) {
    if (onReplaceCode) {
      onReplaceCode(code);
    } else {
      console.error('onReplaceCode prop is missing');
      onInsertCode(code);
    }
  }

  async function newFileFromCode(code: string, fileName?: string) {
    const finalName = fileName || 'AI-Diagram.dia';
    try {
      const formattedContent = packFileContent(code, '{}');
      await createVirtualFile(finalName, formattedContent, 'root');
      toast.success(`Saved as ${finalName} in workspace!`);
    } catch {
      toast.error('Failed to create new file.');
    }
  }

  // Fullscreen support
  let fullscreenCode = $state<string | null>(null);

  function clearChat() {
    messages = [];
    error = '';
  }

  interface ParsedBlock {
    type: 'text' | 'mermaid';
    content: string;
    filename?: string;
  }

  function parseMessageBlocks(content: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];

    // Look for filename suggestion: [Suggested Filename: name.mmd]
    const filenameRegex = /\[Suggested Filename:\s*(.*?)\]/i;
    const filenameMatch = content.match(filenameRegex);
    const suggestedFilename = filenameMatch ? filenameMatch[1].trim() : undefined;

    // Matches ```mermaid\n ... \n```
    const regex = /```(?:mermaid)?\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add preceding text
      if (match.index > lastIndex) {
        let text = content.substring(lastIndex, match.index).trim();
        // Remove the filename tag from the text part if it's there
        text = text.replace(filenameRegex, '').trim();
        if (text) blocks.push({ type: 'text', content: text });
      }
      // Add mermaid block
      blocks.push({
        type: 'mermaid',
        content: match[1].trim(),
        filename: suggestedFilename
      });
      lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      let remaining = content.substring(lastIndex).trim();
      remaining = remaining.replace(filenameRegex, '').trim();
      if (remaining) blocks.push({ type: 'text', content: remaining });
    }

    // Fallback if AI just dumped plain text without fences, but it looks like a diagram
    if (blocks.length === 0) {
      if (
        content.match(
          /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|gantt|pie|gitGraph|mindmap|timeline|xychart-beta|block-beta|packet-beta|journey)/im
        )
      ) {
        return [{ type: 'mermaid', content: content.trim(), filename: suggestedFilename }];
      }
      return [{ type: 'text', content: content.trim().replace(filenameRegex, '').trim() }];
    }

    return blocks;
  }

  // Cache SVG renderings to avoid re-rendering on every Svelte update tick
  const svgCache = new SvelteMap<string, string>();

  async function renderMermaidPreview(code: string, id: string): Promise<string> {
    const cached = svgCache.get(code);
    if (cached) return cached;
    try {
      Mermaid.initialize({ startOnLoad: false, suppressErrorRendering: true, theme: 'default' });
      const { svg } = await Mermaid.render(`ai-preview-${id}`, code);
      svgCache.set(code, svg);
      return svg;
    } catch {
      // Clean up any mermaid error elements leaked into the DOM
      document
        .querySelectorAll('[id^="dai-preview-"], #d-error, [id^="dmermaid-"]')
        .forEach((el) => el.remove());
      return `<div class="text-destructive p-2 text-xs">Syntax Error rendering diagram preview.</div><pre class="text-[10px] overflow-x-auto p-2 bg-background">${code}</pre>`;
    }
  }

  /* Custom Dropdown Logic */
  let showProviderDropdown = $state(false);

  const providers = [
    { value: 'groq', label: 'Groq (Fast & Free)', icon: '⚡' },
    { value: 'gemini', label: 'Google Gemini', icon: '💎' },
    { value: 'anthropic', label: 'Anthropic Claude', icon: '🧠' },
    { value: 'openai', label: 'OpenAI', icon: '🤖' }
  ];

  const models = {
    groq: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Fast)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ],
    gemini: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fast)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Capable)' }
    ],
    anthropic: [
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Smart)' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Fast)' }
    ],
    openai: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
      { value: 'gpt-4o', label: 'GPT-4o (Smart)' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ]
  };

  let showModelDropdown = $state(false);

  function selectProvider(p: 'groq' | 'gemini' | 'openai' | 'anthropic') {
    provider = p;
    showProviderDropdown = false;
    // Set default models
    if (provider === 'groq') model = 'llama-3.3-70b-versatile';
    else if (provider === 'gemini') model = 'gemini-2.0-flash';
    else if (provider === 'anthropic') model = 'claude-3-7-sonnet-latest';
    else if (provider === 'openai') model = 'gpt-4o-mini';
  }

  function selectModel(m: string) {
    model = m;
    showModelDropdown = false;
  }
</script>

<div
  class="flex h-full w-full max-w-[420px] min-w-[200px] flex-col border-l border-border bg-card text-sm">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border bg-muted/30 p-2">
    <div class="flex items-center gap-1.5 px-1">
      <SparklesIcon class="size-4 text-primary" />
      <h3 class="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
        AI Assistant
      </h3>
    </div>
    <div class="flex gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        class={showSettings ? 'size-6 bg-muted' : 'size-6'}
        onclick={() => (showSettings = !showSettings)}
        title="Settings">
        <SettingsIcon class="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="size-6" onclick={clearChat} title="Clear chat">
        <DeleteIcon class="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" class="size-6" onclick={onClose} title="Close">
        <CloseIcon class="size-3.5" />
      </Button>
    </div>
  </div>

  <!-- Settings Panel -->
  {#if showSettings}
    <div class="glass-subtle flex flex-col gap-3 border-b border-border bg-muted/15 p-3">
      <div class="flex flex-col gap-1">
        <span class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
          >Provider</span>
        <div class="relative w-full">
          <button
            class="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/50"
            onclick={() => (showProviderDropdown = !showProviderDropdown)}>
            {#if provider === 'groq'}
              <span>⚡ Groq (Fast & Free)</span>
            {:else if provider === 'gemini'}
              <span>💎 Google Gemini</span>
            {:else if provider === 'anthropic'}
              <span>🧠 Anthropic Claude</span>
            {:else}
              <span>🤖 OpenAI</span>
            {/if}
            <ChevronDownIcon class="size-4 opacity-50" />
          </button>

          {#if showProviderDropdown}
            <div
              class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
              {#each providers as p (p.value)}
                <button
                  class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground {provider ===
                  p.value
                    ? 'bg-primary/10 font-medium text-primary'
                    : ''}"
                  onclick={() =>
                    selectProvider(p.value as 'groq' | 'gemini' | 'openai' | 'anthropic')}>
                  <span>{p.icon} {p.label}</span>
                  {#if provider === p.value}✓{/if}
                </button>
              {/each}
            </div>
            <!-- Overlay to close -->
            <button
              class="fixed inset-0 z-40 cursor-default"
              style="background: transparent;"
              onclick={() => (showProviderDropdown = false)}
              aria-label="Close dropdown"></button>
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="ai-key"
          class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          API Key
          {#if provider === 'groq'}
            (<a
              href="https://console.groq.com/keys"
              target="_blank"
              class="text-primary hover:underline">Get Key</a
            >)
          {:else if provider === 'gemini'}
            (<a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              class="text-primary hover:underline">Get Key</a
            >)
          {:else if provider === 'anthropic'}
            (<a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              class="text-primary hover:underline">Get Key</a
            >)
          {/if}
        </label>
        <input
          id="ai-key"
          type="password"
          class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder={provider === 'gemini'
            ? 'AIza...'
            : provider === 'groq'
              ? 'gsk_...'
              : 'sk-...'}
          bind:value={apiKey} />
      </div>

      <div class="flex flex-col gap-1">
        <label
          for="ai-model"
          class="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Model</label>
        <div class="relative w-full">
          <button
            class="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/50"
            onclick={() => (showModelDropdown = !showModelDropdown)}>
            <span>{models[provider]?.find((m) => m.value === model)?.label || model}</span>
            <ChevronDownIcon class="size-4 opacity-50" />
          </button>

          {#if showModelDropdown}
            <div
              class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
              {#each models[provider] || [] as m (m.value)}
                <button
                  class="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground {model ===
                  m.value
                    ? 'bg-primary/10 font-medium text-primary'
                    : ''}"
                  onclick={() => selectModel(m.value)}>
                  <span>{m.label}</span>
                  {#if model === m.value}✓{/if}
                </button>
              {/each}
            </div>
            <button
              class="fixed inset-0 z-40 cursor-default"
              style="background: transparent;"
              onclick={() => (showModelDropdown = false)}
              aria-label="Close dropdown"></button>
          {/if}
        </div>
      </div>

      <div class="mt-1 flex gap-2">
        <Button size="sm" onclick={saveSettings} class="h-8 w-full text-xs font-bold"
          >Save Settings</Button>
      </div>
    </div>
  {/if}

  <!-- Messages -->
  <div class="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
    {#if messages.length === 0}
      <div
        class="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div
          class="mb-2 flex flex-col items-center gap-2 text-[15px] font-bold tracking-tight text-foreground">
          <div
            class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
            <SparklesIcon class="size-6 text-primary" />
          </div>
          Text to Diagram
        </div>
        <p class="mb-6 text-xs leading-relaxed">
          Describe what you want and I'll generate the Mermaid code.
        </p>

        <div class="flex flex-wrap justify-center gap-2">
          {#each ['Login flow', 'Blog ER diagram', 'CI/CD pipeline'] as label (label)}
            <button
              class="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/30 hover:bg-primary/10"
              onclick={() => {
                if (label === 'Login flow') inputText = 'Create a login flow diagram';
                if (label === 'Blog ER diagram')
                  inputText = 'Create a database ER diagram for a blog';
                if (label === 'CI/CD pipeline') inputText = 'Create a CI/CD pipeline diagram';
                sendMessage();
              }}>
              {label}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#each messages as msg (msg.timestamp)}
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
          {#if msg.role === 'user'}
            <UserIcon class="size-3.5" />
          {:else}
            <RobotIcon class="size-3.5 text-primary" />
          {/if}
        </div>

        <div class="min-w-0 flex-1">
          {#if msg.role === 'user'}
            <div
              class="max-w-[90%] rounded-2xl rounded-tl-sm bg-primary px-3.5 py-2 text-xs leading-relaxed break-words text-primary-foreground shadow-sm">
              {msg.content}
            </div>
          {:else}
            <div class="flex w-[290px] flex-col gap-2">
              {#each parseMessageBlocks(msg.content) as block, idx (idx)}
                {#if block.type === 'text'}
                  <div
                    class="rounded-2xl border border-border bg-muted/30 p-3 text-xs leading-relaxed break-words shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] {idx ===
                    0
                      ? 'rounded-tr-sm'
                      : ''}">
                    {block.content}
                  </div>
                {:else}
                  <div
                    class="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div
                      class="flex items-center justify-between border-b border-border bg-muted/20 p-2 transition-all">
                      <div class="flex flex-col gap-0.5 pl-1">
                        <span
                          class="font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
                          >Diagram Preview</span>
                        {#if block.filename}
                          <span class="max-w-[150px] truncate text-[9px] font-bold text-primary">
                            {block.filename}
                          </span>
                        {/if}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        class="size-6 text-muted-foreground hover:text-primary"
                        onclick={() => (fullscreenCode = block.content)}
                        title="View Fullscreen">
                        <FullscreenIcon class="size-3.5" />
                      </Button>
                    </div>
                    <div
                      class="flex min-h-[120px] w-full items-center justify-center overflow-hidden bg-white p-3"
                      style="container-type: inline-size;">
                      {#await renderMermaidPreview(block.content, `${msg.timestamp}-${idx}`)}
                        <div
                          class="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent">
                        </div>
                      {:then svgHtml}
                        <div
                          class="pointer-events-none flex w-full justify-center [&>svg]:h-auto [&>svg]:max-h-[250px] [&>svg]:max-w-full">
                          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                          {@html svgHtml}
                        </div>
                      {/await}
                    </div>
                    <div
                      class="flex flex-wrap justify-center gap-1.5 border-t border-border bg-muted/30 p-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        class="h-7 flex-1 gap-1 px-2.5 text-[10px] font-bold"
                        onclick={() => replaceCode(block.content)}
                        title="Overwrites the editor code">
                        <CheckIcon class="size-3" />
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        class="h-7 flex-1 shrink-0 gap-1.5 border-dashed bg-background/50 px-2.5 text-[10px] font-bold text-muted-foreground shadow-sm transition-all hover:bg-primary/5 hover:text-primary active:scale-95"
                        onclick={() => newFileFromCode(block.content, block.filename)}
                        title="Saves as a new file in workspace">
                        <AddNoteIcon class="size-3" />
                        {block.filename ? 'Save to Workspace' : 'New File'}
                      </Button>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}

    {#if isLoading}
      <div class="flex items-start gap-3">
        <div
          class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted shadow-sm">
          <RobotIcon class="size-3.5 text-primary" />
        </div>
        <div
          class="flex h-9 items-center rounded-2xl rounded-tr-sm border border-border bg-muted/30 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div class="flex gap-1">
            <span class="block size-1.5 animate-bounce rounded-full bg-primary opacity-60"></span>
            <span
              class="block size-1.5 animate-bounce rounded-full bg-primary opacity-60"
              style="animation-delay: 0.2s"></span>
            <span
              class="block size-1.5 animate-bounce rounded-full bg-primary opacity-60"
              style="animation-delay: 0.4s"></span>
          </div>
        </div>
      </div>
    {/if}

    {#if error}
      <div
        class="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive shadow-sm">
        {error}
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="flex items-end gap-2 border-t border-border bg-background/50 p-3 backdrop-blur-md">
    <textarea
      class="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
      placeholder="Wait what diagram should i compose?"
      bind:value={inputText}
      onkeydown={handleKeydown}
      rows="2"></textarea>
    <Button
      size="icon"
      class="mb-0.5 size-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
      onclick={sendMessage}
      disabled={isLoading || !inputText.trim()}>
      {#if isLoading}
        <div
          class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent">
        </div>
      {:else}
        <SendIcon class="size-4" />
      {/if}
    </Button>
  </div>
</div>

{#if fullscreenCode}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm transition-all md:p-12">
    <div
      class="animation-in relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl duration-200 zoom-in-95 fade-in">
      <div
        class="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 p-3">
        <div class="flex items-center gap-2 pl-2">
          <AIIcon class="size-4 text-primary" />
          <span class="text-sm font-bold tracking-tight">AI Generated Diagram Detail</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          class="size-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
          onclick={() => (fullscreenCode = null)}>
          <CloseIcon class="size-4" />
        </Button>
      </div>

      <!-- Split View Fullscreen -->
      <div
        class="flex flex-1 flex-col divide-y divide-border overflow-hidden md:flex-row md:divide-x md:divide-y-0">
        <div
          class="flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-white p-8">
          {#await renderMermaidPreview(fullscreenCode, 'fullscreen')}
            <div
              class="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent">
            </div>
          {:then svgHtml}
            <div
              class="diagram-zoom-container flex w-full justify-center [&>svg]:h-auto [&>svg]:max-w-full">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html svgHtml}
            </div>
          {/await}
        </div>
        <div class="flex w-full shrink-0 flex-col gap-3 bg-muted/10 p-4 md:w-[400px]">
          <div class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            Mermaid Source Code
          </div>
          <div
            class="relative flex-1 overflow-hidden rounded-lg border border-border bg-background/50 shadow-inner">
            <pre class="textxs h-full w-full overflow-auto p-4 font-mono">{fullscreenCode}</pre>
          </div>
          <div class="flex shrink-0 gap-2 pt-2">
            <Button
              variant="default"
              class="flex-1 gap-1.5 font-bold shadow-sm"
              onclick={() => {
                if (fullscreenCode) replaceCode(fullscreenCode);
                fullscreenCode = null;
              }}>
              <CheckIcon class="size-4" /> Replace
            </Button>
            <Button
              variant="outline"
              class="flex-1 gap-1.5 bg-background font-bold shadow-sm"
              onclick={() => {
                if (fullscreenCode) newFileFromCode(fullscreenCode);
                fullscreenCode = null;
              }}>
              <AddNoteIcon class="size-4" /> New File
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
