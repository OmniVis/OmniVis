import { Hono } from 'hono';
import type { Env } from '../types';

export const graphiGraphsRoute = new Hono<{ Bindings: Env }>();

// GET /api/graphs?user_id=<UUID>  → [{ id, name, created_at }]
graphiGraphsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  if (!userId) return c.json({ error: 'user_id query param required' }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT id, title AS name, created_at
     FROM diagrams WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
  )
    .bind(userId)
    .all<{ id: string; name: string; created_at: string }>();

  return c.json(results);
});

// GET /api/graphs/:id  → { code_content, name }
graphiGraphsRoute.get('/:id', async (c) => {
  const { id } = c.req.param();

  const row = await c.env.DB.prepare(
    `SELECT content AS code_content, title AS name
     FROM diagrams WHERE id = ? LIMIT 1`
  )
    .bind(id)
    .first<{ code_content: string; name: string }>();

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// POST /api/graphs  { code, name, user_id }  → { id }
graphiGraphsRoute.post('/', async (c) => {
  const body = await c.req.json<{ code?: string; name?: string; user_id?: string }>();
  if (!body.code) return c.json({ error: 'code is required' }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO diagrams (id, user_id, title, content, config, is_public, share_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, '{}', 0, NULL, ?, ?)`
  )
    .bind(id, body.user_id ?? null, body.name ?? 'Untitled', body.code, now, now)
    .run();

  return c.json({ id }, 201);
});

// PUT /api/graphs/:id  { code, name, user_id }
graphiGraphsRoute.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ code?: string; name?: string }>();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (body.code !== undefined) { updates.push('content = ?'); bindings.push(body.code); }
  if (body.name !== undefined) { updates.push('title = ?'); bindings.push(body.name); }

  if (!updates.length) return c.json({ error: 'Nothing to update' }, 400);

  updates.push('updated_at = ?');
  bindings.push(now, id);

  await c.env.DB.prepare(
    `UPDATE diagrams SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...bindings)
    .run();

  return c.json({ ok: true });
});

// DELETE /api/graphs/:id
graphiGraphsRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM diagrams WHERE id = ?').bind(id).run();
  return c.json({ deleted: true });
});
