export interface DesignPersona {
  id: string;
  label: string;
  description: string;
  promptFragment: string;
  /** Tailwind classes for the picker tile preview swatch */
  previewClasses: string;
  /** Accent hex shown as a ring on the selected tile */
  accentHex: string;
}

export const DESIGN_PERSONAS: DesignPersona[] = [
  {
    id: "editorial",
    label: "Editorial Magazine",
    description: "Wired / Bloomberg — serif headlines, right-side visual fills, horizontal rules",
    accentHex: "#0f172a",
    previewClasses: "bg-white",
    promptFragment: `DESIGN PERSONA — EDITORIAL MAGAZINE:
Think Wired, Bloomberg Businessweek, or The Economist. Every design decision must feel like a print magazine art director made it.
- Headline: font-serif, text-8xl font-black, occupies top 25–35% of canvas
- Right 55% of canvas: ALWAYS a visual (chart, image placeholder, bold SVG illustration) — never plain text
- Left 45%: body copy, caption, eyebrow label (text-sm uppercase tracking-widest mb-2 opacity-60)
- Horizontal rules (border-t-2 border-current opacity-20) separate sections — use liberally
- No organic blob decorations. Use thin geometric rectangles as accent shapes.
- Colour: one dominant accent block behind the headline (full-width top band, or left border stripe)
- Every slide starts with a small eyebrow label: category, date, or context
- Body text strictly left-aligned, never centered`,
  },
  {
    id: "neo-brutalist",
    label: "Neo-Brutalist",
    description: "Raw, asymmetric, thick borders, offset shadows, intentionally off-grid",
    accentHex: "#000000",
    previewClasses: "bg-yellow-300",
    promptFragment: `DESIGN PERSONA — NEO-BRUTALIST:
Think Figma community showcases, brutalist.design. Raw, loud, intentionally anti-polish.
- ALL containers: border-4 border-black, style={{boxShadow:'6px 6px 0 #000'}}
- Layouts MUST be asymmetric — nothing perfectly centered. Intentionally off-grid.
- Headings: font-black text-8xl ALL CAPS, may overlap decorative elements
- Accent blocks: flat solid colour rectangles (yellow, red, green) — no gradients, no rounded corners (rounded-none)
- Background: white or off-white — let the borders and shadows carry visual weight
- At least ONE element per slide must be rotated 2–5 degrees (style={{transform:'rotate(3deg)'}})
- Slide counter: large, bold, styled like a zine page number
- No drop shadows except the explicit box-shadow on containers
- Decorative elements: bold geometric rectangles, NOT circles`,
  },
  {
    id: "tech-dark",
    label: "Tech / Dark",
    description: "Deep backgrounds, neon accent, monospace data callouts, grid lines",
    accentHex: "#6366f1",
    previewClasses: "bg-slate-900",
    promptFragment: `DESIGN PERSONA — TECH / DARK MODE:
Think Vercel, Linear, or a premium developer conference deck. Cold, precise, premium dark.
- Background: near-black (#0a0a14 or #0f172a equivalent via var(--sl-bg))
- Headlines: crisp white or near-white, font-black, tight tracking (tracking-tighter)
- Accent: electric — neon blue, electric violet, or cyan (var(--sl-accent)) — used for borders, glows, and key data
- Data/code callouts: monospace font (font-mono) in dedicated code-block style containers with 1px accent border
- Decorative layer: large blurred circle/glow behind stats (w-96 h-96 blur-3xl opacity-20, var(--sl-accent) background)
- Grid lines as structural decoration: SVG grid pattern at opacity-5 on dark background
- Every stat or number: font-mono text-8xl, var(--sl-accent) colour
- Minimal whitespace — pack the canvas with precision-aligned data elements`,
  },
  {
    id: "organic-warm",
    label: "Organic & Warm",
    description: "Soft blobs, warm neutrals, humanist type, breathing room",
    accentHex: "#f97316",
    previewClasses: "bg-orange-50",
    promptFragment: `DESIGN PERSONA — ORGANIC & WARM:
Think Notion, Craft, or a premium wellness brand. Human, breathable, approachable.
- Palette: warm neutrals — use var(--sl-bg) but describe it as cream/sand-toned; use var(--sl-accent) as terracotta/orange
- Shape language: rounded-3xl on ALL containers, pill-shaped labels, blob shapes as backgrounds
- Decorative blobs: large organic SVG blob paths as background fills (no clip-path, use SVG with bezier curves)
- Typography: humanist sans-serif (font-sans), generous line-height (leading-loose), medium weights
- Heading size: text-7xl font-bold — bold but not aggressive
- Layout: generous padding (px-24 py-20), lots of breathing room — let whitespace carry the calm feeling
- Accent blocks: rounded-full pills for labels and tags; rounded-3xl for content cards
- Every slide should feel comfortable and inviting — no sharp edges anywhere`,
  },
  {
    id: "corporate-bold",
    label: "Corporate Bold",
    description: "High-contrast colour blocks, geometric dividers, strict grid discipline",
    accentHex: "#1d4ed8",
    previewClasses: "bg-blue-700",
    promptFragment: `DESIGN PERSONA — CORPORATE BOLD:
Think McKinsey slides, BCG decks, or a Fortune 500 annual report. Authoritative, structured, data-driven.
- Top 35% of canvas: solid accent colour block (var(--sl-accent) background) containing headline in white
- Bottom 65%: white/light background with the body content, charts, data
- Geometric dividers: thick horizontal rules (border-t-4), vertical separator lines between columns
- Grid discipline: all elements snap to an invisible 12-column grid — strict left alignment
- Headlines: text-6xl font-black, white text on accent background (never vice versa)
- Body: text-xl in dark text (#1d4ed8 equivalent via var(--sl-text)) on light background
- Data boxes: white containers with 1px border and left accent stripe (w-1.5 bg-accent absolute left-0)
- Every slide must have a structured data element: table row, metric box, or labeled bar chart
- No decorative blobs — only rectangles and straight lines as decoration`,
  },
  {
    id: "minimal-swiss",
    label: "Minimal Swiss",
    description: "Typography IS the design — strict grid, weight contrast, intentional negative space",
    accentHex: "#ef4444",
    previewClasses: "bg-white",
    promptFragment: `DESIGN PERSONA — MINIMAL SWISS:
Think Helvetica posters, MUJI catalogues, or the International Style. Typography does all the work.
- Almost zero decoration — no shapes, no blobs, no circles. Typography IS the design.
- Grid: imaginary 12-column grid. Every element aligns to a left or right column boundary. Nothing floats freely.
- Headline: massive, text-9xl font-black tracking-tighter, occupies most of the canvas. Single-word or two-word max.
- Body: text-xl font-light — extreme weight contrast between headline and body is the core technique
- Eyebrow labels: ALL CAPS, text-xs, tracking-[0.3em], var(--sl-accent) colour
- Accent: ONE element per slide in var(--sl-accent) — just one. Used for a single word, a rule, or a label.
- Whitespace: treat empty canvas as a design choice — slides should feel deliberately sparse
- NO decorative shapes of any kind. If a visual is needed, use a single large Material Symbol icon at opacity-20.
- Alignment: strict left or right. Never centered (except fullbleed title slides).`,
  },
  {
    id: "adesso",
    label: "adesso SE",
    description: "Official adesso brand — Chivo, #006ab3 blue, The Vertical 45° element, left axis",
    accentHex: "#006ab3",
    previewClasses: "bg-[#006ab3]",
    promptFragment: `DESIGN PERSONA — ADESSO SE (OFFICIAL BRAND — HIGHEST PRIORITY):
Implement the adesso SE corporate design system faithfully. These rules override all default styling preferences.

COLOUR OVERRIDE: For this persona, you MUST use these specific hex values via inline style props alongside theme variables.
The adesso brand colours are fixed and do not vary with the theme:
- Primary blue:     #006ab3  (headers, accent blocks, primary CTAs, "The Vertical")
- Dark blue:        #00518b  (deep containers, hover emphasis, gradient starts)
- Light grey bg:    #f2f2f2  (card/container backgrounds)
- White:            #ffffff  (slide base background)
- Text primary:     #1a1c1c  (all body text)
- Text secondary:   #414751  (captions, labels, secondary copy)
- Teal accent:      #00755f  (used SPARINGLY — maximum one element per slide)
- Border / outline: #e2e2e2  (1px card borders)

FONT — MANDATORY:
All text MUST use Chivo: style={{fontFamily:"'Chivo', sans-serif"}}
Apply this to every element — headlines, body, labels, captions.
Type scale (use inline fontSize, fontWeight):
- Slide title / Display:  fontSize:'72px', fontWeight:800, lineHeight:1.1, letterSpacing:'-0.02em'
- Section headline:       fontSize:'44px', fontWeight:700, lineHeight:1.2
- Sub-headline:           fontSize:'28px', fontWeight:700, lineHeight:1.3
- Body large:             fontSize:'20px', fontWeight:400, lineHeight:1.6
- Eyebrow / label:        fontSize:'12px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em'

"THE VERTICAL" — SIGNATURE ELEMENT — MANDATORY ON EVERY SINGLE SLIDE (pick one variant):
A. Left-side accent bar on cards/sections:
   <div style={{position:'absolute',left:0,top:0,bottom:0,width:'4px',background:'#006ab3'}}/>
B. 45-degree clipped corner on a container (bottom-right):
   style={{clipPath:'polygon(0 0, 100% 0, 100% calc(100% - 28px), calc(100% - 28px) 100%, 0 100%)'}}
C. Diagonal gradient divider bar at bottom of slide:
   <div style={{position:'absolute',bottom:0,left:0,right:0,height:'4px',background:'linear-gradient(90deg,#006ab3,#00bfa5)'}}/>
D. SVG angular bracket accent next to headline:
   <svg width="6" height="44" viewBox="0 0 6 44" style={{display:'inline-block',marginRight:'12px'}}>
     <path d="M6 0 L0 22 L6 44" fill="none" stroke="#006ab3" strokeWidth="2.5"/>
   </svg>

LAYOUT — LEFT-ALIGNED AXIS (mandatory):
- Root: style={{background:'#ffffff',fontFamily:"'Chivo',sans-serif"}} + className="h-screen w-screen overflow-hidden relative"
- Padding: px-20 py-16 (or px-16 for tighter sections)
- ALL text: text-left. NEVER centered text (except STAT-SPOTLIGHT archetype only)
- Cards/containers: style={{background:'#f2f2f2',border:'1px solid #e2e2e2',borderRadius:'4px'}}
- NO drop shadows. Depth via background tone shifts only (white → #f2f2f2 → #e8e8e8)

GRADIENTS (use as full-bleed slide backgrounds or large header bands):
- Blue-to-teal:  style={{background:'linear-gradient(135deg, #006ab3 0%, #0097a7 60%, #00bfa5 100%)'}}
- Subtle page:   style={{background:'linear-gradient(160deg, #ffffff 0%, #e8f0fa 100%)'}}
Gradients apply to backgrounds ONLY — never to text.

SHAPES:
- Standard rounding: borderRadius:'4px' (subtle). NO rounded-2xl, NO large blob shapes.
- Pill shapes (borderRadius:'9999px') ONLY for tags, badges, or status indicators.
- "The Vertical" 45-degree cut is the ONLY angular decoration allowed.

FORBIDDEN (strictly):
- Organic blob shapes (large rounded-full decorative circles)
- Heavy drop shadows (shadow-lg, shadow-xl on content)
- Centered text outside of STAT-SPOTLIGHT slides
- Any font other than Chivo
- Gradient text colours (gradient on backgrounds only)
- Rounded corners larger than 4px on content containers`,
  },
];

export function getPersonaById(id: string | null): DesignPersona | null {
  if (!id) return null;
  return DESIGN_PERSONAS.find((p) => p.id === id) ?? null;
}
