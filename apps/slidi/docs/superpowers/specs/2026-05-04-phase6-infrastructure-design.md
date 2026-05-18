# Phase 6 Infrastructure & Architecture Design

**Date:** 2026-05-04  
**Status:** Approved  
**Scope:** IndexedDB migration, branding asset storage, lazy loading of hidden panels

---

## Problem Statement

The current architecture stores everything in `localStorage`:
- 20-entry version history per session × up to 20 sessions = up to 400 full JSX strings (~5–20 MB total), approaching browser quota limits
- Branding logos stored as base64 strings (200–500 KB each) inside a JSON blob
- All editor panels (Gallery, Version History, Style, Settings, Branding) eagerly imported on every page load

Service workers are **not feasible** — the production URL is plain HTTP (`http://aitools.test-server.ag/slidi/`), and service workers require HTTPS or localhost.

---

## Architecture

### Approach: Metadata/Content Split (Approach A)

Keep a **thin metadata list** in `localStorage` for synchronous store initialization. Store full session content and binary assets in **IndexedDB**. This preserves instant app startup while eliminating the quota problem.

---

## Section 1: IndexedDB Layer

**File:** `src/lib/idb.ts` (new)

Single database: `slidi-db` (version 1)

| Object Store | Key | Value | Purpose |
|---|---|---|---|
| `assets` | `string` (UUID) | `string` (base64 / data URL) | Uploaded branding logos |
| `sessions` | `string` (session ID) | Full `Session` object | Presentation content |

**Public API:**

```ts
getAsset(id: string): Promise<string | undefined>
putAsset(id: string, data: string): Promise<void>
deleteAsset(id: string): Promise<void>
getSessionContent(id: string): Promise<Session | undefined>
putSessionContent(session: Session): Promise<void>
deleteSessionContent(id: string): Promise<void>
getAllSessionContents(): Promise<Session[]>
```

Implementation: lazy singleton — DB opened once on first call, reused thereafter. No third-party library (plain `indexedDB.open` API).

---

## Section 2: Session Storage Split

**Files:** `src/lib/sessions.ts` (modified), `src/store/slidiStore.ts` (modified)

### What stays in `localStorage`

```ts
interface SessionMeta {
  id: string;
  name: string;
  createdAt: number;
}
```

Key: `slidi_sessions` (same key, but now stores only metadata). Store initialization stays **synchronous** — no hydration delay.

### What moves to IndexedDB

Full session content: `history`, `historyTimestamps`, `historyIndex`, `messages`, `theme`, `cachedPlan`, `currentVersionId`, `notes`.

### Behavior changes

| Action | Before | After |
|---|---|---|
| `loadSessions()` | sync, reads full session from localStorage | sync, reads metadata only from localStorage |
| `saveSessions()` | sync, writes full session to localStorage | writes metadata to localStorage + full content to IDB (async, fire-and-forget) |
| `switchToSession(id)` | sync restore from localStorage | async: reads full content from IDB, then restores state |
| `saveCurrentAsSession()` | sync write to localStorage | writes metadata sync + full content to IDB async |
| `deleteSession(id)` | removes from localStorage | removes metadata from localStorage + content from IDB |

### One-time migration

Runs on app boot. Guard: `localStorage.getItem("slidi_idb_migrated")`.

1. Read existing `slidi_sessions` from localStorage
2. If sessions contain `history` arrays (old format): for each session, write full content to IDB, strip content from metadata
3. Overwrite `slidi_sessions` with metadata-only array
4. Set `slidi_idb_migrated = "1"`

---

## Section 3: Branding Logo Asset Storage

**Files:** `src/store/slidiStore.ts` (modified), `src/components/BrandingManager.tsx` (modified)

### Logo reference scheme

`Branding.logoUrl` values:
- `idb://<uuid>` — custom uploaded logo stored in IndexedDB
- `/slidi/assets/branding/...` — library PNG served from disk (no change)
- `data:...` — legacy base64 (migrated automatically on first render)

### Upload flow

1. User picks file in BrandingManager
2. Read as data URL (existing behavior)
3. Generate UUID, call `putAsset(uuid, dataUrl)`
4. Call `setBranding({ ...branding, logoUrl: "idb://uuid" })`

### Render flow

`useLogoUrl(logoUrl: string | undefined): string | undefined` hook:
- If `logoUrl` starts with `idb://`: calls `getAsset(id)`, returns resolved data URL (async, `undefined` while loading)
- Otherwise: returns `logoUrl` as-is (synchronous pass-through)

Used in: `BrandingManager` (preview) and `CanvasPane` / `SrcdocPreview`'s parent component.

**Important:** `buildSrcdoc` is a pure function — it cannot call a hook. The resolved data URL must be passed into it as an already-resolved string. The component that calls `buildSrcdoc` (currently `SrcdocPreview`) calls `useLogoUrl(branding?.logoUrl)` and passes the result into `buildSrcdoc` in place of the raw `branding.logoUrl`.

### Migration

On BrandingManager mount: if `branding.logoUrl?.startsWith("data:")`, automatically migrate to IDB and update store. Runs once.

---

## Section 4: Lazy Loading

**File:** `src/components/SlidiEditor.tsx` (modified)

Replace 5 eager imports with `next/dynamic`:

```ts
const GalleryDrawer        = dynamic(() => import("./GalleryDrawer"),        { ssr: false, loading: () => <PanelSkeleton /> })
const VersionHistoryDrawer = dynamic(() => import("./VersionHistoryDrawer"), { ssr: false, loading: () => <PanelSkeleton /> })
const StyleSidebar         = dynamic(() => import("./StyleSidebar"),         { ssr: false, loading: () => <PanelSkeleton /> })
const SettingsModal        = dynamic(() => import("./SettingsModal"),         { ssr: false, loading: () => <PanelSkeleton /> })
const BrandingManager      = dynamic(() => import("./BrandingManager"),       { ssr: false, loading: () => <PanelSkeleton /> })
```

`PanelSkeleton`: inline component in `SlidiEditor.tsx` — a grey rounded rectangle matching panel dimensions. Shown only during first-load (~100ms). Not extracted to a new file.

All panels are already conditionally rendered behind toggle state (`showGallery`, `showHistory`, etc.) — no other component changes needed.

---

## Error Handling

- **IDB unavailable** (private browsing, quota exceeded, browser restriction): all IDB calls wrapped in try/catch. On failure, fall back gracefully:
  - Sessions: show empty gallery with a subtle error indicator
  - Assets: show a broken-image placeholder in branding preview
  - Never crash the app
- **Migration failure**: if migration throws, set the migrated flag anyway to avoid infinite retry loops; log the error to console
- **`switchToSession` IDB miss**: if content not found in IDB (e.g. after browser data clear), fall back to empty state rather than throwing

---

## Testing

- Unit tests for `idb.ts`: put/get/delete for both stores (mock `indexedDB` with `fake-indexeddb` or similar)
- Unit test for migration utility: sessions with `history` arrays → metadata-only in localStorage + content in IDB
- Unit test for `useLogoUrl`: `idb://` prefix resolves async; plain URL passes through synchronously
- Existing store tests remain valid — `loadSessions()` signature unchanged

---

## Out of Scope

- Service worker (requires HTTPS — not available in production)
- Remote/server-side caching (app is fully local BYOK)
- Stale-While-Revalidate for the `/view/[id]` D1 route (deferred to a future phase)
