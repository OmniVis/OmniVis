/**
 * Persists a mapping of local session ID → D1 cloud presentation ID.
 * Stored in localStorage so "Save to Cloud" knows whether to POST or PUT.
 */

const MAP_KEY = "slidi_cloud_map";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Returns the D1 cloud ID linked to this local session, or null if never saved. */
export function getCloudId(sessionId: string): string | null {
  return readMap()[sessionId] ?? null;
}

/** Links a local session to its D1 cloud ID. */
export function setCloudId(sessionId: string, cloudId: string): void {
  const map = readMap();
  map[sessionId] = cloudId;
  localStorage.setItem(MAP_KEY, JSON.stringify(map));
}
