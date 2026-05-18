import { describe, it, expect } from "vitest";
import {
  classifyTask,
  selectModelForTask,
  isRateLimitError,
  getFallbackModel,
  describeModelTier,
  LIGHT_MODEL_MAP,
} from "@/lib/ai/adessoOptimizer";

// ---------------------------------------------------------------------------
// classifyTask
// ---------------------------------------------------------------------------

describe("classifyTask", () => {
  it("classifies simple formatting instructions as light", () => {
    expect(classifyTask("make the heading bold")).toBe("light");
    expect(classifyTask("fix the typo in slide 3")).toBe("light");
    expect(classifyTask("change the color to blue")).toBe("light");
    expect(classifyTask("adjust the font size")).toBe("light");
    expect(classifyTask("center the text")).toBe("light");
  });

  it("classifies structural/generation instructions as heavy", () => {
    expect(classifyTask("create a new slide about AI")).toBe("heavy");
    expect(classifyTask("generate a timeline slide")).toBe("heavy");
    expect(classifyTask("redesign the whole deck")).toBe("heavy");
    expect(classifyTask("add slide with team members")).toBe("heavy");
    expect(classifyTask("build an interactive chart")).toBe("heavy");
  });

  it("defaults to heavy when no keywords match (unknown intent)", () => {
    expect(classifyTask("")).toBe("heavy");
    expect(classifyTask("presentation about cats")).toBe("heavy");
  });

  it("heavy wins when both heavy and light keywords appear", () => {
    // "create a bigger font" — has both "create" (heavy) and (no pure light keyword wins)
    expect(classifyTask("create a slide and make it bold")).toBe("heavy");
  });
});

// ---------------------------------------------------------------------------
// selectModelForTask
// ---------------------------------------------------------------------------

describe("selectModelForTask", () => {
  it("downgrades gpt-4.1 to gpt-4.1-mini for light tasks", () => {
    expect(selectModelForTask("gpt-4.1", "light")).toBe("gpt-4.1-mini");
  });

  it("downgrades gpt-4o to gpt-4.1-mini for light tasks", () => {
    expect(selectModelForTask("gpt-4o", "light")).toBe("gpt-4.1-mini");
  });

  it("keeps the base model for heavy tasks regardless", () => {
    expect(selectModelForTask("gpt-4.1", "heavy")).toBe("gpt-4.1");
    expect(selectModelForTask("gpt-4o", "heavy")).toBe("gpt-4o");
    expect(selectModelForTask("gpt-4.1-mini", "heavy")).toBe("gpt-4.1-mini");
  });

  it("keeps the base model for light tasks when no lightweight variant exists", () => {
    // claude-sonnet-4-6 has no light variant in the map
    expect(selectModelForTask("claude-sonnet-4-6", "light")).toBe("claude-sonnet-4-6");
    // gemini-2.5-flash has no light variant
    expect(selectModelForTask("gemini-2.5-flash", "light")).toBe("gemini-2.5-flash");
  });

  it("gpt-4.1-mini stays as gpt-4.1-mini for light tasks (already light)", () => {
    expect(selectModelForTask("gpt-4.1-mini", "light")).toBe("gpt-4.1-mini");
  });
});

// ---------------------------------------------------------------------------
// isRateLimitError
// ---------------------------------------------------------------------------

describe("isRateLimitError", () => {
  it("returns true for HTTP 429 status", () => {
    expect(isRateLimitError(429, "")).toBe(true);
  });

  it("returns true when message contains 'rate limit'", () => {
    expect(isRateLimitError(400, "Rate limit exceeded for this endpoint")).toBe(true);
  });

  it("returns true when message contains 'too many requests'", () => {
    expect(isRateLimitError(400, "Too many requests from this IP")).toBe(true);
  });

  it("returns true when message contains 'quota exceeded'", () => {
    expect(isRateLimitError(400, "Quota exceeded for today")).toBe(true);
  });

  it("returns false for normal error statuses", () => {
    expect(isRateLimitError(400, "Invalid request body")).toBe(false);
    expect(isRateLimitError(500, "Internal server error")).toBe(false);
    expect(isRateLimitError(401, "Unauthorized")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFallbackModel
// ---------------------------------------------------------------------------

describe("getFallbackModel", () => {
  it("returns the light variant for a heavy model that has one", () => {
    expect(getFallbackModel("gpt-4.1")).toBe(LIGHT_MODEL_MAP["gpt-4.1"]);
    expect(getFallbackModel("gpt-4o")).toBe(LIGHT_MODEL_MAP["gpt-4o"]);
  });

  it("returns null for a light model (already the cheapest tier)", () => {
    expect(getFallbackModel("gpt-4.1-mini")).toBeNull();
  });

  it("returns null for models without a fallback (no mapping defined)", () => {
    expect(getFallbackModel("claude-sonnet-4-6")).toBeNull();
    expect(getFallbackModel("gemini-2.5-flash")).toBeNull();
    expect(getFallbackModel("unknown-model-xyz")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// describeModelTier
// ---------------------------------------------------------------------------

describe("describeModelTier", () => {
  it("labels light models as (fast)", () => {
    expect(describeModelTier("gpt-4.1-mini")).toContain("fast");
  });

  it("labels heavy models as (full)", () => {
    expect(describeModelTier("gpt-4.1")).toContain("full");
    expect(describeModelTier("gpt-4o")).toContain("full");
    expect(describeModelTier("claude-sonnet-4-6")).toContain("full");
  });

  it("includes the model id in the description", () => {
    const desc = describeModelTier("gpt-4.1");
    expect(desc).toContain("gpt-4.1");
  });
});
