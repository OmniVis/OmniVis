# Visual Editor Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing inline-textarea inspect mode with accurate element selection (ring drawn inside the iframe), a floating toolbar with Replace/AI Edit/More actions, and dedicated property panels for icons (Material Symbols picker), images (URL + fit + alt), and links (href + text + new-tab) — with direct JSX patching for all three.

**Architecture:** An injected inspector script inside the srcdoc iframe detects icon (`span.material-symbols-rounded`), image, and link clicks, draws a CSS selection ring in-iframe, and posts a rich `sl-element-select` message to the parent. `SandpackCanvas` receives this and calls `setSelectedElement` on the store. `CanvasPane` reads `selectedElement` from the store and renders a fixed-position `ElementToolbar` above the element; clicking "More" opens a `PropertiesPanel` overlay. Simple edits (icon name, image src/fit/alt, link href/text/target) patch the JSX string directly via `patchJsx.ts`; complex changes escalate to AI.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, lucide-react (for toolbar UI icons only), Material Symbols Rounded (for slide icons), vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/sanitizeUrl.ts` | Create | URL allow-list validation for image + link inputs |
| `src/lib/patchJsx.ts` | Create | Direct JSX string patching (icon, img src/fit/alt, link href/text/target) |
| `src/store/slidiStore.ts` | Modify | Add `selectedElement` state + `setSelectedElement` |
| `src/components/SrcdocPreview.tsx` | Modify | Replace inspector script: hover ring, `sl-element-select`, preserve text editing path |
| `src/components/SandpackCanvas.tsx` | Modify | Handle `sl-element-select` message → call `setSelectedElement` |
| `src/components/ElementToolbar.tsx` | Create | Floating toolbar: Replace / AI Edit / More buttons |
| `src/components/PropertiesPanel.tsx` | Create | Sliding overlay shell — renders icon/image/link sub-panel |
| `src/components/panels/IconPanel.tsx` | Create | Material Symbols search grid + custom image URL input |
| `src/components/panels/ImagePanel.tsx` | Create | Image URL input, object-fit selector, alt text |
| `src/components/panels/LinkPanel.tsx` | Create | Href input, link text, new-tab toggle |
| `src/components/CanvasPane.tsx` | Modify | Track slide scale + box position, render ElementToolbar + PropertiesPanel |
| `src/__tests__/sanitizeUrl.test.ts` | Create | Unit tests for sanitizeUrl |
| `src/__tests__/patchJsx.test.ts` | Create | Unit tests for patchJsx helpers |

---

## Task 1: `src/lib/sanitizeUrl.ts`

**Files:**
- Create: `src/lib/sanitizeUrl.ts`
- Test: `src/__tests__/sanitizeUrl.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/sanitizeUrl.test.ts
import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

describe("sanitizeUrl — image context", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com/img.png", "image")).toEqual({
      valid: true, url: "https://example.com/img.png", warning: undefined,
    });
  });
  it("accepts http URLs with a warning", () => {
    const r = sanitizeUrl("http://example.com/img.png", "image");
    expect(r.valid).toBe(true);
    expect(r.warning).toMatch(/Non-HTTPS/i);
  });
  it("rejects javascript: scheme", () => {
    expect(sanitizeUrl("javascript:alert(1)", "image").valid).toBe(false);
  });
  it("rejects javascript: with leading whitespace", () => {
    expect(sanitizeUrl("  javascript:alert(1)", "image").valid).toBe(false);
  });
  it("rejects URL-encoded javascript:", () => {
    expect(sanitizeUrl("javascript%3aalert(1)", "image").valid).toBe(false);
  });
  it("rejects data: URIs", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>", "image").valid).toBe(false);
  });
  it("rejects vbscript: scheme", () => {
    expect(sanitizeUrl("vbscript:msgbox(1)", "image").valid).toBe(false);
  });
  it("rejects file: scheme", () => {
    expect(sanitizeUrl("file:///etc/passwd", "image").valid).toBe(false);
  });
  it("rejects bare relative paths", () => {
    expect(sanitizeUrl("/relative/path.png", "image").valid).toBe(false);
  });
});

describe("sanitizeUrl — link context", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com", "link").valid).toBe(true);
  });
  it("accepts http URLs", () => {
    expect(sanitizeUrl("http://example.com", "link").valid).toBe(true);
  });
  it("accepts mailto: URLs", () => {
    expect(sanitizeUrl("mailto:user@example.com", "link").valid).toBe(true);
  });
  it("rejects javascript: in link context", () => {
    expect(sanitizeUrl("javascript:void(0)", "link").valid).toBe(false);
  });
  it("trims leading/trailing whitespace before checking", () => {
    expect(sanitizeUrl("  https://example.com  ", "link")).toEqual({
      valid: true, url: "https://example.com", warning: undefined,
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/sanitizeUrl.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/sanitizeUrl'"

- [ ] **Step 3: Implement `sanitizeUrl.ts`**

```ts
// src/lib/sanitizeUrl.ts
export type UrlContext = "image" | "link";

export interface SanitizeResult {
  valid: boolean;
  url: string;
  warning?: string;
}

const BLOCKED_SCHEMES = ["javascript", "data", "vbscript", "file"];

export function sanitizeUrl(raw: string, context: UrlContext): SanitizeResult {
  const trimmed = raw.trim();
  // Strip whitespace and control chars before scheme-checking to catch `  javascript:` tricks
  const normalised = trimmed.replace(/[\s\u0000-\u001F]/g, "").toLowerCase();

  for (const scheme of BLOCKED_SCHEMES) {
    if (
      normalised.startsWith(scheme + ":") ||
      normalised.startsWith(scheme + "%3a")
    ) {
      return { valid: false, url: "", warning: `"${scheme}:" URLs are not allowed.` };
    }
  }

  if (context === "image") {
    if (trimmed.startsWith("https://")) return { valid: true, url: trimmed };
    if (trimmed.startsWith("http://")) {
      return { valid: true, url: trimmed, warning: "Non-HTTPS URL — may be blocked by some browsers." };
    }
    return { valid: false, url: "", warning: "Image URLs must start with https:// or http://" };
  }

  // link context
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return { valid: true, url: trimmed };
  }
  if (trimmed.startsWith("mailto:")) return { valid: true, url: trimmed };
  return { valid: false, url: "", warning: 'Link URLs must start with https://, http://, or mailto:' };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/sanitizeUrl.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sanitizeUrl.ts src/__tests__/sanitizeUrl.test.ts
git commit -m "feat(editor): add URL sanitization utility"
```

---

## Task 2: `src/lib/patchJsx.ts`

**Files:**
- Create: `src/lib/patchJsx.ts`
- Test: `src/__tests__/patchJsx.test.ts`

Icons in Slidi slides are rendered as `<span class="material-symbols-rounded">star</span>`. The icon name is the text content. The `currentValue` the inspector sends is that text content.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/patchJsx.test.ts
import { describe, it, expect } from "vitest";
import {
  patchIconInCode,
  patchImageSrc,
  patchImageFit,
  patchImageAlt,
  patchLinkHref,
  patchLinkText,
  patchLinkTarget,
} from "@/lib/patchJsx";

// Minimal slide wrapper matching the format extractSlideBlock expects
function wrapSlide(inner: string, idx = 0) {
  return `export default function Presentation() {
  const [current, setCurrent] = React.useState(0);
  return (
    <div>
      {current === ${idx} && (
        <div key={current}>
          ${inner}
        </div>
      )}
    </div>
  );
}`;
}

describe("patchIconInCode", () => {
  it("replaces a material symbol text node", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    const result = patchIconInCode(code, 0, "star", "rocket_launch");
    expect(result).not.toBeNull();
    expect(result).toContain(">rocket_launch<");
    expect(result).not.toContain(">star<");
  });
  it("returns null when old name is not found", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    expect(patchIconInCode(code, 0, "heart", "star")).toBeNull();
  });
  it("rejects newName with < > characters (injection guard)", () => {
    const code = wrapSlide(`<span className="material-symbols-rounded">star</span>`);
    expect(patchIconInCode(code, 0, "star", '<script>alert(1)</script>')).toBeNull();
  });
});

describe("patchImageSrc", () => {
  it("replaces src attribute value", () => {
    const code = wrapSlide(`<img src="https://old.com/a.jpg" alt="old" />`);
    const result = patchImageSrc(code, 0, "https://old.com/a.jpg", "https://new.com/b.jpg");
    expect(result).toContain('src="https://new.com/b.jpg"');
    expect(result).not.toContain("https://old.com/a.jpg");
  });
});

describe("patchImageFit", () => {
  it("replaces objectFit value", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" style={{objectFit:'cover'}} />`);
    const result = patchImageFit(code, 0, "https://x.com/a.jpg", "contain");
    expect(result).toContain("objectFit:'contain'");
  });
  it("inserts objectFit when style has no objectFit", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" style={{width:'100%'}} />`);
    const result = patchImageFit(code, 0, "https://x.com/a.jpg", "fill");
    expect(result).toContain("objectFit:'fill'");
  });
});

describe("patchImageAlt", () => {
  it("replaces existing alt attribute", () => {
    const code = wrapSlide(`<img src="https://x.com/a.jpg" alt="old alt" />`);
    const result = patchImageAlt(code, 0, "https://x.com/a.jpg", "new alt text");
    expect(result).toContain('alt="new alt text"');
  });
});

describe("patchLinkHref", () => {
  it("replaces href value", () => {
    const code = wrapSlide(`<a href="https://old.com">Click</a>`);
    const result = patchLinkHref(code, 0, "https://old.com", "https://new.com");
    expect(result).toContain('href="https://new.com"');
  });
});

describe("patchLinkText", () => {
  it("replaces link text content", () => {
    const code = wrapSlide(`<a href="https://x.com">Old text</a>`);
    const result = patchLinkText(code, 0, "https://x.com", "New text");
    expect(result).toContain(">New text<");
  });
});

describe("patchLinkTarget", () => {
  it("adds target and rel when enabling new-tab", () => {
    const code = wrapSlide(`<a href="https://x.com">Link</a>`);
    const result = patchLinkTarget(code, 0, "https://x.com", true);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });
  it("removes target and rel when disabling new-tab", () => {
    const code = wrapSlide(`<a href="https://x.com" target="_blank" rel="noopener noreferrer">Link</a>`);
    const result = patchLinkTarget(code, 0, "https://x.com", false);
    expect(result).not.toContain('target="_blank"');
    expect(result).not.toContain('rel="noopener noreferrer"');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/patchJsx.test.ts
```
Expected: FAIL with "Cannot find module '@/lib/patchJsx'"

- [ ] **Step 3: Implement `patchJsx.ts`**

```ts
// src/lib/patchJsx.ts
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
  return patchInSlide(code, slideIndex, (block) => {
    const escaped = escRe(oldName.trim());
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
    return block.replace(re, `$1${newSrc}$2`);
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
    // Check the img tag containing this src is present
    const imgTagRe = new RegExp(`<img[^>]*${srcEsc}[^>]*>`, "s");
    if (!imgTagRe.test(block)) return null;
    // Replace existing objectFit value
    let patched = block.replace(
      /objectFit\s*:\s*['"][^'"]*['"]/g,
      `objectFit:'${newFit}'`
    );
    // If no objectFit found, insert it into the style object that's on the same img tag
    if (patched === block) {
      patched = block.replace(
        new RegExp(`(src=["']${srcEsc}["'][^>]*style=\\{\\{)([^}]*)\\}\\}`),
        `$1$2,objectFit:'${newFit}'}}`
      );
    }
    return patched === block ? null : patched;
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
    // Replace existing alt
    let patched = block.replace(
      new RegExp(`(alt=["'])[^'"]*(['"])([^>]*${srcEsc}|${srcEsc}[^>]*)`),
      `$1${safeAlt}$2$3`
    );
    if (patched !== block) return patched;
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
    return block.replace(re, `$1${newHref}$2`);
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/patchJsx.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/patchJsx.ts src/__tests__/patchJsx.test.ts
git commit -m "feat(editor): add direct JSX patching utilities"
```

---

## Task 3: Store — Add `selectedElement` state

**Files:**
- Modify: `src/store/slidiStore.ts`

- [ ] **Step 1: Add the `SelectedElement` type and state fields**

Find the `interface SlidiState {` block (around line 90) and add after `pendingEditContext` and `setPendingEditContext`:

```ts
// In the SelectedElement type — add near the top of the file, after the Branding interface
export interface SelectedElement {
  elementType: "icon" | "image" | "link" | "text" | "generic";
  currentValue: string;  // icon name, src URL, href, or text content
  rect: { top: number; left: number; width: number; height: number };
  tagName: string;
  xpath: string;
}
```

In `interface SlidiState`, after `setPendingEditContext`:
```ts
selectedElement: SelectedElement | null;
setSelectedElement: (el: SelectedElement | null) => void;
```

- [ ] **Step 2: Add the initial state and implementation**

In the `create<SlidiState>()(...)` call, after the `pendingEditContext: null` initial value (around line 562):
```ts
selectedElement: null,
setSelectedElement: (el) => set({ selectedElement: el }),
```

There are also reset blocks inside the store (around lines 741, 777, 850) where `inspectMode: false` and `pendingEditContext: null` appear. Add to each:
```ts
selectedElement: null,
```

- [ ] **Step 3: Run the full test suite to make sure nothing broke**

```bash
npm test -- --run
```
Expected: all existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/store/slidiStore.ts
git commit -m "feat(editor): add selectedElement state to store"
```

---

## Task 4: Replace inspector script in `SrcdocPreview.tsx`

**Files:**
- Modify: `src/components/SrcdocPreview.tsx`

The existing inspector script (the `/* Inline Visual Editing */` block, approximately lines 554–665) handles hover highlight + inline textarea editing. We replace it with a new script that:
- Keeps hover highlight (`__sl_hover` class)
- Replaces click behaviour: for icon/image/link elements, post `sl-element-select` and draw a selection ring; for all other elements, keep the existing textarea path
- Adds `__sl_selected` CSS class for the selection ring
- Adds Escape key to deselect

- [ ] **Step 1: Add the `__sl_selected` CSS to the `<style>` block in `buildSrcdoc`**

Locate the `<style>` block in `buildSrcdoc` (near line 215 where `.__sl_hover` is likely defined). Find `.__sl_hover` styles and add after them:

```css
.__sl_selected {
  outline: 2px solid #6c63ff !important;
  outline-offset: 3px !important;
  position: relative !important;
}
.__sl_selected::after {
  content: attr(data-sl-type);
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: #6c63ff;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 99999;
}
```

- [ ] **Step 2: Replace the `/* Inline Visual Editing */` script block**

Locate the block that starts with:
```js
<script>
  /* Inline Visual Editing — Direct on-canvas capture. */
  (function() {
```
and ends with the closing `})();` + `</script>` of that IIFE.

Replace the entire block with:

```js
  <script>
  /* Inline Visual Editing v2 — element-select + selection ring. */
  (function() {
    var active = false;
    var selected = null; // currently selected DOM element

    function clearHover() {
      document.querySelectorAll('.__sl_hover').forEach(function(n) {
        n.classList.remove('__sl_hover');
      });
    }

    function clearSelected() {
      if (selected) {
        selected.classList.remove('__sl_selected');
        selected.removeAttribute('data-sl-type');
        selected = null;
      }
    }

    /** Walk up from el to find the most specific editable target. */
    function findTarget(el) {
      // Priority 1: material symbols icon
      var cursor = el;
      while (cursor && cursor !== document.body) {
        if (cursor.classList && cursor.classList.contains('material-symbols-rounded')) {
          return { el: cursor, type: 'icon' };
        }
        cursor = cursor.parentElement;
      }
      // Priority 2: img
      cursor = el;
      while (cursor && cursor !== document.body) {
        if (cursor.tagName === 'IMG') return { el: cursor, type: 'image' };
        cursor = cursor.parentElement;
      }
      // Priority 3: anchor with href
      cursor = el;
      while (cursor && cursor !== document.body) {
        if (cursor.tagName === 'A' && cursor.getAttribute('href')) {
          return { el: cursor, type: 'link' };
        }
        cursor = cursor.parentElement;
      }
      // Fallback: text editing path
      return { el: el, type: 'text' };
    }

    function getXPath(el) {
      if (!el || el === document.body) return '/body';
      var parts = [];
      var node = el;
      while (node && node.nodeType === 1 && node !== document.documentElement) {
        var tag = node.tagName.toLowerCase();
        var idx = 1;
        var sib = node.previousElementSibling;
        while (sib) { if (sib.tagName === node.tagName) idx++; sib = sib.previousElementSibling; }
        parts.unshift(tag + '[' + idx + ']');
        node = node.parentElement;
      }
      return '/' + parts.join('/');
    }

    function getCurrentValue(el, type) {
      if (type === 'icon') return (el.textContent || '').trim();
      if (type === 'image') return el.getAttribute('src') || '';
      if (type === 'link') return el.getAttribute('href') || '';
      return (el.textContent || '').trim();
    }

    window.addEventListener('message', function(e) {
      if (!e.data) return;
      if (e.data.type === 'sl-inspect-mode') {
        active = !!e.data.value;
        document.body.style.cursor = active ? 'crosshair' : '';
        if (!active) { clearHover(); clearSelected(); }
      }
      if (e.data.type === 'sl-deselect') { clearSelected(); }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && active) {
        clearSelected();
        window.parent.postMessage({ type: 'sl-element-deselect' }, '*');
      }
    });

    document.addEventListener('mouseover', function(e) {
      if (!active) return;
      clearHover();
      e.target.classList.add('__sl_hover');
    }, true);

    document.addEventListener('click', function(e) {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      clearSelected();

      var hit = findTarget(e.target);
      var el = hit.el;
      var type = hit.type;

      if (type === 'text') {
        // Keep existing inline textarea behaviour for text
        var originalText = (el.textContent || '').trim();
        var rect = el.getBoundingClientRect();
        var style = window.getComputedStyle(el);
        var editor = document.createElement('textarea');
        editor.value = originalText;
        editor.style.cssText = [
          'position:fixed',
          'top:' + rect.top + 'px',
          'left:' + rect.left + 'px',
          'width:' + rect.width + 'px',
          'min-height:' + rect.height + 'px',
          'z-index:100000',
          'background:white',
          'color:black',
          'border:2px solid var(--sl-accent)',
          'padding:' + style.padding,
          'font-size:' + style.fontSize,
          'font-weight:' + style.fontWeight,
          'font-family:' + style.fontFamily,
          'line-height:' + style.lineHeight,
          'text-align:' + style.textAlign,
          'box-shadow:0 10px 25px rgba(0,0,0,0.15)',
          'outline:none',
          'resize:none',
          'border-radius:4px',
        ].join(';');
        document.body.appendChild(editor);
        editor.focus();
        editor.setSelectionRange(originalText.length, originalText.length);

        function commit() {
          var newText = editor.value.trim();
          if (newText && newText !== originalText) {
            window.parent.postMessage({
              type: 'sl-commit-visual-edit',
              tagName: el.tagName.toLowerCase(),
              oldText: originalText,
              newText: newText,
            }, '*');
          }
          document.body.removeChild(editor);
          active = false;
          document.body.style.cursor = '';
          clearHover();
        }

        editor.addEventListener('blur', commit);
        editor.addEventListener('keydown', function(evt) {
          if (evt.key === 'Enter' && !evt.shiftKey) { evt.preventDefault(); commit(); }
          if (evt.key === 'Escape') { document.body.removeChild(editor); }
        });
        return;
      }

      // icon / image / link — draw selection ring and post metadata
      el.classList.add('__sl_selected');
      el.setAttribute('data-sl-type', type);
      selected = el;

      var r = el.getBoundingClientRect();
      window.parent.postMessage({
        type: 'sl-element-select',
        elementType: type,
        currentValue: getCurrentValue(el, type),
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        tagName: el.tagName.toLowerCase(),
        xpath: getXPath(el),
      }, '*');

    }, true);

  })();
  </script>
```

- [ ] **Step 3: Add `onElementSelect` prop to `SrcdocPreview`**

In the props destructure (around line 734):
```ts
export default function SrcdocPreview({
  code,
  theme,
  inspectMode = false,
  branding,
  syncChannel,
  onElementClick,
  onCommitEdit,
  onElementSelect,  // ← add this
  controlledSlide,
}: {
  code: string;
  theme: ThemeId;
  inspectMode?: boolean;
  branding: Branding | null;
  syncChannel?: string;
  controlledSlide?: number;
  onElementClick?: (tagName: string, text: string) => void;
  onCommitEdit?: (tagName: string, oldText: string, newText: string) => void;
  onElementSelect?: (payload: {     // ← add this type
    elementType: "icon" | "image" | "link" | "text" | "generic";
    currentValue: string;
    rect: { top: number; left: number; width: number; height: number };
    tagName: string;
    xpath: string;
  }) => void;
})
```

- [ ] **Step 4: Wire `sl-element-select` in the message handler**

In the `const handler = (e: MessageEvent) =>` block (around line 833), after the `sl-element-click` handler, add:

```ts
if (e.data?.type === "sl-element-select" && onElementSelect) {
  onElementSelect({
    elementType: e.data.elementType,
    currentValue: e.data.currentValue,
    rect: e.data.rect,
    tagName: e.data.tagName,
    xpath: e.data.xpath,
  });
}
if (e.data?.type === "sl-element-deselect") {
  // Clear selectedElement in store — SandpackCanvas will handle this
  onElementSelect?.({
    elementType: "generic",
    currentValue: "",
    rect: { top: 0, left: 0, width: 0, height: 0 },
    tagName: "",
    xpath: "",
  });
}
```

Also update the dependency array of the effect containing `handler` (around line 870) to include `onElementSelect`:
```ts
}, [syncChannel, onElementClick, onCommitEdit, onElementSelect, postToActive]);
```

- [ ] **Step 5: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS (SrcdocPreview changes are runtime-only, not unit-tested here)

- [ ] **Step 6: Commit**

```bash
git add src/components/SrcdocPreview.tsx
git commit -m "feat(editor): inject selection-ring inspector, add sl-element-select"
```

---

## Task 5: `SandpackCanvas.tsx` — forward `onElementSelect` to store

**Files:**
- Modify: `src/components/SandpackCanvas.tsx`

- [ ] **Step 1: Add `onElementSelect` handler in `SandpackCanvas`**

In the `if (activeView === "preview")` block, update the `<SrcdocPreview>` call:

```tsx
<SrcdocPreview
  code={generatedCode}
  theme={theme}
  inspectMode={inspectMode}
  branding={branding}
  syncChannel={currentVersionId || "slidi-editor"}
  onElementSelect={(payload) => {
    if (!payload.currentValue && !payload.xpath) {
      // deselect
      useSlidiStore.getState().setSelectedElement(null);
    } else {
      useSlidiStore.getState().setSelectedElement(payload);
    }
  }}
  onCommitEdit={(tagName, oldText, newText) => {
    const currentCode = useSlidiStore.getState().generatedCode;
    let updatedCode = currentCode;
    const escapedOld = oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const jsxPattern = new RegExp(`>\\s*${escapedOld}\\s*<`, "g");
    const attrPattern = new RegExp(`(["'])${escapedOld}(["'])`, "g");

    if (jsxPattern.test(currentCode)) {
      updatedCode = currentCode.replace(jsxPattern, `>${newText}<`);
    } else if (attrPattern.test(currentCode)) {
      updatedCode = currentCode.replace(attrPattern, `$1${newText}$2`);
    } else {
      updatedCode = currentCode.replace(oldText, newText);
    }

    if (updatedCode !== currentCode) {
      useSlidiStore.getState().pushVersion(updatedCode);
    }
    useSlidiStore.getState().setInspectMode(false);
  }}
/>
```

Also add: when `inspectMode` becomes false, clear the selection:

```tsx
const inspectMode = useSlidiStore((s) => s.inspectMode);
// After the existing inspectMode read, add:
useEffect(() => {
  if (!inspectMode) {
    useSlidiStore.getState().setSelectedElement(null);
  }
}, [inspectMode]);
```

Add the `useEffect` import if not already present.

- [ ] **Step 2: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/SandpackCanvas.tsx
git commit -m "feat(editor): forward sl-element-select to selectedElement store"
```

---

## Task 6: `ElementToolbar.tsx`

**Files:**
- Create: `src/components/ElementToolbar.tsx`

This component renders as a fixed-position toolbar above the selected element. It receives the element's position (already translated to page coordinates by the caller) and the `selectedElement` from the store.

- [ ] **Step 1: Create the component**

```tsx
// src/components/ElementToolbar.tsx
"use client";

import { Upload, Pencil, Menu } from "lucide-react";
import type { SelectedElement } from "@/store/slidiStore";

interface ElementToolbarProps {
  element: SelectedElement;
  /** Page coordinates (fixed) of where to render the toolbar */
  position: { x: number; y: number };
  onReplace: () => void;
  onAiEdit: () => void;
  onMore: () => void;
}

export default function ElementToolbar({
  element,
  position,
  onReplace,
  onAiEdit,
  onMore,
}: ElementToolbarProps) {
  const label =
    element.elementType === "icon"
      ? "Icon"
      : element.elementType === "image"
      ? "Image"
      : element.elementType === "link"
      ? "Link"
      : null;

  if (!label) return null;

  return (
    <div
      className="fixed z-[9999] flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 shadow-2xl"
      style={{ left: position.x, top: position.y, transform: "translateX(-50%)" }}
    >
      <button
        onClick={onReplace}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
        title="Replace"
      >
        <Upload size={13} className="text-slate-300" />
        <span className="text-[9px] text-slate-400 font-medium leading-none">Replace</span>
      </button>

      <div className="w-px h-7 bg-slate-700 mx-0.5" />

      <button
        onClick={onAiEdit}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        title="Edit with AI"
      >
        <Pencil size={13} className="text-slate-300" />
        <span className="text-[9px] text-slate-400 font-medium leading-none">AI Edit</span>
      </button>

      <div className="w-px h-7 bg-slate-700 mx-0.5" />

      <button
        onClick={onMore}
        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
        title="More options"
      >
        <Menu size={13} className="text-violet-400" />
        <span className="text-[9px] text-violet-400 font-medium leading-none">More</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ElementToolbar.tsx
git commit -m "feat(editor): add ElementToolbar floating action bar"
```

---

## Task 7: Property Panels

**Files:**
- Create: `src/components/panels/IconPanel.tsx`
- Create: `src/components/panels/ImagePanel.tsx`
- Create: `src/components/panels/LinkPanel.tsx`

### IconPanel

- [ ] **Step 1: Create `src/components/panels/IconPanel.tsx`**

Material Symbols names are lowercase snake_case strings (e.g., `"star"`, `"rocket_launch"`). The panel shows a searchable grid of common icons plus a custom URL input.

```tsx
// src/components/panels/IconPanel.tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

const ICON_LIST = [
  "star","home","settings","search","close","menu","arrow_forward","arrow_back",
  "check","add","remove","edit","delete","person","group","business","work",
  "school","favorite","share","cloud","phone","email","location_on",
  "calendar_today","schedule","lock","security","visibility","notifications",
  "dashboard","analytics","trending_up","bar_chart","pie_chart","insights",
  "rocket_launch","lightbulb","psychology","flag","trophy","verified","badge",
  "diamond","bolt","wifi","smartphone","laptop","code","storage","api",
  "build","engineering","science","medical_services","fitness_center",
  "restaurant","flight","hotel","shopping_cart","credit_card","payments",
  "attach_money","swap_horiz","sync","refresh","download","upload",
  "open_in_new","link","attach_file","image","photo_library","videocam",
  "music_note","language","translate","accessibility","diversity_3",
  "handshake","support","help","info","warning","error","check_circle",
  "cancel","public","map","explore","nature","water_drop","wb_sunny",
  "dark_mode","palette","format_size","title","text_fields","tag",
  "category","label","folder","description","article","book","chat",
  "forum","send","inbox","drafts","mark_email_read","campaign","speaker",
];

interface IconPanelProps {
  currentValue: string;
  onApply: (newIcon: string) => void;
}

export default function IconPanel({ currentValue, onApply }: IconPanelProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(currentValue);
  const [customUrl, setCustomUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();

  const filtered = query.trim()
    ? ICON_LIST.filter((n) => n.includes(query.trim().toLowerCase()))
    : ICON_LIST;

  function handleApplyIcon() {
    if (selected) onApply(selected);
  }

  function handleApplyUrl() {
    const result = sanitizeUrl(customUrl, "image");
    if (!result.valid) { setUrlError(result.warning); return; }
    setUrlError(undefined);
    onApply(result.url);
  }

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Search icons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none"
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-[220px] pr-1">
        {filtered.map((name) => (
          <button
            key={name}
            title={name}
            onClick={() => setSelected(name)}
            className={`aspect-square flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              selected === name
                ? "bg-violet-600/30 ring-2 ring-violet-500"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            <span
              className="material-symbols-rounded text-slate-300"
              style={{ fontSize: "18px" }}
            >
              {name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-5 text-xs text-slate-600 text-center py-4">No icons found</p>
        )}
      </div>

      {selected && (
        <button
          onClick={handleApplyIcon}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          Apply icon
        </button>
      )}

      <div className="border-t border-slate-700 pt-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Or paste image URL</p>
        <input
          type="url"
          placeholder="https://..."
          value={customUrl}
          onChange={(e) => { setCustomUrl(e.target.value); setUrlError(undefined); }}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-violet-500"
        />
        {urlError && <p className="text-[10px] text-red-400 mt-1">{urlError}</p>}
        <p className="text-[10px] text-slate-600 mt-1">https:// only — no scripts or data URIs</p>
        {customUrl && (
          <button
            onClick={handleApplyUrl}
            className="mt-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Apply URL
          </button>
        )}
      </div>
    </div>
  );
}
```

### ImagePanel

- [ ] **Step 2: Create `src/components/panels/ImagePanel.tsx`**

```tsx
// src/components/panels/ImagePanel.tsx
"use client";

import { useState } from "react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

type Fit = "cover" | "contain" | "fill";

interface ImagePanelProps {
  currentValue: string; // current src
  onApply: (changes: { src?: string; fit?: Fit; alt?: string }) => void;
}

export default function ImagePanel({ currentValue, onApply }: ImagePanelProps) {
  const [src, setSrc] = useState(currentValue);
  const [fit, setFit] = useState<Fit>("cover");
  const [alt, setAlt] = useState("");
  const [srcError, setSrcError] = useState<string | undefined>();
  const [srcWarning, setSrcWarning] = useState<string | undefined>();

  function handleSrcChange(val: string) {
    setSrc(val);
    setSrcError(undefined);
    setSrcWarning(undefined);
    if (val.trim()) {
      const r = sanitizeUrl(val.trim(), "image");
      if (!r.valid) setSrcError(r.warning);
      else if (r.warning) setSrcWarning(r.warning);
    }
  }

  function handleApply() {
    if (src.trim()) {
      const r = sanitizeUrl(src.trim(), "image");
      if (!r.valid) { setSrcError(r.warning); return; }
    }
    onApply({ src: src.trim() || undefined, fit, alt: alt.trim() || undefined });
  }

  const FIT_OPTIONS: Fit[] = ["cover", "contain", "fill"];

  return (
    <div className="flex flex-col gap-4 p-4">
      {currentValue && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden h-20 flex items-center justify-center">
          <img
            src={currentValue}
            alt="current"
            className="max-h-full max-w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Image URL</p>
        <input
          type="url"
          value={src}
          onChange={(e) => handleSrcChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
        />
        {srcError && <p className="text-[10px] text-red-400 mt-1">{srcError}</p>}
        {srcWarning && !srcError && <p className="text-[10px] text-amber-400 mt-1">{srcWarning}</p>}
        {!srcError && !srcWarning && (
          <p className="text-[10px] text-slate-600 mt-1">https:// only · No scripts or data URIs</p>
        )}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Fit</p>
        <div className="flex gap-2">
          {FIT_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFit(f)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize ${
                fit === f
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Alt text</p>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-violet-500"
        />
      </div>

      <button
        onClick={handleApply}
        disabled={!!srcError}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
```

### LinkPanel

- [ ] **Step 3: Create `src/components/panels/LinkPanel.tsx`**

```tsx
// src/components/panels/LinkPanel.tsx
"use client";

import { useState } from "react";
import { ExternalLink, Link } from "lucide-react";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

interface LinkPanelProps {
  currentValue: string; // current href
  currentText?: string;
  onApply: (changes: { href?: string; text?: string; newTab?: boolean }) => void;
}

export default function LinkPanel({ currentValue, currentText = "", onApply }: LinkPanelProps) {
  const [href, setHref] = useState(currentValue);
  const [text, setText] = useState(currentText);
  const [newTab, setNewTab] = useState(false);
  const [hrefError, setHrefError] = useState<string | undefined>();

  function handleHrefChange(val: string) {
    setHref(val);
    setHrefError(undefined);
    if (val.trim()) {
      const r = sanitizeUrl(val.trim(), "link");
      if (!r.valid) setHrefError(r.warning);
    }
  }

  function handleApply() {
    if (href.trim()) {
      const r = sanitizeUrl(href.trim(), "link");
      if (!r.valid) { setHrefError(r.warning); return; }
    }
    onApply({ href: href.trim() || undefined, text: text.trim() || undefined, newTab });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 flex items-center gap-2">
        <Link size={13} className="text-violet-400 shrink-0" />
        <span className="text-xs text-slate-400 truncate">{currentValue || "No link"}</span>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">URL</p>
        <input
          type="url"
          value={href}
          onChange={(e) => handleHrefChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500"
        />
        {hrefError && <p className="text-[10px] text-red-400 mt-1">{hrefError}</p>}
        {!hrefError && (
          <p className="text-[10px] text-slate-600 mt-1">https://, http://, or mailto: only</p>
        )}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Link text</p>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Link label..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-violet-500"
        />
      </div>

      <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ExternalLink size={13} className="text-slate-400" />
          <span className="text-sm text-slate-400">Open in new tab</span>
        </div>
        <button
          onClick={() => setNewTab(!newTab)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            newTab ? "bg-violet-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              newTab ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <button
        onClick={handleApply}
        disabled={!!hrefError}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/panels/IconPanel.tsx src/components/panels/ImagePanel.tsx src/components/panels/LinkPanel.tsx
git commit -m "feat(editor): add Icon, Image, and Link property panels"
```

---

## Task 8: `PropertiesPanel.tsx` — sidebar shell

**Files:**
- Create: `src/components/PropertiesPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/PropertiesPanel.tsx
"use client";

import { X } from "lucide-react";
import IconPanel from "@/components/panels/IconPanel";
import ImagePanel from "@/components/panels/ImagePanel";
import LinkPanel from "@/components/panels/LinkPanel";
import type { SelectedElement } from "@/store/slidiStore";

interface PropertiesPanelProps {
  element: SelectedElement;
  onClose: () => void;
  onApplyIcon: (newValue: string) => void;
  onApplyImage: (changes: { src?: string; fit?: "cover" | "contain" | "fill"; alt?: string }) => void;
  onApplyLink: (changes: { href?: string; text?: string; newTab?: boolean }) => void;
}

const PANEL_TITLE: Record<string, string> = {
  icon: "Icon",
  image: "Image",
  link: "Link",
};

export default function PropertiesPanel({
  element,
  onClose,
  onApplyIcon,
  onApplyImage,
  onApplyLink,
}: PropertiesPanelProps) {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-[9998] w-[240px] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <span className="text-sm font-semibold text-slate-200">
          {PANEL_TITLE[element.elementType] ?? "Element"}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-300"
        >
          <X size={14} />
        </button>
      </div>

      {/* Panel body */}
      <div className="overflow-y-auto max-h-[520px]">
        {element.elementType === "icon" && (
          <IconPanel
            currentValue={element.currentValue}
            onApply={onApplyIcon}
          />
        )}
        {element.elementType === "image" && (
          <ImagePanel
            currentValue={element.currentValue}
            onApply={onApplyImage}
          />
        )}
        {element.elementType === "link" && (
          <LinkPanel
            currentValue={element.currentValue}
            onApply={onApplyLink}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/PropertiesPanel.tsx
git commit -m "feat(editor): add PropertiesPanel sliding sidebar shell"
```

---

## Task 9: Wire everything in `CanvasPane.tsx`

**Files:**
- Modify: `src/components/CanvasPane.tsx`

This is the final wiring task. CanvasPane must:
1. Track the slide scale (same ResizeObserver logic as `SlideBox`) so it can compute toolbar page coordinates from the iframe's element rect
2. Read `selectedElement` from the store
3. Render `<ElementToolbar>` with the correct fixed position
4. Render `<PropertiesPanel>` when `showPanel` is true
5. Call `patchJsx` utilities on Apply, push result to version history, close panel on success or escalate to AI

- [ ] **Step 1: Add scale tracking and imports to CanvasPane**

At the top of `CanvasPane.tsx`, add imports:
```ts
import { useRef, useCallback } from "react";
import ElementToolbar from "@/components/ElementToolbar";
import PropertiesPanel from "@/components/PropertiesPanel";
import {
  patchIconInCode,
  patchImageSrc,
  patchImageFit,
  patchImageAlt,
  patchLinkHref,
  patchLinkText,
  patchLinkTarget,
} from "@/lib/patchJsx";
```

(These are additions — keep all existing imports.)

- [ ] **Step 2: Add state and refs inside `CanvasPaneInner`**

After the existing `const inspectMode = useSlidiStore(...)` line:

```ts
const selectedElement = useSlidiStore((s) => s.selectedElement);
const setSelectedElement = useSlidiStore((s) => s.setSelectedElement);
const generatedCode = useSlidiStore((s) => s.generatedCode);
const currentSlide = useSlidiStore((s) => s.currentSlide);
const pushVersion = useSlidiStore((s) => s.pushVersion);
const setPendingEditContext = useSlidiStore((s) => s.setPendingEditContext);
const setInspectMode = useSlidiStore((s) => s.setInspectMode);

const [showPanel, setShowPanel] = useState(false);
const canvasRef = useRef<HTMLDivElement>(null);
const [slideScale, setSlideScale] = useState(1);

// Track slide scale (mirrors SlideBox ResizeObserver logic)
useEffect(() => {
  const el = canvasRef.current;
  if (!el) return;
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const pad = width < 600 ? 16 : width < 1024 ? 32 : 48;
    setSlideScale(Math.min((width - pad) / 1920, (height - pad) / 1080));
  });
  ro.observe(el);
  return () => ro.disconnect();
}, []);

// Close panel when selection cleared externally (e.g. inspect mode toggled off)
useEffect(() => {
  if (!selectedElement) setShowPanel(false);
}, [selectedElement]);
```

- [ ] **Step 3: Add toolbar position computation helper**

Inside `CanvasPaneInner`, after the state declarations:

```ts
function getToolbarPosition(el: typeof selectedElement) {
  if (!el || !canvasRef.current) return { x: 0, y: 0 };
  const container = canvasRef.current.getBoundingClientRect();
  const boxW = 1920 * slideScale;
  const boxH = 1080 * slideScale;
  const boxLeft = container.left + (container.width - boxW) / 2;
  const boxTop = container.top + (container.height - boxH) / 2;
  const elCenterX = boxLeft + (el.rect.left + el.rect.width / 2) * slideScale;
  const elTop = boxTop + el.rect.top * slideScale;
  return { x: elCenterX, y: Math.max(elTop - 58, container.top + 8) };
}
```

- [ ] **Step 4: Add patch application handlers**

Inside `CanvasPaneInner`, after the position helper:

```ts
function applyPatch(patched: string | null) {
  if (!patched) {
    // Patch failed — escalate to AI by pre-filling chat
    if (selectedElement) {
      setPendingEditContext(
        `Edit the ${selectedElement.elementType}: ${selectedElement.currentValue}`
      );
    }
    setShowPanel(false);
    setSelectedElement(null);
    setInspectMode(false);
    return;
  }
  pushVersion(patched);
  setShowPanel(false);
  setSelectedElement(null);
  setInspectMode(false);
}

const handleApplyIcon = useCallback((newValue: string) => {
  if (!selectedElement) return;
  const patched = patchIconInCode(generatedCode, currentSlide, selectedElement.currentValue, newValue);
  applyPatch(patched);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedElement, generatedCode, currentSlide]);

const handleApplyImage = useCallback((changes: { src?: string; fit?: "cover" | "contain" | "fill"; alt?: string }) => {
  if (!selectedElement) return;
  let code = generatedCode;
  if (changes.src) {
    const p = patchImageSrc(code, currentSlide, selectedElement.currentValue, changes.src);
    if (p) code = p;
  }
  if (changes.fit) {
    const srcToUse = changes.src ?? selectedElement.currentValue;
    const p = patchImageFit(code, currentSlide, srcToUse, changes.fit);
    if (p) code = p;
  }
  if (changes.alt !== undefined) {
    const srcToUse = changes.src ?? selectedElement.currentValue;
    const p = patchImageAlt(code, currentSlide, srcToUse, changes.alt);
    if (p) code = p;
  }
  applyPatch(code !== generatedCode ? code : null);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedElement, generatedCode, currentSlide]);

const handleApplyLink = useCallback((changes: { href?: string; text?: string; newTab?: boolean }) => {
  if (!selectedElement) return;
  let code = generatedCode;
  if (changes.href) {
    const p = patchLinkHref(code, currentSlide, selectedElement.currentValue, changes.href);
    if (p) code = p;
  }
  if (changes.text) {
    const hrefNow = changes.href ?? selectedElement.currentValue;
    const p = patchLinkText(code, currentSlide, hrefNow, changes.text);
    if (p) code = p;
  }
  if (changes.newTab !== undefined) {
    const hrefNow = changes.href ?? selectedElement.currentValue;
    const p = patchLinkTarget(code, currentSlide, hrefNow, changes.newTab);
    if (p) code = p;
  }
  applyPatch(code !== generatedCode ? code : null);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedElement, generatedCode, currentSlide]);
```

- [ ] **Step 5: Add `ref` to the canvas `<section>` and render toolbar/panel**

Find the `<section id="slidi-canvas-area" ...>` opening tag and add `ref={canvasRef}`:
```tsx
<section ref={canvasRef} id="slidi-canvas-area" ...>
```

At the very end of the `<section>`, before the closing `</section>`, add:
```tsx
{/* Floating element toolbar */}
{selectedElement && inspectMode && (
  <ElementToolbar
    element={selectedElement}
    position={getToolbarPosition(selectedElement)}
    onReplace={() => setShowPanel(true)}
    onAiEdit={() => {
      setPendingEditContext(
        `Edit the ${selectedElement.elementType}: ${selectedElement.currentValue}`
      );
      setSelectedElement(null);
      setInspectMode(false);
    }}
    onMore={() => setShowPanel(true)}
  />
)}

{/* Properties panel */}
{selectedElement && showPanel && inspectMode && (
  <PropertiesPanel
    element={selectedElement}
    onClose={() => setShowPanel(false)}
    onApplyIcon={handleApplyIcon}
    onApplyImage={handleApplyImage}
    onApplyLink={handleApplyLink}
  />
)}
```

- [ ] **Step 6: Add missing imports to CanvasPane**

Add `useState, useEffect, useRef, useCallback` to the React import if any are missing. Verify the file compiles:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Fix any type errors before continuing.

- [ ] **Step 7: Run all tests**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/CanvasPane.tsx
git commit -m "feat(editor): wire ElementToolbar + PropertiesPanel into CanvasPane"
```

---

## Task 10: Final integration check + `.gitignore`

- [ ] **Step 1: Check `.gitignore` for `.superpowers/`**

```bash
grep -n ".superpowers" .gitignore
```

If not present, add it:
```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
```

- [ ] **Step 2: Run the full test suite**

```bash
npm test -- --run
```
Expected: all tests PASS

- [ ] **Step 3: Final commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to .gitignore"
```

---

## Done Criteria

- [ ] All unit tests pass (`npm test -- --run`)
- [ ] Clicking a Material Symbol icon in inspect mode draws a selection ring inside the iframe
- [ ] Floating toolbar appears above the selected element with Replace, AI Edit, More buttons
- [ ] Icon picker shows searchable Material Symbols grid; applying a selection patches the slide without an AI call
- [ ] Image panel validates URLs (blocks `javascript:`, `data:`, etc.); applying patches src/fit/alt directly
- [ ] Link panel validates URLs; applying patches href/text/target directly
- [ ] Text elements still use the existing inline textarea editing path
- [ ] Escape key clears the selection
- [ ] Patch failures escalate to AI by pre-filling the chat input
