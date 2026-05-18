# Plan Mode Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix plan mode so it asks one non-repetitive question per turn in a consistent format, parses it reliably, shows a progress bar, and renders a single-question interactive input.

**Architecture:** The AI embeds `[PROGRESS:N]` and `[Q: text]` machine-readable tokens in every plan mode response. `parsePlanResponse` in ChatPane strips these tokens before display and feeds them to a progress bar and a single-input form. The system prompt is rewritten to enforce one question, one format, no repeated topics.

**Tech Stack:** Next.js App Router, React 18, Vitest, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-12-plan-mode-improvements-design.md`

---

### Task 1: Rewrite `buildPlanModeSystemPrompt` in `src/lib/prompt.ts`

**Files:**
- Modify: `src/lib/prompt.ts` (function `buildPlanModeSystemPrompt` at line 302)

- [ ] **Step 1: Replace the function body**

Open `src/lib/prompt.ts`. Find `buildPlanModeSystemPrompt` (line 302). Replace the entire return string with:

```ts
export function buildPlanModeSystemPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const contextBlock = buildUserContextBlock(userCtx ?? null);
  const modeBlock = mode ? buildPresentationModeBlock(mode) : "";
  const prefix = [contextBlock, modeBlock].filter(Boolean).join("\n\n");

  return `${prefix ? prefix + "\n\n" : ""}You are a presentation strategist — NOT a coder. Help the user plan a great presentation before any slides are generated.

STRICT FORMAT RULES — follow exactly every turn:
1. Start your response with \`[PROGRESS:N]\` on its own line, where N is an integer 0–100 representing how complete your understanding is.
2. Ask EXACTLY ONE clarifying question per turn, formatted as \`[Q: question text]\` on its own line.
3. At PROGRESS >= 80, output the slide outline instead of a question. Do NOT include a [Q:] line in outline responses.

TOPIC RULES:
- Cover these topics to build your understanding: audience, purpose, key message, slide count, tone/style.
- If the user's message already answers a topic, mark it as understood and do NOT ask about it again.
- Never ask the same topic twice across turns, even with different wording.
- Ask the most important unanswered topic first.

CONTENT RULES:
- Do NOT output any JSX, React, or code. Output only conversational text, questions, and outlines.
- Keep prose brief — one or two sentences before the [Q:] line is enough.
- Once you have sufficient info (PROGRESS >= 80), output a numbered slide-by-slide outline (title + one-sentence purpose per slide).
- End your outline message with this exact sentinel phrase on its own line:
  **OUTLINE READY** — say "generate" or click the button below to create your deck.

EXAMPLE TURN (gathering info):
[PROGRESS:20]
Happy to help plan your deck!
[Q: Who is the primary audience for this presentation?]

EXAMPLE TURN (outline ready):
[PROGRESS:100]
Here is your outline:
1. Introduction — establish context and hook the audience.
2. Problem — define the core challenge.
...
**OUTLINE READY** — say "generate" or click the button below to create your deck.`;
}
```

- [ ] **Step 2: Update the existing prompt test**

Open `src/__tests__/prompt.test.ts`. Add a new `describe` block at the end of the file:

```ts
describe("buildPlanModeSystemPrompt", () => {
  it("requires [PROGRESS:N] marker in format rules", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("[PROGRESS:N]");
  });

  it("requires [Q: question text] marker in format rules", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("[Q: question text]");
  });

  it("requires OUTLINE READY sentinel", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("**OUTLINE READY**");
  });

  it("forbids asking about already-answered topics", () => {
    const result = buildPlanModeSystemPrompt();
    expect(result).toContain("Never ask the same topic twice");
  });

  it("includes userContext block when provided", () => {
    const ctx: UserContext = { name: "Test", role: "Engineer", company: "ACME", language: "en" };
    const result = buildPlanModeSystemPrompt(ctx);
    expect(result).toContain("Engineer");
    expect(result).toContain("ACME");
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test -- --run
```

Expected: all tests pass (the new describe block should all be green).

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompt.ts src/__tests__/prompt.test.ts
git commit -m "feat(plan-mode): enforce structured [PROGRESS] and [Q:] markers in system prompt"
```

---

### Task 2: Add `parsePlanResponse` as an exported utility in `src/lib/prompt.ts`

**Files:**
- Modify: `src/lib/prompt.ts` — add exported function after `buildPlanModeSystemPrompt`
- Modify: `src/__tests__/prompt.test.ts` — add tests

The function is pure and belongs with the prompt utilities. Exporting it makes it unit-testable without needing to mount a component.

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/prompt.test.ts` (import `parsePlanResponse` at the top of the file alongside the existing imports):

```ts
import { buildPrompt, BASE_PROMPT, buildUserContextBlock, buildPresentationModeBlock, buildPlanModeSystemPrompt, parsePlanResponse } from "@/lib/prompt";
```

Then add this describe block:

```ts
describe("parsePlanResponse", () => {
  it("extracts progress from [PROGRESS:N] token", () => {
    const result = parsePlanResponse("[PROGRESS:42]\nSome text.\n[Q: What is the audience?]");
    expect(result.progress).toBe(42);
  });

  it("extracts question from [Q: text] token", () => {
    const result = parsePlanResponse("[PROGRESS:20]\nSome text.\n[Q: Who is the audience?]");
    expect(result.question).toBe("Who is the audience?");
  });

  it("strips both markers from displayText", () => {
    const result = parsePlanResponse("[PROGRESS:20]\nSome text.\n[Q: Who is the audience?]");
    expect(result.displayText).not.toContain("[PROGRESS:");
    expect(result.displayText).not.toContain("[Q:");
    expect(result.displayText).toContain("Some text.");
  });

  it("returns null progress when marker is absent", () => {
    const result = parsePlanResponse("No markers here.");
    expect(result.progress).toBeNull();
  });

  it("returns null question when [Q:] is absent (e.g. outline response)", () => {
    const result = parsePlanResponse("[PROGRESS:100]\nHere is your outline.\n**OUTLINE READY**");
    expect(result.question).toBeNull();
  });

  it("handles inline [PROGRESS:] without trailing newline gracefully", () => {
    const result = parsePlanResponse("[PROGRESS:55] Some text [Q: What tone?]");
    expect(result.progress).toBe(55);
    expect(result.question).toBe("What tone?");
  });

  it("trims leading/trailing whitespace from displayText", () => {
    const result = parsePlanResponse("[PROGRESS:10]\n\nHello.\n[Q: Audience?]");
    expect(result.displayText.startsWith("\n")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run
```

Expected: FAIL — `parsePlanResponse` is not exported from `@/lib/prompt`.

- [ ] **Step 3: Implement `parsePlanResponse` in `src/lib/prompt.ts`**

Add this function after `buildPlanModeSystemPrompt` (before `buildContextPrefix`):

```ts
export interface PlanResponse {
  progress: number | null;
  question: string | null;
  displayText: string;
}

export function parsePlanResponse(text: string): PlanResponse {
  const progressMatch = text.match(/\[PROGRESS:(\d+)\]/);
  const questionMatch = text.match(/\[Q:\s*(.*?)\]/);

  const progress = progressMatch ? parseInt(progressMatch[1], 10) : null;
  const question = questionMatch ? questionMatch[1].trim() : null;

  const displayText = text
    .replace(/\[PROGRESS:\d+\]\s*/g, "")
    .replace(/\[Q:.*?\]\s*/g, "")
    .trim();

  return { progress, question, displayText };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt.ts src/__tests__/prompt.test.ts
git commit -m "feat(plan-mode): add parsePlanResponse utility for structured AI marker extraction"
```

---

### Task 3: Wire `parsePlanResponse` into ChatPane + add progress state

**Files:**
- Modify: `src/components/ChatPane.tsx`

- [ ] **Step 1: Add import and state**

At the top of `src/components/ChatPane.tsx`, add `parsePlanResponse` to the existing prompt import:

```ts
import { parsePlanResponse } from "@/lib/prompt";
```

Inside `ChatPaneInner`, after the existing `const [answers, setAnswers] = useState<Record<number, string>>({});` line (around line 96), add:

```ts
const [planProgress, setPlanProgress] = useState<number>(0);
const [planQuestion, setPlanQuestion] = useState<string | null>(null);
const [planAnswer, setPlanAnswer] = useState<string>("");
```

- [ ] **Step 2: Parse AI responses when plan mode is active**

In `handleSubmit`, inside the plan mode branch (after `useSlidiStore.setState` that replaces the "Planning deck structure..." message, around line 287), the state update block currently sets the message content to `aiResponse`. Update it to also call `parsePlanResponse`:

Find this block (around lines 287–295):

```ts
useSlidiStore.setState((state) => {
  const msgs = [...state.messages];
  msgs[msgs.length - 1] = {
    role: "system",
    content: aiResponse,
    isOutlineReady: outlineReady,
  };
  return { messages: msgs };
});
```

Replace with:

```ts
const parsed = parsePlanResponse(aiResponse);
if (parsed.progress !== null) setPlanProgress(parsed.progress);
setPlanQuestion(parsed.question);

useSlidiStore.setState((state) => {
  const msgs = [...state.messages];
  msgs[msgs.length - 1] = {
    role: "system",
    content: parsed.displayText,
    isOutlineReady: outlineReady,
  };
  return { messages: msgs };
});
```

- [ ] **Step 3: Reset progress when plan mode is toggled off**

In `handleTogglePlanMode` (around line 472), after `setPlanMode(!planMode)`, add:

```ts
setPlanProgress(0);
setPlanQuestion(null);
setPlanAnswer("");
```

- [ ] **Step 4: Remove the old `answers` state and `parseQuestions` function**

Delete the `parseQuestions` function (lines 48–59 in the original file — the whole function block).

Delete the `answers` state line: `const [answers, setAnswers] = useState<Record<number, string>>({});`

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatPane.tsx
git commit -m "feat(plan-mode): wire parsePlanResponse into ChatPane, add planProgress/planQuestion state"
```

---

### Task 4: Render progress bar and single-question form in ChatPane

**Files:**
- Modify: `src/components/ChatPane.tsx`

- [ ] **Step 1: Add the progress bar**

In the chat area section (the `<div className="flex-1 overflow-y-auto...">` block, around line 504), add the progress bar as the first child inside the scrollable area, right before the `{messages.length === 0 && ...}` block:

```tsx
{planMode && isPlanModeActive && !messages.some(m => m.isOutlineReady) && (
  <div className="sticky top-0 z-10 pb-3 pt-1 bg-[#f9f9f9]/90 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Planning</span>
      <span className="text-[10px] font-bold text-slate-400">{planProgress}%</span>
    </div>
    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${planProgress}%` }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 2: Replace the multi-question form with a single-question form**

Find the block starting at `{planMode && i === messages.length - 1 && (` (around line 561). Replace the entire IIFE block (from `(() => {` through the closing `})()`), keeping the outer `{planMode && i === messages.length - 1 && (` wrapper, with:

```tsx
{planMode && i === messages.length - 1 && planQuestion && (
  <div className="mt-4 space-y-2 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
    <label className="block text-[12px] font-semibold text-slate-600 leading-snug">
      {planQuestion}
    </label>
    <input
      type="text"
      value={planAnswer}
      onChange={(e) => setPlanAnswer(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && planAnswer.trim()) {
          e.preventDefault();
          handleSubmit({ text: planAnswer.trim() });
          setPlanAnswer("");
        }
      }}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      placeholder="Type your answer..."
      autoFocus
    />
    <button
      onClick={() => {
        if (planAnswer.trim()) {
          handleSubmit({ text: planAnswer.trim() });
          setPlanAnswer("");
        }
      }}
      disabled={!planAnswer.trim() || isGenerating}
      className="w-full py-2 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-300 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
    >
      Send Answer
    </button>
  </div>
)}
```

Note: the outer `{planMode && i === messages.length - 1 && (` wrapper from the original code is replaced entirely — the new block is self-contained (it checks `planQuestion` itself).

- [ ] **Step 3: Run the full test suite**

```bash
npm test -- --run
```

Expected: all tests pass. (ChatPane has no unit tests — verify no import errors by checking that the dev server compiles cleanly if available.)

- [ ] **Step 4: Commit**

```bash
git add src/components/ChatPane.tsx
git commit -m "feat(plan-mode): add progress bar and single-question interactive form"
```

---

## Self-Review

**Spec coverage:**
- ✅ System prompt rewritten with `[PROGRESS:N]` and `[Q: text]` markers
- ✅ One question per turn enforced in prompt
- ✅ Topic repetition prohibited in prompt
- ✅ `parsePlanResponse` extracts markers + strips from display text
- ✅ Progress bar renders with animated fill
- ✅ Single-question form replaces broken multi-question form
- ✅ `planProgress` resets on plan mode toggle
- ✅ No store changes (local state only)
- ✅ `detectOutlineApproval` and `generatePlanModeResponse` untouched

**Placeholder scan:** None found.

**Type consistency:**
- `parsePlanResponse` returns `PlanResponse` interface defined in same task, used consistently as `parsed.progress`, `parsed.question`, `parsed.displayText` throughout.
- `planProgress: number`, `planQuestion: string | null`, `planAnswer: string` — all used consistently across Tasks 3 and 4.
