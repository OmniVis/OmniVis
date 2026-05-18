Phase 4 Testing Guide

  1. AI Streaming Preview (debounced to ~7×/sec)

  What to test: The streaming preview no longer flickers aggressively during generation.

  1. Open the app, enter a prompt (e.g. "5-slide deck on climate change"), submit
  2. Watch the preview pane while generation runs
  3. Expected: Slides update smoothly ~7 times/sec — no rapid white-flash/remount per token
  4. Regression: Preview still updates and shows the final result when generation completes

  ---
  2. Branding — Company Name Input

  What to test: Typing in the company name field no longer reloads the iframe on every character.

  1. Open Branding Manager (brush icon in header)
  2. Clear the company name field, type a long name quickly (e.g. "Acme Corporation")
  3. Expected: Preview updates ~200ms after you stop typing — no per-character flash
  4. Also test: Logo upload, display toggle (both/logo/name/none), position selector — these should still update the
  preview instantly (they are not debounced)
  5. Also test: Size/padding sliders — these should still only update on mouse-up (unchanged)

  ---
  3. Slide Navigation — No Ghost Re-renders

  What to test: Navigating between slides does not cause the chat sidebar or canvas to flicker/re-render unnecessarily.

  1. Generate a multi-slide deck (5+ slides)
  2. Use the dot navigator or arrow buttons to move between slides
  3. While navigating, watch the chat sidebar — it should stay visually stable (no re-render flash)
  4. Watch the slide counter — it should update correctly on every navigation
  5. Regression: The current slide indicator (dots + counter) still tracks correctly

  ---
  4. Code Editor Typing (SandpackCanvas)

  What to test: Switching to the code tab and typing does not cause lag or stutter.

  1. Generate a presentation, switch to the Code tab
  2. Make a small edit (change a color, some text)
  3. Expected: Typing is instant with zero input lag; the preview updates ~300ms after you stop (existing CodeSyncBack
  debounce — unchanged)
  4. Regression: Edits still persist and show up in the preview tab when you switch back

  ---
  5. Chat Submission — Slide Context Still Works

  What to test: The currentSlide/totalSlides context prefix in prompts still works (reads moved from subscription to
  getState() at submit time).

  1. Generate a multi-slide deck, navigate to slide 3
  2. Type "make this slide more visual" and submit
  3. Expected: The AI receives the context [Currently viewing slide 3 of N] — visible in the system message or reflected
   in the output
  4. Repeat from slide 1 — confirm the prefix changes correctly

  ---
  6. Theme Switching

  What to test: Changing theme still forces an iframe reload (theme is still in the iframe key).

  1. Generate a presentation, switch themes from the style sidebar
  2. Expected: Preview updates to the new theme
  3. Regression check: No frozen/blank preview after switching

  ---
  7. Undo/Redo

  What to test: History still works correctly since generatedCode is now read via a selector.

  1. Generate a presentation, make a code edit, wait for preview to update
  2. Press Ctrl+Z (undo) — confirm preview reverts
  3. Press Ctrl+Y (redo) — confirm it comes back
  4. Regression: No stale preview showing old code

  ---
  Quick Smoke Test Checklist

  ┌────────────────────────────────────┬────────────────────────────────────────────────────────┐
  │               Action               │                     Pass condition                     │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Generate a new deck                │ Preview appears, generation completes                  │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Navigate slides                    │ Counter + dots update, no chat flicker                 │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Type in code editor                │ No input lag, preview updates after pause              │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Type a company name fast           │ Preview updates once after you stop, not per character │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Switch theme                       │ Preview reloads with new theme                         │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Undo a code edit                   │ Preview reverts correctly                              │
  ├────────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ Submit a chat message from slide 3 │ AI response reflects slide context                     │
  └────────────────────────────────────┴────────────────────────────────────────────────────────┘