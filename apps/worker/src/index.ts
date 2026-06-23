import { Hono } from 'hono';
import { cors } from './middleware/cors';
import { healthRoute } from './routes/health';
import { presentationsRoute } from './routes/presentations';
import { diagramsRoute } from './routes/diagrams';
import { aiRoute } from './routes/ai';
import { usersRoute } from './routes/users';
import { graphiUserRoute } from './routes/graphiUser';
import { graphiGraphsRoute } from './routes/graphiGraphs';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// ─── Global middleware ────────────────────────────────────────────────────────
app.use('*', cors());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.route('/health', healthRoute);
app.route('/api/users', usersRoute);
app.route('/api/presentations', presentationsRoute);
app.route('/api/diagrams', diagramsRoute);
app.route('/api/ai', aiRoute);
app.route('/api/user', graphiUserRoute);
app.route('/api/graphs', graphiGraphsRoute);

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (c) =>
  c.json({
    name: 'OmniVis API',
    version: '1.0.0',
    docs: 'https://github.com/OmniVis/OmniVis',
    endpoints: [
      'GET  /health',
      'POST /api/users/upsert',
      'GET  /api/users/:id',
      'GET  /api/presentations?user_id=',
      'GET  /api/presentations/:id',
      'POST /api/presentations',
      'PATCH /api/presentations/:id',
      'DELETE /api/presentations/:id',
      'GET  /api/diagrams?user_id=',
      'GET  /api/diagrams/:id',
      'POST /api/diagrams',
      'PATCH /api/diagrams/:id',
      'DELETE /api/diagrams/:id',
      'POST /api/ai/generate/slides',
      'POST /api/ai/generate/diagram',
    ],
  })
);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ─── Error handler ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error', detail: err.message }, 500);
});

export default app;
