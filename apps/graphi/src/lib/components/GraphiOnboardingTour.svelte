<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, ChevronRight, ChevronLeft, X, Play, Info } from 'lucide-svelte';
  import { stateStore, updateCodeStore } from '$/util/state';

  const ONBOARDING_SEEN_KEY = 'graphi-onboarding-seen';

  const WELCOME_TEMPLATE_CODE = `flowchart TD
    %% Branding custom styling nodes
    classDef default fill:#f8fafc,stroke:#e2e8f0,stroke-width:2px,color:#0f172a;
    classDef highlight fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#ffffff;
    classDef database fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff;

    User[🧑‍💻 Professional Developer] -->|Types Mermaid Code| Editor["⚡ Monaco Editor"]:::highlight
    Editor -->|Live compiles| Renderer{"🎨 Mermaid.js Engine"}:::highlight
    Renderer -->|Draws Vector SVG| Preview["👁️ Preview Canvas"]
    Editor <-->|Autosave & Restore| LocalStorage[("💾 Local Workspace")]:::database
`;

  interface TourStep {
    selector: string;
    title: string;
    description: string;
    tip?: string;
  }

  const TOUR_STEPS: TourStep[] = [
    {
      selector: '[data-tour="preview-pane"]',
      title: 'Real-Time Rendering',
      description:
        'Your diagram compiles on-the-fly as you edit. Pan, pinch-to-zoom, or double-click to center the canvas instantly when working on large, multi-node architectures.',
      tip: 'Use the toolbar in the bottom right to quickly fit the drawing to your viewport.'
    },
    {
      selector: '[data-tour="editor-pane"]',
      title: 'Code-Driven Canvas',
      description:
        'Write your diagram logic using clean, standard Mermaid.js syntax. Includes dynamic syntax highlighting, bracket autocomplete, and multi-cursor operations.',
      tip: 'You can press Ctrl+S to save your work manually at any time.'
    },
    {
      selector: '[data-tour="mode-toggle"]',
      title: 'Workspace Modes',
      description:
        'Toggle between "Simple" and "Advanced" workspace modes. Simple mode hides secondary sidebars for a highly focused workflow, while Advanced mode opens full capabilities.',
      tip: 'Graphi starts in Simple Mode by default to give you an uncluttered canvas.'
    },
    {
      selector: '[data-tour="save-button"]',
      title: 'Auto-Save & Workspace Logs',
      description:
        'Diagrams are safely autosaved locally. The Save indicator changes colors dynamically based on edits, so you never lose your progress.',
      tip: 'In Advanced mode, the Sidebar History tab allows you to rollback or audit any individual changes!'
    },
    {
      selector: '[data-tour="share-button"]',
      title: 'Instant Collaborations',
      description:
        'Tap the Share action to copy a cryptographically secure workspace link, publish your vector files directly to cloud registers, or start real-time multi-user sessions.',
      tip: 'You have completed the onboarding! Enjoy creating extraordinary diagrams.'
    }
  ];

  let mounted = $state(false);
  let showWelcome = $state(false);
  let activeStep = $state<number | null>(null);
  let rect = $state<DOMRect | null>(null);

  let windowWidth = $state(1200);
  let windowHeight = $state(800);

  onMount(() => {
    mounted = true;
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;

    const handleResize = () => {
      windowWidth = window.innerWidth;
      windowHeight = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let timer: number;
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (!seen) {
      timer = setTimeout(() => {
        showWelcome = true;
      }, 1500) as unknown as number;
    }

    const handleRestart = () => {
      activeStep = 0;
      showWelcome = false;
    };
    window.addEventListener('graphi-start-onboarding', handleRestart);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('graphi-start-onboarding', handleRestart);
    };
  });

  // Track target bounding rect updates
  $effect(() => {
    if (activeStep === null) {
      rect = null;
      return;
    }

    const step = TOUR_STEPS[activeStep];
    const el = document.querySelector(step.selector);

    if (!el) {
      rect = null;
      return;
    }

    const updateRect = () => {
      rect = el.getBoundingClientRect();
    };

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const observer = new ResizeObserver(updateRect);
    observer.observe(el);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      observer.disconnect();
    };
  });

  const handleStartTour = () => {
    showWelcome = false;

    // Seed flowchart template if canvas is currently empty to showcase visual rendering instantly
    if (!$stateStore.code || $stateStore.code.trim() === '') {
      updateCodeStore({
        code: WELCOME_TEMPLATE_CODE
      });
    }

    activeStep = 0;
  };

  const handleSkipTour = () => {
    showWelcome = false;
    activeStep = null;
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
  };

  const handleNext = () => {
    if (activeStep === null) return;
    if (activeStep < TOUR_STEPS.length - 1) {
      activeStep += 1;
    } else {
      activeStep = null;
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    }
  };

  const handleBack = () => {
    if (activeStep === null) return;
    if (activeStep > 0) {
      activeStep -= 1;
    }
  };

  // Tooltip positioning computations via Derived Rune (lint-safe alphabetical sorting)
  let tooltipStyle = $derived.by(() => {
    if (!rect) {
      return {
        left: '50%',
        position: 'fixed' as const,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '340px',
        zIndex: 160
      };
    }

    const padding = 16;
    const tooltipWidth = 340;
    const tooltipHeight = 240;

    let top = rect.bottom + padding;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (left < padding) left = padding;
    if (left + tooltipWidth > windowWidth - padding) {
      left = windowWidth - tooltipWidth - padding;
    }

    if (top + tooltipHeight > windowHeight - padding) {
      top = rect.top - tooltipHeight - padding;
    }
    if (top < padding) top = padding;

    return {
      left: `${left}px`,
      position: 'fixed' as const,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
      zIndex: 160
    };
  });
</script>

{#if mounted}
  <!-- ── Welcome Toast Card ── -->
  {#if showWelcome}
    <div
      class="fixed relative right-6 bottom-6 z-[200] flex w-[calc(100vw-3rem)] max-w-sm flex-col gap-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all duration-500 ease-out sm:p-7">
      <div
        class="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-indigo-400/10 blur-xl" />

      <div class="flex items-start gap-4">
        <div
          class="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-xl bg-indigo-600 shadow-[0_4px_12px_rgba(99,102,241,0.2)]">
          <Sparkles class="h-5 w-5 text-white" />
        </div>
        <div class="min-w-0 flex-1">
          <span
            class="block text-[9px] leading-none font-black tracking-widest text-indigo-600 uppercase"
            >Welcome to Graphi</span>
          <h4 class="mt-1 text-base leading-snug font-bold tracking-tight text-slate-900">
            Code-to-Diagrams, instantly.
          </h4>
          <p class="mt-2 text-[12px] leading-relaxed font-medium text-slate-500">
            Learn how to type, compile, save, and export premium vector architectures in under a
            minute! Take the quick workspace tour.
          </p>
        </div>
      </div>

      <div class="mt-1 flex items-center gap-3">
        <button
          onclick={handleStartTour}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-3 text-[10px] font-bold tracking-wider text-white uppercase shadow-[0_4px_12px_rgba(15,23,42,0.15)] transition-all hover:bg-indigo-600 active:scale-[0.97]">
          <Play class="h-3 w-3 fill-current" />
          Start Tour
        </button>
        <button
          onclick={handleSkipTour}
          class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase transition-all hover:bg-slate-100 active:scale-[0.97]">
          Skip
        </button>
      </div>

      <button
        onclick={handleSkipTour}
        class="absolute top-4 right-4 p-1 text-slate-400 transition-colors hover:text-slate-900"
        aria-label="Dismiss">
        <X class="h-4 w-4" />
      </button>
    </div>
  {/if}

  <!-- ── Active Tour Walkthrough Overlay ── -->
  {#if activeStep !== null}
    <div class="pointer-events-none fixed inset-0 z-[150]">
      <!-- Even-odd path Spotlight backdrop (blocks external clicks except inside cutout) -->
      <svg class="pointer-events-auto absolute inset-0 h-full w-full">
        {#if rect}
          <path
            d="M 0 0 h {windowWidth} v {windowHeight} h -{windowWidth} Z 
               M {rect.left - 6} {rect.top - 6} 
               h {rect.width + 12} 
               v {rect.height + 12} 
               h -{rect.width + 12} Z"
            fill="rgba(15, 23, 42, 0.45)"
            fill-rule="evenodd"
            class="transition-all duration-300 ease-out" />
        {:else}
          <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.45)" />
        {/if}
      </svg>

      <!-- Floating Tooltip Card -->
      <div
        style="left: {tooltipStyle.left}; position: {tooltipStyle.position}; top: {tooltipStyle.top}; width: {tooltipStyle.width}; z-index: {tooltipStyle.zIndex};"
        class="pointer-events-auto flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md transition-all duration-300 ease-out">
        <div>
          <!-- Step progress bar -->
          <div class="mb-4 flex gap-1">
            {#each TOUR_STEPS as step, i (step.title)}
              <div
                class="h-1.5 flex-1 transition-all duration-300 {i <= activeStep
                  ? 'bg-indigo-600'
                  : 'bg-slate-100'} rounded-full"
                title={step.title} />
            {/each}
          </div>

          <span class="block text-[8px] font-black tracking-widest text-indigo-600 uppercase">
            Step {activeStep + 1} of {TOUR_STEPS.length}
          </span>

          <h4 class="mt-1 text-base leading-snug font-bold tracking-tight text-slate-900">
            {TOUR_STEPS[activeStep].title}
          </h4>

          <p class="mt-2 text-[12px] leading-relaxed font-medium text-slate-600">
            {TOUR_STEPS[activeStep].description}
          </p>

          {#if TOUR_STEPS[activeStep].tip}
            <div
              class="mt-3 flex items-start gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-2.5">
              <Info class="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <span class="text-[10px] leading-normal font-medium text-slate-500">
                {TOUR_STEPS[activeStep].tip}
              </span>
            </div>
          {/if}
        </div>

        <!-- Action buttons footer -->
        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onclick={handleSkipTour}
            class="text-[10px] font-bold tracking-wider text-slate-400 uppercase transition-colors hover:text-slate-600">
            Skip Tour
          </button>

          <div class="flex items-center gap-2">
            {#if activeStep > 0}
              <button
                onclick={handleBack}
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 text-slate-500 transition-all hover:bg-slate-50 active:scale-90"
                title="Back">
                <ChevronLeft class="h-4 w-4" />
              </button>
            {/if}

            <button
              onclick={handleNext}
              class="flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-900 bg-slate-900 px-4 text-[10px] font-bold tracking-wider text-white uppercase shadow-[0_4px_12px_rgba(15,23,42,0.15)] transition-all hover:bg-indigo-600 active:scale-[0.93]">
              {activeStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
