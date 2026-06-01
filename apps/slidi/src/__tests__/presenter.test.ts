import { describe, it, expect } from "vitest";
import { RENDERER_CODE } from "@/lib/presentationRenderer";

describe("presenter mode — postMessage injection", () => {
  it("includes sl_slide_change postMessage in renderer code", () => {
    expect(RENDERER_CODE).toContain("sl_slide_change");
    expect(RENDERER_CODE).toContain("window.parent?.postMessage");
  });

  it("includes total slides in postMessage payload", () => {
    expect(RENDERER_CODE).toContain("totalSlides");
  });
});
