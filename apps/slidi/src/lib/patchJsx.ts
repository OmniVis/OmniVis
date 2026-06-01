import { extractSlideBlock } from "@/lib/ai/contextManager";

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Run `fn` against the extracted slide block; splice result back into full code. */
function patchInSlide(
  code: string,
  slideIndex: number,
  fn: (block: string) => string | null
): string | null {
  const extracted = extractSlideBlock(code, slideIndex);
  if (!extracted) {
    // Fallback: operate on full code when slide boundary not found (single-slide / renderer)
    const patched = fn(code);
    if (patched === null || patched === code) return null;
    return patched;
  }
  const patched = fn(extracted.block);
  if (patched === null || patched === extracted.block) return null;
  return code.slice(0, extracted.start) + patched + code.slice(extracted.end);
}

/** Sanitise a new icon name — only word chars and underscores allowed (Material Symbols names). */
function safeIconName(name: string): string | null {
  const clean = name.trim();
  if (!/^[\w]+$/.test(clean)) return null;
  return clean;
}

export function patchIconInCode(
  code: string,
  slideIndex: number,
  oldName: string,
  newName: string
): string | null {
  const safe = safeIconName(newName);
  if (!safe) return null;
  const trimmedOld = oldName.trim();

  // ── JSON-based presentation ───────────────────────────────────────────
  if (code.trim().startsWith("{")) {
    try {
      const data = JSON.parse(code) as unknown;
      const state = { done: false };
      const updated = replaceJsonString(data, trimmedOld, safe, state);
      if (!state.done) return null;
      return JSON.stringify(updated, null, 2);
    } catch {
      return null;
    }
  }

  // ── JSX-based presentation ────────────────────────────────────────────
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(trimmedOld);
    // Match >{whitespace?}oldName{whitespace?}< to target text nodes
    const re = new RegExp(`>\\s*${escaped}\\s*<`, "g");
    if (!re.test(block)) return null;
    return block.replace(re, `>${safe}<`);
  });
}

export function patchImageSrc(
  code: string,
  slideIndex: number,
  oldSrc: string,
  newSrc: string
): string | null {
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(oldSrc);
    const re = new RegExp(`(src=["'])${escaped}(["'])`, "g");
    if (!re.test(block)) return null;
    return block.replace(re, (_, q1, q2) => `${q1}${newSrc}${q2}`);
  });
}

export function patchImageFit(
  code: string,
  slideIndex: number,
  imgSrc: string,
  newFit: "cover" | "contain" | "fill"
): string | null {
  return patchInSlide(code, slideIndex, (block) => {
    const srcEsc = escRe(imgSrc);
    const imgTagRe = new RegExp(`(<img[^>]*${srcEsc}[^>]*>)`, "s");
    if (!imgTagRe.test(block)) return null;
    // Scope replacement to the matched img tag only
    let changed = false;
    const patched = block.replace(imgTagRe, (imgTag) => {
      // Replace existing objectFit value
      let updated = imgTag.replace(
        /objectFit\s*:\s*['"][^'"]*['"]/g,
        `objectFit:'${newFit}'`
      );
      if (updated !== imgTag) { changed = true; return updated; }
      // Insert into existing style={{...}}
      updated = imgTag.replace(
        /style=\{\{([^}]*)\}\}/,
        (_, inner) => `style={{${inner},objectFit:'${newFit}'}}`
      );
      if (updated !== imgTag) { changed = true; return updated; }
      return imgTag;
    });
    return changed ? patched : null;
  });
}

export function patchImageAlt(
  code: string,
  slideIndex: number,
  imgSrc: string,
  newAlt: string
): string | null {
  const safeAlt = newAlt.replace(/"/g, "&quot;");
  return patchInSlide(code, slideIndex, (block) => {
    const srcEsc = escRe(imgSrc);
    // Check the img tag is present
    const imgTagRe = new RegExp(`(<img[^>]*${srcEsc}[^>]*>)`, "s");
    if (!imgTagRe.test(block)) return null;
    // Replace existing alt (order-independent — scoped to the matched img tag)
    let changed = false;
    let patched = block.replace(imgTagRe, (imgTag) => {
      const updated = imgTag.replace(/alt=(["'])[^"']*\1/, `alt="${safeAlt}"`);
      if (updated !== imgTag) { changed = true; return updated; }
      return imgTag;
    });
    if (changed) return patched;
    // Insert alt before /> or > on the matching img tag
    patched = block.replace(
      new RegExp(`(<img[^>]*${srcEsc}[^>]*?)(\\/?>)`),
      `$1 alt="${safeAlt}"$2`
    );
    return patched === block ? null : patched;
  });
}

export function patchLinkHref(
  code: string,
  slideIndex: number,
  oldHref: string,
  newHref: string
): string | null {
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(oldHref);
    const re = new RegExp(`(href=["'])${escaped}(["'])`, "g");
    if (!re.test(block)) return null;
    return block.replace(re, (_, q1, q2) => `${q1}${newHref}${q2}`);
  });
}

export function patchLinkText(
  code: string,
  slideIndex: number,
  href: string,
  newText: string
): string | null {
  const safeText = newText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(href);
    // Match <a ...href="X"...>anything</a>
    const re = new RegExp(`(<a[^>]*href=["']${escaped}["'][^>]*>)[^<]*(</a>)`, "g");
    if (!re.test(block)) return null;
    return block.replace(re, `$1${safeText}$2`);
  });
}

/**
 * Walk any JSON-serialisable value and replace the first string that exactly
 * matches `oldVal` with `newVal`. Returns the updated value and sets
 * `state.done = true` when a replacement was made.
 */
function replaceJsonString(
  obj: unknown,
  oldVal: string,
  newVal: string,
  state: { done: boolean }
): unknown {
  if (state.done) return obj;
  if (typeof obj === "string") {
    if (obj === oldVal) { state.done = true; return newVal; }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((v) => replaceJsonString(v, oldVal, newVal, state));
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = replaceJsonString(v, oldVal, newVal, state);
    }
    return result;
  }
  return obj;
}

/**
 * Replace the text content of an element in both JSON and JSX presentations.
 *
 * JSON: walks the JSON tree and replaces the first string value that matches.
 * JSX:  uses the same `>\s*text\s*<` approach as patchIconInCode — reliable
 *       across all tag shapes without needing to parse opening-tag attributes.
 */
export function patchTextInElement(
  code: string,
  slideIndex: number,
  _tagName: string,
  oldText: string,
  newText: string
): string | null {
  const trimmedOld = oldText.trim();

  // ── JSON-based presentation ───────────────────────────────────────────
  if (code.trim().startsWith("{")) {
    try {
      const data = JSON.parse(code) as unknown;
      const state = { done: false };
      const updated = replaceJsonString(data, trimmedOld, newText, state);
      if (!state.done) return null;
      return JSON.stringify(updated, null, 2);
    } catch {
      return null;
    }
  }

  // ── JSX-based presentation ────────────────────────────────────────────
  const safeNew = newText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return patchInSlide(code, slideIndex, (block) => {
    const escapedOld = escRe(trimmedOld);
    // Same pattern as patchIconInCode: match any text node >  text  <
    const re = new RegExp(`>\\s*${escapedOld}\\s*<`, "g");
    if (!re.test(block)) return null;
    return block.replace(re, `>${safeNew}<`);
  });
}

export function patchLinkTarget(
  code: string,
  slideIndex: number,
  href: string,
  newTab: boolean
): string | null {
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(href);
    const anchorRe = new RegExp(`(<a[^>]*href=["']${escaped}["'][^>]*)(>)`, "g");
    if (!anchorRe.test(block)) return null;
    if (newTab) {
      // Add target + rel, remove any existing ones first
      return block.replace(anchorRe, (_, attrs, close) => {
        const cleaned = attrs
          .replace(/\s*target=["'][^"']*["']/g, "")
          .replace(/\s*rel=["'][^"']*["']/g, "");
        return `${cleaned} target="_blank" rel="noopener noreferrer"${close}`;
      });
    } else {
      return block.replace(anchorRe, (_, attrs, close) => {
        const cleaned = attrs
          .replace(/\s*target=["'][^"']*["']/g, "")
          .replace(/\s*rel=["'][^"']*["']/g, "");
        return `${cleaned}${close}`;
      });
    }
  });
}
