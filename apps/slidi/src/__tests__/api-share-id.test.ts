import { beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("@/lib/d1", () => ({
  d1Run: vi.fn(),
  d1First: vi.fn(),
  d1Query: vi.fn(),
}));

import { GET } from "@/app/api/share/[id]/route";
import { d1First } from "@/lib/d1";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const ANOTHER_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("GET /api/share/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeContext(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 200 with code_content when the presentation exists", async () => {
    vi.mocked(d1First).mockResolvedValue({ code_content: "const x = 1;" });

    const req = new Request(`http://localhost/api/share/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code_content).toBe("const x = 1;");
  });

  it("queries D1 with the correct SQL and id parameter", async () => {
    vi.mocked(d1First).mockResolvedValue({ code_content: "abc" });

    const req = new Request(`http://localhost/api/share/${ANOTHER_UUID}`);
    await GET(req, makeContext(ANOTHER_UUID));

    expect(d1First).toHaveBeenCalledWith(
      "SELECT code_content FROM presentations WHERE id = ?",
      [ANOTHER_UUID]
    );
  });

  it("returns 404 when the presentation is not found in D1", async () => {
    vi.mocked(d1First).mockResolvedValue(null);

    const req = new Request(`http://localhost/api/share/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 404 for a non-UUID id without touching D1", async () => {
    const req = new Request("http://localhost/api/share/not-a-uuid");
    const res = await GET(req, makeContext("not-a-uuid"));

    expect(res.status).toBe(404);
    expect(d1First).not.toHaveBeenCalled();
  });

  it("returns 404 for an empty id without touching D1", async () => {
    const req = new Request("http://localhost/api/share/");
    const res = await GET(req, makeContext(""));

    expect(res.status).toBe(404);
    expect(d1First).not.toHaveBeenCalled();
  });

  it("returns 500 when d1First throws", async () => {
    vi.mocked(d1First).mockRejectedValue(new Error("DB unavailable"));

    const req = new Request(`http://localhost/api/share/${VALID_UUID}`);
    const res = await GET(req, makeContext(VALID_UUID));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Database error");
  });
});
