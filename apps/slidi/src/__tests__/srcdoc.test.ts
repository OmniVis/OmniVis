import { describe, it, expect } from "vitest";
import { buildSrcdoc } from "@/components/SrcdocPreview";

describe("buildSrcdoc animation palette", () => {
  it("includes sl-slide-up class and keyframe", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-slide-up");
  });

  it("includes sl-fade-in class and keyframe", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-fade-in");
  });

  it("includes sl-scale-in class and keyframe", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-scale-in");
  });

  it("includes sl-slide-left class and keyframe", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-slide-left");
  });

  it("includes sl-float class and keyframe", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-float");
  });

  it("includes sl-bar-grow class with transform-origin:bottom", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-bar-grow");
    expect(html).toContain("transform-origin: bottom");
  });

  it("includes stagger delay classes sl-delay-1 through sl-delay-5", () => {
    const html = buildSrcdoc("", "minimal", null);
    for (let i = 1; i <= 5; i++) {
      expect(html).toContain(`sl-delay-${i}`);
    }
  });

  it("includes window.__css helper", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("window.__css");
  });

  it("applies correct theme vars for dark theme", () => {
    const html = buildSrcdoc("", "dark", null);
    expect(html).toContain("--sl-bg:#0f172a");
  });

  it("applies correct theme vars for cyberpunk theme", () => {
    const html = buildSrcdoc("", "cyberpunk", null);
    expect(html).toContain("--sl-bg:#0a0a14");
  });

  it("includes Tailwind CDN config extending with sl-* color tokens", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("tailwind.config");
    expect(html).toContain("sl-bg");
    expect(html).toContain("sl-accent");
  });

  it("includes inspect mode script listening for sl-inspect-mode messages", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-inspect-mode");
    expect(html).toContain("sl-commit-visual-edit");
  });

  it("includes fullscreen exit button with sl-fs-exit id", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain("sl-fs-exit");
    expect(html).toContain("exitFullscreen");
  });

  it("includes :fullscreen CSS rule for exit button visibility", () => {
    const html = buildSrcdoc("", "minimal", null);
    expect(html).toContain(":fullscreen");
  });
});
