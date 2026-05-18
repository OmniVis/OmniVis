import { putSessionContent, getSessionContent } from "@/lib/idb";
import type { Session } from "@/lib/sessions";

const MIGRATION_KEY = "slidi_idb_migrated";
const SESSIONS_KEY = "slidi_sessions";

export async function migrateSessionsToIdb(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "1") return;

  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return;

    const sessions: (Session & { history?: string[] })[] = JSON.parse(raw);
    const hasContent = sessions.some((s) => Array.isArray(s.history));

    if (hasContent) {
      // Write full content to IDB
      await Promise.all(sessions.map((s) => putSessionContent(s as Session)));

      // Verify at least the first session was actually written — if IDB silently
      // failed, reading back returns undefined and we abort before stripping localStorage.
      const firstWithContent = sessions.find((s) => Array.isArray(s.history));
      if (firstWithContent) {
        const written = await getSessionContent(firstWithContent.id);
        if (!written) {
          throw new Error("IDB write verification failed — localStorage not modified");
        }
      }

      // Only strip content from localStorage once we know IDB has the data
      const meta = sessions.map(({ id, name, createdAt }) => ({ id, name, createdAt }));
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(meta));
    }
  } catch (err) {
    console.error("[slidi] IDB session migration failed:", err);
  } finally {
    localStorage.setItem(MIGRATION_KEY, "1");
  }
}
