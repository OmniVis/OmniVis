<script lang="ts">
  import HeartIcon from '~icons/material-symbols/favorite';
  import CodeIcon from '~icons/material-symbols/code';
  import BrushIcon from '~icons/material-symbols/brush';
  import RocketIcon from '~icons/material-symbols/rocket-launch';
</script>

<div class="flex h-full flex-col gap-8 overflow-y-auto p-8 text-sm leading-relaxed">
  <div class="flex flex-col items-center gap-4 text-center">
    <div class="rounded-full border-2 border-primary/20 bg-primary/10 p-4 shadow-lg">
      <img
        src="https://raw.githubusercontent.com/GraphiTeam/Assets/refs/heads/main/graphilogo.png"
        alt="Graphi"
        class="size-16 object-contain" />
    </div>
    <div class="space-y-1">
      <h2 class="text-3xl font-black tracking-tighter text-foreground uppercase italic">Graphi</h2>
      <p class="text-xs font-bold tracking-widest text-muted-foreground uppercase opacity-80">
        Professional Mermaid Editor
      </p>
    </div>
  </div>

  <div class="space-y-6">
    <section class="rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-border/50">
      <div class="mb-4 flex items-center gap-3 font-bold tracking-wider text-primary uppercase">
        <CodeIcon class="size-5" />
        <h3>Development</h3>
      </div>
      <p class="text-lg font-medium text-foreground">
        Developed by <span class="font-bold text-accent">Batu Atakan Erol</span> with <HeartIcon
          class="inline size-4 animate-pulse text-rose-500" />
      </p>
    </section>

    <section class="grid grid-cols-1 gap-4">
      <div class="rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50">
        <div
          class="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
          <BrushIcon class="size-4" />
          Design Philosophy
        </div>
        <p class="leading-relaxed text-muted-foreground italic">
          "Crafting intuitive interfaces that transform complex diagrams into beautiful visual
          stories. Built with speed, precision, and passion."
        </p>
      </div>

      <div class="rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50">
        <div
          class="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
          <RocketIcon class="size-4" />
          The Mission
        </div>
        <p class="leading-relaxed text-muted-foreground">
          Providing the most robust and elegant tool for the Mermaid community to visualize ideas
          effortlessly.
        </p>
      </div>
    </section>
  </div>

  <div
    class="mt-auto border-t pt-8 text-center text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-40">
    © 2026 Graphi Editor • All Rights Reserved
  </div>
</div>
