/**
 * One-time admin endpoint to re-encrypt usernames stored as "plain:<value>".
 * These rows exist because DATA_ENCRYPTION_KEY was not set when they were created.
 *
 * Protected by WORKER_AUTH_TOKEN — the same secret used for all D1 admin access.
 * Requires DATA_ENCRYPTION_KEY to be configured; returns 503 if it is not.
 *
 * Usage (replace <token> with the value of WORKER_AUTH_TOKEN):
 *   curl -X POST https://your-host/slidi/api/admin/migrate-usernames \
 *        -H "Authorization: Bearer <token>"
 *
 * Response: { migrated: N, alreadyEncrypted: M }
 *   migrated        — rows that were re-encrypted this run
 *   alreadyEncrypted — rows already in AES-256-GCM format (skipped)
 */

import { d1Query, d1Run } from "@/lib/d1";
import { encryptText } from "@/lib/encrypt";
import { checkRateLimit } from "@/lib/rateLimit";

function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Constant-time string comparison (prevents timing-based token enumeration). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  // Tight rate limit — migration should only run once or twice ever
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`admin:migrate-usernames:${ip}`, 5, 60 * 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  // Auth check
  const token = process.env.WORKER_AUTH_TOKEN;
  if (!token) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!timingSafeEqual(provided, token)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Encryption key must be present and valid before we can migrate
  const keyHex = process.env.DATA_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    return Response.json(
      { error: "DATA_ENCRYPTION_KEY is not set or is not a 64-char hex string. Set it and redeploy before running this migration." },
      { status: 503 }
    );
  }

  // Fetch all users
  const rows = await d1Query<{ user_id: string; username: string }>(
    "SELECT user_id, username FROM users"
  );

  let migrated = 0;
  let alreadyEncrypted = 0;

  for (const row of rows) {
    if (!row.username.startsWith("plain:")) {
      alreadyEncrypted++;
      continue;
    }

    const plaintext = row.username.slice(6); // strip "plain:" prefix
    const encrypted = encryptText(plaintext, keyHex);

    await d1Run(
      "UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [encrypted, row.user_id]
    );
    migrated++;
  }

  console.log(`[migrate-usernames] migrated=${migrated} alreadyEncrypted=${alreadyEncrypted}`);
  return Response.json({ migrated, alreadyEncrypted });
}
