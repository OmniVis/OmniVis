/**
 * POST /api/collab/token
 *
 * Issues a short-lived JWT granting WebSocket access to a specific presentation.
 * The raw userId UUID is hashed server-side before embedding in the token,
 * so the WS sidecar only ever sees the hashed identity.
 *
 * Body: { presentationId: string, userId: string, username?: string }
 * Returns: { token: string }
 */

import { sign } from "jsonwebtoken";
import { hashUserId } from "@/lib/hashUserId";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JWT_SECRET = process.env.COLLAB_JWT_SECRET ?? "slidi-collab-dev-secret";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { presentationId, userId, username } = body as Record<string, unknown>;

  if (typeof presentationId !== "string" || !UUID_RE.test(presentationId)) {
    return Response.json({ error: "Invalid presentationId" }, { status: 400 });
  }
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return Response.json({ error: "Invalid userId" }, { status: 400 });
  }

  const sub = hashUserId(userId);
  const displayName = typeof username === "string" && username.trim().length > 0
    ? username.trim().slice(0, 30)
    : null;

  const token = sign(
    { sub, username: displayName, presentationId },
    JWT_SECRET,
    { expiresIn: "15m" }
  );

  return Response.json({ token });
}
