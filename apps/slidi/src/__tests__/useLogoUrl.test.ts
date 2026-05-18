import { beforeEach, describe, it, expect } from "vitest";
import { resolveLogoUrl } from "@/hooks/useLogoUrl";
import { putAsset, _resetDbForTests } from "@/lib/idb";

beforeEach(() => {
  _resetDbForTests();
});

describe("resolveLogoUrl", () => {
  it("passes through undefined", async () => {
    expect(await resolveLogoUrl(undefined)).toBeUndefined();
  });

  it("passes through a plain HTTP URL", async () => {
    const url = "/slidi/assets/branding/logo.png";
    expect(await resolveLogoUrl(url)).toBe(url);
  });

  it("passes through a data: URL", async () => {
    const dataUrl = "data:image/png;base64,abc123";
    expect(await resolveLogoUrl(dataUrl)).toBe(dataUrl);
  });

  it("resolves an idb:// URL by fetching from IndexedDB", async () => {
    await putAsset("logo-uuid-1", "data:image/png;base64,resolvedData");
    expect(await resolveLogoUrl("idb://logo-uuid-1")).toBe("data:image/png;base64,resolvedData");
  });

  it("returns undefined for a missing idb:// reference", async () => {
    expect(await resolveLogoUrl("idb://nonexistent-id")).toBeUndefined();
  });
});
