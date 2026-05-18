import { describe, it, expect } from "vitest";
import { buildSrcdoc } from "@/components/SrcdocPreview";

describe("buildSrcdoc branding customization", () => {
  it("uses custom padding when provided", () => {
    const branding = {
      name: "Test Corp",
      display: "both" as const,
      position: "top-left" as const,
      padding: 50
    };
    const html = buildSrcdoc("", "minimal", branding);
    expect(html).toContain("top:50px;left:50px;");
  });

  it("uses default padding (24px) when not provided", () => {
    const branding = {
      name: "Test Corp",
      display: "both" as const,
      position: "top-left" as const
    };
    const html = buildSrcdoc("", "minimal", branding);
    expect(html).toContain("top:24px;left:24px;");
  });

  it("uses custom sizePercentage for image height", () => {
    const branding = {
      name: "Test Corp",
      logoUrl: "logo.png",
      display: "logo" as const,
      type: "image" as const,
      sizePercentage: 150
    };
    const html = buildSrcdoc("", "minimal", branding);
    // 150% of 120px is 180px
    expect(html).toContain("height:180px;");
  });

  it("uses small size fallback when sizePercentage is missing", () => {
    const branding = {
      name: "Test Corp",
      logoUrl: "logo.png",
      display: "logo" as const,
      type: "image" as const,
      size: "small" as const
    };
    const html = buildSrcdoc("", "minimal", branding);
    expect(html).toContain("height:60px;");
  });

  it("uses medium size fallback when sizePercentage and size are missing", () => {
    const branding = {
      name: "Test Corp",
      logoUrl: "logo.png",
      display: "logo" as const,
      type: "image" as const
    };
    const html = buildSrcdoc("", "minimal", branding);
    expect(html).toContain("height:120px;");
  });

  it("scales Pill branding correctly", () => {
    const branding = {
      name: "Test Corp",
      logoUrl: "logo.png",
      display: "both" as const,
      type: "pill" as const,
      sizePercentage: 150
    };
    const html = buildSrcdoc("", "minimal", branding);
    // 150% of 40px is 60px
    expect(html).toContain("height:60px;");
    // 150% of 20px font is 30px
    expect(html).toContain("font:900 30px");
    // 150% of 16px/32px padding is 24px/48px
    expect(html).toContain("padding:24px 48px;");
  });

  it("applies padding to Pill branding", () => {
    const branding = {
      name: "Test Corp",
      display: "both" as const,
      type: "pill" as const,
      position: "bottom-right" as const,
      padding: 10
    };
    const html = buildSrcdoc("", "minimal", branding);
    expect(html).toContain("bottom:10px;right:10px;");
  });
});
