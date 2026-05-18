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

  const titleRegex = /(?:const\s+title\s*=\s*|title\s*:\s*)["'`]([^"'`]+)["'`](?:\s*;)?/i;
  const match = code.match(titleRegex);
  if (match && match[1]) {
    return match[1].trim().slice(0, 50);
  }

  const h1Regex = /<h1[^>]*>([^<]+)<\/h1>/i;
  const h1Match = code.match(h1Regex);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim().slice(0, 50);
  }

  return generateSessionName(sessions);
}
