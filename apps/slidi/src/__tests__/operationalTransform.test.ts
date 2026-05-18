import { describe, it, expect } from "vitest";
import { mergeVersions } from "@/lib/ai/operationalTransform";

describe("mergeVersions", () => {
  const base = "slide A\nslide B";
  const local = "slide A edited\nslide B";
  const remote = "slide A\nslide B edited";

  it("returns local when only local changed", () => {
    const result = mergeVersions(base, local, base);
    expect(result).toEqual({ conflict: false, code: local });
  });

  it("returns remote when only remote changed", () => {
    const result = mergeVersions(base, base, remote);
    expect(result).toEqual({ conflict: false, code: remote });
  });

  it("returns either when local and remote are identical", () => {
    const result = mergeVersions(base, local, local);
    expect(result).toEqual({ conflict: false, code: local });
  });

  it("reports conflict when both local and remote diverged independently", () => {
    const result = mergeVersions(base, local, remote);
    expect(result).toEqual({ conflict: true, local, remote });
  });

  it("no conflict when all three are identical", () => {
    const result = mergeVersions(base, base, base);
    expect(result).toEqual({ conflict: false, code: base });
  });

  it("handles empty strings", () => {
    const result = mergeVersions("", "local edit", "");
    expect(result).toEqual({ conflict: false, code: "local edit" });
  });

  it("handles both starting from empty base", () => {
    const result = mergeVersions("", "local", "remote");
    expect(result).toEqual({ conflict: true, local: "local", remote: "remote" });
  });
});
