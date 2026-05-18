import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist the mock query function so it's available inside vi.mock factory
const mockQuery = vi.hoisted(() => vi.fn());

// Mock the db module so d1.ts never touches a real pg.Pool
vi.mock("@/lib/db", () => ({
  getPool: () => ({
    pool: { query: mockQuery },
    ready: Promise.resolve(),
  }),
}));

import { d1Query, d1First, d1Run } from "@/lib/d1";

describe("d1 pg client", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("converts ? placeholders to $1, $2, ... positional params", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await d1Query("SELECT * FROM t WHERE id = ? AND name = ?", ["abc", "def"]);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toBe("SELECT * FROM t WHERE id = $1 AND name = $2");
    expect(params).toEqual(["abc", "def"]);
  });

  it("d1Query returns all rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "1" }, { id: "2" }] });
    const result = await d1Query("SELECT * FROM t");
    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("d1Query returns [] when no rows match", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await d1Query("SELECT * FROM t WHERE 1=0");
    expect(result).toEqual([]);
  });

  it("d1First returns the first row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code_content: "hello" }, { code_content: "world" }] });
    const result = await d1First<{ code_content: string }>("SELECT code_content FROM t");
    expect(result).toEqual({ code_content: "hello" });
  });

  it("d1First returns null when result set is empty", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await d1First("SELECT * FROM t WHERE id = ?", ["nonexistent"]);
    expect(result).toBeNull();
  });

  it("d1Run resolves to undefined and ignores returned rows", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(d1Run("INSERT INTO t VALUES (?)", ["x"])).resolves.toBeUndefined();
  });

  it("d1Run converts ? to $1 for write statements", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await d1Run("DELETE FROM t WHERE id = ?", ["42"]);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toBe("DELETE FROM t WHERE id = $1");
    expect(params).toEqual(["42"]);
  });

  it("propagates pg errors to the caller", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    await expect(d1Query("SELECT 1")).rejects.toThrow("connection refused");
  });
});
