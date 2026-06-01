# Phase 13: Design Overhaul — Visual Identity, Dead Space & Design Brief System

**Difficulty:** Hard  
**Focus:** Prompt Engineering, UI, Design System, File Upload  
**Status:** Planned

The core premise: Slidi's generated presentations suffer from three interlocking problems.
First, **dead space** — slides consistently leave 30–50% of the 16:9 canvas untouched despite Phase 8's layout contract, because the AI treats empty canvas as "clean" rather than "wasted". 
Second, **homogeneity** — every deck regardless of topic ends up using the same visual vocabulary: centered heading, bullet list below, floating circle in the corner. Structurally identical across all runs.
Third, **the AI-generated look** — no visual rhythm, no deliberate contrast hierarchy, no typographic personality. A human designer would never produce these.

This phase attacks all three roots simultaneously, then adds **design.md** — a user-authored design brief that gets injected into the AI prompt to give presentations a real identity.

---

## Task 1 — Design Personas: Visual DNA for the AI

**Problem:** The current theme system only swaps colors. Two completely different color palettes produce structurally identical slides. The AI needs a richer "design identity" it can commit to — not just colors but a full visual language covering typography, layout preference, decoration style, spacing philosophy, and motion character.

**Files:**
- `src/lib/designPersonas.ts` — **[NEW]** defines 6 design persona objects
- `src/lib/prompt.ts` — **[MODIFIED]** inject the active persona's prompt fragment into `BASE_PROMPT`
- `src/store/slidiStore.ts` — **[MODIFIED]** add `activePersona` to presentation settings
- `src/components/DesignPersonaPicker.tsx` — **[NEW]** UI component to choose a persona

**Implementation Steps:**

1. **Define the 6 Personas in `designPersonas.ts`:**

   Each persona object has:
   ```typescript
   interface DesignPersona {
     id: string;
     label: string;
     description: string; // shown in the picker
     promptFragment: string; // injected into the system prompt (~150 tokens)
     previewClasses: string; // Tailwind for the picker tile preview
   }
   ```

   | ID | Label | Visual Identity |
   |---|---|---|
   | `editorial` | **Editorial Magazine** | Large serif headline dominates upper third; body copy in narrow justified column on left; full-bleed image/visual fills right 55%; heavy use of horizontal rules and eyebrow labels |
   | `neo-brutalist` | **Neo-Brutalist** | Thick black outlines on all containers, offset drop shadows (4–8px solid), intentionally asymmetric layouts, raw sans-serif at extreme weights (900), accent colours used in large flat blocks |
   | `tech-dark` | **Tech / Dark Mode** | Deep charcoal or near-black backgrounds, neon or electric accent, monospace font for data/code callouts, grid lines as decorative structure, glowing or blurred circle effects behind stats |
   | `organic-warm` | **Organic & Warm** | Soft rounded shapes (pill containers, blob SVGs), warm neutrals (cream, terracotta, sand), generous whitespace treated as breathing room rather than emptiness, humanist sans-serif |
   | `corporate-bold` | **Corporate Bold** | High-contrast colour blocks (top third = accent colour, bottom two-thirds = white/light), large geometric shapes as structural dividers, clear information hierarchy with strong grid discipline |
   | `minimal-swiss` | **Minimal Swiss** | Strict grid alignment, almost no decoration, typography IS the design (large tracking on all-caps labels, weight contrast between headline and body), intentional negative space as a design choice |
   | `adesso` | **adesso** | Official adesso SE brand identity — adesso-blue (#006ab3) as primary, Chivo font, "The Vertical" 45° angled line element as signature shape, left-aligned axis, tonal elevation (no heavy shadows), blue-to-teal gradients, subtle 1px borders on white/light-grey containers |

   > **Source:** `assets/designs/adessoSE_DESIGN.md` — this persona is directly derived from the official adesso SE design system. The promptFragment must faithfully implement it.

2. **Prompt fragments per persona (examples):**

   `editorial` fragment:
   ```
   DESIGN PERSONA — EDITORIAL MAGAZINE:
   Think Wired, Bloomberg Businessweek, or The Economist. Visual rules:
   - Headline: serif font-serif, text-8xl font-black, occupies top 30% of canvas
   - Right 55% of canvas: always a visual (chart, image placeholder, SVG illustration) — never text
   - Left 45%: body copy, caption, eyebrow label (text-sm uppercase tracking-widest mb-2)
   - Horizontal rules (border-t-2 border-current opacity-20) separate sections
   - No decorative blobs. Use geometric rectangles as accent shapes.
   - Colour: one dominant accent applied as a background block behind the headline
   ```

   `neo-brutalist` fragment:
   ```
   DESIGN PERSONA — NEO-BRUTALIST:
   Think Figma Community showcases, brutalist.design. Visual rules:
   - All containers: border-4 border-black, box-shadow: 6px 6px 0 black (use style={{boxShadow:'6px 6px 0 #000'}})
   - Layouts MUST be asymmetric — never perfectly centered. Off-grid intentionally.
   - Headings: font-black text-8xl, all uppercase, may overlap decorative elements
   - Accent blocks: flat solid colour rectangles, no gradients, no rounded corners
   - Background: white or very light — let the borders and shadows do the work
   - One element per slide must break the grid (absolute positioned, rotated 2–5 degrees)
   ```

   `adesso` fragment:
   ```
   DESIGN PERSONA — ADESSO SE (OFFICIAL BRAND):
   Implement the adesso SE corporate design system exactly. Source: adessoSE_DESIGN.md.

   FONT: Chivo (already loaded via Google Fonts — use font-family: 'Chivo', sans-serif via Tailwind's font-sans if configured, or style={{fontFamily:"'Chivo', sans-serif"}}). All text uses Chivo. No other font.

   COLOURS (use these exact hex values via inline styles where CSS vars don't cover them):
   - Primary blue:        #006ab3  (headers, accent blocks, CTA elements, "The Vertical")
   - Dark blue:           #00518b  (hover states, deep backgrounds)
   - Light grey bg:       #f2f2f2  (container backgrounds, cards)
   - White:               #ffffff  (page/slide base background)
   - Text primary:        #1a1c1c
   - Text secondary:      #414751
   - Teal accent:         #00755f  (used SPARINGLY — high-energy callouts only)
   - Border/outline:      #e2e2e2  (1px borders on cards and containers)

   GRADIENTS: Blue-dominant, luminous, never muddy.
   - Standard bg gradient: linear-gradient(135deg, #006ab3 0%, #0097a7 60%, #00bfa5 100%)
   - Subtle overlay:       linear-gradient(160deg, #f2f2f2 0%, #e8f0fa 100%)
   Use as full-bleed backgrounds or in header bands. Never as text colours.

   "THE VERTICAL" — SIGNATURE ELEMENT (mandatory on every slide, at least once):
   An angled line element with a strict 45-degree terminus. Implement as one of:
   A. Left-side accent line on cards:
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{background:'#006ab3'}}/>  (inside a relative container)
   B. Angled corner cut on a container (bottom-right):
      Use clip-path: polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)
      via style={{clipPath:'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)'}}
   C. Decorative diagonal bar (full-width divider):
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{background:'linear-gradient(90deg,#006ab3,#00bfa5)'}}/>
   D. SVG angled bracket next to headings:
      <svg width="8" height="40" viewBox="0 0 8 40"><path d="M8 0 L0 20 L8 40" fill="none" stroke="#006ab3" strokeWidth="2"/></svg>

   LAYOUT: Left-aligned axis. Content anchors to a strong left edge.
   - Root: h-screen w-screen bg-white (or light grey for containers)
   - Primary padding: px-20 py-16 (or px-16 for tighter sections)
   - Text always left-aligned (text-left) — NEVER centered unless a stat-spotlight archetype
   - Cards/containers: bg-[#f2f2f2] or bg-white, border border-[#e2e2e2], rounded (4px = rounded), NO drop shadows
   - Elevation via colour tone only: white = level 0, #f2f2f2 = level 1, #e8e8e8 = level 2

   TYPOGRAPHY SCALE (mandatory — use inline styles for Chivo since Tailwind may not have it configured):
   - Display / slide title:    font-size 64–80px, font-weight 800, line-height 1.1, letter-spacing -0.02em
   - Section headline:         font-size 40–48px, font-weight 700, line-height 1.2
   - Sub-headline:             font-size 28–32px, font-weight 700, line-height 1.3
   - Body large:               font-size 20–22px, font-weight 400, line-height 1.6
   - Label / eyebrow:          font-size 12–14px, font-weight 600, uppercase, letter-spacing 0.08em
   All implemented via style={{fontFamily:"'Chivo',sans-serif", fontSize:'64px', fontWeight:800, ...}}

   SHAPES: Subtle rounding only (4px = rounded). NO blobs, NO organic shapes.
   Pill shapes allowed only for tags/badges/status indicators.
   "The Vertical" 45-degree cut is the ONLY angular decoration.

   FORBIDDEN:
   - Organic blob shapes (rounded-full with large sizes as decoration)
   - Heavy drop shadows (no shadow-lg, no shadow-xl on content cards)
   - Centered text layouts (except STAT-SPOTLIGHT)
   - Any font other than Chivo
   - Gradient text (gradient on backgrounds only)
   ```

3. **Inject active persona into `BASE_PROMPT`:**
   In `prompt.ts`, export a `buildBasePrompt(persona: DesignPersona | null): string` function (rename the current `BASE_PROMPT` constant).
   Inject `persona.promptFragment` after the LAYOUT CONTRACT section and before the skeleton examples.
   If no persona is active (or persona is null), use a default "no persona override" stub that keeps the existing layout rules.

4. **Add `activePersona` to store:**
   In `slidiStore.ts`, add `activePersona: string | null` (persona ID) to the per-presentation settings, defaulting to `null`.
   Expose `setActivePersona(id: string | null)` action.

5. **`DesignPersonaPicker.tsx`:**
   - A row of 7 tile cards (6 generic + adesso) shown in the generation settings panel (or as a step before generation).
   - Each tile shows: persona label, 2-line description, a tiny visual preview using `previewClasses`.
   - The `adesso` tile uses `previewClasses: "bg-[#006ab3] text-white"` and shows the "Vertical" SVG accent element.
   - Selected tile gets a colored ring. Clicking again deselects (back to default).
   - Location: insert into the existing "New Presentation" dialog or the settings sidebar.
   - The adesso tile may optionally show the adesso logo mark or "adesso SE" label in the tile to make it clearly identifiable.

**Verification:**
- Select `neo-brutalist` → generate a 5-slide deck → every slide has `border-4 border-black` containers and `boxShadow` on at least one element.
- Select `editorial` → all slides have a right-side visual and serif headline.
- Select `adesso` → generate a 5-slide deck → verify:
  - All text uses `fontFamily: "'Chivo', sans-serif"` in inline styles
  - Primary colour is `#006ab3` (inspect rendered elements)
  - Every slide contains "The Vertical" element (left accent line, angled clip-path, or diagonal bar)
  - No organic blob shapes present
  - Backgrounds are white or `#f2f2f2`, not dark
  - At least one slide uses a blue-to-teal gradient background
- No persona selected → existing behavior unchanged.

---

## Task 2 — Dead Space Eradication: Background Fills & Zonal Coverage

**Problem:** Phase 8's 70% coverage rule is in the prompt, but the AI ignores it because it has no concrete examples of what "filling the canvas" actually looks like. The fix is twofold: add mandatory **background fill layers** (SVG patterns, gradient fills, large decorative shapes that span the full canvas), and introduce 4 new layout archetypes that structurally force edge-to-edge coverage.

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** expand LAYOUT CONTRACT with background fills and 4 new archetypes
- `src/lib/prompt.ts` — **[MODIFIED]** replace skeleton examples with 6 full-coverage examples

**Implementation Steps:**

1. **Mandatory Background Fill Layer:**
   Add to LAYOUT CONTRACT (after rule 32):

   ```
   33. BACKGROUND FILL (mandatory): Every slide MUST have at least one background layer beyond a flat colour.
       Choose ONE of the following — place it as the first child inside the root div, position absolute, z-index 0:
       A. SVG geometric grid:
          <svg className="absolute inset-0 w-full h-full opacity-5" ...>
            <defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
       B. Large accent circle (w-[900px] h-[900px], positioned off-corner):
          <div className="absolute -top-64 -right-64 w-[900px] h-[900px] rounded-full opacity-10"
               style={{background:'var(--sl-accent)'}}/>
       C. Diagonal colour band:
          <div className="absolute inset-0 opacity-15" 
               style={{background:'linear-gradient(135deg, var(--sl-accent) 0%, transparent 50%)'}}/>
       D. Full-bleed gradient background (replaces the flat --sl-bg entirely):
          style={{background:'linear-gradient(160deg, var(--sl-bg) 0%, color-mix(in srgb, var(--sl-accent) 15%, var(--sl-bg)) 100%)'}}
       All content sits above this layer at z-10 or higher.

   34. ZONAL COVERAGE RULE: Mentally divide the canvas into 4 quadrants (top-left, top-right, bottom-left, bottom-right).
       At least 3 of 4 quadrants must contain a visible element (text, visual, shape, decorative element).
       A floating blob in a corner counts. A full-bleed background counts for all 4.
   ```

2. **4 New Layout Archetypes (add to rule 30, total 10):**

   ```
   G. MAGAZINE-WRAP:  full-height visual on right 55% (absolute, object-cover), 
                       text content in left 45% with semi-transparent backdrop if needed
   H. MOSAIC-GRID:    CSS grid of 4–6 cells of varying sizes (grid-cols-3 grid-rows-2 with col-span/row-span),
                       each cell a stat, icon, or short factoid — no empty cells
   I. DIAGONAL-SPLIT: a rotated rectangle (rotate-12 or rotate-[-12deg]) divides the canvas diagonally;
                       content in each zone follows the diagonal axis
   J. IMMERSIVE-HERO: full-bleed SVG or gradient background fills entire slide, all text overlaid on top
                       with contrast ensured via semi-transparent text backdrop or high-weight font
   ```

3. **Replace skeleton examples:**
   The current skeleton in `BASE_PROMPT` has 1 minimal example. Replace with 6 complete slide examples — one per new archetype (HERO-FULL-BLEED, TWO-COLUMN, STAT-SPOTLIGHT, MAGAZINE-WRAP, MOSAIC-GRID, DIAGONAL-SPLIT) — each including:
   - The background fill layer (Task 2.1)
   - Correct type scale (≥ text-xl body, ≥ text-6xl heading)
   - Full `h-screen w-screen` root
   - A `useEffect` for Anime.js entrance animation
   These are training examples for the AI — verbosity here pays dividends in output quality.

**Verification:**
- Generate a 10-slide deck → open DevTools → zero slides should have a flat background with no fill layer.
- Visual check: no slide should look "mostly empty" — every slide edge-to-edge has visual weight.
- Count archetype usage across 10 slides → at least 5 different archetypes used.

---

## Task 3 — Anti-Repetition: Entropy Injection & Slide Manifest

**Problem:** The AI self-plagiarises within a single deck because it has no external memory between "slide generation thoughts" — it reverts to the last comfortable layout it produced. Two mechanisms fix this: a **slide manifest** (pre-planned variety) and **per-slide entropy tokens** (small random design decisions that differentiate otherwise-similar slides).

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** add slide manifest generation step to `BASE_PROMPT`
- `src/lib/ai.ts` — **[MODIFIED]** add `buildSlideManifest()` helper for entropy token generation

**Implementation Steps:**

1. **Slide Manifest in the Prompt:**
   Add a new GENERATION PROTOCOL section to `BASE_PROMPT`:

   ```
   GENERATION PROTOCOL — MANDATORY PRE-PLANNING:
   Before writing any slide code, output a SLIDE MANIFEST as a JSX comment block:
   {/* MANIFEST
   Slide 1: HERO-FULL-BLEED | bg: diagonal-gradient | accent: top-left block | anim: spring-stagger
   Slide 2: TWO-COLUMN | bg: grid-pattern | visual: bar-chart-right | anim: timeline
   Slide 3: STAT-SPOTLIGHT | bg: large-circle | stats: 3-up | anim: counter
   ...
   */}
   Vary archetype, background fill type, and animation style across ALL slides.
   NEVER assign the same archetype to two consecutive slides.
   NEVER assign the same background fill type to more than 2 consecutive slides.
   ```

2. **Entropy Token Injection (`buildSlideManifest()` in `ai.ts`):**
   Before calling the AI, generate a small entropy string from the presentation topic and slide index:
   ```typescript
   function buildEntropyHint(topic: string, slideCount: number): string {
     const archetypes = ['HERO-FULL-BLEED','TWO-COLUMN','STAT-SPOTLIGHT','CHART-WITH-ANNOTATION',
                         'TIMELINE-HORIZONTAL','QUOTE-WITH-ACCENT','MAGAZINE-WRAP','MOSAIC-GRID',
                         'DIAGONAL-SPLIT','IMMERSIVE-HERO'];
     const fills = ['svg-grid','large-circle','diagonal-gradient','full-bleed-gradient','none'];
     const anims = ['spring-stagger','timeline-sequence','counter','stroke-draw','fade-cascade'];
     
     // Deterministic shuffle based on topic hash so the same topic gets the same variety
     const hash = topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
     const shuffled = archetypes.map((a, i) => ({ a, sort: (hash * (i + 1)) % archetypes.length }))
                                .sort((x, y) => x.sort - y.sort).map(x => x.a);
     
     const assignments = Array.from({ length: slideCount }, (_, i) => ({
       slide: i + 1,
       archetype: shuffled[i % shuffled.length],
       fill: fills[(hash + i * 3) % fills.length],
       anim: anims[(hash + i * 7) % anims.length],
     }));
     
     return `\n\nENTROPY HINT (follow this variety plan):\n` +
       assignments.map(s => `Slide ${s.slide}: ${s.archetype} | fill:${s.fill} | anim:${s.anim}`).join('\n');
   }
   ```
   Append the entropy hint to the user message string before it reaches the AI. This is not shown in the chat.

**Verification:**
- Generate the same prompt 3 times → slides 1–5 should use different archetype sequences each time? Actually: because of hash-based determinism, the same prompt gives the same manifest — but **different prompts never produce the same manifest order**.
- Manual check: no two consecutive slides in any 10-slide deck share the same archetype.

---

## Task 4 — design.md: User-Authored Design Brief

**Problem:** Even with 6 personas, users with strong brand identities (company colors, specific fonts, logo placement rules) can't express them. The fix is a first-class "Design Brief" concept: users write or upload a `design.md` file that gets injected verbatim into the system prompt, after the persona fragment but before the skeleton examples.

**Files:**
- `src/components/DesignBriefEditor.tsx` — **[NEW]** modal with textarea + file upload
- `src/store/slidiStore.ts` — **[MODIFIED]** add `designBrief: string | null` to presentation settings
- `src/lib/prompt.ts` — **[MODIFIED]** inject `designBrief` into `buildBasePrompt()` when present
- `src/app/api/parse-design-brief/route.ts` — **[NEW]** optional: strips frontmatter, validates size

**Implementation Steps:**

1. **Store & State:**
   Add `designBrief: string | null` to `SlidiPresentation` settings in `slidiStore.ts`.
   Expose `setDesignBrief(text: string | null)` action.
   Persist via the existing `localStorage` mechanism.

2. **`DesignBriefEditor.tsx` — the UI:**
   A modal (or collapsible panel in settings) with:
   - A `<textarea>` — monospace font, ~20 rows — with placeholder showing a mini template:
     ```
     # My Brand Design Brief

     ## Typography
     - Headlines: Inter, font-weight 900, ALL CAPS
     - Body: Inter, text-xl, line-height relaxed

     ## Colours
     - Primary background: #0a0a0a
     - Accent: #FF3B00 (electric orange)
     - Text: #F5F5F5

     ## Layout Rules
     - Company logo (top-right corner, w-24 h-8) on every slide
     - No slide may have an empty right half
     - Every slide must include at least one data visualisation

     ## Forbidden Patterns
     - No rounded blobs / organic shapes — we are a B2B company
     - No gradients — flat colour only
     ```
   - A "Upload .md file" button — reads the file with `FileReader`, pastes content into the textarea.
   - A "Download as design.md" button — saves current textarea content as a file.
   - Character limit indicator: max 2000 characters (to stay within token budget).
   - "Clear brief" button.
   - Save/Cancel buttons.

3. **Injection into `buildBasePrompt()`:**
   ```typescript
   if (designBrief && designBrief.trim().length > 0) {
     const truncated = designBrief.trim().slice(0, 2000);
     prompt += `\n\nUSER DESIGN BRIEF (highest priority — override defaults where they conflict):\n${truncated}\n`;
   }
   ```
   The "highest priority" label matters: the AI respects explicit user instructions over its own defaults.

4. **UI entry point:**
   Add a "Design Brief" button (icon: `FileText` from lucide-react) to the generation settings panel or toolbar.
   Show a badge/indicator when a brief is active (e.g., a colored dot on the button).

5. **API route (optional, for future server-side brief storage):**
   `src/app/api/parse-design-brief/route.ts` — `POST` with `{ content: string }`.
   Strips YAML frontmatter, validates max 2000 chars, returns `{ cleaned: string }`.
   Not required for MVP — client-side only is sufficient for Phase 13.

**Verification:**
- Write a brief saying "Every slide MUST have a large red circle in the top-right corner. Background is always navy blue (#0D1B2A)."
- Generate a 5-slide deck → every slide has a red circle top-right and navy background.
- Upload a `.md` file → content appears in the textarea correctly.
- Clear the brief → next generation ignores it.
- Brief > 2000 chars → UI shows character limit warning and truncates before injection.

---

## Task 5 — Design Brief Gallery: Built-In Templates

**Problem:** Most users don't know what to write in a design brief. Pre-built templates lower the barrier to entry and demonstrate what's possible.

**Files:**
- `src/lib/designBriefTemplates.ts` — **[NEW]** 6 starter templates
- `src/components/DesignBriefEditor.tsx` — **[MODIFIED]** add "Load Template" dropdown

**Implementation Steps:**

1. **Define 6 Templates in `designBriefTemplates.ts`:**

   | ID | Name | Target Use Case |
   |---|---|---|
   | `startup-pitch` | Startup Pitch Deck | VC/investor decks — bold, confident, data-heavy |
   | `corporate-report` | Corporate Report | Annual reports — conservative, grid-aligned, trust-building |
   | `creative-agency` | Creative Agency | Portfolio/case study decks — experimental, visual-led |
   | `academic-lecture` | Academic / Research | Conference presentations — information-dense, no-frills |
   | `product-launch` | Product Launch | Marketing events — cinematic, high-energy, brand-forward |
   | `minimalist` | Minimalist | Executive summaries — maximum whitespace as design element |

2. **"Load Template" UX:**
   A `<select>` dropdown in `DesignBriefEditor` labelled "Start from template…".
   On selection, paste the template into the textarea (with a confirmation if existing content would be overwritten).

**Verification:**
- Load the `startup-pitch` template → generate a deck → output feels significantly different in visual energy from `academic-lecture` template.

---

## Architecture Summary

```
User selects persona (optional)
         ↓
User writes/uploads design.md brief (optional)
         ↓
buildBasePrompt(persona, designBrief)
         ↓  injects:
         │  1. Core layout rules (Phase 8 contract, updated)
         │  2. Mandatory background fill rules (Task 2)
         │  3. 10 layout archetypes (6 original + 4 new) (Task 2)
         │  4. Persona prompt fragment (Task 1)
         │  5. Design brief (Task 4)
         │  6. 6 full skeleton examples (Task 2)
         ↓
buildEntropyHint(topic, slideCount) appended to user message (Task 3)
         ↓
AI generates MANIFEST comment → then slide code (Task 3)
         ↓
layoutValidator.ts checks output (Phase 8 Task 3)
         ↓
SrcdocPreview renders final slides
```

---

## Recommended Implementation Order

1. **Task 2** (dead space) — highest ROI, touches only `prompt.ts`, immediately visible improvement  
2. **Task 1** (personas) — high ROI, `designPersonas.ts` + prompt injection + small UI picker  
3. **Task 4** (design.md) — standalone UI + store + prompt injection, no dependencies  
4. **Task 3** (entropy) — polish pass, purely in `ai.ts` + `prompt.ts`  
5. **Task 5** (gallery) — purely additive, depends on Task 4 UI existing  

Tasks 2 and 4 can be implemented in parallel by different sub-agents.

---

## Key Success Criteria

- **Dead space:** No slide should have a flat background with no fill layer. ≥3 of 4 canvas quadrants populated.
- **Variety:** In any 10-slide deck, ≥6 different layout archetypes used; no archetype on 2 consecutive slides.
- **Persona fidelity:** Neo-brutalist persona produces borders + offset shadows on ≥80% of slides. Editorial produces serif headlines + right-side visuals on ≥80% of slides. Adesso persona uses Chivo font + `#006ab3` + "The Vertical" element on 100% of slides.
- **Design brief:** A brief with explicit color/font rules is respected on ≥90% of slides.
- **No regressions:** `npm test -- --run` passes. Existing presentations without persona/brief render correctly.
