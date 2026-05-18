import { describe, it, expect } from "vitest";
import {
  extractSlideBlock,
  spliceSlideBlock,
  buildWindowedEditMessages,
  estimateTokenReduction,
} from "@/lib/ai/contextManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal presentation component with N slides. */
function makePresentation(n: number): string {
  const slides = Array.from({ length: n }, (_, i) => {
    return `      {current === ${i} && (
        <div key={current} className="sl-scale-in h-full">
          <h1 className="text-7xl font-black">Slide ${i + 1} Title</h1>
          <p className="mt-4">Content for slide ${i + 1}</p>
        </div>
      )}`;
  }).join("\n");

  return `export default function Presentation() {
  const totalSlides = ${n};
  const [current, setCurrent] = React.useState(0);
  return (
    <div className="h-screen bg-sl-bg text-sl-text">
${slides}
      <div>{current + 1} / {totalSlides}</div>
    </div>
  );
}`;
}

// ---------------------------------------------------------------------------
// extractSlideBlock
// ---------------------------------------------------------------------------

describe("extractSlideBlock", () => {
  it("extracts slide 0 from a multi-slide component", () => {
    const code = makePresentation(3);
    const result = extractSlideBlock(code, 0);
    expect(result).not.toBeNull();
    expect(result!.block).toContain("current === 0 &&");
    expect(result!.block).toContain("Slide 1 Title");
  });

  it("extracts slide 2 from a multi-slide component", () => {
    const code = makePresentation(4);
    const result = extractSlideBlock(code, 2);
    expect(result).not.toBeNull();
    expect(result!.block).toContain("current === 2 &&");
    expect(result!.block).toContain("Slide 3 Title");
  });

  it("extracts the last slide correctly", () => {
    const code = makePresentation(5);
    const result = extractSlideBlock(code, 4);
    expect(result).not.toBeNull();
    expect(result!.block).toContain("current === 4 &&");
    expect(result!.block).toContain("Slide 5 Title");
  });

  it("returns null for a slide index that doesn't exist", () => {
    const code = makePresentation(3);
    expect(extractSlideBlock(code, 10)).toBeNull();
  });

  it("returns null for empty code", () => {
    expect(extractSlideBlock("", 0)).toBeNull();
  });

  it("start/end indices are correct for splice verification", () => {
    const code = makePresentation(3);
    const result = extractSlideBlock(code, 1);
    expect(result).not.toBeNull();
    // The extracted block should match what's at [start, end) in the original
    expect(code.slice(result!.start, result!.end)).toBe(result!.block);
  });

  it("handles strings containing parentheses without corrupting paren depth", () => {
    const code = `export default function Presentation() {
  const totalSlides = 2;
  const [current, setCurrent] = React.useState(0);
  return (
    <div>
      {current === 0 && (
        <div key={current}>
          <p style={{ content: "text with (parens) inside" }}>Hello</p>
        </div>
      )}
      {current === 1 && (
        <div key={current}><p>Slide 2</p></div>
      )}
    </div>
  );
}`;
    const result = extractSlideBlock(code, 0);
    expect(result).not.toBeNull();
    expect(result!.block).toContain("text with (parens) inside");
    expect(result!.block).not.toContain("Slide 2");
  });
});

// ---------------------------------------------------------------------------
// spliceSlideBlock
// ---------------------------------------------------------------------------

describe("spliceSlideBlock", () => {
  it("replaces a slide block and preserves surrounding code", () => {
    const code = makePresentation(3);
    const newBlock = `{current === 1 && (
        <div key={current} className="sl-scale-in">
          <h1>Updated Slide 2</h1>
        </div>
      )}`;

    const updated = spliceSlideBlock(code, 1, newBlock);
    expect(updated).not.toBeNull();
    expect(updated).toContain("Updated Slide 2");
    expect(updated).toContain("Slide 1 Title"); // slide 0 unchanged
    expect(updated).toContain("Slide 3 Title"); // slide 2 unchanged
    expect(updated).not.toContain("Slide 2 Title"); // original slide 1 removed
  });

  it("returns null when slide index does not exist", () => {
    const code = makePresentation(2);
    expect(spliceSlideBlock(code, 5, "{current === 5 && (<div/>)}")).toBeNull();
  });

  it("produces valid-looking code after splice", () => {
    const code = makePresentation(2);
    const replacement = `{current === 0 && (
        <div key={current}><h1>New Title</h1></div>
      )}`;
    const updated = spliceSlideBlock(code, 0, replacement);
    expect(updated).not.toBeNull();
    expect(updated).toContain("export default function Presentation");
    expect(updated).toContain("New Title");
    expect(updated).toContain("totalSlides = 2");
  });
});

// ---------------------------------------------------------------------------
// buildWindowedEditMessages
// ---------------------------------------------------------------------------

describe("buildWindowedEditMessages", () => {
  it("returns an array with a single user message", () => {
    const code = makePresentation(5);
    const msgs = buildWindowedEditMessages(code, 2, 5, "Make the heading blue");
    expect(msgs).not.toBeNull();
    expect(Array.isArray(msgs)).toBe(true);
    expect(msgs!.length).toBe(1);
    expect(msgs![0].role).toBe("user");
  });

  it("includes the slide index, total slides, and instruction in the message", () => {
    const code = makePresentation(8);
    const msgs = buildWindowedEditMessages(code, 3, 8, "Bold the subheading");
    expect(msgs).not.toBeNull();
    const content = msgs![0].content;
    expect(content).toContain("4 of 8");
    expect(content).toContain("current === 3 &&");
    expect(content).toContain("Bold the subheading");
  });

  it("includes the extracted slide block verbatim", () => {
    const code = makePresentation(4);
    const extracted = extractSlideBlock(code, 1);
    const msgs = buildWindowedEditMessages(code, 1, 4, "Change font size");
    expect(msgs).not.toBeNull();
    expect(msgs![0].content).toContain(extracted!.block);
  });

  it("returns null when the slide index does not exist in the code", () => {
    const code = makePresentation(3);
    expect(buildWindowedEditMessages(code, 99, 3, "Edit this slide")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// estimateTokenReduction
// ---------------------------------------------------------------------------

describe("estimateTokenReduction", () => {
  it("returns a reduction percentage between 0 and 100", () => {
    const code = makePresentation(10);
    const stats = estimateTokenReduction(code, 3);
    expect(stats).not.toBeNull();
    expect(stats!.reductionPct).toBeGreaterThan(0);
    expect(stats!.reductionPct).toBeLessThan(100);
  });

  it("windowedTokens < fullTokens for a multi-slide deck", () => {
    const code = makePresentation(10);
    const stats = estimateTokenReduction(code, 0);
    expect(stats).not.toBeNull();
    expect(stats!.windowedTokens).toBeLessThan(stats!.fullTokens);
  });

  it("achieves >60% token reduction for a 10-slide deck (plan target)", () => {
    const code = makePresentation(10);
    const stats = estimateTokenReduction(code, 5);
    expect(stats).not.toBeNull();
    expect(stats!.reductionPct).toBeGreaterThanOrEqual(60);
  });

  it("returns null for a slide index that does not exist", () => {
    const code = makePresentation(3);
    expect(estimateTokenReduction(code, 99)).toBeNull();
  });
});
