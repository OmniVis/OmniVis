<script lang="ts">
  import { onMount } from 'svelte';
  import { Zap, ArrowRight, Settings, Download } from 'lucide-svelte';

  import SiteNavbar from '$/components/SiteNavbar.svelte';
  import { base } from '$app/paths';
  import { mode } from 'mode-watcher';

  const title = 'Graphi - Diagramming for everyone';
  const description =
    'Create beautiful diagrams with valid Markdown and Mermaid logic. The editor for professionals.';

  onMount(() => {
    // Landing page mounted
  });
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <style>
    @keyframes dash {
      to {
        stroke-dashoffset: -8;
      }
    }
  </style>
</svelte:head>

<div
  class="min-h-screen bg-background font-sans text-foreground transition-colors duration-300 selection:bg-indigo-100 selection:text-indigo-900">
  <SiteNavbar />

  <main>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-background pt-16 pb-32">
      <div
        class="pointer-events-none absolute top-0 left-1/2 h-[800px] w-full -translate-x-1/2 opacity-10">
        <div
          class="absolute inset-0 bg-[linear-gradient(to_right,theme(colors.muted.foreground/0.1)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.muted.foreground/0.1)_1px,transparent_1px)] bg-[size:24px_24px]">
        </div>
      </div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div
          class="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          <Zap class="h-4 w-4" />
          <span>Graphi brings code-to-diagrams alive.</span>
        </div>

        <h1
          class="mb-6 text-5xl leading-tight font-extrabold tracking-tight text-foreground md:text-7xl">
          Diagrams for <span
            class="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"
            >everyone.</span
          ><br />
          Simple, fast, code-driven.
        </h1>

        <p class="mx-auto mt-4 mb-10 max-w-2xl text-xl text-muted-foreground">
          The intuitive diagramming tool built on Mermaid.js. Create Flowcharts, Architecture
          diagrams, and Mindmaps instantly – directly in your browser.
        </p>

        <div class="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="{base}/edit/"
            class="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg">
            Open Web Editor
            <ArrowRight class="h-5 w-5" />
          </a>
        </div>

        <!-- Hero Mockup Canvas -->
        <div class="relative mx-auto max-w-5xl animate-in duration-700 slide-in-from-bottom-5">
          <div
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white/50 shadow-2xl backdrop-blur-sm">
            <div class="flex h-12 items-center gap-4 border-b border-gray-200 bg-gray-50/80 px-4">
              <div class="flex gap-1.5">
                <div class="h-3 w-3 rounded-full bg-red-400"></div>
                <div class="h-3 w-3 rounded-full bg-amber-400"></div>
                <div class="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
              <div class="flex flex-1 justify-center">
                <div
                  class="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
                  <span>architecture.mermaid</span>
                </div>
              </div>
              <div class="flex -space-x-2">
                <img
                  src="{base}/branding/graphi-logomark-on-{$mode === 'dark' ? 'dark' : 'light'}.png"
                  alt="Graphi"
                  class="h-8 w-auto rounded-full border-2 border-white object-contain" />
              </div>
            </div>

            <!-- Display Diagram Logic -->
            <div
              class="relative flex h-[400px] items-center justify-center overflow-hidden bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] md:h-[500px]">
              <!-- Visual Mockup similar to the template, but simplified for Svelte -->
              <div
                class="absolute top-1/4 left-1/4 z-10 w-48 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-indigo-400 bg-white p-4 text-left shadow-sm">
                <div class="mb-1 text-sm font-bold text-gray-800">Graphi Client</div>
                <div class="text-xs text-gray-500">SvelteKit Frontend</div>
              </div>

              <div
                class="absolute top-1/2 left-1/2 z-10 w-56 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-indigo-700 bg-indigo-600 p-4 text-left text-white shadow-md">
                <div class="mb-1 flex items-center gap-2 text-sm font-bold">
                  <Zap class="h-4 w-4 text-amber-300" /> Mermaid.js
                </div>
                <div class="text-xs text-indigo-100">Local Markdown Renderer</div>
              </div>

              <div
                class="absolute top-3/4 left-3/4 z-10 w-48 -translate-x-1/2 -translate-y-1/2 transform rounded-lg border-2 border-emerald-400 bg-white p-4 text-left shadow-sm">
                <div class="mb-1 text-sm font-bold text-gray-800">Local Storage</div>
                <div class="text-xs text-gray-500">File System Access API</div>
              </div>

              <svg class="pointer-events-none absolute inset-0 h-full w-full" style="z-index: 0;">
                <!-- Top left to Center -->
                <path
                  d="M 25% 25% C 35% 25%, 35% 50%, 50% 50%"
                  fill="none"
                  stroke="#9ca3af"
                  stroke-width="2"
                  stroke-dasharray="4 4"
                  class="animate-[dash_2s_linear_infinite]" />
                <circle cx="50%" cy="50%" r="4" fill="#4f46e5" />
                <!-- Center to Bottom Right -->
                <path
                  d="M 50% 50% C 65% 50%, 65% 75%, 75% 75%"
                  fill="none"
                  stroke="#9ca3af"
                  stroke-width="2" />
                <polygon
                  points="75%,75% 73%,71% 77%,71%"
                  fill="#9ca3af"
                  transform="translate(-10, 0) rotate(45, 75%, 75%)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Actual Features Section -->
    <section id="features" class="border-t border-border bg-muted/30 py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-3xl text-center">
          <h2
            class="mb-3 text-sm font-semibold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
            Why Graphi?
          </h2>
          <h3 class="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Everything you need, driven by code
          </h3>
          <p class="text-lg text-muted-foreground">
            Graphi brings the power of Mermaid.js into a modern, lightning-fast editor interface.
            Say goodbye to drag-and-drop fatigue.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div
            class="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
              <Activity class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 class="mb-3 text-xl font-bold text-foreground">Live Preview Rendering</h4>
            <p class="leading-relaxed text-muted-foreground">
              Type your diagram logic in the Monaco editor and watch it render instantly in the
              preview panel.
            </p>
          </div>

          <div
            class="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
              <Download class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 class="mb-3 text-xl font-bold text-foreground">Seamless Exports</h4>
            <p class="leading-relaxed text-muted-foreground">
              Export your rendered diagrams cleanly to SVG or PNG to include them easily in your
              documentation.
            </p>
          </div>

          <div
            class="rounded-2xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md">
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
              <Settings class="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 class="mb-3 text-xl font-bold text-foreground">Advanced Configuration</h4>
            <p class="leading-relaxed text-muted-foreground">
              Dive into the JSON configuration pane to precisely control Mermaid themes, layouts,
              and strictness.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Security by Design Section -->
    <section id="security" class="border-t border-border bg-background py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto mb-16 max-w-3xl text-center">
          <h2
            class="mb-3 text-sm font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
            Security by Design
          </h2>
          <h3 class="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Your diagrams and data, strictly protected.
          </h3>
          <p class="text-lg text-muted-foreground">
            We built Graphi to be local-first, respecting your privacy and security. You have full
            control over what leaves your device.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                ><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path
                  d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h4 class="mb-2 text-lg font-bold text-foreground">Local-First Architecture</h4>
            <p class="text-sm leading-relaxed text-muted-foreground">
              By default, all your diagrams, configuration, and AI API keys stay securely inside
              your browser's local storage.
            </p>
          </div>
          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                ><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
            </div>
            <h4 class="mb-2 text-lg font-bold text-foreground">Encrypted Identities</h4>
            <p class="text-sm leading-relaxed text-muted-foreground">
              When you choose to create a cloud account, your personal information is heavily
              encrypted at rest.
            </p>
          </div>
          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                ><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </div>
            <h4 class="mb-2 text-lg font-bold text-foreground">Secure Link Sharing</h4>
            <p class="text-sm leading-relaxed text-muted-foreground">
              Cloud diagrams are protected by high-entropy, 122-bit unguessable unique identifiers.
              Only people with the exact link can view them.
            </p>
          </div>
          <div class="flex flex-col items-center text-center">
            <div
              class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-8 w-8 text-emerald-600 dark:text-emerald-400"
                ><path
                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path
                  d="M12 9v4" /><path d="M12 17h.01" /></svg>
            </div>
            <h4 class="mb-2 text-lg font-bold text-foreground">XSS Neutralization</h4>
            <p class="text-sm leading-relaxed text-muted-foreground">
              Uploaded diagrams are continuously scrubbed and isolated via strict configuration
              boundaries to prevent malicious code execution.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-border bg-muted/30 py-20">
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 class="mb-6 text-3xl font-bold text-foreground md:text-5xl">
          Ready to visualize your ideas?
        </h2>
        <p class="mb-10 text-xl text-muted-foreground">
          Jump straight into the editor. No account required.
        </p>
        <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="{base}/edit/"
            class="w-full rounded-full bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-md transition-colors hover:bg-indigo-700 sm:w-auto">
            Open Editor Now
          </a>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="border-t border-border bg-background pt-16 pb-8">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div
        class="mb-8 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
        <div class="flex items-center gap-2">
          <img
            src="{base}/branding/graphi-logomark-on-{$mode === 'dark' ? 'dark' : 'light'}.png"
            alt="Graphi Logo"
            class="h-6 w-auto rotate-3 object-contain" />
          <span class="text-xl font-bold text-foreground">Graphi</span>
        </div>
      </div>

      <div
        class="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row">
        <p class="text-sm text-gray-400">
          © {new Date().getFullYear()} Graphi. Built with SvelteKit & Mermaid.js.
        </p>
      </div>
    </div>
  </footer>
</div>
