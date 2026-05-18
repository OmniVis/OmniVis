import { d1Run, d1First } from '$lib/d1';
import { hashUserId } from '$lib/hashUserId';
import { encryptUsername, decryptUsername } from '$lib/encrypt';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_RE = /^[\w\s-]{2,30}$/;

export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('user_id');
  if (!userId || !UUID_RE.test(userId)) {
    return json({ error: 'Invalid user_id' }, { status: 400 });
  }

  try {
    const hash = hashUserId(userId);
    const row = await d1First<{ username: string; created_at: string }>(
      'SELECT username, created_at FROM graphi_users WHERE user_id = ?',
      [hash]
    );

    if (!row) return json({ exists: false });

    return json({
      exists: true,
      username: decryptUsername(row.username),
      created_at: row.created_at
    });
  } catch (err) {
    console.error('GET /api/user error:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  let body: { user_id?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user_id, username } = body;
  if (!user_id || !UUID_RE.test(user_id)) {
    return json({ error: 'Invalid user_id' }, { status: 400 });
  }
  if (!username || !USERNAME_RE.test(username.trim())) {
    return json(
      { error: 'Username must be 2–30 chars (letters, numbers, spaces, _ -)' },
      { status: 400 }
    );
  }

  try {
    const hash = hashUserId(user_id);
    await d1Run('INSERT INTO graphi_users (user_id, username) VALUES (?, ?)', [
      hash,
      encryptUsername(username.trim())
    ]);
    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      return json({ error: 'Account already exists for this key' }, { status: 409 });
    }
    console.error('POST /api/user error:', err);
    return json({ error: 'Database error' }, { status: 500 });
  }
};
