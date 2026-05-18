-- SLIDI Database Schema
-- Applied automatically on startup via src/lib/db.ts (pg Pool).
-- Set DATABASE_URL env var to configure the PostgreSQL connection.

-- Table for shared presentations
CREATE TABLE IF NOT EXISTS presentations (
  id           TEXT PRIMARY KEY,
  code_content TEXT NOT NULL,
  notes        TEXT,
  user_id      TEXT,
  session_name TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for registered user accounts (key-based auth)
-- user_id is an HMAC-SHA256 hash of the raw UUID key (never the raw key itself)
-- username is AES-256-GCM encrypted with DATA_ENCRYPTION_KEY
CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for branding presets
CREATE TABLE IF NOT EXISTS brandings (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  logo_url     TEXT,
  display      TEXT DEFAULT 'both',
  is_published INTEGER DEFAULT 1,
  author_name  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
