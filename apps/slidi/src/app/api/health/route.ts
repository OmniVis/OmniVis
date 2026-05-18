/**
 * Diagnostic endpoint — confirms PostgreSQL is reachable.
 * Visit /api/health to quickly verify DB connectivity after a deploy.
 */
import { d1Query } from "@/lib/d1";

export async function GET() {
  try {
    await d1Query("SELECT 1 AS ok");
    return Response.json({ status: "ok", db: "connected" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", db: "failed", error: message }, { status: 500 });
  }
}
