import { describe, it, expect, beforeEach } from "vitest";
import { logUsage, getUsageHistory, clearUsageHistory, computeCost } from "@/lib/usageTracker";

// Minimal localStorage mock
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  writable: true,
});

describe("computeCost", () => {
  it("computes correct cost for gpt-4o", () => {
    // 1M input ($2.50) + 1M output ($10.00) = $12.50
    expect(computeCost("gpt-4o", 1_000_000, 1_000_000)).toBeCloseTo(12.5);
  });

  it("returns 0 for unknown model", () => {
    expect(computeCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("computes partial token counts correctly for gpt-4o", () => {
    // 8 000 input * $2.50/1M = $0.02; 6 000 output * $10/1M = $0.06 → total $0.08
    expect(computeCost("gpt-4o", 8_000, 6_000)).toBeCloseTo(0.08);
  });

  it("computes cost for claude-sonnet-4-6", () => {
    // 1M input ($3.00) + 1M output ($15.00) = $18.00
    expect(computeCost("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBeCloseTo(18.0);
  });

  it("computes cost for gemini-2.0-flash", () => {
    // 1M input ($0.15) + 1M output ($3.50) = $3.65
    expect(computeCost("gemini-2.0-flash", 1_000_000, 1_000_000)).toBeCloseTo(3.65);
  });
});

describe("usageTracker storage", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("getUsageHistory returns empty array when nothing stored", () => {
    expect(getUsageHistory()).toEqual([]);
  });

  it("logUsage stores a new entry", () => {
    logUsage({ timestamp: Date.now(), provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 1000, outputTokens: 500 });
    const history = getUsageHistory();
    expect(history).toHaveLength(1);
    expect(history[0].provider).toBe("openai");
    expect(history[0].operation).toBe("generate");
    expect(history[0].costUsd).toBeGreaterThan(0);
    expect(history[0].id).toBeTruthy();
  });

  it("logUsage prepends entries (newest first)", () => {
    logUsage({ timestamp: 1, provider: "openai",    model: "gpt-4o",            operation: "generate", inputTokens: 100, outputTokens: 100 });
    logUsage({ timestamp: 2, provider: "anthropic", model: "claude-sonnet-4-6", operation: "edit",     inputTokens: 200, outputTokens: 200 });
    const history = getUsageHistory();
    expect(history[0].provider).toBe("anthropic");
    expect(history[1].provider).toBe("openai");
  });

  it("caps history at 100 entries", () => {
    for (let i = 0; i < 110; i++) {
      logUsage({ timestamp: i, provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 100, outputTokens: 100 });
    }
    expect(getUsageHistory()).toHaveLength(100);
  });

  it("clearUsageHistory removes all entries", () => {
    logUsage({ timestamp: Date.now(), provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 100, outputTokens: 100 });
    clearUsageHistory();
    expect(getUsageHistory()).toEqual([]);
  });
});
