import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePresentation } from "@/lib/ai";
import type { ChatMessage } from "@/store/slidiStore";

type JsonResponse = Record<string, unknown>;

function okJson(body: JsonResponse) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

const VALID_PRESENTATION = `export default function Presentation() {
  const totalSlides = 14;
  const [current, setCurrent] = React.useState(0);
  return <div>{current} / {totalSlides}</div>;
}`;

const PARTIAL_PRESENTATION = `export default function Presentation() {
  const totalSlides = 5;
  const [current, setCurrent] = React.useState(0);
  return <div>{current} / {totalSlides}</div>;
}`;

// Used when expectedCount is high (e.g. 10, 12, 30) so the threshold Math.max(6, expectedCount-1) is satisfied
const LARGE_PRESENTATION = `export default function Presentation() {
  const totalSlides = 30;
  const [current, setCurrent] = React.useState(0);
  return <div>{current} / {totalSlides}</div>;
}`;

function openAIResponse(content: string) {
  return okJson({ choices: [{ message: { content } }] });
}

describe("parseExpectedSlideCount (via generatePresentation.expectedCount)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("defaults to 14 when no slide count in message", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      .mockResolvedValueOnce(openAIResponse(VALID_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a presentation about cats" }],
      "key", "THEME", "openai"
    );
    expect(result.expectedCount).toBe(14);
  });

  it("parses '10 slides' from message", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      .mockResolvedValueOnce(openAIResponse(LARGE_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a presentation about cats with 10 slides" }],
      "key", "THEME", "openai"
    );
    expect(result.expectedCount).toBe(10);
  });

  it("parses '12-slide' from message", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      .mockResolvedValueOnce(openAIResponse(LARGE_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "create a 12-slide deck" }],
      "key", "THEME", "openai"
    );
    expect(result.expectedCount).toBe(12);
  });

  it("clamps to 30 for absurdly large slide count", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      .mockResolvedValueOnce(openAIResponse(LARGE_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make 200 slides about history" }],
      "key", "THEME", "openai"
    );
    expect(result.expectedCount).toBe(30);
  });

  it("clamps to 4 for absurdly small slide count", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      .mockResolvedValueOnce(openAIResponse(VALID_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make 1 slide" }],
      "key", "THEME", "openai"
    );
    expect(result.expectedCount).toBe(4);
  });
});

describe("skipPlanning option", () => {
  const originalFetch = global.fetch;

  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("skips planning pass when skipPlanning: true (only 1 fetch call)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(openAIResponse(VALID_PRESENTATION)) as typeof fetch;

    global.fetch = fetchMock;

    const stages: string[] = [];
    const result = await generatePresentation(
      [{ role: "user", content: "add a summary slide" }],
      "key", "THEME", "openai", "gpt-4.1",
      (stage) => stages.push(stage),
      { skipPlanning: true }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stages).not.toContain("planning");
    expect(stages).toContain("generating");
    expect(result.isComplete).toBe(true);
  });

  it("runs planning pass when skipPlanning is false (2+ fetch calls)", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(openAIResponse("the plan"))
      .mockResolvedValueOnce(openAIResponse(VALID_PRESENTATION)) as typeof fetch;

    global.fetch = fetchMock;

    const stages: string[] = [];
    await generatePresentation(
      [{ role: "user", content: "create a new deck" }],
      "key", "THEME", "openai", "gpt-4.1",
      (stage) => stages.push(stage),
      { skipPlanning: false }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(stages).toContain("planning");
    expect(stages).toContain("generating");
  });
});

describe("partial result handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("returns isComplete: false when repair pass also produces insufficient slides", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      // pass 2: 5 slides (below minimum)
      .mockResolvedValueOnce(openAIResponse(PARTIAL_PRESENTATION))
      // pass 3: still only 5 slides (syntax safe but incomplete)
      .mockResolvedValueOnce(openAIResponse(PARTIAL_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a deck with 10 slides" }],
      "key", "THEME", "openai"
    );

    expect(result.isComplete).toBe(false);
    expect(result.slideCount).toBe(5);
    expect(result.expectedCount).toBe(10);
    expect(result.code).toContain("export default function Presentation");
  });

  it("throws when repair pass returns completely broken code", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      // pass 2: truncated (no Presentation export)
      .mockResolvedValueOnce(openAIResponse("const x = {"))
      // pass 3: still broken
      .mockResolvedValueOnce(openAIResponse("")) as typeof fetch;

    await expect(
      generatePresentation(
        [{ role: "user", content: "build a deck" }],
        "key", "THEME", "openai"
      )
    ).rejects.toThrow();
  });

  it("returns isComplete: true when repair succeeds", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(openAIResponse("plan"))
      // pass 2: fails (5 slides)
      .mockResolvedValueOnce(openAIResponse(PARTIAL_PRESENTATION))
      // pass 3: repair succeeds (8 slides)
      .mockResolvedValueOnce(openAIResponse(VALID_PRESENTATION)) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "build a deck" }],
      "key", "THEME", "openai"
    );

    expect(result.isComplete).toBe(true);
    expect(result.code).toContain("totalSlides = 14");
  });
});

describe("planText in GenerationResult", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("returns planText when planning runs", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: "my slide plan here" } }] }))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: VALID_PRESENTATION } }] })) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a deck" }],
      "key", "THEME", "openai"
    );

    expect(result.planText).toBe("my slide plan here");
  });

  it("returns planText as null when skipPlanning: true", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: VALID_PRESENTATION } }] })) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "update slide 2" }],
      "key", "THEME", "openai", "gpt-4.1",
      undefined,
      { skipPlanning: true }
    );

    expect(result.planText).toBeNull();
  });
});

// Helper to build a streaming response for OpenAI SSE format
function openAIStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        const line = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
        controller.enqueue(encoder.encode(line));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream } as unknown as Response;
}

describe("streaming via onChunk", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("calls onChunk multiple times during pass 2 for openai provider", async () => {
    const codeChunks = [
      "export default function Presentation() {\n",
      "  const totalSlides = 14;\n",
      "  const [current, setCurrent] = React.useState(0);\n",
      "  return <div>{current}/{totalSlides}</div>;\n",
      "}",
    ];

    global.fetch = vi.fn()
      // pass 1: planning (non-streaming, normal JSON response)
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: "plan text" } }] }))
      // pass 2: streaming
      .mockResolvedValueOnce(openAIStreamResponse(codeChunks)) as typeof fetch;

    const receivedChunks: string[] = [];
    const result = await generatePresentation(
      [{ role: "user", content: "make a deck" }],
      "key", "THEME", "openai", "gpt-4.1",
      undefined,
      undefined,
      (partial) => receivedChunks.push(partial)
    );

    // onChunk called once per chunk (accumulated)
    expect(receivedChunks.length).toBe(codeChunks.length);
    // Each call accumulates more text
    expect(receivedChunks[0]).toBe(codeChunks[0]);
    expect(receivedChunks[1]).toBe(codeChunks[0] + codeChunks[1]);
    // Final result is valid
    expect(result.isComplete).toBe(true);
    expect(result.code).toContain("totalSlides = 14");
  });

  it("does NOT call onChunk during pass 1 (planning)", async () => {
    const codeChunks = [
      "export default function Presentation() {\n",
      "  const totalSlides = 14;\n",
      "  return <div></div>;\n",
      "}",
    ];

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Pass 1 — planning, non-streaming
        return Promise.resolve(okJson({ choices: [{ message: { content: "my plan" } }] }));
      }
      // Pass 2 — streaming
      return Promise.resolve(openAIStreamResponse(codeChunks));
    }) as typeof fetch;

    const chunkArgs: string[] = [];
    await generatePresentation(
      [{ role: "user", content: "make a deck" }],
      "key", "THEME", "openai", "gpt-4.1",
      undefined,
      undefined,
      (partial) => chunkArgs.push(partial)
    );

    // onChunk was called (pass 2 streamed)
    expect(chunkArgs.length).toBeGreaterThan(0);
    // The first chunk is only pass 2 content, not planning content
    expect(chunkArgs[0]).not.toContain("my plan");
  });

  it("falls back to non-streaming when onChunk not provided (gemini provider still works)", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: "plan" } }] }))
      .mockResolvedValueOnce(okJson({
        candidates: [{
          content: { parts: [{ text: VALID_PRESENTATION }] }
        }]
      })) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a deck" }],
      "key", "THEME", "gemini"
    );

    expect(result.isComplete).toBe(true);
  });
});

describe("minSlides validation uses expectedCount", () => {
  const originalFetch = global.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { global.fetch = originalFetch; });

  // 7-slide output when user requested 10 → should trigger repair pass
  it("rejects 7-slide output when user requested 10 slides", async () => {
    const SEVEN_SLIDES = `export default function Presentation() {
  const totalSlides = 7;
  const [current, setCurrent] = React.useState(0);
  return <div>{current}/{totalSlides}</div>;
}`;

    const EIGHT_SLIDES = `export default function Presentation() {
  const totalSlides = 8;
  const [current, setCurrent] = React.useState(0);
  return <div>{current}/{totalSlides}</div>;
}`;

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: "plan" } }] }))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: SEVEN_SLIDES } }] }))
      // repair pass triggered — returns 8 slides (>= 10 - 1 = 9 is false, so still fails strict, returns isComplete:false)
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: EIGHT_SLIDES } }] })) as typeof fetch;

    global.fetch = fetchMock;

    const result = await generatePresentation(
      [{ role: "user", content: "make a presentation with 10 slides" }],
      "key", "THEME", "openai"
    );

    // Repair was triggered because 7 < (10 - 1 = 9)
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // 8 < Math.max(4, 10-1)=9 — strict validation still fails; falls through to isSyntaxSafe path → isComplete: false
    expect(result.isComplete).toBe(false);
  });

  // 9-slide output when user requested 10 → should pass (>= expectedCount - 1)
  it("accepts 9-slide output when user requested 10 slides", async () => {
    const NINE_SLIDES = `export default function Presentation() {
  const totalSlides = 9;
  const [current, setCurrent] = React.useState(0);
  return <div>{current}/{totalSlides}</div>;
}`;

    global.fetch = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: "plan" } }] }))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: NINE_SLIDES } }] })) as typeof fetch;

    const result = await generatePresentation(
      [{ role: "user", content: "make a presentation with 10 slides" }],
      "key", "THEME", "openai"
    );

    expect(result.isComplete).toBe(true);
    expect(result.slideCount).toBe(9);
  });
});
