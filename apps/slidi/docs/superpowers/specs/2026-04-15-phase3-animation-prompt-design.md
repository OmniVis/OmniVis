# Phase 3: Animation Palette & Prompt Quality — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

---

## Problem

AI-generated presentations currently:
- Cap at ~6 slides with sparse content (caused by a 2-slide prompt example)
- Produce no animations or entrance effects (no keyframes available, no prompt guidance)
- Produce no data visualizations (no pattern taught to the AI)
- Produce no interactive elements beyond keyboard navigation

The core reason to build presentations in code rather than PowerPoint is interactivity and animation — this spec closes that gap.

---

## Approach: B — Enhanced srcdoc + prompt engineering

Two files change: `src/components/SrcdocPreview.tsx` and `src/lib/prompt.ts`.

No new components. No new dependencies. No schema changes.

---

## 1. SrcdocPreview.tsx — Animation Palette

### 1a. Pre-defined CSS keyframes (injected into srcdoc `<style>`)

Add to the existing `<style>` block inside `buildSrcdoc`:

```css
/* ── Slidi animation palette ────────────────────────────────────────── */
@keyframes sl-fade-in    { from { opacity:0 }                              to { opacity:1 } }
@keyframes sl-slide-up   { from { opacity:0; transform:translateY(32px) }  to { opacity:1; transform:translateY(0) } }
@keyframes sl-slide-left { from { opacity:0; transform:translateX(-32px) } to { opacity:1; transform:translateX(0) } }
@keyframes sl-scale-in   { from { opacity:0; transform:scale(.92) }        to { opacity:1; transform:scale(1) } }
@keyframes sl-float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes sl-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
@keyframes sl-bar-grow   { from { transform:scaleY(0) } to { transform:scaleY(1) } }

.sl-fade-in    { animation: sl-fade-in    .5s ease both }
.sl-slide-up   { animation: sl-slide-up   .5s ease both }
.sl-slide-left { animation: sl-slide-left .5s ease both }
.sl-scale-in   { animation: sl-scale-in   .4s ease both }
.sl-float      { animation: sl-float      4s ease-in-out infinite }
.sl-pulse-ring { animation: sl-pulse-ring 1.5s ease-out infinite }
/* transform-origin must be on the element, not inside @keyframes */
.sl-bar-grow   { animation: sl-bar-grow   .8s cubic-bezier(.2,.8,.2,1) both; transform-origin: bottom }

/* Stagger delay helpers */
.sl-delay-1 { animation-delay: .1s }
.sl-delay-2 { animation-delay: .2s }
.sl-delay-3 { animation-delay: .3s }
.sl-delay-4 { animation-delay: .4s }
.sl-delay-5 { animation-delay: .5s }
```

### 1b. `window.__css` helper (injected before the React script)

```js
window.__css = function(css) {
  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
};
```

Lets the AI inject custom `@keyframes` from inside `useEffect` for anything the palette doesn't cover.

---

## 2. prompt.ts — Quality & Animation Instructions

### 2a. Slide count & content depth

Replace vague "high-quality" guidance with explicit rules:

```
SLIDE COUNT & CONTENT:
- Generate a MINIMUM of 8 slides. For most topics, 10-12 slides is ideal.
  Only go below 8 if the topic genuinely has fewer distinct points.
- Every slide must contain ALL THREE of:
    (a) Bold headline — concise, punchy.
    (b) Substantive body — full sentences or real data, not 3-word bullets.
    (c) Visual element — chart, stat callout, icon grid, diagram, or decorative shape.
- Vary slide layouts across the deck:
    full-bleed title | two-column | stat spotlight | chart slide | timeline | Q&A / CTA
```

### 2b. Animation instructions

```
ANIMATIONS:
- Apply entrance animations to every slide's content using the pre-defined classes:
    sl-fade-in | sl-slide-up | sl-slide-left | sl-scale-in
- Stagger content within a slide using sl-delay-1 through sl-delay-5:
    headline → sl-slide-up sl-delay-1
    subhead  → sl-slide-up sl-delay-2
    body     → sl-slide-up sl-delay-3
- Re-trigger animations on slide change by keying the animated container:
    <div key={`${current}-content`} className="sl-slide-up">
- Use sl-float on decorative background shapes for ambient motion.
- For custom keyframes not in the palette, call window.__css('@keyframes ...') in useEffect.
```

### 2c. Interactive elements & visualizations

Three concrete patterns provided inline in the prompt as copy-paste references:

**Pattern 1 — SVG bar chart (animated)**
```jsx
// Animated SVG bar chart — values 0-100
const bars = [{ label:"Q1", v:72 },{ label:"Q2", v:88 },{ label:"Q3", v:61 },{ label:"Q4", v:95 }];
<svg viewBox="0 0 400 200" className="w-full">
  {bars.map((b,i) => (
    <g key={b.label} transform={`translate(${i*100+10},0)`}>
      <rect x="10" y={200-b.v*1.8} width="60" height={b.v*1.8}
            fill="var(--sl-accent)" className="sl-bar-grow" style={{animationDelay:`${i*.12}s`}} />
      <text x="40" y="195" textAnchor="middle" fontSize="12" fill="var(--sl-sub)">{b.label}</text>
      <text x="40" y={195-b.v*1.8} textAnchor="middle" fontSize="11" fill="var(--sl-text)">{b.v}%</text>
    </g>
  ))}
</svg>
```

**Pattern 2 — Animated counter**
```jsx
function Counter({ target, suffix="" }) {
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
// Usage: <Counter target={4200000} suffix="+" />
```

**Pattern 3 — In-slide interactive tabs**
```jsx
const [tab, setTab] = useState(0);
const tabs = ["Overview","Details","Impact"];
<div>
  <div className="flex gap-2 mb-4">
    {tabs.map((t,i) => (
      <button key={t} onClick={() => setTab(i)}
        className={`px-4 py-1 rounded-full text-sm transition-colors ${tab===i ? "text-white" : "opacity-50"}`}
        style={{ background: tab===i ? "var(--sl-accent)" : "transparent",
                 border: "1px solid var(--sl-accent)" }}>
        {t}
      </button>
    ))}
  </div>
  <div key={tab} className="sl-fade-in">{content[tab]}</div>
</div>
```

### 2d. Updated example component

The existing 2-slide skeleton is replaced with a 5-slide demo that shows:
- Staggered entrance on every slide
- One SVG chart slide
- One Counter slide
- One tab-interactive slide
- Ambient floating decoration on the title slide

This gives the AI a concrete full-length reference to pattern-match against.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/SrcdocPreview.tsx` | Add animation CSS + `window.__css` helper to `buildSrcdoc` |
| `src/lib/prompt.ts` | Rewrite `BASE_PROMPT`: slide count rules, animation instructions, 3 patterns, 5-slide example |

---

## Files NOT Changed

- `src/app/globals.css` — no changes
- Store, API routes, themes — no changes
- Tests — prompt and themes tests will need updating to reflect new prompt content

---

## Testing

- `npm test -- --run` must remain at 56 passing (prompt.test.ts checks prompt format, not content — should pass unchanged; themes.test.ts is unaffected)
- Manual verification: generate a presentation with the new prompt and confirm ≥8 slides, entrance animations visible, stagger working
- Verify `window.__css` is accessible inside srcdoc by opening browser console in the iframe

---

## Out of Scope

- Highlight to Edit (next session)
- Asset / image upload
- Presenter Mode
- Theme-specific animation color variables (can add later if needed)
