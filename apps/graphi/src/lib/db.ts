import { Pool } from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS graphi_presentations (
  id           TEXT PRIMARY KEY,
  code_content TEXT NOT NULL,
  user_id      TEXT,
  name         TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graphi_users (
  user_id    TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const g = globalThis as typeof globalThis & {
  _graphiPool?: Pool;
  _graphiReady?: Promise<void>;
};

export function getPool(): { pool: Pool; ready: Promise<void> } {
  if (!g._graphiPool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString && process.env.DB_PASSWORD) {
      connectionString = `postgresql://slidi:${process.env.DB_PASSWORD}@tools-slidi-db:5432/slidi`;
    }
    if (!connectionString) {
      console.warn('DATABASE_URL and DB_PASSWORD are not set. Database operations will fail.');
    }

    const pool = new Pool({ connectionString });

    // Apply schema once
    const ready = pool
      .query(SCHEMA)
      .then(() => {
        console.log('Graphi schema initialized successfully.');
      })
      .catch((err) => {
        console.error('Failed to initialize Graphi schema:', err);
        g._graphiPool = undefined;
        g._graphiReady = undefined;
        return Promise.reject(err);
      });

    ready.catch((e) => console.debug('Ready failure handled in caller', e));

    g._graphiPool = pool;
    g._graphiReady = ready;
  }

  const pool = g._graphiPool;
  const ready = g._graphiReady;
  if (!pool || !ready) {
    throw new Error('Database pool not initialized');
  }
  return { pool, ready };
}
