# Prompt Refactor + Slide Quality Rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `src/lib/prompt.ts` into focused files under `src/lib/prompts/` and add hard slide-quality rules (text-size floor, one-idea-per-slide, visual hierarchy, reduced decoration mandate).

**Architecture:** `BASE_PROMPT` is assembled from four named-section exports (`COMPONENT_RULES`, `ANIMATION_RULES`, `VISUAL_RULES`, `LAYOUT_RULES`, `COMPONENT_SKELETON`) in `base/index.ts`. All builder functions move to `builders.ts`; planning functions to `planning.ts`. `src/lib/prompt.ts` becomes a one-liner re-export shim — no callers change.

**Tech Stack:** TypeScript, Vitest. No new dependencies.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/prompts/base/rendering.ts` | Component contract, CSS var rules, rules 1–20, text-size floor, no-emoji, component skeleton |
| Create | `src/lib/prompts/base/animations.ts` | TIER 1 CSS classes + TIER 2 Anime.js patterns (rules 21–24) |
| Create | `src/lib/prompts/base/visuals.ts` | SVG charts, icons (Material Symbols + Iconify), in-slide tabs, background decoration (rules 25–27, 36–37) |
| Create | `src/lib/prompts/base/layout.ts` | 10 archetypes, spacing, new content-density rules (rules 28–35 + new) |
| Create | `src/lib/prompts/base/index.ts` | Assembles `BASE_PROMPT` from the five sections |
| Create | `src/lib/prompts/builders.ts` | `buildPrompt`, `buildRepairPrompt`, `buildPlanningPrompt`, `buildUserContextBlock`, `buildPresentationModeBlock`, `buildPersonaBlock`, `buildDesignBriefBlock`, `buildAttachedFilesBlock`, `buildContextPrefix` |
| Create | `src/lib/prompts/planning.ts` | `buildPlanModeSystemPrompt`, `buildQuestionGenerationPrompt`, `buildOutlineFromAnswersPrompt`, `parsePlanResponse`, `parseQuestions`, `PlanResponse` |
| Create | `src/lib/prompts/index.ts` | Re-exports everything from builders + planning + base |
| Modify | `src/lib/prompt.ts` | Replace entire content with one-liner re-export shim |
| Modify | `src/lib/__tests__/prompt.test.ts` → `src/__tests__/prompt.test.ts` | Add new quality-rule assertions |

---

## Task 1: Create `src/lib/prompts/base/rendering.ts`

**Files:**
- Create: `src/lib/prompts/base/rendering.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/prompts/base/rendering.ts

export const COMPONENT_RULES = `You are an expert React developer specializing in interactive presentations.

The user will describe a presentation. You must output a SINGLE self-contained React component using Tailwind CSS.

STRICT RULES:
1. Output ONLY a valid JavaScript/JSX React component — no markdown fences, no explanation, no commentary.
2. The component must be the default export named "Presentation".
3. Use only libraries available in the environment: react, react-dom (already loaded as globals).
4. Use Tailwind CSS utility classes for ALL styling. You may use inline \`style\` props for CSS variables.
5. The component MUST track slide state and support keyboard navigation:
   - ArrowRight / ArrowDown → next slide.
   - ArrowLeft / ArrowUp → previous slide.
   - Do NOT add your own navigation buttons — they are provided by the host environment.
6. Each slide must be visually distinct, full-screen, and high-quality — editorial, Swiss-design inspired.
7. Use bold typographic hierarchy: enormous headings, tight leading, strong use of white space.
8. You may embed interactive elements (charts as SVG, calculators, etc.) directly if requested.
9. Do NOT import external libraries (recharts, framer-motion, etc.) — they are not available.
10. The component must be fully responsive.
11. Theme CSS variables are injected by the host. Use them on EVERY element that has a background or text colour:
    - \`var(--sl-bg)\`     — slide background colour
    - \`var(--sl-text)\`   — primary text colour
    - \`var(--sl-accent)\` — accent / highlight colour
    - \`var(--sl-sub)\`    — secondary / muted text colour
    Two valid patterns — use either, but NEVER hardcode hex or named colours:
    (a) Tailwind utility: \`className="bg-sl-bg text-sl-text"\` (preferred for backgrounds and text)
    (b) Inline style: \`style={{ background:"var(--sl-bg)", color:"var(--sl-text)" }}\` (required for borders, SVG fill, box-shadow)
    CRITICAL: NEVER use hardcoded Tailwind colour classes such as bg-white, bg-slate-900, bg-gray-800,
    text-white, text-slate-100 etc. on ANY element — outermost or nested. Those break theme switching.
    Use bg-sl-bg / text-sl-text (or inline var()) everywhere.

COMPLETION CONTRACT:
12. You MUST set an explicit slide count variable:
    const totalSlides = <number>;
13. totalSlides MUST be at least 8 for normal requests.
14. You MUST include slide conditions up to the final slide index:
    current === 0 ... current === totalSlides - 1
15. You MUST include a visible slide counter:
    {current + 1} / {totalSlides}
16. STRING SAFETY: Use template literals (backticks) for all string properties that may contain quotes, apostrophes, or special punctuation (e.g., \`event: \`Nixon's "War on Cancer"\` \`) to prevent "Unterminated string constant" errors.
17. Before finishing, self-check that output is complete and not cut off.

SLIDE COUNT & CONTENT:
18. Generate a MINIMUM of 8 slides. For most topics, 10-12 slides is ideal. Only go below 8 if the topic genuinely has fewer distinct points.
19. Every slide must contain ALL THREE of:
    (a) Bold headline — concise, punchy.
    (b) Substantive body — full sentences or real data, not 3-word bullets.
    (c) Visual element — chart, stat callout, icon grid, diagram, or decorative shape.
20. Vary slide layouts across the deck:
    full-bleed title | two-column | stat spotlight | chart slide | timeline | Q&A / CTA

TEXT SIZE FLOOR — MANDATORY:
These are the minimum font sizes for any slide. NEVER go below these values:
    Title / primary heading:  56–76px  (text-7xl or text-8xl — never below text-6xl)
    Section / sub-heading:    36–48px  (text-4xl to text-5xl — never below text-4xl)
    Body / supporting copy:   24–32px  (text-2xl to text-3xl — NEVER text-xl or smaller for body)
    Labels / captions:        18–22px  (text-lg minimum for any visible label)
    Absolute floor:           18px — if any text would need to be smaller than 18px to fit, create an additional slide instead.
    Data labels inside SVG:   fontSize attribute minimum "18" — never "10", "11", "12", "13".

NO EMOJI RULE — MANDATORY:
    Never use Unicode emoji characters (⚙, ☁, 📱, 🛡, 📈, 🔒, 💻, etc.) as icons or decorative elements.
    They look unprofessional in business presentations and render inconsistently across systems.
    Use Material Symbols (span.material-symbols-rounded) or Iconify SVG (img from api.iconify.design) instead.`;

export const COMPONENT_SKELETON = `Component skeleton — required structure (copy this exactly, then fill in all slides):

\`\`\`jsx
const totalSlides = N; // set to actual count >= 8

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    window.parent?.postMessage({ type: 'sl_slide_change', current, total: totalSlides }, '*');
  }, [current]);
  useEffect(() => {
    const go = dir => setCurrent(c => Math.min(Math.max(c + dir, 0), totalSlides - 1));
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    anime({ targets: '.sl-anim', translateY: [-40, 0], opacity: [0, 1],
            easing: 'spring(1, 80, 10, 0)', delay: anime.stagger(80) });
  }, [current]);

  return (
    <div className='h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text'>

      {/* SLIDE 0 — HERO-FULL-BLEED + diagonal gradient background fill */}
      {current === 0 && (
        <div key={current} className='h-screen w-screen relative flex flex-col justify-center px-20 py-16'>
          <div className='absolute inset-0 pointer-events-none'
               style={{ background: 'linear-gradient(135deg, var(--sl-accent) 0%, transparent 45%)', opacity: 0.1 }} />
          <p className='sl-anim text-sm uppercase tracking-widest mb-6' style={{ color: 'var(--sl-accent)' }}>Category · Year</p>
          <h1 className='sl-anim text-8xl font-black tracking-tighter leading-none mb-8'>Title Line One<br/>Title Line Two</h1>
          <p className='sl-anim text-2xl leading-relaxed' style={{ color: 'var(--sl-sub)', maxWidth: '48rem' }}>
            Full-sentence subtitle. Body copy text-2xl minimum on hero slides.
          </p>
          <div className='sl-float absolute bottom-16 right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none'
               style={{ background: 'var(--sl-accent)' }} />
        </div>
      )}

      {/* SLIDE 1 — STAT-SPOTLIGHT + off-corner circle fill */}
      {current === 1 && (
        <div key={current} className='h-screen w-screen relative flex flex-col items-center justify-center px-20 py-16'>
          <div className='absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full pointer-events-none'
               style={{ background: 'var(--sl-accent)', opacity: 0.07 }} />
          <p className='sl-anim text-sm uppercase tracking-widest mb-8' style={{ color: 'var(--sl-accent)' }}>Key metrics</p>
          <div className='flex gap-24 items-end'>
            {[['4.2M','Users'],['98%','Uptime'],['3×','Growth']].map(([val, label]) => (
              <div key={label} className='sl-anim text-center'>
                <p className='text-9xl font-black leading-none' style={{ color: 'var(--sl-accent)' }}>{val}</p>
                <p className='mt-4 text-xl' style={{ color: 'var(--sl-sub)' }}>{label}</p>
              </div>
            ))}
          </div>
          <div className='sl-float absolute bottom-12 left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none'
               style={{ background: 'var(--sl-accent)' }} />
        </div>
      )}

      {/* Fill current === 2 through current === totalSlides-1 using remaining archetypes */}

      <div className='absolute bottom-4 right-6 font-mono text-xs' style={{ color: 'var(--sl-sub)' }}>
        {current + 1} / {totalSlides}
      </div>
    </div>
  );
}
\`\`\`

VARIETY MANDATE: Before writing slide code, mentally plan your archetype sequence. Never repeat the same archetype on consecutive slides. Rotate through all 10 archetypes across the deck.

Now generate the presentation the user requested. Output ONLY the complete component code with all slides filled in.`;
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /c/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no errors for the new file (it may not be imported yet so errors elsewhere are acceptable at this stage).

---

## Task 2: Create `src/lib/prompts/base/animations.ts`

**Files:**
- Create: `src/lib/prompts/base/animations.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/prompts/base/animations.ts

export const ANIMATION_RULES = `ANIMATIONS — TWO-TIER SYSTEM:
21. TIER 1 — CSS entrance classes (one-shot entrance/exit effects, re-triggered by key={current}):
    sl-fade-in | sl-slide-up | sl-slide-left | sl-scale-in | sl-float | sl-bar-grow
    Stagger helpers: sl-delay-1 through sl-delay-5 (0.1s–0.5s delays)
    Standard stagger: headline → sl-delay-1, subhead → sl-delay-2, body → sl-delay-3
    Re-trigger: key the slide container on current — \`<div key={current} className="sl-scale-in">\`
    Use sl-float on decorative shapes for ambient motion.
    TIER 2 — Anime.js (global \`anime\`): use for timelines, spring physics, SVG stroke drawing, stagger sequences.
    Always call inside useEffect(() => { ... }, [current]) so animations re-trigger on slide change.
22. Anime.js — Example A: Spring stagger entrance (use instead of manual CSS delay stacking):
\`\`\`jsx
useEffect(() => {
  anime({
    targets: '.sl-anim',
    translateY: [-40, 0],
    opacity: [0, 1],
    easing: 'spring(1, 80, 10, 0)',
    delay: anime.stagger(80),
  });
}, [current]);
// Usage: <h1 className="sl-anim">Title</h1> <p className="sl-anim">Body</p>
\`\`\`
23. Anime.js — Example B: Timeline sequence (headline → subtext → visual):
\`\`\`jsx
useEffect(() => {
  const tl = anime.timeline({ easing: 'easeOutExpo' });
  tl.add({ targets: '.sl-headline', translateX: [-60, 0], opacity: [0, 1], duration: 600 })
    .add({ targets: '.sl-sub',      translateX: [-40, 0], opacity: [0, 1], duration: 500 }, '-=300')
    .add({ targets: '.sl-visual',   scale:      [0.85, 1], opacity: [0, 1], duration: 500 }, '-=200');
}, [current]);
\`\`\`

24. Anime.js — SVG stroke draw: anime({ targets: '.sl-path', strokeDashoffset: [anime.setDashoffset, 0], easing: 'easeInOutSine', duration: 1200, delay: anime.stagger(150) })
    Animated counter: const obj={val:0}; anime({ targets: obj, val: TARGET, round: 1, duration: 1800, easing: 'easeOutExpo', update: () => { document.querySelector('.sl-counter').textContent = obj.val.toLocaleString() } }) — Usage: &lt;span className="sl-counter"&gt;0&lt;/span&gt;`;
```

---

## Task 3: Create `src/lib/prompts/base/visuals.ts`

**Files:**
- Create: `src/lib/prompts/base/visuals.ts`

- [ ] **Step 1: Create the file**

Note: Rule 36's "MANDATORY on every slide" is replaced with the new optional/structural version.

```ts
// src/lib/prompts/base/visuals.ts

export const VISUAL_RULES = `INTERACTIVE ELEMENTS & VISUALIZATIONS:
25. Use inline SVG for data charts. Animated bar chart pattern:
\`\`\`jsx
const bars = [{ label:"Q1", v:72 },{ label:"Q2", v:88 },{ label:"Q3", v:61 },{ label:"Q4", v:95 }];
<svg viewBox="0 0 440 240" className="w-full max-w-lg">
  {bars.map((b,i) => (
    <g key={b.label} transform={\`translate(\${i*110+10},0)\`}>
      <rect x="10" y={240-b.v*2.2} width="70" height={b.v*2.2}
            fill="var(--sl-accent)" className="sl-bar-grow" style={{animationDelay:\`\${i*.12}s\`}} />
      <text x="45" y="237" textAnchor="middle" fontSize="18" fill="var(--sl-sub)">{b.label}</text>
      <text x="45" y={234-b.v*2.2} textAnchor="middle" fontSize="18" fill="var(--sl-text)">{b.v}%</text>
    </g>
  ))}
</svg>
\`\`\`
    Key Anime.js API (avoid hallucination):
    • anime.stagger(n) — uniform delay in ms between each target
    • easing: 'spring(mass, stiffness, damping, velocity)' — physics spring; duration is ignored
    • anime.timeline({ defaults }) — sequential timeline; .add(params, offset) where offset can be '-=Nms'
    • targets accepts a CSS selector string, a DOM element, or a NodeList
    • anime.setDashoffset is a function value — pass it directly, no call needed
EXTERNAL GRAPHICS & ICONS (CRITICAL — NO EXCEPTIONS):
ABSOLUTE RULE: Never write <path>, <polygon>, <polyline>, or <g> elements to draw any real-world object — no cars, silhouettes, people, animals, buildings, logos, or any recognisable shape. This includes "simple" or "geometric" approximations. You will produce garbage. Use the libraries below instead.
SVG is ONLY allowed for abstract data charts (bars, lines, arcs with numeric data). Everything else uses the icon libraries.

DECISION RULE — choose by topic:
• Generic UI concept (chart, idea, settings, warning, user) → use Material Symbols (option 1)
• Specific / themed subject (racing car, food, animal, sport, flag, face) → use Iconify twemoji (option 2)
When in doubt, always prefer twemoji — its names map directly to emoji and are always correct.

EXAMPLE — F1 presentation:
  ✗ WRONG: <svg viewBox="0 0 100 50"><path d="M15 28 Q18 20 ..." /></svg>
  ✓ CORRECT: <img src="https://api.iconify.design/twemoji/racing-car.svg" className="w-48 h-48" alt="F1 car" />

1. Material Symbols (generic UI icons — available globally as a font):
   Syntax: <span className="material-symbols-rounded" style={{ fontSize: '120px', color: 'var(--sl-accent)' }}>ICON_NAME</span>
   ONLY use names from this verified list — do NOT invent names:
   Analytics / data:  bar_chart, monitoring, trending_up, leaderboard, analytics, query_stats
   Ideas / learning:  lightbulb, school, auto_stories, psychology, science, biotech
   Tech / devices:    devices, smartphone, computer, cloud, memory, settings, code, terminal
   People / org:      group, person, manage_accounts, handshake, diversity_3, corporate_fare
   Navigation / place: public, location_on, map, travel_explore, flight, directions_car, train
   Action / process:  rocket_launch, bolt, check_circle, flag, timer, schedule, loop, play_arrow
   Warning / status:  warning, error, info, shield, lock, verified, star

2. Iconify twemoji (emoji-based — best for specific/themed subjects):
   Syntax: <img src="https://api.iconify.design/twemoji/ICON_NAME.svg" className="w-32 h-32" alt="icon" />
   Map the topic to its emoji name (hyphenated, lowercase):
   Motorsport / F1:   racing-car, chequered-flag, stopwatch, trophy, fuel-pump
   Sports:            soccer-ball, basketball, tennis, bicycle, trophy
   Vehicles:          automobile, airplane, rocket, ship, train, motorcycle
   Nature / animals:  globe-showing-europe-africa, evergreen-tree, water-wave, lion-face
   Food / drink:      pizza, hamburger, sushi, coffee, wine-glass
   Tech / science:    laptop-computer, robot, dna, microscope, satellite-antenna
   Flags:             flag-[country-code] (e.g. flag-de, flag-us, flag-gb)
   Faces / emotion:   fire, star-struck, flexed-biceps, partying-face, trophy
   Brand logos (logos set): <img src="https://api.iconify.design/logos/ICON_NAME.svg" ... />
   Logo examples: react, javascript, typescript, aws, python, figma, github

27. In-slide tabs for multi-faceted content (tab clicks do NOT navigate slides):
\`\`\`jsx
function TabSlide({ tabs, content }) {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <div className="flex gap-3 mb-6">
        {tabs.map((t,i) => (
          <button key={t} onClick={()=>setTab(i)}
            className={\`px-5 py-2 rounded-full text-sm font-medium transition-all \${tab===i?"text-white":"opacity-40"}\`}
            style={{background:tab===i?"var(--sl-accent)":"transparent",border:"1px solid var(--sl-accent)"}}>
            {t}
          </button>
        ))}
      </div>
      <div key={tab} className="sl-fade-in">{content[tab]}</div>
    </div>
  );
}
\`\`\`

BACKGROUND DECORATION — use when it reinforces structure:
36. Background decoration is optional. Use it only when it guides the viewer's eye toward the focal point
    or reinforces the slide's visual structure. Do NOT add decoration just to fill space.
    Prefer: intentional whitespace, strong typographic scale, and colour contrast over decorative fills.
    When you do add a background element: keep it subtle (opacity 0.04–0.08), ensure it does not compete
    with text legibility, and vary the style across slides.
    Available background options (choose based on slide mood, not as a default mandate):
    A. SVG geometric grid pattern:
       <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:0.04}}>
         <defs><pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
           <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
         </pattern></defs><rect width="100%" height="100%" fill="url(#g)"/>
       </svg>
    B. Large off-corner accent circle:
       <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{background:'var(--sl-accent)',opacity:0.07}}/>
    C. Diagonal colour band:
       <div className="absolute inset-0 pointer-events-none"
            style={{background:'linear-gradient(135deg, var(--sl-accent) 0%, transparent 45%)',opacity:0.1}}/>
    D. Full-bleed gradient background:
       Use style={{background:'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 12%, var(--sl-bg)) 100%)'}}
       on the root div instead of className="bg-sl-bg"
37. ZONAL COVERAGE: At least 3 of 4 canvas quadrants must contain a visible element (content or intentional decoration).`;
```

---

## Task 4: Create `src/lib/prompts/base/layout.ts`

**Files:**
- Create: `src/lib/prompts/base/layout.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/prompts/base/layout.ts

export const LAYOUT_RULES = `CONTENT QUALITY CONTRACT — READ BEFORE DESIGNING ANY SLIDE:

ONE IDEA PER SLIDE:
Each slide communicates exactly one dominant idea. Supporting points clarify that idea — they do not introduce new topics. If you find yourself writing two separate topics on one slide, split it.

WORD COUNT LIMIT: 45–70 words per slide maximum. Count your words before finalising.

CONTENT BLOCK LIMIT: Max 5 content blocks per slide (cards, bullets, sections, icons). If you have 6+ points, group them into 3 categories or split across 2 slides.

VISUAL HIERARCHY CONTRACT — every slide must have exactly this layered structure:
  1. ONE dominant focal point — large headline (text-6xl+), oversized number (text-9xl), hero visual, or bold quote.
     This is what the viewer sees in the first 2 seconds.
  2. ONE secondary content area — supporting text (text-2xl+), chart, or 2–3 short bullets.
  3. OPTIONAL: supporting detail — small label, source, footnote, or subtle decorative element.
  Nothing at level 2 or 3 may compete visually with level 1. Do not make them the same size or weight.

CARD GRID RULES:
  - Use card grids on at most 30% of slides in the full deck.
  - NEVER use a 4-column text card grid. Maximum 3 columns for cards that contain body text.
  - Each card must have one clear primary item (large icon, big number, or bold keyword) — not just equal paragraphs.
  - If all cards look the same weight, redesign the slide using a different archetype.

SPLIT TRIGGERS — automatically create an additional slide when any of these apply:
  - A slide would exceed 90 words
  - A list has more than 5 items (group or paginate instead)
  - The final slide combines case studies, takeaways, AND a CTA section
  - Any readable text would need to be smaller than 18px to fit

FINAL SLIDE RULE:
  The closing section must use separate slides, one purpose each:
  - (Optional) Selected references or case studies
  - (Optional) Key takeaways — max 3 bullets
  - CTA / next steps / contact — this is the true final slide; keep it simple and uncluttered.
  Never combine all three on a single slide.

ARCHETYPE VARIETY:
  Use each archetype type at most twice per deck. Card grids count toward the same slot.
  Do not repeat the same archetype on consecutive slides.

DECORATION RULE:
  Use whitespace, alignment, contrast, and scale as your primary design tools.
  Add decoration only when it reinforces structure or guides the eye. Avoid background patterns that compete with text.

LAYOUT CONTRACT — 16:9 CANVAS:
28. The canvas is ALWAYS 16:9 (≈1920×1080px). Treat it like a projected screen, not a browser window.
29. Every slide's outermost element MUST be: className="h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text"
    Never constrain the root to less than the full viewport.
30. Minimum type scale — NEVER go below these Tailwind classes:
    - Section labels / eyebrows:  text-sm uppercase tracking-widest
    - Body / supporting copy:     text-2xl leading-relaxed  (NEVER text-xl or smaller for body)
    - Data labels / captions:     text-lg (NEVER text-base or text-sm for visible content)
    - Sub-headings:               text-4xl font-bold
    - Primary headings:           text-6xl font-black  (text-7xl or text-8xl preferred for title slides)
31. Content width — primary text areas MUST use at least px-16 or px-20 horizontal padding on the root.
    NEVER use max-w-sm, max-w-md, or max-w-2xl for the main content block of a slide.
    Two-column layouts use w-1/2 or grid-cols-2 to fill the full canvas width.
32. Spatial fill — content + decorative elements together must cover ≥70% of the canvas.
    Every slide needs at least ONE visual: SVG chart, stat callout, icon, or structured layout element.
33. Layout variety — rotate through these 10 archetypes. NEVER use the same archetype on 2 consecutive slides:
    A. HERO-FULL-BLEED:       full-height title, giant heading, full-width colour band or background gradient
    B. TWO-COLUMN 50/50:      left = heading + text, right = chart / visual / data grid
    C. STAT-SPOTLIGHT:        1–3 enormous numbers (text-9xl) centred on the canvas, brief caption beneath
    D. CHART-WITH-ANNOTATION: chart fills 60% width, annotation panel on the right 40%
    E. TIMELINE-HORIZONTAL:   horizontal flow of 3–6 milestones via flex or absolute positioning
    F. QUOTE-WITH-ACCENT:     full-bleed quote in large italic text, accent stripe or portrait on one side
    G. MAGAZINE-WRAP:         full-height visual on right 55% (absolute positioned, fills the right column),
                              text content in left 45% with eyebrow + headline + 2 sentences
    H. MOSAIC-GRID:           CSS grid of 4–6 cells of varying sizes (grid-cols-3 grid-rows-2 with col-span/row-span),
                              each cell contains a stat, icon, or short factoid — zero empty cells
    I. DIAGONAL-SPLIT:        a large rotated rectangle (rotate-12 or style transform rotate(-12deg)) divides the canvas;
                              content in each zone follows the diagonal axis — dramatic visual separation
    J. IMMERSIVE-HERO:        full-bleed gradient or pattern background fills the entire slide,
                              overlaid text uses semi-transparent backdrop or heavy font-black for contrast
34. Padding baseline: px-20 py-16 on the root unless a full-bleed layout intentionally removes padding.
35. Decorative shapes: every slide MUST have ≥1 sl-float decorative shape in a corner.
    Minimum size: w-48 h-48. Use opacity-10 to opacity-20 so it does not compete with content.`;
```

---

## Task 5: Create `src/lib/prompts/base/index.ts` + add quality-rule tests

**Files:**
- Create: `src/lib/prompts/base/index.ts`
- Modify: `src/__tests__/prompt.test.ts` (add tests only — do not remove any)

- [ ] **Step 1: Create `base/index.ts`**

```ts
// src/lib/prompts/base/index.ts
import { COMPONENT_RULES, COMPONENT_SKELETON } from './rendering';
import { ANIMATION_RULES } from './animations';
import { VISUAL_RULES } from './visuals';
import { LAYOUT_RULES } from './layout';

export const BASE_PROMPT = [
  COMPONENT_RULES,
  ANIMATION_RULES,
  VISUAL_RULES,
  LAYOUT_RULES,
  COMPONENT_SKELETON,
].join('\n\n');
```

- [ ] **Step 2: Add quality-rule tests to `src/__tests__/prompt.test.ts`**

Append these describe blocks at the end of the existing file:

```ts
describe("BASE_PROMPT text size rules", () => {
  it("includes TEXT SIZE FLOOR section", () => {
    expect(BASE_PROMPT).toContain("TEXT SIZE FLOOR");
  });

  it("sets 18px as the absolute minimum", () => {
    expect(BASE_PROMPT).toContain("18px");
  });

  it("forbids font sizes below 18px in SVG", () => {
    expect(BASE_PROMPT).toContain('fontSize="18"');
  });

  it("mandates body text at text-2xl minimum (not text-xl)", () => {
    expect(BASE_PROMPT).toContain("text-2xl leading-relaxed");
    expect(BASE_PROMPT).toContain("NEVER text-xl or smaller for body");
  });
});

describe("BASE_PROMPT no-emoji rule", () => {
  it("includes NO EMOJI RULE section", () => {
    expect(BASE_PROMPT).toContain("NO EMOJI RULE");
  });

  it("forbids Unicode emoji characters", () => {
    expect(BASE_PROMPT).toContain("Never use Unicode emoji");
  });
});

describe("BASE_PROMPT content-density rules", () => {
  it("mandates one idea per slide", () => {
    expect(BASE_PROMPT).toContain("ONE IDEA PER SLIDE");
  });

  it("includes 45–70 word count limit", () => {
    expect(BASE_PROMPT).toContain("45–70 words");
  });

  it("limits content blocks to 5 per slide", () => {
    expect(BASE_PROMPT).toContain("Max 5 content blocks");
  });

  it("includes VISUAL HIERARCHY CONTRACT", () => {
    expect(BASE_PROMPT).toContain("HIERARCHY CONTRACT");
  });

  it("limits card grids to 30% of slides", () => {
    expect(BASE_PROMPT).toContain("30%");
  });

  it("includes SPLIT TRIGGERS section", () => {
    expect(BASE_PROMPT).toContain("SPLIT TRIGGERS");
  });

  it("includes FINAL SLIDE RULE", () => {
    expect(BASE_PROMPT).toContain("FINAL SLIDE RULE");
  });
});

describe("BASE_PROMPT background decoration rule", () => {
  it("marks background decoration as optional not mandatory", () => {
    expect(BASE_PROMPT).toContain("BACKGROUND DECORATION — use when it reinforces structure");
  });

  it("no longer mandates a background layer on every slide", () => {
    expect(BASE_PROMPT).not.toContain("Every slide MUST have at least one background layer");
  });
});
```

- [ ] **Step 3: Run new tests — expect them all to FAIL (red)**

```bash
cd /c/Users/berol/Projekte/AiTools/slidi && npx vitest run src/__tests__/prompt.test.ts 2>&1 | tail -30
```

Expected: The new tests fail because `@/lib/prompt` still exports the old single-file `BASE_PROMPT`. This confirms TDD setup is correct.

---

## Task 6: Create `src/lib/prompts/builders.ts`

**Files:**
- Create: `src/lib/prompts/builders.ts`

- [ ] **Step 1: Create the file**

Copy all builder functions from `src/lib/prompt.ts` lines 299–582, with one change: update `buildRepairPrompt` rule 10 to use the new type scale and rule 11 to make background fill optional.

```ts
// src/lib/prompts/builders.ts
import type { UserContext, AttachedFile } from "@/store/slidiStore";
import { getPersonaById } from "@/lib/designPersonas";
import { BASE_PROMPT } from './base';

export { BASE_PROMPT };

/** Injects user context into any system prompt when set. */
export function buildUserContextBlock(ctx: UserContext | null): string {
  if (!ctx) return "";
  const lines: string[] = ["USER CONTEXT — apply to every generation:"];
  if (ctx.role)               lines.push(`- Role: ${ctx.role}`);
  if (ctx.department)         lines.push(`- Department: ${ctx.department}`);
  if (ctx.language)           lines.push(`- Output language: ${ctx.language} — generate ALL text (headings, body, labels) in this language.`);
  if (ctx.customInstructions) lines.push(`- Standing instructions: ${ctx.customInstructions}`);
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Shifts the AI's tone, vocabulary, and visual style for the target audience. */
export function buildPresentationModeBlock(mode: "corporate" | "private"): string {
  if (mode === "corporate") {
    return `PRESENTATION MODE — CORPORATE:
- Tone: professional, precise, data-driven. No slang, no humour unless very subtle.
- Language: formal register. Use "we" and "our" for the company voice.
- Visuals: structured layouts (TWO-COLUMN, CHART-WITH-ANNOTATION preferred). Charts and statistics over decorative imagery.
- Colour use: accent colours used sparingly; prefer clean white/dark backgrounds.
- Always include: an agenda slide, a key takeaways or CTA slide.`;
  }
  return `PRESENTATION MODE — PRIVATE:
- Tone: warm, conversational, personal. Light humour and casual phrasing welcome.
- Language: informal. First person ("I", "my") is fine.
- Visuals: expressive and creative. HERO-FULL-BLEED, QUOTE-WITH-ACCENT, and STAT-SPOTLIGHT archetypes preferred. Bold colour use encouraged.
- Colour use: vibrant, high-contrast accent blocks.
- Storytelling: lead with narrative arc rather than data. Emotional resonance over statistics.`;
}

/** Builds a helper function that combines context and mode prefix for prompt builders. */
export function buildContextPrefix(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const contextBlock = buildUserContextBlock(userCtx ?? null);
  const modeBlock = mode ? buildPresentationModeBlock(mode) : "";
  const parts = [contextBlock, modeBlock].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") + "\n\n" : "";
}

/** Builds an injected persona fragment block for the system prompt. */
export function buildPersonaBlock(personaId: string | null | undefined): string {
  const persona = getPersonaById(personaId ?? null);
  if (!persona) return "";
  return `\n\n${persona.promptFragment}`;
}

/** Builds a design brief block for the system prompt. */
export function buildDesignBriefBlock(designBrief: string | null | undefined): string {
  if (!designBrief || !designBrief.trim()) return "";
  const truncated = designBrief.trim().slice(0, 2000);
  return `\n\nUSER DESIGN BRIEF (highest priority — override defaults where they conflict):\n${truncated}`;
}

export function buildPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
): string {
  const slideCap = maxSlides
    ? `\n\nFREE-TIER OVERRIDE: Generate EXACTLY ${maxSlides} slides. Set \`const totalSlides = ${maxSlides}\`. Quality over quantity — each slide must still be fully complete with headline, body, and visual.`
    : "";
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  return `${prefix}${themeBlock}\n\n${BASE_PROMPT}${personaBlock}${briefBlock}${slideCap}`;
}

export function buildPlanningPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
): string {
  const slideTarget = maxSlides ? `exactly ${maxSlides}` : "8-12";
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  return `${prefix}${themeBlock}${personaBlock}${briefBlock}

You are planning a presentation before writing code.
Output a concise plan only (no JSX), with:
- target slide count (${slideTarget})
- one line per slide with title and purpose
- 2-3 visual/interactive elements to include
- final reminder: "ready for code generation"
`;
}

export function buildRepairPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
): string {
  const minSlides = maxSlides ?? 6;
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  return `${prefix}${themeBlock}${personaBlock}${briefBlock}

You are completing an unfinished React presentation component.
Return ONLY the corrected full component. Critical rules:
1. export default function Presentation()
2. const totalSlides = N  (N >= ${minSlides})
3. Include all slides from current === 0 to current === totalSlides - 1
4. Use var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub) — never hardcoded colours
5. Use sl-slide-up, sl-scale-in, sl-fade-in, sl-bar-grow, sl-delay-1..5 animation classes
   Anime.js is available as the global \`anime\`. Use \`anime({ targets, ... })\` inside \`useEffect(() => { ... }, [current])\` for complex animations.
6. Slide counter: {current + 1} / {totalSlides}
7. No markdown fences, no explanation, no commentary
8. Inside Presentation, include: useEffect(() => { window.parent?.postMessage({ type: 'sl_slide_change', current, total: totalSlides }, '*'); }, [current]);
9. Root div: className="h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text" — mandatory on every slide.
10. Min type scale: body text ≥ text-2xl; primary headings ≥ text-6xl. No max-w-sm/md/2xl on main content. No font sizes below 18px.
11. Background decoration is optional — add only when it reinforces structure or guides the eye.
`;
}

/**
 * Builds a context block from any files the user has attached to this generation request.
 */
export function buildAttachedFilesBlock(files: AttachedFile[]): string {
  if (files.length === 0) return "";

  const sections = files
    .map((f) => `--- File: ${f.name} ---\n${f.markdown.trim()}\n---`)
    .join("\n\n");

  return `\n\n# ATTACHED CONTEXT DOCUMENTS\nThe user has uploaded the following documents as context for this presentation. Prioritize the information, data, and structure found in these documents when generating slide content.\n\n${sections}`;
}

// Re-export AttachedFile so callers can import it from this module
export type { AttachedFile };

/** @deprecated Use buildPrompt(themeBlock) instead */
export const SYSTEM_PROMPT = BASE_PROMPT;
```

---

## Task 7: Create `src/lib/prompts/planning.ts`

**Files:**
- Create: `src/lib/prompts/planning.ts`

- [ ] **Step 1: Create the file**

Copy `buildPlanModeSystemPrompt`, `buildQuestionGenerationPrompt`, `buildOutlineFromAnswersPrompt`, `parsePlanResponse`, `parseQuestions`, `PlanResponse` from `src/lib/prompt.ts`.

```ts
// src/lib/prompts/planning.ts
import type { UserContext } from "@/store/slidiStore";
import { buildContextPrefix } from './builders';

export interface PlanResponse {
  progress: number | null;
  question: string | null;
  displayText: string;
}

/** Parses a numbered list of questions from AI output. */
export function parseQuestions(text: string): string[] {
  const matches = [...text.matchAll(/^\d+\.\s+(.+)$/gm)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

export function parsePlanResponse(text: string): PlanResponse {
  const progressMatch = text.match(/\[PROGRESS:(\d+)\]/);
  const questionMatch = text.match(/\[Q:\s*([\s\S]*?)\]/);

  const rawProgress = progressMatch ? parseInt(progressMatch[1], 10) : NaN;
  const progress: number | null = Number.isNaN(rawProgress) ? null : rawProgress;
  const question = questionMatch ? questionMatch[1].trim() : null;

  const displayText = text
    .replace(/\[PROGRESS:\d+\]\s*/g, "")
    .replace(/\[Q:[\s\S]*?\]\s*/g, "")
    .trim();

  return { progress, question, displayText };
}

/** System prompt for the Plan Mode conversational flow (no code output). */
export function buildPlanModeSystemPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);

  return `${prefix}You are a presentation strategist. Your job: immediately produce a slide outline for whatever the user gives you. Never ask questions first — make intelligent assumptions and show a concrete outline right away. The user can then refine it through conversation.

════════════════════════════════════════
OUTPUT FORMAT — NON-NEGOTIABLE, EVERY TURN:

Line 1 (mandatory): [PROGRESS:100]
Then a numbered slide outline:
  N. Slide Title — one-sentence purpose
End with exactly this line:
  **OUTLINE READY** — say "generate" or click the button below to create your deck.

If the user gives feedback ("make it funnier", "add a slide about X", "focus more on Y"), output a revised outline in the same format.
════════════════════════════════════════

OUTLINE RULES:
- Aim for 6–8 slides unless the user specifies a count.
- Make intelligent assumptions about audience, tone, and purpose from context clues. Never ask for clarification.
- If the topic is very vague (e.g., a single word), assume a general informative presentation and state that assumption in one sentence before the outline.
- Format: "N. Slide Title — one-sentence purpose"
- Always end with: **OUTLINE READY** — say "generate" or click the button below to create your deck.

════════════════════════════════════════
EXAMPLES — follow these exactly:

Example 1 — topic with context:
User: "anime for history class about japanese culture"
Your response:
[PROGRESS:100]
1. Introduction: What Is Anime? — Define anime and trace its origins in post-WWII Japan.
2. Roots in Japanese Art — Connect anime's visual language to ukiyo-e prints and manga tradition.
3. Themes That Reflect Society — Explore recurring themes: honor, nature, technology, identity.
4. Studio Ghibli & Cultural Export — How Miyazaki brought Japanese values to a global audience.
5. Anime and Modern Japan — Anime's role in tourism, economy, and national soft power today.
6. Controversies & Critiques — Address cultural appropriation and stereotyping debates.
7. Conclusion: A Mirror of Japan — Anime as a lens into Japanese history and cultural identity.
**OUTLINE READY** — say "generate" or click the button below to create your deck.

Example 2 — vague topic:
User: "turtles"
Your response:
[PROGRESS:100]
Treating this as a general informative presentation about sea turtles.
1. Meet the Sea Turtle — Overview of species and global distribution.
2. Ancient Navigators — 100 million years of evolution and survival.
3. Life Cycle — From egg to ocean: nesting, hatching, and migration.
4. Threats & Challenges — Plastic pollution, climate change, and poaching.
5. Conservation Heroes — Organizations and communities protecting turtles worldwide.
6. What You Can Do — Practical actions to help sea turtle populations recover.
**OUTLINE READY** — say "generate" or click the button below to create your deck.

Example 3 — user refines the outline:
User: "make slide 4 focus on Hayao Miyazaki specifically"
Your response:
[PROGRESS:100]
1. Introduction: What Is Anime? — Define anime and trace its origins in post-WWII Japan.
2. Roots in Japanese Art — Connect anime's visual language to ukiyo-e prints and manga tradition.
3. Themes That Reflect Society — Explore recurring themes: honor, nature, technology, identity.
4. Hayao Miyazaki: A Cultural Icon — Deep dive into Miyazaki's life, philosophy, and films as mirrors of Japanese values.
5. Anime and Modern Japan — Anime's role in tourism, economy, and national soft power today.
6. Controversies & Critiques — Address cultural appropriation and stereotyping debates.
7. Conclusion: A Mirror of Japan — Anime as a lens into Japanese history and cultural identity.
**OUTLINE READY** — say "generate" or click the button below to create your deck.
════════════════════════════════════════`;
}

/** System prompt for generating clarifying questions (Phase 1 of the wizard). */
export function buildQuestionGenerationPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);
  return `${prefix}You are a presentation strategist. Your job: generate exactly 8 targeted questions to understand what the user needs before building their slide outline.

OUTPUT FORMAT — CRITICAL:
Output ONLY a numbered list of 8 questions, one per line. No preamble, no explanation, no other text whatsoever.

1. First question?
2. Second question?
3. Third question?
4. Fourth question?
5. Fifth question?
6. Sixth question?
7. Seventh question?
8. Eighth question?

QUESTION RULES:
- Cover these areas (one question each, adapted to the topic): audience, goal/purpose, tone/style, key topics to include, real examples or data to highlight, slide count or time available, anything to avoid, level of prior knowledge the audience has
- Each question is short, specific, and answerable in a sentence or two
- Do NOT ask compound questions
- Exactly 8 questions — no more, no less
- Output the numbered list only`;
}

/** System prompt for generating an outline from collected Q&A answers (Phase 3 of the wizard). */
export function buildOutlineFromAnswersPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);
  return `${prefix}You are a presentation strategist. The user has answered a set of clarifying questions about their presentation. Based on their answers, produce a tailored slide outline immediately — no further questions.

OUTPUT FORMAT — NON-NEGOTIABLE:
Line 1 (mandatory): [PROGRESS:100]
Then a numbered slide outline:
  N. Slide Title — one-sentence purpose
End with exactly this line:
  **OUTLINE READY** — say "generate" or click the button below to create your deck.

OUTLINE RULES:
- Reflect the user's specific answers — audience, tone, examples, scope — precisely
- Aim for 6–8 slides unless the user specified otherwise
- Format: "N. Slide Title — one-sentence purpose"
- Always end with: **OUTLINE READY** — say "generate" or click the button below to create your deck.`;
}
```

---

## Task 8: Create `src/lib/prompts/index.ts`

**Files:**
- Create: `src/lib/prompts/index.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/prompts/index.ts
export {
  BASE_PROMPT,
  SYSTEM_PROMPT,
  buildPrompt,
  buildPlanningPrompt,
  buildRepairPrompt,
  buildUserContextBlock,
  buildPresentationModeBlock,
  buildContextPrefix,
  buildPersonaBlock,
  buildDesignBriefBlock,
  buildAttachedFilesBlock,
} from './builders';

export type { AttachedFile } from './builders';

export {
  buildPlanModeSystemPrompt,
  buildQuestionGenerationPrompt,
  buildOutlineFromAnswersPrompt,
  parsePlanResponse,
  parseQuestions,
} from './planning';

export type { PlanResponse } from './planning';
```

---

## Task 9: Replace `src/lib/prompt.ts` with shim + run all tests

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **Step 1: Replace the entire content of `src/lib/prompt.ts`**

```ts
// src/lib/prompt.ts
// This file is a backward-compatibility shim.
// All logic lives in src/lib/prompts/
export * from './prompts/index';
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /c/Users/berol/Projekte/AiTools/slidi && npm test -- --run 2>&1 | tail -50
```

Expected: All tests pass, including the new quality-rule tests added in Task 5.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /c/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/berol/Projekte/AiTools/slidi && git add src/lib/prompt.ts src/lib/prompts/ src/__tests__/prompt.test.ts docs/superpowers/ && git commit -m "refactor(prompt): split prompt.ts into focused modules + add slide quality rules

- Split BASE_PROMPT into rendering/animations/visuals/layout sections
- Add hard text-size floor: 18px minimum, body ≥ text-2xl, headings ≥ text-6xl
- Add no-emoji rule for professional presentations
- Add one-idea-per-slide, 45–70 word limit, max 5 content blocks per slide
- Add visual hierarchy contract (dominant focal point + secondary area)
- Limit card grids to 30% of slides, max 3 columns
- Make background decoration optional (structural use only)
- Add FINAL SLIDE RULE: separate CTA, takeaways, and case studies
- src/lib/prompt.ts becomes a one-liner re-export shim (no callers change)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Split into `src/lib/prompts/` directory | Tasks 1–8 |
| `rendering.ts` — component contract, CSS vars, skeleton, text floor, no-emoji | Task 1 |
| `animations.ts` — TIER 1 + TIER 2 | Task 2 |
| `visuals.ts` — icons, charts, background fills (optional rule) | Task 3 |
| `layout.ts` — archetypes + content-density rules | Task 4 |
| `builders.ts` — all build* functions | Task 6 |
| `planning.ts` — planning prompts | Task 7 |
| `index.ts` re-exports + shim | Tasks 8–9 |
| No callers change | Shim in Task 9 |
| Text floor ≥ 18px | Task 1 (rendering), Task 4 (layout rule 30) |
| No emoji | Task 1 (rendering) |
| One idea per slide | Task 4 |
| Max 5 blocks, 45–70 words | Task 4 |
| Hierarchy contract | Task 4 |
| Card grids ≤ 30% | Task 4 |
| Background decoration optional | Task 3 |
| Final slide rule | Task 4 |
| All existing tests pass | Task 9 step 2 |
| New quality-rule tests | Task 5 step 2 |

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `buildContextPrefix` defined in `builders.ts` and imported in `planning.ts` — consistent. `BASE_PROMPT` exported from `builders.ts` (re-exported from `base/index.ts`) and used in `buildPrompt` — consistent. `AttachedFile` type re-exported from `builders.ts` and forwarded through `prompts/index.ts` — consistent.
