import { Hono } from 'hono';
import type { Env, UserRow } from '../types';

export const usersRoute = new Hono<{ Bindings: Env }>();

// ─── Get or create user by email (anonymous-friendly) ────────────────────────
usersRoute.post('/upsert', async (c) => {
  const body = await c.req.json<{ email: string; name?: string }>();
  if (!body.email) return c.json({ error: 'email is required' }, 400);

  const existing = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? LIMIT 1'
  )
    .bind(body.email)
    .first<UserRow>();

  if (existing) return c.json({ user: existing, created: false });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(id, body.email, body.name ?? null, now, now)
    .run();

  return c.json({ user: { id, email: body.email, name: body.name ?? null, created_at: now }, created: true }, 201);
});

// ─── Get user by id ───────────────────────────────────────────────────────────
usersRoute.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = await c.env.DB.prepare(
    'SELECT id, email, name, created_at FROM users WHERE id = ? LIMIT 1'
  )
    .bind(id)
    .first<UserRow>();

  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json({ user });
});
