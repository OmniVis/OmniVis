# Power User Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add slide navigator, single-slide regeneration shortcut, and custom theme builder to the Slidi editor.

**Architecture:** Three independent features. Slide Navigator reads `currentSlide`/`totalSlides` from the Zustand store and broadcasts `SLIDI_GOTO_SLIDE` via BroadcastChannel; `SrcdocPreview` converts it to sequential arrow key dispatches into the iframe. Single-slide regen pre-fills the existing `pendingEditContext` chat input — no new AI path. Custom theme persists a `CustomPalette` object to localStorage and merges into `THEME_STYLES` at runtime under a `"custom"` ThemeId.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Zustand, Tailwind CSS, lucide-react, BroadcastChannel API

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/store/slidiStore.ts` | Add `broadcastGoto` action; extend `ThemeId` union with `"custom"` |
| Modify | `src/lib/themes.ts` | Add `"custom"` entry in `THEMES` and `THEME_STYLES`; add `loadCustomTheme()` and `saveCustomTheme()` helpers |
| Modify | `src/components/SrcdocPreview.tsx` | Handle `SLIDI_GOTO_SLIDE` in `bc.onmessage`; add `"custom"` to `THEME_VARS` |
| Create | `src/components/SlideNavigator.tsx` | Numbered pill strip; broadcasts goto on click |
| Modify | `src/components/CanvasPane.tsx` | Mount `SlideNavigator` below preview; add regen-slide floating button |
| Create | `src/components/ThemeCustomizer.tsx` | Color picker panel with live preview swatch |
| Modify | `src/components/Header.tsx` | Paint-brush button toggles `ThemeCustomizer` panel |
| Modify | `src/components/SlidiEditor.tsx` | Pass `showCustomizer` / `onToggleCustomizer` to Header; mount panel |

---

## Task 1: Extend ThemeId and THEME_STYLES for "custom"

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/lib/themes.ts`

- [ ] **Step 1: Add `"custom"` to ThemeId union in `src/store/slidiStore.ts`**

Open `src/store/slidiStore.ts`. Change line 5:

```ts
// Before
export type ThemeId = "minimal" | "dark" | "corporate" | "cyberpunk" | "modern" | "sunset" | "forest" | "blueprint" | "brutalist";

// After
export type ThemeId = "minimal" | "dark" | "corporate" | "cyberpunk" | "modern" | "sunset" | "forest" | "blueprint" | "brutalist" | "custom";
```

- [ ] **Step 2: Add `CustomPalette` interface and helpers to `src/lib/themes.ts`**

Append to the end of `src/lib/themes.ts`:

```ts
export interface CustomPalette {
  bg: string;
  text: string;
  accent: string;
  subtext: string;
  divider: string;
  bullet1: string;
  bullet2: string;
}

const CUSTOM_THEME_KEY = "slidi_custom_theme";

const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  bg: "#1e1e2e",
  text: "#cdd6f4",
  accent: "#89b4fa",
  subtext: "#a6adc8",
  divider: "#89b4fa",
  bullet1: "#89b4fa",
  bullet2: "#a6adc8",
};

export function loadCustomPalette(): CustomPalette {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_PALETTE;
  try {
    const stored = localStorage.getItem(CUSTOM_THEME_KEY);
    if (stored) return { ...DEFAULT_CUSTOM_PALETTE, ...JSON.parse(stored) };
  } catch {/* ignore */}
  return DEFAULT_CUSTOM_PALETTE;
}

export function saveCustomPalette(palette: CustomPalette): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(palette));
}

export function removeCustomPalette(): void {
  localStorage.removeItem(CUSTOM_THEME_KEY);
}

export function applyCustomTheme(palette: CustomPalette): void {
  THEME_STYLES.custom = {
    bg: palette.bg,
    text: palette.text,
    subtext: palette.subtext,
    accent: palette.accent,
    divider: palette.divider,
    bullet1: palette.bullet1,
    bullet2: palette.bullet2,
  };
}
```

- [ ] **Step 3: Add `"custom"` entry to `THEMES` and `THEME_STYLES` in `src/lib/themes.ts`**

In `THEMES`, before the closing `};`, add:

```ts
  custom: {
    id: "custom",
    label: "Custom",
    systemPromptBlock:
      "STYLE: Custom user-defined palette. " +
      "All slide backgrounds MUST use className=\"bg-sl-bg\" and all primary text MUST use className=\"text-sl-text\". " +
      "Use var(--sl-accent) for highlights, borders, and accents. " +
      "Use var(--sl-sub) for secondary text. " +
      "Apply the user's chosen aesthetic consistently.",
    sandpackTheme: "dark",
  },
```

In `THEME_STYLES`, add a default entry (will be overwritten at runtime by `applyCustomTheme`):

```ts
  custom: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    subtext: "#a6adc8",
    accent: "#89b4fa",
    divider: "#89b4fa",
    bullet1: "#89b4fa",
    bullet2: "#a6adc8",
  },
```

- [ ] **Step 4: Add `"custom"` to `THEME_VARS` in `src/components/SrcdocPreview.tsx`**

In `SrcdocPreview.tsx`, in the `THEME_VARS` object, add after `brutalist`:

```ts
  custom:    "--sl-bg:#1e1e2e;--sl-text:#cdd6f4;--sl-accent:#89b4fa;--sl-sub:#a6adc8;",
```

**Note:** This default is overwritten at runtime because `buildSrcdoc` reads from `THEME_VARS[theme]`, which gets patched by `applyCustomTheme` when `SrcdocPreview` remounts. To make `buildSrcdoc` pick up live custom palette values, change the THEME_VARS line for `custom` to be dynamically generated. Replace the static `THEME_VARS` const with a function:

After the `THEME_VARS` object definition, add a getter function used in `buildSrcdoc`:

```ts
function getThemeVars(theme: ThemeId): string {
  if (theme === "custom") {
    // Read live custom palette from THEME_STYLES (may have been updated by applyCustomTheme)
    const s = THEME_STYLES["custom"];
    return `--sl-bg:${s.bg};--sl-text:${s.text};--sl-accent:${s.accent};--sl-sub:${s.subtext};`;
  }
  return THEME_VARS[theme];
}
```

Then in `buildSrcdoc`, change `const vars = THEME_VARS[theme];` to:

```ts
const vars = getThemeVars(theme);
```

- [ ] **Step 5: Run the test suite to verify nothing broke**

```bash
npm test -- --run
```

Expected: All 133 tests pass. The `"custom"` addition to the union is purely additive.

- [ ] **Step 6: Commit**

```bash
git add src/store/slidiStore.ts src/lib/themes.ts src/components/SrcdocPreview.tsx
git commit -m "feat: add 'custom' ThemeId, palette helpers, and THEME_VARS entry"
```

---

## Task 2: `broadcastGoto` store action + SrcdocPreview GOTO handler

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/components/SrcdocPreview.tsx`

- [ ] **Step 1: Write a failing test for `broadcastGoto`**

In `src/__tests__/store.test.ts`, append:

```ts
describe("slidiStore — broadcastGoto", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [], history: [], historyIndex: -1,
      generatedCode: "", currentVersionId: "", isGenerating: false,
      currentSlide: 2, totalSlides: 5,
    });
  });

  it("broadcastGoto is a callable function", () => {
    expect(typeof useSlidiStore.getState().broadcastGoto).toBe("function");
  });

  it("broadcastGoto does not throw when called", () => {
    expect(() => useSlidiStore.getState().broadcastGoto(3)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: FAIL — `broadcastGoto` is not a function (TypeError).

- [ ] **Step 3: Add `broadcastGoto` to store interface and implementation**

In `src/store/slidiStore.ts`, in the `SlidiState` interface (after the `setTotalSlides` line), add:

```ts
  broadcastGoto: (target: number) => void;
```

In the store implementation (after `setTotalSlides: (n) => set({ totalSlides: n }),`), add:

```ts
  broadcastGoto: (target: number) => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("SLIDI_STATE_SYNC");
    bc.postMessage({ type: "SLIDI_GOTO_SLIDE", target });
    bc.close();
  },
```

- [ ] **Step 4: Handle `SLIDI_GOTO_SLIDE` in `SrcdocPreview.tsx` `bc.onmessage`**

In `SrcdocPreview.tsx`, inside the `bc.onmessage` handler (the `if (e.data.type === "SLIDI_REMOTE_NAV")` block), add a new branch:

```ts
        if (e.data.type === "SLIDI_GOTO_SLIDE") {
          const { currentSlide } = useSlidiStore.getState();
          const target = e.data.target as number;
          const delta = target - currentSlide;
          if (delta === 0) return;
          const direction = delta > 0 ? "next" : "prev";
          const count = Math.abs(delta);
          for (let i = 0; i < count; i++) {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "SLIDI_NAV", direction },
              "*"
            );
          }
        }
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass (including the two new `broadcastGoto` tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/slidiStore.ts src/components/SrcdocPreview.tsx src/__tests__/store.test.ts
git commit -m "feat: add broadcastGoto action and SLIDI_GOTO_SLIDE handler in SrcdocPreview"
```

---

## Task 3: SlideNavigator component

**Files:**
- Create: `src/components/SlideNavigator.tsx`

- [ ] **Step 1: Create `src/components/SlideNavigator.tsx`**

```tsx
"use client";

import { useSlidiStore } from "@/store/slidiStore";

export default function SlideNavigator() {
  const { currentSlide, totalSlides, broadcastGoto } = useSlidiStore();

  if (totalSlides <= 1) return null;

  const MAX_VISIBLE = 20;
  const pills = totalSlides <= MAX_VISIBLE
    ? Array.from({ length: totalSlides }, (_, i) => i)
    : null; // overflow case handled below

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 px-4 bg-white/60 backdrop-blur-sm border-t border-slate-100 shrink-0">
      {pills ? (
        pills.map((i) => (
          <button
            key={i}
            onClick={() => broadcastGoto(i)}
            className={`w-7 h-7 rounded-full text-[11px] font-black transition-colors ${
              i === currentSlide
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-500 hover:bg-slate-300"
            }`}
            title={`Go to slide ${i + 1}`}
          >
            {i + 1}
          </button>
        ))
      ) : (
        <>
          {Array.from({ length: MAX_VISIBLE }, (_, i) => (
            <button
              key={i}
              onClick={() => broadcastGoto(i)}
              className={`w-7 h-7 rounded-full text-[11px] font-black transition-colors ${
                i === currentSlide
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-500 hover:bg-slate-300"
              }`}
              title={`Go to slide ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
          <span className="text-slate-400 text-xs font-bold px-1">
            …{totalSlides - MAX_VISIBLE} more
          </span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount SlideNavigator in CanvasPane**

Open `src/components/CanvasPane.tsx`. Import the component:

```ts
import SlideNavigator from "@/components/SlideNavigator";
```

In the `return` JSX, the outermost `<section>` currently ends with the empty-state block. The navigator must sit as a sibling to the preview content div — i.e., outside the flex-1 preview container but inside the section. Add it directly before the closing `</section>`:

```tsx
      {/* Slide Navigator — shown in preview mode when deck has multiple slides */}
      {!isGenerating && activeView === "preview" && <SlideNavigator />}
    </section>
```

- [ ] **Step 3: Run the app and manually test**

```bash
npm run dev
```

1. Open the editor, generate a multi-slide presentation.
2. Verify the pill strip appears below the canvas.
3. Click a pill — verify the slide jumps.
4. Verify no pills appear for a single-slide deck.

- [ ] **Step 4: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SlideNavigator.tsx src/components/CanvasPane.tsx
git commit -m "feat: add SlideNavigator pill strip below canvas preview"
```

---

## Task 4: Single-Slide Regeneration button

**Files:**
- Modify: `src/components/CanvasPane.tsx`

- [ ] **Step 1: Add regen button to CanvasPane**

Open `src/components/CanvasPane.tsx`. Add `setPendingEditContext` to the destructure:

```ts
const { generatedCode, theme, isGenerating, inspectMode, setInspectMode, streamingPreview, branding, currentSlide, totalSlides, setPendingEditContext } = useSlidiStore();
```

Add `RefreshCw` to the lucide-react import in CanvasPane. In the preview block (inside `activeView === "preview"` and after the slide counter div), add the regen button as a sibling absolute element:

```tsx
            {/* Regen-slide shortcut — only for multi-slide decks in preview mode */}
            {activeView === "preview" && totalSlides > 1 && (
              <div className="absolute bottom-3 right-3 pointer-events-none flex flex-col items-end gap-1.5">
                <button
                  onClick={() => {
                    const prompt = `Regenerate only slide ${currentSlide + 1} of ${totalSlides}. Keep all other slides exactly as-is. `;
                    setPendingEditContext(prompt);
                  }}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black/60 transition-colors"
                  title={`Regenerate slide ${currentSlide + 1}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Regen slide {currentSlide + 1}
                </button>
                <span className="font-mono text-[10px] font-black text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full tracking-widest tabular-nums pointer-events-none">
                  {currentSlide + 1} / {totalSlides}
                </span>
              </div>
            )}
```

**Note:** Remove the old standalone slide counter div that was previously at `bottom-3 right-3` — it is now merged into this group. The old code was:

```tsx
            {activeView === "preview" && totalSlides > 1 && (
              <div className="absolute bottom-3 right-3 pointer-events-none">
                <span className="font-mono text-[10px] font-black text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full tracking-widest tabular-nums">
                  {currentSlide + 1} / {totalSlides}
                </span>
              </div>
            )}
```

Delete that block and replace with the new combined block above.

Add `RefreshCw` to the lucide import at the top of `CanvasPane.tsx`:

```ts
import { RefreshCw } from "lucide-react";
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 3: Manual smoke test**

1. Generate a 3-slide deck.
2. Navigate to slide 2 via the navigator.
3. Click "Regen slide 2" — chat input pre-fills with `Regenerate only slide 2 of 3. Keep all other slides exactly as-is. `.
4. Verify the "Contextual Reference" banner appears in the chat pane.

- [ ] **Step 4: Commit**

```bash
git add src/components/CanvasPane.tsx
git commit -m "feat: add single-slide regeneration shortcut button on canvas"
```

---

## Task 5: ThemeCustomizer component

**Files:**
- Create: `src/components/ThemeCustomizer.tsx`

- [ ] **Step 1: Create `src/components/ThemeCustomizer.tsx`**

```tsx
"use client";

import { useState, useMemo } from "react";
import { X, RotateCcw } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";
import {
  loadCustomPalette,
  saveCustomPalette,
  removeCustomPalette,
  applyCustomTheme,
  type CustomPalette,
} from "@/lib/themes";

interface ThemeCustomizerProps {
  onClose: () => void;
}

const FIELDS: { key: keyof CustomPalette; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
  { key: "subtext", label: "Subtext" },
  { key: "divider", label: "Divider" },
];

function isValidHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export default function ThemeCustomizer({ onClose }: ThemeCustomizerProps) {
  const { setTheme, theme } = useSlidiStore();
  const [palette, setPalette] = useState<CustomPalette>(loadCustomPalette);
  // Per-field raw text input (may be mid-edit, not yet a valid hex)
  const [raw, setRaw] = useState<Record<keyof CustomPalette, string>>({
    bg: loadCustomPalette().bg,
    text: loadCustomPalette().text,
    accent: loadCustomPalette().accent,
    subtext: loadCustomPalette().subtext,
    divider: loadCustomPalette().divider,
    bullet1: loadCustomPalette().bullet1,
    bullet2: loadCustomPalette().bullet2,
  });

  const previewStyle = useMemo(
    () => ({
      backgroundColor: palette.bg,
      color: palette.text,
      borderTop: `4px solid ${palette.accent}`,
    }),
    [palette]
  );

  function updateField(key: keyof CustomPalette, hex: string) {
    setRaw((r) => ({ ...r, [key]: hex }));
    if (isValidHex(hex)) {
      const next = { ...palette, [key]: hex };
      // bullet1 and bullet2 track accent and subtext automatically
      if (key === "accent") { next.bullet1 = hex; next.divider = hex; }
      if (key === "subtext") { next.bullet2 = hex; }
      setPalette(next);
    }
  }

  function handleSave() {
    saveCustomPalette(palette);
    applyCustomTheme(palette);
    setTheme("custom");
    onClose();
  }

  function handleReset() {
    removeCustomPalette();
    if (theme === "custom") setTheme("minimal");
    onClose();
  }

  return (
    <div className="fixed inset-y-0 right-0 w-72 bg-white border-l border-slate-100 shadow-2xl z-[200] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-14 border-b border-slate-100 flex items-center justify-between px-5 shrink-0">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
          Custom Theme
        </h2>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Color fields */}
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={palette[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={raw[key]}
                onChange={(e) => updateField(key, e.target.value)}
                maxLength={7}
                placeholder="#000000"
                className={`flex-1 h-8 px-2 text-xs font-mono border rounded outline-none ${
                  isValidHex(raw[key])
                    ? "border-slate-200 focus:border-blue-500"
                    : "border-red-300 focus:border-red-500"
                }`}
              />
            </div>
          </div>
        ))}

        {/* Live preview swatch */}
        <div className="mt-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Preview</p>
          <div
            className="w-full rounded-lg overflow-hidden"
            style={previewStyle}
          >
            <div className="p-4">
              <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: palette.accent }}>
                CUSTOM THEME
              </div>
              <div className="text-base font-black mb-1">Slide Title</div>
              <div className="text-xs mb-3" style={{ color: palette.subtext }}>
                Supporting text in subtext color.
              </div>
              <div
                className="w-8 h-0.5 rounded"
                style={{ backgroundColor: palette.accent }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 border-t border-slate-100 space-y-2 shrink-0">
        <button
          onClick={handleSave}
          className="w-full h-9 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-colors"
        >
          Save as Custom Theme
        </button>
        <button
          onClick={handleReset}
          className="w-full h-9 flex items-center justify-center gap-2 border border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest rounded-lg hover:border-red-200 hover:text-red-500 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Default
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeCustomizer.tsx
git commit -m "feat: add ThemeCustomizer color picker panel"
```

---

## Task 6: Wire ThemeCustomizer into Header and SlidiEditor

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SlidiEditor.tsx`

- [ ] **Step 1: Add `showCustomizer` / `onToggleCustomizer` to Header props**

Open `src/components/Header.tsx`. Add to the props interface:

```ts
  showCustomizer: boolean;
  onToggleCustomizer: () => void;
```

Add the paint-brush button in the header actions area. Import `Palette` from lucide-react (add to the existing lucide import). Find the theme-related buttons section and add:

```tsx
          <button
            onClick={onToggleCustomizer}
            title="Custom Theme"
            className={`p-1.5 rounded-lg transition-colors ${
              showCustomizer
                ? "bg-blue-100 text-blue-600"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <Palette className="w-4 h-4" />
          </button>
```

- [ ] **Step 2: Wire state and mount in `SlidiEditor.tsx`**

Open `src/components/SlidiEditor.tsx`. Add:

```ts
import ThemeCustomizer from "@/components/ThemeCustomizer";
import { applyCustomTheme, loadCustomPalette } from "@/lib/themes";
```

Add state:

```ts
const [showCustomizer, setShowCustomizer] = useState(false);
```

Apply saved custom palette on mount (add to the existing mount `useEffect` or create a new one):

```ts
useEffect(() => {
  // Re-apply custom palette on mount so THEME_STYLES["custom"] is populated
  const palette = loadCustomPalette();
  applyCustomTheme(palette);
}, []);
```

Pass the new props to `<Header>`:

```tsx
showCustomizer={showCustomizer}
onToggleCustomizer={() => setShowCustomizer((v) => !v)}
```

Mount the panel. Inside the return, after `</GalleryDrawer>` (or wherever other drawers are mounted), add:

```tsx
{showCustomizer && (
  <ThemeCustomizer onClose={() => setShowCustomizer(false)} />
)}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 4: Manual smoke test**

1. Click the paint-brush icon in the header.
2. Change the accent color to `#ff0000`.
3. Verify the live preview swatch updates.
4. Click "Save as Custom Theme" — verify the theme picker now shows "Custom" as active.
5. Reload the page — verify the Custom theme persists.
6. Open customizer, click "Reset to Default" — verify it switches back to minimal.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/SlidiEditor.tsx src/components/ThemeCustomizer.tsx
git commit -m "feat: wire ThemeCustomizer into Header and SlidiEditor"
```

---

## Task 7: Final integration test

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: All 133+ tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Manual end-to-end test**

1. Generate a 4-slide deck.
2. Verify pill navigator appears with pills 1–4.
3. Click pill 3 — verify slide 3 is shown.
4. Verify "Regen slide 3" button appears in bottom-right.
5. Click it — verify chat pre-fills with the regen prompt.
6. Open customizer via paint-brush icon; set a bright accent color; save.
7. Verify the deck re-renders with the custom palette.
8. Reload — verify custom theme and navigator still work.

- [ ] **Step 4: Push**

```bash
git push origin main
```
