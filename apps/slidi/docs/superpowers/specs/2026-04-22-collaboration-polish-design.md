# Collaboration & Polish — Design Spec

**Date:** 2026-04-22  
**Cluster:** D — Collaboration & Polish  
**Features:** Version History Browser · View Count on Shared Decks · Gallery Thumbnails

---

## 1. Version History Browser

### What it does

A side drawer that lists every entry in the current presentation's `history[]` array with a human-readable timestamp, lets users preview each version by clicking it, and restore any version with a single button. Restoring replaces the current history tip with the selected version (pushes it as a new entry so undo still works).

### Problem with current state

`history[]` stores raw code strings with no metadata. There are no timestamps. We cannot retroactively add timestamps to existing entries.

### Solution

**Add timestamps to new history entries.** The `history[]` array is already persisted to localStorage. We add a parallel `historyTimestamps: number[]` array, same length, same indexing, where `historyTimestamps[i]` is the `Date.now()` when `history[i]` was pushed. Existing entries (loaded from localStorage with no timestamps) get `null` displayed as "Before history" in the UI.

**Store additions:**

```ts
historyTimestamps: number[];  // parallel array to history[]
// persisted under "slidi_history_timestamps"
```

`pushVersion` updated:

```ts
pushVersion: (code) => {
  const base = history.slice(0, historyIndex + 1);
  const baseTs = historyTimestamps.slice(0, historyIndex + 1);
  const next = [...base, code].slice(-HISTORY_CAP);
  const nextTs = [...baseTs, Date.now()].slice(-HISTORY_CAP);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  localStorage.setItem("slidi_history_timestamps", JSON.stringify(nextTs));
  set({ history: next, historyTimestamps: nextTs, historyIndex: next.length - 1, generatedCode: code });
};
```

### UI — VersionHistoryDrawer

**Access:** Clock icon in `Header.tsx` (replaces or sits next to the undo/redo controls).

**Layout:** Left-side drawer (same pattern as `GalleryDrawer`), width `w-72`.

Each row:

```
┌──────────────────────────────────┐
│ v3  •  2 minutes ago             │
│     [Preview] [Restore]          │  ← current (highlighted)
├──────────────────────────────────┤
│ v2  •  14 minutes ago            │
│     [Preview] [Restore]          │
├──────────────────────────────────┤
│ v1  •  Before history            │
│     [Preview] [Restore]          │
└──────────────────────────────────┘
```

**Preview:** Clicking "Preview" sets a local `previewIndex` state in the drawer component (not in the store). The drawer renders a `<SrcdocPreview code={history[previewIndex]} ... />` in a scaled container at the bottom of the drawer (aspect-video, ~200px tall). Closing the preview resets `previewIndex` to `null`.

**Restore:** Calls `store.pushVersion(history[selectedIndex])` — this pushes the old code as a new entry, making it the new tip. The drawer closes.

**Current version indicator:** The entry at `historyIndex` gets a `bg-blue-50 border-blue-200` highlight and a "Current" badge. "Restore" button is hidden for the current entry.

### Undo/Redo interaction

`undo()` and `redo()` move `historyIndex` but do not change `historyTimestamps`. The version list always shows all entries; the current one is highlighted by index.

---

## 2. View Count on Shared Decks

### What it does

Every time the `/view/[id]` page loads, the server increments a `view_count` column in the D1 `presentations` table. The view count is displayed as a badge on the `/view` page.

### Database change

```sql
-- migration
ALTER TABLE presentations ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
```

### API change — `/api/presentations/[id]/route.ts` (GET)

Current behaviour: fetch row, return JSON. New behaviour: also increment `view_count` before returning:

```ts
await db.prepare(
  "UPDATE presentations SET view_count = view_count + 1 WHERE id = ?"
).bind(id).run();
const row = await db.prepare("SELECT * FROM presentations WHERE id = ?").bind(id).first();
```

This is a single round-trip: update-then-select. Alternatively we can run the UPDATE and SELECT together using `RETURNING *` if D1 supports it; fallback is two queries.

Because `/view/[id]` is a server component that calls this API on render, the increment fires on every page load. Bot traffic / refresh spam is a known limitation — acceptable for an internal tool.

### UI — view page badge

In `src/app/view/[id]/page.tsx`, display the view count below the title:

```tsx
<div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
  <Eye className="w-3.5 h-3.5" />
  {data.view_count.toLocaleString()} views
</div>
```

The badge is shown only when `view_count > 0`. When the presentation is newly shared, count is 1 (the creator's first view).

### Share modal change

No change to `ShareModal.tsx` — the count is only on the public view page.

---

## 3. Gallery Thumbnails

### What it does

Each session card in `GalleryDrawer` shows a live thumbnail: a scaled-down, non-interactive `SrcdocPreview` iframe rendering the session's current code. Thumbnails are lazy-loaded via `IntersectionObserver` — only the visible cards render iframes.

### Challenge

`SrcdocPreview` is an interactive iframe (keyboard navigation, BroadcastChannel). For thumbnails we need a static, pointer-events-none, no-BroadcastChannel variant.

### Solution: `ThumbnailPreview` component

A thin wrapper around an `<iframe srcdoc={...}>` with:

- `buildSrcdoc(code, theme, null)` — reuses the existing export
- `pointer-events-none` on the iframe
- `transform: scale(...)` CSS to fit inside the card (container ~320×180, slide aspect 16:9)
- No `BroadcastChannel` — the iframe just renders, no messaging
- `loading="lazy"` attribute (limited browser support, supplemented by IntersectionObserver)

```tsx
// ThumbnailPreview.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { buildSrcdoc } from "@/components/SrcdocPreview";
import type { ThemeId } from "@/store/slidiStore";

interface Props {
  code: string;
  theme: ThemeId;
}

export default function ThumbnailPreview({ code, theme }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full aspect-video bg-slate-100 overflow-hidden relative rounded-t-xl">
      {visible && (
        <iframe
          srcdoc={buildSrcdoc(code, theme, null)}
          className="absolute inset-0 w-[200%] h-[200%] pointer-events-none"
          style={{ transform: "scale(0.5)", transformOrigin: "top left" }}
          sandbox="allow-scripts"
          title="Slide thumbnail"
        />
      )}
    </div>
  );
}
```

The `w-[200%] h-[200%] scale(0.5)` pattern renders the slide at full resolution then scales it down — avoids font size / layout issues that plague viewport-width scaling.

### GalleryDrawer integration

Each session card in `GalleryDrawer` adds `ThumbnailPreview` above the card body:

```tsx
// session card
<div className="group relative bg-white border rounded-xl overflow-hidden ...">
  <ThumbnailPreview code={session.history[session.historyIndex] ?? ""} theme={session.theme} />
  {/* existing card body */}
  <div className="p-4"> ... </div>
</div>
```

The theme swatch strip (`h-2`) is removed — the thumbnail provides the visual identity instead.

Sessions with no code (`historyIndex === -1` or empty `history[]`) render the `bg-slate-100` placeholder without an iframe.

### Performance

- IntersectionObserver ensures only visible cards mount iframes
- `buildSrcdoc` is a pure function; memoize with `useMemo(()=>buildSrcdoc(code,theme,null), [code,theme])` inside `ThumbnailPreview` to avoid rebuilding the srcdoc string on every parent render
- The drawer already has `overflow-y-auto` scroll container; only ~2-3 cards are visible at once

---

## Error Handling

- **VersionHistoryDrawer — no history:** Show empty state ("No version history yet — start generating slides") when `history.length === 0`.
- **View count — D1 not available (local dev):** The API route already has a try/catch; wrap the increment in a nested try so a missing `view_count` column doesn't 500 existing deployments.
- **Gallery thumbnails — buildSrcdoc throws:** Wrap `ThumbnailPreview` in an error boundary that renders the `bg-slate-100` placeholder on failure.

---

## Testing

- **Unit (store):** Two new tests for `historyTimestamps` — `pushVersion` appends timestamp; `undo`/`redo` do not modify timestamps.
- **Manual:** Share a deck, reload the view page twice, verify count increments; open gallery with 3+ sessions, scroll, verify thumbnails load lazily; open version history with 3 versions, preview v1, restore it, confirm it becomes tip.
- Existing 133 tests must continue to pass.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/components/ThumbnailPreview.tsx` |
| Create | `src/components/VersionHistoryDrawer.tsx` |
| Modify | `src/components/GalleryDrawer.tsx` — add ThumbnailPreview per card |
| Modify | `src/components/Header.tsx` — add history drawer toggle |
| Modify | `src/components/SlidiEditor.tsx` — wire history drawer state |
| Modify | `src/store/slidiStore.ts` — add `historyTimestamps[]`, update `pushVersion` |
| Modify | `src/app/api/presentations/[id]/route.ts` — increment view_count on GET |
| Modify | `src/app/view/[id]/page.tsx` — display view count badge |
| SQL migration | `migrations/0002_view_count.sql` — ALTER TABLE |
