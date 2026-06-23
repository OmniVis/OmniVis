import { Hono } from 'hono';
import type { Env } from '../types';

export const graphiUserRoute = new Hono<{ Bindings: Env }>();

async function ensureTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS graphi_users (
        user_id    TEXT PRIMARY KEY,
        username   TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    )
    .run();
}

// POST /api/user  { user_id, username }
graphiUserRoute.post('/', async (c) => {
  const body = await c.req.json<{ user_id?: string; username?: string }>();
  if (!body.user_id || !body.username)
    return c.json({ error: 'user_id and username are required' }, 400);

  await ensureTable(c.env.DB);

  const existing = await c.env.DB.prepare(
    'SELECT user_id FROM graphi_users WHERE user_id = ? LIMIT 1'
  )
    .bind(body.user_id)
    .first();

  if (existing) return c.json({ error: 'Account already exists' }, 409);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO graphi_users (user_id, username, created_at) VALUES (?, ?, ?)'
  )
    .bind(body.user_id, body.username.trim(), now)
    .run();

  return c.json({ ok: true }, 201);
});

// GET /api/user?user_id=<UUID>  → { exists, username }
graphiUserRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  if (!userId) return c.json({ error: 'user_id query param required' }, 400);

  await ensureTable(c.env.DB);

  const row = await c.env.DB.prepare(
    'SELECT username FROM graphi_users WHERE user_id = ? LIMIT 1'
  )
    .bind(userId)
    .first<{ username: string }>();

  if (!row) return c.json({ exists: false });
  return c.json({ exists: true, username: row.username });
});
