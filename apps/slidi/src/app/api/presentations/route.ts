import { d1Query, d1Run } from "@/lib/d1";
import { hashUserId } from "@/lib/hashUserId";
import { checkRateLimit } from "@/lib/rateLimit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId || !UUID_RE.test(userId)) {
    return Response.json([]);
  }

  // Hash before querying — new rows store hashes, not raw UUIDs.
  // Also search by raw UUID for backwards compat with rows inserted before HMAC was deployed.
  const hashedUserId = hashUserId(userId);

  try {
    const rows = await d1Query<{ id: string; session_name: string | null; created_at: string }>(
      "SELECT id, session_name, created_at FROM presentations WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC LIMIT 30",
      [hashedUserId, userId]
    );
    return Response.json(rows);
  } catch (err) {
    console.error("D1 presentations query failed:", err);
    return Response.json([]);
  }
}

/** Bulk-delete all presentations belonging to the caller. */
export async function DELETE(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`delete:presentations:${ip}`, 2, 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Missing user_id" }, { status: 400 });
  }

  const rawUserId = (body as Record<string, unknown>)?.user_id as string | undefined;
  if (!rawUserId || !UUID_RE.test(rawUserId)) {
    return Response.json({ error: "Invalid user_id" }, { status: 400 });
  }

  const hashedUserId = hashUserId(rawUserId);

  try {
    await d1Run(
      "DELETE FROM presentations WHERE user_id = ? OR user_id = ?",
      [hashedUserId, rawUserId]
    );
    return Response.json({ deleted: true });
  } catch (err) {
    console.error("D1 bulk delete failed:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
