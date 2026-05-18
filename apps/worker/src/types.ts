export type Env = {
  // D1 Database binding (set in wrangler.toml and Cloudflare dashboard)
  DB: D1Database;

  // CORS allowed origins (set as [vars] in wrangler.toml)
  ALLOWED_ORIGINS: string;

  // AI provider keys (set via `wrangler secret put`)
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;

  // JWT signing secret (set via `wrangler secret put AUTH_SECRET`)
  AUTH_SECRET: string;
};

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};

export type PresentationRow = {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  theme: string;
  is_public: number;
  share_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DiagramRow = {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  config: string;
  is_public: number;
  share_id: string | null;
  created_at: string;
  updated_at: string;
};
