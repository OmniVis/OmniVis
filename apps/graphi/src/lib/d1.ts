import { getPool } from './db';

/** Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ... */
function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Run a SELECT and return all matching rows. */
export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const { pool, ready } = getPool();
  await ready;
  const result = await pool.query(toPositional(sql), params);
  return result.rows as T[];
}

/** Run a SELECT and return only the first row (or null). */
export async function d1First<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const { pool, ready } = getPool();
  await ready;
  const result = await pool.query(toPositional(sql), params);
  return (result.rows[0] as T) ?? null;
}

/** Run an INSERT / UPDATE / DELETE (ignores returned rows). */
export async function d1Run(sql: string, params: unknown[] = []): Promise<void> {
  const { pool, ready } = getPool();
  await ready;
  await pool.query(toPositional(sql), params);
}
