import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePresentation } from "@/lib/ai";

type JsonResponse = Record<string, unknown>;

function okJson(body: JsonResponse) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("generatePresentation multi-step flow", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retries with a repair pass when generated deck is below minimum slide count", async () => {
    const fetchMock = vi.fn()
      // pass 1: outline/plan
      .mockResolvedValueOnce(
        okJson({
          choices: [{ message: { content: "Deck plan with 10 slides." } }],
        }),
      )
      // pass 2: initial generation (valid syntax, but only 5 slides)
      .mockResolvedValueOnce(
        okJson({
          choices: [{
            message: {
              content: `export default function Presentation() {
  const totalSlides = 5;
  return <div>{totalSlides}</div>;
}`,
            },
          }],
        }),
      )
      // pass 3: repair/finalize
      .mockResolvedValueOnce(
        okJson({
          choices: [{
            message: {
              content: `export default function Presentation() {
  const totalSlides = 8;
  return <div>{totalSlides}</div>;
}`,
            },
          }],
        }),
      );

    global.fetch = fetchMock as typeof fetch;

    const stages: string[] = [];
    const result = await generatePresentation(
      [{ role: "user", content: "Build a product strategy deck" }],
      "test-key",
      "THEME BLOCK",
      "openai",
      "gpt-4.1",
      (stage) => stages.push(stage),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.code).toContain("const totalSlides = 8;");
    expect(result.isComplete).toBe(true);
    expect(result.expectedCount).toBe(8);
    expect(stages).toEqual(["planning", "generating", "finalizing"]);
  });
});
