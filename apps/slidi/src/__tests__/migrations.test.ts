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
    const raw = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(raw[0].history).toEqual(["code v1"]);
  });

  it("migrates full sessions to IDB and strips content from localStorage", async () => {
    localStorage.setItem("slidi_sessions", OLD_FORMAT_SESSIONS);
    await migrateSessionsToIdb();

    const meta = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(meta[0].id).toBe("old-1");
    expect(meta[0].name).toBe("Old Deck");
    expect(meta[0].history).toBeUndefined();

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
    const metaOnly = JSON.stringify([{ id: "m-1", name: "Meta Only", createdAt: 999 }]);
    localStorage.setItem("slidi_sessions", metaOnly);
    await migrateSessionsToIdb();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
    const meta = JSON.parse(localStorage.getItem("slidi_sessions") || "[]");
    expect(meta[0].id).toBe("m-1");
  });

  it("sets migration flag and does not throw on corrupt JSON", async () => {
    localStorage.setItem("slidi_sessions", "NOT_JSON");
    await expect(migrateSessionsToIdb()).resolves.not.toThrow();
    expect(localStorage.getItem("slidi_idb_migrated")).toBe("1");
  });
});
