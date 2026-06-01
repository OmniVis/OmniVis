// src/lib/prompts/base/visuals.ts

export const VISUAL_RULES = `━━ VISUAL & ANIMATION FIELDS ━━━━━━━━━━━━━━━━━━━━━━━

VISUAL TYPES — set "visualType" on slides that have a visual panel (TWO-COLUMN, DIAGONAL-SPLIT, MAGAZINE-WRAP, CHART-WITH-ANNOTATION):

  "icon"  → A Material Symbols icon. Set "visualPrompt" to the icon name.
            Pick icons that reinforce the slide's idea, not generic icons.
            Strong choices: "rocket_launch", "hub", "trending_up", "security", "cloud",
            "api", "bolt", "verified", "group", "data_usage", "timeline", "inventory",
            "speed", "savings", "auto_awesome", "integration_instructions", "monitoring",
            "deployed_code", "network_node", "model_training", "psychology", "cognition"

  "chart" → Abstract chart visual. Set "visualPrompt" to a short data description.
            Example: "Bar chart: Q1=72, Q2=88, Q3=95, Q4=110 — upward trend"
            Use for CHART-WITH-ANNOTATION slides. Do not use "chart" on TWO-COLUMN slides — use "icon" instead.

  "none"  → No visual element. Use when whitespace is itself the visual statement.
            IMMERSIVE-HERO and QUOTE-WITH-ACCENT slides should always use "none".

BACKGROUND FILLS — set "visuals.fill":
  "diagonal-gradient"   → Subtle accent band from corner. Best for title/hero slides.
  "full-bleed-gradient" → Soft full-slide gradient. Use only for IMMERSIVE-HERO.
  "large-circle"        → Off-corner accent circle. Best for STAT-SPOTLIGHT.
  "svg-grid"            → Subtle geometric grid pattern. Best for technical or data slides.
  "none"                → Clean white/dark background. Use when content is the visual focus.

ANIMATIONS — set "visuals.anim":
  "spring-stagger"    → Elements bounce in staggered. The default for most slides.
  "counter"           → Numbers count up dramatically. ALWAYS use for STAT-SPOTLIGHT.
  "timeline-sequence" → Left-to-right reveal. Use for TIMELINE-HORIZONTAL.
  "fade-cascade"      → Gentle staggered fade. Use for QUOTE-WITH-ACCENT and REFERENCE-CASE.
  "none"              → No animation (use rarely — animation adds life to slides).

RECOMMENDED PAIRINGS:
  HERO-FULL-BLEED      → fill: diagonal-gradient,   anim: spring-stagger
  IMMERSIVE-HERO       → fill: full-bleed-gradient,  anim: spring-stagger
  STAT-SPOTLIGHT       → fill: large-circle,          anim: counter
  TWO-COLUMN           → fill: none,                  anim: spring-stagger + meaningful icon
  CHART-WITH-ANNOTATION → fill: svg-grid,             anim: spring-stagger
  TIMELINE-HORIZONTAL  → fill: svg-grid,              anim: timeline-sequence
  QUOTE-WITH-ACCENT    → fill: none,                  anim: fade-cascade
  MOSAIC-GRID          → fill: none,                  anim: spring-stagger + icons per item
  THREE-PILLAR-BENEFITS → fill: none,                 anim: spring-stagger + icons per pillar
  REFERENCE-CASE       → fill: diagonal-gradient,     anim: fade-cascade
  DIAGONAL-SPLIT       → fill: none,                  anim: spring-stagger + icon
  MAGAZINE-WRAP        → fill: none,                  anim: spring-stagger + icon

ICON QUALITY:
  Pick icons that are semantically meaningful for the slide's topic, not just visually generic.
  Wrong: using "star" or "check" for every slide.
  Right: "hub" for integration, "speed" for performance, "savings" for cost reduction,
         "psychology" for user research, "monitoring" for observability, "security" for compliance.`;
