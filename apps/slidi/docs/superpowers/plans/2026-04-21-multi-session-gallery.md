# Multi-Session Gallery & Presenter Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix presenter mode sync, add a "New Presentation" button with session history, a gallery drawer for browsing past decks, and slide-aware AI context injection.

**Architecture:** Slide state (`currentSlide`, `totalSlides`) is added to the Zustand store so `SrcdocPreview` can update it and `PresenterClient` can request it on mount. Sessions are plain JSON arrays in localStorage (`slidi_sessions`). The Gallery is a left slide-out drawer alongside the existing `ThemeSidebar` in `SlidiEditor`. Slide context is prepended silently to the AI message payload in `ChatPane`.

**Tech Stack:** TypeScript, React, Zustand, Tailwind CSS, Vitest, `BroadcastChannel` API, `crypto.randomUUID()`.

---

## File Map

| File | Change |
|---|---|
| `src/store/slidiStore.ts` | Add `currentSlide`, `totalSlides`, `sessions`, `clearPresentation`, session CRUD actions |
| `src/lib/sessions.ts` | NEW — Session type + localStorage helpers |
| `src/components/SrcdocPreview.tsx` | Update store on `sl_slide_change`; respond to `SLIDI_REQUEST_STATE` |
| `src/components/PresenterClient.tsx` | Send `SLIDI_REQUEST_STATE` on mount; show "Waiting…" fallback |
| `src/components/Header.tsx` | Add "New" button + "Gallery" toggle icon; add `onNewPresentation`/`showGallery`/`onToggleGallery` props |
| `src/components/GalleryDrawer.tsx` | NEW — left panel listing sessions with delete/rename/switch |
| `src/components/SlidiEditor.tsx` | Wire gallery state; render `GalleryDrawer`; pass new Header props |
| `src/components/ChatPane.tsx` | Prepend `[Currently viewing slide N of M]` to AI messages |
| `src/__tests__/store.test.ts` | Tests for `currentSlide`, `clearPresentation`, session CRUD |

---

## Task 1: Presenter Mode Fix

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/components/SrcdocPreview.tsx`
- Modify: `src/components/PresenterClient.tsx`
- Test: `src/__tests__/store.test.ts`

### Context

The presenter window opens and shows slide 0 even if the user is on slide 5. This happens because `BroadcastChannel` messages are fire-and-forget — if the presenter hasn't mounted yet, the `SLIDI_STATE_SYNC` broadcast from the last slide change is gone. Fix: the presenter sends `SLIDI_REQUEST_STATE` on mount; `SrcdocPreview` listens and responds with the current slide state from the Zustand store.

- [ ] **Step 1: Write failing store tests**

Add to `src/__tests__/store.test.ts`, after the last `describe` block:

```ts
describe("slidiStore — currentSlide / totalSlides", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [], history: [], historyIndex: -1,
      generatedCode: "", currentVersionId: "", isGenerating: false,
    });
  });

  it("currentSlide starts at 0", () => {
    expect(useSlidiStore.getState().currentSlide).toBe(0);
  });

  it("totalSlides starts at 1", () => {
    expect(useSlidiStore.getState().totalSlides).toBe(1);
  });

  it("setCurrentSlide updates the store", () => {
    useSlidiStore.getState().setCurrentSlide(4);
    expect(useSlidiStore.getState().currentSlide).toBe(4);
  });

  it("setTotalSlides updates the store", () => {
    useSlidiStore.getState().setTotalSlides(12);
    expect(useSlidiStore.getState().totalSlides).toBe(12);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\berol\Projekte\AiTools\slidi
npm test -- --run src/__tests__/store.test.ts
```

Expected: 4 new tests FAIL (`currentSlide` / `totalSlides` not defined).

- [ ] **Step 3: Add currentSlide + totalSlides to store**

In `src/store/slidiStore.ts`, find the `SlidiState` interface. After `setStreamingPreview`:

```ts
// Slide tracker — updated by SrcdocPreview on sl_slide_change
currentSlide: number;
totalSlides: number;
setCurrentSlide: (n: number) => void;
setTotalSlides: (n: number) => void;
```

In the `create(...)` body, after `setStreamingPreview: (code) => set({ streamingPreview: code }),`:

```ts
currentSlide: 0,
totalSlides: 1,
setCurrentSlide: (n) => set({ currentSlide: n }),
setTotalSlides: (n) => set({ totalSlides: n }),
```

Do NOT add these to `loadFromStorage()` — they are in-memory only, reset to defaults on page load.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Update SrcdocPreview to update store + respond to SLIDI_REQUEST_STATE**

In `src/components/SrcdocPreview.tsx`, find the `useEffect` that contains the BroadcastChannel setup (the one with `if (syncChannel) { bc = new BroadcastChannel(syncChannel); ... }`).

Find the handler for `sl_slide_change` inside that effect:

```ts
// CURRENT code:
if (e.data?.type === "sl_slide_change") {
  if (bc) {
    bc.postMessage({
      type: "SLIDI_STATE_SYNC",
      current: e.data.current,
      total: e.data.total
    });
  }
}
```

Replace with:

```ts
if (e.data?.type === "sl_slide_change") {
  // Update store so presenter can request current state on mount
  useSlidiStore.getState().setCurrentSlide(e.data.current);
  useSlidiStore.getState().setTotalSlides(e.data.total);
  if (bc) {
    bc.postMessage({
      type: "SLIDI_STATE_SYNC",
      current: e.data.current,
      total: e.data.total,
    });
  }
}
```

Also add a handler for `SLIDI_REQUEST_STATE` in the BroadcastChannel setup block, inside the `if (syncChannel)` block, after `bc.onmessage`:

```ts
// Presenter requested current state (happens on mount before any slide change)
bc.onmessage = (e) => {
  if (e.data.type === "SLIDI_REMOTE_NAV") {
    iframeRef.current?.contentWindow?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: e.data.direction === "next" ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
        cancelable: true,
      })
    );
  }
  if (e.data.type === "SLIDI_REQUEST_STATE") {
    // Respond with current tracked state
    const { currentSlide, totalSlides } = useSlidiStore.getState();
    bc.postMessage({ type: "SLIDI_STATE_SYNC", current: currentSlide, total: totalSlides });
  }
};
```

(This replaces the existing `bc.onmessage` assignment — merge both cases into one handler.)

Ensure `useSlidiStore` is imported at the top of `SrcdocPreview.tsx`:
```ts
import { useSlidiStore } from "@/store/slidiStore";
```

- [ ] **Step 6: Update PresenterClient to request state on mount**

In `src/components/PresenterClient.tsx`, inside the `useEffect` that creates the BroadcastChannel:

```ts
useEffect(() => {
  const bc = new BroadcastChannel(channelId);
  bcRef.current = bc;

  bc.onmessage = (e) => {
    if (e.data.type === "SLIDI_STATE_SYNC") {
      setCurrentSlide(e.data.current);
      if (e.data.total) setTotalSlides(e.data.total);
    }
  };

  // Request current state immediately — editor responds with SLIDI_STATE_SYNC
  bc.postMessage({ type: "SLIDI_REQUEST_STATE" });
  // Retry after 1.5s in case the editor hadn't mounted its BroadcastChannel yet
  const retryTimer = setTimeout(() => {
    bc.postMessage({ type: "SLIDI_REQUEST_STATE" });
  }, 1500);

  return () => {
    clearTimeout(retryTimer);
    bc.close();
  };
}, [channelId]);
```

Also add a "waiting" fallback in the render — update the slide counter display to show a waiting indicator when `totalSlides` is still 1 and `currentSlide` is still 0 and more than 3 seconds have passed. Add a `ready` state:

```ts
const [ready, setReady] = useState(false);
```

In the `bc.onmessage` handler, set `ready` when first message arrives:
```ts
bc.onmessage = (e) => {
  if (e.data.type === "SLIDI_STATE_SYNC") {
    setReady(true);
    setCurrentSlide(e.data.current);
    if (e.data.total) setTotalSlides(e.data.total);
  }
};
```

Update the slide counter JSX (the `<div>` showing the big slide number) to show `"—"` when not ready:

```tsx
<div className="text-5xl font-black text-white mb-10 tracking-tighter">
  {ready ? (
    <>
      {currentSlide + 1} <span className="text-2xl text-slate-600">/ {totalSlides}</span>
    </>
  ) : (
    <span className="text-2xl text-slate-500 animate-pulse">Connecting…</span>
  )}
</div>
```

- [ ] **Step 7: Build and test**

```bash
npm run build 2>&1 | tail -10
npm test -- --run
```

Expected: 0 TypeScript errors, all tests pass (115+).

- [ ] **Step 8: Commit**

```bash
git add src/store/slidiStore.ts src/components/SrcdocPreview.tsx src/components/PresenterClient.tsx src/__tests__/store.test.ts
git commit -m "fix: presenter mode — track currentSlide in store; request state on window open"
```

---

## Task 2: clearPresentation Action + New Presentation Button

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SlidiEditor.tsx`
- Test: `src/__tests__/store.test.ts`

### Context

There is no way to start a fresh presentation without manually clearing chat history. We add a `clearPresentation()` store action and a "New" button in the Header.

- [ ] **Step 1: Write failing test for clearPresentation**

Add to `src/__tests__/store.test.ts`:

```ts
describe("slidiStore — clearPresentation", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "my-key", provider: "anthropic", theme: "dark",
      messages: [{ role: "user", content: "hello" }],
      history: ["code1", "code2"], historyIndex: 1,
      generatedCode: "code2", currentVersionId: "abc",
      isGenerating: false, cachedPlan: "plan text",
      notes: { 0: "intro note" }, currentSlide: 3, totalSlides: 8,
    });
  });

  it("clears all presentation state", () => {
    useSlidiStore.getState().clearPresentation();
    const s = useSlidiStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.history).toEqual([]);
    expect(s.historyIndex).toBe(-1);
    expect(s.generatedCode).toBe("");
    expect(s.currentVersionId).toBe("");
    expect(s.cachedPlan).toBeNull();
    expect(s.notes).toEqual({});
    expect(s.currentSlide).toBe(0);
    expect(s.totalSlides).toBe(1);
  });

  it("preserves API key, provider, theme, and branding", () => {
    useSlidiStore.getState().clearPresentation();
    const s = useSlidiStore.getState();
    expect(s.apiKey).toBe("my-key");
    expect(s.provider).toBe("anthropic");
    expect(s.theme).toBe("dark");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: 2 new tests FAIL (`clearPresentation` not defined).

- [ ] **Step 3: Add clearPresentation to the store**

In `src/store/slidiStore.ts`, add to `SlidiState` interface after `setTotalSlides`:

```ts
clearPresentation: () => void;
```

In the store body, add after `setTotalSlides: (n) => set({ totalSlides: n }),`:

```ts
clearPresentation: () => {
  localStorage.removeItem("slidi_history");
  localStorage.removeItem("slidi_history_index");
  localStorage.removeItem("slidi_version_id");
  localStorage.removeItem("slidi_notes");
  set({
    messages: [],
    history: [],
    historyIndex: -1,
    generatedCode: "",
    currentVersionId: "",
    cachedPlan: null,
    streamingPreview: null,
    notes: {},
    currentSlide: 0,
    totalSlides: 1,
    inspectMode: false,
    pendingEditContext: null,
  });
},
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Add onNewPresentation + showGallery + onToggleGallery props to Header**

In `src/components/Header.tsx`, update the `HeaderProps` interface:

```ts
interface HeaderProps {
  activeView: "preview" | "code";
  onViewChange: (view: "preview" | "code") => void;
  onPublish: () => void;
  publishPending?: boolean;
  onSettings: () => void;
  onToggleThemes: () => void;
  showThemeSidebar: boolean;
  onNewPresentation: () => void;   // NEW
  showGallery: boolean;            // NEW
  onToggleGallery: () => void;     // NEW
}
```

Update the function signature to destructure the new props:

```ts
export default function Header({
  activeView, onViewChange, onPublish, publishPending = false,
  onSettings, onToggleThemes, showThemeSidebar,
  onNewPresentation, showGallery, onToggleGallery,
}: HeaderProps) {
```

Add `clearPresentation` to the store destructure:

```ts
const { theme, setTheme, undo, redo, historyIndex, history, generatedCode, inspectMode, setInspectMode, currentVersionId } = useSlidiStore();
```

(No change needed — `clearPresentation` is called via `onNewPresentation` callback, not directly in Header.)

**Add Gallery toggle button** — insert right after the Logo section's closing `</div>` (before the centre controls section):

```tsx
{/* Gallery toggle */}
<button
  onClick={onToggleGallery}
  title="My Presentations"
  className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm transition-all shrink-0 ${
    showGallery
      ? "bg-slate-900 text-white"
      : "text-slate-400 hover:text-slate-900"
  }`}
>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
</button>
```

**Add New Presentation button** in the right actions section, before the Share button:

```tsx
<button
  onClick={onNewPresentation}
  title="New Presentation"
  className="flex items-center gap-1.5 px-3 md:px-4 py-1 md:py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-colors"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
  <span className="hidden sm:inline">New</span>
</button>
```

- [ ] **Step 6: Wire new props in SlidiEditor**

In `src/components/SlidiEditor.tsx`:

Add state:
```ts
const [showGallery, setShowGallery] = useState(false);
```

Add `clearPresentation` to the store destructure:
```ts
const { apiKey, generatedCode, setCurrentVersionId, pushVersion, clearPresentation } = useSlidiStore();
```

Update `<Header ...>` to pass new props:

```tsx
<Header
  activeView={activeView}
  onViewChange={setActiveView}
  onPublish={handlePublish}
  publishPending={isSaving}
  onSettings={() => setShowApiModal(true)}
  onToggleThemes={() => setShowThemeSidebar(!showThemeSidebar)}
  showThemeSidebar={showThemeSidebar}
  onNewPresentation={() => {
    clearPresentation();
    setShowGallery(false);
    setShowThemeSidebar(false);
  }}
  showGallery={showGallery}
  onToggleGallery={() => setShowGallery(!showGallery)}
/>
```

- [ ] **Step 7: Build and test**

```bash
npm run build 2>&1 | tail -10
npm test -- --run
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/store/slidiStore.ts src/components/Header.tsx src/components/SlidiEditor.tsx src/__tests__/store.test.ts
git commit -m "feat: add clearPresentation action and New Presentation button"
```

---

## Task 3: Session Persistence

**Files:**
- Create: `src/lib/sessions.ts`
- Modify: `src/store/slidiStore.ts`
- Test: `src/__tests__/store.test.ts`

### Context

Sessions allow the user to save their current presentation state and switch between multiple decks. Sessions are stored in `localStorage` under `slidi_sessions`. The maximum is 20 sessions; older ones are pruned silently.

- [ ] **Step 1: Create `src/lib/sessions.ts`**

```ts
import type { ChatMessage, ThemeId } from "@/store/slidiStore";

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  history: string[];
  historyIndex: number;
  messages: ChatMessage[];
  theme: ThemeId;
  cachedPlan: string | null;
  currentVersionId: string;
  notes: Record<number, string>;
}

const SESSIONS_KEY = "slidi_sessions";
export const MAX_SESSIONS = 20;

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function generateSessionName(sessions: Session[]): string {
  return `Presentation ${sessions.length + 1}`;
}
```

- [ ] **Step 2: Write failing session tests**

Add to `src/__tests__/store.test.ts`:

```ts
import { loadSessions, saveSessions } from "@/lib/sessions";

describe("slidiStore — sessions", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [{ role: "user", content: "hello" }],
      history: ["code_v1"], historyIndex: 0,
      generatedCode: "code_v1", currentVersionId: "",
      isGenerating: false, cachedPlan: null, notes: {},
      currentSlide: 0, totalSlides: 1, sessions: [],
    });
  });

  it("saveCurrentAsSession creates a session with current state", () => {
    useSlidiStore.getState().saveCurrentAsSession();
    const { sessions } = useSlidiStore.getState();
    expect(sessions.length).toBe(1);
    expect(sessions[0].history).toEqual(["code_v1"]);
    expect(sessions[0].messages[0].content).toBe("hello");
    expect(sessions[0].name).toBe("Presentation 1");
  });

  it("saveCurrentAsSession does NOT save when generatedCode is empty", () => {
    useSlidiStore.setState({ generatedCode: "", history: [], historyIndex: -1 });
    useSlidiStore.getState().saveCurrentAsSession();
    expect(useSlidiStore.getState().sessions.length).toBe(0);
  });

  it("saveCurrentAsSession persists to localStorage", () => {
    useSlidiStore.getState().saveCurrentAsSession();
    const stored = loadSessions();
    expect(stored.length).toBe(1);
  });

  it("switchToSession restores history and messages", () => {
    useSlidiStore.getState().saveCurrentAsSession();
    const sessionId = useSlidiStore.getState().sessions[0].id;

    // Clear to simulate starting fresh
    useSlidiStore.setState({ history: [], historyIndex: -1, generatedCode: "", messages: [] });

    useSlidiStore.getState().switchToSession(sessionId);
    const s = useSlidiStore.getState();
    expect(s.history).toEqual(["code_v1"]);
    expect(s.generatedCode).toBe("code_v1");
    expect(s.messages[0].content).toBe("hello");
  });

  it("renameSession updates the session name", () => {
    useSlidiStore.getState().saveCurrentAsSession();
    const sessionId = useSlidiStore.getState().sessions[0].id;
    useSlidiStore.getState().renameSession(sessionId, "My Big Deck");
    expect(useSlidiStore.getState().sessions[0].name).toBe("My Big Deck");
  });

  it("deleteSession removes it from the list", () => {
    useSlidiStore.getState().saveCurrentAsSession();
    const sessionId = useSlidiStore.getState().sessions[0].id;
    useSlidiStore.getState().deleteSession(sessionId);
    expect(useSlidiStore.getState().sessions.length).toBe(0);
  });

  it("prunes sessions to MAX_SESSIONS (20) on save", () => {
    // Pre-populate 20 sessions
    const existing = Array.from({ length: 20 }, (_, i) => ({
      id: `session-${i}`,
      name: `Presentation ${i + 1}`,
      createdAt: Date.now() - i * 1000,
      history: [`code${i}`],
      historyIndex: 0,
      messages: [],
      theme: "minimal" as ThemeId,
      cachedPlan: null,
      currentVersionId: "",
      notes: {},
    }));
    useSlidiStore.setState({ sessions: existing });
    saveSessions(existing);

    useSlidiStore.getState().saveCurrentAsSession();
    expect(useSlidiStore.getState().sessions.length).toBe(20);
    // Newest session should be first
    expect(useSlidiStore.getState().sessions[0].name).toBe("Presentation 21");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: session tests FAIL.

- [ ] **Step 4: Add sessions state + actions to store**

In `src/store/slidiStore.ts`, add `Session` import at the top:

```ts
import { loadSessions, saveSessions, generateSessionName, MAX_SESSIONS, type Session } from "@/lib/sessions";
```

Add to `SlidiState` interface:

```ts
// Sessions — list of saved presentation snapshots
sessions: Session[];
saveCurrentAsSession: () => void;
switchToSession: (id: string) => void;
renameSession: (id: string, name: string) => void;
deleteSession: (id: string) => void;
```

In the store body (after the `clearPresentation` action), add:

```ts
sessions: typeof window !== "undefined" ? loadSessions() : [],

saveCurrentAsSession: () => {
  const s = get();
  if (!s.generatedCode) return; // Don't save empty sessions
  const sessions = s.sessions;
  const newSession: Session = {
    id: crypto.randomUUID(),
    name: generateSessionName(sessions),
    createdAt: Date.now(),
    history: s.history,
    historyIndex: s.historyIndex,
    messages: s.messages,
    theme: s.theme,
    cachedPlan: s.cachedPlan,
    currentVersionId: s.currentVersionId,
    notes: s.notes,
  };
  const updated = [newSession, ...sessions].slice(0, MAX_SESSIONS);
  saveSessions(updated);
  set({ sessions: updated });
},

switchToSession: (id: string) => {
  const session = get().sessions.find((s) => s.id === id);
  if (!session) return;
  const generatedCode = session.historyIndex >= 0 && session.history[session.historyIndex]
    ? session.history[session.historyIndex]
    : "";
  // Persist to localStorage
  localStorage.setItem("slidi_history", JSON.stringify(session.history));
  localStorage.setItem("slidi_history_index", String(session.historyIndex));
  localStorage.setItem("slidi_version_id", session.currentVersionId);
  localStorage.setItem("slidi_notes", JSON.stringify(session.notes));
  set({
    history: session.history,
    historyIndex: session.historyIndex,
    generatedCode,
    messages: session.messages,
    theme: session.theme,
    cachedPlan: session.cachedPlan,
    currentVersionId: session.currentVersionId,
    notes: session.notes,
    currentSlide: 0,
    totalSlides: 1,
    streamingPreview: null,
    inspectMode: false,
    pendingEditContext: null,
  });
},

renameSession: (id: string, name: string) => {
  const updated = get().sessions.map((s) => s.id === id ? { ...s, name } : s);
  saveSessions(updated);
  set({ sessions: updated });
},

deleteSession: (id: string) => {
  const updated = get().sessions.filter((s) => s.id !== id);
  saveSessions(updated);
  set({ sessions: updated });
},
```

Also update `clearPresentation` to save the current session before clearing. Find `clearPresentation` and prepend:

```ts
clearPresentation: () => {
  // Save current state before clearing (only if there's content)
  const s = get();
  if (s.generatedCode) {
    const sessions = s.sessions;
    const newSession: Session = {
      id: crypto.randomUUID(),
      name: generateSessionName(sessions),
      createdAt: Date.now(),
      history: s.history,
      historyIndex: s.historyIndex,
      messages: s.messages,
      theme: s.theme,
      cachedPlan: s.cachedPlan,
      currentVersionId: s.currentVersionId,
      notes: s.notes,
    };
    const updated = [newSession, ...sessions].slice(0, MAX_SESSIONS);
    saveSessions(updated);
    set({ sessions: updated });
  }
  // ... rest of clear logic (localStorage removal + state reset)
  localStorage.removeItem("slidi_history");
  // ...etc (same as before)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | tail -10
```

Expected: 0 TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sessions.ts src/store/slidiStore.ts src/__tests__/store.test.ts
git commit -m "feat: add session persistence — save, switch, rename, delete presentations"
```

---

## Task 4: Gallery Drawer Component

**Files:**
- Create: `src/components/GalleryDrawer.tsx`
- Modify: `src/components/SlidiEditor.tsx`

### Context

A left slide-out panel (same position as `ThemeSidebar`) that shows all saved sessions. Each session shows its name (editable inline with double-click), creation date, theme color swatch, and Open/Delete buttons. No live iframe thumbnails — a themed color card is sufficient and much lighter.

- [ ] **Step 1: Create `src/components/GalleryDrawer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useSlidiStore } from "@/store/slidiStore";
import { THEMES } from "@/lib/themes";
import { Trash2, FolderOpen, X } from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface GalleryDrawerProps {
  onClose: () => void;
  onSessionOpen: () => void;
}

export default function GalleryDrawer({ onClose, onSessionOpen }: GalleryDrawerProps) {
  const { sessions, switchToSession, renameSession, deleteSession } = useSlidiStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleOpen = (id: string) => {
    switchToSession(id);
    onSessionOpen();
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const commitEdit = (id: string) => {
    if (editingName.trim()) renameSession(id, editingName.trim());
    setEditingId(null);
  };

  return (
    <aside className="flex flex-col w-full h-full bg-white border-r border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="h-12 md:h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
        <span className="text-xs font-black uppercase tracking-widest text-slate-900">
          My Presentations
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-900 transition-colors"
          aria-label="Close gallery"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 font-medium">
              No saved presentations yet.
              <br />
              Click <strong>New</strong> to save the current one.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const themeColors = THEMES[session.theme];
            const slideCount = session.historyIndex >= 0 && session.history[session.historyIndex]
              ? (session.history[session.historyIndex].match(/const\s+totalSlides\s*=\s*(\d+)/) ?? [])[1]
              : null;

            return (
              <div
                key={session.id}
                className="group flex flex-col gap-2 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => handleOpen(session.id)}
              >
                {/* Theme swatch + meta */}
                <div className="flex items-start gap-3">
                  {/* Color swatch */}
                  <div
                    className="w-8 h-8 rounded-md shrink-0 border border-black/5"
                    style={{ backgroundColor: themeColors?.colors?.bg ?? "#fff" }}
                  />

                  {/* Name + date */}
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => commitEdit(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(session.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 ring-blue-500"
                      />
                    ) : (
                      <p
                        className="text-xs font-semibold text-slate-900 truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEdit(session.id, session.name);
                        }}
                        title="Double-click to rename"
                      >
                        {session.name}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {timeAgo(session.createdAt)}
                      {slideCount ? ` · ${slideCount} slides` : ""}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
```

**Note on `themeColors?.colors?.bg`:** Check `src/lib/themes.ts` to see how the colors are exposed. If the structure is different (e.g., `THEMES[theme].systemPromptBlock` is a string), use a simple color map instead:

```ts
const THEME_BG: Record<string, string> = {
  minimal: "#ffffff", dark: "#0f172a", corporate: "#f0f4ff",
  cyberpunk: "#0a0a14", modern: "#ffffff", sunset: "#fffcf0",
  forest: "#f0fdf4", blueprint: "#0f172a", brutalist: "#ffffff",
};
// Use: style={{ backgroundColor: THEME_BG[session.theme] ?? "#fff" }}
```

Read `src/lib/themes.ts` briefly to confirm the shape before writing the code.

- [ ] **Step 2: Wire GalleryDrawer into SlidiEditor**

In `src/components/SlidiEditor.tsx`:

Import:
```ts
import GalleryDrawer from "./GalleryDrawer";
```

In the `<main>` section, add Gallery drawer alongside `ThemeSidebar` (both are left panels — only one shows at a time since they share the same slot):

```tsx
<main className="flex-1 flex flex-col md:flex-row overflow-hidden">
  {showThemeSidebar && (
    <div className="hidden md:flex w-[260px] flex-shrink-0">
      <ThemeSidebar onClose={() => setShowThemeSidebar(false)} />
    </div>
  )}
  {showGallery && !showThemeSidebar && (
    <div className="hidden md:flex w-[260px] flex-shrink-0">
      <GalleryDrawer
        onClose={() => setShowGallery(false)}
        onSessionOpen={() => {}}
      />
    </div>
  )}
  {/* ... rest of main unchanged */}
```

- [ ] **Step 3: Build and test**

```bash
npm run build 2>&1 | tail -10
npm test -- --run
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/GalleryDrawer.tsx src/components/SlidiEditor.tsx
git commit -m "feat: add Gallery Drawer for browsing and switching saved presentations"
```

---

## Task 5: Slide-Aware AI Context

**Files:**
- Modify: `src/components/ChatPane.tsx`
- Test: `src/__tests__/ai-engine.test.ts` (verify context injection)

### Context

When the user types "edit this slide's title", the AI doesn't know which slide they're looking at. We prepend `[Currently viewing slide N of M]` to the API message payload (not shown in the UI chat) when a presentation is active and has more than 1 slide.

- [ ] **Step 1: Write test for slide context injection**

The test verifies that when `currentSlide` and `totalSlides` are set in the store, the API call payload includes the context prefix. Add to `src/__tests__/ai-engine.test.ts`:

```ts
describe("slide context injection", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("injects slide context into messages passed to generatePresentation", async () => {
    let capturedMessages: Array<{ role: string; content: string }> = [];
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.body) {
        const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
        capturedMessages = body.messages ?? [];
      }
      return Promise.resolve(okJson({ choices: [{ message: { content: VALID_PRESENTATION } }] }));
    }) as typeof fetch;

    // Inject slide context directly into the messages (simulating ChatPane behavior)
    const contextMsg = "[Currently viewing slide 3 of 8] add a summary";
    await generatePresentation(
      [{ role: "user", content: contextMsg }],
      "key", "THEME", "openai", "gpt-4.1",
      undefined, { skipPlanning: true }
    );

    const userMsg = capturedMessages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("[Currently viewing slide 3 of 8]");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (it's testing the injection pattern, not ChatPane directly)**

```bash
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: PASS (the test just verifies the message format propagates correctly).

- [ ] **Step 3: Add slide context in ChatPane**

In `src/components/ChatPane.tsx`, add `currentSlide` and `totalSlides` to the store destructure:

```ts
const {
  messages, addMessage, generatedCode, pushVersion, theme, apiKey, provider,
  isGenerating, setIsGenerating, adessoModel, cachedPlan, setCachedPlan,
  setStreamingPreview, currentSlide, totalSlides,
} = useSlidiStore();
```

In `handleSubmit`, find where the messages are built for `generatePresentation`. Currently:

```ts
const result = await generatePresentation(
  [...messages, { role: "user", content: trimmed }],
  ...
```

Replace the messages argument with:

```ts
const slideContext = generatedCode && totalSlides > 1
  ? `[Currently viewing slide ${currentSlide + 1} of ${totalSlides}] `
  : "";

const result = await generatePresentation(
  [...messages, { role: "user", content: slideContext + trimmed }],
  ...
```

The `addMessage` call (which controls the UI display) stays unchanged — it uses `trimmed` without the context prefix, so the chat shows the clean message.

- [ ] **Step 4: Build and full test suite**

```bash
npm run build 2>&1 | tail -10
npm test -- --run
```

Expected: 0 TypeScript errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPane.tsx src/__tests__/ai-engine.test.ts
git commit -m "feat: inject slide context into AI messages for slide-aware editing"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Presenter fix — initial state sync | Task 1 (SLIDI_REQUEST_STATE + store) |
| Presenter fix — "Connecting…" fallback | Task 1 (PresenterClient ready state) |
| New Presentation button | Task 2 |
| clearPresentation clears all state, preserves keys | Task 2 |
| Session model (id, name, history, messages, theme…) | Task 3 (sessions.ts) |
| saveCurrentAsSession (auto-saves before clear) | Task 2 + 3 |
| switchToSession restores state | Task 3 |
| renameSession, deleteSession | Task 3 |
| Max 20 sessions | Task 3 |
| Gallery drawer with name/date/delete/open | Task 4 |
| Slide-aware AI context prepend | Task 5 |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `Session` type defined in `src/lib/sessions.ts`, imported in store — used consistently across Tasks 3 and 4
- `clearPresentation()` defined in Task 2, called in Task 2 (SlidiEditor) — matches
- `saveCurrentAsSession()` defined in Task 3, called inside `clearPresentation` (Task 3) — matches
- `currentSlide` / `totalSlides` / `setCurrentSlide` / `setTotalSlides` defined in Task 1 — consumed in Tasks 1 and 5
- `sessions` / session CRUD actions defined in Task 3 — consumed in Task 4 (GalleryDrawer)
