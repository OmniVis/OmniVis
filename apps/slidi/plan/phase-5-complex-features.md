# Phase 5: Complex Feature Implementation

**Difficulty:** Hard  
**Focus:** Browser Window APIs, cross-window communication, and state syncing
**Status:** Completed and tested

---

## Task 1 — Dual-Screen Presenter Mode

**Problem:** Users need a professional way to present their slides with notes and controls visible only to them on a secondary screen.

**Files:**
- `src/app/present/[id]/page.tsx` — **[NEW]** Presenter View route
- `src/app/view/[id]/page.tsx` — Client View route (enhanced)
- `src/hooks/useBroadcastChannel.ts` — **[NEW]** handle cross-window state syncing
- `src/components/PresenterControls.tsx` — **[NEW]** UI for notes and navigation

**Implementation Steps:**
1. **Window Communication:**
   - Use the `BroadcastChannel` API to sync the current slide index and presentation state between the main window and the presenter window.
2. **Client View:**
   - Opens the presentation in fullscreen.
   - Listens for `GOTO_SLIDE` messages from the Presenter View.
3. **Presenter View:**
   - Opens in a new window via `window.open()`.
   - Displays the current slide thumbnail.
   - Displays presenter notes (extracted from the slide data).
   - Provides "Next", "Previous", and "Timer" controls.
   - Sends state updates to the Client View window.
4. **Resilience:**
   - Ensure that if one window is closed, the other remains functional.
   - Handle focus management so the presenter can use keyboard shortcuts even when the Client window is fullscreen.

**Verification:** Click "Present" → Presenter window opens → Navigating in Presenter window changes slides in the Client window instantly.
