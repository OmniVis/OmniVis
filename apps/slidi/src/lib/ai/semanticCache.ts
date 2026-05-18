/**
 * semanticCache.ts
 *
 * Session-scoped semantic cache for slide structural layouts.
 *
 * When a user requests a slide type they've seen before in the same session
 * (e.g., "Team Slide with 4 people" → "Team Slide with 6 people"), we can
 * serve a cached structural layout and ask the AI to inject new content only,
 * bypassing the full planning + generation wait.
 *
 * The cache lives in module-level state (not localStorage) so it resets on
 * page reload — intentionally session-scoped.
 */

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

/**
 * djb2 hash — fast, deterministic, good distribution for short strings.
 * Returns an 8-char hex string.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // Equivalent to: hash * 33 XOR charCode
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit int
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Normalize a prompt for cache keying:
 * - lowercase
 * - collapse whitespace
 * - strip punctuation (keep alphanumeric + spaces)
 */
export function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function hashPrompt(prompt: string): string {
  return djb2Hash(normalizePrompt(prompt));
}

// ---------------------------------------------------------------------------
// Slide-type detection
// ---------------------------------------------------------------------------

export interface SlideTypePattern {
  pattern: RegExp;
  type: string;
}

export const SLIDE_TYPE_PATTERNS: SlideTypePattern[] = [
  { pattern: /\bteam\b|\bmeet the team\b|\bour team\b|\bstaff\b/, type: "team-slide" },
  { pattern: /\bchart\b|\bgraph\b|\bdata viz\b|\bmetrics\b|\bkpi\b/, type: "chart-slide" },
  { pattern: /\btimeline\b|\bhistory\b|\bmilestone\b|\broadmap\b/, type: "timeline-slide" },
  { pattern: /\bagenda\b|\btable of contents\b|\boverview\b/, type: "agenda-slide" },
  { pattern: /\btitle slide\b|\bcover\b|\bintroduction slide\b/, type: "title-slide" },
  { pattern: /\bcontact\b|\bget in touch\b|\bcall to action\b|\bcta\b/, type: "cta-slide" },
  { pattern: /\bcompar\b|\bvs\b|\bversus\b|\bpros and cons\b/, type: "comparison-slide" },
  { pattern: /\bquote\b|\btestimonial\b|\breview\b|\bfeedback\b/, type: "quote-slide" },
  { pattern: /\bpric\b|\bplan\b|\btier\b|\bpackage\b/, type: "pricing-slide" },
  { pattern: /\bfaq\b|\bfrequently asked\b|\bquestion\b/, type: "faq-slide" },
  { pattern: /\bstat\b|\bnumber\b|\bfigure\b|\bcounter\b/, type: "stats-slide" },
];

/**
 * Detect a canonical slide type from a freeform prompt string.
 * Returns null if no known type matches.
 */
export function detectSlideType(prompt: string): string | null {
  const normalized = normalizePrompt(prompt);
  for (const { pattern, type } of SLIDE_TYPE_PATTERNS) {
    if (pattern.test(normalized)) return type;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Cache store
// ---------------------------------------------------------------------------

interface CacheEntry {
  /** Structural JSX layout code cached for this prompt. */
  layout: string;
  /** Unix timestamp of last access (for LRU eviction). */
  lastAccessed: number;
  /** How many times this entry has been served from cache. */
  hits: number;
  /** Canonical slide type if detected, else null. */
  slideType: string | null;
}

const MAX_CACHE_SIZE = 20;

/** Module-level cache — session-scoped, resets on page reload. */
const _cache = new Map<string, CacheEntry>();

/** Evict the least-recently-used entry to stay within MAX_CACHE_SIZE. */
function evictLRU(): void {
  if (_cache.size < MAX_CACHE_SIZE) return;
  let oldestKey = "";
  let oldestTime = Infinity;
  for (const [key, entry] of _cache) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }
  if (oldestKey) _cache.delete(oldestKey);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a cached structural layout for the given prompt.
 * Returns null on cache miss.
 */
export function getCachedLayout(prompt: string): string | null {
  const key = hashPrompt(prompt);
  const entry = _cache.get(key);
  if (!entry) return null;
  // LRU update
  entry.lastAccessed = Date.now();
  entry.hits++;
  return entry.layout;
}

/**
 * Store a structural layout for the given prompt.
 * Evicts the LRU entry if the cache is full.
 */
export function setCachedLayout(prompt: string, layout: string): void {
  evictLRU();
  const key = hashPrompt(prompt);
  _cache.set(key, {
    layout,
    lastAccessed: Date.now(),
    hits: 0,
    slideType: detectSlideType(prompt),
  });
}

/**
 * Look up a cached layout by detected slide type (broader match).
 * Useful when the exact prompt doesn't match but the slide type does.
 * Returns the most-recently-accessed entry for that type.
 */
export function getCachedLayoutByType(slideType: string): string | null {
  let best: CacheEntry | null = null;
  for (const entry of _cache.values()) {
    if (entry.slideType === slideType) {
      if (!best || entry.lastAccessed > best.lastAccessed) {
        best = entry;
      }
    }
  }
  if (!best) return null;
  best.lastAccessed = Date.now();
  best.hits++;
  return best.layout;
}

/** Clear the entire cache (e.g., on session reset or new deck creation). */
export function clearSemanticCache(): void {
  _cache.clear();
}

/** Stats for debugging / telemetry. */
export function getCacheStats(): {
  size: number;
  totalHits: number;
  entries: Array<{ key: string; slideType: string | null; hits: number }>;
} {
  const entries: Array<{ key: string; slideType: string | null; hits: number }> = [];
  let totalHits = 0;
  for (const [key, entry] of _cache) {
    entries.push({ key, slideType: entry.slideType, hits: entry.hits });
    totalHits += entry.hits;
  }
  return { size: _cache.size, totalHits, entries };
}
