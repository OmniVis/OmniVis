import type { Context, Next } from 'hono';
import type { Env } from '../types';

/**
 * CORS middleware — allows requests from GitHub Pages and local dev.
 * Origins are configured via ALLOWED_ORIGINS env var in wrangler.toml.
 */
export function cors() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('Origin') ?? '';
    const allowed = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());

    const isAllowed = allowed.includes(origin);
    const corsOrigin = isAllowed ? origin : allowed[0];

    // Preflight
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    await next();

    c.res.headers.set('Access-Control-Allow-Origin', corsOrigin);
    c.res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  };
}
