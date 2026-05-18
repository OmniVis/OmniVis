# Phase 10: Anime.js Integration & 16:9 Layout Quality

**Difficulty:** Medium  
**Focus:** Richer AI-generated animations via Anime.js, explicit 16:9 spatial awareness in the system prompt, and live layout anti-pattern detection.
**Status:** Done and tested, 95% working

The core premise: Slidi's presentations run as interactive React components inside a 16:9 iframe. The existing animation palette is seven CSS keyframe classes — useful but limited. The existing layout guidance is implicit — the AI frequently produces slides with dead space, undersized text, or content squeezed into a narrow centered column that looks wrong on a projected screen. Phase 10 fixes both by giving the AI better tools (Anime.js) and stricter spatial contracts (layout rules baked into the system prompt and validated in code).

---

## Task 1 — Anime.js Runtime Integration

**Problem:** The AI is currently limited to seven CSS keyframe classes (`sl-fade-in`, `sl-slide-up`, `sl-slide-left`, `sl-scale-in`, `sl-float`, `sl-pulse-ring`, `sl-bar-grow`) and a manual `requestAnimationFrame` counter. These produce acceptable but generic motion design. Anime.js — a 17 KB library — unlocks physics-based spring easings, timeline-sequenced multi-target animations, SVG stroke drawing, and staggered reveal patterns that would take hundreds of lines of manual CSS/JS to replicate. Since presentations already run inside a `srcdoc` iframe with full JavaScript access, Anime.js can be added as a UMD global with a single script tag.

**Files:**
- `src/components/SrcdocPreview.tsx` — **[MODIFIED]** add Anime.js UMD CDN tag to `buildSrcdoc()` (~line 174, after the Babel standalone tag)
- `src/lib/prompt.ts` — **[MODIFIED]** rewrite the animation section of `BASE_PROMPT` (rules 21–24) and add four Anime.js code examples; update `buildRepairPrompt()` to mention `anime` is available

**Implementation Steps:**
1. **Add CDN tag to `buildSrcdoc()` in `SrcdocPreview.tsx`:**
   - Insert directly after the existing Babel standalone line:
     ```html
     <script src="https://unpkg.com/animejs@3/anime.min.js"></script>
     ```
   - No version lock is needed at this stage — Anime.js v3 has a stable API. Add a comment marking it as a presentation-sandbox global.
   - `anime` is now a global available to all generated presentation components without any import statement.

2. **Rewrite the animation section of `BASE_PROMPT` in `prompt.ts`:**
   - Replace the current rules 21–24 (CSS class stagger pattern) with a two-tier system:
     - **Tier 1 — CSS entrance classes** (`sl-*`): use for one-shot entrance/exit effects that trigger via `key={current}` on the slide container. Same as before.
     - **Tier 2 — Anime.js**: use for anything that requires a timeline, spring physics, SVG path drawing, or staggered multi-target sequences. Always called inside `useEffect(() => { ... }, [current])` so animations re-trigger on slide change.
   - Include four embedded code examples in the prompt:

   **Example A — Spring stagger entrance (replaces the manual CSS delay pattern):**
   ```jsx
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
   ```

   **Example B — Timeline sequence (headline → subtext → visual):**
   ```jsx
   useEffect(() => {
     const tl = anime.timeline({ easing: 'easeOutExpo' });
     tl.add({ targets: '.sl-headline', translateX: [-60, 0], opacity: [0, 1], duration: 600 })
       .add({ targets: '.sl-sub',      translateX: [-40, 0], opacity: [0, 1], duration: 500 }, '-=300')
       .add({ targets: '.sl-visual',   scale:      [0.85, 1], opacity: [0, 1], duration: 500 }, '-=200');
   }, [current]);
   ```

   **Example C — SVG stroke draw (for charts, diagrams, icons):**
   ```jsx
   useEffect(() => {
     anime({ targets: '.sl-path', strokeDashoffset: [anime.setDashoffset, 0],
             easing: 'easeInOutSine', duration: 1200, delay: anime.stagger(150) });
   }, [current]);
   // Usage: <path className="sl-path" d="M10 80 Q95 10 180 80" fill="none"
   //               stroke="var(--sl-accent)" strokeWidth="3" />
   ```

   **Example D — Animated counter (replaces the manual requestAnimationFrame pattern):**
   ```jsx
   useEffect(() => {
     const obj = { val: 0 };
     anime({ targets: obj, val: 4200000, round: 1, duration: 1800, easing: 'easeOutExpo',
             update: () => { const el = document.querySelector('.sl-counter');
                             if (el) el.textContent = obj.val.toLocaleString(); } });
   }, [current]);
   // Usage: <span className="sl-counter">0</span>
   ```

   - Also document key Anime.js API facts the AI must know to avoid hallucination:
     - `anime.stagger(n)` — uniform delay in ms between each target
     - `easing: 'spring(mass, stiffness, damping, velocity)'` — physics spring; `duration` is ignored
     - `anime.timeline({ defaults })` — sequential timeline; `.add(params, offset)` where offset can be `'-=Nms'`
     - `targets` accepts a CSS selector string, a DOM element, or a NodeList
     - `anime.setDashoffset` is a function value — pass it directly, no call needed

3. **Update `buildRepairPrompt()` in `prompt.ts`:**
   - Add one line after the animation class list: `Anime.js is available as the global \`anime\`. Use \`anime({ targets, ... })\` inside \`useEffect(() => { ... }, [current])\` for complex animations.`

**Verification:**
- Open the browser console inside the preview iframe (`SrcdocPreview` → right-click → inspect frame) → `typeof anime` returns `"function"`.
- Generate "a presentation about space with spring animations on the headlines" → the AI uses `anime({ easing: 'spring(...)' })` in a `useEffect`.
- Generate "a presentation with an animated SVG orbit diagram" → the AI uses `strokeDashoffset` + `anime.setDashoffset`.
- No regressions: existing presentations using `sl-slide-up` and `sl-bar-grow` still animate correctly.

---

## Task 2 — 16:9 Spatial Awareness & Layout Rules

**Problem:** The slide canvas is always 16:9 (the `SrcdocPreview` iframe constrains to the full `h-screen w-screen` viewport, which in a typical presentation window is roughly 1280×720 or 1920×1080). The AI does not know this. It regularly:
- Centers content in a `max-w-2xl` column, leaving ~40% of the canvas as empty side margins.
- Uses `text-base` or `text-lg` for body copy that reads comfortably on a laptop but is illegible when projected.
- Stacks 6 bullet points on a slide when the canvas has space for a proper two-column layout.
- Produces 3–4 consecutive slides with identical structure (heading top-left, body below, accent shape top-right).

The fix is a dedicated **LAYOUT CONTRACT** section in the system prompt that translates the 16:9 physical reality into concrete Tailwind class rules and layout archetypes the AI can follow exactly.

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** `BASE_PROMPT`: add LAYOUT CONTRACT section (new rules 25–32); update the structural skeleton
- `src/lib/prompt.ts` — **[MODIFIED]** `buildRepairPrompt()`: add spatial fill rule
- `src/lib/ai.ts` — **[MODIFIED]** `assertLikelyCompletePresentation()`: add soft `h-screen` check

**Implementation Steps:**
1. **Add LAYOUT CONTRACT to `BASE_PROMPT`:**

   ```
   LAYOUT CONTRACT — 16:9 CANVAS:
   25. The canvas is ALWAYS 16:9 (≈1920×1080px). Treat it like a projected screen, not a browser window.
   26. Every slide's outermost element MUST be: className="h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text"
       Never constrain the root to less than the full viewport.
   27. Minimum type scale — NEVER go below these on a slide:
       - Section labels / eyebrows:  text-sm uppercase tracking-widest
       - Body / supporting copy:     text-xl leading-relaxed  (not text-base, not text-lg)
       - Data labels / captions:     text-base
       - Sub-headings:               text-4xl font-bold
       - Primary headings:           text-6xl font-black  (text-7xl or text-8xl preferred for title slides)
   28. Content width — primary text areas must use at least px-16 or px-20 horizontal padding on the root,
       NOT a narrow max-w-* container. Two-column layouts use w-1/2 or grid-cols-2 to fill the canvas.
       NEVER use max-w-sm, max-w-md, or max-w-2xl for the main content block of a slide.
   29. Spatial fill — content + decorative elements together must cover ≥70% of the canvas.
       Every slide needs at least ONE visual element: SVG chart, stat callout, icon grid, decorative shape, or image placeholder.
   30. Layout variety — rotate through these 6 archetypes. NEVER repeat the same archetype on 3 consecutive slides:
       A. HERO-FULL-BLEED:      full-height title, giant heading, full-width coloured band or background shape
       B. TWO-COLUMN 50/50:     left = text + heading, right = chart / visual / data grid
       C. STAT-SPOTLIGHT:       1–3 enormous numbers centred on the canvas, brief caption beneath each
       D. CHART-WITH-ANNOTATION: chart fills 60% width, annotation text panel on the right 40%
       E. TIMELINE-HORIZONTAL:  horizontal flow of 3–6 milestones using absolute or flex positioning
       F. QUOTE-WITH-ACCENT:    full-bleed quote in large italic text, accent stripe or author portrait on one side
   31. Padding baseline: px-20 py-16 on the root unless a full-bleed layout intentionally removes padding.
   32. Decorative shapes: every slide should have ≥1 `sl-float` decorative circle/blob in a corner.
       Minimum size: w-48 h-48. Use opacity-10 to opacity-20 so it does not compete with content.
   ```

2. **Update the structural skeleton in `BASE_PROMPT`:**
   - Replace the current minimal skeleton (lines 117–154) with 3 filled-in slide examples — one HERO-FULL-BLEED, one TWO-COLUMN, one STAT-SPOTLIGHT — so the AI sees concrete width/padding/typography choices in action.
   - The skeleton must include the `useEffect` for Anime.js on the HERO slide to tie Task 1 and Task 2 together in one teaching example.

3. **Update `buildRepairPrompt()`:**
   - Add after rule 5: `8. Root div: className="h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text" — mandatory on every slide.`
   - Add after rule 6: `9. Min type scale: body text ≥ text-xl; primary headings ≥ text-6xl. No max-w-sm/md/2xl on main content.`

4. **Soft `h-screen` check in `assertLikelyCompletePresentation()` in `ai.ts`:**
   - After the existing syntax balance checks, add:
     ```typescript
     if (!trimmed.includes('h-screen') && !trimmed.includes('min-h-screen')) {
       // Soft warning — do not throw, but log so we can track prompt regression
       console.warn('[Slidi] Generated code missing h-screen on root. Possible layout regression.');
     }
     ```
   - This is intentionally non-throwing: layout issues are UX problems, not render failures. The warning is for developer telemetry, not user-facing.

**Verification:**
- Generate a 10-slide deck → inspect rendered code: no `max-w-2xl`, all headings `text-6xl` or larger, every slide has `h-screen w-screen` on the root.
- Generate a deck and check that ≥4 different layout archetypes appear across 10 slides.
- Generate a stat slide → numbers are `text-8xl` or larger and centred on the canvas, not squeezed into a narrow column.
- Repair prompt used on a regression slide → repaired output includes `h-screen w-screen` and correct padding.

---

## Task 3 — Live Layout Anti-Pattern Detection

**Problem:** Even with the improved prompt, the AI occasionally regresses — especially on follow-up edits where `skipPlanning: true` bypasses the full layout contract. Users see the result but don't know why it looks wrong. The fix is a lightweight runtime validator that inspects the generated code string after every `generatePresentation` or `generateSlideEdit` call and surfaces specific, actionable warnings in the chat.

**Files:**
- `src/lib/ai/layoutValidator.ts` — **[NEW]** `detectLayoutAntiPatterns(code): LayoutWarning[]`
- `src/components/ChatPane.tsx` — **[MODIFIED]** run validator after each successful generation; surface warnings as a collapsible notice message

**Implementation Steps:**
1. **`layoutValidator.ts`:**
   - `LayoutWarning: { slideIndex: number | null; severity: 'error' | 'warning'; type: string; message: string }`
   - `detectLayoutAntiPatterns(code: string): LayoutWarning[]` — runs all checks below, returns the complete list:

   | Check | Severity | Detection |
   |---|---|---|
   | Missing `h-screen` on root | `warning` | `!code.includes('h-screen') && !code.includes('min-h-screen')` |
   | `max-w-sm` / `max-w-md` / `max-w-2xl` on content block | `warning` | regex per slide block; skip if inside a `className="` that also includes `absolute` (decorative elements exempt) |
   | Heading below `text-4xl` | `warning` | detect `text-sm`/`text-base`/`text-lg`/`text-xl`/`text-2xl`/`text-3xl` on an `<h1` or `<h2` element |
   | Slide with no visual element | `warning` | per slide block: no `<svg`, no `<img`, no class matching `rounded-full` `w-[4-9]\d` (large rounded shapes) |
   | 3+ consecutive slides with identical layout signature | `warning` | hash the first className on the outermost `<div key={current}>` for each slide; flag runs of 3 identical hashes |

   - Each check is a pure function tested in isolation.
   - `detectLayoutAntiPatterns` is `O(N)` in the code length — no AI calls, no async, runs synchronously in <5ms.

2. **Integration in `ChatPane.tsx`:**
   - After `pushVersion(result.code)` succeeds, call:
     ```typescript
     const warnings = detectLayoutAntiPatterns(result.code);
     if (warnings.length > 0) {
       const summary = warnings.slice(0, 3).map(w =>
         w.slideIndex !== null ? `Slide ${w.slideIndex + 1}: ${w.message}` : w.message
       ).join(' · ');
       addMessage({ role: 'system', content: `Layout notes: ${summary}`, isLayoutWarning: true });
     }
     ```
   - Add `isLayoutWarning?: boolean` to the `ChatMessage` type in `slidiStore.ts`.
   - In `ChatPane` JSX: render `isLayoutWarning` messages as a collapsible amber strip (same style as the incomplete-slide notice) with a small "Dismiss" × button.
   - Warnings do NOT block the user — the presentation is displayed regardless.

3. **Tests (`src/__tests__/layout-quality.test.ts`):**
   - `h-screen` missing → warning detected.
   - `max-w-2xl` on content → warning detected.
   - `<h1 className="text-xl">` → heading size warning.
   - Slide with no `<svg`, no `<img`, no large rounded shape → no-visual warning.
   - 3 consecutive slides with identical root classNames → repetition warning.
   - A clean deck → empty array returned.

**Verification:**
- Generate a deck intentionally with `max-w-2xl` (e.g., via a direct store code push in a test) → amber layout warning appears in the chat with the correct slide index.
- Generate a high-quality deck → no layout warning message appears.
- The warning is collapsible: clicking × removes it from the chat.
- `npm test -- --run` → all tests pass including the new `layout-quality.test.ts`.
