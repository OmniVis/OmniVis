# Slidi Phase 2 — Design Spec
**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

Phase 2 adds five independently deployable features on top of the Phase 1 MVP:

1. **Sharing Infrastructure** — Cloudflare D1 backend, share API, viewer page
2. **Code View** — editable Sandpack synced back to Zustand
3. **Forking** — load a shared presentation into a new editor session
4. **Themes** — Minimal/Light, Dark/Slate, Corporate/Blue style presets
5. **Undo/Redo + Auto-save** — version history in localStorage + auto-save to D1

Deployment target: Cloudflare Pages (edge runtime). Database: Cloudflare D1 (`slidi-db`, ID `be3d1d74-ba12-497e-97b4-d222c6bf432a`).

---

## Subsystem 1 — Sharing Infrastructure

### Database

**File: `schema.sql`**
```sql
CREATE TABLE IF NOT EXISTS presentations (
  id TEXT PRIMARY KEY,
  code_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Applied with:
```bash
npx wrangler d1 execute slidi-db --local --file=./schema.sql
npx wrangler d1 execute slidi-db --remote --file=./schema.sql
```

**File: `env.d.ts`** (project root)
```typescript
interface CloudflareEnv {
  DB: D1Database;
}
```

### Share API — POST

**File: `src/app/api/share/route.ts`**
- `export const runtime = 'edge'`
- Accepts `POST { code: string }`
- Validates: `code` must be a non-empty string (max 500 KB)
- Generates `crypto.randomUUID()` as `id`
- Inserts `(id, code)` into D1 `presentations` table
- Returns `{ url: "/view/<id>", id }`
- Error handling: returns 400 for invalid input, 500 for DB failure

### Share API — GET (for Forking)

**File: `src/app/api/share/[id]/route.ts`**
- `export const runtime = 'edge'`
- Accepts `GET /api/share/<id>`
- Queries D1 for `code_content` by `id`
- Returns `{ code_content }` or 404 `{ error: "Not found" }`

### Viewer Page

**File: `src/app/view/[id]/page.tsx`**
- `export const runtime = 'edge'`
- Fetches `code_content` from D1 by `params.id`
- If not found: renders a clean "Presentation not found" error page
- Layout:
  - **Slim top bar** (height ~44px): Slidi logo (slidi_background.png, 24×24), share ID in `font-mono text-xs text-slate-400`, "Fork" button (indigo, right-aligned)
  - **Sandpack** fills remaining height: `preview` view only, no editor, no console, no navigation
  - `externalResources: ["https://cdn.tailwindcss.com"]` so Tailwind classes in the presentation render correctly
- Fork button opens an inline confirmation modal (see Subsystem 3)
- No chat pane, no Header component, no API key modal

**Header toggle update (`src/components/Header.tsx`)**
- The current "Deploy" button becomes a "Publish & Share" icon button (`<Share2>` from lucide-react)
- On click: calls `POST /api/share` with `generatedCode` from store, then shows a copy-to-clipboard URL modal
- Disabled when `generatedCode` is empty

---

## Subsystem 2 — Code View

The existing Header toggle switches Sandpack between `preview` and `code-editor` modes. The only missing piece is syncing manual edits back to the store.

**File: `src/components/SandpackCanvas.tsx`**

Add a `CodeSyncBack` component (sibling to `CodeSyncer`) inside `SandpackProvider`:
```typescript
function CodeSyncBack() {
  const { sandpack } = useSandpack();
  const pushVersion = useSlidiStore((s) => s.pushVersion);
  const generatedCode = useSlidiStore((s) => s.generatedCode);

  useEffect(() => {
    const code = sandpack.files["/App.js"]?.code ?? "";
    if (code && code !== generatedCode) {
      const timer = setTimeout(() => pushVersion(code), 300);
      return () => clearTimeout(timer);
    }
  }, [sandpack.files]);
}
```

- 300ms debounce prevents thrashing on every keystroke
- Only fires when the code actually differs from the stored value (prevents loops with `CodeSyncer`)

---

## Subsystem 3 — Forking

### Viewer side

A `ForkModal` component rendered inside `src/app/view/[id]/page.tsx`:
- Triggered by the Fork button in the slim top bar
- Modal text: *"Fork this presentation into a new session? This will open the editor with a copy of this presentation."*
- Two buttons: **Cancel** (close modal) and **Fork** (navigate to `/?fork=<id>`)
- Styled consistently with the existing `ApiKeyModal` (white card, slate border, uppercase tracking)

### Editor side

**`src/components/SlidiEditor.tsx`**
- On mount, read `fork` from `useSearchParams()`
- If `fork` param present:
  1. Fetch `GET /api/share/<fork-id>`
  2. On success: call `pushVersion(data.code_content)` to load into store and history
  3. Remove `?fork=<id>` from URL via `router.replace('/')`
  4. Show a brief toast/banner: *"Forked successfully — start editing"*
- Handle error: if fetch fails, show a small error banner and clear the param

---

## Subsystem 4 — Themes

### Theme definitions

**File: `src/lib/themes.ts`**
```typescript
export type ThemeId = 'minimal' | 'dark' | 'corporate';

export interface Theme {
  id: ThemeId;
  label: string;
  systemPromptBlock: string;
  sandpackTheme: 'light' | 'dark' | 'auto';
}

export const THEMES: Record<ThemeId, Theme> = {
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    systemPromptBlock: 'Use a clean white background (#ffffff), dark slate text (#0f172a), generous whitespace, and a single thin accent line in dark slate. No drop shadows. Sans-serif typography.',
    sandpackTheme: 'light',
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    systemPromptBlock: 'Use a dark slate background (#0f172a), light text (#f1f5f9), and indigo (#6366f1) as the accent color. Subtle borders in #1e293b. Clean, modern, minimal shadows.',
    sandpackTheme: 'dark',
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    systemPromptBlock: 'Use a light blue-tinted background (#f0f4ff), navy blue headings (#1d4ed8), grey body text (#374151), and a navy top accent bar. Professional, structured layout with data bars or charts where appropriate.',
    sandpackTheme: 'light',
  },
};
```

### Store addition

**`src/store/slidiStore.ts`**
- Add `theme: ThemeId` (default `'minimal'`, persisted to `slidi_theme`)
- Add `setTheme(id: ThemeId)` action

### System prompt integration

**`src/lib/prompt.ts`**
- Export `buildPrompt(themeBlock: string): string` that prepends the theme style block to the base system prompt

**`src/lib/ai.ts`**
- Each provider call reads `theme` from the store and calls `buildPrompt(THEMES[theme].systemPromptBlock)` instead of the static `SYSTEM_PROMPT`

### Header UI

**`src/components/Header.tsx`**
- Add a compact segmented control between the Canvas/Source toggle and the Publish button: `[Minimal] [Dark] [Corporate]`
- Active theme is highlighted (white bg on slate bg, matching existing toggle style)
- Calls `setTheme(id)` on click

---

## Subsystem 5 — Undo/Redo + Auto-save

### Store changes

**`src/store/slidiStore.ts`**

Replace `setGeneratedCode` with:
```typescript
history: string[];           // persisted to slidi_history (capped at 20)
historyIndex: number;        // current position in history
currentVersionId: string;    // D1 id of the last auto-saved version

pushVersion(code: string): void;   // append to history, update generatedCode
undo(): void;                      // historyIndex--, update generatedCode
redo(): void;                      // historyIndex++, update generatedCode
setCurrentVersionId(id: string): void;
```

`generatedCode` becomes derived: always `history[historyIndex]`.

History is capped at 20 entries. Persisted as JSON to `slidi_history` and `slidi_history_index` in localStorage.

### Auto-save

**`src/components/SlidiEditor.tsx`** (or a dedicated `AutoSave.tsx` hook component)
- `useEffect` watches `generatedCode` in the store
- When it changes (and is non-empty), fires `POST /api/share` after a 1-second debounce
- On success: calls `setCurrentVersionId(id)` in the store
- Failure is silent (no error shown — auto-save is best-effort)

### Undo/redo UI

**`src/components/Header.tsx`**
- Add `<Undo2>` and `<Redo2>` icon buttons (lucide-react) to the left of the Canvas/Source toggle
- `<Undo2>` disabled when `historyIndex === 0`
- `<Redo2>` disabled when `historyIndex === history.length - 1`
- Tooltip on hover: "Undo" / "Redo"

---

## File Change Summary

| File | Action | Subsystem |
|---|---|---|
| `schema.sql` | Create | 1 |
| `env.d.ts` | Create | 1 |
| `src/app/api/share/route.ts` | Create | 1 |
| `src/app/api/share/[id]/route.ts` | Create | 1, 3 |
| `src/app/view/[id]/page.tsx` | Create | 1, 3 |
| `src/lib/themes.ts` | Create | 4 |
| `src/store/slidiStore.ts` | Modify | 4, 5 |
| `src/lib/prompt.ts` | Modify | 4 |
| `src/lib/ai.ts` | Modify | 4 |
| `src/components/Header.tsx` | Modify | 1, 4, 5 |
| `src/components/SandpackCanvas.tsx` | Modify | 2, 5 |
| `src/components/SlidiEditor.tsx` | Modify | 3, 5 |

---

## Constraints & Decisions

- **Edge runtime required** for all API routes and the viewer page (Cloudflare D1 only accessible from edge)
- **No `setGeneratedCode` callers remain** after Phase 2 — all code changes go through `pushVersion`
- **Auto-save is best-effort** — failures are silent; the share flow is explicit and shows the URL
- **Theme selector hidden on mobile** (below `md` breakpoint) to preserve header space
- **Fork confirmation modal** uses the same visual language as `ApiKeyModal` (no new design system needed)
- **History cap at 20** prevents localStorage bloat for long sessions
