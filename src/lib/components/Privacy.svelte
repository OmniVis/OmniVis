<script>
  import ExternalLinkWrapper from '$/components/ExternalLinkWrapper.svelte';
  import * as Dialog from '$/components/ui/dialog';
  import ShieldIcon from '~icons/material-symbols/shield-lock-outline-rounded';
</script>

<Dialog.Root>
  <Dialog.Trigger class="flex items-center gap-1">
    <ShieldIcon />
    <span class="hidden md:inline">Privacy</span>
  </Dialog.Trigger>
  <Dialog.Content
    class="max-h-full overflow-hidden overflow-y-auto border border-border bg-card p-12 text-card-foreground">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-xl font-bold">
        <ShieldIcon class="size-8 text-primary" />
        Data Security & Privacy
      </Dialog.Title>
    </Dialog.Header>

    <div class="mt-6 flex flex-col gap-4">
      <div class="rounded-xl border border-border bg-muted/30 p-4">
        <p class="mb-1 text-base font-semibold text-foreground">Your data stays local.</p>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Graphi is a local-first application. Your diagrams, configurations, and project files are
          stored locally on your device or in your designated Cloud Workspace. We do not track your
          usage or collect telemetry data.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-muted/30 p-4">
        <p class="mb-1 text-base font-semibold text-foreground">AI Assistant Usage</p>
        <p class="text-sm leading-relaxed text-muted-foreground">
          When using the AI Assistant, your active diagram code and prompts are sent directly to the
          AI provider you configure (Groq, Gemini, or OpenAI) using your own API key. No
          intermediate servers store this interaction.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-muted/30 p-4">
        <p class="mb-1 text-base font-semibold text-foreground">Mermaid Engine</p>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Graphi uses the open-source Mermaid.js engine to render diagrams. However, it operates
          entirely independently of the official Mermaid Live Editor and its associated services.
        </p>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
