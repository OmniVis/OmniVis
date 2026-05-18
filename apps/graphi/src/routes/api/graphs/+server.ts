import { d1Query, d1Run } from '$lib/d1';
import { hashUserId } from '$lib/hashUserId';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('user_id');

  if (!userId || !UUID_RE.test(userId)) {
    return json([]);
  }

  const hashedUserId = hashUserId(userId);

  try {
    const rows = await d1Query<{ id: string; name: string | null; created_at: string }>(
      'SELECT id, name, created_at FROM graphi_presentations WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [hashedUserId]
    );
    return json(rows);
  } catch (err) {
    console.error('Database query failed:', err);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  let body: { code?: string; user_id?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { code, user_id, name } = body;

  if (typeof code !== 'string' || !code.trim()) {
    return json({ error: 'Missing required field: code' }, { status: 400 });
  }

  if (code.length > 512_000) {
    return json({ error: 'Code exceeds 500 KB limit' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const userIdVal = user_id && UUID_RE.test(user_id) ? hashUserId(user_id) : null;
  const nameVal = name || null;

  try {
    await d1Run(
      'INSERT INTO graphi_presentations (id, code_content, user_id, name) VALUES (?, ?, ?, ?)',
      [id, code.trim(), userIdVal, nameVal]
    );
    return json({ id });
  } catch (err) {
    console.error('Database insert failed:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};
