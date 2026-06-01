// src/lib/prompts/planning.ts
import type { UserContext } from "@/store/slidiStore";
import { buildContextPrefix } from './builders';

export interface PlanResponse {
  progress: number | null;
  question: string | null;
  displayText: string;
}

/** Parses a numbered list of questions from AI output. */
export function parseQuestions(text: string): string[] {
  const matches = [...text.matchAll(/^\d+\.\s+(.+)$/gm)];
  return matches.map((m) => m[1].trim()).filter(Boolean);
}

export function parsePlanResponse(text: string): PlanResponse {
  const progressMatch = text.match(/\[PROGRESS:(\d+)\]/);
  const questionMatch = text.match(/\[Q:\s*([\s\S]*?)\]/);

  const rawProgress = progressMatch ? parseInt(progressMatch[1], 10) : NaN;
  const progress: number | null = Number.isNaN(rawProgress) ? null : rawProgress;
  const question = questionMatch ? questionMatch[1].trim() : null;

  const displayText = text
    .replace(/\[PROGRESS:\d+\]\s*/g, "")
    .replace(/\[Q:[\s\S]*?\]\s*/g, "")
    .trim();

  return { progress, question, displayText };
}

/** System prompt for the Plan Mode conversational flow (no code output). */
export function buildPlanModeSystemPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);

  return `${prefix}You are a presentation strategist. Your job: immediately produce a slide outline for whatever the user gives you. Never ask questions first — make intelligent assumptions and show a concrete outline right away. The user can then refine it through conversation.

════════════════════════════════════════
OUTPUT FORMAT — NON-NEGOTIABLE, EVERY TURN:

Line 1 (mandatory): [PROGRESS:100]
Then a numbered slide outline:
  N. Slide Title — one-sentence purpose
End with exactly this line:
  **OUTLINE READY** — say "generate" or click the button below to create your deck.

If the user gives feedback ("make it funnier", "add a slide about X", "focus more on Y"), output a revised outline in the same format.
════════════════════════════════════════

OUTLINE RULES:
- Aim for 6–8 slides unless the user specifies a count.
- Make intelligent assumptions about audience, tone, and purpose from context clues. Never ask for clarification.
- If the topic is very vague (e.g., a single word), assume a general informative presentation and state that assumption in one sentence before the outline.
- Format: "N. Slide Title — one-sentence purpose"
- Always end with: **OUTLINE READY** — say "generate" or click the button below to create your deck.

════════════════════════════════════════
EXAMPLES — follow these exactly:

Example 1 — topic with context:
User: "anime for history class about japanese culture"
Your response:
[PROGRESS:100]
1. Introduction: What Is Anime? — Define anime and trace its origins in post-WWII Japan.
2. Roots in Japanese Art — Connect anime's visual language to ukiyo-e prints and manga tradition.
3. Themes That Reflect Society — Explore recurring themes: honor, nature, technology, identity.
4. Studio Ghibli & Cultural Export — How Miyazaki brought Japanese values to a global audience.
5. Anime and Modern Japan — Anime's role in tourism, economy, and national soft power today.
6. Controversies & Critiques — Address cultural appropriation and stereotyping debates.
7. Conclusion: A Mirror of Japan — Anime as a lens into Japanese history and cultural identity.
**OUTLINE READY** — say "generate" or click the button below to create your deck.

Example 2 — vague topic:
User: "turtles"
Your response:
[PROGRESS:100]
Treating this as a general informative presentation about sea turtles.
1. Meet the Sea Turtle — Overview of species and global distribution.
2. Ancient Navigators — 100 million years of evolution and survival.
3. Life Cycle — From egg to ocean: nesting, hatching, and migration.
4. Threats & Challenges — Plastic pollution, climate change, and poaching.
5. Conservation Heroes — Organizations and communities protecting turtles worldwide.
6. What You Can Do — Practical actions to help sea turtle populations recover.
**OUTLINE READY** — say "generate" or click the button below to create your deck.

Example 3 — user refines the outline:
User: "make slide 4 focus on Hayao Miyazaki specifically"
Your response:
[PROGRESS:100]
1. Introduction: What Is Anime? — Define anime and trace its origins in post-WWII Japan.
2. Roots in Japanese Art — Connect anime's visual language to ukiyo-e prints and manga tradition.
3. Themes That Reflect Society — Explore recurring themes: honor, nature, technology, identity.
4. Hayao Miyazaki: A Cultural Icon — Deep dive into Miyazaki's life, philosophy, and films as mirrors of Japanese values.
5. Anime and Modern Japan — Anime's role in tourism, economy, and national soft power today.
6. Controversies & Critiques — Address cultural appropriation and stereotyping debates.
7. Conclusion: A Mirror of Japan — Anime as a lens into Japanese history and cultural identity.
**OUTLINE READY** — say "generate" or click the button below to create your deck.
════════════════════════════════════════`;
}

/** System prompt for generating clarifying questions (Phase 1 of the wizard). */
export function buildQuestionGenerationPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);
  return `${prefix}You are a presentation strategist. Your job: generate exactly 8 targeted questions to understand what the user needs before building their slide outline.

OUTPUT FORMAT — CRITICAL:
Output ONLY a numbered list of 8 questions, one per line. No preamble, no explanation, no other text whatsoever.

1. First question?
2. Second question?
3. Third question?
4. Fourth question?
5. Fifth question?
6. Sixth question?
7. Seventh question?
8. Eighth question?

QUESTION RULES:
- Cover these areas (one question each, adapted to the topic): audience, goal/purpose, tone/style, key topics to include, real examples or data to highlight, slide count or time available, anything to avoid, level of prior knowledge the audience has
- Each question is short, specific, and answerable in a sentence or two
- Do NOT ask compound questions
- Exactly 8 questions — no more, no less
- Output the numbered list only`;
}

/** System prompt for generating an outline from collected Q&A answers (Phase 3 of the wizard). */
export function buildOutlineFromAnswersPrompt(userCtx?: UserContext | null, mode?: "corporate" | "private"): string {
  const prefix = buildContextPrefix(userCtx, mode);
  return `${prefix}You are a presentation strategist. The user has answered a set of clarifying questions about their presentation. Based on their answers, produce a tailored slide outline immediately — no further questions.

OUTPUT FORMAT — NON-NEGOTIABLE:
Line 1 (mandatory): [PROGRESS:100]
Then a numbered slide outline:
  N. Slide Title — one-sentence purpose
End with exactly this line:
  **OUTLINE READY** — say "generate" or click the button below to create your deck.

OUTLINE RULES:
- Reflect the user's specific answers — audience, tone, examples, scope — precisely
- Aim for 6–8 slides unless the user specified otherwise
- Format: "N. Slide Title — one-sentence purpose"
- Always end with: **OUTLINE READY** — say "generate" or click the button below to create your deck.`;
}
