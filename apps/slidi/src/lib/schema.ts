export type Archetype = 
  | "HERO-FULL-BLEED"
  | "TWO-COLUMN"
  | "STAT-SPOTLIGHT"
  | "CHART-WITH-ANNOTATION"
  | "TIMELINE-HORIZONTAL"
  | "QUOTE-WITH-ACCENT"
  | "MAGAZINE-WRAP"
  | "MOSAIC-GRID"
  | "DIAGONAL-SPLIT"
  | "IMMERSIVE-HERO"
  | "THREE-PILLAR-BENEFITS"
  | "REFERENCE-CASE";

export interface SlideContent {
  eyebrow?: string;
  headline?: string;
  body?: string;
  
  // For QUOTE-WITH-ACCENT
  quote?: string;
  author?: string;

  // For STAT-SPOTLIGHT
  stats?: Array<{ value: string; label: string }>;

  // For TIMELINE-HORIZONTAL
  milestones?: Array<{ title: string; description: string; date?: string }>;

  // For MOSAIC-GRID
  gridItems?: Array<{ title?: string; text: string; icon?: string }>;

  // For THREE-PILLAR-BENEFITS
  pillars?: Array<{ title: string; text: string; icon?: string }>;

  // For REFERENCE-CASE
  client?: string;
  challenge?: string;
  solution?: string;
  outcome?: string;

  // For Two-Column / Chart / Magazine
  visualType?: "chart" | "icon" | "image" | "custom-svg" | "none";
  visualPrompt?: string; // Hint for what the visual should represent
  customSvgCode?: string; // Raw SVG string if visualType is "custom-svg"
}

export interface SlideVisuals {
  fill?: "svg-grid" | "large-circle" | "diagonal-gradient" | "full-bleed-gradient" | "none";
  anim?: "spring-stagger" | "timeline-sequence" | "counter" | "stroke-draw" | "fade-cascade" | "none";
}

export interface SlideData {
  archetype: Archetype;
  content: SlideContent;
  visuals?: SlideVisuals;
  notes?: string;
}

export interface PresentationData {
  title: string;
  slides: SlideData[];
}
