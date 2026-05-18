import { describe, it, expect } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import { THEMES } from "@/lib/themes";

describe("presenter mode — prompt postMessage injection", () => {
  it("includes sl_slide_change postMessage in generated skeleton", () => {
    const prompt = buildPrompt(THEMES.minimal.systemPromptBlock);
    expect(prompt).toContain("sl_slide_change");
    expect(prompt).toContain("window.parent?.postMessage");
  });

  it("includes total slides in postMessage payload", () => {
    const prompt = buildPrompt(THEMES.minimal.systemPromptBlock);
    expect(prompt).toContain("totalSlides");
  });
});
