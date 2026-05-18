/**
 * POST /api/collab/invite/[presentationId]
 *   Create a 24-hour invite token for a presentation.
 *   Body: { userId: string }
 *   Returns: { inviteToken: string, inviteUrl: string }
 *
 * GET /api/collab/invite/[inviteToken]
 *   Validate an invite token.
 *   Returns: { presentationId: string }
 */

import { d1Run, d1First } from "@/lib/d1";
import { hashUserId } from "@/lib/hashUserId";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  // id here is a presentationId UUID
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Invalid presentationId" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId } = (body ?? {}) as Record<string, unknown>;
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return Response.json({ error: "Invalid userId" }, { status: 400 });
  }

  // Verify presentation exists
  const pres = await d1First("SELECT id FROM presentations WHERE id = ?", [id]);
  if (!pres) {
    return Response.json({ error: "Presentation not found" }, { status: 404 });
  }

  const inviteToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const createdBy = hashUserId(userId);

  await d1Run(
    "INSERT INTO collab_invites (id, presentation_id, created_by, expires_at) VALUES (?, ?, ?, ?)",
    [inviteToken, id, createdBy, expiresAt]
  );

  const inviteUrl = `${BASE}/collab/${inviteToken}`;
  return Response.json({ inviteToken, inviteUrl });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  // id here is the invite token UUID
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "Invalid invite token" }, { status: 400 });
  }

  const row = await d1First<{ presentation_id: string; expires_at: string }>(
    "SELECT presentation_id, expires_at FROM collab_invites WHERE id = ?",
    [id]
  );

  if (!row) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return Response.json({ error: "Invite expired" }, { status: 410 });
  }

  return Response.json({ presentationId: row.presentation_id });
}
