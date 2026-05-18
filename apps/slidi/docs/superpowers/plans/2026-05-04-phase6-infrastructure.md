# Phase 6 Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move session content and branding logos from localStorage to IndexedDB (eliminating quota problems), and lazy-load all hidden editor panels to reduce initial bundle size.

**Architecture:** Metadata/content split — session metadata (id, name, createdAt) stays in localStorage for synchronous store init; full session content and binary logo assets are written to and read from IndexedDB on demand. A one-time migration runs on boot to move existing data. Five hidden editor panels are converted to `next/dynamic` imports.

**Tech Stack:** Plain IndexedDB API (no library), `fake-indexeddb` for tests, Vitest, Next.js `dynamic()`, Zustand.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/lib/idb.ts` | IndexedDB singleton, asset + session CRUD |
| Create | `src/lib/migrations.ts` | One-time localStorage → IDB migration |
| Create | `src/hooks/useLogoUrl.ts` | Resolve `idb://uuid` → data URL in React |
| Modify | `src/lib/sessions.ts` | Add `SessionMeta`, update `loadSessions`/`saveSessions` |
| Modify | `src/store/slidiStore.ts` | `sessions: SessionMeta[]`, async `switchToSession`, IDB writes |
| Modify | `src/components/BrandingManager.tsx` | Upload to IDB, migration on mount |
| Modify | `src/components/SrcdocPreview.tsx` | Resolve logo URL before `buildSrcdoc` |
| Modify | `src/components/SlidiEditor.tsx` | `dynamic()` for 5 panels |
| Modify | `src/__tests__/setup.ts` | Add `fake-indexeddb` polyfill |
| Create | `src/__tests__/idb.test.ts` | IDB CRUD tests |
| Create | `src/__tests__/migrations.test.ts` | Migration guard and logic tests |
| Create | `src/__tests__/useLogoUrl.test.ts` | Logo URL resolution tests |
| Modify | `src/__tests__/store.test.ts` | Update session tests to check IDB content |

---

## Task 1: IndexedDB Foundation

**Files:**
- Create: `src/lib/idb.ts`
- Modify: `src/__tests__/setup.ts`
- Create: `src/__tests__/idb.test.ts`

- [ ] **Step 1.1: Install `fake-indexeddb`**

```bash
npm install --save-dev fake-indexeddb
```

Expected: `fake-indexeddb` appears in `package.json` devDependencies.

- [ ] **Step 1.2: Add IndexedDB polyfill to test setup**

Open `src/__tests__/setup.ts` and add one line at the very top:

```ts
import "fake-indexeddb/auto";
```

Full updated file:

```ts
import "fake-indexeddb/auto";

/**
 * Global test setup — runs before each test file.
 * Polyfills localStorage and window so the Zustand store's
 * loadFromStorage() sees a browser-like environment in Node.
 */

const _store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string): string | null => _store[key] ?? null,
  setItem: (key: string, value: string): void => {
    _store[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete _store[key];
  },
  clear: (): void => {
    Object.keys(_store).forEach((k) => delete _store[k]);
  },
  get length(): number {
    return Object.keys(_store).length;
  },
  key: (_index: number): string | null => null,
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Make `typeof window !== "undefined"` true so loadFromStorage() runs
if (typeof (global as Record<string, unknown>).window === "undefined") {
  (global as Record<string, unknown>).window = global;
}
```

- [ ] **Step 1.3: Write the failing tests for `idb.ts`**

Create `src/__tests__/idb.test.ts`:

```ts
import { beforeEach, describe, it, expect } from "vitest";
import {
  getAsset,
  putAsset,
  deleteAsset,
  getSessionContent,
  putSessionContent,
  deleteSessionContent,
  getAllSessionContents,
  _resetDbForTests,
} from "@/lib/idb";
import type { Session } from "@/lib/sessions";

const SESSION_FIXTURE: Session = {
  id: "sess-abc",
  name: "Test Deck",
  createdAt: 1000,
  history: ["code v1", "code v2"],
  historyTimestamps: [100, 200],
  historyIndex: 1,
  messages: [{ role: "user", content: "hello" }],
  theme: "minimal",
  cachedPlan: null,
  currentVersionId: "ver-1",
  notes: { 0: "intro note" },
};

beforeEach(() => {
  _resetDbForTests();
});

describe("idb — assets", () => {
  it("returns undefined for a missing asset", async () => {
    expect(await getAsset("missing-id")).toBeUndefined();
  });

  it("puts and retrieves an asset", async () => {
    await putAsset("logo-1", "data:image/png;base64,abc123");
    expect(await getAsset("logo-1")).toBe("data:image/png;base64,abc123");
  });

  it("deletes an asset", async () => {
    await putAsset("logo-2", "data:image/png;base64,xyz");
    await deleteAsset("logo-2");
    expect(await getAsset("logo-2")).toBeUndefined();
  });

  it("overwriting an asset replaces the value", async () => {
    await putAsset("logo-3", "data:image/png;base64,old");
    await putAsset("logo-3", "data:image/png;base64,new");
    expect(await getAsset("logo-3")).toBe("data:image/png;base64,new");
  });
});

describe("idb — sessions", () => {
  it("returns undefined for a missing session", async () => {
    expect(await getSessionContent("no-such-id")).toBeUndefined();
  });

  it("puts and retrieves a session", async () => {
    await putSessionContent(SESSION_FIXTURE);
    const result = await getSessionContent("sess-abc");
    expect(result?.name).toBe("Test Deck");
    expect(result?.history).toEqual(["code v1", "code v2"]);
    expect(result?.notes[0]).toBe("intro note");
  });

  it("deletes a session", async () => {
    await putSessionContent(SESSION_FIXTURE);
    await deleteSessionContent("sess-abc");
    expect(await getSessionContent("sess-abc")).toBeUndefined();
  });

  it("getAllSessionContents returns empty array when nothing stored", async () => {
    expect(await getAllSessionContents()).toEqual([]);
  });

  it("getAllSessionContents returns all stored sessions", async () => {
    const second: Session = { ...SESSION_FIXTURE, id: "sess-def", name: "Second Deck" };
    await putSessionContent(SESSION_FIXTURE);
    await putSessionContent(second);
    const all = await getAllSessionContents();
    expect(all).toHaveLength(2);
    const ids = all.map((s) => s.id).sort();
    expect(ids).toEqual(["sess-abc", "sess-def"]);
  });
});
```

- [ ] **Step 1.4: Run tests — verify they FAIL**

```bash
npm test -- --run src/__tests__/idb.test.ts
```

Expected: test file fails with import errors (module doesn't exist yet).

- [ ] **Step 1.5: Implement `src/lib/idb.ts`**

```ts
import type { Session } from "@/lib/sessions";

const DB_NAME = "slidi-db";
const DB_VERSION = 1;
const ASSETS_STORE = "assets";
const SESSIONS_STORE = "sessions";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE);
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE);
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
  return dbPromise;
}

/** Reset the singleton — for use in tests only. */
export function _resetDbForTests(): void {
  dbPromise = null;
}

function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPut(store: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function idbDelete(store: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function idbGetAll<T>(store: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      })
  );
}

// ── Assets ───────────────────────────────────────────────────────────────────

export async function getAsset(id: string): Promise<string | undefined> {
  try {
    return await idbGet<string>(ASSETS_STORE, id);
  } catch {
    return undefined;
  }
}

export async function putAsset(id: string, data: string): Promise<void> {
  try {
    await idbPut(ASSETS_STORE, id, data);
  } catch {
    // fail silently — app still works, just without IDB
  }
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    await idbDelete(ASSETS_STORE, id);
  } catch {
    // fail silently
  }
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessionContent(id: string): Promise<Session | undefined> {
  try {
    return await idbGet<Session>(SESSIONS_STORE, id);
  } catch {
    return undefined;
  }
}

export async function putSessionContent(session: Session): Promise<void> {
  try {
    await idbPut(SESSIONS_STORE, session.id, session);
  } catch {
    // fail silently
  }
}

export async function deleteSessionContent(id: string): Promise<void> {
  try {
    await idbDelete(SESSIONS_STORE, id);
  } catch {
    // fail silently
  }
}

export async function getAllSessionContents(): Promise<Session[]> {
  try {
    return await idbGetAll<Session>(SESSIONS_STORE);
  } catch {
    return [];
  }
}
```

- [ ] **Step 1.6: Run tests — verify they PASS**

```bash
npm test -- --run src/__tests__/idb.test.ts
```

Expected: all 9 idb tests pass.

- [ ] **Step 1.7: Run the full test suite — verify no regressions**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 1.8: Commit**

```bash
git add src/lib/idb.ts src/__tests__/idb.test.ts src/__tests__/setup.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add IndexedDB layer for assets and session content

Lazy singleton slidi-db with two object stores: assets (logos) and
sessions (full presentation content). All operations fail silently
so IDB unavailability (private browsing) never crashes the app.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Session Storage Split

**Files:**
- Modify: `src/lib/sessions.ts`
- Modify: `src/store/slidiStore.ts`
- Modify: `src/__tests__/store.test.ts`

- [ ] **Step 2.1: Update `src/lib/sessions.ts`**

Replace the entire file content:

```ts
import type { ChatMessage, ThemeId } from "@/store/slidiStore";

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface Session extends SessionMeta {
  history: string[];
  historyTimestamps: number[];
  historyIndex: number;
  messages: ChatMessage[];
  theme: ThemeId;
  cachedPlan: string | null;
  currentVersionId: string;
  notes: Record<number, string>;
}

const SESSIONS_KEY = "slidi_sessions";
export const MAX_SESSIONS = 20;

/** Load session metadata list from localStorage (synchronous). */
export function loadSessions(): SessionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionMeta[];
  } catch {
    return [];
  }
}

/** Persist session metadata list to localStorage (synchronous). */
export function saveSessions(meta: SessionMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(meta));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function generateSessionName(sessions: SessionMeta[]): string {
  return `Presentation ${sessions.length + 1}`;
}

export function extractSessionName(code: string, sessions: SessionMeta[]): string {
  if (!code) return generateSessionName(sessions);

  const titleRegex = /(?:const\s+title\s*=\s*|title\s*:\s*)["'`]([^"'`]+)["'`](?:\s*;)?/i;
  const match = code.match(titleRegex);
  if (match && match[1]) {
    return match[1].trim().slice(0, 50);
  }

  const h1Regex = /<h1[^>]*>([^<]+)<\/h1>/i;
  const h1Match = code.match(h1Regex);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim().slice(0, 50);
  }

  return generateSessionName(sessions);
}
```

- [ ] **Step 2.2: Update `src/store/slidiStore.ts`**

Apply these changes to `slidiStore.ts`:

**At the top**, change imports:
```ts
// BEFORE:
import { loadSessions, saveSessions, generateSessionName, MAX_SESSIONS, type Session } from "@/lib/sessions";

// AFTER:
import { loadSessions, saveSessions, generateSessionName, MAX_SESSIONS, type Session, type SessionMeta } from "@/lib/sessions";
import { putSessionContent, deleteSessionContent, getSessionContent } from "@/lib/idb";
```

(The `Note: add getSessionContent` instruction later in this step is superseded by this combined import — use this single import line.)

**In `SlidiState` interface**, change:
```ts
// BEFORE:
sessions: Session[];

// AFTER:
sessions: SessionMeta[];
```

**In `saveCurrentAsSession`**, replace the whole action:
```ts
saveCurrentAsSession: () => {
  const s = get();
  if (!s.generatedCode) return;
  const sessions = s.sessions;
  const sessionId = generateUUID();
  const name = s.presentationName || generateSessionName(sessions);
  const newMeta: SessionMeta = { id: sessionId, name, createdAt: Date.now() };
  const fullSession: Session = {
    id: sessionId,
    name,
    createdAt: newMeta.createdAt,
    history: s.history,
    historyTimestamps: s.historyTimestamps ?? [],
    historyIndex: s.historyIndex,
    messages: s.messages,
    theme: s.theme,
    cachedPlan: s.cachedPlan,
    currentVersionId: s.currentVersionId,
    notes: s.notes,
  };
  const updatedMeta = [newMeta, ...sessions].slice(0, MAX_SESSIONS);
  saveSessions(updatedMeta);
  putSessionContent(fullSession);
  set({ sessions: updatedMeta });
},
```

**In `switchToSession`**, replace the whole action:
```ts
switchToSession: async (id: string) => {
  const meta = get().sessions.find((m) => m.id === id);
  if (!meta) return;
  const session = await getSessionContent(id);
  const generatedCode = session && session.historyIndex >= 0 && session.history[session.historyIndex]
    ? session.history[session.historyIndex]
    : "";
  // Persist to localStorage so a page reload restores the right state
  if (session) {
    localStorage.setItem("slidi_history", JSON.stringify(session.history));
    localStorage.setItem("slidi_history_index", String(session.historyIndex));
    localStorage.setItem("slidi_version_id", session.currentVersionId);
    localStorage.setItem("slidi_notes", JSON.stringify(session.notes));
    localStorage.setItem("slidi_history_timestamps", JSON.stringify(session.historyTimestamps ?? []));
  }
  localStorage.setItem("slidi_presentation_name", meta.name);
  set({
    history: session?.history ?? [],
    historyTimestamps: session?.historyTimestamps ?? [],
    historyIndex: session?.historyIndex ?? -1,
    presentationName: meta.name,
    generatedCode,
    messages: session?.messages ?? [],
    theme: session?.theme ?? "minimal",
    cachedPlan: session?.cachedPlan ?? null,
    currentVersionId: session?.currentVersionId ?? "",
    notes: session?.notes ?? {},
    currentSlide: 0,
    totalSlides: 1,
    streamingPreview: null,
    inspectMode: false,
    pendingEditContext: null,
    currentSessionId: id,
  });
},
```

Note: add the `getSessionContent` import at the top of the store file:
```ts
import { putSessionContent, deleteSessionContent, getSessionContent } from "@/lib/idb";
```

**In `SlidiState` interface**, also update `switchToSession` signature:
```ts
// BEFORE:
switchToSession: (id: string) => void;

// AFTER:
switchToSession: (id: string) => Promise<void>;
```

**In `renameSession`**, replace:
```ts
renameSession: (id: string, name: string) => {
  const { currentSessionId } = get();
  const updated = get().sessions.map((s) => s.id === id ? { ...s, name } : s);
  saveSessions(updated);
  const extra = currentSessionId === id ? { presentationName: name } : {};
  if (currentSessionId === id) localStorage.setItem("slidi_presentation_name", name);
  set({ sessions: updated, ...extra });
},
```

(No change needed — `sessions` is now `SessionMeta[]` and `renameSession` only touches `id` and `name`, which are both in `SessionMeta`. The action works as-is.)

**In `deleteSession`**, replace:
```ts
deleteSession: (id: string) => {
  const updated = get().sessions.filter((s) => s.id !== id);
  saveSessions(updated);
  deleteSessionContent(id);
  set({ sessions: updated });
},
```

**In `clearPresentation`**, replace the session-saving block:
```ts
clearPresentation: () => {
  const s = get();
  if (s.generatedCode) {
    const sessions = s.sessions;
    const snapshot: Omit<Session, "id" | "name" | "createdAt"> = {
      history: s.history,
      historyTimestamps: s.historyTimestamps ?? [],
      historyIndex: s.historyIndex,
      messages: s.messages,
      theme: s.theme,
      cachedPlan: s.cachedPlan,
      currentVersionId: s.currentVersionId,
      notes: s.notes,
    };
    let updatedMeta: SessionMeta[];
    if (s.currentSessionId && sessions.some((m) => m.id === s.currentSessionId)) {
      // Update in-place
      updatedMeta = sessions.map((m) => m); // metadata unchanged
      const existing = sessions.find((m) => m.id === s.currentSessionId)!;
      putSessionContent({ ...existing, ...snapshot });
    } else {
      const id = generateUUID();
      const name = s.presentationName || generateSessionName(sessions);
      const newMeta: SessionMeta = { id, name, createdAt: Date.now() };
      const fullSession: Session = { id, name, createdAt: newMeta.createdAt, ...snapshot };
      updatedMeta = [newMeta, ...sessions].slice(0, MAX_SESSIONS);
      putSessionContent(fullSession);
    }
    saveSessions(updatedMeta);
    set({ sessions: updatedMeta });
  }

  localStorage.removeItem("slidi_history");
  localStorage.removeItem("slidi_history_index");
  localStorage.removeItem("slidi_version_id");
  localStorage.removeItem("slidi_notes");
  localStorage.removeItem("slidi_history_timestamps");
  localStorage.removeItem("slidi_presentation_name");
  set({
    messages: [],
    history: [],
    historyTimestamps: [],
    historyIndex: -1,
    generatedCode: "",
    currentVersionId: "",
    presentationName: "",
    cachedPlan: null,
    streamingPreview: null,
    notes: {},
    currentSlide: 0,
    totalSlides: 1,
    inspectMode: false,
    pendingEditContext: null,
    currentSessionId: null,
  });
},
```

**In `pushVersion`**, replace the session sync block at the bottom:
```ts
// Sync to active session if exists
const s = get();
if (s.currentSessionId) {
  const meta = s.sessions.find((m) => m.id === s.currentSessionId);
  if (meta) {
    putSessionContent({
      id: meta.id,
      name: meta.name,
      createdAt: meta.createdAt,
      history: next,
      historyTimestamps: nextTs,
      historyIndex: nextIndex,
      messages: s.messages,
      theme: s.theme,
      cachedPlan: s.cachedPlan,
      currentVersionId: s.currentVersionId,
      notes: s.notes,
    });
    // Metadata unchanged (name/createdAt don't change on version push)
    saveSessions(s.sessions);
  }
}
```

**In `setPresentationName`**, replace the session sync block:
```ts
setPresentationName: (name: string) => {
  localStorage.setItem("slidi_presentation_name", name);
  set({ presentationName: name });
  const { currentSessionId, sessions, history, historyIndex, historyTimestamps, messages, theme, cachedPlan, currentVersionId, notes } = get();
  if (currentSessionId) {
    const meta = sessions.find((m) => m.id === currentSessionId);
    if (meta) {
      const updatedMeta = sessions.map((m) => m.id === currentSessionId ? { ...m, name } : m);
      saveSessions(updatedMeta);
      set({ sessions: updatedMeta });
      putSessionContent({
        id: currentSessionId,
        name,
        createdAt: meta.createdAt,
        history,
        historyTimestamps: historyTimestamps ?? [],
        historyIndex,
        messages,
        theme,
        cachedPlan,
        currentVersionId,
        notes,
      });
    }
  }
},
```

- [ ] **Step 2.3: Update `src/__tests__/store.test.ts` — fix session tests**

Find the `"slidiStore — Library Auto-Sync"` describe block and replace it:

```ts
describe("slidiStore — Library Auto-Sync", () => {
  beforeEach(async () => {
    localStorage.clear();
    const mockMeta = { id: "sess-1", name: "Old Name", createdAt: Date.now() };
    const mockSession: Session = {
      ...mockMeta,
      history: ["old code"],
      historyIndex: 0,
      historyTimestamps: [],
      messages: [],
      theme: "minimal",
      cachedPlan: null,
      currentVersionId: "ver-1",
      notes: {},
    };
    // Pre-populate IDB with the session content
    const { putSessionContent } = await import("@/lib/idb");
    await putSessionContent(mockSession);
    useSlidiStore.setState({
      sessions: [mockMeta],
      currentSessionId: "sess-1",
      presentationName: "Old Name",
      history: ["old code"],
      historyIndex: 0,
      generatedCode: "old code",
      currentVersionId: "ver-1",
      messages: [],
      theme: "minimal",
      cachedPlan: null,
      notes: {},
    });
  });

  it("pushVersion automatically updates session content in IDB", async () => {
    useSlidiStore.getState().pushVersion("new code");
    // Give the fire-and-forget IDB write a tick to complete
    await new Promise((r) => setTimeout(r, 0));

    const { getSessionContent } = await import("@/lib/idb");
    const content = await getSessionContent("sess-1");
    expect(content?.history).toContain("new code");
    expect(content?.historyIndex).toBe(1);
  });

  it("setPresentationName updates metadata in sessions array and IDB content", async () => {
    useSlidiStore.getState().setPresentationName("New Awesome Name");
    await new Promise((r) => setTimeout(r, 0));

    const { sessions, presentationName } = useSlidiStore.getState();
    expect(presentationName).toBe("New Awesome Name");
    expect(sessions[0].name).toBe("New Awesome Name");

    const { getSessionContent } = await import("@/lib/idb");
    const content = await getSessionContent("sess-1");
    expect(content?.name).toBe("New Awesome Name");
  });

  it("updates session theme in IDB when setPresentationName is called", async () => {
    useSlidiStore.setState({ theme: "dark" as any });
    useSlidiStore.getState().setPresentationName("Synced Name");
    await new Promise((r) => setTimeout(r, 0));

    const { getSessionContent } = await import("@/lib/idb");
    const content = await getSessionContent("sess-1");
    expect(content?.theme).toBe("dark");
  });
});
```

Also update the `"slidiStore — currentSessionId"` describe block's `switchToSession` test — `switchToSession` is now async:

```ts
it("switchToSession sets currentSessionId", async () => {
  // Pre-populate IDB content for sess-1
  const { putSessionContent } = await import("@/lib/idb");
  await putSessionContent({
    id: "sess-1", name: "My Deck", createdAt: Date.now(),
    history: ["code_v1"], historyIndex: 0, historyTimestamps: [],
    messages: [{ role: "user", content: "hello" }],
    theme: "minimal", cachedPlan: null, currentVersionId: "", notes: {},
  });
  await useSlidiStore.getState().switchToSession("sess-1");
  expect(useSlidiStore.getState().currentSessionId).toBe("sess-1");
});
```

Also update the `clearPresentation` test that checks `sessions[0].history`:

```ts
it("updates the existing session when currentSessionId is set", async () => {
  const existingMeta = {
    id: "session-abc",
    name: "My Deck",
    createdAt: Date.now() - 5000,
  };
  const { putSessionContent, getSessionContent } = await import("@/lib/idb");
  await putSessionContent({
    ...existingMeta,
    history: ["old_code"],
    historyIndex: 0,
    historyTimestamps: [],
    messages: [],
    theme: "minimal",
    cachedPlan: null,
    currentVersionId: "old-ver",
    notes: {},
  });
  useSlidiStore.setState({ sessions: [existingMeta], currentSessionId: "session-abc" });
  useSlidiStore.getState().clearPresentation();
  await new Promise((r) => setTimeout(r, 0));

  const { sessions } = useSlidiStore.getState();
  expect(sessions.length).toBe(1);
  expect(sessions[0].id).toBe("session-abc");

  const content = await getSessionContent("session-abc");
  expect(content?.history).toEqual(["code1", "code2"]);
  expect(content?.name).toBe("My Deck");
});
```

- [ ] **Step 2.4: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass. If a test fails, read the error carefully — it will point to a type mismatch or missing IDB setup.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/sessions.ts src/store/slidiStore.ts src/__tests__/store.test.ts
git commit -m "$(cat <<'EOF'
feat: split session storage — metadata in localStorage, content in IDB

Sessions array in the store now holds only SessionMeta (id, name,
createdAt) for instant synchronous initialization. Full session
content is written to IndexedDB and loaded on demand by switchToSession.
Eliminates the localStorage quota risk from storing 400+ JSX history
entries.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: One-Time Migration

**Files:**
- Create: `src/lib/migrations.ts`
- Modify: `src/components/SlidiEditor.tsx` (wire migration on mount)
- Create: `src/__tests__/migrations.test.ts`

- [ ] **Step 3.1: Write failing migration tests**

Create `src/__tests__/migrations.test.ts`:

```ts
import { beforeEach, describe, it, expect } from "vitest";
import { migrateSessionsToIdb } from "@/lib/migrations";
import { getSessionContent, _resetDbForTests } from "@/lib/idb";

const OLD_FORMAT_SESSIONS = JSON.stringify([
  {
    id: "old-1",
    name: "Old Deck",
    createdAt: 1000,
    history: ["code v1"],
    historyTimestamps: [100],
    historyIndex: 0,
    messages: [],
    theme: "minimal",
    cachedPlan: null,
    currentVersionId: "ver-1",
    notes: {},
  },
]);

beforeEach(() => {
  localStorage.clear();
  _resetDbForTests();
});

describe("migrateSessionsToIdb", () => {
  it("does nothing if migration flag is already set", async () => {
    localStorage.setItem("slidi_idb_migrated", "1");
    localStorage.setItem("slidi_sessions", OLD_FORMAT_SESSIONS);
    await migrateSessionsToIdb();
    // sessions localStorage should be untouched (still old format)
    const raw = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(raw[0].history).toEqual(["code v1"]);
  });

  it("migrates full sessions to IDB and strips content from localStorage", async () => {
    localStorage.setItem("slidi_sessions", OLD_FORMAT_SESSIONS);
    await migrateSessionsToIdb();

    // localStorage should now have metadata only
    const meta = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(meta[0].id).toBe("old-1");
    expect(meta[0].name).toBe("Old Deck");
    expect(meta[0].history).toBeUndefined();

    // IDB should have full content
    const content = await getSessionContent("old-1");
    expect(content?.history).toEqual(["code v1"]);
    expect(content?.name).toBe("Old Deck");
  });

  it("sets the migration flag after running", async () => {
    localStorage.setItem("slidi_sessions", OLD_FORMAT_SESSIONS);
    await migrateSessionsToIdb();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
  });

  it("sets migration flag even if sessions is empty", async () => {
    await migrateSessionsToIdb();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
  });

  it("sets migration flag even if localStorage has already-migrated metadata", async () => {
    // Already-migrated format: no history field
    const metaOnly = JSON.stringify([{ id: "m-1", name: "Meta Only", createdAt: 999 }]);
    localStorage.setItem("slidi_sessions", metaOnly);
    await migrateSessionsToIdb();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
    // localStorage unchanged (no history to strip)
    const meta = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(meta[0].id).toBe("m-1");
  });

  it("sets migration flag and logs on error (no infinite retry)", async () => {
    // Corrupt sessions JSON — should not throw
    localStorage.setItem("slidi_sessions", "NOT_JSON");
    await expect(migrateSessionsToIdb()).resolves.not.toThrow();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
  });
});
```

- [ ] **Step 3.2: Run tests — verify they FAIL**

```bash
npm test -- --run src/__tests__/migrations.test.ts
```

Expected: fails with import error (module doesn't exist).

- [ ] **Step 3.3: Implement `src/lib/migrations.ts`**

```ts
import { putSessionContent } from "@/lib/idb";
import type { Session } from "@/lib/sessions";

const MIGRATION_KEY = "slidi_idb_migrated";
const SESSIONS_KEY = "slidi_sessions";

export async function migrateSessionsToIdb(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "1") return;

  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return;

    const sessions: (Session & { history?: string[] })[] = JSON.parse(raw);
    const hasContent = sessions.some((s) => Array.isArray(s.history));

    if (hasContent) {
      // Write full content to IDB
      await Promise.all(sessions.map((s) => putSessionContent(s as Session)));
      // Overwrite localStorage with metadata only
      const meta = sessions.map(({ id, name, createdAt }) => ({ id, name, createdAt }));
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(meta));
    }
  } catch (err) {
    console.error("[slidi] IDB session migration failed:", err);
  } finally {
    localStorage.setItem(MIGRATION_KEY, "1");
  }
}
```

- [ ] **Step 3.4: Run migration tests — verify they PASS**

```bash
npm test -- --run src/__tests__/migrations.test.ts
```

Expected: all 6 migration tests pass.

- [ ] **Step 3.5: Wire migration into app boot**

In `src/components/SlidiEditor.tsx`, add the import near the top:

```ts
import { migrateSessionsToIdb } from "@/lib/migrations";
```

Inside `SlidiEditorInner`, add a `useEffect` right after the existing state declarations (before the broadcast channel setup):

```tsx
// Run once on mount — migrates localStorage sessions to IndexedDB
useEffect(() => {
  migrateSessionsToIdb();
}, []);
```

- [ ] **Step 3.6: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3.7: Commit**

```bash
git add src/lib/migrations.ts src/__tests__/migrations.test.ts src/components/SlidiEditor.tsx
git commit -m "$(cat <<'EOF'
feat: add one-time IDB migration for existing localStorage sessions

Runs on app boot (guarded by slidi_idb_migrated flag). Detects old
full-session format in localStorage, writes content to IDB, strips
content to metadata-only. Safe to run multiple times.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Branding Logo Asset Storage

**Files:**
- Create: `src/hooks/useLogoUrl.ts`
- Modify: `src/components/BrandingManager.tsx`
- Modify: `src/components/SrcdocPreview.tsx`
- Create: `src/__tests__/useLogoUrl.test.ts`

- [ ] **Step 4.1: Write failing tests for logo URL resolution**

Create `src/__tests__/useLogoUrl.test.ts`:

```ts
import { beforeEach, describe, it, expect } from "vitest";
import { resolveLogoUrl } from "@/hooks/useLogoUrl";
import { putAsset, _resetDbForTests } from "@/lib/idb";

beforeEach(() => {
  _resetDbForTests();
});

describe("resolveLogoUrl", () => {
  it("passes through undefined", async () => {
    expect(await resolveLogoUrl(undefined)).toBeUndefined();
  });

  it("passes through a plain HTTP URL", async () => {
    const url = "/slidi/assets/branding/logo.png";
    expect(await resolveLogoUrl(url)).toBe(url);
  });

  it("passes through a data: URL", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    expect(await resolveLogoUrl(dataUrl)).toBe(dataUrl);
  });

  it("resolves an idb:// URL by fetching from IndexedDB", async () => {
    await putAsset("logo-uuid-1", "data:image/png;base64,resolvedData");
    expect(await resolveLogoUrl("idb://logo-uuid-1")).toBe("data:image/png;base64,resolvedData");
  });

  it("returns undefined for a missing idb:// reference", async () => {
    expect(await resolveLogoUrl("idb://nonexistent-id")).toBeUndefined();
  });
});
```

- [ ] **Step 4.2: Run tests — verify they FAIL**

```bash
npm test -- --run src/__tests__/useLogoUrl.test.ts
```

Expected: fails with import error.

- [ ] **Step 4.3: Implement `src/hooks/useLogoUrl.ts`**

```ts
import { useState, useEffect } from "react";
import { getAsset } from "@/lib/idb";

/**
 * Resolves a logo URL reference to an actual displayable URL.
 * - `idb://<uuid>` → fetches data URL from IndexedDB (async)
 * - Any other string → returned as-is (synchronous)
 * - `undefined` → returns `undefined`
 */
export function useLogoUrl(logoUrl: string | undefined): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!logoUrl || !logoUrl.startsWith("idb://")) return logoUrl;
    return undefined; // will be fetched async
  });

  useEffect(() => {
    if (!logoUrl || !logoUrl.startsWith("idb://")) {
      setResolved(logoUrl);
      return;
    }
    const id = logoUrl.slice("idb://".length);
    let cancelled = false;
    resolveLogoUrl(logoUrl).then((data) => {
      if (!cancelled) setResolved(data);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  return resolved;
}

/** Pure async resolver — usable in tests and non-React contexts. */
export async function resolveLogoUrl(logoUrl: string | undefined): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.startsWith("idb://")) return logoUrl;
  const id = logoUrl.slice("idb://".length);
  return getAsset(id);
}
```

- [ ] **Step 4.4: Run useLogoUrl tests — verify they PASS**

```bash
npm test -- --run src/__tests__/useLogoUrl.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 4.5: Update `BrandingManager.tsx` — upload to IDB + migrate legacy base64**

Add imports at the top of `BrandingManager.tsx` (after existing imports):

```ts
import { putAsset } from "@/lib/idb";
import { useLogoUrl } from "@/hooks/useLogoUrl";
```

Replace `handleLogoUpload` (currently at line ~45):

```ts
const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = async () => {
    const dataUrl = reader.result as string;
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    await putAsset(id, dataUrl);
    setLogoUrl(`idb://${id}`);
  };
  reader.readAsDataURL(file);
};
```

Add a migration `useEffect` directly after the existing `useEffect(() => { fetchPresets(); }, [])`:

```tsx
// One-time migration: if existing branding stores a base64 logo, move it to IDB
useEffect(() => {
  const existingLogoUrl = branding?.logoUrl;
  if (existingLogoUrl?.startsWith("data:")) {
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    putAsset(id, existingLogoUrl).then(() => {
      const idbRef = `idb://${id}`;
      setLogoUrl(idbRef);
      setBranding({ ...branding!, logoUrl: idbRef });
    });
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // run once on mount
```

Add logo URL resolution after the `const BASE = ...` line:

```tsx
const resolvedLogoUrl = useLogoUrl(logoUrl) ?? logoUrl;
```

Replace the two `<img src={logoUrl}>` logo preview elements with `src={resolvedLogoUrl}`:

**Line ~151** (small upload preview thumbnail):
```tsx
// BEFORE:
<img src={logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
// AFTER:
<img src={resolvedLogoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
```

**Lines ~289–294** (badge preview block):
```tsx
// BEFORE:
{showLogo && (
  <img 
    src={logoUrl} 
    alt="" 
    className="w-auto object-contain" 
    style={{ height: type === 'image' ? (size === 'small' ? '24px' : size === 'medium' ? '40px' : '60px') : '16px' }} 
  />
)}
// AFTER:
{showLogo && (
  <img 
    src={resolvedLogoUrl} 
    alt="" 
    className="w-auto object-contain" 
    style={{ height: type === 'image' ? (size === 'small' ? '24px' : size === 'medium' ? '40px' : '60px') : '16px' }} 
  />
)}

- [ ] **Step 4.6: Update `SrcdocPreview.tsx` — resolve logo before `buildSrcdoc`**

Add import near the top of `SrcdocPreview.tsx` (alongside other imports):

```ts
import { useLogoUrl } from "@/hooks/useLogoUrl";
```

`SrcdocPreview` receives `branding` as a prop (it is **not** read from the store here). Add logo resolution immediately before the `useMemo` at line ~819:

```tsx
const resolvedLogoUrl = useLogoUrl(branding?.logoUrl);
```

Replace the `useMemo` at lines 819–824 with:

```tsx
// Memoized srcdoc — 5-regex pass only reruns when inputs actually change.
const srcdoc = useMemo(
  () => {
    const resolvedBranding = branding
      ? { ...branding, logoUrl: resolvedLogoUrl }
      : null;
    return buildSrcdoc(code, theme, resolvedBranding);
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [code, theme, resolvedLogoUrl, branding?.id, branding?.name, branding?.display,
   branding?.position, branding?.type, branding?.size, branding?.sizePercentage, branding?.padding]
);
```

- [ ] **Step 4.7: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4.8: Commit**

```bash
git add src/hooks/useLogoUrl.ts src/__tests__/useLogoUrl.test.ts src/components/BrandingManager.tsx src/components/SrcdocPreview.tsx
git commit -m "$(cat <<'EOF'
feat: store branding logos in IndexedDB instead of localStorage

Upload handler writes to IDB under idb://<uuid> reference. Legacy
base64 logos auto-migrate to IDB on BrandingManager mount. useLogoUrl
hook resolves idb:// references async; SrcdocPreview uses resolved URL
before calling buildSrcdoc to prevent broken <img> in srcdoc.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Lazy Load Hidden Editor Panels

**Files:**
- Modify: `src/components/SlidiEditor.tsx`

- [ ] **Step 5.1: Convert eager imports to `dynamic()` in `SlidiEditor.tsx`**

At the top of `SlidiEditor.tsx`, add:

```ts
import dynamic from "next/dynamic";
```

Remove these static imports:

```ts
// DELETE these lines:
import GalleryDrawer from "./GalleryDrawer";
import VersionHistoryDrawer from "./VersionHistoryDrawer";
import StyleSidebar from "./StyleSidebar";
import SettingsModal from "./SettingsModal";
```

Note: `BrandingManager` is already dynamically referenced via `SlidiEditor` — check whether it's statically imported; if so, remove that import too.

Add a `PanelSkeleton` component and dynamic imports right after the remaining static imports (but before the component functions):

```tsx
function PanelSkeleton() {
  return <div className="fixed inset-y-0 right-0 w-80 bg-slate-100 animate-pulse" />;
}

const GalleryDrawer = dynamic(() => import("./GalleryDrawer"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const VersionHistoryDrawer = dynamic(() => import("./VersionHistoryDrawer"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const StyleSidebar = dynamic(() => import("./StyleSidebar"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const SettingsModal = dynamic(() => import("./SettingsModal"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
const BrandingManager = dynamic(() => import("./BrandingManager"), {
  ssr: false,
  loading: () => <PanelSkeleton />,
});
```

- [ ] **Step 5.2: Verify the build succeeds**

```bash
npm run build
```

Expected: build completes without errors. The output should show separate chunks for the dynamically imported components.

- [ ] **Step 5.3: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass (lazy loading doesn't affect test output).

- [ ] **Step 5.4: Commit**

```bash
git add src/components/SlidiEditor.tsx
git commit -m "$(cat <<'EOF'
perf: lazy-load all hidden editor panels with next/dynamic

GalleryDrawer, VersionHistoryDrawer, StyleSidebar, SettingsModal, and
BrandingManager are now code-split. They load on first open (~100ms)
and are cached by the browser thereafter. PanelSkeleton shows during
the first load.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Done Criteria

- [ ] `npm test -- --run` passes all tests (was 156, now ~170 with new tests)
- [ ] `npm run build` succeeds
- [ ] `slidi_sessions` in localStorage contains only `[{ id, name, createdAt }]` arrays (no `history`)
- [ ] Uploading a custom logo stores `idb://<uuid>` in `Branding.logoUrl` (verify in DevTools → Application → IndexedDB → slidi-db → assets)
- [ ] Opening a session loads its content from IDB (verify in DevTools → Application → IndexedDB → slidi-db → sessions)
- [ ] Browser DevTools → Network tab shows JS chunks for GalleryDrawer etc. loading only when panels are first opened
