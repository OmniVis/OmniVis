# Phase 1: Quick Wins & Navigation

**Difficulty:** Easy  
**Focus:** Routing, event handlers, canvas scaling
**Status:** Completed and tested

---

## Task 1 — "New" Button Fix

**Problem:** The New Presentation button is unresponsive.

**Files:**
- `src/components/Header.tsx` — button wiring
- `src/components/SlidiEditor.tsx` — `clearPresentation` handler

**Steps:**
1. Trace the `onNewPresentation` prop from `Header` → `SlidiEditor`
2. Verify `clearPresentation()` in the Zustand store resets all relevant state slices
3. Confirm the button's `onClick` is not accidentally blocked (e.g. `disabled` condition, missing prop thread)
4. Add a router push to `/` after clearing if the user is on a sub-page

**Verification:** Click "New" → canvas clears, chat resets, URL is `/`

---

## Task 2 — Global Logo Navigation

**Problem:** The Slidi logo has no navigation behavior on sub-pages.

**Files:**
- `src/components/Header.tsx` — logo element
- Sub-page headers: `src/app/view/[id]/page.tsx`, `src/app/presenter/page.tsx`

**Steps:**
1. Wrap the logo `<img>` in a Next.js `<Link href="/">` with `replace` semantics
2. On the main editor page (`/`), detect current route with `usePathname()` and disable the click (render as `<span>` or suppress the link) to prevent full reload
3. Apply the same logo + link pattern to the view and presenter page headers for consistency

**Verification:** Logo click on `/view/[id]` → navigates to `/`. Logo on `/` does nothing.

---

## Task 3 — Canvas Resolution Fix

**Problem:** The 16:9 aspect ratio is implemented generically. It should be locked to exactly 1920×1080.

**Files:**
- `src/components/CanvasPane.tsx` — `SlideBox` component
- `src/components/SrcdocPreview.tsx` — iframe and export wrapper styles
- `src/components/SandpackCanvas.tsx` — preview iframe sizing

**Steps:**
1. Remove the generic `aspect-ratio: 16 / 9` CSS approach from `SlideBox`
2. Replace with explicit pixel sizing: render the slide at 1920×1080, then apply a CSS `scale()` transform to fit the container — this is the standard "scale to fit" pattern used by Keynote/Google Slides
3. Compute the scale factor in a `useEffect` that reads the container's client dimensions and sets `transform: scale(${factor})` with `transformOrigin: "top left"`, then offset via `margin`/`translate` to center
4. Apply the same 1920×1080 viewport to the srcdoc body (set `width: 1920px; height: 1080px; transform-origin: top left` inside the iframe, scaled from outside)
5. Update the export wrapper in `buildSrcdoc(forExport=true)` to use the same pixel-scale approach

**Verification:** Slide renders crisply at any viewport width; text and elements don't shift or reflow when resizing the window.
