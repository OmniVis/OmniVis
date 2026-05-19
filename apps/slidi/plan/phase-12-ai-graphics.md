# Phase 12: AI Graphics & Visuals Integration

**Difficulty:** Easy
**Focus:** Prompt Engineering, External Libraries, Asset Management
**Status:** Planned

The core premise: Slidi's AI currently attempts to generate inline SVG paths when asked for complex visuals like a car, a globe, or a brand logo. Large Language Models frequently hallucinate broken or malformed SVG paths. This phase updates the AI's generation contract so it relies on robust, external graphic libraries (Google Material Symbols and the Iconify API) instead of trying to draw SVGs from scratch.

---

## Task 1 — Injecting Graphic Libraries into the Sandbox

**Problem:** To allow the generated React component to seamlessly display icons and logos, the execution environment (`SrcdocPreview.tsx`) needs to load the necessary external assets.

**Files:**
- `src/components/SrcdocPreview.tsx` — **[MODIFIED]** inject the Google Material Symbols font stylesheet into the `<head>` of the generated iframe.

**Implementation Steps:**

1. **Add Material Symbols `<link>`:**
   Inside `buildSrcdoc`, locate the `<head>` block where Google Fonts and Tailwind are loaded. Add the Material Symbols Rounded stylesheet:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
   ```
2. **Update CSP Header (if necessary):**
   Ensure the `Content-Security-Policy` allows `https://fonts.googleapis.com` for styles and `https://fonts.gstatic.com` for fonts, and allows images from `https://api.iconify.design` (`img-src * data: blob:;` is already present, but verify it works).

**Verification:**
- Load the preview environment and manually inject `<span class="material-symbols-rounded">directions_car</span>` into the DOM. Ensure a car icon appears correctly.

---

## Task 2 — Updating the AI Prompt (Graphics Contract)

**Problem:** The AI needs strict instructions on *how* to use the newly available graphics tools, and when to use which tool.

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** add a new section in `BASE_PROMPT` for external graphics and icons.

**Implementation Steps:**

1. **Locate `BASE_PROMPT`:**
   Find the "INTERACTIVE ELEMENTS & VISUALIZATIONS" section in `BASE_PROMPT`.
2. **Add the Graphics Contract:**
   Inject the following rules to instruct the AI on using Material Symbols and Iconify:

   ```text
   EXTERNAL GRAPHICS & ICONS (CRITICAL):
   Do NOT attempt to write complex SVG paths (like cars, people, or globes) from scratch. You will hallucinate and fail. Use these two libraries instead:

   1. UI Icons & Simple Vector Shapes (Material Symbols):
      Available globally. Use for generic icons (e.g., car, rocket, analytics, warning).
      Syntax: <span className="material-symbols-rounded" style={{ fontSize: '120px', color: 'var(--sl-accent)' }}>directions_car</span>
      Common names: directions_car, lightbulb, rocket_launch, bar_chart, monitoring, public, group.

   2. Brand Logos & Emojis (Iconify API):
      Use for specific brand logos or multi-colored icons (e.g., React logo, Twitter, colored emojis).
      Syntax: <img src="https://api.iconify.design/[set]/[icon].svg" className="w-32 h-32" alt="icon" />
      Example Logos: logos:react, logos:javascript, logos:aws
      Example Emojis: twemoji:oncoming-automobile, twemoji:rocket
   ```

3. **Update Structural Layout Examples:**
   Modify at least one of the layout archetypes (e.g., `STAT-SPOTLIGHT` or `TWO-COLUMN`) in the prompt's skeleton example to use a `material-symbols-rounded` icon instead of (or in addition to) the generic `sl-float` circle, to give the AI a concrete syntax example.

**Verification:**
- Prompt the AI: "Create a presentation about Electric Vehicles. Put an SVG of a car on the first slide."
- Verify the output contains `<span className="material-symbols-rounded">directions_car</span>` or an Iconify `twemoji:automobile` image, and **not** a giant, broken raw `<svg><path .../></svg>` string.
- Check that the icons inherit the theme colors correctly when using Material Symbols.
