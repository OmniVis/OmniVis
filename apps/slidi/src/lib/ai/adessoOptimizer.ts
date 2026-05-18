/**
 * adessoOptimizer.ts
 *
 * Adesso AI Hub performance tiering.
 *
 * Goals:
 * - Route simple formatting/styling edits to lightweight models (cheaper, faster).
 * - Route structural generation and new deck creation to heavyweight models (higher quality).
 * - Detect rate-limit errors and automatically fall back to the next available tier.
 */

// ---------------------------------------------------------------------------
// Model tier definitions
// ---------------------------------------------------------------------------

/**
 * Map from a "preferred" (heavy) model to its lightweight equivalent.
 * If no lightweight variant exists for a model, it is not in this map and
 * `selectModelForTask` will return the base model unchanged for light tasks.
 */
export const LIGHT_MODEL_MAP: Record<string, string> = {
  "gpt-4.1": "gpt-4.1-mini",
  "gpt-4o": "gpt-4.1-mini",
};

// ---------------------------------------------------------------------------
// Task classification
// ---------------------------------------------------------------------------

/**
 * Keywords that strongly suggest a *light* task:
 * small, localized formatting or copy changes that don't require structural thinking.
 */
const LIGHT_KEYWORDS = [
  "fix",
  "correct",
  "typo",
  "spelling",
  "color",
  "colour",
  "bold",
  "italic",
  "underline",
  "font",
  "size",
  "margin",
  "padding",
  "center",
  "align",
  "style",
  "make",
  "change",
  "replace",
  "rename",
  "edit",
  "adjust",
  "tweak",
  "update text",
  "update heading",
];

/**
 * Keywords that strongly suggest a *heavy* task:
 * structural generation, brand-new content, or complex visual redesigns.
 */
const HEAVY_KEYWORDS = [
  "create",
  "generate",
  "add slide",
  "new slide",
  "build",
  "design",
  "redesign",
  "rewrite",
  "rebuild",
  "restructure",
  "add section",
  "more slides",
  "animation",
  "interactive chart",
  "timeline",
  "diagram",
  "from scratch",
];

export type TaskComplexity = "light" | "heavy";

/**
 * Classify a user instruction as light (formatting) or heavy (structural).
 *
 * Scoring: count matching keywords in each list. Heavy wins on tie or when
 * no keywords match (unknown intent → safest to use the full model).
 */
export function classifyTask(instruction: string): TaskComplexity {
  const lower = instruction.toLowerCase();
  const heavyScore = HEAVY_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const lightScore = LIGHT_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  // Heavy takes precedence: if ANY heavy keyword matches, use the full model.
  if (heavyScore > 0) return "heavy";
  // Light only when explicitly matched and no heavy signals.
  if (lightScore > 0) return "light";
  // Default to heavy — better to over-spend on quality than under-deliver.
  return "heavy";
}

/**
 * Return the model ID to use given the base (user-selected) model and the
 * classified task complexity.
 *
 * - heavy tasks → use `baseModel` unchanged
 * - light tasks → downgrade to lightweight variant if one exists
 */
export function selectModelForTask(
  baseModel: string,
  complexity: TaskComplexity
): string {
  if (complexity === "light" && LIGHT_MODEL_MAP[baseModel]) {
    return LIGHT_MODEL_MAP[baseModel];
  }
  return baseModel;
}

// ---------------------------------------------------------------------------
// Rate-limit error detection and fallback
// ---------------------------------------------------------------------------

/**
 * Returns true when an HTTP status / error message indicates the Adesso Hub
 * is rate-limiting the current model tier.
 */
export function isRateLimitError(status: number, message: string): boolean {
  return (
    status === 429 ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("too many requests") ||
    message.toLowerCase().includes("quota exceeded")
  );
}

/**
 * Return the next model to try after a rate-limit on `currentModel`.
 *
 * Fallback chain: heavy model → its light variant → null (no more fallbacks).
 * Returns null when the caller should propagate the error to the user.
 */
export function getFallbackModel(currentModel: string): string | null {
  // If current model already has a light variant, try it
  if (LIGHT_MODEL_MAP[currentModel]) {
    return LIGHT_MODEL_MAP[currentModel];
  }
  // If we're already on a light model, no further fallback
  const isAlreadyLight = Object.values(LIGHT_MODEL_MAP).includes(currentModel);
  if (isAlreadyLight) return null;
  // Unknown model — no fallback available
  return null;
}

/**
 * Build a human-readable description of the active model tier for status UI.
 */
export function describeModelTier(modelId: string): string {
  const lightModels = new Set(Object.values(LIGHT_MODEL_MAP));
  if (lightModels.has(modelId)) return `${modelId} (fast)`;
  return `${modelId} (full)`;
}
