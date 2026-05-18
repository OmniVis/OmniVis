# Cost Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/usage` page with a pricing reference table and per-request cost history (localStorage, capped at 100 entries) accessible from the account dropdown.

**Architecture:** A new `usageTracker.ts` utility handles all localStorage I/O and pricing math. `ai.ts` is modified to capture real token counts from provider responses and call `logUsage` as a side effect. A new Next.js page at `src/app/usage/page.tsx` reads history on mount and renders summary cards, pricing table, and paginated history. A link is added to the account dropdown in `Header.tsx`.

**Tech Stack:** Next.js App Router, React 18, Tailwind CSS, lucide-react, localStorage

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/usageTracker.ts` | Types, pricing constants, computeCost, logUsage, getUsageHistory, clearUsageHistory |
| Create | `src/__tests__/usageTracker.test.ts` | Unit tests for all usageTracker functions |
| Modify | `src/lib/ai.ts` | Capture token counts from all BYOK provider responses; thread operationType through callProvider |
| Create | `src/app/usage/page.tsx` | Full Cost Tracker page: summary cards, pricing table, paginated history |
| Modify | `src/components/Header.tsx` | Add Cost Tracker link in account dropdown |

---

## Task 1: Create `src/lib/usageTracker.ts`

**Files:**
- Create: `src/lib/usageTracker.ts`

- [ ] **Step 1: Write the file**

```typescript
import type { Provider } from "@/store/slidiStore";

export type OperationType = "generate" | "edit" | "plan-questions" | "plan-outline" | "repair";

export interface UsageEntry {
  id: string;
  timestamp: number;
  provider: Exclude<Provider, "adesso">;
  model: string;
  operation: OperationType;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Published rates as of 2026-05-12. Update when providers change pricing.
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o":            { inputPer1M: 2.50,  outputPer1M: 10.00 },
  "claude-sonnet-4-6": { inputPer1M: 3.00,  outputPer1M: 15.00 },
  "gemini-2.0-flash":  { inputPer1M: 0.15,  outputPer1M: 3.50  },
};

const STORAGE_KEY = "slidi_usage_history";
const MAX_ENTRIES = 100;

export function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = PRICING[model];
  if (!rates) return 0;
  return (inputTokens / 1_000_000) * rates.inputPer1M + (outputTokens / 1_000_000) * rates.outputPer1M;
}

export function logUsage(entry: Omit<UsageEntry, "id" | "costUsd">): void {
  if (typeof window === "undefined") return;
  try {
    const history = getUsageHistory();
    const newEntry: UsageEntry = {
      ...entry,
      id: crypto.randomUUID(),
      costUsd: computeCost(entry.model, entry.inputTokens, entry.outputTokens),
    };
    const trimmed = [newEntry, ...history].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage quota or parse error — skip silently
  }
}

export function getUsageHistory(): UsageEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UsageEntry[];
  } catch {
    return [];
  }
}

export function clearUsageHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// Pricing reference data for the UI table (includes Adesso as external link)
export const PRICING_TABLE = [
  { provider: "OpenAI",    model: "gpt-4o",            inputPer1M: 2.50,  outputPer1M: 10.00, adesso: false },
  { provider: "Anthropic", model: "claude-sonnet-4-6", inputPer1M: 3.00,  outputPer1M: 15.00, adesso: false },
  { provider: "Gemini",    model: "gemini-2.0-flash",  inputPer1M: 0.15,  outputPer1M: 3.50,  adesso: false },
  { provider: "Adesso",    model: "Various (Azure EU)", inputPer1M: null,  outputPer1M: null,  adesso: true  },
] as const;

// Typical full deck estimate: ~8 000 input + ~6 000 output tokens
export const TYPICAL_INPUT_TOKENS = 8_000;
export const TYPICAL_OUTPUT_TOKENS = 6_000;
```

- [ ] **Step 2: Verify the file compiles (TypeScript check)**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors for the new file (other pre-existing errors are acceptable at this stage).

---

## Task 2: Write and run tests for `usageTracker`

**Files:**
- Create: `src/__tests__/usageTracker.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { logUsage, getUsageHistory, clearUsageHistory, computeCost } from "@/lib/usageTracker";

// Minimal localStorage mock
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  },
  writable: true,
});

describe("computeCost", () => {
  it("computes correct cost for gpt-4o", () => {
    // 1M input ($2.50) + 1M output ($10.00) = $12.50
    expect(computeCost("gpt-4o", 1_000_000, 1_000_000)).toBeCloseTo(12.5);
  });

  it("returns 0 for unknown model", () => {
    expect(computeCost("unknown-model", 1000, 1000)).toBe(0);
  });

  it("computes partial token counts correctly for gpt-4o", () => {
    // 8 000 input * $2.50/1M = $0.02; 6 000 output * $10/1M = $0.06 → total $0.08
    expect(computeCost("gpt-4o", 8_000, 6_000)).toBeCloseTo(0.08);
  });

  it("computes cost for claude-sonnet-4-6", () => {
    expect(computeCost("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBeCloseTo(18.0);
  });

  it("computes cost for gemini-2.0-flash", () => {
    expect(computeCost("gemini-2.0-flash", 1_000_000, 1_000_000)).toBeCloseTo(3.65);
  });
});

describe("usageTracker storage", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("getUsageHistory returns empty array when nothing stored", () => {
    expect(getUsageHistory()).toEqual([]);
  });

  it("logUsage stores a new entry", () => {
    logUsage({ timestamp: Date.now(), provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 1000, outputTokens: 500 });
    const history = getUsageHistory();
    expect(history).toHaveLength(1);
    expect(history[0].provider).toBe("openai");
    expect(history[0].operation).toBe("generate");
    expect(history[0].costUsd).toBeGreaterThan(0);
    expect(history[0].id).toBeTruthy();
  });

  it("logUsage prepends entries (newest first)", () => {
    logUsage({ timestamp: 1, provider: "openai",    model: "gpt-4o",           operation: "generate", inputTokens: 100, outputTokens: 100 });
    logUsage({ timestamp: 2, provider: "anthropic", model: "claude-sonnet-4-6", operation: "edit",     inputTokens: 200, outputTokens: 200 });
    const history = getUsageHistory();
    expect(history[0].provider).toBe("anthropic");
    expect(history[1].provider).toBe("openai");
  });

  it("caps history at 100 entries", () => {
    for (let i = 0; i < 110; i++) {
      logUsage({ timestamp: i, provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 100, outputTokens: 100 });
    }
    expect(getUsageHistory()).toHaveLength(100);
  });

  it("clearUsageHistory removes all entries", () => {
    logUsage({ timestamp: Date.now(), provider: "openai", model: "gpt-4o", operation: "generate", inputTokens: 100, outputTokens: 100 });
    clearUsageHistory();
    expect(getUsageHistory()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests — expect all to pass**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npm test -- --run src/__tests__/usageTracker.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/usageTracker.ts src/__tests__/usageTracker.test.ts
git commit -m "feat(usage): add usageTracker utility with pricing constants and localStorage persistence"
```

---

## Task 3: Capture tokens in `callOpenAI` and `callOpenAIStream`

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Add import for `logUsage` and `OperationType` at the top of `src/lib/ai.ts`**

Add after the existing imports (line 1–2):

```typescript
import { logUsage } from "./usageTracker";
import type { OperationType } from "./usageTracker";
```

- [ ] **Step 2: Add `operationType` parameter to `callOpenAI` and capture usage**

Replace the existing `callOpenAI` function (currently at line ~88) with:

```typescript
async function callOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  operationType?: OperationType
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

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  if (data.usage && operationType) {
    logUsage({
      timestamp: Date.now(),
      provider: "openai",
      model: "gpt-4o",
      operation: operationType,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    });
  }

  return extractCode(data.choices[0].message.content);
}
```

- [ ] **Step 3: Add `operationType` parameter to `callOpenAIStream` and capture usage**

Replace the existing `callOpenAIStream` function with:

```typescript
async function callOpenAIStream(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  onChunk: (partial: string) => void,
  operationType?: OperationType
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
    stream_options: { include_usage: true },
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

  if (!res.body) throw new Error("OpenAI streaming response has no body.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let remainder = "";
  let usageData: { prompt_tokens: number; completion_tokens: number } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = remainder + decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    remainder = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices: Array<{ delta: { content?: string } }>;
          usage?: { prompt_tokens: number; completion_tokens: number };
        };
        const chunk = parsed.choices[0]?.delta?.content;
        if (chunk) {
          accumulated += chunk;
          onChunk(accumulated);
        }
        if (parsed.usage) {
          usageData = parsed.usage;
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  if (usageData && operationType) {
    logUsage({
      timestamp: Date.now(),
      provider: "openai",
      model: "gpt-4o",
      operation: operationType,
      inputTokens: usageData.prompt_tokens,
      outputTokens: usageData.completion_tokens,
    });
  }

  return extractCode(accumulated);
}
```

- [ ] **Step 4: Run TypeScript check — no new errors**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 4: Capture tokens in `callAnthropic` and `callAnthropicStream`

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Update `callAnthropic` to accept `operationType` and capture usage**

Replace the existing `callAnthropic` function (line ~220) with:

```typescript
async function callAnthropic(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  operationType?: OperationType
): Promise<string> {
  const anthropicMessages = normalizeAnthropicMessages(messages);

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    system: systemPrompt,
    messages: anthropicMessages,
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

  const data = await res.json() as {
    content: Array<{ text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  if (data.usage && operationType) {
    logUsage({
      timestamp: Date.now(),
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      operation: operationType,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    });
  }

  return extractCode(data.content[0].text);
}
```

- [ ] **Step 2: Update `callAnthropicStream` to accept `operationType` and capture usage**

Replace the existing `callAnthropicStream` function (line ~254) with:

```typescript
async function callAnthropicStream(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  onChunk: (partial: string) => void,
  operationType?: OperationType
): Promise<string> {
  const anthropicMessages = normalizeAnthropicMessages(messages);

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

  if (!res.body) throw new Error("Anthropic streaming response has no body.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let remainder = "";
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = remainder + decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    remainder = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(line.slice(6)) as {
          type: string;
          message?: { usage?: { input_tokens: number; output_tokens: number } };
          delta?: { type: string; text?: string };
          usage?: { output_tokens: number };
        };
        if (parsed.type === "message_start" && parsed.message?.usage) {
          inputTokens = parsed.message.usage.input_tokens;
        }
        if (parsed.type === "message_delta" && parsed.usage) {
          outputTokens = parsed.usage.output_tokens;
        }
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          accumulated += parsed.delta.text;
          onChunk(accumulated);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  if (inputTokens > 0 && operationType) {
    logUsage({
      timestamp: Date.now(),
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      operation: operationType,
      inputTokens,
      outputTokens,
    });
  }

  return extractCode(accumulated);
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 5: Capture tokens in `callGemini` and thread `operationType` through `callProvider`

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Update `callGemini` to accept `operationType` and capture usage**

Replace the existing `callGemini` function (line ~318) with:

```typescript
async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  operationType?: OperationType
): Promise<string> {
  const history = messages
    .filter((m) => m.role === "user" || (m.role === "system" && m.isOutput))
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n---\n\n${history}` }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 16384,
      temperature: 0.7,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Gemini error ${res.status}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  if (data.usageMetadata && operationType) {
    logUsage({
      timestamp: Date.now(),
      provider: "gemini",
      model: "gemini-2.0-flash",
      operation: operationType,
      inputTokens: data.usageMetadata.promptTokenCount,
      outputTokens: data.usageMetadata.candidatesTokenCount,
    });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return extractCode(text ?? "");
}
```

- [ ] **Step 2: Add `operationType` to `callProvider` and forward it to each provider**

Replace the existing `callProvider` function (line ~404) with:

```typescript
async function callProvider(
  provider: Provider,
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  adessoModel: string,
  onChunk?: (partial: string) => void,
  operationType?: OperationType
): Promise<string> {
  switch (provider) {
    case "openai":
      return onChunk
        ? callOpenAIStream(messages, apiKey, systemPrompt, onChunk, operationType)
        : callOpenAI(messages, apiKey, systemPrompt, operationType);
    case "anthropic":
      return onChunk
        ? callAnthropicStream(messages, apiKey, systemPrompt, onChunk, operationType)
        : callAnthropic(messages, apiKey, systemPrompt, operationType);
    case "gemini":
      return callGemini(messages, apiKey, systemPrompt, operationType);
    case "adesso":
      return callAdesso(messages, apiKey, systemPrompt, adessoModel);
    default:
      return assertNeverProvider(provider);
  }
}
```

- [ ] **Step 3: Update all `callProvider` call sites with operation types**

In `generateSlideEdit` (around line ~457), change:
```typescript
const raw = await callProvider(
  provider,
  windowedMessages,
  apiKey,
  systemPrompt,
  adessoModel
);
```
to:
```typescript
const raw = await callProvider(
  provider,
  windowedMessages,
  apiKey,
  systemPrompt,
  adessoModel,
  undefined,
  "edit"
);
```

In `generatePlanQuestions` (find call to `callProvider`), change:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel);
```
to:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-questions");
```

In `generateOutlineFromAnswers` (find call to `callProvider`), change:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel);
```
to:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-outline");
```

In `generatePlanModeResponse` (find call to `callProvider`), change:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel);
```
to:
```typescript
return callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-outline");
```

In `generatePresentation`, three `callProvider` calls:
1. Planning pass (`planText = await callProvider(...)`):
```typescript
planText = await callProvider(provider, messages, apiKey, planningPrompt, adessoModel, undefined, "generate");
```
2. Generation pass (`const firstAttemptCode = await callProvider(..., onChunk)`):
```typescript
const firstAttemptCode = await callProvider(provider, generationMessages, apiKey, generationPrompt, adessoModel, onChunk, "generate");
```
3. Repair pass (`const repairedCode = await callProvider(...)`):
```typescript
const repairedCode = await callProvider(provider, repairMessages, apiKey, repairPrompt, adessoModel, undefined, "repair");
```

- [ ] **Step 4: Run TypeScript check — expect no errors**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Run the full test suite**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat(usage): capture real token counts from OpenAI, Anthropic, and Gemini responses"
```

---

## Task 6: Create `src/app/usage/page.tsx`

**Files:**
- Create: `src/app/usage/page.tsx`

- [ ] **Step 1: Write the full page component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getUsageHistory,
  clearUsageHistory,
  computeCost,
  PRICING_TABLE,
  TYPICAL_INPUT_TOKENS,
  TYPICAL_OUTPUT_TOKENS,
} from "@/lib/usageTracker";
import type { UsageEntry } from "@/lib/usageTracker";
import Link from "next/link";
import { CircleDollarSign, ExternalLink, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PAGE_SIZE = 25;

const OPERATION_LABELS: Record<string, string> = {
  "generate":       "Generate Deck",
  "edit":           "Slide Edit",
  "plan-questions": "Plan: Questions",
  "plan-outline":   "Plan: Outline",
  "repair":         "Auto-Repair",
};

const PROVIDER_COLORS: Record<string, string> = {
  "openai":    "bg-emerald-100 text-emerald-700",
  "anthropic": "bg-orange-100 text-orange-700",
  "gemini":    "bg-blue-100 text-blue-700",
};

function formatCost(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(4)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function UsagePage() {
  const [history, setHistory] = useState<UsageEntry[]>([]);
  const [page, setPage] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(getUsageHistory());
    setMounted(true);
  }, []);

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearUsageHistory();
    setHistory([]);
    setConfirmClear(false);
    setPage(0);
  }, [confirmClear]);

  const totalCost = history.reduce((sum, e) => sum + e.costUsd, 0);
  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const pageEntries = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Per-provider breakdown
  const byProvider = history.reduce<Record<string, { count: number; cost: number }>>((acc, e) => {
    if (!acc[e.provider]) acc[e.provider] = { count: 0, cost: 0 };
    acc[e.provider].count += 1;
    acc[e.provider].cost += e.costUsd;
    return acc;
  }, {});

  const PROVIDER_DISPLAY: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-3">
        <Link href={`${BASE}/`} className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <CircleDollarSign className="w-5 h-5 text-slate-500" />
        <h1 className="text-sm font-black uppercase tracking-widest text-slate-800">Cost Tracker</h1>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Privacy notice */}
        <p className="text-xs text-slate-400 font-medium">
          Usage data is stored locally in your browser and is never sent to any server.
        </p>

        {/* Summary cards */}
        {mounted && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total spent */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Spent</p>
              <p className="text-2xl font-black text-slate-900">{formatCost(totalCost)}</p>
              <p className="text-[11px] text-slate-400 mt-1">last {history.length} request{history.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Total requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Requests</p>
              <p className="text-2xl font-black text-slate-900">{history.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">max 100 stored</p>
            </div>

            {/* By provider */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">By Provider</p>
              {Object.keys(byProvider).length === 0 ? (
                <p className="text-[11px] text-slate-400">No data yet</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(byProvider).map(([provider, data]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${PROVIDER_COLORS[provider] ?? "bg-slate-100 text-slate-600"}`}>
                        {PROVIDER_DISPLAY[provider] ?? provider}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {data.count} · {formatCost(data.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing reference table */}
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Pricing Reference</h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Model</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Input / 1M</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Output / 1M</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Typical Deck</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE.map((row) => (
                  <tr key={row.provider} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 text-[13px]">{row.provider}</td>
                    <td className="px-4 py-3 text-slate-500 text-[12px] font-mono">{row.model}</td>
                    <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-700">
                      {row.adesso ? "—" : `$${row.inputPer1M!.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-700">
                      {row.adesso ? "—" : `$${row.outputPer1M!.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right text-[13px] font-bold text-slate-800">
                      {row.adesso ? (
                        <a
                          href="https://portal.ai-hub.3asabc.de/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[12px]"
                        >
                          View dashboard
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        formatCost(computeCost(row.model, TYPICAL_INPUT_TOKENS, TYPICAL_OUTPUT_TOKENS))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
              Typical deck estimate based on ~{TYPICAL_INPUT_TOKENS.toLocaleString()} input + ~{TYPICAL_OUTPUT_TOKENS.toLocaleString()} output tokens.
              Prices are hardcoded — check provider sites for latest rates.
            </p>
          </div>
        </div>

        {/* Request history */}
        {mounted && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request History</h2>
              {history.length > 0 && (
                <button
                  onClick={handleClear}
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                    confirmClear
                      ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                      : "text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  {confirmClear ? "Confirm clear" : "Clear history"}
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <CircleDollarSign className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-[13px] text-slate-400 font-medium">No requests recorded yet.</p>
                <p className="text-[11px] text-slate-300 mt-1">Generate a presentation to start tracking.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Operation</th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Provider</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">In</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Out</th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(entry.timestamp)}</td>
                        <td className="px-4 py-3 text-[12px] font-medium text-slate-700">
                          {OPERATION_LABELS[entry.operation] ?? entry.operation}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${PROVIDER_COLORS[entry.provider] ?? "bg-slate-100 text-slate-600"}`}>
                            {PROVIDER_DISPLAY[entry.provider] ?? entry.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-slate-500 tabular-nums">
                          {entry.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-slate-500 tabular-nums">
                          {entry.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] font-bold text-slate-800 tabular-nums">
                          {formatCost(entry.costUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Page {page + 1} of {totalPages} · {history.length} requests
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/usage/page.tsx
git commit -m "feat(usage): add Cost Tracker page with pricing reference and request history"
```

---

## Task 7: Add Cost Tracker link to Header dropdown

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Add `CircleDollarSign` to the lucide-react import**

In `Header.tsx` line 3, add `CircleDollarSign` to the existing import:

```typescript
import { Code2, Paintbrush, MousePointer, Presentation, Settings2, Share2, Undo2, Redo2, Palette, History, LogOut, Trash2, Download, KeyRound, User, ChevronDown, Check, Loader2, LayoutGrid, Activity, CircleDollarSign } from "lucide-react";
```

- [ ] **Step 2: Add the menu item between "Download my data" and "System Status"**

Find the "Download my data" button block (around line 454) and insert the Cost Tracker link after it, before the System Status link:

```tsx
<Link
  href={`${BASE}/usage`}
  onClick={() => setShowProfileMenu(false)}
  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
>
  <CircleDollarSign className="w-4 h-4 text-slate-400 shrink-0" />
  Cost Tracker
</Link>
```

Note: `BASE` is already defined at line 12 as `process.env.NEXT_PUBLIC_BASE_PATH ?? ""`.

- [ ] **Step 3: Run full test suite**

```bash
cd C:/Users/berol/Projekte/AiTools/slidi && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit and push**

```bash
git add src/components/Header.tsx
git commit -m "feat(usage): add Cost Tracker link to account dropdown"
git push origin main
```

---

## Self-Review Checklist

After writing the plan, verify:

- [x] `usageTracker.ts` exports `PRICING_TABLE`, `TYPICAL_INPUT_TOKENS`, `TYPICAL_OUTPUT_TOKENS` — all referenced in `usage/page.tsx` ✓
- [x] `OperationType` used in both `usageTracker.ts` and `ai.ts` — consistent ✓
- [x] All 7 `callProvider` call sites updated with operation types ✓
- [x] `callOpenAIStream` uses `stream_options: { include_usage: true }` ✓
- [x] Adesso excluded from tracking, external link used ✓
- [x] History capped at 100, paginated 25 per page ✓
- [x] `mounted` guard prevents SSR hydration mismatch for localStorage reads ✓
- [x] `BASE` used in header link for sub-path deployment ✓
