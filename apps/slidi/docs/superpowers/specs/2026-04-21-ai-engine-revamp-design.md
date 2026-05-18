# AI Engine Revamp — Design Spec
**Date:** 2026-04-21
**Status:** Approved
**Feature:** AI Engine Revamp (`ai_engine_revamp.md`)

---

## Problem Statement

The current generation engine has two critical bugs and one major UX problem:

1. **Bug — `minSlides` hardcoded to 6:** `assertLikelyCompletePresentation` accepts outputs with as few as 6 slides even when the user requested 10+. The validation threshold is disconnected from `expectedCount`.
2. **Bug — `cachedPlan` immediately reset:** In `ChatPane.tsx`, `setCachedPlan(null)` is called right after generation. Follow-up edits never receive the original structural plan, so the model "forgets" the deck layout on every refinement.
3. **UX — No streaming:** Users wait 30–60 seconds staring at a static status message with zero feedback. The presentation appears all-at-once.

---

## Scope

In scope:
- Fix both bugs
- Add real-time streaming for OpenAI and Anthropic (the dominant providers)
- Improve repair prompt with explicit `expectedCount` context
- Update tests

Out of scope:
- Streaming for Gemini and Adesso (API complexity, lower usage share)
- Chunked/multi-segment generation
- Prompt content changes (prompt is already high quality)

---

## Architecture

The existing 3-pass architecture is kept unchanged:

```
Pass 1 (Planning):   buildPlanningPrompt  →  planText
Pass 2 (Generate):   buildPrompt          →  candidate code   [STREAMING HERE]
Pass 3 (Repair):     buildRepairPrompt    →  repaired code    [if pass 2 fails]
```

Only the transport layer (streaming) and two logic bugs are changed.

---

## Changes

### 1. `src/lib/ai.ts`

#### 1a. Fix `minSlides` validation

Current:
```ts
assertLikelyCompletePresentation(firstAttemptCode)  // uses default minSlides=6
```

Fixed:
```ts
assertLikelyCompletePresentation(firstAttemptCode, Math.max(6, expectedCount - 1))
```

`assertLikelyCompletePresentation` signature unchanged; callers now pass the threshold explicitly.

#### 1b. Add streaming support

New optional callback on `generatePresentation`:

```ts
export async function generatePresentation(
  messages: ChatMessage[],
  apiKey: string,
  themeBlock: string,
  provider: Provider,
  adessoModel?: string,
  onStageChange?: (stage: GenerationStage) => void,
  options?: { skipPlanning?: boolean; cachedPlan?: string | null },
  onChunk?: (partial: string) => void   // NEW — called during pass 2 only
): Promise<GenerationResult>
```

New streaming helpers:
- `callOpenAIStream(messages, apiKey, systemPrompt, onChunk): Promise<string>` — uses `stream: true`, reads `data: {...}` SSE lines, accumulates and calls `onChunk` per chunk
- `callAnthropicStream(messages, apiKey, systemPrompt, onChunk): Promise<string>` — uses `stream: true`, reads `data: content_block_delta` events

`callProvider` gains an `onChunk?` parameter and dispatches to streaming variant for openai/anthropic when `onChunk` is provided, falls back to existing non-streaming for gemini/adesso.

Streaming is only applied to **Pass 2** (generation). Pass 1 (planning) and Pass 3 (repair) remain non-streaming — they produce short text or are triggered as fallback; streaming there adds no UX value.

#### 1c. Improve repair prompt

`buildRepairPrompt` in `prompt.ts` is unchanged. The repair message inside `generatePresentation` is updated to include `expectedCount`:

```ts
content: `Original request context:\n${...}\n\nSlide plan:\n${planText}\n\nCandidate code:\n${firstAttemptCode}\n\nRepair reason:\n${error.message}\n\nThe user requested ${expectedCount} slides. Generate ALL ${expectedCount} slides completely. Return only the fixed component.`
```

---

### 2. `src/store/slidiStore.ts`

`cachedPlan` state and `setCachedPlan` action already exist. No store changes needed. The fix is in ChatPane (see below).

---

### 3. `src/components/ChatPane.tsx`

#### 3a. Fix `cachedPlan` lifecycle

Current (broken):
```ts
if (!skipPlanning && result.code) {
  setCachedPlan(null); // ← destroys the plan immediately
}
```

Fixed: The plan is returned from `generatePresentation` and saved to the store.

`GenerationResult` gets a new optional field:
```ts
export interface GenerationResult {
  code: string;
  isComplete: boolean;
  slideCount: number | null;
  expectedCount: number;
  planText?: string | null;   // NEW — the plan from pass 1
}
```

`generatePresentation` sets `planText` in the return value. `ChatPane` then calls:
```ts
if (result.planText) setCachedPlan(result.planText);
```

Follow-up requests (skipPlanning=true) continue to pass `cachedPlan` from the store — which now actually contains the plan.

#### 3b. Wire up streaming

New state: `const [streamingCode, setStreamingCode] = useState<string | null>(null)`

Pass `onChunk` to `generatePresentation`:
```ts
(partial) => setStreamingCode(partial)
```

The `SrcdocPreview` (or whichever component renders the code preview) checks: if `streamingCode !== null`, render that instead of `generatedCode` from the store. When generation completes, `setStreamingCode(null)` and `pushVersion` is called as before.

The preview renders the partial code live. Since partial JSX may be syntactically incomplete, the preview should suppress render errors silently during streaming (the existing `try/catch` in SrcdocPreview is sufficient — it already handles broken code gracefully).

---

### 4. `src/__tests__/ai-engine.test.ts`

New tests:
- Streaming: verify `onChunk` is called during pass 2 for openai provider
- Streaming: verify `onChunk` is NOT called during pass 1 (planning)
- Validation: verify `minSlides` uses `expectedCount - 1` (e.g., user requests 10, output has 8 → accepted; output has 5 → rejected)
- cachedPlan: verify `result.planText` is set when planning runs, null when `skipPlanning: true`

---

## Data Flow (after revamp)

```
User types → handleSubmit
  → Pass 1: planning (non-streaming)  →  planText saved to store
  → Pass 2: generation (streaming)    →  onChunk → setStreamingCode → live preview
  → validation: uses expectedCount - 1 as threshold
  → if fail: Pass 3 repair (non-streaming, includes expectedCount in prompt)
  → pushVersion(validatedCode)
  → setStreamingCode(null)
  → if result.planText: setCachedPlan(result.planText)
```

---

## Testing

All existing tests continue to pass (streaming is additive via optional callback).

New tests cover:
- Chunk callback invocation pattern
- Corrected minSlides threshold
- planText propagation in GenerationResult

---

## Acceptance Criteria

- [ ] `generatePresentation` with `openai`/`anthropic` + `onChunk` calls the callback multiple times during pass 2
- [ ] With `expectedCount=10`, a 5-slide output triggers repair; a 9-slide output is accepted
- [ ] After generating a new deck, `cachedPlan` in the store is non-null
- [ ] Follow-up request passes that `cachedPlan` to the API
- [ ] Gemini and Adesso generation still works (non-streaming path untouched)
- [ ] All existing tests pass
