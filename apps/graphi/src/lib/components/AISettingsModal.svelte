<script lang="ts">
  import * as Dialog from '$/components/ui/dialog';
  import { Button } from '$/components/ui/button';
  import { Input } from '$/components/ui/input';
  import { getConfig, saveConfig, type AIServiceConfig } from '$/util/aiService';
  import {
    Key,
    Settings,
    Info,
    Eye,
    EyeOff,
    ExternalLink,
    Trash2,
    Sparkles,
    ShieldCheck
  } from 'lucide-svelte';
  import GeminiIcon from '$lib/icons/GeminiIcon.svelte';
  import ClaudeIcon from '$lib/icons/ClaudeIcon.svelte';
  import OpenAIIcon from '$lib/icons/OpenAIIcon.svelte';
  import AdessoIcon from '$lib/icons/AdessoIcon.svelte';
  import { cn } from '$lib/utils';
  import { toast } from 'svelte-sonner';

  interface Props {
    open: boolean;
  }

  let { open = $bindable() }: Props = $props();

  type Tab = 'api' | 'general' | 'about';
  let activeTab = $state<Tab>('api');

  // Config state
  let config = $state<AIServiceConfig>({
    provider: 'adesso',
    keys: {},
    model: ''
  });

  let selectedProvider = $state<'gemini' | 'openai' | 'anthropic' | 'adesso'>('adesso');
  let showKey = $state(false);

  const providers = [
    {
      id: 'adesso',
      label: 'adesso AI Hub',
      icon: AdessoIcon,
      url: 'https://adesso-ai-hub.3asabc.de/'
    },
    {
      id: 'gemini',
      label: 'Google Gemini',
      icon: GeminiIcon,
      url: 'https://aistudio.google.com/app/apikey'
    },
    {
      id: 'anthropic',
      label: 'Anthropic Claude',
      icon: ClaudeIcon,
      url: 'https://console.anthropic.com/settings/keys'
    },
    { id: 'openai', label: 'OpenAI', icon: OpenAIIcon, url: 'https://platform.openai.com/api-keys' }
  ] as const;

  $effect(() => {
    if (open) {
      const stored = getConfig();
      if (stored) {
        config = { ...stored };
        selectedProvider = stored.provider;
      }
    }
  });

  function handleSave() {
    config.provider = selectedProvider;
    saveConfig(config);
    toast.success('AI settings saved!');
    open = false;
  }

  function handleClearKeys() {
    if (confirm('Are you sure you want to clear all API keys?')) {
      config.keys = {};
      saveConfig(config);
      toast.success('All API keys cleared.');
    }
  }

  const handleProviderSwitch = (id: typeof selectedProvider) => {
    selectedProvider = id;
    showKey = false;
  };
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    data-role="ai-settings-modal"
    class="flex min-h-[460px] max-w-2xl flex-col gap-0 overflow-hidden border-border/50 p-0 shadow-2xl md:flex-row">
    <!-- Sidebar -->
    <div
      class="flex w-full flex-col border-b border-border/50 bg-muted/30 p-6 md:w-56 md:border-r md:border-b-0">
      <div class="mb-8 flex items-center gap-3">
        <div class="flex size-8 items-center justify-center bg-primary">
          <Settings class="size-4 text-primary-foreground" />
        </div>
        <h2 class="text-xs font-black tracking-widest text-foreground uppercase">Settings</h2>
      </div>

      <nav class="flex-1 space-y-1.5">
        <button
          onclick={() => (activeTab = 'api')}
          class={cn(
            'flex w-full items-center gap-3 px-4 py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all',
            activeTab === 'api'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}>
          <Key class="size-4" />
          API Keys
        </button>
        <button
          onclick={() => (activeTab = 'general')}
          class={cn(
            'flex w-full items-center gap-3 px-4 py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all',
            activeTab === 'general'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}>
          <Settings class="size-4" />
          General
        </button>
        <button
          onclick={() => (activeTab = 'about')}
          class={cn(
            'flex w-full items-center gap-3 px-4 py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all',
            activeTab === 'about'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}>
          <ShieldCheck class="size-4" />
          About
        </button>
      </nav>

      <div class="mt-8 border-t border-border/50 pt-6">
        <p
          class="text-[9px] leading-relaxed font-bold tracking-widest text-muted-foreground uppercase">
          Graphi AI <span class="text-primary">v2.0</span>
        </p>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex flex-1 flex-col bg-background">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border/50 px-8 py-5">
        <h3 class="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">
          {activeTab === 'api' ? 'Bring Your Own Key' : activeTab.toUpperCase()}
        </h3>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto p-8">
        {#if activeTab === 'api'}
          <div class="animate-in space-y-6 duration-300 fade-in slide-in-from-bottom-2">
            <div class="space-y-2">
              <label class="text-[9px] font-black tracking-widest text-muted-foreground uppercase"
                >Select Provider</label>
              <div class="grid grid-cols-2 gap-2">
                {#each providers as p (p.id)}
                  <button
                    onclick={() => handleProviderSwitch(p.id)}
                    class={cn(
                      'flex items-center gap-2 border px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase transition-all',
                      selectedProvider === p.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    )}>
                    <p.icon class="size-3.5 shrink-0" />
                    {p.label}
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <div class="flex items-center justify-between">
                <label
                  for="provider-key"
                  class="text-[9px] font-black tracking-widest text-muted-foreground uppercase">
                  {providers.find((p) => p.id === selectedProvider)?.label} API Key
                </label>
                <a
                  href={providers.find((p) => p.id === selectedProvider)?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 text-[9px] font-bold tracking-wider text-primary uppercase hover:underline">
                  Get Key <ExternalLink class="size-2.5" />
                </a>
              </div>
              <div class="group relative">
                <Input
                  id="provider-key"
                  type={showKey ? 'text' : 'password'}
                  bind:value={config.keys[selectedProvider]}
                  placeholder="sk-..."
                  class="h-11 rounded-none border-border bg-muted/30 px-4 py-3 font-mono text-[13px] transition-all focus:bg-background" />
                <button
                  type="button"
                  onclick={() => (showKey = !showKey)}
                  class="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                  {#if showKey}
                    <EyeOff class="size-4" />
                  {:else}
                    <Eye class="size-4" />
                  {/if}
                </button>
              </div>
            </div>

            <div class="flex gap-3 border border-border/50 bg-muted/30 p-4">
              <Info class="mt-0.5 size-4 shrink-0 text-primary" />
              <p class="text-[11px] leading-relaxed text-muted-foreground">
                Keys are stored locally in your browser. They are never transmitted to our servers
                and are only used for direct AI requests.
              </p>
            </div>
          </div>
        {:else if activeTab === 'general'}
          <div class="animate-in space-y-8 duration-300 fade-in slide-in-from-bottom-2">
            <div class="space-y-4">
              <h4 class="text-[11px] font-black tracking-widest text-foreground uppercase">
                Data Management
              </h4>
              <div class="space-y-3">
                <button
                  onclick={handleClearKeys}
                  class="group flex w-full items-center justify-between border border-border bg-background p-4 transition-all hover:border-destructive/20 hover:bg-destructive/5">
                  <div class="flex items-center gap-3">
                    <Trash2
                      class="size-4 text-muted-foreground transition-colors group-hover:text-destructive" />
                    <div class="text-left">
                      <p
                        class="text-[11px] font-bold text-foreground uppercase transition-colors group-hover:text-destructive">
                        Reset All API Keys
                      </p>
                      <p class="text-[10px] text-muted-foreground">
                        Irreversibly removes all local credentials
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        {:else if activeTab === 'about'}
          <div
            class="animate-in space-y-6 py-4 text-center duration-300 fade-in slide-in-from-bottom-2">
            <div
              class="mb-2 inline-flex size-16 items-center justify-center border border-primary/20 bg-primary/10">
              <Sparkles class="size-8 text-primary" />
            </div>
            <div>
              <h4 class="text-lg font-black text-foreground">Graphi AI Assistant</h4>
              <p class="mt-1 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                PRIVATE & SECURE
              </p>
            </div>
            <div class="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
              A private-by-default AI diagramming tool. By bringing your own API keys, you maintain
              full control over your data and costs.
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 border-t border-border/50 bg-muted/5 px-8 py-5">
        <Button
          variant="ghost"
          onclick={() => (open = false)}
          class="px-6 py-2.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase hover:text-foreground">
          Cancel
        </Button>
        <Button
          onclick={handleSave}
          class="rounded-none bg-foreground px-8 py-2.5 text-[11px] font-bold tracking-widest text-background uppercase transition-all hover:bg-foreground/90">
          Save Changes
        </Button>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  /* Override the aggressive global box-shadow: none !important in app.css */
  :global([data-role='ai-settings-modal']) {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4) !important;
  }

  button {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
