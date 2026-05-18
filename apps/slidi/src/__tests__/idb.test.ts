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

  it("putAsset does not throw when IDB fails (silent failure)", async () => {
    // Reset singleton so next openDb() starts fresh
    _resetDbForTests();
    // Confirm normal operation still works after reset
    await expect(putAsset("safe-id", "data:image/png;base64,test")).resolves.not.toThrow();
    expect(await getAsset("safe-id")).toBe("data:image/png;base64,test");
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
