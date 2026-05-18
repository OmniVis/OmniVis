import { beforeEach, describe, it, expect } from "vitest";
import { useSlidiStore } from "@/store/slidiStore";
import { extractSessionName, generateSessionName } from "@/lib/sessions";
import type { Session, SessionMeta } from "@/lib/sessions";

function resetStore() {
  localStorage.clear();
  useSlidiStore.setState({
    keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
    apiKey: "",
    provider: "openai",
    theme: "minimal",
    messages: [],
    history: [],
    historyIndex: -1,
    generatedCode: "",
    currentVersionId: "",
    isGenerating: false,
  });
}

describe("slidiStore — pushVersion", () => {
  beforeEach(resetStore);

  it("adds code to history and sets generatedCode", () => {
    useSlidiStore.getState().pushVersion("const a = 1;");

    const { history, historyIndex, generatedCode } = useSlidiStore.getState();
    expect(history).toEqual(["const a = 1;"]);
    expect(historyIndex).toBe(0);
    expect(generatedCode).toBe("const a = 1;");
  });

  it("multiple calls append in order", () => {
    const { pushVersion } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    pushVersion("v3");

    const { history, historyIndex, generatedCode } = useSlidiStore.getState();
    expect(history).toEqual(["v1", "v2", "v3"]);
    expect(historyIndex).toBe(2);
    expect(generatedCode).toBe("v3");
  });

  it("persists history array and index to localStorage", () => {
    useSlidiStore.getState().pushVersion("hello world");

    expect(JSON.parse(localStorage.getItem("slidi_history") ?? "[]")).toEqual(["hello world"]);
    expect(localStorage.getItem("slidi_history_index")).toBe("0");
  });

  it("truncates redo history when pushing after an undo", () => {
    const { pushVersion, undo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    pushVersion("v3");
    undo();
    undo(); // now at v1

    useSlidiStore.getState().pushVersion("v4");

    const { history, historyIndex, generatedCode } = useSlidiStore.getState();
    expect(history).toEqual(["v1", "v4"]);
    expect(historyIndex).toBe(1);
    expect(generatedCode).toBe("v4");
  });

  it("caps history at 20 entries (HISTORY_CAP)", () => {
    const { pushVersion } = useSlidiStore.getState();
    for (let i = 0; i < 25; i++) pushVersion(`v${i}`);

    const { history, historyIndex, generatedCode } = useSlidiStore.getState();
    expect(history.length).toBe(20);
    expect(historyIndex).toBe(19);
    expect(generatedCode).toBe("v24");
  });
});

describe("slidiStore — undo / redo", () => {
  beforeEach(resetStore);

  it("undo moves back one version", () => {
    const { pushVersion, undo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    undo();

    const { historyIndex, generatedCode } = useSlidiStore.getState();
    expect(historyIndex).toBe(0);
    expect(generatedCode).toBe("v1");
  });

  it("redo moves forward one version", () => {
    const { pushVersion, undo, redo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    undo();
    redo();

    const { historyIndex, generatedCode } = useSlidiStore.getState();
    expect(historyIndex).toBe(1);
    expect(generatedCode).toBe("v2");
  });

  it("undo at the first entry does nothing", () => {
    useSlidiStore.getState().pushVersion("v1");
    useSlidiStore.getState().undo(); // historyIndex is 0 → no-op

    const { historyIndex, generatedCode } = useSlidiStore.getState();
    expect(historyIndex).toBe(0);
    expect(generatedCode).toBe("v1");
  });

  it("redo at the last entry does nothing", () => {
    useSlidiStore.getState().pushVersion("v1");
    useSlidiStore.getState().redo(); // already at end → no-op

    const { historyIndex, generatedCode } = useSlidiStore.getState();
    expect(historyIndex).toBe(0);
    expect(generatedCode).toBe("v1");
  });

  it("undo with empty history does nothing", () => {
    useSlidiStore.getState().undo();
    expect(useSlidiStore.getState().historyIndex).toBe(-1);
  });

  it("undo persists new index to localStorage", () => {
    const { pushVersion, undo } = useSlidiStore.getState();
    pushVersion("v1");
    pushVersion("v2");
    undo();

    expect(localStorage.getItem("slidi_history_index")).toBe("0");
  });
});

describe("slidiStore — currentVersionId", () => {
  beforeEach(resetStore);

  it("setCurrentVersionId updates store state", () => {
    useSlidiStore.getState().setCurrentVersionId("abc-123");
    expect(useSlidiStore.getState().currentVersionId).toBe("abc-123");
  });

  it("setCurrentVersionId persists to localStorage", () => {
    useSlidiStore.getState().setCurrentVersionId("xyz-456");
    expect(localStorage.getItem("slidi_version_id")).toBe("xyz-456");
  });

  it("starts with empty string when localStorage is empty", () => {
    expect(useSlidiStore.getState().currentVersionId).toBe("");
  });
});

describe("slidiStore — notes", () => {
  beforeEach(resetStore);

  it("setNote sets a note for a specific slide index", () => {
    useSlidiStore.getState().setNote(2, "Test note for slide 2");
    expect(useSlidiStore.getState().notes[2]).toBe("Test note for slide 2");
  });

  it("setNote persists to localStorage", () => {
    useSlidiStore.getState().setNote(0, "Introduction");
    const stored = JSON.parse(localStorage.getItem("slidi_notes") || "{}");
    expect(stored[0]).toBe("Introduction");
  });

  it("setNotes overrides all notes", () => {
    useSlidiStore.getState().setNotes({ 0: "Intro", 1: "Data" });
    expect(useSlidiStore.getState().notes[0]).toBe("Intro");
    expect(useSlidiStore.getState().notes[1]).toBe("Data");
  });
});

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

describe("extractSessionName", () => {
  const emptySessions: SessionMeta[] = [];

  it("extracts title from const title = '...' pattern", () => {
    const code = `const title = "Market Overview 2026";`;
    expect(extractSessionName(code, emptySessions)).toBe("Market Overview 2026");
  });

  it("extracts title from title: '...' pattern", () => {
    const code = `const slides = [{ title: "Product Launch", content: "..." }]`;
    expect(extractSessionName(code, emptySessions)).toBe("Product Launch");
  });

  it("extracts title from first <h1> tag", () => {
    const code = `return <div><h1 className="text-4xl">Annual Report</h1></div>`;
    expect(extractSessionName(code, emptySessions)).toBe("Annual Report");
  });

  it("falls back to numbered name when no title found", () => {
    const code = `const x = 42;`;
    expect(extractSessionName(code, emptySessions)).toBe("Presentation 1");
  });

  it("truncates long titles to 50 characters", () => {
    const longTitle = "A".repeat(60);
    const code = `const title = "${longTitle}";`;
    expect(extractSessionName(code, emptySessions).length).toBeLessThanOrEqual(50);
  });

  it("generateSessionName increments by session count", () => {
    const sessions: SessionMeta[] = [{ id: "1", name: "Presentation 1", createdAt: Date.now() }];
    expect(generateSessionName(sessions)).toBe("Presentation 2");
  });
});

describe("slidiStore — clearPresentation", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "my-key", provider: "anthropic", theme: "dark",
      messages: [{ role: "user", content: "hello" }],
      history: ["code1", "code2"], historyIndex: 1,
      generatedCode: "code2", currentVersionId: "abc",
      isGenerating: false, cachedPlan: "plan", notes: { 0: "note" },
      currentSlide: 3, totalSlides: 8, sessions: [], currentSessionId: null,
    });
  });

  it("resets all presentation fields", () => {
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
    expect(s.currentSessionId).toBeNull();
  });

  it("preserves API key, provider, and theme", () => {
    useSlidiStore.getState().clearPresentation();
    const s = useSlidiStore.getState();
    expect(s.apiKey).toBe("my-key");
    expect(s.provider).toBe("anthropic");
    expect(s.theme).toBe("dark");
  });

  it("creates a new session when no currentSessionId", () => {
    useSlidiStore.getState().clearPresentation();
    expect(useSlidiStore.getState().sessions.length).toBe(1);
  });

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

  it("does not save an empty session", () => {
    useSlidiStore.setState({ generatedCode: "", history: [], historyIndex: -1 });
    useSlidiStore.getState().clearPresentation();
    expect(useSlidiStore.getState().sessions.length).toBe(0);
  });
});

describe("slidiStore — currentSessionId", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [], history: ["code_v1"], historyIndex: 0,
      generatedCode: "code_v1", currentVersionId: "",
      isGenerating: false, cachedPlan: null, notes: {},
      currentSlide: 0, totalSlides: 1, currentSessionId: null,
      sessions: [{ id: "sess-1", name: "My Deck", createdAt: Date.now() }],
    });
  });

  it("starts as null", () => {
    expect(useSlidiStore.getState().currentSessionId).toBeNull();
  });

  it("switchToSession sets currentSessionId", async () => {
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

  it("clearPresentation resets currentSessionId to null", () => {
    useSlidiStore.setState({ currentSessionId: "sess-1" });
    useSlidiStore.getState().clearPresentation();
    expect(useSlidiStore.getState().currentSessionId).toBeNull();
  });
});

describe("slidiStore — broadcastGoto", () => {
  beforeEach(() => {
    localStorage.clear();
    useSlidiStore.setState({
      keys: { openai: "", anthropic: "", gemini: "", adesso: "" },
      apiKey: "", provider: "openai", theme: "minimal",
      messages: [], history: [], historyIndex: -1,
      generatedCode: "", currentVersionId: "", isGenerating: false,
      currentSlide: 2, totalSlides: 5,
    });
  });

  it("broadcastGoto is a callable function", () => {
    expect(typeof useSlidiStore.getState().broadcastGoto).toBe("function");
  });

  it("broadcastGoto does not throw when called", () => {
    expect(() => useSlidiStore.getState().broadcastGoto(3)).not.toThrow();
  });
});

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
