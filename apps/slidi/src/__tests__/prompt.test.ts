import { describe, it, expect } from "vitest";
import { buildPrompt, BASE_PROMPT, buildUserContextBlock, buildPresentationModeBlock, buildPlanModeSystemPrompt, parsePlanResponse, buildAttachedFilesBlock } from "@/lib/prompt";
import { detectOutlineApproval } from "@/lib/ai";
import type { UserContext } from "@/store/slidiStore";

describe("buildPrompt", () => {
  it("prepends themeBlock before BASE_PROMPT with a double newline", () => {
    const result = buildPrompt("STYLE: dark mode");
    expect(result).toBe(`STYLE: dark mode\n\n${BASE_PROMPT}`);
  });

  it("BASE_PROMPT appears verbatim at the end of the output", () => {
    const result = buildPrompt("some block");
    expect(result.endsWith(BASE_PROMPT)).toBe(true);
  });

  it("separates themeBlock and BASE_PROMPT with exactly two newlines", () => {
    const block = "STYLE: minimal";
    const result = buildPrompt(block);
    const separator = result.slice(block.length, result.length - BASE_PROMPT.length);
    expect(separator).toBe("\n\n");
  });

  it("handles empty themeBlock", () => {
    const result = buildPrompt("");
    expect(result).toBe(`\n\n${BASE_PROMPT}`);
  });
});

describe("BASE_PROMPT quality rules", () => {
  it("includes JSON schema requirement", () => {
    expect(BASE_PROMPT).toContain("Output ONLY valid JSON");
    expect(BASE_PROMPT).toContain("JSON");
  });

  it("requires minimum 14 slides", () => {
    expect(BASE_PROMPT).toContain("14");
  });

  it("forbids emoji usage", () => {
    expect(BASE_PROMPT).toContain("Never use emoji");
  });

  it("requires content limits", () => {
    expect(BASE_PROMPT).toContain("MAX");
  });
});

describe("buildUserContextBlock", () => {
  it("returns empty string for null context", () => {
    expect(buildUserContextBlock(null)).toBe("");
  });

  it("returns empty string when all fields are empty", () => {
    const ctx: UserContext = { role: "", department: "", language: "", customInstructions: "" };
    expect(buildUserContextBlock(ctx)).toBe("");
  });

  it("includes the language instruction line when language is set", () => {
    const ctx: UserContext = { role: "", department: "", language: "German", customInstructions: "" };
    const result = buildUserContextBlock(ctx);
    expect(result).toContain("Output language: German");
    expect(result).toContain("generate ALL text");
  });

  it("includes role and department when set", () => {
    const ctx: UserContext = { role: "Sales Manager", department: "Cloud & Digital", language: "", customInstructions: "" };
    const result = buildUserContextBlock(ctx);
    expect(result).toContain("Role: Sales Manager");
    expect(result).toContain("Department: Cloud & Digital");
  });

  it("includes custom instructions when set", () => {
    const ctx: UserContext = { role: "", department: "", language: "", customInstructions: "Always end with CTA" };
    const result = buildUserContextBlock(ctx);
    expect(result).toContain("Always end with CTA");
  });

  it("does not include empty fields", () => {
    const ctx: UserContext = { role: "PM", department: "", language: "", customInstructions: "" };
    const result = buildUserContextBlock(ctx);
    expect(result).not.toContain("Department");
    expect(result).not.toContain("language");
  });
});

describe("buildPresentationModeBlock", () => {
  it("corporate mode contains 'data-driven'", () => {
    expect(buildPresentationModeBlock("corporate")).toContain("data-driven");
  });

  it("private mode contains 'conversational'", () => {
    expect(buildPresentationModeBlock("private")).toContain("conversational");
  });

  it("corporate mode references agenda slide requirement", () => {
    expect(buildPresentationModeBlock("corporate")).toContain("agenda slide");
  });

  it("private mode references narrative arc", () => {
    expect(buildPresentationModeBlock("private")).toContain("narrative arc");
  });
});

describe("buildPlanModeSystemPrompt", () => {
  it("contains the OUTLINE READY sentinel phrase", () => {
    expect(buildPlanModeSystemPrompt()).toContain("OUTLINE READY");
  });

  it("instructs the AI not to output code", () => {
    expect(buildPlanModeSystemPrompt()).toContain("presentation strategist");
  });

  it("prepends user context when provided", () => {
    const ctx: UserContext = { role: "CEO", department: "", language: "French", customInstructions: "" };
    const result = buildPlanModeSystemPrompt(ctx);
    expect(result).toContain("Role: CEO");
    expect(result).toContain("French");
  });

  it("prepends mode block when provided", () => {
    const result = buildPlanModeSystemPrompt(null, "private");
    expect(result).toContain("conversational");
  });
});

describe("buildPlanModeSystemPrompt structured markers", () => {
  it("requires [PROGRESS:100] in format rules (proactive mode always starts at 100)", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("[PROGRESS:100]");
  });

  it("requires OUTLINE READY sentinel", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("**OUTLINE READY**");
  });

  it("instructs AI to never ask questions first", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("Never ask questions first");
  });

  it("instructs AI to never ask for clarification", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("Never ask for clarification");
  });

  it("includes userContext block when provided", () => {
    const ctx: UserContext = { role: "Engineer", department: "ACME", language: "en", customInstructions: "" };
    const result = buildPlanModeSystemPrompt(ctx);
    expect(result).toContain("Engineer");
    expect(result).toContain("ACME");
  });
});

describe("parsePlanResponse", () => {
  it("extracts progress from [PROGRESS:N] token", () => {
    const result = parsePlanResponse("[PROGRESS:42]\nSome text.\n[Q: What is the audience?]");
    expect(result.progress).toBe(42);
  });

  it("extracts question from [Q: text] token", () => {
    const result = parsePlanResponse("[PROGRESS:20]\nSome text.\n[Q: Who is the audience?]");
    expect(result.question).toBe("Who is the audience?");
  });

  it("strips both markers from displayText", () => {
    const result = parsePlanResponse("[PROGRESS:20]\nSome text.\n[Q: Who is the audience?]");
    expect(result.displayText).not.toContain("[PROGRESS:");
    expect(result.displayText).not.toContain("[Q:");
    expect(result.displayText).toContain("Some text.");
  });

  it("returns null progress when marker is absent", () => {
    const result = parsePlanResponse("No markers here.");
    expect(result.progress).toBeNull();
  });

  it("returns null question when [Q:] is absent (e.g. outline response)", () => {
    const result = parsePlanResponse("[PROGRESS:100]\nHere is your outline.\n**OUTLINE READY**");
    expect(result.question).toBeNull();
  });

  it("handles inline [PROGRESS:] without trailing newline gracefully", () => {
    const result = parsePlanResponse("[PROGRESS:55] Some text [Q: What tone?]");
    expect(result.progress).toBe(55);
    expect(result.question).toBe("What tone?");
  });

  it("trims leading/trailing whitespace from displayText", () => {
    const result = parsePlanResponse("[PROGRESS:10]\n\nHello.\n[Q: Audience?]");
    expect(result.displayText.startsWith("\n")).toBe(false);
  });

  it("extracts question that spans multiple lines", () => {
    const result = parsePlanResponse("[PROGRESS:30]\n[Q: What tone?\n(formal or casual)]");
    expect(result.question).toBe("What tone?\n(formal or casual)");
    expect(result.displayText).not.toContain("[Q:");
    expect(result.displayText).not.toContain("]");
  });
});

describe("detectOutlineApproval", () => {
  it("returns true when AI response contains OUTLINE READY", () => {
    expect(detectOutlineApproval("Here is the plan.\n**OUTLINE READY** — say generate")).toBe(true);
  });

  it("returns false when AI response has no sentinel", () => {
    expect(detectOutlineApproval("What is your audience?")).toBe(false);
  });

  it("returns true when userInput contains 'generate'", () => {
    expect(detectOutlineApproval("", "generate")).toBe(true);
  });

  it("returns true for partial match on 'looks good'", () => {
    expect(detectOutlineApproval("", "yes looks good to me")).toBe(true);
  });

  it("returns true for 'yes' keyword", () => {
    expect(detectOutlineApproval("", "yes")).toBe(true);
  });

  it("returns false for unrelated userInput", () => {
    expect(detectOutlineApproval("", "can you add more slides about climate?")).toBe(false);
  });
});

describe("buildAttachedFilesBlock", () => {
  it("returns empty string when no files are provided", () => {
    expect(buildAttachedFilesBlock([])).toBe("");
  });

  it("includes the file name in the output", () => {
    const result = buildAttachedFilesBlock([{ name: "deck.pptx", markdown: "Slide 1\nContent", size: 1024 }]);
    expect(result).toContain("deck.pptx");
    expect(result).toContain("Slide 1");
  });

  it("includes the context header", () => {
    const result = buildAttachedFilesBlock([{ name: "report.pdf", markdown: "Revenue grew 30%", size: 512 }]);
    expect(result).toContain("ATTACHED CONTEXT DOCUMENTS");
    expect(result).toContain("Prioritize");
  });

  it("includes all files when multiple are provided", () => {
    const files = [
      { name: "a.docx", markdown: "Alpha content", size: 100 },
      { name: "b.xlsx", markdown: "Beta numbers", size: 200 },
    ];
    const result = buildAttachedFilesBlock(files);
    expect(result).toContain("a.docx");
    expect(result).toContain("b.xlsx");
    expect(result).toContain("Alpha content");
    expect(result).toContain("Beta numbers");
  });

  it("trims whitespace from markdown content", () => {
    const result = buildAttachedFilesBlock([{ name: "notes.txt", markdown: "   hello world   ", size: 20 }]);
    expect(result).toContain("hello world");
  });
});

describe("BASE_PROMPT visuals rule", () => {
  it("instructs LLM to use visualType instead of SVG", () => {
    expect(BASE_PROMPT).toContain("visualType");
    expect(BASE_PROMPT).toContain("visualPrompt");
  });
});

describe("BASE_PROMPT no-emoji rule", () => {
  it("includes emoji prohibition", () => {
    expect(BASE_PROMPT).toContain("EMOJI");
  });

  it("forbids emoji characters", () => {
    expect(BASE_PROMPT).toContain("Never use emoji");
  });
});

describe("BASE_PROMPT content-density rules", () => {
  it("mandates one idea per slide", () => {
    expect(BASE_PROMPT).toContain("One idea");
  });

  it("includes word count limit for body text", () => {
    expect(BASE_PROMPT).toContain("35 words");
  });

  it("defines archetype content budgets", () => {
    expect(BASE_PROMPT).toContain("CONTENT BUDGET");
  });

  it("includes visual hierarchy principle", () => {
    expect(BASE_PROMPT).toContain("One idea");
  });

  it("documents content split guidance", () => {
    expect(BASE_PROMPT).toContain("Split");
  });

  it("includes closing slide guidance", () => {
    expect(BASE_PROMPT).toContain("CLOSING");
  });
});

describe("BASE_PROMPT background decoration rule", () => {
  it("documents background fill types", () => {
    expect(BASE_PROMPT).toContain("diagonal-gradient");
  });

  it("documents animation types", () => {
    expect(BASE_PROMPT).toContain("spring-stagger");
  });
});
