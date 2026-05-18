const KEY = "slidi_user_id";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generates a UUID without relying on crypto.randomUUID (unavailable on plain HTTP). */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: RFC 4122 v4 via Math.random (safe for plain HTTP contexts)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns this browser's persistent identity UUID.
 * Auto-creates one on first call and stores it in localStorage.
 * Returns "" in SSR environments (window is undefined).
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Replaces the stored identity with a user-supplied key.
 * Returns true if the key is valid UUID format, false otherwise.
 */
export function setUserId(key: string): boolean {
  const trimmed = key.trim();
  if (!UUID_RE.test(trimmed)) return false;
  localStorage.setItem(KEY, trimmed);
  return true;
}

/**
 * Clears the stored identity so a fresh UUID is generated on the next getUserId() call.
 */
export function resetUserId(): string {
  const newId = generateUUID();
  localStorage.setItem(KEY, newId);
  return newId;
}
