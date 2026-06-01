# Visual Editor Improvements — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

---

## Overview

Improve the Slidi visual editing experience with three interlocking upgrades:

1. **Accurate element selection** — a visible selection ring drawn inside the preview iframe, with smart element targeting
2. **Floating contextual toolbar** — appears above the selected element with quick actions; expands to a full properties sidebar
3. **Contextual property panels** — dedicated editors for icons, images, and links; simple edits bypass AI entirely

---

## 1. Selection System

### Approach: Injected inspector script

A small inspector JS block is injected directly into the srcdoc HTML alongside the existing Babel/React UMD setup. It runs inside the iframe and handles all selection logic.

### Hover behaviour

As the user moves the mouse over the preview in inspect mode, a subtle blue outline follows the "interesting" element under the cursor. The inspector walks up the DOM to find the correct target — skipping anonymous wrappers and containers.

### Element priority ladder

When the user clicks inside a nested area, the inspector picks the most specific editable element in this order:

1. `svg` or any descendant of `svg` → type: `icon`
2. `img` → type: `image`
3. `a` → type: `link`
4. `h1`–`h4` → type: `text`
5. `[data-editable]` → type from attribute
6. Nearest block-level `div` → type: `generic`

Clicking again on an already-selected element drills one level deeper into its children. Escape or clicking the slide background deselects.

### Selection ring

On click, a solid CSS outline is drawn **inside** the iframe around the selected element, with a small type badge (e.g. "Icon", "Image", "Link") appearing below it. The ring is rendered in the inspector CSS injected alongside the srcdoc.

### postMessage payload

The inspector sends a `sl-element-select` message to the parent page:

```ts
{
  type: "sl-element-select",
  elementType: "icon" | "image" | "link" | "text" | "generic",
  currentValue: string,   // icon name, src URL, href, or text content
  rect: { top: number, left: number, width: number, height: number }, // relative to iframe
  tagName: string,
  xpath: string           // for code patching
}
```

The existing `sl-element-click` message is replaced by `sl-element-select` with this richer payload.

---

## 2. Floating Toolbar

### Placement

The parent page listens for `sl-element-select` and positions a floating toolbar div above the selected element using the iframe's bounding rect plus the element's `rect` from the payload. The toolbar is rendered outside the iframe as an absolutely-positioned overlay.

### Toolbar actions (all use Lucide icons — no emojis)

| Action | Icon | Behaviour |
|--------|------|-----------|
| Replace | `Upload` | Opens the relevant property panel (icon picker, image URL, link editor) |
| AI Edit | `Pencil` | Pre-fills the chat input with the element context for freeform AI editing |
| More | `Menu` | Slides open the full properties sidebar |

The toolbar shows only actions relevant to the selected element type. For example, an `icon` element shows Replace, AI Edit, More. An `image` shows Replace, AI Edit, More. A `link` shows Replace, AI Edit, More.

### Dismissal

The toolbar disappears when the user presses Escape, clicks the slide background, or clicks outside the toolbar and iframe.

---

## 3. Properties Sidebar

The sidebar slides in as an overlay panel anchored to the right edge of the canvas pane — it sits on top of the canvas area rather than pushing the layout. It is separate from the StyleSidebar (themes/branding) and closes when the user deselects an element or presses Escape.

### Icon panel

- **Search field** — filters the full Lucide icon set (~1,500 icons) by name as the user types
- **Icon grid** — 5-column grid of matching Lucide icons; currently selected icon is highlighted with a purple border
- **Custom image URL section** — a URL input below the grid, labelled "Or paste image URL"; accepts `https://` only
- **Apply button** — triggers a direct JSX patch (no AI call)

### Image panel

- **Current image preview** — thumbnail of the current `src` value
- **URL input** — editable field showing the current `src`; validated on change
- **Fit selector** — three toggle buttons: Cover (default), Contain, Fill — maps to `object-fit` CSS
- **Alt text input** — sets the `alt` attribute
- **Apply button** — triggers a direct JSX patch

### Link panel

- **URL input** — editable field showing the current `href`
- **Link text input** — editable field for the element's text content
- **Open in new tab toggle** — sets `target="_blank"` and `rel="noopener noreferrer"`
- **Apply button** — triggers a direct JSX patch

---

## 4. Direct Code Patching

Simple edits from the property panels patch the JSX slide code string directly — no AI call, no API cost, near-instant feedback.

### Patched directly (< 50 ms)

- Icon name swap (Lucide component name)
- Image `src` URL
- Image `object-fit` / `objectFit`
- Image `alt` text
- Link `href`
- Link text content
- Link `target` / `rel`

### Goes to AI

- Layout changes
- Style rewrites
- Adding or removing elements
- Anything typed into the chat input
- Toolbar "AI Edit" button (always escalates)

### Patching mechanism

Regex-based string replacement targeting the specific JSX attribute within the current slide block (the existing `spliceSlideBlock` boundary is reused). Values are string-escaped before insertion to prevent JSX injection. The patch result is pushed into the undo history stack identically to AI edits.

---

## 5. URL Safety

Applied on paste/change in all three panels:

**Allowed:**
- `https://` — all panels
- `http://` — image panel only (with a warning banner: "Non-HTTPS image URL — may be blocked by browsers")
- `mailto:` — link panel only

**Blocked (input rejected, error message shown):**
- `javascript:` and any variant with whitespace or URL encoding
- `data:` URIs
- `vbscript:`
- `file:`
- Any scheme not explicitly in the allow-list

**Injection prevention:**
- URL values are run through a `sanitizeUrl(value)` utility before being inserted into JSX
- The utility trims, lowercases for scheme detection, and rejects on any non-allow-listed scheme
- String values inserted into JSX are escaped (`"` → `&quot;`, backticks neutralised)

---

## 6. Files to Create / Modify

| File | Change |
|------|--------|
| `src/components/SrcdocPreview.tsx` | Inject inspector script; replace `sl-element-click` with `sl-element-select`; add hover/selection ring CSS |
| `src/components/CanvasPane.tsx` | Listen for `sl-element-select`; position and render floating toolbar overlay |
| `src/components/ElementToolbar.tsx` | **New** — floating toolbar component; context-aware action buttons |
| `src/components/PropertiesPanel.tsx` | **New** — sliding sidebar shell; renders icon/image/link sub-panels |
| `src/components/panels/IconPanel.tsx` | **New** — Lucide search grid + custom URL input |
| `src/components/panels/ImagePanel.tsx` | **New** — URL input, fit selector, alt text |
| `src/components/panels/LinkPanel.tsx` | **New** — href, link text, new-tab toggle |
| `src/lib/patchJsx.ts` | **New** — direct JSX string patching utilities |
| `src/lib/sanitizeUrl.ts` | **New** — URL validation/sanitisation utility |
| `src/store/slidiStore.ts` | Add `selectedElement` state + `setSelectedElement()` |

---

## 7. Out of Scope

- Text formatting panel (font weight, size, colour) — not selected during design
- Layout / spacing controls — not selected during design
- Multiple icon libraries beyond Lucide — only Lucide + custom URL
- Drag-to-reorder elements
- AST-based patching (deferred — regex patching covers the targeted use cases)
