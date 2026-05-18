import { describe, it, expect } from "vitest";
import { THEMES } from "@/lib/themes";

const themeIds = ["minimal", "dark", "corporate", "cyberpunk", "modern", "sunset", "forest", "blueprint", "brutalist", "custom"] as const;

describe("THEMES record", () => {
  it("has exactly the ten expected theme keys", () => {
    expect(Object.keys(THEMES)).toEqual(themeIds);
  });

  it.each(themeIds)("%s theme has all required fields with correct types", (id) => {
    const theme = THEMES[id];
    expect(theme.id).toBe(id);
    expect(typeof theme.label).toBe("string");
    expect(theme.label.length).toBeGreaterThan(0);
    expect(typeof theme.systemPromptBlock).toBe("string");
    expect(theme.systemPromptBlock.length).toBeGreaterThan(0);
    expect(["light", "dark"]).toContain(theme.sandpackTheme);
  });

  it.each(themeIds)("%s systemPromptBlock starts with 'STYLE:'", (id) => {
    expect(THEMES[id].systemPromptBlock.startsWith("STYLE:")).toBe(true);
  });

  it("minimal uses light sandpack theme", () => {
    expect(THEMES.minimal.sandpackTheme).toBe("light");
  });

  it("dark uses dark sandpack theme", () => {
    expect(THEMES.dark.sandpackTheme).toBe("dark");
  });

  it("corporate uses light sandpack theme", () => {
    expect(THEMES.corporate.sandpackTheme).toBe("light");
  });

  it("cyberpunk uses dark sandpack theme", () => {
    expect(THEMES.cyberpunk.sandpackTheme).toBe("dark");
  });
});
