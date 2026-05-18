import { d1Run } from "@/lib/d1";
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

export async function POST(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`post:share:${ip}`, 20, 60_000);
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).code !== "string"
  ) {
    return Response.json({ error: "Missing required field: code" }, { status: 400 });
  }

  const code = ((body as Record<string, unknown>).code as string).trim();
  const notesObj = (body as Record<string, unknown>).notes as Record<number, string> | undefined;
  const rawUserId = (body as Record<string, unknown>).user_id as string | undefined;
  const userId = rawUserId && UUID_RE.test(rawUserId) ? rawUserId : undefined;
  const sessionName = (body as Record<string, unknown>).session_name as string | undefined;

  if (!code) {
    return Response.json({ error: "code must not be empty" }, { status: 400 });
  }
  if (code.length > 512_000) {
    return Response.json({ error: "code exceeds 500 KB limit" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const notesStr = notesObj ? JSON.stringify(notesObj) : null;
  // Hash the UUID before storing — raw identity never persisted server-side
  const userIdVal = userId ? hashUserId(userId) : null;
  const sessionNameVal = sessionName || null;

  try {
    await d1Run(
      "INSERT INTO presentations (id, code_content, notes, user_id, session_name) VALUES (?, ?, ?, ?, ?)",
      [id, code, notesStr, userIdVal, sessionNameVal]
    );
  } catch (err) {
    console.warn("D1 full INSERT failed, attempting fallback:", err);
    try {
      await d1Run(
        "INSERT INTO presentations (id, code_content) VALUES (?, ?)",
        [id, code]
      );
    } catch (innerErr) {
      console.error("D1 insert failed completely:", innerErr);
      return Response.json({ error: "Database error" }, { status: 500 });
    }
  }

  return Response.json({ id, url: `/view/${id}` });
}
