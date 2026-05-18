# Power User Editing — Design Spec

**Date:** 2026-04-22  
**Cluster:** A — Power User Editing  
**Features:** Slide Navigator · Single-Slide AI Regeneration · Custom Theme Builder

---

## 1. Slide Navigator

### What it does

A numbered pill strip rendered below the canvas preview that shows one pill per slide (e.g. 1 2 3 4 … N). Clicking a pill jumps the presentation to that slide. The active pill is highlighted. Navigator appears only when `totalSlides > 1`.

### Architecture

**BroadcastChannel message: `SLIDI_GOTO_SLIDE`**

```ts
// sender (navigator pill click)
bc.postMessage({ type: "SLIDI_GOTO_SLIDE", target: 3 }); // 0-indexed

// receiver — SrcdocPreview.tsx, inside bc.onmessage
if (msg.type === "SLIDI_GOTO_SLIDE") {
  // The AI-generated code owns slide state internally.
  // We simulate arrow key presses relative to currentSlide.
  const delta = msg.target - currentSlide;
  const key = delta > 0 ? "ArrowRight" : "ArrowLeft";
  for (let i = 0; i < Math.abs(delta); i++) {
    iframeEl.contentDocument?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }
}
```

**Component: `SlideNavigator.tsx`**

- Receives `currentSlide` and `totalSlides` from store (no props drilling — reads store directly)
- Renders a horizontally scrollable row of `totalSlides` pills
- Pills cap at 20 visible; if `totalSlides > 20`, render `…` overflow indicator (no scroll needed for typical decks)
- Click handler calls `useSlidiStore.getState().broadcastGoto(target)` — a new store action

**Store addition:**

```ts
broadcastGoto: (target: number) => {
  const bc = new BroadcastChannel("SLIDI_STATE_SYNC");
  bc.postMessage({ type: "SLIDI_GOTO_SLIDE", target });
  bc.close();
};
```

### Placement

`SlideNavigator` sits inside `CanvasPane`, below the preview wrapper div, outside the padded container — so it always occupies the bottom strip of the canvas section. Hidden when `totalSlides <= 1` or `isGenerating`.

### Styling

Pills: `w-7 h-7 rounded-full text-[11px] font-black`. Active: `bg-slate-900 text-white`. Inactive: `bg-slate-200 text-slate-500 hover:bg-slate-300`. Strip: `flex gap-1.5 justify-center py-2 px-4 bg-white/60 backdrop-blur-sm border-t border-slate-100`.

---

## 2. Single-Slide AI Regeneration

### What it does

A "Regenerate this slide" button appears on the canvas when hovering over a multi-slide deck. Clicking it pre-fills the chat input with a targeted prompt scoped to the current slide — the user can edit and send, or send immediately. This is a UX shortcut, not a new AI call path; the full deck is always returned.

### Why this approach

The AI always returns the complete component. We cannot ask for a single slide in isolation because the generated code is one monolithic React component. Instead we craft a prompt that tells the AI exactly which slide to change, preserving all others. This is the safest approach — no partial-code stitching, no new API surface.

### Implementation

**Prompt template (injected into chat input):**

```
Regenerate only slide ${currentSlide + 1} of ${totalSlides}. Keep all other slides exactly as-is. [describe the change]
```

User sees the template pre-filled and can add their specific instructions after the colon.

**Button placement:**

In `CanvasPane`, add a floating action row above the slide counter in the bottom-right corner — only shown in `activeView === "preview"` and `totalSlides > 1`:

```tsx
<button
  onClick={() => {
    const prompt = `Regenerate only slide ${currentSlide + 1} of ${totalSlides}. Keep all other slides exactly as-is. `;
    setPendingEditContext(prompt);
    // open chat pane if collapsed (mobile)
  }}
  className="absolute bottom-10 right-3 ..."
>
  <RefreshCw className="w-3 h-3" /> Regen slide
</button>
```

`setPendingEditContext` already exists in the store and pre-fills the chat input. No new store fields needed.

### ChatPane changes

None — `pendingEditContext` already pre-fills the textarea. The existing `skipPlanning` logic (skips planning when `generatedCode` exists) applies naturally.

---

## 3. Custom Theme Builder

### What it does

A color picker panel that lets users define a custom color palette — background, text, accent, subtext, divider — and save it as the "Custom" theme. Once saved, it persists to localStorage and appears alongside the built-in themes in the theme picker.

### Data model

New `ThemeId`: `"custom"` — added to the union type.

Custom palette stored in localStorage under key `slidi_custom_theme`:

```ts
interface CustomPalette {
  bg: string;        // hex
  text: string;
  accent: string;
  subtext: string;
  divider: string;
  bullet1: string;
  bullet2: string;
}
```

`THEME_STYLES` map extended at runtime: on app load, if `slidi_custom_theme` exists in localStorage, merge it into the `THEME_STYLES` object under key `"custom"`. The `label` field is `"Custom"`.

### UI — ThemeCustomizer panel

**Access:** A small paint-brush icon button next to the theme picker in `Header.tsx`. Clicking it opens `ThemeCustomizer` as a side panel (same pattern as the existing theme picker flyout).

**Layout:**

```
┌─ Custom Theme ──────────────────────────────┐
│  Background  [████] #1A1A2E                 │
│  Text        [████] #E2E2E2                 │
│  Accent      [████] #7C3AED                 │
│  Subtext     [████] #9CA3AF                 │
│  Divider     [████] #374151                 │
│                                             │
│  [Live preview swatch]                      │
│                                             │
│  [Save as Custom Theme]  [Reset to Default] │
└─────────────────────────────────────────────┘
```

Each row: `<input type="color">` + hex text field. Both are kept in sync (hex input → color picker and vice versa).

**Live preview swatch:** A miniature slide mockup (same as `GeneratingSkeleton` but small, 120×70px, static) that re-renders on every color change using the in-progress palette.

**Save action:**

1. Write palette to `localStorage` under `slidi_custom_theme`
2. Merge into `THEME_STYLES["custom"]`
3. Call `setTheme("custom")` on the store
4. Close the customizer panel

**Reset:** Removes `slidi_custom_theme` from localStorage; if current theme is `"custom"`, switches to `"minimal"`.

### Files touched

- `src/lib/themes.ts` — add `"custom"` to `ThemeId`; add `loadCustomTheme()` called from store init
- `src/store/slidiStore.ts` — `ThemeId` union extended; no new actions needed
- `src/components/ThemeCustomizer.tsx` — new component (~150 lines)
- `src/components/Header.tsx` — paint-brush button + panel toggle state

---

## Error Handling

- **Slide navigator with malformed total:** `totalSlides` comes from `sl_slide_change` event emitted by AI-generated code. If it's 0 or NaN, navigator hides (same `totalSlides > 1` guard).
- **Custom theme missing fields:** On load, merge with `THEME_STYLES["minimal"]` as fallback for any missing keys.
- **`SLIDI_GOTO_SLIDE` race condition:** If `currentSlide` read by navigator is stale vs. the iframe, the delta-based approach may overshoot. Acceptable — user can click again. A future improvement could confirm slide change via `sl_slide_change` ack.

---

## Testing

- Unit: `extractSessionName` already tested. No new pure functions need unit tests for this cluster.
- Manual: start dev server, generate a 5-slide deck, verify navigator appears and jump works; verify regen prompt pre-fills correctly; verify custom theme persists on reload.
- Existing 133 tests must continue to pass unchanged.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/components/SlideNavigator.tsx` |
| Create | `src/components/ThemeCustomizer.tsx` |
| Modify | `src/components/CanvasPane.tsx` — add navigator + regen button |
| Modify | `src/components/Header.tsx` — add customizer toggle |
| Modify | `src/store/slidiStore.ts` — add `broadcastGoto`, extend `ThemeId` |
| Modify | `src/lib/themes.ts` — add `"custom"` ThemeId, `loadCustomTheme()` |
| Modify | `src/components/SrcdocPreview.tsx` — handle `SLIDI_GOTO_SLIDE` |
