/**
 * PostgreSQL connection pool and schema initialisation.
 *
 * Uses a module-level singleton (globalThis in dev to survive HMR reloads).
 * Schema is applied with CREATE TABLE IF NOT EXISTS on first connection,
 * so it is safe to run on every startup.
 *
 * If schema init fails (e.g. Postgres not yet ready), the singleton is
 * cleared so the next request retries rather than serving the cached error.
 *
 * Required env var: DATABASE_URL  (e.g. postgresql://slidi:pass@tools-slidi-db:5432/slidi)
 */

import { Pool } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS presentations (
  id           TEXT PRIMARY KEY,
  code_content TEXT NOT NULL,
  notes        TEXT,
  user_id      TEXT,
  session_name TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brandings (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  logo_url     TEXT,
  display      TEXT DEFAULT 'both',
  is_published INTEGER DEFAULT 1,
  author_name  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add view_count column if it was created before this migration.
-- IF NOT EXISTS is idempotent so it is safe to run on every startup.
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
`;

// Survive Next.js HMR in development — store pool on globalThis so it isn't
// recreated on every hot reload.
const g = global as typeof globalThis & {
  _slidiPool?: Pool;
  _slidiReady?: Promise<void>;
};

export function getPool(): { pool: Pool; ready: Promise<void> } {
  if (!g._slidiPool) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Apply schema once; CREATE TABLE IF NOT EXISTS is idempotent.
    // On failure, clear the singleton so the next request gets a fresh attempt
    // instead of permanently re-throwing the cached startup error.
    const ready = pool.query(SCHEMA).then(() => {}).catch((err) => {
      g._slidiPool = undefined;
      g._slidiReady = undefined;
      return Promise.reject(err);
    });

    // Suppress unhandled-rejection crash: Node.js 15+ exits if a rejected
    // promise has no handler attached in the same tick. Callers in d1.ts
    // still see the rejection when they `await ready`.
    ready.catch(() => {});

    g._slidiPool = pool;
    g._slidiReady = ready;
  }
  return { pool: g._slidiPool, ready: g._slidiReady! };
}
