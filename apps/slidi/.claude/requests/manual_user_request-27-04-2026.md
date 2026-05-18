---
title: Presentation Naming + Custom Theme in Themes Tab + HTML Export Fixes
difficulty: Medium
importance: High
category: Frontend, UX, Functionalities
status: Ready
requested: 2026-04-27
---

# User Request — 2026-04-27

Three feature areas to implement, all decided and ready to execute.

---

## 1. Presentation Naming System

### What the user wants
Each presentation should have a human-readable name that:
- Is **auto-generated** by extracting it from the slide code when the AI first produces output
- Is **editable inline** by clicking it in the header
- Appears **in the header** where "SNAPSHOT / XXXXXXXX" currently sits
- Appears **in the Library** (already does via session.name — needs to stay in sync)

### Current situation
The header shows: `SLIDI / SNAPSHOT / a3f1b2c9` (truncated UUID). This is meaningless to users.
`extractSessionName()` already parses titles from generated code but is only called at session-save time, not tracked live in the store.

### Design decisions (no questions needed)
- Name is auto-set on first `pushVersion` by running `extractSessionName(code, [])`. If the result is a generic "Presentation N" fallback (meaning no title was found), store it as empty and show "Untitled" in muted style so the user knows it's unset.
- User can click the name in the header to edit it inline (input field, confirm with Enter or blur).
- Name persists to localStorage under `slidi_presentation_name`.
- When `clearPresentation` saves the current session, it uses the stored `presentationName` as the session name (no more calling `extractSessionName` at save time for the name — use what's already stored).
- When `switchToSession` loads a session, it restores `presentationName` from `session.name`.
- When the user renames a session in the Library drawer, the in-memory `presentationName` also updates if that session is currently active.

### Store changes (`src/store/slidiStore.ts`)
- Add `presentationName: string` to `SlidiState` interface
- Add `setPresentationName: (name: string) => void` action
- Add `PRESENTATION_NAME_KEY = "slidi_presentation_name"` constant
- Load from localStorage in `loadFromStorage()` (SSR fallback: `""`)
- In `pushVersion`: if `get().presentationName === ""`, call `extractSessionName(code, get().sessions)` and store the result — but only if the result is NOT a generic "Presentation N" pattern (i.e. it found a real title); otherwise leave as `""`.
- In `clearPresentation`: `localStorage.removeItem(PRESENTATION_NAME_KEY)`, set `presentationName: ""`
- In `switchToSession`: `localStorage.setItem(PRESENTATION_NAME_KEY, session.name)`, set `presentationName: session.name`
- In `saveCurrentAsSession` and `clearPresentation` snapshot: use `s.presentationName || extractSessionName(s.generatedCode, sessions)` as the session `name` field

### Header changes (`src/components/Header.tsx`)
- Add props: `presentationName: string`, `onRenamePresentation: (name: string) => void`
- Replace the current "SNAPSHOT / XXXXXXXX" block with an inline editable name:
  - Default state: shows `presentationName` if set, otherwise shows "Untitled" in `text-slate-300` muted style
  - Click → switches to a small `<input>` pre-filled with current name (or empty)
  - Enter / blur → calls `onRenamePresentation(value.trim())` and exits edit mode
  - Escape → discards edit and exits
  - Style: `text-[11px] font-semibold text-slate-600` — compact, sits naturally after `SLIDI /`
  - Max width: `max-w-[180px]` truncated with ellipsis when not editing

### SlidiEditor changes (`src/components/SlidiEditor.tsx`)
- Destructure `presentationName, setPresentationName` from `useSlidiStore`
- Pass to `<Header>`:
  ```tsx
  presentationName={presentationName}
  onRenamePresentation={(name) => setPresentationName(name)}
  ```

### Session sync
- When `renameSession` is called in the GalleryDrawer for the currently active session (`id === currentSessionId`), the store should also update `presentationName`. Add this to the `renameSession` action.

---

## 2. Move Custom Theme into the Themes Tab

### What the user wants
The Custom Theme color editor should live **inside the ThemeSidebar** (left panel, opened via "Themes" button), not as a separate right-side drawer.

### Current situation
- `ThemeSidebar.tsx` lists all themes including "Custom" but clicking it just switches the theme — no way to edit colors.
- `ThemeCustomizer.tsx` is a separate right-side drawer behind a Brush icon in the header.
- Two surfaces for one feature = bad UX.

### What needs to change

#### ThemeSidebar (`src/components/ThemeSidebar.tsx`)
- Add local state: `showCustomEditor: boolean` (true when custom card is active/expanded)
- When user clicks the "Custom" card: set theme to "custom" AND set `showCustomEditor = true`
- When user clicks any other card: set `showCustomEditor = false`
- Below the "Custom" card (when `showCustomEditor` is true), render an inline expanded section containing:
  - 5 color fields (bg, text, accent, subtext, divider) each with a color wheel input + hex text input side by side
  - Live preview swatch (same mini card as ThemeCustomizer)
  - "Save" button: calls `saveCustomPalette(palette)`, `applyCustomTheme(palette)`, done
  - "Reset" button: calls `removeCustomPalette()`, switches theme to "minimal", closes editor
- Import from `@/lib/themes`: `loadCustomPalette`, `saveCustomPalette`, `removeCustomPalette`, `applyCustomTheme`, `CustomPalette`
- Add `useState` import

#### Header (`src/components/Header.tsx`)
- Remove `showCustomizer: boolean` and `onToggleCustomizer: () => void` props
- Remove the `Brush` button from the right actions area
- Remove `Brush` from lucide-react import

#### SlidiEditor (`src/components/SlidiEditor.tsx`)
- Remove `showCustomizer` state
- Remove `onToggleCustomizer` prop passed to Header
- Remove `{showCustomizer && <ThemeCustomizer ... />}` block
- Remove `ThemeCustomizer` import
- Keep `applyCustomTheme(loadCustomPalette())` in the mount effect

#### ThemeCustomizer (`src/components/ThemeCustomizer.tsx`)
- **Delete the file** — logic moves into ThemeSidebar

---

## 3. HTML Export Fixes (from html_export.md audit)

Two gaps identified in the existing Download button:

### Gap A — Filename uses presentation name
Currently hardcoded to `"presentation.html"`. Should be:
```ts
const safeName = (presentationName || "presentation")
  .replace(/[^a-z0-9\-_ ]/gi, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 60) || "presentation";
a.download = `${safeName}.html`;
```
Get `presentationName` from `useSlidiStore.getState()`.

### Gap B — Exported HTML omits postMessage sync code
`buildSrcdoc` injects `sl_slide_change` postMessage code which is only needed for editor sync. Exported files don't have a parent editor window, so the code is harmless but unnecessary.

Add optional `forExport?: boolean` parameter to `buildSrcdoc` in `src/components/SrcdocPreview.tsx`. When `true`, omit the `window.parent.postMessage(...)` block from the generated HTML.

In `SlidiEditor.tsx` `handleDownload`, pass `forExport: true`:
```ts
const html = buildSrcdoc(generatedCode, theme, branding, true);
```

---

## 4. Slide Navigator → Dots (DONE ✅)

Completed in commit `cad82ce`. Numbered pills replaced with dots (active = larger filled, inactive = smaller dimmer). No further action needed.

---

## Execution order

1. Store: add `presentationName` field + actions (foundation for items 1 and 3A)
2. Header: replace UUID block with editable name
3. SlidiEditor: wire new Header props
4. ThemeSidebar: absorb custom editor inline
5. Header + SlidiEditor: remove Brush/ThemeCustomizer
6. SrcdocPreview: add `forExport` param to `buildSrcdoc`
7. SlidiEditor: fix download filename + forExport flag

---

## Files involved

| File | Change |
|------|--------|
| `src/store/slidiStore.ts` | Add `presentationName`, `setPresentationName`, update pushVersion/clear/switch/rename |
| `src/lib/sessions.ts` | No change needed — `name` field already exists |
| `src/components/Header.tsx` | Replace UUID block with editable name; remove Brush button |
| `src/components/SlidiEditor.tsx` | Wire name props; remove customizer; fix download |
| `src/components/ThemeSidebar.tsx` | Add inline custom color editor |
| `src/components/ThemeCustomizer.tsx` | **Delete** |
| `src/components/SrcdocPreview.tsx` | Add `forExport` param to `buildSrcdoc` |
