# Phase 3: Animation Palette & Prompt Quality — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a named CSS animation palette + `window.__css` escape hatch to the srcdoc renderer, and rewrite the AI prompt to produce ≥8 richly-animated slides with data visualizations and interactive elements.

**Architecture:** Two-file change. `SrcdocPreview.tsx` gains CSS keyframes + helper injected into every srcdoc iframe. `prompt.ts` is rewritten with explicit slide count rules, animation class references, three interactive patterns (SVG chart, counter, tabs), and a 5-slide example. Existing test structure is preserved; new tests are added.

**Tech Stack:** Next.js 15, React 18, Tailwind CDN (inside srcdoc iframe), Vitest 4

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/SrcdocPreview.tsx` | Modify | Export `buildSrcdoc`; add animation CSS + `window.__css` to the srcdoc |
| `src/lib/prompt.ts` | Modify | Rewrite `BASE_PROMPT` with slide count rules, animation guidance, 3 patterns, 5-slide example |
| `src/__tests__/srcdoc.test.ts` | Create | Unit-test `buildSrcdoc` output for animation classes + helper |
| `src/__tests__/prompt.test.ts` | Modify | Add content-check tests for new prompt requirements |

---

### Task 1: Export `buildSrcdoc` and write failing srcdoc tests

**Files:**
- Modify: `src/components/SrcdocPreview.tsx` (export the function)
- Create: `src/__tests__/srcdoc.test.ts`

- [ ] **Step 1: Export `buildSrcdoc` from SrcdocPreview.tsx**

  Open `src/components/SrcdocPreview.tsx`. Find line 39:
  ```typescript
  function buildSrcdoc(code: string, theme: ThemeId): string {
  ```
  Change it to:
  ```typescript
  export function buildSrcdoc(code: string, theme: ThemeId): string {
  ```
  No other changes to the file yet.

- [ ] **Step 2: Create the srcdoc test file**

  Create `src/__tests__/srcdoc.test.ts` with this content:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { buildSrcdoc } from "@/components/SrcdocPreview";

  describe("buildSrcdoc animation palette", () => {
    it("includes sl-slide-up class and keyframe", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-slide-up");
    });

    it("includes sl-fade-in class and keyframe", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-fade-in");
    });

    it("includes sl-scale-in class and keyframe", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-scale-in");
    });

    it("includes sl-slide-left class and keyframe", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-slide-left");
    });

    it("includes sl-float class and keyframe", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-float");
    });

    it("includes sl-bar-grow class with transform-origin:bottom", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("sl-bar-grow");
      expect(html).toContain("transform-origin: bottom");
    });

    it("includes stagger delay classes sl-delay-1 through sl-delay-5", () => {
      const html = buildSrcdoc("", "minimal");
      for (let i = 1; i <= 5; i++) {
        expect(html).toContain(`sl-delay-${i}`);
      }
    });

    it("includes window.__css helper", () => {
      const html = buildSrcdoc("", "minimal");
      expect(html).toContain("window.__css");
    });

    it("applies correct theme vars for dark theme", () => {
      const html = buildSrcdoc("", "dark");
      expect(html).toContain("--sl-bg:#0f172a");
    });

    it("applies correct theme vars for cyberpunk theme", () => {
      const html = buildSrcdoc("", "cyberpunk");
      expect(html).toContain("--sl-bg:#0a0a14");
    });
  });
  ```

- [ ] **Step 3: Run tests to confirm they fail**

  ```bash
  npm test -- --run
  ```
  Expected: 10 new tests FAIL (animation classes not yet in srcdoc), existing 56 tests still pass. Total: 56 pass, 10 fail.

---

### Task 2: Add animation palette to `buildSrcdoc`

**Files:**
- Modify: `src/components/SrcdocPreview.tsx`

- [ ] **Step 1: Replace the `<style>` block in `buildSrcdoc`**

  In `src/components/SrcdocPreview.tsx`, find the existing `<style>` block inside `buildSrcdoc` (starts around line 63). Replace the entire `<style>...</style>` section with:

  ```html
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root { ${vars} }
    body { margin: 0; background: var(--sl-bg); }
    #root { min-height: 100vh; }

    /* Force outermost rendered element to honour the theme even if the AI
       generated hardcoded Tailwind bg-* / text-* classes on the root div. */
    #root > * {
      background: var(--sl-bg) !important;
      color: var(--sl-text) !important;
    }

    /* ── Slidi animation palette ───────────────────────────────────────── */
    @keyframes sl-fade-in    { from { opacity:0 }                              to { opacity:1 } }
    @keyframes sl-slide-up   { from { opacity:0; transform:translateY(32px) }  to { opacity:1; transform:translateY(0) } }
    @keyframes sl-slide-left { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
    @keyframes sl-scale-in   { from { opacity:0; transform:scale(.92) }        to { opacity:1; transform:scale(1) } }
    @keyframes sl-float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
    @keyframes sl-pulse-ring { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(1.6); opacity:0 } }
    @keyframes sl-bar-grow   { from { transform:scaleY(0) } to { transform:scaleY(1) } }

    .sl-fade-in    { animation: sl-fade-in    .5s ease both }
    .sl-slide-up   { animation: sl-slide-up   .5s ease both }
    .sl-slide-left { animation: sl-slide-left .5s ease both }
    .sl-scale-in   { animation: sl-scale-in   .4s ease both }
    .sl-float      { animation: sl-float      4s ease-in-out infinite }
    .sl-pulse-ring { animation: sl-pulse-ring 1.5s ease-out infinite }
    /* transform-origin must be on the class, not inside @keyframes */
    .sl-bar-grow   { animation: sl-bar-grow   .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom }

    /* Stagger delay helpers — chain with any entrance class */
    .sl-delay-1 { animation-delay: .1s }
    .sl-delay-2 { animation-delay: .2s }
    .sl-delay-3 { animation-delay: .3s }
    .sl-delay-4 { animation-delay: .4s }
    .sl-delay-5 { animation-delay: .5s }

    /* Nav buttons: hidden until the user hovers over the slide */
    #__slidi_prev, #__slidi_next { opacity: 0; }
    body:hover #__slidi_prev, body:hover #__slidi_next { opacity: 1; }

    #err {
      display: none;
      padding: 1rem;
      color: #ef4444;
      font: 12px/1.6 monospace;
      white-space: pre-wrap;
      background: #0f172a;
    }
  </style>
  ```

- [ ] **Step 2: Add `window.__css` helper script after the React globals script**

  In `buildSrcdoc`, find the closing `</script>` of the globals block (the one that sets `var useState = React.useState` etc., ends around line 62). Immediately after that closing `</script>`, add:

  ```html
  <script>
    /* Custom keyframe injection — AI can call window.__css('...') in useEffect */
    window.__css = function(css) {
      var s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    };
  </script>
  ```

- [ ] **Step 3: Run tests to confirm all pass**

  ```bash
  npm test -- --run
  ```
  Expected: **66 tests pass** (56 original + 10 new srcdoc tests). Zero failures.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/SrcdocPreview.tsx src/__tests__/srcdoc.test.ts
  git commit -m "feat: add sl-* animation palette + window.__css helper to srcdoc"
  ```

---

### Task 3: Write failing prompt content tests

**Files:**
- Modify: `src/__tests__/prompt.test.ts`

- [ ] **Step 1: Add new describe block to prompt.test.ts**

  Open `src/__tests__/prompt.test.ts`. After the closing `});` of the existing `describe("buildPrompt", ...)` block, append:

  ```typescript
  import { BASE_PROMPT } from "@/lib/prompt";

  describe("BASE_PROMPT quality rules", () => {
    it("requires minimum 8 slides", () => {
      expect(BASE_PROMPT).toContain("MINIMUM of 8 slides");
    });

    it("references sl-slide-up animation class", () => {
      expect(BASE_PROMPT).toContain("sl-slide-up");
    });

    it("references sl-delay stagger helpers", () => {
      expect(BASE_PROMPT).toContain("sl-delay-1");
    });

    it("references window.__css for custom keyframes", () => {
      expect(BASE_PROMPT).toContain("window.__css");
    });

    it("includes animated Counter helper pattern", () => {
      expect(BASE_PROMPT).toContain("requestAnimationFrame");
    });

    it("includes SVG bar chart pattern with sl-bar-grow", () => {
      expect(BASE_PROMPT).toContain("sl-bar-grow");
    });

    it("includes tab/toggle interactive pattern", () => {
      expect(BASE_PROMPT).toContain("TabSlide");
    });

    it("forbids hardcoded bg classes on outermost div", () => {
      expect(BASE_PROMPT).toContain("NEVER use Tailwind bg-* or text-* colour classes");
    });

    it("example component uses key={current} to re-trigger animations", () => {
      expect(BASE_PROMPT).toContain("key={current}");
    });

    it("example component uses sl-scale-in on slide container", () => {
      expect(BASE_PROMPT).toContain("sl-scale-in");
    });
  });
  ```

  Note: `BASE_PROMPT` is already imported at the top of the file — remove the duplicate import if it appears twice.

- [ ] **Step 2: Run tests to confirm new ones fail**

  ```bash
  npm test -- --run
  ```
  Expected: 10 new prompt tests FAIL, 66 existing tests pass. Total: 66 pass, 10 fail.

---

### Task 4: Rewrite `BASE_PROMPT`

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **Step 1: Replace `BASE_PROMPT` in `src/lib/prompt.ts`**

  Replace the entire `BASE_PROMPT` constant (from `export const BASE_PROMPT = \`` to the closing backtick) with the following. Keep `buildPrompt` and `SYSTEM_PROMPT` unchanged beneath it.

  ```typescript
  export const BASE_PROMPT = `You are an expert React developer specializing in interactive presentations.

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
  11. Theme CSS variables are injected by the host — use them for the root container and accents:
      - \`var(--sl-bg)\`     — slide background colour
      - \`var(--sl-text)\`   — primary text colour
      - \`var(--sl-accent)\` — accent / highlight colour
      - \`var(--sl-sub)\`    — secondary / muted text colour
      Apply via inline style on the outermost div: \`style={{ background:"var(--sl-bg)", color:"var(--sl-text)" }}\`
      Use \`var(--sl-accent)\` for dividers, highlights, and borders throughout.
      CRITICAL: NEVER use Tailwind bg-* or text-* colour classes (e.g. bg-white, bg-slate-900, text-white) on the outermost div.
      Those hardcoded classes break theme switching. ONLY use \`style={{ background:"var(--sl-bg)", color:"var(--sl-text)" }}\` on the root.

  SLIDE COUNT & CONTENT:
  12. Generate a MINIMUM of 8 slides. For most topics, 10-12 slides is ideal. Only go below 8 if the topic genuinely has fewer distinct points.
  13. Every slide must contain ALL THREE of:
      (a) Bold headline — concise, punchy.
      (b) Substantive body — full sentences or real data, not 3-word bullets.
      (c) Visual element — chart, stat callout, icon grid, diagram, or decorative shape.
  14. Vary slide layouts across the deck:
      full-bleed title | two-column | stat spotlight | chart slide | timeline | Q&A / CTA

  ANIMATIONS:
  15. The host injects these CSS animation classes — use them on every slide:
      sl-fade-in | sl-slide-up | sl-slide-left | sl-scale-in | sl-float | sl-bar-grow
      Stagger helpers: sl-delay-1 through sl-delay-5 (0.1s–0.5s delays)
  16. Stagger slide content on entrance:
      headline  → className="sl-slide-up sl-delay-1"
      subhead   → className="sl-slide-up sl-delay-2"
      body text → className="sl-slide-up sl-delay-3"
  17. Re-trigger animations on slide change by keying the slide container on the current index:
      \`<div key={current} className="sl-scale-in">\`
  18. Use sl-float on decorative background shapes for ambient motion.
  19. For custom keyframes not in the palette, call window.__css('@keyframes name { ... }') inside useEffect.

  INTERACTIVE ELEMENTS & VISUALIZATIONS:
  20. Use inline SVG for data charts. Animated bar chart pattern:
  \`\`\`jsx
  const bars = [{ label:"Q1", v:72 },{ label:"Q2", v:88 },{ label:"Q3", v:61 },{ label:"Q4", v:95 }];
  <svg viewBox="0 0 440 200" className="w-full max-w-lg">
    {bars.map((b,i) => (
      <g key={b.label} transform={\`translate(\${i*110+10},0)\`}>
        <rect x="10" y={200-b.v*1.8} width="70" height={b.v*1.8}
              fill="var(--sl-accent)" className="sl-bar-grow" style={{animationDelay:\`\${i*.12}s\`}} />
        <text x="45" y="197" textAnchor="middle" fontSize="13" fill="var(--sl-sub)">{b.label}</text>
        <text x="45" y={194-b.v*1.8} textAnchor="middle" fontSize="12" fill="var(--sl-text)">{b.v}%</text>
      </g>
    ))}
  </svg>
  \`\`\`
  21. Animated counter for stat slides:
  \`\`\`jsx
  function Counter({ target, suffix = "" }) {
    const [n, setN] = useState(0);
    useEffect(() => {
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1200, 1);
        setN(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [target]);
    return <span>{n.toLocaleString()}{suffix}</span>;
  }
  \`\`\`
  22. In-slide tabs for multi-faceted content (tab clicks do NOT navigate slides):
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

  Example structure (use as a PATTERN — generate at least 8 slides for real content, vary layouts freely):

  \`\`\`jsx
  import { useState, useEffect } from "react";

  function Counter({ target, suffix = "" }) {
    const [n, setN] = useState(0);
    useEffect(() => {
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1200, 1);
        setN(Math.floor(p * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [target]);
    return <span>{n.toLocaleString()}{suffix}</span>;
  }

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

  const totalSlides = 5;

  export default function Presentation() {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
      const go = dir => setCurrent(c => Math.min(Math.max(c + dir, 0), totalSlides - 1));
      const onKey = e => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
        if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   go(-1);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
      <div className="h-screen w-screen overflow-hidden relative"
           style={{ background: "var(--sl-bg)", color: "var(--sl-text)" }}>
        {/* Ambient floating decoration */}
        <div className="sl-float absolute top-16 right-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
             style={{ background: "var(--sl-accent)" }} />

        {/* Slide 0 — Title */}
        {current === 0 && (
          <div key={current} className="h-full flex flex-col justify-center px-20 sl-scale-in">
            <p className="sl-slide-up sl-delay-1 text-sm uppercase tracking-widest mb-4"
               style={{ color: "var(--sl-accent)" }}>Category</p>
            <h1 className="sl-slide-up sl-delay-2 text-8xl font-black tracking-tighter leading-none">
              Presentation<br />Title
            </h1>
            <p className="sl-slide-up sl-delay-3 mt-8 text-xl max-w-xl"
               style={{ color: "var(--sl-sub)" }}>
              Subtitle with enough context to orient the viewer.
            </p>
          </div>
        )}

        {/* Slide 1 — Stat spotlight */}
        {current === 1 && (
          <div key={current} className="h-full flex flex-col items-center justify-center sl-scale-in">
            <p className="sl-slide-up sl-delay-1 text-sm uppercase tracking-widest mb-6"
               style={{ color: "var(--sl-sub)" }}>Key Metric</p>
            <h2 className="sl-slide-up sl-delay-2 text-9xl font-black tabular-nums"
                style={{ color: "var(--sl-accent)" }}>
              <Counter target={4200} suffix="+" />
            </h2>
            <p className="sl-slide-up sl-delay-3 mt-4 text-2xl font-medium">Units Shipped</p>
            <p className="sl-slide-up sl-delay-4 mt-2 text-base max-w-sm text-center"
               style={{ color: "var(--sl-sub)" }}>
              Context sentence explaining why this number matters.
            </p>
          </div>
        )}

        {/* Slide 2 — Bar chart */}
        {current === 2 && (
          <div key={current} className="h-full flex flex-col justify-center px-20 sl-scale-in">
            <h2 className="sl-slide-up sl-delay-1 text-5xl font-black mb-2">Quarterly Growth</h2>
            <p className="sl-slide-up sl-delay-2 mb-10 text-lg" style={{ color: "var(--sl-sub)" }}>
              Revenue by quarter, FY2025
            </p>
            <div className="sl-slide-up sl-delay-3">
              {(() => {
                const bars = [{ label:"Q1", v:58 },{ label:"Q2", v:74 },{ label:"Q3", v:67 },{ label:"Q4", v:91 }];
                return (
                  <svg viewBox="0 0 440 200" className="w-full max-w-lg">
                    {bars.map((b,i) => (
                      <g key={b.label} transform={\`translate(\${i*110+10},0)\`}>
                        <rect x="10" y={200-b.v*1.8} width="70" height={b.v*1.8}
                              fill="var(--sl-accent)" className="sl-bar-grow"
                              style={{animationDelay:\`\${i*.12}s\`}} />
                        <text x="45" y="197" textAnchor="middle" fontSize="13" fill="var(--sl-sub)">{b.label}</text>
                        <text x="45" y={194-b.v*1.8} textAnchor="middle" fontSize="12" fill="var(--sl-text)">{b.v}%</text>
                      </g>
                    ))}
                  </svg>
                );
              })()}
            </div>
          </div>
        )}

        {/* Slide 3 — Interactive tabs */}
        {current === 3 && (
          <div key={current} className="h-full flex flex-col justify-center px-20 sl-scale-in">
            <h2 className="sl-slide-up sl-delay-1 text-5xl font-black mb-8">Three Perspectives</h2>
            <div className="sl-slide-up sl-delay-2">
              <TabSlide
                tabs={["Overview","Details","Impact"]}
                content={[
                  <p style={{color:"var(--sl-sub)"}}>High-level summary with enough detail to understand the big picture.</p>,
                  <p style={{color:"var(--sl-sub)"}}>Specific data points, implementation notes, or technical breakdown.</p>,
                  <p style={{color:"var(--sl-sub)"}}>Measurable outcomes, results, and what this means going forward.</p>,
                ]}
              />
            </div>
          </div>
        )}

        {/* Slide 4 — CTA */}
        {current === 4 && (
          <div key={current} className="h-full flex flex-col items-center justify-center sl-scale-in">
            <h2 className="sl-slide-up sl-delay-1 text-7xl font-black tracking-tighter text-center leading-tight">
              What's<br />Next?
            </h2>
            <p className="sl-slide-up sl-delay-2 mt-8 text-xl text-center max-w-lg"
               style={{ color: "var(--sl-sub)" }}>
              Closing thought or call to action. Make it memorable.
            </p>
            <div className="sl-slide-up sl-delay-3 mt-12 w-24 h-1 rounded"
                 style={{ background: "var(--sl-accent)" }} />
          </div>
        )}

        {/* Slide counter */}
        <div className="absolute bottom-4 right-6 font-mono text-xs" style={{ color: "var(--sl-sub)" }}>
          {current + 1} / {totalSlides}
        </div>
      </div>
    );
  }
  \`\`\`

  Now generate the presentation the user requested. Output ONLY the component code.`;
  ```

- [ ] **Step 2: Run tests to confirm all pass**

  ```bash
  npm test -- --run
  ```
  Expected: **76 tests pass** (66 existing + 10 new prompt content tests). Zero failures.
  If any prompt content test still fails, re-read the failure message and adjust the exact string in `BASE_PROMPT` to match what the test expects.

- [ ] **Step 3: Verify build is clean**

  ```bash
  npm run build
  ```
  Expected: clean build, no TypeScript errors. Output shows routes: `○ /`, `ƒ /api/share`, `ƒ /api/share/[id]`, `ƒ /view/[id]`.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/prompt.ts src/__tests__/prompt.test.ts
  git commit -m "feat: rewrite prompt with 8-slide minimum, animation classes, visualizations, and interactive patterns"
  ```

---

### Task 5: Final verification and checkpoint

- [ ] **Step 1: Run full test suite**

  ```bash
  npm test -- --run
  ```
  Expected: **76 tests pass**. Zero failures.

- [ ] **Step 2: Run build**

  ```bash
  npm run build
  ```
  Expected: clean build.

- [ ] **Step 3: Push**

  ```bash
  git push origin main
  ```

- [ ] **Step 4: Write checkpoint**

  Overwrite `.claude/memory/latest_checkpoint.md` AND write a timestamped copy `.claude/memory/DD-MM-YYYY-hh-mm_checkpoint.md`. Include:
  - Date and last commit hash
  - What was built (animation palette + prompt rewrite)
  - 76 tests passing
  - Architecture snapshot (two files changed: SrcdocPreview + prompt)
  - Next steps (Highlight to Edit feature, Docker redeploy)

- [ ] **Step 5: Update problem log**

  Overwrite `.claude/problems/latest_problem.md` noting no open bugs; next feature is Highlight to Edit.

---

## Self-Review

**Spec coverage check:**
- [x] Animation CSS palette (7 keyframes + stagger delays) → Task 2 Step 1
- [x] `window.__css` helper → Task 2 Step 2
- [x] Slide count minimum 8 rule → Task 4 Step 1 (SLIDE COUNT section in prompt)
- [x] Content depth rule (headline + body + visual) → Task 4 Step 1
- [x] Layout variety instruction → Task 4 Step 1
- [x] Animation class usage in prompt → Task 4 Step 1 (ANIMATIONS section)
- [x] Stagger pattern → Task 4 Step 1
- [x] `key={current}` re-trigger → Task 4 Step 1 (rule 17) and example
- [x] SVG bar chart pattern → Task 4 Step 1 (rule 20)
- [x] Counter pattern → Task 4 Step 1 (rule 21)
- [x] TabSlide pattern → Task 4 Step 1 (rule 22)
- [x] 5-slide example → Task 4 Step 1 (example component)
- [x] Tests for all new srcdoc content → Task 1
- [x] Tests for all new prompt content → Task 3
- [x] `transform-origin: bottom` on `.sl-bar-grow` class not inside keyframe → Task 2 Step 1

**Placeholder scan:** No TBDs, no TODOs, no vague steps. All code is complete.

**Type consistency:** `buildSrcdoc(code: string, theme: ThemeId): string` — exported in Task 1, imported in test in Task 1. Consistent across all tasks.
