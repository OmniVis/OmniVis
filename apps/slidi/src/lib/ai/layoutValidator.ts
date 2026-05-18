export interface LayoutWarning {
  slideIndex: number | null;
  severity: "error" | "warning";
  type: string;
  message: string;
}

/** Split code into per-slide text chunks by `{current === N && (` markers. */
function extractSlideBlocks(code: string): Array<{ index: number; block: string }> {
  const positions: Array<{ index: number; pos: number }> = [];
  const re = /\{current\s*===\s*(\d+)\s*&&/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    positions.push({ index: parseInt(m[1], 10), pos: m.index });
  }
  return positions.map((p, i) => ({
    index: p.index,
    block: code.slice(p.pos, i + 1 < positions.length ? positions[i + 1].pos : code.length),
  }));
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/** Check 1: root element has h-screen or min-h-screen. */
export function checkMissingHScreen(code: string): LayoutWarning | null {
  if (!code.includes("h-screen") && !code.includes("min-h-screen")) {
    return {
      slideIndex: null,
      severity: "warning",
      type: "missing-h-screen",
      message:
        "Root element may be missing h-screen — slides may not fill the 16:9 canvas.",
    };
  }
  return null;
}

/** Check 2: narrow max-w-* containers on content blocks (exempt if combined with absolute). */
export function checkNarrowMaxWidth(code: string): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const re = /className=['"`]([^'"`]*\bmax-w-(?:sm|md|2xl)\b[^'"`]*)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const cls = m[1];
    if (cls.includes("absolute")) continue; // decorative element — exempt
    const matched = cls.match(/max-w-\S+/)?.[0] ?? "max-w-*";
    warnings.push({
      slideIndex: null,
      severity: "warning",
      type: "narrow-max-width",
      message: `Content block uses ${matched} — use full-width layout with px-20 padding instead.`,
    });
    break; // one warning is sufficient
  }
  return warnings;
}

/** Check 3: heading elements (h1, h2) below text-4xl. */
export function checkHeadingSize(code: string): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const tooSmall =
    /className=['"`][^'"`]*\b(text-sm|text-base|text-lg|text-xl|text-2xl|text-3xl)\b[^'"`]*['"`]/;
  const headingRe = /<h[12][^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(code)) !== null) {
    const sizeMatch = tooSmall.exec(m[0]);
    if (sizeMatch) {
      warnings.push({
        slideIndex: null,
        severity: "warning",
        type: "heading-too-small",
        message: `Heading uses ${sizeMatch[1]} — primary headings must be at least text-4xl (text-6xl preferred).`,
      });
    }
  }
  return warnings;
}

/** Check 4: slides with no visual element (no SVG, img, or large rounded shape). */
export function checkMissingVisual(code: string): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const slides = extractSlideBlocks(code);
  for (const { index, block } of slides) {
    const hasSvg = block.includes("<svg");
    const hasImg = block.includes("<img");
    // Large rounded-full shape: w-4x to w-9x digits combined with rounded-full
    const hasLargeRoundedShape = /rounded-full[^"]*w-[4-9]\d|w-[4-9]\d[^"]*rounded-full/.test(
      block
    );
    if (!hasSvg && !hasImg && !hasLargeRoundedShape) {
      warnings.push({
        slideIndex: index,
        severity: "warning",
        type: "no-visual",
        message: `Slide ${index + 1} has no visual element — add an SVG chart, icon, or decorative shape.`,
      });
    }
  }
  return warnings;
}

/** Check 5: 3+ consecutive slides with identical layout signature (root className hash). */
export function checkLayoutRepetition(code: string): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const slides = extractSlideBlocks(code);
  if (slides.length < 3) return warnings;

  const signatures = slides.map(({ block }) => {
    const m = block.match(/<div\s+key=\{current\}\s+className=['"`]([^'"`]+)['"`]/);
    return m ? simpleHash(m[1]) : simpleHash(block.slice(0, 100));
  });

  for (let i = 0; i <= signatures.length - 3; i++) {
    if (
      signatures[i] === signatures[i + 1] &&
      signatures[i + 1] === signatures[i + 2]
    ) {
      warnings.push({
        slideIndex: slides[i].index,
        severity: "warning",
        type: "layout-repetition",
        message: `Slides ${slides[i].index + 1}–${slides[i + 2].index + 1} use the same layout — rotate archetypes (TWO-COLUMN, STAT-SPOTLIGHT, etc.).`,
      });
      break; // one repetition warning is sufficient
    }
  }
  return warnings;
}

/** Run all layout checks and return the combined warning list. O(N) in code length, synchronous. */
export function detectLayoutAntiPatterns(code: string): LayoutWarning[] {
  const warnings: LayoutWarning[] = [];
  const w1 = checkMissingHScreen(code);
  if (w1) warnings.push(w1);
  warnings.push(...checkNarrowMaxWidth(code));
  warnings.push(...checkHeadingSize(code));
  warnings.push(...checkMissingVisual(code));
  warnings.push(...checkLayoutRepetition(code));
  return warnings;
}
