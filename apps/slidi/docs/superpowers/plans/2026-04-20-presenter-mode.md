# Presenter Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Presenter Mode that opens a companion window showing speaker notes, elapsed timer, and slide navigation — synced in real-time with the main presentation canvas.

**Architecture:** The generated presentation srcdoc emits `postMessage({type:'sl-slide-change', current})` on every slide change. `SrcdocPreview` relays this to a `BroadcastChannel("slidi-presenter")`. A new Next.js page at `/presenter` receives the channel messages and renders the presenter view. Speaker notes are stored per-slide-index in Zustand and persisted to localStorage.

**Tech Stack:** Next.js App Router, React 18, Zustand, BroadcastChannel API, Tailwind CSS, lucide-react

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/store/slidiStore.ts` | Modify | Add `notes: Record<number,string>`, `setNote`, `totalSlides` |
| `src/lib/prompt.ts` | Modify | Inject `sl-slide-change` postMessage into skeleton |
| `src/components/SrcdocPreview.tsx` | Modify | Listen for `sl-slide-change`, broadcast via BroadcastChannel |
| `src/app/presenter/page.tsx` | Create | Presenter view: notes editor, timer, slide counter, nav |
| `src/components/Header.tsx` | Modify | Add "Present" button that opens `/presenter` popup |
| `src/__tests__/presenter.test.ts` | Create | Unit tests for store notes, prompt postMessage injection |

---

## Task 1: Store — add notes and totalSlides

**Files:**
- Modify: `src/store/slidiStore.ts`

- [ ] **Step 1: Read `src/store/slidiStore.ts`**

- [ ] **Step 2: Add to `ChatMessage` — no changes needed. Add to `SlidiState` interface:**

```ts
// Speaker notes — per slide index
notes: Record<number, string>;
setNote: (slideIndex: number, text: string) => void;
clearNotes: () => void;

// Total slides detected from current code
totalSlides: number;
setTotalSlides: (n: number) => void;
```

- [ ] **Step 3: Add localStorage key constant near top:**

```ts
const NOTES_KEY = "slidi_notes";
```

- [ ] **Step 4: Load notes in `loadFromStorage()`:**

```ts
let notes: Record<number, string> = {};
try {
  const stored = localStorage.getItem(NOTES_KEY);
  if (stored) notes = JSON.parse(stored);
} catch { notes = {}; }
```

Add `notes` to the return type and return value of `loadFromStorage`.

- [ ] **Step 5: Add implementation to `create()` call:**

```ts
notes: loadFromStorage().notes,
setNote: (slideIndex, text) => {
  const notes = { ...get().notes, [slideIndex]: text };
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  set({ notes });
},
clearNotes: () => {
  localStorage.removeItem(NOTES_KEY);
  set({ notes: {} });
},
totalSlides: 0,
setTotalSlides: (n) => set({ totalSlides: n }),
```

- [ ] **Step 6: Run `npm run build` — 0 TypeScript errors**

- [ ] **Step 7: Run `npm test -- --run` — all tests pass**

- [ ] **Step 8: Commit**

```bash
git add src/store/slidiStore.ts
git commit -m "feat(store): add notes per slide and totalSlides to store"
```

---

## Task 2: Prompt — inject sl-slide-change postMessage

**Files:**
- Modify: `src/lib/prompt.ts`

- [ ] **Step 1: Read `src/lib/prompt.ts`**

- [ ] **Step 2: Find the keyboard handler in the skeleton (the `onKey` / `go` function). Add a postMessage call after `setCurrent`:**

Find this pattern in `BASE_PROMPT`:
```js
const go = dir => setCurrent(c => Math.min(Math.max(c + dir, 0), totalSlides - 1));
```

Replace with:
```js
const go = dir => setCurrent(c => {
  const next = Math.min(Math.max(c + dir, 0), totalSlides - 1);
  try { window.parent.postMessage({ type: 'sl-slide-change', current: next, total: totalSlides }, '*'); } catch(e) {}
  return next;
});
```

Also add an initial postMessage in `useEffect` so the presenter window knows the total on load:
```js
useEffect(() => {
  try { window.parent.postMessage({ type: 'sl-slide-change', current: 0, total: totalSlides }, '*'); } catch(e) {}
}, []);
```

Add this second useEffect to the skeleton after the keyboard useEffect.

- [ ] **Step 3: Run `npm run build` — 0 errors**

- [ ] **Step 4: Run `npm test -- --run` — all pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt.ts
git commit -m "feat(prompt): inject sl-slide-change postMessage into presentation skeleton"
```

---

## Task 3: SrcdocPreview — receive postMessage, relay via BroadcastChannel

**Files:**
- Modify: `src/components/SrcdocPreview.tsx`

- [ ] **Step 1: Read `src/components/SrcdocPreview.tsx`**

- [ ] **Step 2: Add `setTotalSlides` to the store destructuring in the component**

The component already uses `useSlidiStore`. Add:
```ts
const { ..., setTotalSlides } = useSlidiStore();
```

- [ ] **Step 3: Add a `useEffect` that listens for `sl-slide-change` postMessages and relays them:**

```ts
useEffect(() => {
  const channel = new BroadcastChannel("slidi-presenter");

  const handler = (e: MessageEvent) => {
    if (e.data?.type !== "sl-slide-change") return;
    const { current, total } = e.data as { current: number; total: number };
    if (typeof total === "number" && total > 0) setTotalSlides(total);
    channel.postMessage({ type: "sl-slide-change", current, total });
  };

  window.addEventListener("message", handler);
  return () => {
    window.removeEventListener("message", handler);
    channel.close();
  };
}, [setTotalSlides]);
```

- [ ] **Step 4: Run `npm run build` — 0 errors**

- [ ] **Step 5: Run `npm test -- --run` — all pass**

- [ ] **Step 6: Commit**

```bash
git add src/components/SrcdocPreview.tsx
git commit -m "feat(canvas): relay sl-slide-change postMessage to BroadcastChannel for presenter sync"
```

---

## Task 4: Create the Presenter page

**Files:**
- Create: `src/app/presenter/page.tsx`

- [ ] **Step 1: Create the file with this full implementation:**

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock, StickyNote } from "lucide-react";

interface SlideState {
  current: number;
  total: number;
}

export default function PresenterPage() {
  const [slide, setSlide] = useState<SlideState>({ current: 0, total: 0 });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("slidi_notes");
      if (stored) setNotes(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // BroadcastChannel sync
  useEffect(() => {
    const channel = new BroadcastChannel("slidi-presenter");
    channelRef.current = channel;
    channel.onmessage = (e) => {
      if (e.data?.type === "sl-slide-change") {
        setSlide({ current: e.data.current ?? 0, total: e.data.total ?? 0 });
      }
    };
    return () => channel.close();
  }, []);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const updateNote = (text: string) => {
    const updated = { ...notes, [slide.current]: text };
    setNotes(updated);
    try { localStorage.setItem("slidi_notes", JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const navigate = (dir: number) => {
    const next = Math.min(Math.max(slide.current + dir, 0), Math.max(slide.total - 1, 0));
    setSlide(s => ({ ...s, current: next }));
    channelRef.current?.postMessage({ type: "sl-slide-change", current: next, total: slide.total });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Presenter View</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg font-bold text-white">{formatTime(elapsed)}</span>
        </div>
        <div className="text-sm font-mono text-slate-400">
          {slide.total > 0 ? `${slide.current + 1} / ${slide.total}` : "—"}
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Slide Navigator */}
        <aside className="w-48 bg-slate-900 border-r border-slate-800 overflow-y-auto flex-shrink-0 p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Slides</p>
          {slide.total > 0
            ? Array.from({ length: slide.total }, (_, i) => (
                <button
                  key={i}
                  onClick={() => navigate(i - slide.current)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                    i === slide.current
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Slide {i + 1}
                  {notes[i] && <span className="ml-1 text-[10px] text-blue-300">✎</span>}
                </button>
              ))
            : <p className="text-xs text-slate-600 italic">Waiting for presentation…</p>
          }
        </aside>

        {/* Notes Area */}
        <main className="flex-1 flex flex-col p-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              disabled={slide.current === 0}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
              {slide.total > 0 ? `Slide ${slide.current + 1} of ${slide.total}` : "No presentation loaded"}
            </h2>
            <button
              onClick={() => navigate(1)}
              disabled={slide.current >= slide.total - 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Speaker Notes — Slide {slide.current + 1}
            </label>
            <textarea
              value={notes[slide.current] ?? ""}
              onChange={(e) => updateNote(e.target.value)}
              placeholder="Add speaker notes for this slide…"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-200 text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run `npm run build` — 0 errors**

- [ ] **Step 3: Run `npm test -- --run` — all pass**

- [ ] **Step 4: Commit**

```bash
git add src/app/presenter/page.tsx
git commit -m "feat(presenter): add presenter view page with notes, timer, and slide navigator"
```

---

## Task 5: Add Present button to Header

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Read `src/components/Header.tsx`**

- [ ] **Step 2: Add import for `MonitorPlay` icon:**

```tsx
import { ..., MonitorPlay } from "lucide-react";
```

- [ ] **Step 3: Add `generatedCode` to store destructuring (if not already there)**

- [ ] **Step 4: Add the Present button near the other action buttons in the header JSX:**

```tsx
{generatedCode && (
  <button
    onClick={() => window.open(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/presenter`,
      "slidi-presenter",
      "width=900,height=620,menubar=no,toolbar=no,location=no"
    )}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    title="Open Presenter View"
  >
    <MonitorPlay className="w-3.5 h-3.5" />
    <span>Present</span>
  </button>
)}
```

- [ ] **Step 5: Run `npm run build` — 0 errors**

- [ ] **Step 6: Run `npm test -- --run` — all pass**

- [ ] **Step 7: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(header): add Present button to launch presenter view popup"
```

---

## Task 6: Tests

**Files:**
- Create: `src/__tests__/presenter.test.ts`

- [ ] **Step 1: Create the test file:**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import { THEMES } from "@/lib/themes";

describe("presenter mode — prompt postMessage injection", () => {
  it("includes sl-slide-change postMessage in generated skeleton", () => {
    const prompt = buildPrompt(THEMES.minimal.systemPromptBlock);
    expect(prompt).toContain("sl-slide-change");
    expect(prompt).toContain("window.parent.postMessage");
  });

  it("includes total slides in postMessage payload", () => {
    const prompt = buildPrompt(THEMES.minimal.systemPromptBlock);
    expect(prompt).toContain("totalSlides");
  });
});
```

- [ ] **Step 2: Run `npm test -- --run` — all pass**

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/presenter.test.ts
git commit -m "test(presenter): verify sl-slide-change postMessage injected into prompt skeleton"
```

---

## Task 7: Final verification + push + checkpoint

- [ ] **Step 1: Run `npm run build` — 0 TypeScript errors**

- [ ] **Step 2: Run `npm test -- --run` — all tests pass**

- [ ] **Step 3: Push to main:**

```bash
git push origin main
```

- [ ] **Step 4: Write checkpoint to `.claude/memory/latest_checkpoint.md` and `.claude/memory/20-04-2026-<time>_checkpoint.md`:**

Contents must include: last commit hash, test count, what was shipped (Presenter Mode), architecture summary, and next backlog items (Golden Ratio Frontend, visual editing formatting).

- [ ] **Step 5: Update `.claude/requests/presenter_fullscreen_mode.md` status to `Implemented`**
