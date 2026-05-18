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

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function logUsage(entry: Omit<UsageEntry, "id" | "costUsd">): void {
  if (typeof window === "undefined") return;
  try {
    const history = getUsageHistory();
    const newEntry: UsageEntry = {
      ...entry,
      id: generateId(),
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

// Pricing reference data for the UI table (includes Adesso as external link row)
export const PRICING_TABLE = [
  { provider: "OpenAI",    model: "gpt-4o",             inputPer1M: 2.50,  outputPer1M: 10.00, adesso: false },
  { provider: "Anthropic", model: "claude-sonnet-4-6",  inputPer1M: 3.00,  outputPer1M: 15.00, adesso: false },
  { provider: "Gemini",    model: "gemini-2.0-flash",   inputPer1M: 0.15,  outputPer1M: 3.50,  adesso: false },
] as const;

// Typical full deck estimate: ~8 000 input + ~6 000 output tokens
export const TYPICAL_INPUT_TOKENS = 8_000;
export const TYPICAL_OUTPUT_TOKENS = 6_000;
