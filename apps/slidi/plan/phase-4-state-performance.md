# Phase 4: State Performance

**Difficulty:** Hard  
**Focus:** Deep reactivity and render cycle optimization
**Status:** Completed and tested

---

## Task 1 — Visual Editor Speed

**Problem:** The visual editor lags when updating slide content. Edits don't feel "instant" because the entire presentation state or the entire iframe might be re-rendering on every keystroke.

**Files:**
- `src/store/slidiStore.ts` — state updates
- `src/components/SlidiEditor.tsx` — input handlers
- `src/components/SrcdocPreview.tsx` — iframe rendering logic
- `src/hooks/useDebounce.ts` — **[NEW]** for throttling heavy updates

**Implementation Steps:**
1. **State Isolation:**
   - Refactor the store so that updating a single slide's content doesn't trigger a global re-render of the entire presentation list.
   - Use selectors (if using Zustand) to ensure components only re-render when their specific data slice changes.
2. **Debounced Previews:**
   - Implement a short debounce (e.g., 50ms) for updating the `srcdoc` in the preview iframe during text input.
   - For property changes (colors, sizes), updates should remain near-instant.
3. **Optimized Srcdoc Generation:**
   - Instead of rebuilding the entire HTML string on every change, investigate if only the `<style>` block or the specific `<body>` content can be patched (advanced) or if the generation logic can be made more efficient.
4. **Memoization:**
   - Apply `React.memo` to expensive sub-components like the Slide Navigator and the AI Chat sidebar.

**Verification:** Typing in the editor results in zero perceived lag in the UI, and the preview updates smoothly without flickering or delaying the input.
