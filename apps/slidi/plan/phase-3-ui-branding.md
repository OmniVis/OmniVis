# Phase 3: UI Enhancements & Branding

**Difficulty:** Medium  
**Focus:** Component structure, file handling, UI/UX redesign
**Status:** Completed and tested

---

## Task 1 — Branding Feature Upgrade

**Problem:** The current branding "pill" is too simple and lacks customization. Users need to be able to upload logos and position them accurately.

**Files:**
- `src/components/BrandingPill.tsx` — current implementation (to be replaced or upgraded)
- `src/components/BrandingManager.tsx` — **[NEW]** handle upload and positioning logic
- `src/components/SrcdocPreview.tsx` — render the logo on the canvas
- `src/store/slidiStore.ts` — state for `brandingLogo` (base64/URL) and `logoPosition`

**Implementation Steps:**
1. **Logo Upload:**
   - Create a file input in the branding panel.
   - Convert uploaded images to base64 for persistent local storage (until a backend storage is implemented).
   - Add the disclaimer: *"For best results, upload a .png file with a transparent background. Ensure your logo contrasts with your presentation theme."*
2. **Positioning Logic:**
   - Implement a selector for four corners: `top-left`, `top-right`, `bottom-left`, `bottom-right`.
   - Update `SrcdocPreview` to inject the logo into the correct position in the generated HTML/CSS.
3. **Preset Support:**
   - Define a structure for `PRESET_LOGOS` so they can be easily added as selectable options later.

**Verification:** Upload a logo → select "top-right" → the logo appears in the top-right corner of all slides in the canvas preview.

---

## Task 2 — Editor UI Revamp

**Problem:** The current visual editor layout feels cluttered and doesn't prioritize the visual hierarchy correctly.

**Files:**
- `src/components/SlidiEditor.tsx` — main editor layout
- `src/components/Toolbox.tsx` — side panels/tools
- `src/components/EditorToolbar.tsx` — top/bottom bars

**Implementation Steps:**
1. **Layout Analysis:**
   - Identify unused space and redundant controls.
   - Prioritize the canvas area.
2. **Modernization:**
   - Implement a cleaner, more minimalist design (e.g., using better spacing, subtle borders, and consistent typography).
   - Use a multi-column or drawer-based system for tools to maximize workspace.
   - Ensure a clear distinction between "content editing" and "style management".
3. **Functional Preservation:**
   - Ensure all existing shortcuts, AI chat triggers, and slide navigation remain functional.

**Verification:** The editor looks modern and premium. All previous features (AI generation, slide switching, theme selection) work exactly as before but with a better UI.
