<script lang="ts">
  import { Button } from '$/components/ui/button';
  import LightbulbIcon from '~icons/material-symbols/lightbulb';
  import PlayIcon from '~icons/material-symbols/play-arrow';
  import SchoolIcon from '~icons/material-symbols/school';
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { toast } from 'svelte-sonner';

  let activeStage = $state('beginner');

  function loadSnippet(code: string, theme = 'default') {
    let themeConfig: Record<string, unknown>;
    try {
      const currentConfig = JSON.parse($stateStore.mermaid);
      const isDark = currentConfig.theme === 'dark';
      // If a specific theme isn't requested, try to persist dark mode if it's currently active.
      themeConfig = { theme: isDark && theme === 'default' ? 'dark' : theme };
    } catch {
      themeConfig = { theme };
    }

    updateCodeStore({
      code: code.trim(),
      mermaid: JSON.stringify(themeConfig, null, 2),
      pan: undefined,
      updateDiagram: true,
      zoom: undefined
    });
    // Visual feedback
    toast.success(`Loaded snippet in editor`);
  }

  const snippetBeginner1 = `flowchart TD\n  A[Start Node] --> B(End Node)`;
  const snippetBeginner2 = `flowchart LR\n  A[Start] -->|Text on link| B{Decision}\n  B -->|Yes| C[Do this]\n  B -->|No| D[Do that]`;
  const snippetSequence1 = `sequenceDiagram\n  participant Alice\n  participant Bob\n  Alice->>Bob: Hello Bob, how are you?\n  Bob-->>Alice: I am good thanks!`;

  const snippetAdvanced1 = `flowchart TB\n  c1-->a2\n  subgraph one\n    a1-->a2\n  end\n  subgraph two\n    b1-->b2\n  end\n  subgraph three\n    c1-->c2\n  end`;
  const snippetAdvanced2 = `flowchart LR\n  A:::myClass --> B\n  C --> D\n  classDef myClass fill:#f9f,stroke:#333,stroke-width:4px;\n  style C fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5`;
  const snippetAdvanced3 = `gantt\n  title Project Timeline\n  dateFormat  YYYY-MM-DD\n  section Planning\n  Define Scope       :a1, 2024-01-01, 7d\n  Design Mockups     :after a1, 5d`;
  const snippetAdvanced4 = `stateDiagram-v2\n  [*] --> Still\n  Still --> [*]\n  Still --> Moving\n  Moving --> Still\n  Moving --> Crash\n  Crash --> [*]`;

  const snippetPro1 = `%%\n{ "theme": "forest", "flowchart": { "curve": "step" } }\n%%\nflowchart TD\n  A[Start] --> B[Step 1]\n  B --> C[Step 2]\n  C --> D[End]`;
  const snippetPro2 = `architecture-beta\n  group api(cloud)[API Gateway]\n  service db(database)[Database] in api\n  service web(internet)[Web App]\n  web:L -- R:api\n  api:L -- R:db`;
  const snippetPro3 = `gitGraph\n  commit\n  branch feature-a\n  checkout feature-a\n  commit id: "add login"\n  checkout main\n  merge feature-a`;
</script>

<div class="flex h-full flex-col overflow-hidden bg-background">
  <div class="flex items-center gap-2 border-b p-4">
    <SchoolIcon class="size-5 text-primary" />
    <h2 class="font-bold tracking-tight">Learning Stages</h2>
  </div>

  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Stage Navigation Tabs -->
    <div class="border-b px-4 pt-2">
      <div class="grid w-full grid-cols-3 gap-1">
        <button
          class="border-b-2 px-3 py-2 text-sm font-medium transition-colors {activeStage ===
          'beginner'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground'}"
          onclick={() => (activeStage = 'beginner')}>
          Beginner
        </button>
        <button
          class="border-b-2 px-3 py-2 text-sm font-medium transition-colors {activeStage ===
          'advanced'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground'}"
          onclick={() => (activeStage = 'advanced')}>
          Advanced
        </button>
        <button
          class="border-b-2 px-3 py-2 text-sm font-medium transition-colors {activeStage === 'pro'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground'}"
          onclick={() => (activeStage = 'pro')}>
          Pro
        </button>
      </div>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 space-y-8 overflow-y-auto p-4">
      {#if activeStage === 'beginner'}
        <div class="space-y-6">
          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">1</span>
              Flowcharts (The Basics)
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Flowcharts are the foundational diagram type. Start by declaring the type (`flowchart
              TD` for Top-Down), then add nodes and connect them with links (`-->`).
            </p>
            <div class="space-y-2">
              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetBeginner1)}>
                <div class="mb-1 text-xs font-semibold text-foreground">Basic Nodes & Links</div>
                <pre
                  class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetBeginner1}</pre>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>

              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetBeginner2)}>
                <div class="mb-1 text-xs font-semibold text-foreground">Directions & Link Text</div>
                <pre
                  class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetBeginner2}</pre>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>
            </div>
          </div>

          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">2</span>
              Sequence Diagrams
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Great for showing how systems interact over time. Use participants and define exact
              messages.
            </p>
            <div class="space-y-2">
              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetSequence1)}>
                <div class="mb-1 text-xs font-semibold text-foreground">
                  Messages & Participants
                </div>
                <pre
                  class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetSequence1}</pre>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if activeStage === 'advanced'}
        <div class="space-y-6">
          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">1</span>
              Grouping with Subgraphs
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Organize complex Flowcharts by grouping nodes into distinct logical areas.
            </p>
            <button
              class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
              onclick={() => loadSnippet(snippetAdvanced1)}>
              <div class="mb-1 text-xs font-semibold text-foreground">Subgraphs</div>
              <pre
                class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetAdvanced1}</pre>
              <div
                class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                <PlayIcon class="size-5 text-primary" />
              </div>
            </button>
          </div>

          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">2</span>
              Styling & Classes
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Customize colors and shapes of individual diagram elements using `style` or apply
              shared rules with `classDef`.
            </p>
            <button
              class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
              onclick={() => loadSnippet(snippetAdvanced2)}>
              <div class="mb-1 text-xs font-semibold text-foreground">
                Direct Style & Class Definitions
              </div>
              <pre
                class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetAdvanced2}</pre>
              <div
                class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                <PlayIcon class="size-5 text-primary" />
              </div>
            </button>
          </div>

          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">3</span>
              State & Gantt Charts
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Advanced diagram types require specific syntax structures like tracking dates or
              tracking application state transitions.
            </p>
            <div class="space-y-2">
              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetAdvanced3)}>
                <div class="mb-1 text-xs font-semibold text-foreground">Gantt Chart Formatting</div>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>
              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetAdvanced4)}>
                <div class="mb-1 text-xs font-semibold text-foreground">State Diagrams</div>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if activeStage === 'pro'}
        <div class="space-y-6">
          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">1</span>
              Global Directives & Config
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Pass JSON configuration directly within the markdown to override specific diagram
              render settings or change themes on the fly.
            </p>
            <button
              class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
              onclick={() => loadSnippet(snippetPro1)}>
              <div class="mb-1 text-xs font-semibold text-foreground">
                Directives (Forest Theme, Step Curves)
              </div>
              <pre
                class="overflow-x-auto rounded bg-muted p-2 text-xs text-foreground">{snippetPro1}</pre>
              <div
                class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                <PlayIcon class="size-5 text-primary" />
              </div>
            </button>
          </div>

          <div class="rounded-lg border bg-card p-4">
            <h3 class="mb-2 flex items-center gap-2 text-lg font-semibold">
              <span class="rounded bg-primary/10 p-1 text-primary">2</span>
              Architectural & Specialty
            </h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Master complex plugins like Git Graphs (branching logic), Sankey (flow visualization),
              and Architecture (infrastructure).
            </p>
            <div class="space-y-2">
              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetPro2)}>
                <div class="mb-1 text-xs font-semibold text-foreground">
                  Beta Architecture Syntax
                </div>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>

              <button
                class="group relative w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50"
                onclick={() => loadSnippet(snippetPro3)}>
                <div class="mb-1 text-xs font-semibold text-foreground">Git Commit History</div>
                <div
                  class="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <PlayIcon class="size-5 text-primary" />
                </div>
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            class="mt-4 w-full gap-2"
            href="https://mermaid.js.org/config/theming.html"
            target="_blank">
            <LightbulbIcon />
            Advanced Theming Documentation
          </Button>
        </div>
      {/if}
    </div>
  </div>
</div>
