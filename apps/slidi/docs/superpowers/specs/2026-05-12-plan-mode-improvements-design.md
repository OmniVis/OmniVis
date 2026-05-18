# Plan Mode Improvements — Design Spec
**Date:** 2026-05-12

## Problem

Plan mode has three interconnected issues:

1. **Repetitive questions** — the system prompt says "one or two questions per turn" with no topic tracking. The AI re-asks audience, purpose, etc. across turns.
2. **Inconsistent question format** — the AI sometimes outputs bullets, bold headers, or plain prose instead of numbered lists. The `parseQuestions` regex (`/^\d+\.\s+(.*)/`) silently fails, so the interactive answer form never renders.
3. **No progress indicator** — users have no sense of how close the AI is to generating the outline.

## Solution: Approach A — AI-embedded structured markers

Every plan mode AI response includes two machine-readable tokens:

- `[PROGRESS:N]` — integer 0–100 reflecting how complete the AI's understanding is (not turn count).
- `[Q: question text]` — the single question for this turn.

The client parses these out, strips them from the displayed text, and uses them to drive a progress bar and a single-input interactive form.

---

## Changes

### 1. `src/lib/prompt.ts` — `buildPlanModeSystemPrompt`

Rewrite the rules block:

- Start every response with `[PROGRESS:N]` on its own line (N = 0–100).
- Ask EXACTLY ONE question per turn, formatted as `[Q: question text]` on its own line.
- Topics to cover: audience, purpose, key message, slide count, tone/style. Once answered (even from the initial message), never revisit.
- At PROGRESS ≥ 80, output the slide outline instead of a question. Include the `**OUTLINE READY**` sentinel.
- Never output code, JSX, or markdown fences.

### 2. `src/components/ChatPane.tsx` — Parsing

Replace `parseQuestions(text): string[]` with:

```ts
function parsePlanResponse(text: string): {
  progress: number | null;
  question: string | null;
  displayText: string;
}
```

- Extract `[PROGRESS:N]` → `progress`
- Extract `[Q: text]` → `question`
- Strip both markers from `displayText`

### 3. `src/components/ChatPane.tsx` — Progress bar

- Local `useState<number>(0)` for `planProgress` in `ChatPaneInner`.
- When a plan mode AI message arrives, call `parsePlanResponse` and update `planProgress`.
- Render a progress bar at the top of the messages area when `planMode && isPlanModeActive && !isOutlineReady`.
- Shows `Planning: N%` label + animated filled bar (blue, matches plan button styling).
- Disappears once `isOutlineReady`.

### 4. `src/components/ChatPane.tsx` — Interactive form

Replace the multi-question form (lines 566–593) with a single-question form:

- Shows only if `question !== null`.
- One labeled text input, one "Send Answer" button.
- No `answers` record state needed — single `string` state.
- On submit: `handleSubmit({ text: question + ": " + answer })` then clear.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/prompt.ts` | Rewrite `buildPlanModeSystemPrompt` rules |
| `src/components/ChatPane.tsx` | Replace `parseQuestions`, add `parsePlanResponse`, add progress bar, fix interactive form |

## Non-changes

- No store changes — `planProgress` is local UI state that resets with plan mode.
- No changes to `generatePlanModeResponse` in `ai.ts`.
- No changes to `detectOutlineApproval` logic.
