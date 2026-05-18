/**
 * Comprehensive status endpoint — runs automated checks against the local
 * SQLite database and configuration, returning live pass/fail results.
 *
 * GET /api/status
 *
 * Security measures:
 *  - 10 s server-side cache: repeated calls within 10 s return the cached result
 *    so the DB write test cannot be spammed.
 *  - Cache-Control: no-store on all responses so proxies/browsers never cache
 *    potentially stale status data.
 */

import { d1Query, d1Run } from "@/lib/d1";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "error";

interface CheckResult {
  name: string;
  category: "Config" | "Database" | "AI Services" | "Environment";
  status: CheckStatus;
  message: string;
  latencyMs: number;
  hint?: string;
}

interface StatusPayload {
  overall: CheckStatus;
  checkedAt: string;
  cached: boolean;
  checks: CheckResult[];
}

// ─── Server-side cache (prevents DB write-test spam) ─────────────────────────

interface CacheEntry {
  payload: StatusPayload;
  expiresAt: number;
}

let _cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10_000;

// ─── Timed check wrapper ──────────────────────────────────────────────────────

async function timed(
  fn: () => Promise<Omit<CheckResult, "latencyMs">>
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, latencyMs: Date.now() - start };
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const safe = raw.includes("ECONNREFUSED") || raw.includes("connect")
      ? "Cannot reach PostgreSQL — check container networking and DATABASE_URL"
      : raw.includes("password") || raw.includes("auth")
      ? "PostgreSQL authentication failed — check DB_PASSWORD"
      : raw.includes("does not exist") || raw.includes("database")
      ? "Database does not exist — check POSTGRES_DB matches DATABASE_URL"
      : "Unexpected error — check server logs";
    return {
      name: "Unknown",
      category: "Database",
      status: "error",
      message: safe,
      latencyMs: Date.now() - start,
    };
  }
}

// ─── Individual checks ────────────────────────────────────────────────────────

async function checkHmacSecret(): Promise<Omit<CheckResult, "latencyMs">> {
  const custom = process.env.USER_ID_HMAC_SECRET !== undefined;
  return {
    name: "HMAC Secret",
    category: "Config",
    status: custom ? "ok" : "degraded",
    message: custom
      ? "HMAC secret is configured"
      : "HMAC secret is not set — using built-in fallback",
    hint: custom ? undefined : "Set USER_ID_HMAC_SECRET in your deployment configuration for stronger security",
  };
}

async function checkEncryptionKey(): Promise<Omit<CheckResult, "latencyMs">> {
  const key = process.env.DATA_ENCRYPTION_KEY;
  const valid = !!key && key.length === 64;
  return {
    name: "Encryption Key",
    category: "Config",
    status: valid ? "ok" : "error",
    message: valid
      ? "Encryption key is configured (64 hex chars)"
      : "DATA_ENCRYPTION_KEY is missing or not 64 hex chars — usernames will be stored as plaintext",
    hint: valid ? undefined : "Set DATA_ENCRYPTION_KEY in your deployment configuration",
  };
}

async function checkDbConnection(): Promise<Omit<CheckResult, "latencyMs">> {
  const configured = !!process.env.DATABASE_URL;
  if (!configured) {
    return {
      name: "DB Connection",
      category: "Database",
      status: "error",
      message: "DATABASE_URL is not set",
      hint: "Set DATABASE_URL in your deployment configuration",
    };
  }
  // A live ping — will throw if Postgres is unreachable
  await d1Query("SELECT 1 AS ok");
  return {
    name: "DB Connection",
    category: "Database",
    status: "ok",
    message: "PostgreSQL connection healthy",
  };
}

async function checkSchema(): Promise<Omit<CheckResult, "latencyMs">> {
  type ColInfo = { name: string };
  const cols = await d1Query<ColInfo>(
    "SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'presentations'"
  );
  const names = new Set(cols.map((c) => c.name));
  const required = ["id", "code_content", "notes", "created_at", "user_id", "session_name"];
  const missing = required.filter((col) => !names.has(col));

  if (missing.length === 0) {
    return {
      name: "DB Schema",
      category: "Database",
      status: "ok",
      message: `All ${required.length} required columns present`,
    };
  }
  return {
    name: "DB Schema",
    category: "Database",
    status: "error",
    message: `Schema migration required — ${missing.length} column(s) missing`,
    hint: "Check schema.sql and db.ts SCHEMA constant.",
  };
}

async function checkDbRead(): Promise<Omit<CheckResult, "latencyMs">> {
  type CountRow = { n: number };
  const rows = await d1Query<CountRow>("SELECT COUNT(*)::int AS n FROM presentations");
  const count = rows[0]?.n ?? 0;
  return {
    name: "DB Read",
    category: "Database",
    status: "ok",
    message: `Read successful — ${count} row${count === 1 ? "" : "s"} in presentations`,
  };
}

const TEST_ID = "00000000-0000-0000-0000-000000000001";

async function checkDbWrite(): Promise<Omit<CheckResult, "latencyMs">> {
  await d1Run("DELETE FROM presentations WHERE id = ?", [TEST_ID]);
  try {
    await d1Run(
      "INSERT INTO presentations (id, code_content, notes, user_id, session_name) VALUES (?, ?, ?, ?, ?)",
      [TEST_ID, "health-check", null, "health-check-user", "health-check-session"]
    );
  } catch {
    await d1Run(
      "INSERT INTO presentations (id, code_content) VALUES (?, ?)",
      [TEST_ID, "health-check"]
    );
    await d1Run("DELETE FROM presentations WHERE id = ?", [TEST_ID]);
    return {
      name: "DB Write",
      category: "Database",
      status: "error",
      message: "Full INSERT failed — check schema migration",
      hint: "The 5-column INSERT failed. Verify the presentations table has user_id and session_name columns.",
    };
  }
  type Row = { id: string };
  const rows = await d1Query<Row>("SELECT id FROM presentations WHERE id = ?", [TEST_ID]);
  await d1Run("DELETE FROM presentations WHERE id = ?", [TEST_ID]);

  if (rows[0]?.id === TEST_ID) {
    return {
      name: "DB Write",
      category: "Database",
      status: "ok",
      message: "Full write round-trip succeeded (all columns)",
    };
  }
  return {
    name: "DB Write",
    category: "Database",
    status: "degraded",
    message: "Write completed but verification read failed",
    hint: "Check server logs for details",
  };
}

async function checkAdessoHub(): Promise<Omit<CheckResult, "latencyMs">> {
  try {
    const start = Date.now();
    const res = await fetch("https://adesso-ai-hub.3asabc.de/v1/models", {
      method: "GET",
      // We don't send a key here, just check if the endpoint is reachable
      // Most OpenAI-compatible APIs return 401/403 if unreachable/auth fails,
      // but if the TCP connection fails we catch it.
    });
    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 200) {
      return {
        name: "adesso AI Hub",
        category: "AI Services",
        status: "ok",
        message: `Endpoint reachable (${res.status})`,
      };
    }
    return {
      name: "adesso AI Hub",
      category: "AI Services",
      status: "degraded",
      message: `Endpoint returned status ${res.status}`,
    };
  } catch (err) {
    return {
      name: "adesso AI Hub",
      category: "AI Services",
      status: "error",
      message: "Endpoint unreachable — check internet connectivity",
    };
  }
}

async function checkServerEnvironment(): Promise<Omit<CheckResult, "latencyMs">> {
  const memory = process.memoryUsage();
  const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);
  
  return {
    name: "Server Stats",
    category: "Environment",
    status: "ok",
    message: `Node ${process.version} | Mem: ${mb(memory.rss)}MB RSS / ${mb(memory.heapUsed)}MB Heap`,
    hint: `Platform: ${process.platform} | Arch: ${process.arch} | PID: ${process.pid}`,
  };
}

async function checkDiskUsage(): Promise<Omit<CheckResult, "latencyMs">> {
  try {
    const { stdout } = await execAsync("df -h /");
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) throw new Error("Invalid df output");
    const parts = lines[1].split(/\s+/);
    const usePercent = parts[4];
    const avail = parts[3];
    
    const percent = parseInt(usePercent.replace("%", ""), 10);
    const status: CheckStatus = percent > 90 ? "error" : percent > 80 ? "degraded" : "ok";
    
    return {
      name: "Disk Usage",
      category: "Environment",
      status: status,
      message: `Storage: ${usePercent} used (${avail} available)`,
      hint: status !== "ok" ? "Disk space is low! Run cleanup on the server." : undefined,
    };
  } catch (err) {
    return {
      name: "Disk Usage",
      category: "Environment",
      status: "error",
      message: "Failed to check disk usage",
    };
  }
}

async function checkConfigHealth(): Promise<Omit<CheckResult, "latencyMs">> {
  const isDev = process.env.NODE_ENV === "development";
  const hasBasePath = !!process.env.NEXT_PUBLIC_BASE_PATH;
  
  return {
    name: "Runtime Config",
    category: "Config",
    status: "ok",
    message: `Env: ${process.env.NODE_ENV} | BasePath: ${process.env.NEXT_PUBLIC_BASE_PATH || "(root)"}`,
    hint: `Deploy context: ${process.env.VERCEL ? "Vercel" : "Generic Node"}`,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

const SECURE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  const now = Date.now();

  if (_cache && now < _cache.expiresAt) {
    const retryAfter = Math.ceil((_cache.expiresAt - now) / 1000);
    return new Response(
      JSON.stringify({ ..._cache.payload, cached: true }),
      {
        headers: {
          ...SECURE_HEADERS,
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  const results = await Promise.allSettled([
    timed(checkHmacSecret),
    timed(checkEncryptionKey),
    timed(checkConfigHealth),
    timed(checkDbConnection),
    timed(checkSchema),
    timed(checkDbRead),
    timed(checkDbWrite),
    timed(checkAdessoHub),
    timed(checkServerEnvironment),
    timed(checkDiskUsage),
  ]);

  const checks: CheckResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      name: `Check ${i + 1}`,
      category: "Config" as const,
      status: "error" as const,
      message: "Check failed unexpectedly — see server logs",
      latencyMs: 0,
    };
  });

  const anyError = checks.some((c) => c.status === "error");
  const anyDegraded = checks.some((c) => c.status === "degraded");
  const overall: CheckStatus = anyError ? "error" : anyDegraded ? "degraded" : "ok";

  const payload: StatusPayload = {
    overall,
    checkedAt: new Date().toISOString(),
    cached: false,
    checks,
  };

  _cache = { payload, expiresAt: now + CACHE_TTL_MS };

  return new Response(JSON.stringify(payload), { headers: SECURE_HEADERS });
}
