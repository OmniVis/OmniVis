import { beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("@/lib/d1", () => ({
  d1Run: vi.fn(),
  d1First: vi.fn(),
  d1Query: vi.fn(),
}));

import { POST } from "@/app/api/share/route";
import { d1Run } from "@/lib/d1";

describe("POST /api/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown, contentType = "application/json") {
    return new Request("http://localhost/api/share", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/share", {
      method: "POST",
      body: "not-valid-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 when the code field is missing", async () => {
    const res = await POST(makeRequest({ notCode: "hello" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/code/);
  });

  it("returns 400 when code is a non-string type", async () => {
    const res = await POST(makeRequest({ code: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is blank / whitespace-only", async () => {
    const res = await POST(makeRequest({ code: "   " }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/empty/);
  });

  it("returns 400 when code exceeds 500 KB", async () => {
    const res = await POST(makeRequest({ code: "x".repeat(513_000) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/500 KB/);
  });

  it("inserts into D1 and returns id + url on success", async () => {
    vi.mocked(d1Run).mockResolvedValue(undefined);

    const code = "export default function P() { return null; }";
    const res = await POST(makeRequest({ code }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.id).toBe("string");
    expect(json.id.length).toBeGreaterThan(0);
    expect(json.url).toBe(`/view/${json.id}`);

    expect(d1Run).toHaveBeenCalledOnce();
    expect(d1Run).toHaveBeenCalledWith(
      "INSERT INTO presentations (id, code_content, notes, user_id, session_name) VALUES (?, ?, ?, ?, ?)",
      [json.id, code, null, null, null]
    );
  });

  it("trims whitespace from code before storing", async () => {
    vi.mocked(d1Run).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ code: "  const x = 1;  " }));
    expect(res.status).toBe(200);

    const callArgs = vi.mocked(d1Run).mock.calls[0];
    const params = callArgs ? callArgs[1] : [];
    expect(params?.[1]).toBe("const x = 1;");
  });

  it("returns 500 when d1Run throws", async () => {
    vi.mocked(d1Run).mockRejectedValue(new Error("connection reset"));

    const res = await POST(makeRequest({ code: "valid code" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Database error");
  });

  it("handles and stores optional notes", async () => {
    vi.mocked(d1Run).mockResolvedValue(undefined);

    const code = "const x = 1;";
    const notes = { 0: "Intro note", 2: "Deep dive" };
    const res = await POST(makeRequest({ code, notes }));

    expect(res.status).toBe(200);
    const json = await res.json();
    
    expect(d1Run).toHaveBeenCalledWith(
      expect.any(String),
      [json.id, code, JSON.stringify(notes), null, null]
    );
  });
});
