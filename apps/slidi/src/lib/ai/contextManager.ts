/**
 * contextManager.ts
 *
 * Intelligent context windowing for Visual Edit mode.
 * Instead of sending the full ~8,000-token presentation component to the AI
 * for every small localized change, we extract only the relevant slide block
 * (~200–500 tokens) and splice the result back in — cutting input tokens by >60%.
 */

import type { ChatMessage } from "@/store/slidiStore";

interface SlideBlockResult {
  block: string;
  start: number;
  end: number;
}

/**
 * Extract the JSX block for a specific slide index from the full component code.
 *
 * Matches the pattern:  {current === N && (  ...JSX...  )}
 *
 * Uses paren-depth counting to find the matching closing `)` while skipping
 * string literals so quoted `)` characters don't corrupt the count.
 *
 * Returns null if the pattern is not found (e.g., the slide uses a different
 * conditional form, or the code is malformed) — callers should fall back to
 * full regeneration in that case.
 */
export function extractSlideBlock(
  code: string,
  slideIndex: number
): SlideBlockResult | null {
  const marker = `{current === ${slideIndex} &&`;
  const markerIdx = code.indexOf(marker);
  if (markerIdx === -1) return null;

  // Advance past the marker to find the opening '('
  let i = markerIdx + marker.length;
  while (i < code.length && code[i] !== "(") i++;
  if (i >= code.length) return null;

  let parenDepth = 0;

  while (i < code.length) {
    const ch = code[i];

    // Skip single-quoted strings
    if (ch === "'") {
      i++;
      while (i < code.length && code[i] !== "'") {
        if (code[i] === "\\") i++;
        i++;
      }
    }
    // Skip double-quoted strings
    else if (ch === '"') {
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === "\\") i++;
        i++;
      }
    }
    // Skip template literals (simplified — ignores ${} nesting)
    else if (ch === "`") {
      i++;
      while (i < code.length && code[i] !== "`") {
        if (code[i] === "\\") i++;
        i++;
      }
    }
    // Track paren depth
    else if (ch === "(") {
      parenDepth++;
    } else if (ch === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        // The ')' closes the `&& (...)` — the next non-whitespace char is '}'
        let j = i + 1;
        while (j < code.length && /\s/.test(code[j])) j++;
        if (j < code.length && code[j] === "}") {
          return {
            block: code.slice(markerIdx, j + 1),
            start: markerIdx,
            end: j + 1,
          };
        }
        // Fallback: closing '}' not immediately after ')' — give up
        return null;
      }
    }

    i++;
  }

  return null;
}

/**
 * Replace the slide block at `slideIndex` inside `fullCode` with `newBlock`.
 * Returns the updated full component string, or null if the block could not
 * be located (caller should fall back to full regeneration).
 */
export function spliceSlideBlock(
  fullCode: string,
  slideIndex: number,
  newBlock: string
): string | null {
  const extracted = extractSlideBlock(fullCode, slideIndex);
  if (!extracted) return null;
  return fullCode.slice(0, extracted.start) + newBlock + fullCode.slice(extracted.end);
}

/**
 * Build a compact ChatMessage array for a targeted single-slide edit.
 *
 * Instead of the full conversation history (potentially 5,000+ tokens of
 * back-and-forth) the AI receives only the current slide's JSX block plus
 * the edit instruction — dramatically reducing input tokens and latency.
 *
 * Returns null if the slide block cannot be extracted (caller should fall
 * back to `generatePresentation` with the full message history).
 */
export function buildWindowedEditMessages(
  fullCode: string,
  slideIndex: number,
  totalSlides: number,
  editInstruction: string
): ChatMessage[] | null {
  const extracted = extractSlideBlock(fullCode, slideIndex);
  if (!extracted) return null;

  const content = `You are making a targeted text/content edit to a single slide in a Slidi React presentation.

Slide being edited: ${slideIndex + 1} of ${totalSlides}

Current slide block:
${extracted.block}

Edit instruction: ${editInstruction}

STRICT RULES — violating any of these is a failure:
- Return ONLY the updated slide block — no markdown fences, no explanation, no commentary.
- The block MUST start exactly with \`{current === ${slideIndex} &&\` and end with \`}\`.
- Make ONLY the specific changes requested. DO NOT alter layout, component structure, Tailwind classes, spacing, font sizes, padding, flex/grid arrangement, or any visual styling whatsoever.
- Preserve ALL existing CSS classes exactly as they are, including animation classes (sl-slide-up, sl-scale-in, sl-fade-in, sl-delay-*).
- Use ONLY var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub) for colours — no hardcoded hex or Tailwind colour classes.
- Keep the key={current} prop on the outermost JSX element.
- If the instruction asks to change text, change ONLY that text. If it asks to change a URL or email, change ONLY that value. Touch nothing else.`;

  return [{ role: "user", content }];
}

/**
 * Estimate the token count of the full code vs. the windowed context.
 * Useful for logging / telemetry. Rough approximation: 1 token ≈ 4 chars.
 */
export function estimateTokenReduction(
  fullCode: string,
  slideIndex: number
): { fullTokens: number; windowedTokens: number; reductionPct: number } | null {
  const extracted = extractSlideBlock(fullCode, slideIndex);
  if (!extracted) return null;

  const fullTokens = Math.ceil(fullCode.length / 4);
  const windowedTokens = Math.ceil(extracted.block.length / 4);
  const reductionPct = Math.round((1 - windowedTokens / fullTokens) * 100);

  return { fullTokens, windowedTokens, reductionPct };
}
