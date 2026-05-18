import { createHmac } from "crypto";

/**
 * HMAC-SHA256 hash of a user UUID before storage in D1.
 * The raw UUID never leaves the client — only the hash is persisted server-side.
 *
 * Set USER_ID_HMAC_SECRET in your environment for production.
 * Falls back to a fixed string so the app works without configuration,
 * but a real secret makes the hashes unguessable even if someone
 * has the D1 database.
 *
 * Server-side only (Next.js API routes).
 */
export function hashUserId(userId: string): string {
  const secret = process.env.USER_ID_HMAC_SECRET ?? "slidi-hmac-v1";
  return createHmac("sha256", secret).update(userId).digest("hex");
}
