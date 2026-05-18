---
title: Multi-Session Gallery, Slide-Aware Editing & Presenter Mode Fix
difficulty: Hard
importance: High
category: Frontend, Functionalities, UX
status: Backlog
---

# Feature Request: Multi-Session Gallery & Presenter Fix

## Description

Four gaps that prevent Slidi from working as a day-to-day presentation tool:

1. **No session management** — Only one active presentation exists at a time. Generating a new deck overwrites the previous one. No clear "New Presentation" affordance.
2. **No gallery** — Past decks are inaccessible. No way to browse, name, or reopen previous presentations.
3. **AI edits lack slide context** — The AI doesn't know which slide the user is looking at during refinement requests.
4. **Presenter mode is broken** — BroadcastChannel sync fails; presenter window often shows slide 0 and never updates.

## Requirements

### 1. New Presentation (Multiple Chats)
- "New Presentation" button in the Header creates a fresh session (clears canvas + chat)
- Previous session is auto-saved and accessible from the gallery
- Session model: `{ id, name, createdAt, history[], messages[], theme, cachedPlan }`
- Max 20 sessions in localStorage (oldest pruned silently)

### 2. Presentation Gallery
- Left slide-out drawer triggered from a Header icon
- Shows all sessions: thumbnail, name (editable inline), relative date, Open + Delete actions
- Clicking a session restores its chat, code, and theme
- Thumbnails rendered via `SrcdocPreview` in a scaled container
- No server or login needed — purely localStorage-backed

### 3. Slide-Aware AI Editing (Comment on a slide)
- `currentSlide` tracked in Zustand store (via `sl_slide_change` postMessages from `SrcdocPreview`)
- When a presentation is active, prepend `[Currently viewing slide N of M]` to the user message before it reaches the AI (not shown in UI)
- No new UI needed — improves all existing edit requests automatically

### 4. Presenter Mode Fix
- Root cause: channel ID mismatch between editor and presenter URL; initial state never pushed to new window
- Fix `PresentButtonClient` to pass correct `?channel=` param
- On presenter window open, editor immediately sends `SLIDI_STATE_SYNC` with current state
- Reconnect heartbeat: editor sends state every 2s until presenter acknowledges
- Fallback: presenter shows "Waiting for slide data..." if no sync within 5s

## Full design spec
See `docs/superpowers/specs/2026-04-21-multi-session-gallery-design.md`

## Implementation Order
1. Presenter mode fix (highest priority — unblocks demo use)
2. New Presentation button + session store
3. Gallery drawer
4. Slide-aware AI context injection
