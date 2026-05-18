import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizePrompt,
  hashPrompt,
  detectSlideType,
  getCachedLayout,
  setCachedLayout,
  getCachedLayoutByType,
  clearSemanticCache,
  getCacheStats,
} from "@/lib/ai/semanticCache";

beforeEach(() => {
  clearSemanticCache();
});

// ---------------------------------------------------------------------------
// normalizePrompt
// ---------------------------------------------------------------------------

describe("normalizePrompt", () => {
  it("lowercases the input", () => {
    expect(normalizePrompt("TEAM SLIDE")).toBe("team slide");
  });

  it("collapses multiple spaces", () => {
    expect(normalizePrompt("team  slide   about  cats")).toBe("team slide about cats");
  });

  it("strips punctuation", () => {
    expect(normalizePrompt("Team-Slide! (4 people)")).toBe("teamslide 4 people");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizePrompt("  hello world  ")).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// hashPrompt
// ---------------------------------------------------------------------------

describe("hashPrompt", () => {
  it("returns the same hash for identical prompts", () => {
    expect(hashPrompt("team slide")).toBe(hashPrompt("team slide"));
  });

  it("returns the same hash regardless of casing", () => {
    expect(hashPrompt("Team Slide")).toBe(hashPrompt("team slide"));
  });

  it("returns different hashes for different prompts", () => {
    expect(hashPrompt("team slide")).not.toBe(hashPrompt("chart slide"));
  });

  it("returns an 8-character hex string", () => {
    expect(hashPrompt("anything")).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ---------------------------------------------------------------------------
// detectSlideType
// ---------------------------------------------------------------------------

describe("detectSlideType", () => {
  it("detects team slides", () => {
    expect(detectSlideType("Create a team slide with 4 members")).toBe("team-slide");
    expect(detectSlideType("Meet the team section")).toBe("team-slide");
  });

  it("detects chart slides", () => {
    expect(detectSlideType("Add a bar chart showing Q4 metrics")).toBe("chart-slide");
    expect(detectSlideType("Show a KPI graph")).toBe("chart-slide");
  });

  it("detects timeline slides", () => {
    expect(detectSlideType("Company history timeline")).toBe("timeline-slide");
    expect(detectSlideType("Roadmap for Q2 milestones")).toBe("timeline-slide");
  });

  it("detects agenda slides", () => {
    expect(detectSlideType("Create an agenda slide")).toBe("agenda-slide");
    expect(detectSlideType("Add a table of contents")).toBe("agenda-slide");
  });

  it("detects CTA slides", () => {
    expect(detectSlideType("Contact us slide")).toBe("cta-slide");
    expect(detectSlideType("Call to action at the end")).toBe("cta-slide");
  });

  it("detects comparison slides", () => {
    expect(detectSlideType("Product A vs Product B")).toBe("comparison-slide");
    expect(detectSlideType("Pros and cons comparison")).toBe("comparison-slide");
  });

  it("returns null for unrecognized prompts", () => {
    expect(detectSlideType("Make a presentation about cats")).toBeNull();
    expect(detectSlideType("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCachedLayout / setCachedLayout
// ---------------------------------------------------------------------------

describe("getCachedLayout / setCachedLayout", () => {
  it("returns null for a cache miss", () => {
    expect(getCachedLayout("team slide 4 people")).toBeNull();
  });

  it("returns the stored layout after a set", () => {
    const layout = "const teamBlock = ...JSX...";
    setCachedLayout("team slide 4 people", layout);
    expect(getCachedLayout("team slide 4 people")).toBe(layout);
  });

  it("normalizes the prompt for lookup (case-insensitive)", () => {
    const layout = "const block = ...";
    setCachedLayout("CHART SLIDE", layout);
    expect(getCachedLayout("chart slide")).toBe(layout);
    expect(getCachedLayout("Chart Slide")).toBe(layout);
  });

  it("overwrites an existing entry for the same normalized key", () => {
    setCachedLayout("team slide", "v1 layout");
    setCachedLayout("team slide", "v2 layout");
    expect(getCachedLayout("team slide")).toBe("v2 layout");
  });
});

// ---------------------------------------------------------------------------
// getCachedLayoutByType
// ---------------------------------------------------------------------------

describe("getCachedLayoutByType", () => {
  it("returns null when no entry has that slide type", () => {
    expect(getCachedLayoutByType("team-slide")).toBeNull();
  });

  it("returns a layout for a matching slide type", () => {
    const layout = "team JSX layout";
    setCachedLayout("team slide with 4 people", layout);
    expect(getCachedLayoutByType("team-slide")).toBe(layout);
  });

  it("returns the most recently accessed entry when multiple match", () => {
    setCachedLayout("team slide 3 members", "layout A");
    setCachedLayout("meet the team 5 people", "layout B");
    // Access layout A to make it more recent
    getCachedLayout("team slide 3 members");
    // getCachedLayoutByType should return layout A (most recently accessed)
    expect(getCachedLayoutByType("team-slide")).toBe("layout A");
  });
});

// ---------------------------------------------------------------------------
// clearSemanticCache
// ---------------------------------------------------------------------------

describe("clearSemanticCache", () => {
  it("empties the cache", () => {
    setCachedLayout("team slide", "layout");
    setCachedLayout("chart slide", "chart layout");
    clearSemanticCache();
    expect(getCacheStats().size).toBe(0);
    expect(getCachedLayout("team slide")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCacheStats
// ---------------------------------------------------------------------------

describe("getCacheStats", () => {
  it("reports correct size", () => {
    setCachedLayout("slide A", "layout A");
    setCachedLayout("slide B", "layout B");
    expect(getCacheStats().size).toBe(2);
  });

  it("tracks total hits", () => {
    setCachedLayout("team slide", "layout");
    getCachedLayout("team slide");
    getCachedLayout("team slide");
    const stats = getCacheStats();
    expect(stats.totalHits).toBe(2);
  });

  it("includes slideType in entries for detected types", () => {
    setCachedLayout("Add a team slide with 4 members", "layout");
    const stats = getCacheStats();
    const entry = stats.entries[0];
    expect(entry.slideType).toBe("team-slide");
  });

  it("reports null slideType for unrecognized prompts", () => {
    setCachedLayout("make a presentation about space", "layout");
    const stats = getCacheStats();
    expect(stats.entries[0].slideType).toBeNull();
  });
});
