// src/lib/prompts/builders.ts
import type { UserContext, AttachedFile } from "@/store/slidiStore";
import { getPersonaById } from "@/lib/designPersonas";
import { BASE_PROMPT } from './base';

export { BASE_PROMPT };

/** Injects user context into any system prompt when set. */
export function buildUserContextBlock(ctx: UserContext | null): string {
  if (!ctx) return "";
  const lines: string[] = ["USER CONTEXT — apply to every generation:"];
  if (ctx.role)               lines.push(`- Role: ${ctx.role}`);
  if (ctx.department)         lines.push(`- Department: ${ctx.department}`);
  if (ctx.language)           lines.push(`- Output language: ${ctx.language} — generate ALL text (headings, body, labels) in this language.`);
  if (ctx.customInstructions) lines.push(`- Standing instructions: ${ctx.customInstructions}`);
  return lines.length > 1 ? lines.join("\n") : "";
}

/** Shifts the AI's tone, vocabulary, and visual style for the target audience. */
export function buildPresentationModeBlock(mode: "corporate" | "private"): string {
  if (mode === "corporate") {
    return `PRESENTATION MODE — CORPORATE:
- Tone: professional, precise, data-driven. No slang, no humour unless very subtle.
- Language: formal register. Use "we" and "our" for the company voice.
- Visuals: structured layouts (TWO-COLUMN, CHART-WITH-ANNOTATION preferred). Charts and statistics over decorative imagery.
- Colour use: accent colours used sparingly; prefer clean white/dark backgrounds.
- Always include: an agenda slide, a key takeaways or CTA slide.`;
  }
  return `PRESENTATION MODE — PRIVATE:
- Tone: warm, conversational, personal. Light humour and casual phrasing welcome.
- Language: informal. First person ("I", "my") is fine.
- Visuals: expressive and creative. HERO-FULL-BLEED, QUOTE-WITH-ACCENT, and STAT-SPOTLIGHT archetypes preferred. Bold colour use encouraged.
- Colour use: vibrant, high-contrast accent blocks.
- Storytelling: lead with narrative arc rather than data. Emotional resonance over statistics.`;
}

/** Builds a helper function that combines context and mode prefix for prompt builders. */
export function buildContextPrefix(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const contextBlock = buildUserContextBlock(userCtx ?? null);
  const modeBlock = mode ? buildPresentationModeBlock(mode) : "";
  const parts = [contextBlock, modeBlock].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") + "\n\n" : "";
}

/** Builds an injected persona fragment block for the system prompt. */
export function buildPersonaBlock(personaId: string | null | undefined): string {
  const persona = getPersonaById(personaId ?? null);
  if (!persona) return "";
  return `\n\n${persona.promptFragment}`;
}

/** Builds a design brief block for the system prompt. */
export function buildDesignBriefBlock(designBrief: string | null | undefined): string {
  if (!designBrief || !designBrief.trim()) return "";
  const truncated = designBrief.trim().slice(0, 2000);
  return `\n\nUSER DESIGN BRIEF (highest priority — override defaults where they conflict):\n${truncated}`;
}

/** Builds the premium mode constraint block */
export function buildPremiumBlock(premiumMode?: boolean): string {
  if (!premiumMode) return "";
  return `\n\nPREMIUM PRESENTATION MODE ACTIVE:
This is a high-end, premium consulting presentation. You must adhere to the following STRICT constraints:
1. Generate between 14-22 slides. Do not compress content. One slide = one main idea.
2. Max 35-55 visible words per slide. Max 3 content blocks. Use speaker fragments, not long paragraphs.
3. If an architecture, process, or gantt diagram is requested, generate a real SVG snippet in customSvgCode. Do not use placeholder icons for diagrams.
4. Typography and whitespace must be intentional. Avoid 3x3 or 2x4 card grids for text-heavy content.
5. Provide strong slide rhythm (Title -> Divider -> Idea -> Visual -> Detail).
6. German text must be short, direct, professional business language.`;
}

export function buildPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
  premiumMode?: boolean,
): string {
  const slideCap = maxSlides
    ? `\n\nFREE-TIER OVERRIDE: Generate EXACTLY ${maxSlides} slides. Set \`const totalSlides = ${maxSlides}\`. Quality over quantity — each slide must still be fully complete with headline, body, and visual.`
    : "";
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  const premiumBlock = buildPremiumBlock(premiumMode);
  return `${prefix}${themeBlock}\n\n${BASE_PROMPT}${personaBlock}${briefBlock}${premiumBlock}${slideCap}`;
}

export function buildPlanningPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
  premiumMode?: boolean,
): string {
  const slideTarget = maxSlides ? `exactly ${maxSlides}` : "8-12";
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  const premiumBlock = buildPremiumBlock(premiumMode);
  return `${prefix}${themeBlock}${personaBlock}${briefBlock}${premiumBlock}

You are planning a presentation before writing code.
Output a concise plan only (no JSX), with:
- target slide count (${slideTarget})
- one line per slide with title and purpose
- 2-3 visual/interactive elements to include
- final reminder: "ready for code generation"
`;
}

export function buildRepairPrompt(
  themeBlock: string,
  maxSlides?: number,
  userCtx?: UserContext | null,
  mode?: "corporate" | "private",
  personaId?: string | null,
  designBrief?: string | null,
  premiumMode?: boolean,
): string {
  const minSlides = maxSlides ?? 6;
  const prefix = buildContextPrefix(userCtx, mode);
  const personaBlock = buildPersonaBlock(personaId);
  const briefBlock = buildDesignBriefBlock(designBrief);
  const premiumBlock = buildPremiumBlock(premiumMode);
  return `${prefix}${themeBlock}${personaBlock}${briefBlock}${premiumBlock}

You are completing an unfinished React presentation component.
Return ONLY the corrected full component. Critical rules:
1. export default function Presentation()
2. const totalSlides = N  (N >= ${minSlides})
3. Include all slides from current === 0 to current === totalSlides - 1
4. Use var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub) — never hardcoded colours
5. Use sl-slide-up, sl-scale-in, sl-fade-in, sl-bar-grow, sl-delay-1..5 animation classes
   Anime.js is available as the global \`anime\`. Use \`anime({ targets, ... })\` inside \`useEffect(() => { ... }, [current])\` for complex animations.
6. Slide counter: {current + 1} / {totalSlides}
7. No markdown fences, no explanation, no commentary
8. Inside Presentation, include: useEffect(() => { window.parent?.postMessage({ type: 'sl_slide_change', current, total: totalSlides }, '*'); }, [current]);
9. Root div: className="h-screen w-screen overflow-hidden relative bg-sl-bg text-sl-text" — mandatory on every slide.
10. Min type scale: body text ≥ text-2xl; primary headings ≥ text-6xl. No max-w-sm/md/2xl on main content. No font sizes below 18px.
11. Background decoration is optional — add only when it reinforces structure or guides the eye.
`;
}

/**
 * Builds a context block from any files the user has attached to this generation request.
 */
export function buildAttachedFilesBlock(files: AttachedFile[]): string {
  if (files.length === 0) return "";

  const sections = files
    .map((f) => `--- File: ${f.name} ---\n${f.markdown.trim()}\n---`)
    .join("\n\n");

  return `\n\n# ATTACHED CONTEXT DOCUMENTS\nThe user has uploaded the following documents as context for this presentation. Prioritize the information, data, and structure found in these documents when generating slide content.\n\n${sections}`;
}

// Re-export AttachedFile so callers can import it from this module
export type { AttachedFile };

/** @deprecated Use buildPrompt(themeBlock) instead */
export const SYSTEM_PROMPT = BASE_PROMPT;
