import { Hono } from 'hono';
import type { Env } from '../types';

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get('/', async (c) => {
  // Quick D1 connectivity check
  let dbOk = false;
  try {
    await c.env.DB.prepare('SELECT 1').run();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'omnivis-api',
    version: '1.0.0',
    db: dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  });
});
