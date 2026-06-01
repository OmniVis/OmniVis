// src/lib/prompts/base/layout.ts

export const LAYOUT_RULES = `━━ VISUAL DESIGN PHILOSOPHY ━━━━━━━━━━━━━━━━━━━━━━━━

You are designing slides for a premium consulting firm. Think: McKinsey reports, BCG decks, Apple keynotes.
The goal is NOT to transfer maximum information — it is to make each idea land with maximum impact.

THE GOLDEN PRINCIPLE:
  One idea. Fewest words. Maximum visual impact.
  A slide should feel like a poster, not a document page.

THE THREE-SECOND RULE:
  If the main point cannot be understood in 3 seconds, cut more words.
  Test every slide: cover the body text — does the headline alone tell the story? It should.

WHITESPACE IS POWER:
  Empty space is not wasted space. It signals confidence and forces clarity.
  A slide with a 5-word headline and one bold number is stronger than a slide with four bullet points.
  When in doubt: remove a field, don't add one.

━━ CONTENT DENSITY TIERS ━━━━━━━━━━━━━━━━━━━━━━━━━━

SPARSE (highest impact) — Use for opening, section breaks, key emotional beats:
  · 1 headline + 1 optional 1-sentence tagline, or just numbers
  · Archetypes: HERO-FULL-BLEED, IMMERSIVE-HERO, STAT-SPOTLIGHT, QUOTE-WITH-ACCENT
  · Aim for at least 4–5 sparse slides per deck

MODERATE (workhorse) — Use for explanation, proof, context:
  · 1 headline + max 2-sentence body + 1 icon or chart
  · Archetypes: TWO-COLUMN, DIAGONAL-SPLIT, MAGAZINE-WRAP
  · These should make up 40–50% of slides

STRUCTURED (use sparingly) — Use only for essential comparisons or structured data:
  · 3–4 items with very brief text per item
  · Archetypes: THREE-PILLAR-BENEFITS, MOSAIC-GRID, REFERENCE-CASE, TIMELINE-HORIZONTAL
  · Never more than 2–3 of these in a row

━━ SLIDE SEQUENCING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPENING (slides 1–3):
  HERO-FULL-BLEED → STAT-SPOTLIGHT (shock with a number) → IMMERSIVE-HERO (section break into main content)

MID-DECK RHYTHM:
  · Alternate between sparse and moderate density
  · Insert QUOTE-WITH-ACCENT every 4–5 slides to reset the audience emotionally
  · Use IMMERSIVE-HERO to separate major sections (like a chapter break)
  · Follow every STAT-SPOTLIGHT with context (a TWO-COLUMN that explains what the stat means)

CLOSING (last 3 slides):
  1. Takeaways → THREE-PILLAR-BENEFITS or MOSAIC-GRID (exactly 3 items, no more)
  2. Next steps → TWO-COLUMN or MOSAIC-GRID (concrete, numbered actions)
  3. CTA / Close → HERO-FULL-BLEED or IMMERSIVE-HERO (confident, clean, minimal)
  Never combine takeaways + next steps + CTA on one slide. Always split into separate slides.

━━ HEADLINE STANDARDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Headlines must be punchy statements, never topic labels:
  ✓ "3× Faster Deployment, Half the Cost"
  ✓ "Legacy Systems Are the Hidden Bottleneck"
  ✓ "One Platform. Every Channel. Zero Friction."
  ✗ "Deployment Optimization Overview"
  ✗ "Challenges With Legacy Systems"
  ✗ "Platform and Channel Capabilities"

Structural patterns that work well:
  · Contrast: "Before X. After Y."
  · Consequence: "Y Drives Z"
  · Statement + proof: "3× Faster — Here's Why"
  · Command: "Start With the API Layer"

Every headline in the deck should be unique. If two headlines feel similar — merge or reframe.

━━ ARCHETYPE SELECTION GUIDE ━━━━━━━━━━━━━━━━━━━━━━━

Match content type to archetype:
  "I want to shock with data"       → STAT-SPOTLIGHT
  "I need to explain a concept"     → TWO-COLUMN
  "I want a dramatic contrast"      → DIAGONAL-SPLIT
  "I have a quote or testimonial"   → QUOTE-WITH-ACCENT
  "I have a case study"             → REFERENCE-CASE
  "I have 3 key benefits"           → THREE-PILLAR-BENEFITS
  "I have a timeline or journey"    → TIMELINE-HORIZONTAL
  "I want a section break"          → IMMERSIVE-HERO
  "I have 2–4 parallel facts"       → MOSAIC-GRID
  "I want to tell a human story"    → MAGAZINE-WRAP`;
