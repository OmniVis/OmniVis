# Phase 10: Advanced AI Interaction & Context

**Difficulty:** Medium/Hard
**Focus:** AI Chat Flow, State Management, UI Controls
**Status:** Done and tested

The core premise: Slidi's current generation flow is a one-shot command — the user types a prompt, the AI produces a deck. Phase 10 upgrades the interaction model in three ways: an optional conversational planning mode so the AI can ask questions and refine an outline before generating; user-level custom instructions so the AI always knows who is presenting and in what context; and a Corporate / Private toggle that shifts the AI's tone, vocabulary, and visual style for the audience at hand.

---

## Task 1 — Plan Mode: UI & State

**Problem:** There is no way for a user to enter a conversational pre-generation mode. The model dropdown in `ChatPane` is the only generation-related control today. Adding Plan Mode requires new state (is it on? is a planning conversation active?) and a new UI control that lives naturally next to the model selector without cluttering the input area.

**Files:**
- `src/store/slidiStore.ts` — **[MODIFIED]** add `planMode`, `isPlanModeActive`, `setPlanMode`, `setIsPlanModeActive` to the store interface and implementation; persist `planMode` to `localStorage` (new key `slidi_plan_mode`)
- `src/components/ChatPane.tsx` — **[MODIFIED]** add a Plan Mode toggle pill next to the model dropdown in the input toolbar; visual state (active = blue ring, icon swap) driven by `planMode` from store

**Implementation Steps:**

1. **Store slice (`slidiStore.ts`):**
   - Add to `SlidiState`:
     ```typescript
     planMode: boolean;            // user preference — persisted
     isPlanModeActive: boolean;    // true while a planning conversation is in progress — NOT persisted
     setPlanMode: (v: boolean) => void;
     setIsPlanModeActive: (v: boolean) => void;
     ```
   - Load `planMode` from `localStorage.getItem('slidi_plan_mode') === 'true'` in `loadFromStorage()`.
   - `setPlanMode`: sets state and writes `localStorage.setItem('slidi_plan_mode', ...)`. When toggled OFF mid-conversation, also resets `isPlanModeActive` to `false`.
   - `isPlanModeActive` initialises to `false` and is never persisted — it resets on page load.

2. **Plan Mode toggle button (`ChatPane.tsx`):**
   - Place a second pill button in the `<div className="flex items-center relative" ref={dropdownRef}>` row, directly to the right of the model dropdown button.
   - Use the `SlidersHorizontal` icon (already imported) when inactive, `Sparkles` when active.
   - Label: `"Plan"` with the same `text-[11px] font-bold uppercase tracking-wider` style used by the model button.
   - Active state: `bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-50`; inactive: same style as model button.
   - Clicking toggles `setPlanMode(!planMode)`.
   - Show a small dot indicator on the button when `isPlanModeActive` is true (planning conversation is in flight) — same blue pulse dot used in the header.
   - Tooltip: `"Plan Mode: AI will ask clarifying questions before generating"`.

**Verification:**
- Toggle Plan Mode on → pill turns blue; toggle off → reverts. State persists across page reload.
- When `isPlanModeActive` is true, the blue pulse dot appears on the Plan Mode button.
- Toggling Plan Mode off mid-conversation resets `isPlanModeActive` to `false` and the dot disappears.
- No visual regression on the model dropdown or mic/submit buttons.

---

## Task 2 — Plan Mode: Interactive Chat Flow & Generation Trigger

**Problem:** When Plan Mode is on, `handleSubmit` must route the user's message to a conversational planning AI (which returns questions/outlines as chat text) rather than immediately calling `generatePresentation`. The conversation continues until the AI signals readiness or the user clicks "Generate from Outline". At that point, the accumulated conversation is passed as context to the normal generation pipeline.

**Files:**
- `src/lib/prompt.ts` — **[MODIFIED]** add `buildPlanModeSystemPrompt(): string` — the system prompt for the planning conversation
- `src/lib/ai.ts` — **[MODIFIED]** add `generatePlanModeResponse(messages, apiKey, provider, adessoModel): Promise<string>` — a lightweight single-call (no 3-pass) provider call for plan mode turns; also add `detectOutlineApproval(response: string): boolean` helper
- `src/components/ChatPane.tsx` — **[MODIFIED]** branch `handleSubmit` on `planMode`; render "Generate from Outline" button in the last AI plan-mode message; add "Exit Plan Mode" affordance

**Implementation Steps:**

1. **`buildPlanModeSystemPrompt()` in `prompt.ts`:**
   - The prompt instructs the AI to act as a presentation strategist, NOT a coder.
   - It must:
     - Ask one or two targeted clarifying questions per turn (audience, purpose, key points, preferred structure, slide count).
     - After enough information is gathered, output a numbered slide-by-slide outline (title + one-sentence purpose per slide).
     - End its outline message with the sentinel phrase exactly: `**OUTLINE READY** — say "generate" or click the button below to create your deck.`
   - The sentinel phrase is what `detectOutlineApproval` watches for in AI responses; it also triggers the "Generate from Outline" button to appear in the chat.

2. **`generatePlanModeResponse()` and `detectOutlineApproval()` in `ai.ts`:**
   - `generatePlanModeResponse`: calls `callProvider()` with the plan mode system prompt and the full `messages` array. Uses the same provider/model routing as the regular flow. Returns the raw text response (not code — no `extractCode()` call).
   - `detectOutlineApproval(response: string): boolean`: returns `true` if the response contains `OUTLINE READY` OR if the most recent *user* message in the conversation contains approval keywords: `["generate", "yes", "looks good", "let's go", "do it", "proceed"]` (case-insensitive, partial match). This dual-check covers both the AI-initiated and user-initiated trigger paths.

3. **`handleSubmit` branching in `ChatPane.tsx`:**

   When `planMode` is `true` and `isPlanModeActive` is `false` (first message in a plan conversation):
   - Set `isPlanModeActive(true)`.
   - Add the user message to chat as normal.
   - Add a `"system"` status message: `"Planning your deck structure..."`.
   - Call `generatePlanModeResponse(messages, apiKey, provider, adessoModel, userContext, presentationMode)` and replace the status message with the AI response (using the same `useSlidiStore.setState` pattern as `updateGenerationStatus`).
   - Check `detectOutlineApproval(aiResponse)` — if `true`, immediately trigger generation (see below); otherwise stay in plan mode loop.

   When `planMode` is `true` and `isPlanModeActive` is `true` (follow-up turns in the plan conversation):
   - Same as above but skip the `setIsPlanModeActive(true)` call (already active).
   - Each user message and AI response is appended to `messages` as normal chat turns.
   - `detectOutlineApproval` is evaluated after every AI response.

   **Generation trigger (from either path):**
   - When `detectOutlineApproval` returns `true` OR the user clicks "Generate from Outline":
     1. `setIsPlanModeActive(false)` — the planning conversation is complete.
     2. Add a system message: `"Outline approved — generating your presentation..."`.
     3. Call `generatePresentation(messages, apiKey, themeBlock, provider, adessoModel, onStageChange, { skipPlanning: true, userContext, presentationMode }, onChunk)` (the planning was already done conversationally; the accumulated `messages` serve as the plan context).
     4. Normal post-generation flow resumes (layout validator, `pushVersion`, etc.).

4. **"Generate from Outline" button in `ChatPane.tsx` JSX:**
   - After every AI message that contains `OUTLINE READY`, render a small button below the message body (same amber-strip pattern as the `isIncomplete` notice, but styled blue):
     ```
     bg-blue-50 border border-blue-200 rounded-2xl p-3
     [Sparkles icon] Generate from this outline
     ```
   - Add `isOutlineReady?: boolean` to `ChatMessage` type in `slidiStore.ts` — set it when the AI response contains `OUTLINE READY`.
   - The button calls a `handleGenerateFromOutline()` callback in `ChatPane` that triggers the generation path above.
   - Add an "Exit Plan Mode" × button in the same strip so users can abandon the planning conversation.

5. **Exiting Plan Mode cleanly:**
   - `setPlanMode(false)` resets both `planMode` and `isPlanModeActive` (already covered in Task 1 store logic).
   - When `planMode` is toggled off during an active conversation, append a dismissal system message: `"Plan Mode deactivated."` so the user knows where the conversation ended.

**Verification:**
- Turn on Plan Mode → type "a presentation about climate change" → AI responds with a clarifying question (not code).
- Continue the conversation for 2–3 turns → AI produces a numbered outline ending with `OUTLINE READY`.
- The "Generate from Outline" button appears in the chat under the outline message.
- Clicking the button → `isPlanModeActive` resets → `"Outline approved — generating..."` message → full deck is generated using the conversation as context.
- Saying "looks good, generate it" in the next user message also triggers generation automatically.
- Toggling Plan Mode OFF mid-conversation → `"Plan Mode deactivated."` message, `isPlanModeActive` resets, next message goes through normal generation.
- Plan Mode off → typing a prompt → behaves exactly as before (no regression).

---

## Task 3 — User Context (Custom Instructions)

**Problem:** The AI knows nothing about the person generating the presentation. It produces generic outputs that don't account for the user's role (e.g., "Sales Manager at Adesso"), preferred output language (e.g., German), or standing preferences (e.g., "always include a CTA slide", "avoid technical jargon"). Injecting this context once, globally, is far more efficient than repeating it in every prompt.

**Files:**
- `src/store/slidiStore.ts` — **[MODIFIED]** add `UserContext` type + `userContext` state slice + `setUserContext`; persist to `localStorage` key `slidi_user_context`
- `src/components/SettingsModal.tsx` — **[MODIFIED]** add a fourth `"profile"` tab with a context editing form; update the `SettingsTab` type
- `src/lib/prompt.ts` — **[MODIFIED]** add `buildUserContextBlock(ctx: UserContext | null): string`; inject the block into `buildPrompt()`, `buildPlanningPrompt()`, `buildRepairPrompt()`, and `buildPlanModeSystemPrompt()` (Task 2)
- `src/components/ChatPane.tsx` — **[MODIFIED]** read `userContext` from store and pass `buildUserContextBlock(userContext)` to `generatePresentation()` and `generatePlanModeResponse()`

**Implementation Steps:**

1. **`UserContext` type and store slice (`slidiStore.ts`):**
   ```typescript
   export interface UserContext {
     role: string;           // e.g. "Sales Manager"
     department: string;     // e.g. "Cloud & Digital"
     language: string;       // e.g. "German" — instructs AI to generate in this language
     customInstructions: string; // free-text, max 500 chars
   }
   ```
   - Add `userContext: UserContext | null` and `setUserContext: (ctx: UserContext | null) => void` to `SlidiState`.
   - Load from `localStorage.getItem('slidi_user_context')` in `loadFromStorage()`; parse JSON, default to `null`.
   - `setUserContext`: updates state and writes `JSON.stringify(ctx)` to localStorage. Pass `null` to clear.

2. **"Profile" tab in `SettingsModal.tsx`:**
   - Add `"profile"` to the `SettingsTab` type: `type SettingsTab = "api" | "general" | "profile" | "about"`.
   - Add a tab button labelled `"Profile"` with a `User` icon (from lucide-react) in the tab row.
   - The Profile tab content contains four form fields:
     - **Role** (text input, placeholder: "e.g. Sales Manager")
     - **Department** (text input, placeholder: "e.g. Cloud & Digital")
     - **Output language** (text input, placeholder: "e.g. German — leave blank for English")
     - **Custom instructions** (textarea, max 500 chars, placeholder: "e.g. Always end with a CTA slide. Avoid acronyms unless spelled out first.")
   - A "Save" button calls `setUserContext({ role, department, language, customInstructions })`.
   - A "Clear" button calls `setUserContext(null)`.
   - When `userContext` is non-null, show a small green `"Active"` badge next to the "Profile" tab label so the user knows context is in effect.

3. **`buildUserContextBlock()` in `prompt.ts`:**
   ```typescript
   export function buildUserContextBlock(ctx: UserContext | null): string {
     if (!ctx) return "";
     const lines: string[] = ["USER CONTEXT — apply to every generation:"];
     if (ctx.role)       lines.push(`- Role: ${ctx.role}`);
     if (ctx.department) lines.push(`- Department: ${ctx.department}`);
     if (ctx.language)   lines.push(`- Output language: ${ctx.language} — generate ALL text (headings, body, labels) in this language.`);
     if (ctx.customInstructions) lines.push(`- Standing instructions: ${ctx.customInstructions}`);
     return lines.join("\n");
   }
   ```
   - Update `buildPrompt(themeBlock, maxSlides?, userCtx?)`, `buildPlanningPrompt(themeBlock, maxSlides?, userCtx?)`, `buildRepairPrompt(themeBlock, maxSlides?, userCtx?)` to accept an optional `userCtx: UserContext | null` parameter and prepend `buildUserContextBlock(userCtx)` to the returned prompt string.

4. **Pass context in `ChatPane.tsx`:**
   - Add `const userContext = useSlidiStore((s) => s.userContext);` to the existing store subscriptions.
   - Pass `userContext` to all three prompt builders: `buildPrompt(themeBlock, maxSlides, userContext)`, etc.
   - Pass the same `userContext` as a parameter to `generatePlanModeResponse()` (Task 2) — include the context block in its system prompt so the planning conversation is also context-aware.

**Verification:**
- Open Settings → Profile tab → fill in Role: "Project Manager", Language: "German", custom: "Always include an agenda slide" → Save.
- Generate a presentation → all slide text is in German; an agenda slide is present.
- Custom instructions badge appears green on the Profile tab.
- Clear context → generate again → output reverts to English, no forced agenda slide.
- Existing `buildRepairPrompt` tests still pass; add two new tests to `src/__tests__/prompt.test.ts`: one confirming `buildUserContextBlock` includes the language line, one confirming it returns `""` for `null`.

---

## Task 4 — Corporate vs. Private Mode

**Problem:** A sales deck for a Fortune 500 client and a birthday party slideshow have radically different requirements — formal vs. casual language, data-heavy vs. image-led layouts, conservative vs. expressive colour use. Today, the AI produces the same style for both. A single toggle near the input area lets users shift this axis without having to spell it out in every prompt.

**Files:**
- `src/store/slidiStore.ts` — **[MODIFIED]** add `presentationMode: 'corporate' | 'private'` + `setPresentationMode`; persist to `localStorage` key `slidi_presentation_mode`
- `src/lib/prompt.ts` — **[MODIFIED]** add `buildPresentationModeBlock(mode: 'corporate' | 'private'): string`; inject into `buildPrompt()`, `buildPlanningPrompt()`, and `buildRepairPrompt()`
- `src/components/ChatPane.tsx` — **[MODIFIED]** add mode toggle button in the input toolbar (between the Plan Mode pill and the mic button); read `presentationMode` from store and pass it to generation calls

**Implementation Steps:**

1. **Store slice (`slidiStore.ts`):**
   - Add to `SlidiState`:
     ```typescript
     presentationMode: 'corporate' | 'private';
     setPresentationMode: (mode: 'corporate' | 'private') => void;
     ```
   - Default: `'corporate'` (the more common use case for an internal Adesso tool).
   - Load from `localStorage.getItem('slidi_presentation_mode')` in `loadFromStorage()`; default to `'corporate'` if absent or invalid.
   - `setPresentationMode`: updates state and writes to localStorage.

2. **`buildPresentationModeBlock()` in `prompt.ts`:**
   ```typescript
   export function buildPresentationModeBlock(mode: 'corporate' | 'private'): string {
     if (mode === 'corporate') {
       return `PRESENTATION MODE — CORPORATE:
   - Tone: professional, precise, data-driven. No slang, no humour unless very subtle.
   - Language: formal register. Use "we" and "our" for the company voice.
   - Visuals: structured layouts (TWO-COLUMN, CHART-WITH-ANNOTATION preferred). Charts and statistics over decorative imagery.
   - Colour use: accent colours used sparingly; prefer clean white/dark backgrounds.
   - Always include: an agenda slide, a key takeaways or CTA slide.`;
     }
     return `PRESENTATION MODE — PRIVATE:
   - Tone: warm, conversational, personal. Light humour and casual phrasing welcome.
   - Language: informal. First person ("I", "my") is fine.
   - Visuals: expressive and creative. HERO-FULL-BLEED, QUOTE-WITH-ACCENT, and STAT-SPOTLIGHT archetypes preferred. Bold colour use encouraged.
   - Colour use: vibrant, high-contrast accent blocks.
   - Storytelling: lead with narrative arc rather than data. Emotional resonance over statistics.`;
   }
   ```
   - Update the three prompt builders (`buildPrompt`, `buildPlanningPrompt`, `buildRepairPrompt`) to accept `mode?: 'corporate' | 'private'` (default `'corporate'`) and prepend `buildPresentationModeBlock(mode)`.

3. **Mode toggle button in `ChatPane.tsx`:**
   - Position it in the right-hand button cluster in the input toolbar, between the Plan Mode pill and the mic button.
   - Two states rendered as a small pill toggle:
     - `corporate` state: `Briefcase` icon + label `"Corporate"`, neutral style (same as model button).
     - `private` state: `Smile` icon + label `"Private"`, purple tint (`bg-purple-50 border-purple-300 text-purple-700`).
   - Clicking switches between the two modes via `setPresentationMode`.
   - Tooltip: `"Corporate: formal, data-driven | Private: casual, expressive"`.
   - Read `const presentationMode = useSlidiStore((s) => s.presentationMode);` and pass it to prompt builders in `handleSubmit`.

4. **Wire into generation calls (`ChatPane.tsx` + `ai.ts`):**
   - Final prompt builder signatures (consolidating Tasks 3 and 4):
     ```typescript
     buildPrompt(themeBlock: string, maxSlides?: number, userCtx?: UserContext | null, mode?: 'corporate' | 'private'): string
     buildPlanningPrompt(themeBlock: string, maxSlides?: number, userCtx?: UserContext | null, mode?: 'corporate' | 'private'): string
     buildRepairPrompt(themeBlock: string, minSlides?: number, userCtx?: UserContext | null, mode?: 'corporate' | 'private'): string
     ```
   - Add `userContext` and `presentationMode` to the existing `options` object in `generatePresentation` (avoids expanding the positional parameter list):
     ```typescript
     options?: { skipPlanning?: boolean; cachedPlan?: string | null; userContext?: UserContext | null; presentationMode?: 'corporate' | 'private' }
     ```
   - Inside `generatePresentation`, pass `options.userContext` and `options.presentationMode` to each `buildPrompt` / `buildPlanningPrompt` / `buildRepairPrompt` call.
   - In `ChatPane.handleSubmit`, pass both values: `generatePresentation(messages, apiKey, themeBlock, provider, adessoModel, onStageChange, { skipPlanning, cachedPlan, userContext, presentationMode }, onChunk)`.

**Verification:**
- Switch to `private` mode → generate "birthday party slideshow" → output uses first person, vibrant colours, storytelling arc, no data charts forced.
- Switch to `corporate` → generate "Q4 business review" → output includes agenda slide, formal tone, chart-heavy layouts.
- Mode persists across page reload.
- Both modes work with all four providers (OpenAI, Anthropic, Gemini, Adesso).
- Add two tests to `src/__tests__/prompt.test.ts`: `buildPresentationModeBlock('corporate')` contains `"data-driven"`, `buildPresentationModeBlock('private')` contains `"conversational"`.
