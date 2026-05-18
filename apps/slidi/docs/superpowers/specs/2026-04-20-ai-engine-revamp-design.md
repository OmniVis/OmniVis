# AI Engine Revamp — Design Spec
**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** `src/lib/ai.ts`, `src/lib/prompt.ts`, `src/store/slidiStore.ts`, `src/components/ChatPane.tsx`, `src/__tests__/`

---

## Problem

The current 3-pass pipeline (plan → generate → repair) has three failure modes that hurt UX and cost:

1. **No graceful degradation** — if the repair pass also fails validation, the user gets a hard error and loses all generated content, even if 6–7 valid slides were produced.
2. **Repair prompt loses styling rules** — `buildRepairPrompt` strips theme vars, animation classes, and slide count rules, so repaired output often loses visual quality.
3. **Planning pass always runs** — even on follow-up edits where a presentation already exists, burning an unnecessary API call every time.
4. **Gemini loses conversation context** — `callGemini` only passes the last user message, breaking multi-turn editing.
5. **No user-facing recovery affordance** — users have no way to continue an incomplete deck without manually crafting a continuation prompt.

---

## Goals

- Show partial results instead of hard errors when possible.
- Warn the user clearly when a deck is incomplete (>20% below requested slide count).
- Provide a one-click "Try to Complete" continuation that costs exactly 1 API call.
- Skip the planning pass on follow-up edits to reduce API costs by ~30%.
- Fix Gemini multi-turn context.
- Keep all 4 providers (openai, anthropic, gemini, adesso) working identically.

---

## Architecture

### 1. `ai.ts` — New return type

`generatePresentation` returns a `GenerationResult` object instead of a raw string:

```ts
export interface GenerationResult {
  code: string;
  isComplete: boolean;
  slideCount: number | null;   // detected from code via detectSlideCount()
  expectedCount: number;        // parsed from user message, default 8
}
```

`generatePresentation` gains an options parameter:

```ts
export async function generatePresentation(
  messages: ChatMessage[],
  apiKey: string,
  themeBlock: string,
  provider: Provider,
  adessoModel?: string,
  onStageChange?: (stage: GenerationStage) => void,
  options?: { skipPlanning?: boolean }
): Promise<GenerationResult>
```

### 2. `ai.ts` — `parseExpectedSlideCount` helper

New pure function that extracts the requested slide count from the last user message:

```ts
function parseExpectedSlideCount(messages: ChatMessage[]): number {
  const last = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const match = last.match(/\b(\d+)[- ]?slides?\b/i);
  const n = match ? parseInt(match[1], 10) : 8;
  return Math.max(4, Math.min(n, 30)); // clamp to 4–30
}
```

Default: `8`. Clamped to `4–30` to prevent absurd inputs from skewing the warning threshold.

### 3. `ai.ts` — Partial result on repair failure

When the repair pass (pass 3) also fails `assertLikelyCompletePresentation`, the function no longer throws. Instead:

- If the code has balanced braces **and** contains `export default function Presentation` → return `{ code, isComplete: false, slideCount, expectedCount }`.
- If the code is empty or completely structurally broken → throw as before (hard error).

The `>20% missing` warning threshold is computed in `ChatPane` from the returned `slideCount` and `expectedCount`:

```ts
const isMissingSignificantly = 
  slideCount !== null && 
  slideCount < expectedCount * 0.8;
```

### 4. `ai.ts` — Planning pass skip

Pass 1 (planning) is skipped when `options.skipPlanning === true`. In that case, `generatePresentation` goes straight to pass 2:
- If `cachedPlan` is available in the store, it is included as context in the pass 2 prompt.
- If `cachedPlan` is `null` (e.g. first message in a fresh session with `skipPlanning` forced), pass 2 runs without plan context — this is acceptable since the user's message itself provides sufficient context for follow-ups.

### 5. `ai.ts` — Repair prompt tightened

`buildRepairPrompt` is replaced with a lean, targeted version (~10 critical rules only):

```ts
export function buildRepairPrompt(themeBlock: string): string {
  return `${themeBlock}

You are completing an unfinished React presentation component.
Return ONLY the corrected full component. Critical rules:
1. export default function Presentation()
2. const totalSlides = N  (N >= 6)
3. Include all slides from current === 0 to current === totalSlides - 1
4. Use var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub) — never hardcoded colours
5. Use sl-slide-up, sl-scale-in, sl-fade-in, sl-bar-grow, sl-delay-1..5 animation classes
6. Slide counter: {current + 1} / {totalSlides}
7. No markdown fences, no explanation, no commentary
`;
}
```

### 6. `ai.ts` — Gemini context fix

`callGemini` is updated to include full conversation history (not just the last user message):

```ts
const history = messages
  .filter(m => m.role === "user" || (m.role === "system" && m.isOutput))
  .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
  .join("\n\n");

parts: [{ text: `${systemPrompt}\n\n---\n\n${history}` }]
```

---

## Store Changes (`slidiStore.ts`)

### `ChatMessage` — two new optional fields

```ts
interface ChatMessage {
  role: "user" | "system";
  content: string;
  isOutput?: boolean;
  isError?: boolean;
  isIncomplete?: boolean;           // triggers warning card in ChatPane
  incompleteSlideCount?: number;    // slides actually detected
  incompleteExpectedCount?: number; // slides expected
}
```

### `SlidiState` — plan cache

```ts
cachedPlan: string | null;  // in-memory only, NOT persisted to localStorage
setCachedPlan: (plan: string | null) => void;
```

`cachedPlan` is set after pass 1 succeeds. It is cleared when `generatedCode` is empty (new session). It is never written to `localStorage`.

---

## `ChatPane.tsx` Changes

### `handleSubmit` signature change

`handleSubmit` is refactored to accept an optional options object:

```ts
async function handleSubmit(options?: { skipPlanning?: boolean }) { ... }
```

`skipPlanning` is derived from store state when not explicitly passed:

```ts
const skipPlanning = options?.skipPlanning ?? generatedCode.length > 0;
generatePresentation(..., { skipPlanning });
```

### Incomplete result handling

After `generatePresentation` resolves, check `isComplete`:

```ts
if (!result.isComplete && result.slideCount !== null) {
  const isMissingSignificantly = result.slideCount < result.expectedCount * 0.8;
  addMessage({
    role: "system",
    content: isMissingSignificantly
      ? `Deck incomplete — ${result.slideCount} of ${result.expectedCount} slides generated.`
      : `Presentation updated (${result.slideCount} slides).`,
    isOutput: !isMissingSignificantly,
    isIncomplete: isMissingSignificantly,
    incompleteSlideCount: result.slideCount,
    incompleteExpectedCount: result.expectedCount,
  });
} else {
  // normal success message
}
```

### `isIncomplete` message branch

New branch in the message render loop, alongside `isOutput` and `isError`:

```tsx
if (msg.isIncomplete) {
  return (
    <div key={i} className="warning card — amber/orange styling">
      <AlertCircle />
      <p>Deck incomplete — {msg.incompleteSlideCount} of {msg.incompleteExpectedCount} slides generated.</p>
      <button onClick={() => handleComplete(msg.incompleteSlideCount!, msg.incompleteExpectedCount!)}>
        Try to Complete
      </button>
    </div>
  );
}
```

### `handleComplete` — engineered continuation prompt

```ts
function handleComplete(slideCount: number, expectedCount: number) {
  const prompt =
    `The presentation was cut off after slide ${slideCount}. ` +
    `Add slides ${slideCount + 1} through ${expectedCount} with the exact same ` +
    `visual style, theme variables (var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub)), ` +
    `animation classes (sl-slide-up, sl-scale-in, sl-fade-in, sl-delay-1..5), ` +
    `and component structure as the existing slides. ` +
    `Return the complete updated component with all ${expectedCount} slides.`;

  setInput(prompt);
  // handleSubmit is refactored to accept an optional options param
  handleSubmit({ skipPlanning: true });
}
```

This fires exactly 1 API call — no planning pass, no repair pass.

---

## Data Flow

```
User types prompt
  → ChatPane.handleSubmit
      → skipPlanning = generatedCode.length > 0
      → generatePresentation(messages, apiKey, themeBlock, provider, adessoModel, onStageChange, { skipPlanning })
          → [Pass 1: plan]  only if !skipPlanning
              → callProvider(planningPrompt)
              → store result in cachedPlan
          → [Pass 2: generate]
              → callProvider(generationPrompt + cachedPlan context)
              → assertLikelyCompletePresentation(code) → ok? return GenerationResult(isComplete: true)
          → [Pass 3: repair]  only if Pass 2 fails validation
              → callProvider(repairPrompt)
              → assertLikelyCompletePresentation(code) → ok? return GenerationResult(isComplete: true)
              → syntax safe but incomplete? return GenerationResult(isComplete: false)
              → completely broken? throw Error
      → ChatPane reads GenerationResult
          → pushVersion(result.code)
          → isComplete: true  → success message
          → isComplete: false, missing >20% → isIncomplete warning card + "Try to Complete" button
          → isComplete: false, missing ≤20% → normal success message

User clicks "Try to Complete"
  → handleComplete(slideCount, expectedCount)
      → builds continuation prompt
      → handleSubmitWithOptions({ skipPlanning: true })
          → generatePresentation(..., { skipPlanning: true })
              → Pass 2 only (no plan, no repair)
              → returns GenerationResult
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Pass 2 succeeds | `GenerationResult { isComplete: true }` |
| Pass 2 fails, Pass 3 succeeds | `GenerationResult { isComplete: true }` |
| Pass 2 fails, Pass 3 returns safe partial | `GenerationResult { isComplete: false }` — warning card |
| Pass 2 fails, Pass 3 returns broken code | Throw → `isError` message in chat |
| API call fails (network/auth) | Throw → `isError` message in chat |
| "Try to Complete" pass fails | Throw → `isError` message in chat |

---

## Testing

New tests in `src/__tests__/ai-engine.test.ts`:

| Test | What it covers |
|---|---|
| `parseExpectedSlideCount` — "make 10 slides" | Returns 10 |
| `parseExpectedSlideCount` — "a 12-slide deck" | Returns 12 |
| `parseExpectedSlideCount` — no number in message | Returns 8 (default) |
| `parseExpectedSlideCount` — "200 slides" | Returns 30 (clamped) |
| `generatePresentation` — provider returns valid code | `{ isComplete: true }` |
| `generatePresentation` — provider returns truncated code, repair fixes it | `{ isComplete: true }` |
| `generatePresentation` — repair returns safe partial | `{ isComplete: false, slideCount: 5, expectedCount: 10 }` |
| `generatePresentation` — repair returns broken code | throws |
| `generatePresentation` — `skipPlanning: true` | planning prompt never called |

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/ai.ts` | New return type, `parseExpectedSlideCount`, partial result path, `skipPlanning` option, Gemini fix, lean repair prompt |
| `src/lib/prompt.ts` | Replace `buildRepairPrompt` with lean version |
| `src/store/slidiStore.ts` | `isIncomplete` on `ChatMessage`, `cachedPlan` in store |
| `src/components/ChatPane.tsx` | `isIncomplete` branch, `handleComplete`, `skipPlanning` logic |
| `src/__tests__/ai-engine.test.ts` | New test file |

---

## Out of Scope

- Streaming output (would require significant provider API changes)
- Per-slide regeneration
- Automatic retry without user action
- Changes to the Sandpack/SrcdocPreview rendering pipeline
