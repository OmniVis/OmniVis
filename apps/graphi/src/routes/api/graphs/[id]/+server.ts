import { d1First, d1Run } from '$lib/d1';
import { hashUserId } from '$lib/hashUserId';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await d1First<{ code_content: string; name: string | null }>(
      'SELECT code_content, name FROM graphi_presentations WHERE id = ?',
      [id]
    );

    if (!result) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    return json({ code_content: result.code_content, name: result.name });
  } catch (err) {
    console.error('Database query failed:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  let body: { code?: string; name?: string; user_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, name, user_id } = body;

  if (typeof code !== 'string' || !code.trim()) {
    return json({ error: 'Missing required field: code' }, { status: 400 });
  }

  if (code.length > 512_000) {
    return json({ error: 'Code exceeds 500 KB limit' }, { status: 400 });
  }

  if (!user_id || !UUID_RE.test(user_id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const hashedUserId = hashUserId(user_id);

  try {
    // Ownership check before update
    const owned = await d1First<{ id: string }>(
      'SELECT id FROM graphi_presentations WHERE id = ? AND user_id = ?',
      [id, hashedUserId]
    );

    if (!owned) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    await d1Run('UPDATE graphi_presentations SET code_content = ?, name = ? WHERE id = ?', [
      code.trim(),
      name ?? null,
      id
    ]);
    return json({ id });
  } catch (err) {
    console.error('Database update failed:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { user_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { user_id } = body;
  if (!user_id || !UUID_RE.test(user_id)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const hashedUserId = hashUserId(user_id);

  try {
    // Ownership check
    const owned = await d1First<{ id: string }>(
      'SELECT id FROM graphi_presentations WHERE id = ? AND user_id = ?',
      [id, hashedUserId]
    );

    if (!owned) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    await d1Run('DELETE FROM graphi_presentations WHERE id = ?', [id]);
    return json({ success: true });
  } catch (err) {
    console.error('Database delete failed:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};
