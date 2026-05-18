-- OmniVis D1 Schema
-- Run: npm run db:migrate:remote

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,           -- UUID
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS presentations (
  id         TEXT PRIMARY KEY,           -- UUID
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    TEXT NOT NULL DEFAULT '',   -- Full HTML/slide content
  theme      TEXT NOT NULL DEFAULT 'default',
  is_public  INTEGER NOT NULL DEFAULT 0, -- 0 = private, 1 = public
  share_id   TEXT UNIQUE,               -- Short share token for public links
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diagrams (
  id         TEXT PRIMARY KEY,           -- UUID
  user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled',
  content    TEXT NOT NULL DEFAULT '',   -- Mermaid source
  config     TEXT NOT NULL DEFAULT '{}', -- JSON config blob
  is_public  INTEGER NOT NULL DEFAULT 0,
  share_id   TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,           -- UUID / JWT JTI
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_presentations_user ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_share ON presentations(share_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_user ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_share ON diagrams(share_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
