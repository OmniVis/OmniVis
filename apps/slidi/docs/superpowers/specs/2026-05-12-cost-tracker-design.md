# Cost Tracker — Design Spec
Date: 2026-05-12

## Overview

A standalone `/usage` page accessible from the account dropdown that shows:
1. A **static pricing reference table** for all supported BYOK providers.
2. A **personal usage history** — real token counts captured from API responses, stored in localStorage, capped at 100 entries, paginated 25 per page.

Adesso models are excluded from tracking (they have a dedicated dashboard). A link to that dashboard is shown in the pricing table.

---

## Data Layer

### `src/lib/usageTracker.ts` (new file)

**Types:**

```ts
type OperationType = "generate" | "edit" | "plan-questions" | "plan-outline" | "repair";

interface UsageEntry {
  id: string;             // crypto.randomUUID()
  timestamp: number;      // Date.now()
  provider: Provider;     // "openai" | "anthropic" | "gemini"
  model: string;          // e.g. "gpt-4o"
  operation: OperationType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;        // computed from pricing constants
}
```

**Pricing constants (current published rates):**

| Provider  | Model               | Input ($/1M) | Output ($/1M) |
|-----------|---------------------|--------------|---------------|
| OpenAI    | gpt-4o              | $2.50        | $10.00        |
| Anthropic | claude-sonnet-4-6   | $3.00        | $15.00        |
| Gemini    | gemini-2.5-flash    | $0.15        | $3.50         |

**Functions:**
- `logUsage(entry: Omit<UsageEntry, 'id' | 'costUsd'>): void` — compute cost, prepend to localStorage array `slidi_usage_history`, trim to 100 entries.
- `getUsageHistory(): UsageEntry[]` — read from localStorage, return empty array on parse error.
- `clearUsageHistory(): void` — remove `slidi_usage_history` from localStorage.

**LocalStorage key:** `slidi_usage_history`

---

### `src/lib/ai.ts` — changes

Add optional `operationType: OperationType` parameter to `callProvider`. Thread it down to each provider call.

Token capture per provider:

| Function | Response field |
|---|---|
| `callOpenAI` | `data.usage.prompt_tokens` + `data.usage.completion_tokens` |
| `callOpenAIStream` | Add `stream_options: { include_usage: true }` to the request body; OpenAI then sends a final SSE data chunk with `usage` before `[DONE]` |
| `callAnthropic` | `data.usage.input_tokens` + `data.usage.output_tokens` |
| `callAnthropicStream` | Capture from `message_delta` event's `usage.output_tokens` + opening `message_start` event's `usage.input_tokens` |
| `callGemini` | `data.usageMetadata.promptTokenCount` + `data.usageMetadata.candidatesTokenCount` |
| `callAdesso` | Skip — no tracking |

If token counts are unavailable (e.g. provider doesn't return them), skip logging rather than guessing.

**Operation types assigned at call sites:**

| Call site | Operation |
|---|---|
| `generatePresentation` (first attempt) | `"generate"` |
| `generatePresentation` (repair pass) | `"repair"` |
| `generateSlideEdit` | `"edit"` |
| `generatePlanQuestions` | `"plan-questions"` |
| `generateOutlineFromAnswers` | `"plan-outline"` |
| `generatePlanModeResponse` | `"plan-outline"` |

---

## Page: `src/app/usage/page.tsx`

Client component (`"use client"`). Reads from `usageTracker` on mount.

### Layout (top to bottom)

**1. Page header**
- Title: "Cost Tracker"
- Subtitle: "Usage data is stored locally in your browser. It is never sent to any server."

**2. Summary cards** (3-column row)
- **Total spent** — sum of all `costUsd` values, formatted as `$0.0000`
- **Total requests** — count of entries
- **By provider** — pill per provider showing count + subtotal cost

**3. Pricing reference table**
Columns: Provider, Model, Input (per 1M tokens), Output (per 1M tokens), Typical deck est.
- Typical deck estimate: based on ~8,000 input tokens + ~6,000 output tokens (representative full generation)
- Adesso row: costs show "—", with a "View dashboard →" link to `https://portal.ai-hub.3asabc.de/dashboard`

**4. Request history**
- Section header: "Request History" + "Clear history" button (right-aligned, shows confirm state)
- Table columns: Time (relative, e.g. "2 hours ago"), Operation, Provider / Model, Input tokens, Output tokens, Cost
- Paginated: 25 rows per page, up to 4 pages (100 entries max)
- Empty state: "No requests recorded yet. Generate a presentation to start tracking."

---

## Header Integration: `src/components/Header.tsx`

Add a new menu item in the account dropdown (`showProfileMenu` section), between "Download my data" and "System Status":

```tsx
<Link
  href="/usage"
  onClick={() => setShowProfileMenu(false)}
  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
>
  <CircleDollarSign className="w-4 h-4 text-slate-400 shrink-0" />
  Cost Tracker
</Link>
```

`CircleDollarSign` imported from `lucide-react`.

The link is shown regardless of auth mode (page is purely client-side, no server dependency).

---

## Constraints

- No server calls. All data lives in `localStorage`.
- Adesso provider: never tracked, always link out.
- Streaming calls: capture token counts from the final SSE event (both OpenAI and Anthropic send usage in their stream termination event).
- If a provider response doesn't include token counts, skip logging silently.
- Pricing constants are hardcoded. A comment notes they should be updated when provider pricing changes.
