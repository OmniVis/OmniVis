# Prompt Refactor + Slide Quality Rules — Design Spec
**Date:** 2026-05-20  
**Status:** Approved

---

## Goal

Two related improvements shipped in one pass:

1. **Code organization** — split the monolithic `src/lib/prompt.ts` (34 KB) into focused, navigable files under `src/lib/prompts/`.
2. **Slide quality** — add hard rules to the prompt that fix the recurring problems: text too small, too much content per slide, equal-weight card grids, decorative clutter, and overloaded final slides.

---

## File Structure

```
src/lib/prompts/
├── index.ts              # Re-exports all public symbols — the only file other modules import
├── builders.ts           # buildPrompt(), buildRepairPrompt(), buildPlanningPrompt()
│                         # buildUserContextBlock(), buildPresentationModeBlock()
│                         # buildPersonaBlock(), buildDesignBriefBlock()
│                         # buildAttachedFilesBlock(), buildEntropyHint()
├── planning.ts           # buildPlanModeSystemPrompt(), buildQuestionGenerationPrompt()
│                         # buildOutlineFromAnswersPrompt(), detectOutlineApproval()
└── base/
    ├── index.ts          # Assembles BASE_PROMPT by concatenating the four sections
    ├── rendering.ts      # Component contract, CSS var rules, completion contract,
    │                     # skeleton, hard text-size floor (≥18px), no-emoji rule
    ├── layout.ts         # 10 archetypes, spacing system, content-density rules
    │                     # (one-idea-per-slide, max 5 blocks, word-count limits,
    │                     # no 4-col card grids, visual hierarchy contract)
    ├── animations.ts     # TIER 1 CSS classes + TIER 2 Anime.js patterns (unchanged)
    └── visuals.ts        # Icons (Material Symbols + Iconify), SVG charts,
                          # background fill contract (decoration = structure only)
```

### Backward compatibility shim

`src/lib/prompt.ts` is replaced with a one-liner re-export so nothing in `ai.ts` or `ChatPane.tsx` changes:

```ts
// src/lib/prompt.ts
export * from './prompts/index';
```

---

## Content Changes

### `base/rendering.ts` — additions

Hard rules appended to the existing component contract:

```
TEXT SIZE FLOOR — MANDATORY:
  Title:           56–76px   (never below 56px)
  Section heading: 36–48px   (never below 36px)
  Body text:       24–32px   (never below 24px)
  Labels/captions: 18–22px   (never below 18px)
  Absolute minimum: 18px for ANY visible text on a slide.
  If content would require text below 18px to fit, create an additional slide instead.

NO EMOJI RULE:
  Never use Unicode emoji characters as icons or decorative elements in professional slides.
  Use Material Symbols (span.material-symbols-rounded) or Iconify SVG (img from api.iconify.design) only.
```

### `base/layout.ts` — new content-density contract

Replaces the existing "minimum 8 slides, varied archetypes" block with a more specific contract:

```
ONE IDEA PER SLIDE:
  Each slide communicates exactly one dominant idea. Supporting points clarify that idea — they do not
  introduce new topics.

WORD COUNT LIMIT: 45–70 words per slide maximum.

CONTENT BLOCK LIMIT: Max 5 content blocks per slide. If you have 6+ points, group them into 3
  categories or split across 2 slides.

VISUAL HIERARCHY CONTRACT — every slide must have exactly this structure:
  1. One dominant focal point  (large headline, oversized number, hero visual, bold quote)
  2. One secondary content area (supporting text, chart, 2–3 short bullets)
  3. Optional: supporting detail (small label, footnote, decorative element)
  Nothing at level 2 or 3 should compete visually with level 1.

CARD GRID RULES:
  - Card grids on at most 30% of slides in a deck.
  - Never use a 4-column text card grid. Max 3 columns for cards with text.
  - If using a grid, ensure cards have a clear primary item (icon or number) not just equal text blocks.

SPLIT TRIGGERS — automatically create an additional slide when:
  - A slide would exceed 90 words
  - A list has more than 5 items (group or paginate instead)
  - The final slide combines case studies, takeaways, AND a CTA

FINAL SLIDE RULE:
  The closing sequence must be separate slides:
  - (Optional) Selected references / case studies
  - (Optional) Key takeaways  
  - CTA / next steps / contact — this is the true final slide, simple and uncluttered

SLIDE ARCHETYPE VARIETY:
  Use each archetype type at most twice per deck:
  - Title slide
  - Agenda / overview
  - Big statement / bold quote
  - Problem framing
  - Solution / approach
  - Process flow / timeline
  - Comparison / contrast
  - Data / chart spotlight
  - Case study
  - CTA / closing
  Card grids count toward the same archetype slot — do not use them as filler.

SPACING SYSTEM: Use an 8px or 12px base grid. Prefer consistent, intentional whitespace over
  filling empty space with decoration.
```

### `base/visuals.ts` — background decoration rule tightened

Current rule (remove):
> MANDATORY on every slide: One background layer beyond flat color — SVG geometric grid, large off-corner accent circle, diagonal color band, or full-bleed gradient.

Replacement:
```
BACKGROUND DECORATION — use when it reinforces structure:
  Background decoration is optional. Use it only when it guides the viewer's eye toward the focal point
  or reinforces the slide's visual structure.
  Prefer: intentional whitespace, strong typographic scale, and color contrast over decorative fills.
  When you do add a background element: keep it subtle (opacity 0.04–0.08), ensure it does not compete
  with text legibility, and vary the style across slides.
```

### What is unchanged

- Animation system — TIER 1 CSS classes and TIER 2 Anime.js patterns
- Theme CSS variable rules (`--sl-bg`, `--sl-text`, `--sl-accent`, `--sl-sub`)
- Component skeleton and `postMessage` slide-change pattern
- All builder function signatures — no breaking changes to `ai.ts` or `ChatPane.tsx`
- Provider integrations (OpenAI, Anthropic, Gemini, adesso)

---

## Migration Strategy

1. Create `src/lib/prompts/` directory.
2. Extract `BASE_PROMPT` content into the four `base/*.ts` files, inserting the new quality rules at the appropriate locations.
3. Move all `build*()` functions to `builders.ts`; move planning functions to `planning.ts`.
4. Write `base/index.ts` that assembles `BASE_PROMPT` by concatenating the four sections.
5. Write `prompts/index.ts` that re-exports everything.
6. Replace `src/lib/prompt.ts` content with the one-liner shim.
7. Run `npm test -- --run` to verify no regressions.

---

## Success Criteria

- `src/lib/prompt.ts` is a one-liner shim; all logic lives in `src/lib/prompts/`.
- Each file in `base/` is under ~200 lines and covers exactly one concern.
- Generated slides have no text below 18px.
- Generated slides communicate one idea each with a clear dominant focal point.
- Card grids appear on ≤30% of slides in any generated deck.
- All existing tests pass.
