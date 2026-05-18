# Phase 10: Real-Time Collaboration & Live Audience Mode

**Difficulty:** Very Hard  
**Focus:** WebSocket-based multi-user editing, live audience interaction, and presence awareness.
**Status:** Pending

---

## Task 1 — Collaborative Editing via Node.js WebSockets

**Problem:** Slidi is a single-user tool today. Two colleagues working on the same deck overwrite each other's changes, and there is no concept of "who is editing what". For an internal Adesso team tool, real-time co-authoring is the next logical step.

**Files:**
- `src/server/collab.ts` — **[NEW]** Standalone Node.js WebSocket server or custom Next.js server handling per-presentation state
- `src/app/api/collab/[id]/route.ts` — **[NEW]** WebSocket upgrade endpoint or proxy to the collab server
- `src/hooks/useCollabSession.ts` — **[NEW]** React hook: connects to the WebSocket, emits/receives operations
- `src/components/PresenceBar.tsx` — **[NEW]** horizontal strip of avatar initials showing who is in the session
- `src/store/slidiStore.ts` — add `collaborators`, `isCollabActive`, `collabSessionId` slices

**Implementation Steps:**
1. **Node.js WebSocket Server:**
   - Maintains a Map of active rooms: `presentation_id` -> `Set<WebSocket>`.
   - State machine: `idle` → `active` (≥1 peer) → `idle` (0 peers, cleaned up after a timeout).
   - Broadcasts two message types:
     - `PATCH` — a diff/operation from one peer forwarded to all others.
     - `PRESENCE` — {userId, username, color, cursorSlide} updated whenever a user moves or disconnects.
   - Applies a **last-write-wins** strategy on the server for conflict resolution (simple and sufficient for slide-level edits; future work can layer OT/CRDT on top).

2. **WebSocket upgrade endpoint (`/api/collab/[id]`):**
   - Validates the Bearer token from the Adesso Hub auth header.
   - Routes the WebSocket connection to the collab server or handles it directly if using a custom Next.js server.

3. **`useCollabSession` hook:**
   - Connects when `isCollabActive` is true and `generatedCode` exists.
   - On `pushVersion` (local edit): serialises the new code as a `PATCH` message and sends it.
   - On incoming `PATCH` from server: calls `pushVersion` with `{ skipBroadcast: true }` to apply without re-emitting.
   - On incoming `PRESENCE`: updates `collaborators` in the store.
   - Reconnects with exponential backoff on drop (max 5 attempts).

4. **`PresenceBar` component:**
   - Renders one colored circle per collaborator, showing their initials and current slide number.
   - Tooltip on hover shows full username and "currently on slide N".
   - Displayed in the Header next to the presentation name when `isCollabActive`.

5. **Session invite flow:**
   - "Share & Collaborate" button in the Header generates a short-lived invite URL: `/collab/[id]?token=xxx`.
   - The token is a signed JWT (persisted in server memory or Redis with a 24h TTL) that grants write access to that specific presentation.
   - On the receiving end, the recipient is prompted to authenticate with their Adesso Hub credentials before joining.

**Verification:**
- Two browser windows connected to the same session: editing in window A updates the presentation in window B within 500ms.
- Presence bar shows both users with correct slide indicators.
- Disconnecting one window updates the presence bar in the other.
- Reconnecting after network drop re-joins the session automatically and receives the latest code state.

---

## Task 2 — Live Audience Mode (QR + Follower View)

**Problem:** During a live presentation, the audience has no way to follow along on their own devices or submit questions. A "live mode" turns Slidi into a real-time broadcast tool.

**Files:**
- `src/app/live/[id]/page.tsx` — **[NEW]** Follower View: audience members scan a QR and see slides advance in real-time (read-only, no chat)
- `src/app/api/live/[id]/route.ts` — **[NEW]** Server-Sent Events (SSE) or WebSocket endpoint: emits slide change events to all followers
- `src/components/LiveModePanel.tsx` — **[NEW]** presenter-facing panel: QR code, live viewer count, Q&A queue
- `src/components/QAPanel.tsx` — **[NEW]** audience-facing question input and upvote list
- `src/app/api/live/[id]/qa/route.ts` — **[NEW]** SQLite: persist submitted questions, return ranked list
- `src/lib/qr.ts` — **[NEW]** thin wrapper around `qrcode` (pure-JS, no canvas dependency) for QR generation

**Implementation Steps:**
1. **Live State Manager (on Server):**
   - Tracks `{ slideIndex, isLive, viewerCount }` for a session in memory.
   - Exposes a WebSocket endpoint for the presenter (sends `GOTO` commands).
   - Exposes an SSE or WebSocket endpoint for followers (receives `SLIDE_CHANGE` events).
   - Counts active connections; broadcasts `VIEWER_COUNT` updates to the presenter.

2. **Follower View (`/live/[id]`):**
   - Minimalist fullscreen viewer — same `SrcdocPreview` component as the share viewer but with `isFollowing: true`.
   - Listens to the SSE or WebSocket stream; auto-advances slides when `SLIDE_CHANGE` arrives.
   - Shows a "Not live yet" loading state while `isLive` is false.
   - On mobile: renders a condensed single-slide view with touch swipe disabled (presenter controls navigation).

3. **Presenter Live Panel (`LiveModePanel`):**
   - Activated via "Go Live" button in the presenter view.
   - Shows a QR code linking to `/live/[id]` (generated client-side, no server roundtrip).
   - Live viewer count badge updates in real-time via the server state.
   - One-click "End Session" sets `isLive = false` and disconnects all followers gracefully.

4. **Q&A System:**
   - Audience members in the Follower View can submit questions (max 280 chars) and upvote others.
   - Questions persist in a local SQLite database (`live_questions` table: `id`, `session_id`, `text`, `votes`, `created_at`).
   - Presenter sees the top-voted questions in `QAPanel`, can mark them as "answered" (soft-delete from the queue).
   - No authentication required for audience — questions are anonymous by default, or optionally attributed if the follower is an Adesso Hub user.

5. **QR code generation (`src/lib/qr.ts`):**
   - Wrap the `qrcode` npm package into a `generateQRDataURL(text: string): Promise<string>` helper.
   - Used by `LiveModePanel`; SSR-safe (only called client-side).

**Verification:**
- On mobile: scan QR → `/live/[id]` loads → slides advance in sync with the presenter's navigation.
- Viewer count in `LiveModePanel` updates within 2 seconds of a new follower connecting.
- Submitted questions appear in `QAPanel` in real-time; upvoting reorders the list.
- "End Session" disconnects all followers and shows a "Session ended" screen.

---

## Task 3 — Conflict Resolution & Offline Support

**Problem:** Network drops or edit conflicts during a collaborative session must not corrupt the presentation or lose work.

**Files:**
- `src/lib/ai/operationalTransform.ts` — **[NEW]** lightweight last-write-wins + timestamp-based merge for slide-level conflicts
- `src/hooks/useOfflineQueue.ts` — **[NEW]** queues local edits when offline, replays them on reconnect
- `public/sw.js` — **[MODIFIED]** update Service Worker to cache the app shell for offline use

**Implementation Steps:**
1. **Offline Queue:**
   - `useOfflineQueue` tracks `navigator.onLine` and the WebSocket `readyState`.
   - When offline: stores `pushVersion` calls in an `IDBDatabase` queue.
   - On reconnect: replays queued operations in order, then syncs with the server's latest state.
   - If a conflict is detected (server version newer than local base): show a diff UI letting the user pick which version to keep.

2. **Slide-level Merge:**
   - `operationalTransform.ts` exports `mergeVersions(base, local, remote)`.
   - Strategy: slide blocks that were edited locally but not remotely → keep local; slide blocks edited only remotely → accept remote; both edited → flag conflict.
   - This is not a full CRDT, but covers the 90% case (different users editing different slides simultaneously).

3. **App Shell Caching:**
   - Update `public/sw.js` to cache-first the JS/CSS bundles and fonts.
   - Network-first for API routes (`/api/*`); fall back to a "You are offline" JSON for non-cached routes.

**Verification:**
- Take the network offline mid-session → edits accumulate in the queue → reconnect → all queued edits are applied without duplication.
- Two users edit different slides simultaneously → both changes are visible in both windows after sync.
- Open Slidi with no network → the app shell loads; the last session's code is available from IndexedDB.
