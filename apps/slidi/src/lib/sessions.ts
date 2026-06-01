import type { ChatMessage, ThemeId } from "@/store/slidiStore";

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: number;
}

export interface Session extends SessionMeta {
  history: string[];
  historyTimestamps: number[];
  historyIndex: number;
  messages: ChatMessage[];
  theme: ThemeId;
  cachedPlan: string | null;
  currentVersionId: string;
  notes: Record<number, string>;
}

const SESSIONS_KEY = "slidi_sessions";
export const MAX_SESSIONS = 20;

/** Load session metadata list from localStorage (synchronous). */
export function loadSessions(): SessionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionMeta[];
  } catch {
    return [];
  }
}

/** Persist session metadata list to localStorage (synchronous). */
export function saveSessions(meta: SessionMeta[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(meta));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function generateSessionName(sessions: SessionMeta[]): string {
  return `Presentation ${sessions.length + 1}`;
}

export function extractSessionName(code: string, sessions: SessionMeta[]): string {
  if (!code) return generateSessionName(sessions);

  // 1. JSON slideData format: look for "title": "..." or title: "..." near the start.
  //    Handles both quoted keys (JSON) and unquoted keys (JS objects / legacy JSX).
  const jsonTitleRegex = /"?title"?\s*:\s*"([^"]{3,60})"/;
  const jsonMatch = code.match(jsonTitleRegex);
  if (jsonMatch && jsonMatch[1]) {
    const candidate = jsonMatch[1].trim();
    // Reject CSS / code-like strings (contain curly braces, semicolons, at-signs, etc.)
    if (!/[{};@]/.test(candidate)) {
      return candidate.slice(0, 50);
    }
  }

  // 2. Legacy JSX: const title = "..."
  const constTitleRegex = /(?:const\s+title\s*=\s*)["`']([^"`']{3,60})["`']/i;
  const constMatch = code.match(constTitleRegex);
  if (constMatch && constMatch[1]) {
    return constMatch[1].trim().slice(0, 50);
  }

  // 3. Legacy JSX: first <h1> text content
  const h1Regex = /<h1[^>]*>([^<]{3,60})<\/h1>/i;
  const h1Match = code.match(h1Regex);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim().slice(0, 50);
  }

  return generateSessionName(sessions);
}
