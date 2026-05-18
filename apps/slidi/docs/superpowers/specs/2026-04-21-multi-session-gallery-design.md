# Multi-Session Gallery & Presenter Fix — Design Spec
**Date:** 2026-04-21
**Status:** Backlog
**Priority:** High

---

## Problem Statement

Four related gaps prevent Slidi from working as a day-to-day presentation tool:

1. **No session management** — There is only one active presentation at a time. Clicking "Generate" overwrites the previous deck. Starting fresh requires manually clearing chat history with no obvious affordance.
2. **No presentation gallery** — Past decks are buried in a version history stack but there is no dashboard or list to find and re-open them.
3. **AI edits lack slide context** — The chat pane doesn't know which slide the user is looking at. Editing requests like "fix the third slide" rely on the AI guessing.
4. **Presenter mode sync is broken** — The `BroadcastChannel` link between the editor and the detached presenter window breaks when the channel ID is mismatched or the window is opened before the iframe has loaded.

---

## Scope

**In scope:**
- New Presentation button (clear chat + code, start fresh session)
- Presentation gallery: named list of saved decks (localStorage-backed, no server)
- Slide-aware AI editing: chat includes current slide index as context
- Presenter mode bug fix: BroadcastChannel handshake + retry

**Out of scope:**
- Server-side login / user accounts (BYOK model makes this unnecessary — all data is client-side)
- Real-time collaborative editing
- Cloud sync of presentations

---

## Architecture

### 1. Presentation Sessions (New Chat)

**Storage model:** The existing `history[]` and `historyIndex` in localStorage already store code versions. What's missing is named sessions.

Add a `sessions` array to localStorage:

```ts
interface PresentationSession {
  id: string;          // uuid v4
  name: string;        // "Presentation 1", or user-edited title
  createdAt: number;   // timestamp
  updatedAt: number;
  history: string[];   // code snapshots
  historyIndex: number;
  messages: ChatMessage[];
  theme: ThemeId;
  cachedPlan: string | null;
}
```

The **current session** is tracked by `currentSessionId` in the store. Switching sessions loads a different set of history/messages/theme.

**New Presentation button:** Creates a new session, clears the canvas and chat. The current session is auto-saved (it stays in the sessions list). Located in the Header next to the title breadcrumb.

**Session limit:** Keep the last 20 sessions in localStorage to avoid unbounded growth. Oldest are pruned silently.

---

### 2. Presentation Gallery

A slide-out panel (not a separate page) accessible from the Header via a "My Presentations" icon button. Shows:

- Thumbnail: a small rendered preview of the latest code snapshot (using `SrcdocPreview` in a scaled-down container)
- Name: editable inline (double-click to rename)
- Date: relative time ("3 hours ago")
- Actions: Open, Delete

Gallery is purely client-side (localStorage). No login required. Each device has its own gallery.

**Gallery panel placement:** Left slide-out drawer, triggered from the Header. Does not replace the ChatPane — it overlays it.

---

### 3. Slide-Aware AI Editing

When the user sends a message, the system prompt context already goes to the AI. Add a **slide context line** to the user message before it reaches the API:

```
[Currently viewing slide 3 of 8]
```

This line is prepended silently (not shown in the chat UI) when `generatedCode` is non-empty and `currentSlide` is tracked. The `currentSlide` state already exists in the presenter channel sync — wire it into the Zustand store via the `sl_slide_change` postMessage events from `SrcdocPreview`.

**Comment-to-edit flow:** No separate UI needed. Once the AI receives `[Currently viewing slide 3 of 8]` as context, natural language like "make this slide's background darker" or "rewrite the content on this slide" will work correctly.

---

### 4. Presenter Mode Fix

**Root cause investigation:**
The `BroadcastChannel` name used by the editor (hardcoded `'slidi-editor'`) must match the channel name in the presenter URL param `?channel=slidi-editor`. If the channel param is missing or stale, messages never arrive.

Additionally, the presenter iframe listens for `sl_slide_change` postMessages from the AI-generated code inside `SrcdocPreview`. If the presenter window opens before the iframe has emitted its first `sl_slide_change`, the `currentSlide` starts at 0 and never updates until the next slide change.

**Fixes:**
1. **PresentButtonClient:** Always pass `?channel=slidi-editor` (or a session-specific channel ID) when opening the presenter window. Verify the URL is correct.
2. **Initial state push:** When the presenter window opens, the editor immediately sends a `SLIDI_STATE_SYNC` message with the current slide state so the presenter is not stuck at slide 0.
3. **Reconnect on focus:** If `BroadcastChannel.onmessage` has not received a message within 2 seconds of opening, the editor sends a `SLIDI_STATE_SYNC` heartbeat.
4. **Fallback display:** If the presenter receives no sync within 5 seconds, show "Waiting for slide data..." instead of showing slide 1 confidently.

---

## File Map

| File | Change |
|---|---|
| `src/store/slidiStore.ts` | Add `sessions`, `currentSessionId`, `currentSlide`; actions for session CRUD |
| `src/lib/sessions.ts` | NEW — localStorage session serialization/deserialization helpers |
| `src/components/Header.tsx` | Add "New Presentation" button + "Gallery" icon button |
| `src/components/GalleryDrawer.tsx` | NEW — slide-out panel listing saved sessions with thumbnails |
| `src/components/ChatPane.tsx` | Prepend slide context to AI messages |
| `src/components/SrcdocPreview.tsx` | Emit `currentSlide` to store via postMessage listener |
| `src/components/PresentButtonClient.tsx` | Fix channel URL, add initial sync push |
| `src/components/PresenterClient.tsx` | Add fallback "waiting" state, reconnect heartbeat |

---

## Acceptance Criteria

- [ ] "New Presentation" button creates a fresh session; previous session is preserved and accessible from the gallery
- [ ] Gallery drawer shows all sessions with name, relative date, and thumbnail
- [ ] Clicking a session in the gallery switches to it (restores chat + code + theme)
- [ ] Renaming a session persists across refresh
- [ ] When a presentation is open, the current slide index is stored in the Zustand store
- [ ] AI messages include `[Currently viewing slide N of M]` when a presentation is active
- [ ] Presenter window opens and immediately shows the correct current slide
- [ ] Navigating slides in the presenter updates the editor's slide tracker and vice versa
- [ ] Gallery limit: max 20 sessions, oldest pruned silently

---

## Implementation Order

1. **Presenter fix** (unblocks demo use today)
2. **New Presentation button + session store** (unblocks multi-deck workflow)
3. **Gallery drawer** (makes sessions discoverable)
4. **Slide-aware AI context** (improves edit quality)
