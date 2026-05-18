# AI Engine Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two generation bugs (minSlides validation, cachedPlan lifecycle) and add real-time streaming preview for OpenAI and Anthropic providers.

**Architecture:** The existing 3-pass system (plan → generate → repair) is unchanged. Streaming is added only to Pass 2 via an optional `onChunk` callback. A new `streamingPreview` store field lets `CanvasPane` render partial code live instead of the skeleton. The validated final code is committed via `pushVersion` as before.

**Tech Stack:** TypeScript, React, Zustand, Vitest, `fetch` Streams API (ReadableStream/TextDecoder), OpenAI SSE format, Anthropic SSE format.

---

## File Map

| File | Change |
|---|---|
| `src/lib/ai.ts` | Add `onChunk` param + streaming variants; fix `minSlides`; return `planText`; improve repair message |
| `src/store/slidiStore.ts` | Add `streamingPreview: string \| null` + `setStreamingPreview` action |
| `src/components/CanvasPane.tsx` | Show `SrcdocPreview` with `streamingPreview` instead of skeleton when streaming |
| `src/components/ChatPane.tsx` | Wire `onChunk`; fix `cachedPlan` lifecycle |
| `src/__tests__/ai-engine.test.ts` | Tests for streaming callback, fixed minSlides, planText propagation |

---

## Task 1: Fix `minSlides` validation + tests

**Files:**
- Modify: `src/lib/ai.ts` (function `assertLikelyCompletePresentation` and its call sites)
- Modify: `src/__tests__/ai-engine.test.ts`

### Context

`assertLikelyCompletePresentation(code, minSlides = 6)` currently uses a hardcoded default of 6. The caller never passes `minSlides`, so a user requesting 10 slides can receive a 6-slide output and it will pass validation.

The fix: pass `Math.max(6, expectedCount - 1)` at every call site inside `generatePresentation`. The function signature itself is unchanged.

- [ ] **Step 1: Write the failing tests**

Add this describe block to `src/__tests__/ai-engine.test.ts`:

```ts
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
    // 8 slides passes syntax safety check → isComplete: false (still below threshold 9)
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\Users\berol\Projekte\AiTools\slidi
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: 2 new tests FAIL (7-slide test: fetch called only 2 times instead of 3; 9-slide test: isComplete false instead of true).

- [ ] **Step 3: Fix `generatePresentation` in `src/lib/ai.ts`**

Find the two call sites of `assertLikelyCompletePresentation` (lines ~298 and ~320) and add the threshold:

```ts
// Pass 2 validation — replace existing call:
const code = assertLikelyCompletePresentation(firstAttemptCode, Math.max(6, expectedCount - 1));
```

```ts
// Pass 3 strict validation — replace existing call:
const code = assertLikelyCompletePresentation(repairedCode, Math.max(6, expectedCount - 1));
```

The `isSyntaxSafe` fallback block (after both strict checks fail) is unchanged — it remains as the last-resort partial result.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: all 93+ tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts src/__tests__/ai-engine.test.ts
git commit -m "fix: tie minSlides validation to expectedCount instead of hardcoded 6"
```

---

## Task 2: Fix `cachedPlan` lifecycle + return `planText` from `generatePresentation`

**Files:**
- Modify: `src/lib/ai.ts` (`GenerationResult` interface + return statements)
- Modify: `src/components/ChatPane.tsx` (cachedPlan handling)
- Modify: `src/__tests__/ai-engine.test.ts` (planText tests)

### Context

`GenerationResult` currently has no `planText` field. `ChatPane` calls `setCachedPlan(null)` immediately after generation, so follow-up edits never have the plan. The fix: return `planText` from `generatePresentation`, let `ChatPane` save it.

- [ ] **Step 1: Write failing tests for `planText` propagation**

Add to `src/__tests__/ai-engine.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: 2 new tests FAIL (`result.planText` is `undefined`).

- [ ] **Step 3: Update `GenerationResult` interface in `src/lib/ai.ts`**

```ts
export interface GenerationResult {
  code: string;
  isComplete: boolean;
  slideCount: number | null;
  expectedCount: number;
  planText: string | null;  // add this line
}
```

- [ ] **Step 4: Update return statements in `generatePresentation` in `src/lib/ai.ts`**

There are three `return` statements inside `generatePresentation`. Add `planText` to each:

First return (pass 2 succeeds, strict validation passes):
```ts
return {
  code,
  isComplete: true,
  slideCount: detectSlideCount(code),
  expectedCount,
  planText: planText ?? null,
};
```

Second return (pass 3 succeeds, strict validation passes):
```ts
return {
  code,
  isComplete: true,
  slideCount: detectSlideCount(code),
  expectedCount,
  planText: planText ?? null,
};
```

Third return (pass 3 partial — `isSyntaxSafe` fallback):
```ts
return {
  code: trimmed,
  isComplete: false,
  slideCount,
  expectedCount,
  planText: planText ?? null,
};
```

- [ ] **Step 5: Fix ChatPane.tsx cachedPlan handling**

In `src/components/ChatPane.tsx`, find the block after `pushVersion(result.code)`:

```ts
// REMOVE this broken block:
if (!skipPlanning && result.code) {
  setCachedPlan(null); // ← this destroys the plan
}
```

Replace with:
```ts
// Save plan for follow-up requests
if (result.planText) {
  setCachedPlan(result.planText);
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ai.ts src/components/ChatPane.tsx src/__tests__/ai-engine.test.ts
git commit -m "fix: preserve cachedPlan after generation; return planText from generatePresentation"
```

---

## Task 3: Add `streamingPreview` to Zustand store + wire CanvasPane

**Files:**
- Modify: `src/store/slidiStore.ts`
- Modify: `src/components/CanvasPane.tsx`

### Context

`CanvasPane` shows `GeneratingSkeleton` when `isGenerating` is true. With streaming, we want to show a live `SrcdocPreview` instead. A `streamingPreview: string | null` field in the store lets `CanvasPane` switch between skeleton and live preview with zero prop drilling.

- [ ] **Step 1: Add `streamingPreview` to the store**

In `src/store/slidiStore.ts`, find the `SlidiState` interface. After `setCachedPlan`:

```ts
// Streaming preview — cleared after generation completes
streamingPreview: string | null;
setStreamingPreview: (code: string | null) => void;
```

In the `create(...)` call body, after `setCachedPlan: (plan) => set({ cachedPlan: plan }),`:

```ts
streamingPreview: null,
setStreamingPreview: (code) => set({ streamingPreview: code }),
```

- [ ] **Step 2: Update CanvasPane to show live preview during streaming**

In `src/components/CanvasPane.tsx`, update the destructure:

```ts
const { generatedCode, theme, isGenerating, inspectMode, setInspectMode, streamingPreview } = useSlidiStore();
```

Find the `isGenerating ? (` branch (currently shows `GeneratingSkeleton`). Replace with:

```tsx
{isGenerating ? (
  streamingPreview ? (
    // Live streaming preview — show partial code instead of skeleton
    <div className="flex-1 overflow-hidden p-4 md:p-8 lg:p-12 z-10 flex flex-col">
      <div className="flex-1 min-h-0">
        <SrcdocPreview code={streamingPreview} theme={theme} />
      </div>
    </div>
  ) : (
    // No streaming yet — show animated skeleton
    <div className="flex-1 overflow-hidden p-4 md:p-8 lg:p-12 z-10 flex flex-col">
      <div className="flex-1 min-h-0">
        <GeneratingSkeleton theme={theme} />
      </div>
    </div>
  )
) : generatedCode ? (
```

Ensure `SrcdocPreview` is imported at the top of the file. Check existing imports — if it's already imported, skip. Otherwise add:

```ts
import SrcdocPreview from "@/components/SrcdocPreview";
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/slidiStore.ts src/components/CanvasPane.tsx
git commit -m "feat: add streamingPreview to store; show live preview in CanvasPane during streaming"
```

---

## Task 4: Add streaming variants for OpenAI and Anthropic

**Files:**
- Modify: `src/lib/ai.ts`
- Modify: `src/__tests__/ai-engine.test.ts`

### Context

Two new internal functions: `callOpenAIStream` and `callAnthropicStream`. Each reads an SSE stream from `res.body`, accumulates text, and calls `onChunk(accumulated)` after every chunk. The final accumulated string goes through `extractCode` as before.

`callProvider` gets an optional `onChunk` parameter and dispatches to the streaming variant for openai/anthropic when provided.

Streaming is only used during **Pass 2** inside `generatePresentation`. Pass 1 (planning) and Pass 3 (repair) remain non-streaming.

- [ ] **Step 1: Write failing streaming tests**

Add to `src/__tests__/ai-engine.test.ts`:

```ts
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
      "  const totalSlides = 8;\n",
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
    expect(result.code).toContain("totalSlides = 8");
  });

  it("does NOT call onChunk during pass 1 (planning)", async () => {
    const codeChunks = [
      "export default function Presentation() {\n",
      "  const totalSlides = 8;\n",
      "  return <div></div>;\n",
      "}",
    ];

    const planningCallChunks: string[] = [];
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

    // Track which call triggers onChunk by checking call order
    let onChunkCalledDuringFirstFetch = false;
    let firstFetchSettled = false;

    // Simpler: just verify planning fetch is the non-streaming JSON fetch
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

    void planningCallChunks; void onChunkCalledDuringFirstFetch; void firstFetchSettled;
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: streaming tests FAIL (`onChunk` never called).

- [ ] **Step 3: Add `callOpenAIStream` to `src/lib/ai.ts`**

Insert after the existing `callOpenAI` function:

```ts
async function callOpenAIStream(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  onChunk: (partial: string) => void
): Promise<string> {
  const body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ],
    max_tokens: 16384,
    temperature: 0.7,
    stream: true,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `OpenAI error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> };
        const chunk = parsed.choices[0]?.delta?.content;
        if (chunk) {
          accumulated += chunk;
          onChunk(accumulated);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return extractCode(accumulated);
}
```

- [ ] **Step 4: Add `callAnthropicStream` to `src/lib/ai.ts`**

Insert after the existing `callAnthropic` function:

```ts
async function callAnthropicStream(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  onChunk: (partial: string) => void
): Promise<string> {
  const eligible = messages.filter(
    (m) => m.role === "user" || (m.role === "system" && m.isOutput)
  );
  const anthropicMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of eligible) {
    const apiRole = m.role === "user" ? ("user" as const) : ("assistant" as const);
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last && last.role === apiRole) {
      anthropicMessages[anthropicMessages.length - 1] = { role: apiRole, content: m.content };
    } else {
      anthropicMessages.push({ role: apiRole, content: m.content });
    }
  }

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    system: systemPrompt,
    messages: anthropicMessages,
    stream: true,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Anthropic error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(line.slice(6)) as {
          type: string;
          delta?: { type: string; text?: string };
        };
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          accumulated += parsed.delta.text;
          onChunk(accumulated);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return extractCode(accumulated);
}
```

- [ ] **Step 5: Update `callProvider` signature in `src/lib/ai.ts`**

Add `onChunk?` parameter and dispatch to streaming variants:

```ts
async function callProvider(
  provider: Provider,
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  adessoModel: string,
  onChunk?: (partial: string) => void
): Promise<string> {
  switch (provider) {
    case "openai":
      return onChunk
        ? callOpenAIStream(messages, apiKey, systemPrompt, onChunk)
        : callOpenAI(messages, apiKey, systemPrompt);
    case "anthropic":
      return onChunk
        ? callAnthropicStream(messages, apiKey, systemPrompt, onChunk)
        : callAnthropic(messages, apiKey, systemPrompt);
    case "gemini":
      return callGemini(messages, apiKey, systemPrompt);
    case "adesso":
      return callAdesso(messages, apiKey, systemPrompt, adessoModel);
    default:
      return assertNeverProvider(provider);
  }
}
```

- [ ] **Step 6: Add `onChunk` param to `generatePresentation` and pass it to Pass 2 only**

Update the `generatePresentation` function signature (add `onChunk` as last parameter):

```ts
export async function generatePresentation(
  messages: ChatMessage[],
  apiKey: string,
  themeBlock: string,
  provider: Provider,
  adessoModel = "gpt-4.1",
  onStageChange?: (stage: GenerationStage) => void,
  options?: { skipPlanning?: boolean; cachedPlan?: string | null },
  onChunk?: (partial: string) => void
): Promise<GenerationResult>
```

Inside the function body, update the Pass 2 call to `callProvider`:

```ts
// Pass 2: generate full component (streaming if onChunk provided)
onStageChange?.("generating");
const generationPrompt = buildPrompt(themeBlock);
const generationMessages: ChatMessage[] = [
  ...messages,
  ...(planText
    ? [{
        role: "user" as const,
        content: `Use this slide plan while generating the full component:\n\n${planText}\n\nReturn complete code only.`,
      }]
    : []),
];
const firstAttemptCode = await callProvider(
  provider, generationMessages, apiKey, generationPrompt, adessoModel,
  onChunk  // streaming only during pass 2
);
```

Pass 1 and Pass 3 calls to `callProvider` remain without `onChunk`:
```ts
// Pass 1 — no onChunk
planText = await callProvider(provider, messages, apiKey, planningPrompt, adessoModel);

// Pass 3 — no onChunk
const repairedCode = await callProvider(provider, repairMessages, apiKey, repairPrompt, adessoModel);
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test -- --run src/__tests__/ai-engine.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ai.ts src/__tests__/ai-engine.test.ts
git commit -m "feat: add real-time streaming for OpenAI and Anthropic providers"
```

---

## Task 5: Wire streaming in ChatPane + improve repair prompt

**Files:**
- Modify: `src/components/ChatPane.tsx`
- Modify: `src/lib/ai.ts` (repair message only)

### Context

`ChatPane` calls `generatePresentation` and must now pass `onChunk` which calls `setStreamingPreview`. When generation completes (or fails), `setStreamingPreview(null)` is called to clear the live preview and return to normal state.

The repair prompt message inside `generatePresentation` also gets the `expectedCount` injected so the model knows how many slides are required.

- [ ] **Step 1: Update the repair message in `src/lib/ai.ts`**

Find the repair message construction inside `generatePresentation` (in the `catch (initialError)` block). Replace:

```ts
content: `Original request context:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nSlide plan:\n${planText ?? "none"}\n\nCandidate code:\n${firstAttemptCode}\n\nRepair reason:\n${initialError instanceof Error ? initialError.message : "Unknown validation error"}\n\nReturn the fully fixed component now.`,
```

With:

```ts
content: `Original request context:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nSlide plan:\n${planText ?? "none"}\n\nCandidate code:\n${firstAttemptCode}\n\nRepair reason:\n${initialError instanceof Error ? initialError.message : "Unknown validation error"}\n\nThe user requested ${expectedCount} slides. Your repaired component MUST include exactly ${expectedCount} slides (current === 0 through current === ${expectedCount - 1}). Return ONLY the fully fixed component.`,
```

- [ ] **Step 2: Wire `onChunk` and `setStreamingPreview` in ChatPane**

In `src/components/ChatPane.tsx`, add `setStreamingPreview` to the store destructure:

```ts
const {
  messages, addMessage, generatedCode, pushVersion, theme, apiKey, provider,
  isGenerating, setIsGenerating, adessoModel, cachedPlan, setCachedPlan,
  setStreamingPreview,
} = useSlidiStore();
```

Inside `handleSubmit`, pass `onChunk` as the last argument to `generatePresentation`:

```ts
const result = await generatePresentation(
  [...messages, { role: "user", content: trimmed }],
  apiKey,
  THEMES[theme].systemPromptBlock,
  provider,
  adessoModel,
  (stage) => {
    if (stage === "planning") updateGenerationStatus("Planning deck structure...");
    if (stage === "generating") updateGenerationStatus("Generating full presentation code...");
    if (stage === "finalizing") updateGenerationStatus("Finalizing and repairing output...");
  },
  { skipPlanning, cachedPlan },
  (partial) => setStreamingPreview(partial)   // NEW — live preview
);
```

After `generatePresentation` returns (before `pushVersion`), clear the streaming preview:

```ts
setStreamingPreview(null);
pushVersion(result.code);
```

In the `catch` block, also clear streaming preview on error. Find the existing error handling and add:

```ts
} catch (err) {
  setStreamingPreview(null);   // add this line
  // ... rest of existing error handling
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with 0 errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPane.tsx src/lib/ai.ts
git commit -m "feat: wire streaming preview in ChatPane; improve repair prompt with expectedCount"
```

---

## Task 6: Manual end-to-end verification

**Files:** No code changes — this is a verification task.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test streaming with OpenAI**

1. Open http://localhost:3000 in a browser
2. Set provider to OpenAI with a valid API key in Settings
3. Type "Create a 10-slide presentation about climate change" and submit
4. Verify: during Pass 2, the live presentation preview appears in the canvas (instead of the skeleton animation)
5. Verify: the preview updates in real-time as code streams in
6. Verify: the final deck has at least 9 slides (expectedCount - 1 threshold)

- [ ] **Step 3: Test follow-up edit uses cached plan**

1. After the deck is generated, type "Add a slide about renewable energy" and submit
2. Open browser DevTools → Network tab, find the second API call
3. Verify: the request body contains the original plan in the messages (the `Use this slide plan...` user message)

- [ ] **Step 4: Test with Anthropic**

1. Switch provider to Anthropic with a valid API key
2. Generate a presentation
3. Verify: streaming preview works the same way

- [ ] **Step 5: Test Gemini/Adesso still work (non-streaming path)**

1. Switch to Gemini
2. Generate a presentation
3. Verify: skeleton animation shows (not streaming preview) — Gemini remains non-streaming
4. Verify: deck generates successfully

- [ ] **Step 6: Final commit and checkpoint**

```bash
git add .claude/memory/latest_checkpoint.md .claude/memory/21-04-2026-*_checkpoint.md
git commit -m "docs: update checkpoint after AI engine revamp"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Multi-step generation flow (plan → generate → validate/fix) | Pre-existing — unchanged |
| Stronger prompt instructions | Pre-existing — unchanged (prompts already solid) |
| Completion checks using expectedCount | Task 1 |
| Retry/fallback when output incomplete | Pre-existing — unchanged |
| Provider compatibility | Task 4 (streaming only for openai/anthropic; gemini/adesso unchanged) |
| Improve user-facing generation feedback | Tasks 3, 5 (live streaming preview replaces skeleton) |
| cachedPlan bug fix | Task 2 |
| planText in GenerationResult | Task 2 |

**Placeholder scan:** None found. Every step contains exact code.

**Type consistency:**
- `streamingPreview: string | null` — defined in Task 3 (store), used in Task 3 (CanvasPane), wired in Task 5 (ChatPane) ✅
- `planText: string | null` in `GenerationResult` — defined in Task 2 (ai.ts), consumed in Task 2 (ChatPane) ✅
- `onChunk?: (partial: string) => void` — added to `generatePresentation` in Task 4, used in Task 5 ✅
- `callProvider` `onChunk?` param — added in Task 4, only called in Task 4 ✅
