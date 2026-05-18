import { Hono } from 'hono';
import type { Env, PresentationRow } from '../types';

export const presentationsRoute = new Hono<{ Bindings: Env }>();

// ─── List presentations for a user ──────────────────────────────────────────
presentationsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  if (!userId) return c.json({ error: 'user_id query param required' }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT id, title, theme, is_public, share_id, created_at, updated_at
     FROM presentations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
  )
    .bind(userId)
    .all<PresentationRow>();

  return c.json({ presentations: results });
});

// ─── Get single presentation (by id or share_id) ────────────────────────────
presentationsRoute.get('/:id', async (c) => {
  const { id } = c.req.param();

  const row = await c.env.DB.prepare(
    `SELECT * FROM presentations WHERE id = ? OR share_id = ? LIMIT 1`
  )
    .bind(id, id)
    .first<PresentationRow>();

  if (!row) return c.json({ error: 'Not found' }, 404);
  if (!row.is_public && !c.req.header('Authorization')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({ presentation: row });
});

// ─── Create presentation ─────────────────────────────────────────────────────
presentationsRoute.post('/', async (c) => {
  const body = await c.req.json<{
    user_id?: string;
    title?: string;
    content: string;
    theme?: string;
    is_public?: boolean;
  }>();

  if (!body.content) return c.json({ error: 'content is required' }, 400);

  const id = crypto.randomUUID();
  const shareId = body.is_public ? crypto.randomUUID().slice(0, 8) : null;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO presentations (id, user_id, title, content, theme, is_public, share_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.user_id ?? null,
      body.title ?? 'Untitled',
      body.content,
      body.theme ?? 'default',
      body.is_public ? 1 : 0,
      shareId,
      now,
      now
    )
    .run();

  return c.json({ id, share_id: shareId }, 201);
});

// ─── Update presentation ─────────────────────────────────────────────────────
presentationsRoute.patch('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<Partial<PresentationRow>>();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const bindings: unknown[] = [];

  if (body.title !== undefined) { updates.push('title = ?'); bindings.push(body.title); }
  if (body.content !== undefined) { updates.push('content = ?'); bindings.push(body.content); }
  if (body.theme !== undefined) { updates.push('theme = ?'); bindings.push(body.theme); }
  if (body.is_public !== undefined) { updates.push('is_public = ?'); bindings.push(body.is_public); }

  if (!updates.length) return c.json({ error: 'Nothing to update' }, 400);

  updates.push('updated_at = ?');
  bindings.push(now, id);

  await c.env.DB.prepare(
    `UPDATE presentations SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...bindings)
    .run();

  return c.json({ updated: true });
});

// ─── Delete presentation ─────────────────────────────────────────────────────
presentationsRoute.delete('/:id', async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare('DELETE FROM presentations WHERE id = ?').bind(id).run();
  return c.json({ deleted: true });
});
