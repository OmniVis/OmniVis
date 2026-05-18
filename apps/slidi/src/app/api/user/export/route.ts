import { d1First, d1Query } from "@/lib/d1";
import { hashUserId } from "@/lib/hashUserId";
import { checkRateLimit } from "@/lib/rateLimit";
import { decryptUsername } from "@/lib/encrypt";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** GET /api/user/export?user_id=<uuid> — GDPR data export */
export async function GET(request: Request) {
  const ip = getIp(request);
  const { allowed, retryAfterSec } = checkRateLimit(`user:export:${ip}`, 2, 3_600_000);
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

    const user = await d1First<{ username: string; created_at: string }>(
      "SELECT username, created_at FROM users WHERE user_id = ?",
      [hash]
    );

    const presentations = await d1Query<{
      id: string;
      session_name: string | null;
      created_at: string;
      code_content: string;
    }>(
      "SELECT id, session_name, created_at, code_content FROM presentations WHERE user_id = ? OR user_id = ? ORDER BY created_at DESC",
      [hash, userId]
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      account: user
        ? {
            username: decryptUsername(user.username),
            created_at: user.created_at,
          }
        : null,
      presentations: presentations.map((p) => ({
        id: p.id,
        session_name: p.session_name,
        created_at: p.created_at,
        code_content: p.code_content,
      })),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="slidi-data-export.json"',
      },
    });
  } catch (err) {
    console.error("GET /api/user/export error:", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
