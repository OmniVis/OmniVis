# Full-Screen Mode — Design Spec
**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** `src/components/SrcdocPreview.tsx`, `src/__tests__/srcdoc.test.ts`

---

## Problem

Users have no way to present their slides full-screen. The canvas is always constrained by the editor layout and the browser chrome. This affects both the editor view and the shared `/view/:id` page.

---

## Goals

- One-click fullscreen entry from the canvas area (floating hover button)
- Clean exit via visible button inside the fullscreen view or Escape key
- Works identically on the editor and shared view page with zero duplication
- No new files — single component change

---

## Approach

Use `iframe.requestFullscreen()` on the srcdoc iframe element. When the iframe is fullscreened, only content inside it is visible — so the exit button must be injected into the srcdoc HTML (same pattern as existing nav buttons). The React-side floating entry button disappears naturally when fullscreen is active.

---

## Architecture

**Single file changed: `src/components/SrcdocPreview.tsx`**

`SrcdocPreview` is used in both `CanvasPane` (editor) and `ViewerSandpack` (shared view), so one change covers both surfaces.

### React layer (outside iframe)

```tsx
// New state and ref
const iframeRef = useRef<HTMLIFrameElement>(null);
const [isFullscreen, setIsFullscreen] = useState(false);

// Fullscreen change listener
useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener("fullscreenchange", handler);
  return () => document.removeEventListener("fullscreenchange", handler);
}, []);

// Entry button — floating, visible on canvas hover, hidden when fullscreen active
// Uses Tailwind group-hover pattern on the wrapper div
// Icon: Maximize2 (lucide-react)
// Calls: iframeRef.current?.requestFullscreen()
```

The wrapper div gets `className="relative group"`. The button is positioned `absolute bottom-3 right-3` with `opacity-0 group-hover:opacity-100 transition-opacity`. Hidden when `isFullscreen` is true (button is outside fullscreen context anyway, but hiding it prevents layout flicker on exit).

### Inside srcdoc (`buildSrcdoc`)

Two additions to the injected HTML:

**1. CSS — fullscreen exit button visibility:**
```css
#sl-fs-exit { display: none; }
:fullscreen #sl-fs-exit { display: flex; }
:-webkit-full-screen #sl-fs-exit { display: flex; }
```

**2. HTML — exit button (injected alongside existing nav buttons):**
```html
<button id="sl-fs-exit" onclick="document.exitFullscreen()"
  style="position:fixed;top:16px;right:16px;z-index:9999;
         width:36px;height:36px;border-radius:8px;border:none;cursor:pointer;
         background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);
         align-items:center;justify-content:center;color:white;font-size:18px;">
  ✕
</button>
```

---

## Data Flow

```
User hovers canvas
  → React floating button appears (opacity-0 → opacity-100)
  → User clicks Maximize2 button
      → iframeRef.current.requestFullscreen()
      → Browser enters fullscreen
      → document.fullscreenchange fires → setIsFullscreen(true)
      → React button hidden (outside fullscreen context)
      → srcdoc #sl-fs-exit becomes visible (:fullscreen CSS rule)

User clicks ✕ or presses Escape
  → document.exitFullscreen() called (or browser native Escape)
  → document.fullscreenchange fires → setIsFullscreen(false)
  → React floating button visible again on next hover
```

---

## Files Changed

| File | Change |
|---|---|
| `src/components/SrcdocPreview.tsx` | `iframeRef`, `isFullscreen` state, `fullscreenchange` listener, floating entry button, exit button + CSS in `buildSrcdoc` |
| `src/__tests__/srcdoc.test.ts` | 2 new tests: srcdoc contains `:fullscreen` CSS rule, srcdoc contains `sl-fs-exit` button |

---

## Out of Scope

- Presenter Mode (separate feature, separate spec)
- Fullscreen on mobile (browser support varies — native behavior handles it)
- Custom fullscreen animations
