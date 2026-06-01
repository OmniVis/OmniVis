export interface DesignBriefTemplate {
  id: string;
  label: string;
  description: string;
  content: string;
}

export const DESIGN_BRIEF_TEMPLATES: DesignBriefTemplate[] = [
  {
    id: "startup-pitch",
    label: "Startup Pitch Deck",
    description: "Bold, confident, investor-ready",
    content: `# Startup Pitch Deck Design Brief

## Visual Identity
- Bold and confident — every slide should communicate conviction
- High-contrast layouts: dark backgrounds with electric accent colours preferred
- Large, impactful numbers and statistics front-and-centre
- Motion: spring animations on entrance, counters for key metrics

## Typography
- Headlines: font-black, text-8xl minimum, ultra-tight tracking
- Body: text-xl, clean and concise — max 3 sentences per slide
- Labels: uppercase, tracked, small — category / section markers

## Layout Rules
- First slide: full-bleed dark background, company name massive, tagline below
- Data slides: stat-spotlight with animated counters (STAT-SPOTLIGHT archetype)
- Comparison slides: two-column with clear visual separator
- At least 60% of the canvas must have visible content — no dead space

## Tone
- Assertive and forward-looking
- Numbers and outcomes over process descriptions
- End every deck with a clear, single-sentence call-to-action slide

## Forbidden
- Bullet-point-heavy slides (max 3 bullets per slide)
- Cluttered layouts — less is more
- Anything that looks "template-y" or generic`,
  },
  {
    id: "corporate-report",
    label: "Corporate Report",
    description: "Conservative, data-rich, trust-building",
    content: `# Corporate Annual Report Design Brief

## Visual Identity
- Professional, clean, and trustworthy
- Light backgrounds (#ffffff or very light grey) with controlled accent usage
- Data visualisations (charts, tables, metrics) are primary content
- Every slide conveys reliability and precision

## Typography
- Headlines: font-bold (not black), text-6xl — authoritative but not aggressive
- Body: text-xl, formal tone, full sentences
- Data labels: font-mono for numbers and percentages
- Section labels: uppercase, tracking-widest, small — used as navigation aids

## Layout Rules
- TWO-COLUMN and CHART-WITH-ANNOTATION archetypes preferred
- Every slide with data must have labelled axes or clear data context
- Consistent left-aligned content axis — nothing floats freely
- Include agenda and executive summary slides

## Colour Use
- Accent colour used sparingly: dividers, chart fills, key data highlights only
- No loud gradients — subtle background tones only
- Charts: single accent colour + grey for comparison data

## Forbidden
- Decorative blob shapes
- Heavy animations — subtle fade-in only
- Overly expressive or casual language`,
  },
  {
    id: "creative-agency",
    label: "Creative Agency",
    description: "Portfolio / case study — experimental, visual-led",
    content: `# Creative Agency Portfolio Design Brief

## Visual Identity
- Experimental and visually led — the design IS the message
- Willing to break grid conventions for visual impact
- High production value: every slide could be a poster
- Asymmetric layouts, intentional negative space, unexpected proportions

## Typography
- Mix font weights dramatically — ultra-heavy headline next to ultra-light body
- Oversized typography that bleeds off-screen edges is encouraged
- Eyebrow labels are essential — establish context before the headline lands
- No more than 20 words of body copy per slide

## Layout Rules
- HERO-FULL-BLEED and MAGAZINE-WRAP archetypes preferred
- Visuals (images, SVGs, icons) take precedence — text supports, never dominates
- At least one "impact slide": full-bleed background, single bold statement
- Each slide should feel compositionally unique

## Colour Use
- Bold and unexpected colour combinations
- Full-bleed gradient backgrounds encouraged
- Accent used generously — not sparingly

## Animation
- Dramatic entrance animations — spring physics or timeline sequences
- Stagger reveals to build tension before the key message lands`,
  },
  {
    id: "academic-lecture",
    label: "Academic / Research",
    description: "Dense, structured, zero decoration",
    content: `# Academic Lecture / Research Presentation Brief

## Visual Identity
- Information density is a priority — clarity over aesthetics
- Clean, neutral, and distraction-free
- All decoration serves a functional purpose
- Professional but not corporate

## Typography
- Body: text-xl — readable at a distance when projected
- Headlines: clear and descriptive (not creative) — the audience should understand the slide from the headline alone
- No font-black or ultra-heavy weights — font-semibold maximum
- Captions and citations: text-sm, muted colour

## Layout Rules
- CHART-WITH-ANNOTATION preferred for data slides
- TIMELINE-HORIZONTAL for methodological sequences
- Every slide must have a clear single point — no multi-topic slides
- Source citations visible on data slides
- Include: introduction, methodology, findings, implications, conclusion structure

## Colour Use
- Neutral base — minimal accent colour use
- Chart fills: single accent colour only, greyscale for secondary data
- Avoid gradients entirely

## Forbidden
- Decorative animations (entrance animations only, no ambient motion)
- Clip art or emoji-style visuals
- Any design element that distracts from the content`,
  },
  {
    id: "product-launch",
    label: "Product Launch",
    description: "Cinematic, high-energy, brand-forward",
    content: `# Product Launch Event Presentation Brief

## Visual Identity
- Cinematic and theatrical — this is a performance, not a document
- Every slide should build anticipation for the next
- Product visuals (placeholders) are prominent — feature shots, not diagrams
- Brand colour dominates every slide

## Typography
- Headlines: text-8xl font-black — massive, commanding attention
- Feature names: oversized, possibly animated letter by letter
- Body: minimal — one punchy sentence max
- Taglines: italic, slightly smaller than headline

## Layout Rules
- Dramatic reveal structure: tease → reveal → detail → impact
- IMMERSIVE-HERO slides for major reveals (full-bleed background + overlaid text)
- STAT-SPOTLIGHT for specification/number slides
- Product comparison: MOSAIC-GRID with feature tiles
- Closing slide: full-bleed, logo, tagline only

## Animation
- Dramatic spring entrance on headline
- Timeline sequences that build slide content piece by piece
- Animated counters for specification numbers

## Colour Use
- Brand accent is the hero — used boldly on large areas
- Dark backgrounds preferred for "reveal" slides
- Light backgrounds for specification/detail slides`,
  },
  {
    id: "minimalist",
    label: "Minimalist",
    description: "Maximum whitespace — typography carries everything",
    content: `# Minimalist Executive Summary Brief

## Visual Identity
- Less is more — every element must earn its place
- Whitespace is a design element, not wasted space
- One idea per slide, perfectly expressed
- The typography does all the visual work

## Typography
- ONE headline per slide — large (text-8xl), precise, complete thought
- Body: text-xl font-light — maximum 2 sentences
- No labels, no eyebrows, no captions unless absolutely necessary
- Weight contrast is the only visual tool: font-black headline + font-light body

## Layout Rules
- MINIMAL-SWISS and QUOTE-WITH-ACCENT archetypes preferred
- Content centred on the vertical axis — not horizontally, but positioned with intention
- A single accent colour element per slide maximum: one word, one rule, one label
- Never more than 30% of the canvas filled — the rest is intentional emptiness

## Colour Use
- Near-monochrome: white or very light background, near-black text
- Accent colour used once per slide only — a single word, a horizontal rule, or a label
- No gradients, no backgrounds on containers, no card borders

## Forbidden
- Multiple visual elements competing for attention
- Decorative shapes of any kind
- Animations other than a simple fade-in
- Anything that could be removed without losing meaning`,
  },
];
