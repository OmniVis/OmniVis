import { buildPlanningPrompt, buildPlanModeSystemPrompt, buildOutlineFromAnswersPrompt, buildQuestionGenerationPrompt, buildPrompt, buildRepairPrompt, parseQuestions } from "./prompt";
import type { ChatMessage, Provider, UserContext } from "@/store/slidiStore";
import { logUsage } from "./usageTracker";
import type { OperationType } from "./usageTracker";

export interface GenerationResult {
  code: string;
  isComplete: boolean;
  slideCount: number | null;
  expectedCount: number;
  planText: string | null;
}

export const ADESSO_MODELS: { id: string; label: string }[] = [
  { id: "gpt-4.1", label: "GPT-4.1 (Azure EU)" },
  { id: "gpt-4o", label: "GPT-4o (Azure EU)" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini (Azure EU)" },
  { id: "gpt-oss-120b-sovereign", label: "GPT-OSS 120B — Free (DE)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (EU)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (EU)" },
];

const FREE_ADESSO_MODEL_IDS = new Set([
  "gpt-oss-120b-sovereign",
]);

export function isFreeAdessoModel(modelId: string): boolean {
  return FREE_ADESSO_MODEL_IDS.has(modelId);
}

function extractCode(raw: string): string {
  const jsonFenced = raw.match(/```(?:json)?\n([\s\S]*?)```/);
  if (jsonFenced) return jsonFenced[1].trim();
  const fenced = raw.match(/```(?:jsx|tsx|js|ts|javascript)?\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

function detectSlideCount(code: string): number | null {
  try {
    const data = JSON.parse(code);
    if (data && Array.isArray(data.slides)) return data.slides.length;
  } catch {}

  const totalSlidesMatch = code.match(/const\s+totalSlides\s*=\s*(\d+)/);
  if (totalSlidesMatch) return parseInt(totalSlidesMatch[1], 10);

  const slideConditionMatches = code.match(/current\s*===\s*\d+/g) ?? [];
  if (slideConditionMatches.length > 0) return slideConditionMatches.length;

  return null;
}

function assertLikelyCompletePresentation(code: string, minSlides = 6): string {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("Model returned empty code.");
  }

  try {
    const data = JSON.parse(trimmed);
    if (!data.slides || !Array.isArray(data.slides)) {
      throw new Error("Model output is incomplete: missing slides array.");
    }
    if (data.slides.length < minSlides) {
      throw new Error(`Model output incomplete: expected at least ${minSlides} slides, got ${data.slides.length}.`);
    }
    return trimmed;
  } catch (e) {
    if (e instanceof SyntaxError && trimmed.startsWith("{")) {
       throw new Error("Model output appears truncated (invalid JSON). Please retry.");
    }
  }

  // Catch common truncation patterns from model output limits.
  const openCurly = (trimmed.match(/\{/g) ?? []).length;
  const closeCurly = (trimmed.match(/\}/g) ?? []).length;
  const openParen = (trimmed.match(/\(/g) ?? []).length;
  const closeParen = (trimmed.match(/\)/g) ?? []).length;
  const openBracket = (trimmed.match(/\[/g) ?? []).length;
  const closeBracket = (trimmed.match(/\]/g) ?? []).length;

  if (closeCurly < openCurly || closeParen < openParen || closeBracket < openBracket) {
    throw new Error("Model output appears truncated (unbalanced syntax). Please retry.");
  }

  if (!/export\s+default\s+function\s+Presentation\s*\(/.test(trimmed)) {
    throw new Error("Model output is incomplete: missing default Presentation component.");
  }

  const slideCount = detectSlideCount(trimmed);
  if (slideCount !== null && slideCount < minSlides) {
    throw new Error(`Model output incomplete: expected at least ${minSlides} slides, got ${slideCount}.`);
  }

  // Soft layout check — non-throwing; warns if 16:9 root contract may be missing
  if (!trimmed.includes('h-screen') && !trimmed.includes('min-h-screen')) {
    console.warn('[Slidi] Generated code missing h-screen on root. Possible layout regression.');
  }

  return trimmed;
}

function parseExpectedSlideCount(messages: ChatMessage[]): number {
  const last = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
  const match = last.match(/\b(\d+)[- ]?slides?\b/i)
             ?? last.match(/\b(\d+)[- ]?slide\b/i);
  const n = match ? parseInt(match[1], 10) : 14;
  return Math.max(4, Math.min(n, 30));
}

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
    // Last element may be an incomplete line — carry it to next iteration
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

function normalizeAnthropicMessages(
  messages: ChatMessage[]
): { role: "user" | "assistant"; content: string }[] {
  const eligible = messages.filter(
    (m) => m.role === "user" || (m.role === "system" && (m.isOutput || m.isPlanResponse))
  );
  const result: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of eligible) {
    const apiRole = m.role === "user" ? ("user" as const) : ("assistant" as const);
    const last = result[result.length - 1];
    if (last && last.role === apiRole) {
      if (apiRole === "user") {
        // Merge consecutive user messages so both are preserved
        result[result.length - 1] = { role: "user", content: last.content + "\n\n" + m.content };
      } else {
        // For consecutive assistant messages keep only the most recent
        result[result.length - 1] = { role: "assistant", content: m.content };
      }
    } else {
      result.push({ role: apiRole, content: m.content });
    }
  }
  // Anthropic requires the conversation to end with a user message
  if (result.length > 0 && result[result.length - 1].role === "assistant") {
    result.push({ role: "user", content: "Please continue." });
  }
  return result;
}

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

async function callAdesso(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ],
    max_tokens: isFreeAdessoModel(model) ? 8192 : 16384,
    temperature: 0.7,
  };

  const res = await fetch(`${BASE}/api/adesso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `adesso AI Hub error ${res.status}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return extractCode(data.choices[0].message.content);
}

async function callAdessoStream(
  messages: ChatMessage[],
  apiKey: string,
  systemPrompt: string,
  model: string,
  onChunk: (partial: string) => void
): Promise<string> {
  const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const body = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ],
    max_tokens: isFreeAdessoModel(model) ? 8192 : 16384,
    temperature: 0.7,
    stream: true,
  };

  const res = await fetch(`${BASE}/api/adesso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `adesso AI Hub error ${res.status}`);
  }

  if (!res.body) throw new Error("adesso streaming response has no body.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let remainder = "";

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
        };
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

function assertNeverProvider(provider: never): never {
  throw new Error(`Unknown provider: ${provider}`);
}

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
      return onChunk
        ? callAdessoStream(messages, apiKey, systemPrompt, adessoModel, onChunk)
        : callAdesso(messages, apiKey, systemPrompt, adessoModel);
    default:
      return assertNeverProvider(provider);
  }
}

export type GenerationStage = "planning" | "generating" | "finalizing";

/**
 * generateSlideEdit — targeted single-slide edit via contextManager windowing.
 *
 * The caller provides a pre-built windowed message (from
 * `buildWindowedEditMessages`) that contains only the active slide's JSX block
 * and the edit instruction (~200–500 tokens vs. ~8,000 for a full deck).
 *
 * The AI is instructed to return ONLY the updated slide block (not the full
 * component), which the caller splices back with `spliceSlideBlock`.
 *
 * Returns the raw response string, or null if the call fails or the response
 * does not look like a valid slide block — the caller should fall back to
 * `generatePresentation` in that case.
 */
export async function generateSlideEdit(
  windowedMessages: ChatMessage[],
  apiKey: string,
  provider: Provider,
  adessoModel = "gpt-4.1"
): Promise<string | null> {
  if (!apiKey) return null;

  const systemPrompt = `You are a React/JSX slide editor for Slidi presentations. The user provides a single slide block and an edit instruction. Return ONLY the updated slide block — no markdown fences, no explanation, no extra text. The block must start with \`{current ===\` and end with \`}\`.`;

  try {
    const raw = await callProvider(
      provider,
      windowedMessages,
      apiKey,
      systemPrompt,
      adessoModel,
      undefined,
      "edit"
    );

    const trimmed = raw.trim();
    // Basic sanity check: response should look like a slide block
    if (!trimmed.startsWith("{current ===")) return null;

    // Strip any content after the first slide block — AI sometimes appends
    // empty blocks for subsequent slides which corrupt the splice result.
    const nextBlockIdx = trimmed.indexOf("{current ===", 1);
    return nextBlockIdx !== -1 ? trimmed.slice(0, nextBlockIdx).trimEnd() : trimmed;
  } catch {
    return null;
  }
}

const OUTLINE_APPROVAL_KEYWORDS = ["generate", "yes", "looks good", "let's go", "do it", "proceed"];

/**
 * Returns true when the planning conversation should proceed to generation:
 * - AI response contains the OUTLINE READY sentinel, OR
 * - The user's current input matches an approval keyword (case-insensitive).
 */
export function detectOutlineApproval(aiResponse: string, userInput?: string): boolean {
  if (aiResponse.includes("OUTLINE READY")) return true;
  if (userInput) {
    const lower = userInput.toLowerCase();
    return OUTLINE_APPROVAL_KEYWORDS.some((kw) => lower.includes(kw));
  }
  return false;
}

/**
 * Phase 1 of the Plan Mode wizard: generates 8 clarifying questions for a given topic.
 */
export async function generatePlanQuestions(
  topic: string,
  apiKey: string,
  provider: Provider,
  adessoModel = "gpt-4.1",
  userCtx?: UserContext | null,
  mode?: "corporate" | "private"
): Promise<string[]> {
  if (!apiKey) throw new Error("No API key configured.");
  const systemPrompt = buildQuestionGenerationPrompt(userCtx, mode);
  const messages: ChatMessage[] = [{ role: "user", content: topic }];
  const raw = await callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-questions");
  const questions = parseQuestions(raw);
  if (questions.length === 0) throw new Error("AI did not return a valid question list.");
  return questions;
}

/**
 * Phase 3 of the Plan Mode wizard: generates an outline from collected Q&A pairs.
 */
export async function generateOutlineFromAnswers(
  topic: string,
  questions: string[],
  answers: string[],
  apiKey: string,
  provider: Provider,
  adessoModel = "gpt-4.1",
  userCtx?: UserContext | null,
  mode?: "corporate" | "private"
): Promise<string> {
  if (!apiKey) throw new Error("No API key configured.");
  const systemPrompt = buildOutlineFromAnswersPrompt(userCtx, mode);
  const qaContent = questions
    .map((q, i) => `Q${i + 1}: ${q}\nA: ${answers[i] ?? "(no answer)"}`)
    .join("\n\n");
  const messages: ChatMessage[] = [
    { role: "user", content: `Topic: ${topic}` },
    { role: "user", content: `My answers:\n\n${qaContent}\n\nPlease generate the slide outline.` },
  ];
  return callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-outline");
}

/**
 * Single conversational turn for Plan Mode. Returns raw AI text (no code extraction).
 * The AI is prompted to ask questions and produce a slide outline, not JSX.
 */
export async function generatePlanModeResponse(
  messages: ChatMessage[],
  apiKey: string,
  provider: Provider,
  adessoModel = "gpt-4.1",
  userCtx?: UserContext | null,
  mode?: "corporate" | "private"
): Promise<string> {
  if (!apiKey) throw new Error("No API key configured.");
  const systemPrompt = buildPlanModeSystemPrompt(userCtx, mode);
  // callProvider extracts code fences — safe here because the plan mode prompt
  // instructs the AI not to output code, so extractCode returns the text unchanged.
  return callProvider(provider, messages, apiKey, systemPrompt, adessoModel, undefined, "plan-outline");
}

/**
 * Generates a deterministic entropy hint for layout variety.
 * Same topic → same variety sequence; different topics → different sequences.
 */
function buildEntropyHint(topic: string, slideCount: number): string {
  const archetypes = [
    'HERO-FULL-BLEED', 'TWO-COLUMN', 'STAT-SPOTLIGHT', 'CHART-WITH-ANNOTATION',
    'TIMELINE-HORIZONTAL', 'QUOTE-WITH-ACCENT', 'MAGAZINE-WRAP', 'MOSAIC-GRID',
    'DIAGONAL-SPLIT', 'IMMERSIVE-HERO',
  ];
  const fills = ['svg-grid', 'large-circle', 'diagonal-gradient', 'full-bleed-gradient', 'diagonal-gradient'];
  const anims = ['spring-stagger', 'timeline-sequence', 'counter', 'stroke-draw', 'fade-cascade'];

  // Simple hash from topic string
  const hash = topic.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);

  // Deterministic shuffle of archetypes so no two adjacent slides share the same one
  const shuffled = [...archetypes].sort((a, b) => {
    const ai = archetypes.indexOf(a);
    const bi = archetypes.indexOf(b);
    return ((hash * (ai + 3)) % archetypes.length) - ((hash * (bi + 3)) % archetypes.length);
  });

  const assignments = Array.from({ length: slideCount }, (_, i) => ({
    slide: i + 1,
    archetype: shuffled[i % shuffled.length],
    fill: fills[(hash + i * 3) % fills.length],
    anim: anims[(hash + i * 7) % anims.length],
  }));

  return `\n\nVARIETY PLAN (follow this — different archetype on every consecutive slide):\n` +
    assignments.map(s => `Slide ${s.slide}: ${s.archetype} | fill:${s.fill} | anim:${s.anim}`).join('\n');
}

export async function generatePresentation(
  messages: ChatMessage[],
  apiKey: string,
  themeBlock: string,
  provider: Provider,
  adessoModel = "gpt-4.1",
  onStageChange?: (stage: GenerationStage) => void,
  options?: {
    skipPlanning?: boolean;
    cachedPlan?: string | null;
    userContext?: UserContext | null;
    presentationMode?: "corporate" | "private";
    activePersona?: string | null;
    designBrief?: string | null;
    premiumPresentationMode?: boolean;
  },
  onChunk?: (partial: string) => void
): Promise<GenerationResult> {
  if (!apiKey) throw new Error("No API key configured.");

  const isFreeModel = provider === "adesso" && isFreeAdessoModel(adessoModel);
  const maxSlides = isFreeModel ? 5 : undefined;
  const expectedCount = isFreeModel ? 5 : parseExpectedSlideCount(messages);
  const userCtx = options?.userContext;
  const presMode = options?.presentationMode;
  const personaId = options?.activePersona ?? null;
  const designBrief = options?.designBrief ?? null;
  const premiumMode = options?.premiumPresentationMode ?? false;
  let planText = options?.cachedPlan ?? null;

  // Extract topic from last user message for entropy hint
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const topicForEntropy = lastUserMsg.slice(0, 200);

  // Pass 1: planning — skipped for follow-up edits or when a cached plan is provided
  if (!options?.skipPlanning) {
    onStageChange?.("planning");
    const planningPrompt = buildPlanningPrompt(themeBlock, maxSlides, userCtx, presMode, personaId, designBrief, premiumMode);
    planText = await callProvider(provider, messages, apiKey, planningPrompt, adessoModel, undefined, "generate");
  }

  // Pass 2: generate full component
  onStageChange?.("generating");
  const generationPrompt = buildPrompt(themeBlock, maxSlides, userCtx, presMode, personaId, designBrief, premiumMode);
  const entropyHint = buildEntropyHint(topicForEntropy, maxSlides ?? expectedCount);
  const generationMessages: ChatMessage[] = [
    ...messages,
    ...(planText
      ? [{
          role: "user" as const,
          content: `Use this slide plan while generating the full component:\n\n${planText}\n\nReturn complete code only.${entropyHint}`,
        }]
      : [{ role: "user" as const, content: entropyHint }]),
  ];
  const firstAttemptCode = await callProvider(provider, generationMessages, apiKey, generationPrompt, adessoModel, onChunk, "generate");

  try {
    const code = assertLikelyCompletePresentation(firstAttemptCode, Math.max(4, expectedCount - 1));
    return {
      code,
      isComplete: true,
      slideCount: detectSlideCount(code),
      expectedCount,
      planText: planText ?? null,
    };
  } catch (initialError) {
    // Pass 3: repair — only if pass 2 failed validation
    onStageChange?.("finalizing");
    const repairPrompt = buildRepairPrompt(themeBlock, maxSlides, userCtx, presMode, personaId, designBrief, premiumMode);
    const repairMessages: ChatMessage[] = [
      {
        role: "user",
        content: `Original request context:\n${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nSlide plan:\n${planText ?? "none"}\n\nCandidate code:\n${firstAttemptCode}\n\nRepair reason:\n${initialError instanceof Error ? initialError.message : "Unknown validation error"}\n\nThe user requested ${expectedCount} slides. Your repaired component MUST include exactly ${expectedCount} slides (current === 0 through current === ${expectedCount - 1}). Return ONLY the fully fixed component.`,
      },
    ];

    const repairedCode = await callProvider(provider, repairMessages, apiKey, repairPrompt, adessoModel, undefined, "repair");

    // Try strict validation first
    try {
      const code = assertLikelyCompletePresentation(repairedCode, Math.max(4, expectedCount - 1));
      return {
        code,
        isComplete: true,
        slideCount: detectSlideCount(code),
        expectedCount,
        planText: planText ?? null,
      };
    } catch {
      // Partial result: safe to render but incomplete
      const trimmed = repairedCode.trim();
      const hasPresentationExport = /export\s+default\s+function\s+Presentation\s*\(/.test(trimmed);
      const openCurly = (trimmed.match(/\{/g) ?? []).length;
      const closeCurly = (trimmed.match(/\}/g) ?? []).length;
      const isSyntaxSafe = hasPresentationExport && Math.abs(openCurly - closeCurly) <= 3;

      if (isSyntaxSafe) {
        const slideCount = detectSlideCount(trimmed);
        return {
          code: trimmed,
          isComplete: false,
          slideCount,
          expectedCount,
          planText: planText ?? null,
        };
      }

      // Completely broken — hard error
      throw new Error("Generation failed: output is incomplete and cannot be rendered. Please try again.");
    }
  }
}
