import { describe, it, expect, vi } from "vitest";
import { imageUrlToBase64 } from "@/lib/exportUtils";

describe("imageUrlToBase64", () => {
  it("returns data URL as is", async () => {
    const dataUrl = "data:image/png;base64,123";
    const result = await imageUrlToBase64(dataUrl);
    expect(result).toBe(dataUrl);
  });

  it("returns empty string for empty input", async () => {
    const result = await imageUrlToBase64("");
    expect(result).toBe("");
  });

  it("attempts to fetch and convert external URLs", async () => {
    const mockBlob = new Blob(["test"], { type: "image/png" });
    const mockResponse = {
      blob: vi.fn().mockResolvedValue(mockBlob)
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    // Mock FileReader
    function MockReader() {}
    MockReader.prototype.readAsDataURL = vi.fn(function(this: any) {
      this.onloadend();
    });
    MockReader.prototype.result = "data:image/png;base64,dGVzdA==";
    global.FileReader = MockReader as any;

    const url = "https://example.com/logo.png";
    const result = await imageUrlToBase64(url);
    
    expect(global.fetch).toHaveBeenCalledWith(url);
    expect(result).toBe("data:image/png;base64,dGVzdA==");
  });
});
