import { d1First, d1Run } from "@/lib/d1";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let result: { code_content: string } | null;
  try {
    result = await d1First<{ code_content: string }>(
      "SELECT code_content FROM presentations WHERE id = ?",
      [id]
    );
  } catch (err) {
    console.error("D1 query failed:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  if (!result) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ code_content: result.code_content });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>).code !== "string") {
    return Response.json({ error: "Missing required field: code" }, { status: 400 });
  }

  const code = ((body as Record<string, unknown>).code as string).trim();
  if (!code) return Response.json({ error: "code must not be empty" }, { status: 400 });
  if (code.length > 512_000) return Response.json({ error: "code exceeds 500 KB limit" }, { status: 400 });

  const notesObj = (body as Record<string, unknown>).notes as Record<number, string> | undefined;
  const sessionName = (body as Record<string, unknown>).session_name as string | undefined;
  const notesStr = notesObj ? JSON.stringify(notesObj) : null;

  // Accept optional user_id to repair rows whose user_id is NULL (stored via fallback INSERT).
  // COALESCE keeps any existing value and only fills in the hash when user_id is NULL.
  const rawUserId = (body as Record<string, unknown>).user_id as string | undefined;
  const hashedUserId = rawUserId && UUID_RE.test(rawUserId) ? hashUserId(rawUserId) : null;

  let updated: { id: string } | null;
  try {
    updated = await d1First<{ id: string }>(
      "UPDATE presentations SET code_content = ?, notes = ?, session_name = ?, user_id = COALESCE(user_id, ?) WHERE id = ? RETURNING id",
      [code, notesStr, sessionName ?? null, hashedUserId, id]
    );
  } catch (innerErr) {
    console.error("[share PUT] D1 update failed:", innerErr);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit by IP and by user identity (prevents IP-rotation abuse)
  const ip = getIp(request);
  const ipCheck = checkRateLimit(`delete:share:ip:${ip}`, 10, 60_000);
  if (!ipCheck.allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(ipCheck.retryAfterSec) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawUserId = (body as Record<string, unknown>)?.user_id as string | undefined;
  if (!rawUserId || !UUID_RE.test(rawUserId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Secondary rate limit by user identity (prevents bypass via IP rotation)
  const hashedUserId = hashUserId(rawUserId);
  const userCheck = checkRateLimit(`delete:share:user:${hashedUserId}`, 10, 60_000);
  if (!userCheck.allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(userCheck.retryAfterSec) },
    });
  }

  // Ownership check — same 403 for "not found" and "not owner" to prevent enumeration
  let owned: { id: string } | null;
  try {
    owned = await d1First<{ id: string }>(
      "SELECT id FROM presentations WHERE id = ? AND (user_id = ? OR user_id = ?)",
      [id, hashedUserId, rawUserId]
    );
  } catch (err) {
    console.error("D1 ownership check failed:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  if (!owned) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await d1Run("DELETE FROM presentations WHERE id = ?", [id]);
  } catch (err) {
    console.error("D1 delete failed:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  return Response.json({ success: true });
}
