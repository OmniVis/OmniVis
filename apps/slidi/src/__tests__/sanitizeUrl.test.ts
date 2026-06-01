import { describe, it, expect } from "vitest";
import { sanitizeUrl } from "@/lib/sanitizeUrl";

describe("sanitizeUrl — image context", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com/img.png", "image")).toEqual({
      valid: true, url: "https://example.com/img.png", warning: undefined,
    });
  });
  it("accepts http URLs with a warning", () => {
    const r = sanitizeUrl("http://example.com/img.png", "image");
    expect(r.valid).toBe(true);
    expect(r.warning).toMatch(/Non-HTTPS/i);
  });
  it("rejects javascript: scheme", () => {
    expect(sanitizeUrl("javascript:alert(1)", "image").valid).toBe(false);
  });
  it("rejects javascript: with leading whitespace", () => {
    expect(sanitizeUrl("  javascript:alert(1)", "image").valid).toBe(false);
  });
  it("rejects URL-encoded javascript:", () => {
    expect(sanitizeUrl("javascript%3aalert(1)", "image").valid).toBe(false);
  });
  it("rejects data: URIs", () => {
    expect(sanitizeUrl("data:text/html,<h1>hi</h1>", "image").valid).toBe(false);
  });
  it("rejects vbscript: scheme", () => {
    expect(sanitizeUrl("vbscript:msgbox(1)", "image").valid).toBe(false);
  });
  it("rejects file: scheme", () => {
    expect(sanitizeUrl("file:///etc/passwd", "image").valid).toBe(false);
  });
  it("rejects bare relative paths", () => {
    expect(sanitizeUrl("/relative/path.png", "image").valid).toBe(false);
  });
});

describe("sanitizeUrl — link context", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com", "link").valid).toBe(true);
  });
  it("accepts http URLs", () => {
    expect(sanitizeUrl("http://example.com", "link").valid).toBe(true);
  });
  it("accepts mailto: URLs", () => {
    expect(sanitizeUrl("mailto:user@example.com", "link").valid).toBe(true);
  });
  it("rejects javascript: in link context", () => {
    expect(sanitizeUrl("javascript:void(0)", "link").valid).toBe(false);
  });
  it("trims leading/trailing whitespace before checking", () => {
    expect(sanitizeUrl("  https://example.com  ", "link")).toEqual({
      valid: true, url: "https://example.com", warning: undefined,
    });
  });
});
