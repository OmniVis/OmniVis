import { d1Run, d1First } from "@/lib/d1";
import { hashUserId } from "@/lib/hashUserId";
import { checkRateLimit } from "@/lib/rateLimit";
import { encryptUsername, decryptUsername } from "@/lib/encrypt";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Alphanumeric, spaces, underscores, hyphens — 2 to 30 chars
const USERNAME_RE = /^[\w\s-]{2,30}$/;

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** GET /api/user?user_id=<uuid> — check if key has a registered account */
export async function GET(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`user:get:${ip}`, 30, 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId || !UUID_RE.test(userId)) {
    return Response.json({ error: "Invalid user_id" }, { status: 400 });
  }

  try {
    const hash = hashUserId(userId);
    const row = await d1First<{ username: string; created_at: string }>(
      "SELECT username, created_at FROM users WHERE user_id = ?",
      [hash]
    );
    if (!row) return Response.json({ exists: false });
    return Response.json({
      exists: true,
      username: decryptUsername(row.username),
      created_at: row.created_at,
    });
  } catch (err) {
    console.error("GET /api/user error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

/** POST /api/user — register a new account */
export async function POST(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`user:post:${ip}`, 5, 3_600_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  let body: { user_id?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, username } = body;
  if (!user_id || !UUID_RE.test(user_id)) {
    return Response.json({ error: "Invalid user_id" }, { status: 400 });
  }
  if (!username || !USERNAME_RE.test(username.trim())) {
    return Response.json({ error: "Username must be 2–30 chars (letters, numbers, spaces, _ -)" }, { status: 400 });
  }

  try {
    const hash = hashUserId(user_id);
    const encrypted = encryptUsername(username.trim());
    await d1Run(
      "INSERT INTO users (user_id, username) VALUES (?, ?)",
      [hash, encrypted]
    );
    return Response.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return Response.json({ error: "Account already exists for this key" }, { status: 409 });
    }
    console.error("POST /api/user error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

/** PUT /api/user — update username */
export async function PUT(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`user:put:${ip}`, 10, 60_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  let body: { user_id?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, username } = body;
  if (!user_id || !UUID_RE.test(user_id)) {
    return Response.json({ error: "Invalid user_id" }, { status: 400 });
  }
  if (!username || !USERNAME_RE.test(username.trim())) {
    return Response.json({ error: "Username must be 2–30 chars (letters, numbers, spaces, _ -)" }, { status: 400 });
  }

  try {
    const hash = hashUserId(user_id);
    const encrypted = encryptUsername(username.trim());
    await d1Run(
      "UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [encrypted, hash]
    );
    return Response.json({ success: true });
  } catch (err) {
    console.error("PUT /api/user error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

/** DELETE /api/user — GDPR right to erasure: delete profile + all presentations */
export async function DELETE(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`user:delete:${ip}`, 2, 3_600_000);
  if (!allowed) {
    return Response.json({ error: "Rate limit exceeded" }, {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    });
  }

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id } = body;
  if (!user_id || !UUID_RE.test(user_id)) {
    return Response.json({ error: "Invalid user_id" }, { status: 400 });
  }

  try {
    const hash = hashUserId(user_id);
    await d1Run("DELETE FROM users WHERE user_id = ?", [hash]);
    await d1Run(
      "DELETE FROM presentations WHERE user_id = ? OR user_id = ?",
      [hash, user_id]
    );
    return Response.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/user error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
