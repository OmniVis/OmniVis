# Collaboration & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add version history browser with restore, view counts on shared decks, and lazy-loaded gallery thumbnails.

**Architecture:** Three independent features. Version history adds a parallel `historyTimestamps: number[]` array to the store, persisted under `slidi_history_timestamps`; a drawer renders the list and restores via `pushVersion`. View count adds `view_count` to D1 via a SQL migration and increments it in `getPresentation()` called by the view page server component. Gallery thumbnails use a `ThumbnailPreview` component with `IntersectionObserver` gating so only visible cards mount iframes.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Zustand, Tailwind CSS, lucide-react, BroadcastChannel, Cloudflare D1 (via Worker proxy)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/store/slidiStore.ts` | Add `historyTimestamps: number[]`; update `pushVersion`, `undo`, `redo`, `switchToSession`, `clearPresentation` |
| Modify | `src/lib/sessions.ts` | Add `historyTimestamps` field to `Session` interface |
| Create | `src/components/VersionHistoryDrawer.tsx` | Drawer listing history entries with preview + restore |
| Modify | `src/components/Header.tsx` | Clock icon toggles VersionHistoryDrawer |
| Modify | `src/components/SlidiEditor.tsx` | State + mount for VersionHistoryDrawer |
| Modify | `src/app/view/[id]/page.tsx` | Increment view_count; render view count badge |
| Create | `migrations/0002_view_count.sql` | ALTER TABLE to add view_count column |
| Create | `src/components/ThumbnailPreview.tsx` | IntersectionObserver-gated srcdoc iframe at 50% scale |
| Modify | `src/components/GalleryDrawer.tsx` | Add ThumbnailPreview per card; remove theme swatch strip |

---

## Task 1: Add historyTimestamps to store

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/lib/sessions.ts`

- [ ] **Step 1: Write failing tests for historyTimestamps**

Append to `src/__tests__/store.test.ts`:

```ts
describe("slidiStore — historyTimestamps", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [], history: [], historyTimestamps: [], historyIndex: -1,
      generatedCode: "", currentVersionId: "", isGenerating: false,
    });
  });

  it("pushVersion appends a timestamp", () => {
    const before = Date.now();
    useSlidiStore.getState().pushVersion("v1");
    const after = Date.now();

    const { historyTimestamps } = useSlidiStore.getState();
    expect(historyTimestamps).toHaveLength(1);
    expect(historyTimestamps[0]).toBeGreaterThanOrEqual(before);
    expect(historyTimestamps[0]).toBeLessThanOrEqual(after);
  });

  it("historyTimestamps length matches history length after multiple pushes", () => {
    const { pushVersion } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    pushVersion("v3");

    const { history, historyTimestamps } = useSlidiStore.getState();
    expect(historyTimestamps).toHaveLength(history.length);
  });

  it("undo does not modify historyTimestamps", () => {
    const { pushVersion, undo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    const tsBefore = [...useSlidiStore.getState().historyTimestamps];
    undo();
    expect(useSlidiStore.getState().historyTimestamps).toEqual(tsBefore);
  });

  it("pushVersion after undo truncates timestamps to match history", () => {
    const { pushVersion, undo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    pushVersion("v3");
    undo(); undo(); // back to v1
    pushVersion("v4");

    const { history, historyTimestamps } = useSlidiStore.getState();
    expect(historyTimestamps).toHaveLength(history.length);
    expect(history).toEqual(["v1", "v4"]);
  });

  it("persists historyTimestamps to localStorage", () => {
    useSlidiStore.getState().pushVersion("v1");
    const stored = JSON.parse(localStorage.getItem("slidi_history_timestamps") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(typeof stored[0]).toBe("number");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --run src/__tests__/store.test.ts
```

Expected: FAIL — `historyTimestamps` is undefined.

- [ ] **Step 3: Add `historyTimestamps` to `SlidiState` interface**

In `src/store/slidiStore.ts`, in the `SlidiState` interface, next to `history: string[]`:

```ts
  historyTimestamps: number[];
```

- [ ] **Step 4: Add localStorage key constant**

After the existing `const NOTES_KEY = "slidi_notes";` line, add:

```ts
const HISTORY_TIMESTAMPS_KEY = "slidi_history_timestamps";
```

- [ ] **Step 5: Load `historyTimestamps` in `loadFromStorage()`**

In the `loadFromStorage` return type declaration, add `historyTimestamps: number[];`.

Inside the function body, after the `history`/`historyIndex` load block, add:

```ts
  let historyTimestamps: number[] = [];
  try {
    const storedTs = localStorage.getItem(HISTORY_TIMESTAMPS_KEY);
    if (storedTs) historyTimestamps = JSON.parse(storedTs);
  } catch {
    historyTimestamps = [];
  }
  // Guard: if timestamps array is shorter than history (e.g. loaded from old data), pad with 0
  while (historyTimestamps.length < history.length) historyTimestamps.push(0);
```

Include `historyTimestamps` in the `return` object of `loadFromStorage`.

- [ ] **Step 6: Initialize `historyTimestamps` in the store**

In the `create<SlidiState>()((set, get) => ({` body, `...loadFromStorage()` already spreads it. No extra init needed.

- [ ] **Step 7: Update `pushVersion` to track timestamps**

Replace the `pushVersion` implementation:

```ts
  pushVersion: (code) => {
    const { history, historyIndex, historyTimestamps } = get();
    const base = history.slice(0, historyIndex + 1);
    const baseTs = historyTimestamps.slice(0, historyIndex + 1);
    const next = [...base, code].slice(-HISTORY_CAP);
    const nextTs = [...baseTs, Date.now()].slice(-HISTORY_CAP);
    const nextIndex = next.length - 1;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    localStorage.setItem(HISTORY_INDEX_KEY, String(nextIndex));
    localStorage.setItem(HISTORY_TIMESTAMPS_KEY, JSON.stringify(nextTs));
    set({ history: next, historyTimestamps: nextTs, historyIndex: nextIndex, generatedCode: code });
  },
```

- [ ] **Step 8: Update `switchToSession` to restore timestamps**

In `switchToSession`, inside the `set({...})` call, add:

```ts
      historyTimestamps: session.historyTimestamps ?? [],
```

And persist on switch — add after the existing `localStorage.setItem(NOTES_KEY, ...)` line:

```ts
    localStorage.setItem(HISTORY_TIMESTAMPS_KEY, JSON.stringify(session.historyTimestamps ?? []));
```

- [ ] **Step 9: Clear timestamps in `clearPresentation`**

In `clearPresentation`, inside the `localStorage.removeItem(...)` block, add:

```ts
    localStorage.removeItem(HISTORY_TIMESTAMPS_KEY);
```

And in the `set({...})` call:

```ts
      historyTimestamps: [],
```

- [ ] **Step 10: Add `historyTimestamps` to Session interface in `src/lib/sessions.ts`**

```ts
  historyTimestamps: number[];
```

In `clearPresentation`'s `snapshot` object, add:

```ts
      historyTimestamps: s.historyTimestamps,
```

In `saveCurrentAsSession`'s `newSession` object, add:

```ts
      historyTimestamps: s.historyTimestamps,
```

- [ ] **Step 11: Run tests**

```bash
npm test -- --run
```

Expected: All 133+ tests pass (including the 5 new `historyTimestamps` tests).

- [ ] **Step 12: Commit**

```bash
git add src/store/slidiStore.ts src/lib/sessions.ts src/__tests__/store.test.ts
git commit -m "feat: add historyTimestamps to store and session — track version timestamps"
```

---

## Task 2: VersionHistoryDrawer component

**Files:**
- Create: `src/components/VersionHistoryDrawer.tsx`

- [ ] **Step 1: Create `src/components/VersionHistoryDrawer.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { X, Clock, RotateCcw } from "lucide-react";
import { useSlidiStore } from "@/store/slidiStore";
import { buildSrcdoc } from "@/components/SrcdocPreview";

function formatTs(ts: number): string {
  if (!ts) return "Before history";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistoryDrawer({ isOpen, onClose }: VersionHistoryDrawerProps) {
  const { history, historyTimestamps, historyIndex, theme, branding, pushVersion } = useSlidiStore();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Reset preview when drawer closes
  useEffect(() => {
    if (!isOpen) setPreviewIndex(null);
  }, [isOpen]);

  const reversedEntries = history
    .map((code, i) => ({ code, ts: historyTimestamps[i] ?? 0, originalIndex: i }))
    .reverse();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] z-[101] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col border-l border-slate-100`}
      >
        {/* Header */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">
              Version History
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Clock className="w-6 h-6 text-slate-300 mb-3" />
              <p className="text-slate-900 font-bold text-sm mb-1">No version history yet</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Each generation is saved as a version you can restore.
              </p>
            </div>
          ) : (
            reversedEntries.map(({ code, ts, originalIndex }, i) => {
              const isCurrent = originalIndex === historyIndex;
              const versionNumber = history.length - i;
              const isPreviewing = previewIndex === originalIndex;
              return (
                <div
                  key={originalIndex}
                  className={`rounded-xl border p-3 transition-all ${
                    isCurrent
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-black text-slate-900">v{versionNumber}</span>
                      {isCurrent && (
                        <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTs(ts)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewIndex(isPreviewing ? null : originalIndex)}
                      className="flex-1 h-7 text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      {isPreviewing ? "Hide" : "Preview"}
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => { pushVersion(code); onClose(); }}
                        className="flex-1 h-7 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                    )}
                  </div>

                  {/* Inline preview */}
                  {isPreviewing && (
                    <div className="mt-3 w-full aspect-video overflow-hidden rounded-lg border border-slate-200 relative">
                      <iframe
                        srcDoc={buildSrcdoc(code, theme, branding)}
                        sandbox="allow-scripts"
                        className="absolute inset-0 w-[300%] h-[300%] pointer-events-none"
                        style={{ transform: "scale(0.333)", transformOrigin: "top left" }}
                        title={`Version ${versionNumber} preview`}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400">
            <span className="font-black uppercase tracking-widest">{history.length}</span> of{" "}
            <span className="font-black uppercase tracking-widest">20</span> versions stored
          </p>
        </div>
      </aside>
    </>
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
git add src/components/VersionHistoryDrawer.tsx
git commit -m "feat: add VersionHistoryDrawer with preview and restore"
```

---

## Task 3: Wire VersionHistoryDrawer into Header and SlidiEditor

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SlidiEditor.tsx`

- [ ] **Step 1: Add `showHistory` / `onToggleHistory` props to Header**

Open `src/components/Header.tsx`. In the props interface add:

```ts
  showHistory: boolean;
  onToggleHistory: () => void;
```

Import `History` from lucide-react (add to the existing lucide import). Add a History button in the header action area, next to the undo/redo controls:

```tsx
          <button
            onClick={onToggleHistory}
            title="Version History"
            className={`p-1.5 rounded-lg transition-colors ${
              showHistory
                ? "bg-blue-100 text-blue-600"
                : "text-slate-400 hover:text-slate-900"
            }`}
          >
            <History className="w-4 h-4" />
          </button>
```

- [ ] **Step 2: Wire state in SlidiEditor**

Open `src/components/SlidiEditor.tsx`. Add:

```ts
import VersionHistoryDrawer from "@/components/VersionHistoryDrawer";
```

Add state:

```ts
const [showHistory, setShowHistory] = useState(false);
```

Pass new props to `<Header>`:

```tsx
showHistory={showHistory}
onToggleHistory={() => setShowHistory((v) => !v)}
```

Mount the drawer in the return JSX (alongside other drawers):

```tsx
<VersionHistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} />
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 4: Manual test**

1. Generate two different presentations (each pushes a new history entry).
2. Click the History icon in the header.
3. Verify two entries appear with relative timestamps.
4. Click "Preview" on v1 — verify the mini-iframe renders the old code.
5. Click "Restore" on v1 — verify the canvas shows v1 and drawer closes.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/SlidiEditor.tsx
git commit -m "feat: wire VersionHistoryDrawer into Header with toggle"
```

---

## Task 4: View count — SQL migration and view page

**Files:**
- Create: `migrations/0002_view_count.sql`
- Modify: `src/app/view/[id]/page.tsx`

- [ ] **Step 1: Create the SQL migration file**

Create `migrations/0002_view_count.sql`:

```sql
-- Add view_count tracking to presentations
ALTER TABLE presentations ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Apply the migration in the Cloudflare Worker**

This migration runs against the D1 database via the Cloudflare dashboard or wrangler CLI. For local testing, the migration is skipped (d1 calls return `[]` when `WORKER_AUTH_TOKEN` is unset). No code change needed here — note the migration for deployment.

- [ ] **Step 3: Increment view_count in the view page server component**

Open `src/app/view/[id]/page.tsx`. Replace the `getPresentation` function:

```ts
interface PresentationRow {
  code_content: string;
  view_count: number;
}

async function getPresentation(id: string): Promise<PresentationRow | null> {
  try {
    // Increment first, then read — two queries via d1Run + d1First
    await d1Run(
      "UPDATE presentations SET view_count = view_count + 1 WHERE id = ?",
      [id]
    );
    const result = await d1First<PresentationRow>(
      "SELECT code_content, view_count FROM presentations WHERE id = ?",
      [id]
    );
    return result ?? null;
  } catch {
    // If view_count column doesn't exist yet (pre-migration), fall back to code_content only
    try {
      const result = await d1First<{ code_content: string }>(
        "SELECT code_content FROM presentations WHERE id = ?",
        [id]
      );
      return result ? { code_content: result.code_content, view_count: 0 } : null;
    } catch {
      return null;
    }
  }
}
```

Also add `d1Run` to the import from `@/lib/d1`:

```ts
import { d1First, d1Run } from "@/lib/d1";
```

- [ ] **Step 4: Update ViewerPage to use the new return type and show badge**

In `ViewerPage`, change:

```ts
  const code = await getPresentation(id);

  if (!code) {
```

to:

```ts
  const presentation = await getPresentation(id);

  if (!presentation) {
```

Change all uses of `code` (the variable) to `presentation.code_content`.

Add the view count badge inside the header bar, after the `<span className="text-xs font-mono text-slate-400">/ {id}</span>` line:

```tsx
          {presentation.view_count > 0 && (
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {presentation.view_count.toLocaleString()}
            </div>
          )}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass. (The D1 tests use a mock and are unaffected by the view_count increment because the `d1Run` call is wrapped in a try/catch that gracefully falls back.)

- [ ] **Step 6: Commit**

```bash
git add migrations/0002_view_count.sql src/app/view/[id]/page.tsx
git commit -m "feat: increment view_count on presentation load; show view badge on /view page"
```

---

## Task 5: ThumbnailPreview component

**Files:**
- Create: `src/components/ThumbnailPreview.tsx`

- [ ] **Step 1: Create `src/components/ThumbnailPreview.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { buildSrcdoc } from "@/components/SrcdocPreview";
import type { ThemeId, Branding } from "@/store/slidiStore";

interface ThumbnailPreviewProps {
  code: string;
  theme: ThemeId;
  branding?: Branding | null;
}

export default function ThumbnailPreview({ code, theme, branding = null }: ThumbnailPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const srcdoc = useMemo(() => {
    if (!visible || !code) return "";
    return buildSrcdoc(code, theme, branding);
  }, [visible, code, theme, branding]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-video bg-slate-100 overflow-hidden relative rounded-t-xl"
    >
      {visible && code ? (
        <iframe
          srcDoc={srcdoc}
          className="absolute inset-0 w-[200%] h-[200%] pointer-events-none select-none"
          style={{ transform: "scale(0.5)", transformOrigin: "top left" }}
          sandbox="allow-scripts"
          title="Slide thumbnail"
          tabIndex={-1}
        />
      ) : (
        /* Placeholder shown before IntersectionObserver fires */
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      )}
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
git add src/components/ThumbnailPreview.tsx
git commit -m "feat: add ThumbnailPreview — IntersectionObserver-gated scaled iframe"
```

---

## Task 6: Wire ThumbnailPreview into GalleryDrawer

**Files:**
- Modify: `src/components/GalleryDrawer.tsx`

- [ ] **Step 1: Import ThumbnailPreview**

In `src/components/GalleryDrawer.tsx`, add the import:

```ts
import ThumbnailPreview from "@/components/ThumbnailPreview";
```

- [ ] **Step 2: Add thumbnail above each session card body**

In the session card JSX, replace the theme swatch strip (`<div className="h-2 w-full" ...>`) with `ThumbnailPreview`. The current swatch is:

```tsx
                {/* Theme Swatch Header */}
                    <div
                      className="h-2 w-full"
                      style={{ backgroundColor: THEME_STYLES[session.theme]?.accent || "#6366f1" }}
                    />
```

Replace it with:

```tsx
                {/* Thumbnail */}
                {session.history.length > 0 && session.historyIndex >= 0 ? (
                  <ThumbnailPreview
                    code={session.history[session.historyIndex]}
                    theme={session.theme}
                  />
                ) : (
                  <div
                    className="w-full aspect-video rounded-t-xl"
                    style={{ backgroundColor: THEME_STYLES[session.theme]?.accent || "#6366f1", opacity: 0.15 }}
                  />
                )}
```

- [ ] **Step 3: Remove unused `THEME_STYLES` import if no longer used elsewhere in the file**

Check if `THEME_STYLES` is still used after the swatch removal. It's still used in the theme dot indicator in the card metadata row:

```tsx
<div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: THEME_STYLES[session.theme]?.accent }} />
```

Keep the import — it's still needed.

- [ ] **Step 4: Run tests**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Manual test**

1. Generate two presentations and open the gallery.
2. Verify each card shows a live thumbnail of the slide.
3. Open DevTools Network tab — verify iframes only load when cards are scrolled into view.
4. Verify the "Active" badge still shows on the current session's card.

- [ ] **Step 6: Commit**

```bash
git add src/components/GalleryDrawer.tsx
git commit -m "feat: add lazy-loaded thumbnails to gallery session cards"
```

---

## Task 7: Final integration and push

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: All 138+ tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Manual end-to-end checklist**

1. Generate two different decks → open gallery → verify thumbnails.
2. Check version history — verify v1 and v2 appear with timestamps.
3. Click Preview on v1 — verify mini-iframe renders.
4. Restore v1 — verify canvas updates.
5. Share a deck → open the `/view/[id]` URL → verify view count badge appears (if D1 is connected).
6. Reload the view page — verify count increments.

- [ ] **Step 4: Push**

```bash
git push origin main
```
