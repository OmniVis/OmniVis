/**
 * One-time admin endpoint to wipe all presentations from D1.
 * Protected by WORKER_AUTH_TOKEN — the same secret used for D1 access.
 *
 * Usage (replace <token> with the value of WORKER_AUTH_TOKEN):
 *   curl -X DELETE https://your-host/api/admin/clear-presentations \
 *        -H "Authorization: Bearer <token>"
 */

import { d1Run } from "@/lib/d1";
import { checkRateLimit } from "@/lib/rateLimit";

function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function DELETE(request: Request) {
  // Hard rate limit — this deletes ALL data
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`admin:clear:${ip}`, 1, 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const token = process.env.WORKER_AUTH_TOKEN;
  if (!token) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  // Constant-time comparison to prevent timing attacks
  if (provided.length !== token.length || !timingSafeEqual(provided, token)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await d1Run("DELETE FROM presentations WHERE 1=1");
    return Response.json({ deleted: true });
  } catch (err) {
    console.error("Admin clear-presentations failed:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
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
