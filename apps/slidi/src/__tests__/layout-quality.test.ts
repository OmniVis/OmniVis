import { describe, it, expect } from "vitest";
import {
  detectLayoutAntiPatterns,
  checkMissingHScreen,
  checkNarrowMaxWidth,
  checkHeadingSize,
  checkMissingVisual,
  checkLayoutRepetition,
} from "@/lib/ai/layoutValidator";

// ---------------------------------------------------------------------------
// checkMissingHScreen
// ---------------------------------------------------------------------------

describe("checkMissingHScreen", () => {
  it("returns warning when neither h-screen nor min-h-screen present", () => {
    const w = checkMissingHScreen('<div className="w-screen">content</div>');
    expect(w).not.toBeNull();
    expect(w!.type).toBe("missing-h-screen");
    expect(w!.severity).toBe("warning");
  });

  it("returns null when h-screen is present", () => {
    expect(
      checkMissingHScreen('<div className="h-screen w-screen">content</div>')
    ).toBeNull();
  });

  it("returns null when min-h-screen is present", () => {
    expect(
      checkMissingHScreen('<div className="min-h-screen w-full">content</div>')
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// checkNarrowMaxWidth
// ---------------------------------------------------------------------------

describe("checkNarrowMaxWidth", () => {
  it("detects max-w-2xl on content block", () => {
    const ws = checkNarrowMaxWidth(
      '<div className="max-w-2xl mx-auto">content</div>'
    );
    expect(ws.length).toBeGreaterThan(0);
    expect(ws[0].type).toBe("narrow-max-width");
  });

  it("detects max-w-sm on content block", () => {
    expect(
      checkNarrowMaxWidth('<div className="max-w-sm">content</div>').length
    ).toBeGreaterThan(0);
  });

  it("detects max-w-md on content block", () => {
    expect(
      checkNarrowMaxWidth('<div className="max-w-md px-4">content</div>').length
    ).toBeGreaterThan(0);
  });

  it("exempts max-w-2xl combined with absolute (decorative element)", () => {
    expect(
      checkNarrowMaxWidth(
        '<div className="absolute max-w-2xl opacity-10">bg shape</div>'
      )
    ).toHaveLength(0);
  });

  it("returns empty for compliant full-width code", () => {
    expect(
      checkNarrowMaxWidth('<div className="w-full px-20">content</div>')
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkHeadingSize
// ---------------------------------------------------------------------------

describe("checkHeadingSize", () => {
  it("warns when h1 uses text-xl", () => {
    const ws = checkHeadingSize('<h1 className="text-xl font-bold">Title</h1>');
    expect(ws.length).toBeGreaterThan(0);
    expect(ws[0].type).toBe("heading-too-small");
    expect(ws[0].message).toContain("text-xl");
  });

  it("warns when h2 uses text-2xl", () => {
    expect(
      checkHeadingSize('<h2 className="text-2xl">Subheading</h2>').length
    ).toBeGreaterThan(0);
  });

  it("warns when h1 uses text-base", () => {
    expect(
      checkHeadingSize('<h1 className="text-base">Small</h1>').length
    ).toBeGreaterThan(0);
  });

  it("does not warn when h1 uses text-6xl", () => {
    expect(
      checkHeadingSize('<h1 className="text-6xl font-black">Big Title</h1>')
    ).toHaveLength(0);
  });

  it("does not warn when h1 uses text-4xl (minimum allowed)", () => {
    expect(
      checkHeadingSize('<h1 className="text-4xl font-bold">Heading</h1>')
    ).toHaveLength(0);
  });

  it("does not warn on text-xl in a paragraph element", () => {
    expect(
      checkHeadingSize('<p className="text-xl leading-relaxed">Body</p>')
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMissingVisual
// ---------------------------------------------------------------------------

describe("checkMissingVisual", () => {
  it("warns when slide has no svg, img, or large rounded shape", () => {
    const code =
      '{current === 0 && (<div key={current}><h1>Title</h1><p>Body text here.</p></div>)}';
    const ws = checkMissingVisual(code);
    expect(ws.length).toBeGreaterThan(0);
    expect(ws[0].type).toBe("no-visual");
    expect(ws[0].slideIndex).toBe(0);
  });

  it("does not warn when slide has an svg element", () => {
    const code =
      '{current === 0 && (<div key={current}><svg viewBox="0 0 100 100" /></div>)}';
    expect(checkMissingVisual(code)).toHaveLength(0);
  });

  it("does not warn when slide has an img element", () => {
    const code =
      '{current === 1 && (<div key={current}><img src="photo.jpg" alt="" /></div>)}';
    expect(checkMissingVisual(code)).toHaveLength(0);
  });

  it("does not warn when slide has a large rounded-full decorative shape", () => {
    const code =
      '{current === 2 && (<div key={current}><div className="w-64 h-64 rounded-full opacity-10" /></div>)}';
    expect(checkMissingVisual(code)).toHaveLength(0);
  });

  it("returns slide index in the warning", () => {
    const code =
      '{current === 3 && (<div key={current}><h1 className="text-7xl">Title</h1></div>)}';
    const ws = checkMissingVisual(code);
    expect(ws[0].slideIndex).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// checkLayoutRepetition
// ---------------------------------------------------------------------------

describe("checkLayoutRepetition", () => {
  function makeSlide(index: number, cls: string): string {
    return `{current === ${index} && (<div key={current} className="${cls}">content <svg/></div>)}`;
  }

  it("warns when 3 consecutive slides have identical root className", () => {
    const code = [0, 1, 2]
      .map((i) => makeSlide(i, "h-screen w-screen flex flex-col justify-center px-20"))
      .join("\n");
    const ws = checkLayoutRepetition(code);
    expect(ws.length).toBeGreaterThan(0);
    expect(ws[0].type).toBe("layout-repetition");
  });

  it("does not warn when fewer than 3 consecutive slides share the same className", () => {
    const code = [
      makeSlide(0, "h-screen w-screen flex flex-col"),
      makeSlide(1, "h-screen w-screen flex flex-col"),
      makeSlide(2, "h-screen w-screen grid grid-cols-2"),
    ].join("\n");
    expect(checkLayoutRepetition(code)).toHaveLength(0);
  });

  it("returns empty array for fewer than 3 slides total", () => {
    const code = [0, 1]
      .map((i) => makeSlide(i, "h-screen w-screen flex flex-col"))
      .join("\n");
    expect(checkLayoutRepetition(code)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectLayoutAntiPatterns — integration
// ---------------------------------------------------------------------------

describe("detectLayoutAntiPatterns", () => {
  // Three slides with distinct layout archetypes (different root classNames)
  const cleanSlides = [
    `{current === 0 && (
      <div key={current} className="h-screen w-screen flex flex-col justify-center px-20 py-16">
        <h1 className="text-8xl font-black">Hero Title</h1>
        <p className="text-xl leading-relaxed">Subtitle with real context.</p>
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>
      </div>
    )}`,
    `{current === 1 && (
      <div key={current} className="h-screen w-screen flex">
        <div className="w-1/2 flex flex-col justify-center px-20">
          <h2 className="text-6xl font-black">Two Column</h2>
          <p className="text-xl">Body text.</p>
        </div>
        <div className="w-1/2 flex items-center justify-center">
          <svg viewBox="0 0 200 200"><rect width="100" height="100" /></svg>
        </div>
      </div>
    )}`,
    `{current === 2 && (
      <div key={current} className="h-screen w-screen flex flex-col items-center justify-center px-20">
        <h2 className="text-6xl font-black">Stats</h2>
        <p className="text-9xl font-black">98%</p>
        <svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" /></svg>
      </div>
    )}`,
  ];

  it("returns empty array for a clean deck", () => {
    const code = `
      export default function Presentation() {
        return (
          <div className="h-screen w-screen">
            ${cleanSlides.join("\n")}
          </div>
        );
      }
    `;
    expect(detectLayoutAntiPatterns(code)).toHaveLength(0);
  });

  it("detects max-w-2xl in a full presentation component", () => {
    const code = `
      export default function Presentation() {
        return (
          <div className="h-screen w-screen">
            {current === 0 && (
              <div key={current} className="h-screen flex flex-col items-center">
                <div className="max-w-2xl">Content</div>
                <svg />
              </div>
            )}
          </div>
        );
      }
    `;
    expect(
      detectLayoutAntiPatterns(code).some((w) => w.type === "narrow-max-width")
    ).toBe(true);
  });

  it("detects missing h-screen", () => {
    const code = `
      export default function Presentation() {
        return (<div className="w-screen">{current === 0 && (<div key={current}><svg/></div>)}</div>);
      }
    `;
    expect(
      detectLayoutAntiPatterns(code).some((w) => w.type === "missing-h-screen")
    ).toBe(true);
  });

  it("detects heading too small", () => {
    const code = `
      export default function Presentation() {
        return (
          <div className="h-screen w-screen">
            {current === 0 && (<div key={current}><h1 className="text-lg">Title</h1><svg/></div>)}
          </div>
        );
      }
    `;
    expect(
      detectLayoutAntiPatterns(code).some((w) => w.type === "heading-too-small")
    ).toBe(true);
  });
});
