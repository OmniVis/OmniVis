import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB layer so tests don't need a real Postgres connection
vi.mock("@/lib/d1", () => ({
  d1Run: vi.fn(),
  d1First: vi.fn(),
  d1Query: vi.fn(),
}));

vi.mock("@/lib/hashUserId", () => ({
  hashUserId: (id: string) => `hashed_${id}`,
}));

// Mock jsonwebtoken so we don't need a real secret
vi.mock("jsonwebtoken", () => ({
  sign: vi.fn((payload: object) => `mock_jwt_${JSON.stringify(payload)}`),
  verify: vi.fn(),
}));

import { d1First } from "@/lib/d1";
import { POST as tokenPost } from "@/app/api/collab/token/route";
import { POST as invitePost, GET as inviteGet } from "@/app/api/collab/invite/[id]/route";

const UUID = "11111111-1111-4111-a111-111111111111";
const TOKEN_UUID = "22222222-2222-4222-a222-222222222222";

function makeRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/collab/token", () => {
  it("returns 400 for missing presentationId", async () => {
    const res = await tokenPost(makeRequest({ userId: UUID }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid UUID presentationId", async () => {
    const res = await tokenPost(makeRequest({ presentationId: "not-a-uuid", userId: UUID }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing userId", async () => {
    const res = await tokenPost(makeRequest({ presentationId: UUID }));
    expect(res.status).toBe(400);
  });

  it("returns a token for valid input", async () => {
    const res = await tokenPost(makeRequest({ presentationId: UUID, userId: UUID, username: "Alice" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { token?: string };
    expect(body.token).toBeDefined();
  });

  it("strips username over 30 chars", async () => {
    const res = await tokenPost(makeRequest({ presentationId: UUID, userId: UUID, username: "A".repeat(50) }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/collab/invite/[id]", () => {
  beforeEach(() => {
    vi.mocked(d1First).mockResolvedValue({ id: UUID });
    vi.mocked(d1First as ReturnType<typeof vi.fn>).mockResolvedValue({ id: UUID });
  });

  it("returns 400 for non-UUID id", async () => {
    const res = await invitePost(makeRequest({ userId: UUID }), { params: Promise.resolve({ id: "bad" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing userId", async () => {
    const res = await invitePost(makeRequest({}), { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when presentation not found", async () => {
    vi.mocked(d1First).mockResolvedValueOnce(null);
    const res = await invitePost(makeRequest({ userId: UUID }), { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/collab/invite/[id]", () => {
  it("returns 404 for unknown token", async () => {
    vi.mocked(d1First).mockResolvedValueOnce(null);
    const res = await inviteGet(new Request("http://localhost"), { params: Promise.resolve({ id: TOKEN_UUID }) });
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired invite", async () => {
    vi.mocked(d1First).mockResolvedValueOnce({
      presentation_id: UUID,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await inviteGet(new Request("http://localhost"), { params: Promise.resolve({ id: TOKEN_UUID }) });
    expect(res.status).toBe(410);
  });

  it("returns presentationId for valid invite", async () => {
    vi.mocked(d1First).mockResolvedValueOnce({
      presentation_id: UUID,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const res = await inviteGet(new Request("http://localhost"), { params: Promise.resolve({ id: TOKEN_UUID }) });
    expect(res.status).toBe(200);
    const body = await res.json() as { presentationId?: string };
    expect(body.presentationId).toBe(UUID);
  });
});
